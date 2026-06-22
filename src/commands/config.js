import { maskSecretKey, readConfig, writeConfig } from '../config/config-store.js';
import { validationError } from '../core/errors.js';

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
      await writeConfig({ ...current, ...stripUndefined(options) });
      process.stdout.write('Config saved\n');
    });

  config
    .command('list')
    .description('Show local CLI configuration')
    .action(async () => {
      const current = await readConfig();
      process.stdout.write(`baseUrl: ${current.baseUrl || ''}\n`);
      process.stdout.write(`secretKey: ${maskSecretKey(current.secretKey)}\n`);
    });
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
