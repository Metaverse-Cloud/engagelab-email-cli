import { resolveRequestBody } from '../core/request-body.js';
import { collect, parseNonNegativeInteger, parsePositiveInteger, requireValue } from '../core/validators.js';
import { formatDetail, formatMessageList, formatSendResult } from '../output/formatters.js';
import { ReceivingService } from '../services/receiving-service.js';
import { SendingService } from '../services/sending-service.js';
import { bodyOptions, createApiClient, queryFromOptions, writeResult } from './shared.js';
import { validationError } from '../core/errors.js';

const bodyFieldNames = [
  'bodyFile',
  'bodyJson',
  'mailboxId',
  'to',
  'subject',
  'text',
  'html',
  'textFile',
  'htmlFile',
  'cc',
  'bcc',
];

export function registerEmailsCommands(program) {
  const emails = program.command('emails').description('Work with email messages');
  registerSend(emails);
  registerReceiving(emails);
}

function registerSend(emails) {
  emails
    .command('send')
    .description('Send a new email')
    .option('--body-file <path>', 'Read full JSON request body from file')
    .option('--body-json <json>', 'Read full JSON request body from inline JSON')
    .option('--mailbox-id <id>', 'Mailbox ID', parsePositiveInteger)
    .option('--to <email>', 'Recipient email address', collect)
    .option('--subject <text>', 'Email subject')
    .option('--text <text>', 'Plain text body')
    .option('--html <html>', 'HTML body')
    .option('--text-file <path>', 'Read plain text body from file')
    .option('--html-file <path>', 'Read HTML body from file')
    .option('--cc <email>', 'CC address', collect)
    .option('--bcc <email>', 'BCC address', collect)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const body = await resolveRequestBody(bodyOptions(options, bodyFieldNames));
      validateSendBody(body);
      const service = new SendingService(await createApiClient(command));
      writeResult(command, await service.sendEmail(body), formatSendResult);
    });
}

function registerReceiving(emails) {
  const receiving = emails.command('receiving').description('Work with inbound email');

  receiving
    .command('list')
    .description('List inbound messages')
    .option('--mailbox-id <id>', 'Filter by mailbox ID', parsePositiveInteger)
    .option('--status <number>', 'Message status', parseNonNegativeInteger)
    .option('--agent-consume-status <number>', 'Agent consume status', parseNonNegativeInteger)
    .option('--keyword <text>', 'Search keyword')
    .option('--page-no <number>', 'Page number', parsePositiveInteger)
    .option('--page-size <number>', 'Page size', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new ReceivingService(await createApiClient(command));
      const result = await service.listMessages(
        queryFromOptions(options, {
          mailboxId: 'mailboxId',
          status: 'status',
          agentConsumeStatus: 'agentConsumeStatus',
          keyword: 'keyword',
          pageNo: 'pageNo',
          pageSize: 'pageSize',
        }),
      );
      writeResult(command, result, formatMessageList);
    });

  receiving
    .command('get')
    .description('Get inbound message details')
    .argument('<message-uid>', 'Message UID')
    .option('--json', 'Output raw JSON')
    .action(async (messageUid, options, command) => {
      requireValue(messageUid, 'Message UID is required');
      const service = new ReceivingService(await createApiClient(command));
      writeResult(command, await service.getMessage(messageUid), formatDetail);
    });

  receiving
    .command('listen')
    .description('Long-poll and claim messages for Agent processing')
    .option('--mailbox-id <id>', 'Filter by mailbox ID', parsePositiveInteger)
    .option('--limit <number>', 'Message limit', parsePositiveInteger)
    .option('--timeout-seconds <number>', 'Long poll timeout seconds', parseNonNegativeInteger)
    .option('--interval-millis <number>', 'Poll interval milliseconds', parsePositiveInteger)
    .option('--claim-ttl-seconds <number>', 'Claim TTL seconds', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new ReceivingService(await createApiClient(command));
      const result = await service.listenMessages(
        queryFromOptions(options, {
          mailboxId: 'mailboxId',
          limit: 'limit',
          timeoutSeconds: 'timeoutSeconds',
          intervalMillis: 'intervalMillis',
          claimTtlSeconds: 'claimTtlSeconds',
        }),
      );
      writeResult(command, result, formatMessageList);
    });

  receiving
    .command('ack')
    .description('Mark a claimed message as consumed')
    .argument('<message-uid>', 'Message UID')
    .option('--json', 'Output raw JSON')
    .action(async (messageUid, options, command) => {
      requireValue(messageUid, 'Message UID is required');
      const service = new ReceivingService(await createApiClient(command));
      writeResult(command, await service.ackMessage(messageUid), formatDetail);
    });

  receiving
    .command('fail')
    .description('Mark a claimed message as failed')
    .argument('<message-uid>', 'Message UID')
    .option('--json', 'Output raw JSON')
    .action(async (messageUid, options, command) => {
      requireValue(messageUid, 'Message UID is required');
      const service = new ReceivingService(await createApiClient(command));
      writeResult(command, await service.failMessage(messageUid), formatDetail);
    });

  receiving
    .command('reply')
    .description('Reply to an inbound message')
    .argument('<message-uid>', 'Message UID')
    .option('--body-file <path>', 'Read full JSON request body from file')
    .option('--body-json <json>', 'Read full JSON request body from inline JSON')
    .option('--subject <text>', 'Reply subject')
    .option('--text <text>', 'Plain text body')
    .option('--html <html>', 'HTML body')
    .option('--text-file <path>', 'Read plain text body from file')
    .option('--html-file <path>', 'Read HTML body from file')
    .option('--cc <email>', 'CC address', collect)
    .option('--bcc <email>', 'BCC address', collect)
    .option('--json', 'Output raw JSON')
    .action(async (messageUid, options, command) => {
      requireValue(messageUid, 'Message UID is required');
      const body = await resolveRequestBody(
        bodyOptions(options, ['bodyFile', 'bodyJson', 'subject', 'text', 'html', 'textFile', 'htmlFile', 'cc', 'bcc']),
      );
      validateReplyBody(body);
      const service = new ReceivingService(await createApiClient(command));
      writeResult(command, await service.replyMessage(messageUid, body), formatSendResult);
    });
}

function validateSendBody(body) {
  if (!body.mailboxId) throw validationError('mailboxId is required');
  if (!Array.isArray(body.to) || body.to.length === 0) throw validationError('At least one recipient is required');
  if (!body.subject) throw validationError('subject is required');
  validateTextOrHtml(body);
}

function validateReplyBody(body) {
  validateTextOrHtml(body);
}

function validateTextOrHtml(body) {
  if (!body.text && !body.html) {
    throw validationError('At least one of text or html is required');
  }
}
