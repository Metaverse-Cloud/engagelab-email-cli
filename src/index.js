#!/usr/bin/env node

import { Command } from 'commander';
import { registerConfigCommands } from './commands/config.js';
import { registerDebugCommands } from './commands/debug.js';
import { registerEmailsCommands } from './commands/emails.js';
import { registerMailboxCommands } from './commands/mailbox.js';
import { registerThreadsCommands } from './commands/threads.js';
import { formatCliErrorMessage, toCliError } from './core/errors.js';
import { writeJsonError } from './output/json.js';
import { ui } from './output/ui.js';
import { CLI_VERSION } from './version.js';

export function configureProgram(program = new Command()) {
  program
    .name('engagelab-email-cli')
    .description('CLI for EngageLab Email Agent workflows')
    .version(CLI_VERSION)
    .option('-u, --base-url <url>', 'EngageLab Email API base URL', process.env.ENGAGELAB_EMAIL_BASE_URL)
    .option('--secret-key <key>', 'EngageLab Email Secret Key', process.env.ENGAGELAB_EMAIL_SECRET_KEY);

  registerConfigCommands(program);
  registerDebugCommands(program);
  registerMailboxCommands(program);
  registerThreadsCommands(program);
  registerEmailsCommands(program);

  return program;
}

export async function run(argv = process.argv) {
  const program = configureProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    const cliError = toCliError(error);
    if (cliError.data?.silent) {
      process.exitCode = cliError.exitCode;
      return;
    }
    if (argv.includes('--json')) {
      writeJsonError(process.stderr, cliError);
    } else {
      process.stderr.write(`${ui.failure(formatCliErrorMessage(cliError))}\n`);
    }
    process.exitCode = cliError.exitCode;
  }
}