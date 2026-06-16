import chalk from 'chalk';
import ora from 'ora';
import { EmailService } from '../email-service.js';

export function registerMessageCommands(program) {
  const engagelab = program
    .command('engagelab')
    .description('Work with email engagelab');

  engagelab
    .command('list')
    .description('List email engagelab')
    .option('-l, --limit <number>', 'Maximum engagelab to fetch', parsePositiveInteger, 20)
    .action(async (options) => {
      const service = createEmailService(program);
      const spinner = ora('Fetching engagelab...').start();

      try {
        const result = await service.getMessages({ limit: options.limit });
        spinner.succeed('engagelab fetched');
        printJson(result);
      } catch (error) {
        spinner.fail('Failed to fetch engagelab');
        throw formatCliError(error);
      }
    });

  engagelab
    .command('send')
    .description('Send an email message')
    .requiredOption('--to <email>', 'Recipient email address')
    .requiredOption('--subject <text>', 'Message subject')
    .requiredOption('--body <text>', 'Message body')
    .action(async (options) => {
      const service = createEmailService(program);
      const spinner = ora('Sending message...').start();

      try {
        const result = await service.sendMessage({
          to: options.to,
          subject: options.subject,
          body: options.body,
        });
        spinner.succeed('Message sent');
        printJson(result);
      } catch (error) {
        spinner.fail('Failed to send message');
        throw formatCliError(error);
      }
    });
}

function createEmailService(program) {
  const options = program.opts();

  return new EmailService({
    baseURL: options.baseUrl,
    token: options.token,
  });
}

function parsePositiveInteger(value) {
  const number = Number.parseInt(value, 10);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error('Expected a positive integer');
  }

  return number;
}

function formatCliError(error) {
  const details = error?.status ? `HTTP ${error.status}: ${error.message}` : error?.message;
  return new Error(chalk.red(details || 'Unknown CLI error'));
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
