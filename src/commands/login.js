import { Option } from 'commander';
import { applyConfigValues } from './config.js';
import { CliError, configError } from '../core/errors.js';
import { openBrowser } from '../core/browser.js';
import { createCallbackServer } from '../core/oauth-callback.js';
import { createPkcePair, createState } from '../core/pkce.js';
import { color } from '../output/colors.js';
import { ui } from '../output/ui.js';

// Browser sign-in (authorize) entry point. PROD is the shipped default; the
// hidden --test selects QA. The same host is reused for the post-callback
// data-center / Secret-Key calls. See md/test.md.
const DEFAULT_AUTHORIZE_URL = 'https://www.engagelab.com/accounts/signin?scene=cli';
const TEST_AUTHORIZE_URL = 'https://engagelab-consoles.qa.jpushoa.com/accounts/signin?scene=cli';
const DEFAULT_CLIENT_ID = 'agent-email-cli';
const DATA_CENTER_PATH = '/api/email/user_dc/list.do';
const SECRET_KEY_PATH = '/api/email/remoteApi.do';
const LOGIN_TIMEOUT_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;
// When the account has no data center, one is auto-created in this region.
const DEFAULT_DC_NAME = 'Singapore';
const DEFAULT_SERVICE_NAME = 'default_singapore';

export function registerLoginCommands(program) {
  program
    .command('login')
    .description('Sign in through the EngageLab website and save the generated Secret Key')
    // --test is a hidden debug switch for the QA environment. The shipped
    // command is just `login`; --no-browser and --json are user-facing.
    .addOption(new Option('--test', 'Use the QA test environment').hideHelp())
    .option('--no-browser', 'Print the sign-in URL without opening a browser')
    .option('--json', 'Output raw JSON')
    .action(async (options) => {
      const stdout = process.stdout;
      const stderr = process.stderr;
      const jsonMode = Boolean(options.json);

      const authorizeUrl = options.test ? TEST_AUTHORIZE_URL : DEFAULT_AUTHORIZE_URL;
      const clientId = DEFAULT_CLIENT_ID;

      const { codeVerifier, codeChallenge } = createPkcePair();
      const state = createState();
      const callback = await createCallbackServer({ state });

      try {
        const url = buildAuthorizeUrl({
          authorizeUrl,
          clientId,
          redirectUri: callback.redirectUri,
          codeChallenge,
          state,
        });
        // The data-center / Secret-Key endpoints live on the same host as the
        // authorize page, so derive their base from it.
        const base = new URL(url).origin;

        writeAuthorizationInstructions({ stderr, url, jsonMode, opensBrowser: options.browser });

        if (options.browser) {
          openBrowser(url).catch(() => {
            writeBrowserOpenFailure({ stderr, jsonMode });
          });
        }

        const code = await waitForCodeWithInterrupt(callback);
        writeStatus(stderr, jsonMode, 'authorization_received', 'Authorization received. Loading your data centers...');

        const emit = makeEmit(stderr, jsonMode);

        const { userDcs, lastServiceId } = await fetchDataCenters({ base, clientId, code, codeVerifier, emit });

        const selection = await resolveServiceId({
          base,
          clientId,
          code,
          codeVerifier,
          userDcs,
          lastServiceId,
          emit,
        });
        emit({
          event: 'data_center_selected',
          response: {
            serviceId: selection.serviceId,
            dcName: selection.dcName,
            serviceName: selection.serviceName,
            created: selection.created,
            reason: selection.reason,
          },
        });

        const { secretKey } = await generateSecretKey({
          base,
          clientId,
          code,
          codeVerifier,
          serviceId: selection.serviceId,
          emit,
        });

        // Delegate persistence to the same logic `config set` uses. Login keeps
        // no state of its own; re-running it walks the whole flow again.
        await applyConfigValues({ secretKey });

        if (jsonMode) {
          stdout.write(
            `${JSON.stringify(
              {
                code: 0,
                message: 'Login successful',
                data: { secretKeySaved: true },
              },
              null,
              2,
            )}\n`,
          );
          return;
        }

        stderr.write(`${ui.success('Login successful. Secret Key saved to your local CLI config.')}\n`);
      } finally {
        await callback.close();
      }
    });
}

// --- Data-center resolution (non-interactive) ---

// Pick the data center to issue the Secret Key for, without prompting: the
// last-used node (lastServiceId), else the first available node, else a newly
// created default Singapore node when the account has none at all.
async function resolveServiceId({ base, clientId, code, codeVerifier, userDcs, lastServiceId, emit }) {
  const lastUsed = lastServiceId ? userDcs.find((dc) => dc.serviceId === lastServiceId) : undefined;
  if (lastUsed) {
    return pickDataCenter(lastUsed, 'last-used');
  }
  if (userDcs.length > 0) {
    return pickDataCenter(userDcs[0], 'first-available');
  }
  const created = await createDefaultDataCenter({ base, clientId, code, codeVerifier, emit });
  return { ...created, created: true, reason: 'created-default' };
}

function pickDataCenter(dc, reason) {
  return { serviceId: dc.serviceId, dcName: dc.dcName, serviceName: dc.serviceName, created: false, reason };
}

async function createDefaultDataCenter({ base, clientId, code, codeVerifier, emit }) {
  const serviceName = DEFAULT_SERVICE_NAME;
  const dcName = DEFAULT_DC_NAME;
  const serviceId = await createDataCenter({ base, clientId, code, codeVerifier, serviceName, dcName, emit });
  return { serviceId, serviceName, dcName };
}

// --- HTTP to the console host (login only; other commands never call these) ---

export async function fetchDataCenters({ base, clientId, code, codeVerifier, fetchImpl = fetch, emit = () => {} }) {
  const request = { method: 'GET', path: DATA_CENTER_PATH, params: { business: 'Email', clientId, code, codeVerifier } };
  emit({ event: 'data_centers_request', request });
  const url = withAuthParams(new URL(DATA_CENTER_PATH, base), { clientId, code, codeVerifier });
  const response = await safeFetch(
    fetchImpl,
    url,
    { method: 'GET', headers: { Accept: 'application/json', 'Cache-Control': 'no-store' } },
    request,
  );
  const result = await readJson(response);
  // user_dc/list.do signals success with { status: 1, success: true }.
  if (!result?.success) {
    throw serviceError({ step: 'data_centers', request, result, status: response.status });
  }
  const data = {
    userDcs: Array.isArray(result?.data?.userDcs) ? result.data.userDcs : [],
    lastServiceId: result?.data?.lastServiceId,
  };
  emit({ event: 'data_centers_response', response: data });
  return data;
}

export async function createDataCenter({
  base,
  clientId,
  code,
  codeVerifier,
  serviceName,
  dcName,
  fetchImpl = fetch,
  emit = () => {},
}) {
  const request = {
    method: 'POST',
    path: DATA_CENTER_PATH,
    params: { business: 'Email', clientId, code, codeVerifier, serviceName, dcName },
  };
  emit({ event: 'create_data_center_request', request });
  const url = withAuthParams(new URL(DATA_CENTER_PATH, base), { clientId, code, codeVerifier });
  const response = await safeFetch(
    fetchImpl,
    url,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ serviceName, dcName }),
    },
    request,
  );
  const result = await readJson(response);
  if (!result?.success) {
    throw serviceError({ step: 'create_data_center', request, result, status: response.status });
  }
  const serviceId = result?.data?.info?.serviceId;
  if (!serviceId) {
    throw new CliError('Data center creation did not return a service id.', { code: 'invalid_response', exitCode: 5 });
  }
  emit({ event: 'create_data_center_response', response: { serviceId, serviceName, dcName } });
  return serviceId;
}

export async function generateSecretKey({ base, clientId, code, codeVerifier, serviceId, fetchImpl = fetch, emit = () => {} }) {
  const request = {
    method: 'POST',
    path: SECRET_KEY_PATH,
    params: { action: 'secretKey_regenerate', type: 'agent', business: 'Email', clientId, code, codeVerifier, serviceId },
  };
  emit({ event: 'secret_key_request', request });
  const url = withAuthParams(new URL(SECRET_KEY_PATH, base), { clientId, code, codeVerifier });
  url.searchParams.set('action', 'secretKey_regenerate');
  url.searchParams.set('type', 'agent');
  url.searchParams.set('serviceId', serviceId);
  const response = await safeFetch(
    fetchImpl,
    url,
    { method: 'POST', headers: { Accept: 'application/json', 'Cache-Control': 'no-store' } },
    request,
  );
  const result = await readJson(response);
  // remoteApi.do signals success with { code: 0 } (different from list.do).
  if (!response.ok || result?.code !== 0) {
    throw serviceError({ step: 'generate_secret_key', request, result, status: response.status });
  }
  const secretKey = result?.data?.secretKey;
  if (typeof secretKey !== 'string' || !secretKey.startsWith('sk_')) {
    throw new CliError('Agent Email returned an invalid Secret Key.', { code: 'invalid_response', exitCode: 5 });
  }
  const secretKeyMask = result?.data?.secretKeyMask;
  const dcName = result?.data?.dcName;
  emit({ event: 'secret_key_response', response: { secretKeyMask, dcName } });
  return { secretKey, secretKeyMask, dcName };
}

function withAuthParams(url, { clientId, code, codeVerifier }) {
  url.searchParams.set('business', 'Email');
  url.searchParams.set('clientId', clientId);
  url.searchParams.set('code', code);
  url.searchParams.set('codeVerifier', codeVerifier);
  return url;
}

async function safeFetch(fetchImpl, url, init, request) {
  const controller = new AbortController();
  // unref'd + cleared after the call so an outstanding timeout never keeps the
  // process alive once login finishes (otherwise the terminal never returns).
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timer.unref?.();
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new CliError('The login request timed out. Run login again.', {
        code: 'temporarily_unavailable',
        exitCode: 5,
        cause: error,
        data: { request },
      });
    }
    throw new CliError('Could not connect to the login service. Try again later.', {
      code: 'temporarily_unavailable',
      exitCode: 5,
      cause: error,
      data: { request },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (error) {
    throw new CliError('The login service returned an invalid response.', {
      code: 'invalid_response',
      exitCode: 5,
      status: response.status,
      cause: error,
    });
  }
}

function serviceError({ step, request, result, status }) {
  const reason = result?.msg || result?.message || 'request_failed';
  return new CliError(`Could not complete login (${step}): ${reason}`, {
    code: reason,
    exitCode: 5,
    status,
    errorCode: result?.code,
    data: { step, request, status, response: result ?? null },
  });
}

// --- Output / flow helpers ---

function writeAuthorizationInstructions({ stderr, url, jsonMode, opensBrowser }) {
  if (jsonMode) {
    stderr.write(`${JSON.stringify({ event: 'authorization_url', url })}\n`);
    return;
  }

  stderr.write(`${ui.start('Starting browser sign-in...')}\n\n`);
  stderr.write(`${ui.muted('Open this URL to sign in, choose an organization, and authorize the CLI:')}\n`);
  stderr.write(`${url}\n\n`);
  stderr.write(
    `${ui.start(
      opensBrowser
        ? 'Opening your browser. Waiting for authorization... (press Ctrl+C to cancel)'
        : 'Waiting for browser authorization... (press Ctrl+C to cancel)',
    )}\n`,
  );
}

function writeBrowserOpenFailure({ stderr, jsonMode }) {
  const message = 'Could not open the browser automatically. Open the sign-in URL shown above.';
  if (jsonMode) {
    stderr.write(`${JSON.stringify({ event: 'warning', message })}\n`);
    return;
  }
  stderr.write(`${ui.warning(message)}\n`);
}

function writeStatus(stderr, jsonMode, event, message) {
  if (jsonMode) {
    stderr.write(`${JSON.stringify({ event, message })}\n`);
    return;
  }
  stderr.write(`${ui.start(message)}\n`);
}

// Build a progress emitter: structured JSON per event in --json mode, a friendly
// summary line otherwise (request events are JSON-only). Each console API call
// emits a *_request event before the fetch and a *_response event after, so the
// three calls' details always show up in --json mode, success or failure.
function makeEmit(stderr, jsonMode) {
  return (payload) => {
    if (jsonMode) {
      stderr.write(`${JSON.stringify(payload)}\n`);
      return;
    }
    const line = humanLine(payload);
    if (line) stderr.write(`${ui.start(line)}\n`);
  };
}

function humanLine({ event, response } = {}) {
  switch (event) {
    case 'data_centers_response':
      return `Found ${response?.userDcs?.length ?? 0} data center(s).`;
    case 'create_data_center_response':
      return `Created data center${response?.dcName ? ` (${response.dcName})` : ''}.`;
    case 'data_center_selected': {
      const node = response?.serviceName
        ? `${response.dcName} (${response.serviceName})`
        : response?.dcName || 'data center';
      const highlighted = color.bold(color.cyan(node));
      if (response?.created) return `Using newly created data center: ${highlighted}`;
      if (response?.reason === 'last-used') return `Using your last-used data center: ${highlighted}`;
      return `Using data center: ${highlighted}`;
    }
    case 'secret_key_response':
      return `Secret Key generated${response?.dcName ? ` (${response.dcName})` : ''}.`;
    default:
      return '';
  }
}

function waitForCodeWithInterrupt(callback) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      process.removeListener('SIGINT', cancel);
      process.removeListener('SIGTERM', cancel);
    };
    const cancel = () => {
      cleanup();
      reject(new CliError('Login cancelled.', { code: 'login_cancelled', exitCode: 130 }));
    };

    process.once('SIGINT', cancel);
    process.once('SIGTERM', cancel);

    callback.waitForCode({ timeoutMs: LOGIN_TIMEOUT_MS }).then(
      (code) => {
        cleanup();
        resolve(code);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}

export function buildAuthorizeUrl({ authorizeUrl, clientId, redirectUri, codeChallenge, state }) {
  let url;
  try {
    url = new URL(authorizeUrl);
  } catch {
    throw configError(`Invalid authorize URL: ${authorizeUrl}`);
  }

  if (url.protocol !== 'https:' && !isLoopbackUrl(url)) {
    throw configError('Authorize URL must use HTTPS.');
  }

  url.searchParams.set('scene', 'cli');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

function isLoopbackUrl(url) {
  return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
}
