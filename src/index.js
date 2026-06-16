#!/usr/bin/env node

import { Command } from 'commander';
import { registerMessageCommands } from './commands/messages.js';

const program = new Command();

program
  .name('my-project')
  .description('CLI for the Java backend email service')
  .version('0.1.0')
  .option('-u, --base-url <url>', 'Java backend API base URL', process.env.MY_PROJECT_BASE_URL)
  .option('-t, --token <token>', 'API bearer token', process.env.MY_PROJECT_TOKEN);

registerMessageCommands(program);

program.parseAsync(process.argv).catch((error) => {
  const message = error?.message || 'Command failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
