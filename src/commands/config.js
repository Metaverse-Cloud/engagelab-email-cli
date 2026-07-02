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
      const current = await readConfig();
      const merged = { ...current, ...stripUndefined(options) };
      // When no explicit --base-url is provided, auto-map it from the secret key region.
      if (!options.baseUrl) {
        const inferred = inferBaseUrlFromSecretKey(merged.secretKey);
        if (inferred) {
          merged.baseUrl = inferred;
        }
      }
      await writeConfig(merged);
      process.stdout.write(`${ui.success('Config saved')}\n`);
      if (!options.baseUrl && merged.baseUrl) {
        process.stdout.write(`${ui.muted(`baseUrl mapped from key region: ${merged.baseUrl}`)}\n`);
      }
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

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
