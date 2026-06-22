import { readResultResponse } from '../core/result.js';

export class ThreadsService {
  constructor(client) {
    this.client = client;
  }

  listThreads(query = {}) {
    return this.client.get('v1/thread', { searchParams: query }).then(readResultResponse);
  }

  getThread(threadId) {
    return this.client.get(`v1/thread/${encodeURIComponent(threadId)}`).then(readResultResponse);
  }

  listThreadMessages(threadId, query = {}) {
    return this.client
      .get(`v1/thread/${encodeURIComponent(threadId)}/messages`, { searchParams: query })
      .then(readResultResponse);
  }
}
