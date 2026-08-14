import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { CliError } from './errors.js';

const logo =
  typeof __LOGO_ICON__ === 'undefined'
    ? readFileSync(new URL('./assets/logo.svg', import.meta.url), 'utf8')
    : __LOGO_ICON__;
const failureIcon =
  typeof __FAILURE_ICON__ === 'undefined'
    ? readFileSync(new URL('./assets/fail.svg', import.meta.url), 'utf8')
    : __FAILURE_ICON__;
const successIcon =
  typeof __SUCCESS_ICON__ === 'undefined'
    ? readFileSync(new URL('./assets/successful.svg', import.meta.url), 'utf8')
    : __SUCCESS_ICON__;

const HOSTNAME = '127.0.0.1';
const CALLBACK_PATH = '/callback';
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

// Starts a throwaway loopback HTTP server that the authorization page
// redirects the browser back to. Resolves with the authorization code once
// the callback lands, and is always paired with close() by the caller.
export async function createCallbackServer({ state, createHttpServer = createServer } = {}) {
  let resolveCode;
  let rejectCode;
  const codePromise = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = createHttpServer((request, response) => {
    handleCallback(request, response, state, resolveCode, rejectCode);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOSTNAME, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const { port } = server.address();

  return {
    port,
    redirectUri: `http://${HOSTNAME}:${port}${CALLBACK_PATH}`,
    waitForCode({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
      return raceTimeout(codePromise, timeoutMs);
    },
    async close() {
      await new Promise((resolve) => {
        // Force-close any lingering keep-alive connection (e.g. the browser's
        // callback tab) so close() resolves at once. Otherwise server.close()
        // waits for that socket forever, hanging the process and swallowing any
        // pending error before it can be printed.
        server.closeAllConnections?.();
        server.close(resolve);
      });
    },
  };
}
function handleCallback(request, response, expectedState, resolveCode, rejectCode) {
  const url = new URL(request.url, `http://${HOSTNAME}`);
  if (url.pathname !== CALLBACK_PATH) {
    respondHtml(response, 404, renderPage('Not found', 'Nothing to see here.'));
    return;
  }

  const returnedState = url.searchParams.get('state');
  if (returnedState !== expectedState) {
    respondHtml(response, 200, renderPage('Authorization failed', 'The login state did not match. Please try again.'));
    rejectCode(oauthError('OAuth state mismatch.'));
    return;
  }

  const error = url.searchParams.get('error');
  if (error) {
    respondHtml(response, 200, renderPage('Authorization failed', authorizationErrorMessage(error)));
    rejectCode(authorizationError(error));
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    respondHtml(response, 200, renderPage('Authorization failed', 'No authorization code was returned.'));
    rejectCode(oauthError('Authorization callback is missing the code parameter.'));
    return;
  }

  respondHtml(
    response,
    200,
    renderPage('Authentication complete', 'You can close this tab and return to your terminal.', true),
  );
  resolveCode(code);
}

function raceTimeout(promise, timeoutMs) {
  if (!timeoutMs) return promise;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new CliError('Login timed out while waiting for the browser callback.', {
            code: 'login_timeout',
            exitCode: 1,
          }),
        ),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function oauthError(message) {
  return new CliError(message, { code: 'oauth_error', exitCode: 1 });
}

function authorizationError(error) {
  const messages = {
    access_denied: 'Authorization was cancelled.',
    auth_required: 'Sign-in was not completed or expired. Run login again.',
    auth_failed: 'The website could not complete authorization. Run login again.',
    org_required: 'No available organization was found. Create or join an organization, then run login again.',
    redirect_invalid: 'The local callback address was rejected. Run login again.',
    temporarily_unavailable: 'The login service is temporarily unavailable. Try again later.',
  };
  return new CliError(messages[error] || `Authorization failed: ${error}`, {
    code: error,
    exitCode: error === 'access_denied' ? 1 : 5,
  });
}

function authorizationErrorMessage(error) {
  if (error === 'access_denied') return 'Authorization was cancelled. You can close this tab.';
  return 'Authorization could not be completed. Return to the terminal for details.';
}

function respondHtml(response, status, body) {
  response.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  response.end(body);
}

function renderPage(title, message, isSuccess = false) {
  const statusIcon = isSuccess ? successIcon : failureIcon;
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>EngageLab Email CLI</title>',
    '<style>',
    '*{box-sizing:border-box}',
    'html,body{min-height:100%}',
    'body{min-height:100vh;margin:0;color:#253044;background:linear-gradient(135deg,#f9fbff 0%,#f6f8ff 46%,#e9efff 100%);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.page{display:flex;min-height:100vh;flex-direction:column}',
    '.header{height:106px;padding:28px clamp(24px,8vw,120px)}',
    '.logo{width:298px;height:50px}',
    '.logo svg{display:block;width:298px;height:50px}',
    '.content{display:flex;flex:1;align-items:flex-start;justify-content:center;padding:72px 24px 120px}',
    '.card{display:flex;width:min(520px,100%);min-height:340px;flex-direction:column;align-items:center;justify-content:center;padding:48px 32px;border:1px solid #edf0f7;border-radius:8px;background:#fff;box-shadow:0 12px 40px rgba(54,72,118,.06);text-align:center}',
    '.status-icon{width:72px;height:72px;margin-bottom:34px}',
    '.status-icon svg{display:block;width:100%;height:100%}',
    'h1{margin:0 0 14px;font-size:18px;font-weight:500;line-height:1.4}',
    'p{margin:0;color:#8a92a3;font-size:14px;line-height:1.6}',
    '@media(max-width:600px){.header{height:72px;padding:22px 24px}.logo{width:150px;height:auto}.logo svg{width:100%;height:auto}.content{align-items:center;padding:24px}.card{min-height:300px;padding:40px 24px}.status-icon{width:64px;height:64px}}',
    '</style>',
    '</head>',
    '<body>',
    '<div class="page">',
    `<header class="header"><div class="logo">${logo}</div></header>`,
    '<main class="content">',
    '<section class="card">',
    `<div class="status-icon" aria-hidden="true">${statusIcon}</div>`,
    `<h1>${escapeHtml(title)}</h1>`,
    `<p>${escapeHtml(message)}</p>`,
    '</section>',
    '</main>',
    '</div>',
    '</body>',
    '</html>',
  ].join('');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
