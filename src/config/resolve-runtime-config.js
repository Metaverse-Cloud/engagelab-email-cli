import { readConfig as defaultReadConfig } from './config-store.js';
import { configError } from '../core/errors.js';

const SECRET_KEY_BASE_URL_MAP = {
  sg: 'https://www.engagelab.com',
  tr: 'https://email-tr.engagelab.com',
};

export async function resolveRuntimeConfig({
  cliOptions = {},
  env = process.env,
  readConfig = defaultReadConfig,
  requireSecretKey = true,
} = {}) {
  const fileConfig = await readConfig();
  const secretKey = cliOptions.secretKey || env.ENGAGELAB_EMAIL_SECRET_KEY || fileConfig.secretKey;
  const baseUrl =
    cliOptions.baseUrl ||
    env.ENGAGELAB_EMAIL_BASE_URL ||
    fileConfig.baseUrl ||
    inferBaseUrlFromSecretKey(secretKey);

  if (!baseUrl) {
    throw configError('Missing base URL. Set --base-url, ENGAGELAB_EMAIL_BASE_URL, or config set.');
  }

  if (requireSecretKey && !secretKey) {
    throw configError('Missing Secret Key. Set --secret-key, ENGAGELAB_EMAIL_SECRET_KEY, or config set.');
  }

  if (requireSecretKey && !secretKey.startsWith('sk_')) {
    throw configError('Secret Key must start with sk_');
  }

  return { baseUrl, secretKey };
}

function inferBaseUrlFromSecretKey(secretKey) {
  if (!secretKey || !secretKey.startsWith('sk_')) {
    return undefined;
  }

  const [, region] = secretKey.split('_');
  return SECRET_KEY_BASE_URL_MAP[region?.toLowerCase()];
}
