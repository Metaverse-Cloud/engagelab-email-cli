import { readConfig as defaultReadConfig } from './config-store.js';
import { configError } from '../core/errors.js';

const SECRET_KEY_BASE_URL_MAP = {
  sg: 'https://email.api.engagelab.cc',
  tr: 'https://emailapi-tr.engagelab.com',
};

export async function resolveRuntimeConfig(options = {}) {
  const details = await resolveRuntimeConfigDetails(options);

  if (!details.baseUrl) {
    throw configError('Missing base URL. Set --base-url, ENGAGELAB_EMAIL_BASE_URL, or config set.');
  }

  if (details.requireSecretKey && !details.secretKey) {
    throw configError('Missing Secret Key. Set --secret-key, ENGAGELAB_EMAIL_SECRET_KEY, or config set.');
  }

  if (details.requireSecretKey && !details.secretKey.startsWith('sk_')) {
    throw configError('Secret Key must start with sk_');
  }

  return { baseUrl: details.baseUrl, secretKey: details.secretKey };
}

export async function resolveRuntimeConfigDetails({
  cliOptions = {},
  env = process.env,
  readConfig = defaultReadConfig,
  requireSecretKey = true,
} = {}) {
  const fileConfig = await readConfig();
  const secretKeyResolution = resolveSecretKey(cliOptions, env, fileConfig);
  const baseUrlResolution = resolveBaseUrl(cliOptions, env, fileConfig, secretKeyResolution.value);

  return {
    baseUrl: baseUrlResolution.value,
    baseUrlSource: baseUrlResolution.source,
    secretKey: secretKeyResolution.value,
    secretKeySource: secretKeyResolution.source,
    fileConfig,
    requireSecretKey,
  };
}

function resolveSecretKey(cliOptions, env, fileConfig) {
  if (cliOptions.secretKey) return { value: cliOptions.secretKey, source: 'cli' };
  if (env.ENGAGELAB_EMAIL_SECRET_KEY) return { value: env.ENGAGELAB_EMAIL_SECRET_KEY, source: 'env' };
  if (fileConfig.secretKey) return { value: fileConfig.secretKey, source: 'config' };
  return { value: undefined, source: 'missing' };
}

function resolveBaseUrl(cliOptions, env, fileConfig, secretKey) {
  if (cliOptions.baseUrl) return { value: cliOptions.baseUrl, source: 'cli' };
  if (env.ENGAGELAB_EMAIL_BASE_URL) return { value: env.ENGAGELAB_EMAIL_BASE_URL, source: 'env' };
  if (fileConfig.baseUrl) return { value: fileConfig.baseUrl, source: 'config' };

  const inferred = inferBaseUrlFromSecretKey(secretKey);
  if (inferred) return { value: inferred, source: 'inferred' };

  return { value: undefined, source: 'missing' };
}

export function inferBaseUrlFromSecretKey(secretKey) {
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return undefined;
  }

  const [, region] = secretKey.split('_');
  return SECRET_KEY_BASE_URL_MAP[region?.toLowerCase()];
}
