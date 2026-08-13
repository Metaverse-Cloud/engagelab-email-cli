import { maskSecretKey, readConfig, writeConfig } from '../config/config-store.js';
import { inferBaseUrlFromSecretKey } from '../config/resolve-runtime-config.js';
import { validationError } from '../core/errors.js';
import { ui } from '../output/ui.js';

export function registerConfigCommands(program) {
  const config = program.command('config').description('Manage local EngageLab Email CLI config');

  config
    .command('set')
    .description('Save local CLI configuration')
    .option('--base-url <url>', 'EngageLab Email API base URL')
    .option('--secret-key <key>', 'EngageLab Email Secret Key')
    .action(async (options, command) => {
      options = { ...command.optsWithGlobals(), ...options };
      if (!options.baseUrl && !options.secretKey) {
        throw validationError('Provide at least one of --base-url or --secret-key');
      }
      if (options.secretKey && !options.secretKey.startsWith('sk_')) {
        throw validationError('Secret Key must start with sk_');
      }
      await applyConfigValues({ baseUrl: options.baseUrl, secretKey: options.secretKey });
      process.stdout.write(`${ui.success('Config saved')}\n`);
    });

  config
    .command('list')
    .description('Show local CLI configuration')
    .action(async () => {
      const current = await readConfig();
      process.stdout.write(`${ui.label('baseUrl')}: ${current.baseUrl || ''}\n`);
      process.stdout.write(`${ui.label('secretKey')}: ${maskSecretKey(current.secretKey)}\n`);
    });

  config
    .command('clear')
    .description('Clear local CLI configuration')
    .action(async () => {
      await writeConfig({});
      process.stdout.write(`${ui.success('Config cleared')}\n`);
    });
}

// Apply credential changes to the local config. When a secret key is provided
// without an explicit base URL, the base URL is mapped from the key's region.
// Shared by `config set` and `login` so both stay in sync.
export async function applyConfigValues({ baseUrl, secretKey } = {}) {
  const current = await readConfig();
  const merged = { ...current };
  if (secretKey !== undefined) {
    merged.secretKey = secretKey;
  }
  if (baseUrl !== undefined) {
    merged.baseUrl = baseUrl;
  } else if (secretKey !== undefined) {
    const inferred = inferBaseUrlFromSecretKey(secretKey);
    if (inferred) {
      merged.baseUrl = inferred;
    }
  }
  await writeConfig(merged);
  return merged;
}
