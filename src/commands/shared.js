import ky from 'ky';
import { resolveRuntimeConfig } from '../config/resolve-runtime-config.js';
import { compactObject } from '../core/validators.js';

export async function createApiClient(command) {
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

function trimTrailingSlash(value) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
