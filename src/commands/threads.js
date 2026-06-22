import { ThreadsService } from '../services/threads-service.js';
import { parseNonNegativeInteger, parsePositiveInteger, requireValue } from '../core/validators.js';
import { createApiClient, queryFromOptions, writeResult } from './shared.js';
import { formatDetail, formatMessageList, formatThreadList } from '../output/formatters.js';

export function registerThreadsCommands(program) {
  const threads = program.command('threads').description('Work with email threads');

  threads
    .command('list')
    .description('List threads')
    .option('--mailbox-id <id>', 'Filter by mailbox ID', parsePositiveInteger)
    .option('--status <number>', 'Filter by thread status', parseNonNegativeInteger)
    .option('--keyword <text>', 'Search keyword')
    .option('--subject <text>', 'Search normalized subject')
    .option('--participant <email>', 'Search participant')
    .option('--sender <email>', 'Search sender')
    .option('--target-mailbox <email>', 'Search target mailbox')
    .option('--start-time <datetime>', 'Latest message start time')
    .option('--end-time <datetime>', 'Latest message end time')
    .option('--page-no <number>', 'Page number', parsePositiveInteger)
    .option('--page-size <number>', 'Page size', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new ThreadsService(await createApiClient(command));
      const result = await service.listThreads(
        queryFromOptions(options, {
          mailboxId: 'mailboxId',
          status: 'status',
          keyword: 'keyword',
          subject: 'subject',
          participant: 'participant',
          sender: 'sender',
          targetMailbox: 'targetMailbox',
          startTime: 'startTime',
          endTime: 'endTime',
          pageNo: 'pageNo',
          pageSize: 'pageSize',
        }),
      );
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
      writeResult(command, await service.getThread(threadId), formatDetail);
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
      const result = await service.listThreadMessages(
        threadId,
        queryFromOptions(options, { limit: 'limit', includeContent: 'includeContent' }),
      );
      writeResult(command, result, formatMessageList);
    });
}
