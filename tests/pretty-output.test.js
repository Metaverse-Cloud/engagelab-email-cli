import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatMailboxList, formatMessageList, formatSendResult } from '../src/output/formatters.js';
import { renderTable } from '../src/output/table.js';

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


  it('renders message tables without color accents', () => {
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

    assert.doesNotMatch(output, /\u001B\[[0-9;]*m/);
    assert.match(output, /alice@example\.com/);
    assert.match(output, /Hello/);
  });

  it('renders table cells without ANSI colors regardless of column position', () => {
    const output = renderTable([{ first: 'alpha', second: 'beta' }], [
      { header: 'Any First Label', value: (row) => row.first },
      { header: 'Any Second Label', value: (row) => row.second },
    ]);

    assert.doesNotMatch(output, /\u001B\[[0-9;]*m/);
    assert.match(output, /alpha/);
    assert.match(output, /beta/);
  });

  it('renders status-like table values without ANSI colors', () => {
    const output = renderTable([{ result: 'failed' }], [
      { header: 'Outcome', value: (row) => row.result },
    ]);

    assert.doesNotMatch(output, /\u001B\[[0-9;]*m/);
    assert.match(output, /failed/);
  });

  it('renders send success with a visual success marker', () => {
    const output = formatSendResult({
      data: {
        messageUid: 'msg-sent',
        requestId: 'req-1',
      },
    });

    assert.match(stripAnsi(output), /^OK Sent/m);
    assert.match(stripAnsi(output), /messageUid: msg-sent/);
    assert.match(stripAnsi(output), /requestId: req-1/);
  });
});

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/g, '');
}
