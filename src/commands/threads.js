import { ThreadsService } from '../services/threads-service.js';
import { parseNonNegativeInteger, parsePositiveInteger, requireValue } from '../core/validators.js';
import { createApiClient, queryFromOptions, withSpinner, writeResult } from './shared.js';
import { formatDetail, formatMessageList, formatThreadList } from '../output/formatters.js';

export function registerThreadsCommands(program) {
  const threads = program.command('threads').description('Work with email threads');

  threads
    .command('list')
    .description('List threads')
    .option('--mailbox-id <id>', 'Filter by mailbox ID', parsePositiveInteger)
    .option('--subject <text>', 'Search normalized subject')
    .option('--participant <email>', 'Search participant')
    .option('--start-time <timestamp>', 'Latest message start timestamp in milliseconds', parseNonNegativeInteger)
    .option('--end-time <timestamp>', 'Latest message end timestamp in milliseconds', parseNonNegativeInteger)
    .option('--page-no <number>', 'Page number', parsePositiveInteger)
    .option('--page-size <number>', 'Page size', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new ThreadsService(await createApiClient(command));
      const query = queryFromOptions(options, {
        mailboxId: 'mailboxId',
        subject: 'subject',
        participant: 'participant',
        startTime: 'startTime',
        endTime: 'endTime',
        pageNo: 'pageNo',
        pageSize: 'pageSize',
      });
      const result = await withSpinner(command, 'Fetching threads', () => service.listThreads(query));
      writeResult(command, result, formatThreadList);
    });

  threads
    .command('get')
    .description('Get thread details')
    .argument('<thread-id>', 'Thread ID')
    .option('--json', 'Output raw JSON')
    .action(async (threadId, options, command) => {
      requireValue(threadId, 'Thread ID is required');
      const service = new ThreadsService(await createApiClient(command));
      const result = await withSpinner(command, 'Fetching thread', () => service.getThread(threadId));
      writeResult(command, result, formatDetail);
    });

  threads
    .command('messages')
    .description('List messages in a thread')
    .argument('<thread-id>', 'Thread ID')
    .option('--limit <number>', 'Message limit', parsePositiveInteger)
    .option('--include-content', 'Include text/html/headers/attachments')
    .option('--json', 'Output raw JSON')
    .action(async (threadId, options, command) => {
      requireValue(threadId, 'Thread ID is required');
      const service = new ThreadsService(await createApiClient(command));
      const query = queryFromOptions(options, { limit: 'limit', includeContent: 'includeContent' });
      const result = await withSpinner(command, 'Fetching thread messages', () => service.listThreadMessages(threadId, query));
      writeResult(command, result, formatMessageList);
    });
}
