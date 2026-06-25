import { resolveRequestBody } from '../core/request-body.js';
import { collect, parseNonNegativeInteger, parsePositiveInteger, requireValue } from '../core/validators.js';
import { formatDetail, formatMessageList, formatSendResult } from '../output/formatters.js';
import { ui } from '../output/ui.js';
import { ReceivingService } from '../services/receiving-service.js';
import { SendingService } from '../services/sending-service.js';
import { bodyOptions, createApiClient, queryFromOptions, withSpinner, writeResult } from './shared.js';
import { validationError } from '../core/errors.js';

const sendBodyFieldNames = [
  'mailboxId',
  'from',
  'to',
  'cc',
  'bcc',
  'replyTo',
  'subject',
  'text',
  'html',
  'textFile',
  'htmlFile',
  'previewText',
  'attachment',
  'sandbox',
];
const replyBodyFieldNames = [
  'subject',
  'text',
  'html',
  'textFile',
  'htmlFile',
  'cc',
  'bcc',
  'replyTo',
  'previewText',
  'attachment',
  'sandbox',
];
const DEFAULT_LISTEN_LIMIT = 10;
const DEFAULT_LISTEN_INTERVAL_SECONDS = 5;
const MIN_LISTEN_INTERVAL_SECONDS = 2;
const MAX_CONSECUTIVE_LISTEN_ERRORS = 5;

export function registerEmailsCommands(program) {
  const emails = program.command('emails').description('Work with email messages');
  registerSend(emails);
  registerReceiving(emails);
}

function registerSend(emails) {
  emails
    .command('send')
    .description('Send a new email')
    .option('--mailbox-id <id>', 'Mailbox ID', parsePositiveInteger)
    .option('--from <email>', 'Sender email address')
    .option('--to <email>', 'Recipient email address', collect)
    .option('--subject <text>', 'Email subject')
    .option('--text <text>', 'Plain text body')
    .option('--html <html>', 'HTML body')
    .option('--text-file <path>', 'Read plain text body from file')
    .option('--html-file <path>', 'Read HTML body from file')
    .option('--cc <email>', 'CC address', collect)
    .option('--bcc <email>', 'BCC address', collect)
    .option('--reply-to <email>', 'Reply-To address', collect)
    .option('--preview-text <text>', 'Email preview text')
    .option('--attachment <path>', 'Attach local file', collect)
    .option('--sandbox', 'Send in sandbox mode')
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const body = await resolveRequestBody(bodyOptions(options, sendBodyFieldNames));
      validateSendBody(body);
      const service = new SendingService(await createApiClient(command));
      const result = await withSpinner(command, 'Sending email', () => service.sendEmail(body));
      writeResult(command, result, formatSendResult);
    });
}

function registerReceiving(emails) {
  const receiving = emails.command('receiving').description('Work with inbound email');

  receiving
    .command('list')
    .description('List inbound messages')
    .option('--mailbox-id <id>', 'Filter by mailbox ID', parsePositiveInteger)
    .option('--keyword <text>', 'Search keyword')
    .option('--page-no <number>', 'Page number', parsePositiveInteger)
    .option('--page-size <number>', 'Page size', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new ReceivingService(await createApiClient(command));
      const query = queryFromOptions(options, {
        mailboxId: 'mailboxId',
        keyword: 'keyword',
        pageNo: 'pageNo',
        pageSize: 'pageSize',
      });
      const result = await withSpinner(command, 'Fetching inbound messages', () => service.listMessages(query));
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
      const result = await withSpinner(command, 'Fetching inbound message', () => service.getMessage(messageUid));
      writeResult(command, result, formatDetail);
    });

  receiving
    .command('listen')
    .description('Poll new inbound messages for Agent processing')
    .option('--after <id>', 'Cursor ID from the previous result', parseNonNegativeInteger)
    .option('--limit <number>', 'Message limit', parsePositiveInteger)
    .option('--interval <seconds>', 'Polling interval in seconds (minimum 2)', parsePositiveInteger)
    .option('--json', 'Output raw JSON')
    .action(async (options, command) => {
      const service = new ReceivingService(await createApiClient(command));
      await listenForMessages(service, options, command);
    });

  receiving
    .command('reply')
    .description('Reply to an inbound message')
    .argument('<message-uid>', 'Message UID')
    .option('--subject <text>', 'Reply subject')
    .option('--text <text>', 'Plain text body')
    .option('--html <html>', 'HTML body')
    .option('--text-file <path>', 'Read plain text body from file')
    .option('--html-file <path>', 'Read HTML body from file')
    .option('--cc <email>', 'CC address', collect)
    .option('--bcc <email>', 'BCC address', collect)
    .option('--reply-to <email>', 'Reply-To address', collect)
    .option('--preview-text <text>', 'Email preview text')
    .option('--attachment <path>', 'Attach local file', collect)
    .option('--sandbox', 'Send in sandbox mode')
    .option('--json', 'Output raw JSON')
    .action(async (messageUid, options, command) => {
      requireValue(messageUid, 'Message UID is required');
      const body = await resolveRequestBody(bodyOptions(options, replyBodyFieldNames));
      validateReplyBody(body);
      const service = new ReceivingService(await createApiClient(command));
      const result = await withSpinner(command, 'Sending reply', () => service.replyMessage(messageUid, body));
      writeResult(command, result, formatSendResult);
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

async function listenForMessages(service, options, command) {
  const stdout = process.stdout;
  const stderr = process.stderr;
  const jsonMode = Boolean(options.json);
  const limit = options.limit ?? DEFAULT_LISTEN_LIMIT;
  const interval = options.interval ?? DEFAULT_LISTEN_INTERVAL_SECONDS;
  validateListenInterval(interval);

  let cursor = options.after;
  let consecutiveErrors = 0;
  let timeoutHandle;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!jsonMode) stderr.write(`\n${ui.muted('Stopped listening.')}\n`);
    process.exit(130);
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  if (!jsonMode) {
    stderr.write(`${ui.start('Connecting...')}\n`);
  }


  if (!jsonMode) {
    stderr.write(`${ui.success('Ready')}\n\n`);
    stderr.write(`${ui.heading('Polling:')} every ${interval}s\n`);
    stderr.write(`${ui.muted('Listening for new inbound emails. Press Ctrl+C to stop.')}\n\n`);
  }

  const poll = async () => {
    if (stopped) return;

    try {
      const query = cursor === undefined ? { limit } : { after: cursor, limit };
      const result = await service.listenMessages(query);
      const messages = extractMessages(result);

      if (messages.length > 0) {
        cursor = resolveListenCursor(messages) ?? cursor;
        writeListenMessages(stdout, messages, jsonMode);
      }

      consecutiveErrors = 0;
    } catch (error) {
      consecutiveErrors += 1;
      const message = error instanceof Error ? error.message : String(error);
      if (jsonMode) {
        stderr.write(`${JSON.stringify({ error: { code: 'poll_error', message } })}\n`);
      } else {
        stderr.write(`${ui.muted(`[${timestamp()}]`)} ${ui.warning(message)}\n`);
      }

      if (consecutiveErrors >= MAX_CONSECUTIVE_LISTEN_ERRORS) {
        throw validationError('Exiting after 5 consecutive API failures.');
      }
    } finally {
      if (!stopped) {
        timeoutHandle = setTimeout(() => {
          poll().catch((error) => {
            const message = error instanceof Error ? error.message : String(error);
            stderr.write(`${ui.failure(message)}\n`);
            process.exit(5);
          });
        }, interval * 1000);
      }
    }
  };

  timeoutHandle = setTimeout(() => {
    poll().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      stderr.write(`${ui.failure(message)}\n`);
      process.exit(5);
    });
  }, interval * 1000);

  await new Promise(() => {});
}

function validateListenInterval(interval) {
  if (!Number.isInteger(interval) || interval < MIN_LISTEN_INTERVAL_SECONDS) {
    throw validationError('Polling interval must be at least 2 seconds.');
  }
}

function extractMessages(result) {
  if (Array.isArray(result.data)) return result.data;
  if (Array.isArray(result.data?.list)) return result.data.list;
  return [];
}

function resolveListenCursor(messages) {
  const cursorValues = messages.map(cursorFromMessage).filter((value) => value !== undefined);
  if (cursorValues.length === 0) return undefined;

  const numericValues = cursorValues.filter(Number.isFinite);
  if (numericValues.length === 0) return undefined;

  return Math.max(...numericValues);
}

function cursorFromMessage(message) {
  const candidates = [message.id, message.messageId];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string' && /^\d+$/.test(candidate)) return Number(candidate);
  }
  return undefined;
}

function writeListenMessages(stdout, messages, jsonMode) {
  if (jsonMode) {
    for (const message of messages) {
      stdout.write(`${JSON.stringify(message)}\n`);
    }
    return;
  }

  for (const message of messages) {
    stdout.write(`${formatListenMessage(message)}\n`);
  }
}

function timestamp() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function formatListenMessage(message) {
  const from = message.fromEmail || message.envelopeFrom || '(unknown sender)';
  const to = formatAddressList(message.to || message.toEmail || message.recipients);
  const subject = truncate(message.subject || '(no subject)', 60);
  const id = message.messageUid || message.id || '';
  const route = to ? `${from} -> ${to}` : from;

  return ui.listenMessage({ time: timestamp(), route, subject, id });
}

function formatAddressList(value) {
  if (Array.isArray(value)) return value.join(', ');
  return value || '';
}

function truncate(value, maxLength) {
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}
