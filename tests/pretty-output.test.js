import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatMessageList, formatSendResult } from '../src/output/formatters.js';

describe('pretty output', () => {
  it('renders tables with boxed borders for human-readable lists', () => {
    const output = formatMessageList({
      data: [
        {
          messageUid: 'msg-1',
          threadId: 'thread-1',
          fromEmail: 'alice@example.com',
          subject: 'Hello',
        },
      ],
    });

    assert.match(output, /┌/);
    assert.match(output, /Message UID/);
    assert.match(output, /msg-1/);
  });

  it('renders send success with a visual success marker', () => {
    const output = formatSendResult({
      data: {
        messageUid: 'msg-sent',
        requestId: 'req-1',
      },
    });

    assert.match(stripAnsi(output), /^✓ Sent/m);
    assert.match(output, /messageUid: msg-sent/);
    assert.match(output, /requestId: req-1/);
  });
});

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/g, '');
}
