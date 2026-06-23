import pc from 'picocolors';
import { renderTable } from './table.js';
import { formatAgentConsumeStatus, formatMessageStatus } from './status.js';

export function formatThreadList(result) {
  return renderTable(result.data?.list || [], [
    { header: 'Thread ID', value: (row) => row.threadId },
    { header: 'Subject', value: (row) => row.subject },
    { header: 'Participants', value: (row) => row.participants },
    { header: 'Last Message', value: (row) => row.lastMessageAt },
    { header: 'Count', value: (row) => row.messageCount },
    { header: 'Status', value: (row) => row.status },
  ]);
}

export function formatMessageList(result) {
  return renderTable(result.data?.list || result.data || [], [
    { header: 'Message UID', value: (row) => row.messageUid },
    { header: 'Thread ID', value: (row) => row.threadId },
    { header: 'From', value: (row) => row.fromEmail || row.envelopeFrom },
    { header: 'Subject', value: (row) => row.subject },
    { header: 'Status', value: (row) => formatMessageStatus(row.status) },
    { header: 'Agent', value: (row) => formatAgentConsumeStatus(row.agentConsumeStatus) },
    { header: 'Received', value: (row) => row.receivedAt },
  ]);
}

export function formatDetail(result) {
  return JSON.stringify(result.data ?? result, null, 2);
}

export function formatSendResult(result) {
  const data = result.data || {};
  return [
    `${pc.green('✓')} Sent`,
    data.messageUid ? `messageUid: ${data.messageUid}` : null,
    data.requestId ? `requestId: ${data.requestId}` : null,
    data.emailIds ? `emailIds: ${data.emailIds.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
