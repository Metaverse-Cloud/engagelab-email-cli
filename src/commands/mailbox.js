import { parsePositiveInteger } from '../core/validators.js';
import { formatMailboxList } from '../output/formatters.js';
import { MailboxService } from '../services/mailbox-service.js';
import { createApiClient, queryFromOptions, withSpinner, writeResult } from './shared.js';

export function registerMailboxCommands(program) {
  const mailbox = program.command('mailbox').description('Work with mailboxes');

  mailbox
    .command('list')
    .description('List mailboxes')
    .option('--mailbox <address>', 'Filter by mailbox address')
    .option('--page-no <number>', 'Page number', parsePositiveInteger)
    .option('--page-size <number>', 'Page size', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new MailboxService(await createApiClient(command));
      const query = queryFromOptions(options, {
        mailbox: 'mailbox',
        pageNo: 'pageNo',
        pageSize: 'pageSize',
      });
      const result = await withSpinner(command, 'Fetching mailboxes', () => service.listMailboxes(query));
      writeResult(command, result, formatMailboxList);
    });
}