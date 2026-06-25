import { renderTable } from './table.js';
import { formatAgentConsumeStatus, formatMessageStatus } from './status.js';
import { ui } from './ui.js';

export function formatThreadList(result) {
  return renderTable(result.data?.list || [], [
    { header: 'Thread ID', value: (row) => row.threadId },
    { header: 'Subject', value: (row) => row.subject },
    { header: 'Participants', value: (row) => row.participants },
    { header: 'Last Message', value: (row) => row.lastMessageAt },
    { header: 'Count', value: (row) => row.messageCount },
  ]);
}

export function formatMessageList(result) {
  return renderTable(result.data?.list || result.data || [], [
    { header: 'Message UID', value: (row) => row.messageUid },
    { header: 'Thread ID', value: (row) => row.threadId },
    { header: 'From', value: (row) => row.fromEmail || row.envelopeFrom },
    { header: 'Subject', value: (row) => row.subject },
    { header: 'Received', value: (row) => row.receivedAt },
  ]);
}

export function formatDetail(result) {
  return JSON.stringify(result.data ?? result, null, 2);
}

export function formatSendResult(result) {
  const data = result.data || {};
  return [
    ui.success(ui.heading('Sent')),
    data.messageUid ? `${ui.label('messageUid')}: ${data.messageUid}` : null,
    data.requestId ? `${ui.label('requestId')}: ${data.requestId}` : null,
    data.emailIds ? `${ui.label('emailIds')}: ${data.emailIds.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
