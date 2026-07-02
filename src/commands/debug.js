import { readConfig, writeConfig } from '../config/config-store.js';
import { ui } from '../output/ui.js';

export function registerDebugCommands(program) {
  const debug = program.command('debug', { hidden: true }).description('Hidden debug commands');

  const http = debug.command('http', { hidden: true }).description('Hidden HTTP debug logging controls');

  http
    .command('on', { hidden: true })
    .description('Enable hidden HTTP debug logging')
    .action(async () => {
      await setHttpDebug(true);
      process.stdout.write(`${ui.success('HTTP debug enabled')}\n`);
    });

  http
    .command('off', { hidden: true })
    .description('Disable hidden HTTP debug logging')
    .action(async () => {
      await setHttpDebug(false);
      process.stdout.write(`${ui.success('HTTP debug disabled')}\n`);
    });
}

async function setHttpDebug(enabled) {
  const current = await readConfig();
  await writeConfig({ ...current, debugHttp: enabled });
}
