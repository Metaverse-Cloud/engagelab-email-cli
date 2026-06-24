import ky from 'ky';
import semver from 'semver';
import pc from 'picocolors';
import { resolveRuntimeConfig } from '../config/resolve-runtime-config.js';
import { CliError } from '../core/errors.js';
import { compactObject } from '../core/validators.js';
import { CLI_VERSION } from '../version.js';

const API_PREFIX = '/api/email/agent/v1';
const PACKAGE_NAME = 'engagelab-email-cli';
const DEFAULT_REGISTRY_URL = 'https://registry.npmjs.org';
const UPDATE_CHECK_TIMEOUT_MS = 1500;

export async function createApiClient(command) {
  await assertCliIsCurrent(command.opts().json);
  const config = await resolveRuntimeConfig({ cliOptions: command.optsWithGlobals() });
  return ky.extend({
    prefix: trimTrailingSlash(config.baseUrl),
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
    },
    timeout: 30000,
    throwHttpErrors: false,
  });
}

export function apiPath(path) {
  return `${API_PREFIX}${path}`;
}

export async function withSpinner(command, message, task) {
  if (command.opts().json) {
    return task();
  }

  if (!process.stderr.isTTY) {
    process.stderr.write(`${message}...\n`);
    return task();
  }

  const { default: ora } = await import('ora');
  const spinner = ora({ text: message, stream: process.stderr }).start();
  try {
    const result = await task();
    spinner.succeed(message);
    return result;
  } catch (error) {
    spinner.fail(message);
    throw error;
  }
}

export function writeResult(command, result, formatter) {
  if (command.opts().json) {
    command.parent?.parent?.stdout?.write?.('');
  }
  const stdout = command.programOutput?.stdout || process.stdout;
  if (command.opts().json) {
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  stdout.write(`${formatter(result)}\n`);
}

export function queryFromOptions(options, mapping) {
  const query = {};
  for (const [optionName, queryName = optionName] of Object.entries(mapping)) {
    query[queryName] = options[optionName];
  }
  return compactObject(query);
}

export function bodyOptions(options, names) {
  const body = {};
  for (const name of names) {
    if (options[name] !== undefined) {
      body[name] = options[name];
    }
  }
  return body;
}

async function assertCliIsCurrent(jsonMode) {
  if (process.env.ENGAGELAB_EMAIL_CLI_DISABLE_UPDATE_CHECK) return;

  let latestVersion;
  try {
    const registryUrl = trimTrailingSlash(process.env.ENGAGELAB_EMAIL_CLI_UPDATE_REGISTRY_URL || DEFAULT_REGISTRY_URL);
    const response = await fetch(`${registryUrl}/${PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(UPDATE_CHECK_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return;
    const metadata = await response.json();
    latestVersion = metadata.version;
  } catch {
    return;
  }

  if (!latestVersion || !semver.valid(latestVersion) || !semver.valid(CLI_VERSION)) return;
  if (!semver.gt(latestVersion, CLI_VERSION)) return;

  const message = [
    `A newer version of ${PACKAGE_NAME} is required: ${CLI_VERSION} -> ${latestVersion}`,
    `Please run: ${pc.bold(`npm install -g ${PACKAGE_NAME}@latest`)}`,
  ].join('\n');

  throw new CliError(message, {
    code: 'update_required',
    exitCode: 1,
    data: { currentVersion: CLI_VERSION, latestVersion },
  });
}

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
