import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatMessageList, formatSendResult } from '../src/output/formatters.js';
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


  it('renders message tables with color accents', () => {
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

    assert.match(output, /\u001B\[[0-9;]*m/);
    assert.match(stripAnsi(output), /alice@example\.com/);
    assert.match(stripAnsi(output), /Hello/);
  });

  it('colors table cells from column position instead of header names', () => {
    const output = renderTable([{ first: 'alpha', second: 'beta' }], [
      { header: 'Any First Label', value: (row) => row.first },
      { header: 'Any Second Label', value: (row) => row.second },
    ]);

    assert.match(output, /\u001B\[[0-9;]*malpha\u001B\[[0-9;]*m/);
    assert.match(output, /\u001B\[[0-9;]*mbeta\u001B\[[0-9;]*m/);
  });

  it('colors status-like values regardless of column header', () => {
    const output = renderTable([{ result: 'failed' }], [
      { header: 'Outcome', value: (row) => row.result },
    ]);

    assert.match(output, /\u001B\[[0-9;]*mfailed\u001B\[[0-9;]*m/);
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
