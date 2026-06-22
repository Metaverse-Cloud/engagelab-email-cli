#!/usr/bin/env node

import { Command } from 'commander';
import { registerConfigCommands } from './commands/config.js';
import { registerEmailsCommands } from './commands/emails.js';
import { registerThreadsCommands } from './commands/threads.js';
import { toCliError } from './core/errors.js';
import { writeJsonError } from './output/json.js';

export function configureProgram(program = new Command()) {
  program
    .name('engagelab-email')
    .description('CLI for EngageLab Email Agent workflows')
    .version('0.1.0')
    .option('-u, --base-url <url>', 'EngageLab Email API base URL', process.env.ENGAGELAB_EMAIL_BASE_URL)
    .option('--secret-key <key>', 'EngageLab Email Secret Key', process.env.ENGAGELAB_EMAIL_SECRET_KEY);

  registerConfigCommands(program);
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
    if (argv.includes('--json')) {
      writeJsonError(process.stderr, cliError);
    } else {
      process.stderr.write(`${cliError.message}\n`);
    }
    process.exitCode = cliError.exitCode;
  }
}
