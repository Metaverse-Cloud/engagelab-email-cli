import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export async function readConfig({ configPath = getDefaultConfigPath() } = {}) {
  try {
    return JSON.parse(await readFile(configPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

export async function writeConfig(config, { configPath = getDefaultConfigPath() } = {}) {
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

export function getDefaultConfigPath(env = process.env, platform = process.platform) {
  if (env.ENGAGELAB_EMAIL_CONFIG) {
    return env.ENGAGELAB_EMAIL_CONFIG;
  }
  const base =
    env.XDG_CONFIG_HOME ||
    (platform === 'win32' ? env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming') : path.join(os.homedir(), '.config'));
  return path.join(base, 'engagelab-email-cli', 'config.json');
}

export function maskSecretKey(secretKey) {
  if (!secretKey) return '';
  return `${secretKey.slice(0, 7)}****`;
}

