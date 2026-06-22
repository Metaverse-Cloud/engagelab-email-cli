export function formatMessageStatus(status) {
  return (
    {
      0: 'received',
      1: 'parsing',
      2: 'parsed',
      3: 'parse_failed',
      4: 'replied',
    }[status] ?? status
  );
}

export function formatAgentConsumeStatus(status) {
  return (
    {
      0: 'pending',
      1: 'processing',
      2: 'done',
      3: 'failed',
    }[status] ?? status
  );
}
