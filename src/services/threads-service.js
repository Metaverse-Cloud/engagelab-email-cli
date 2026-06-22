import { readResultResponse } from '../core/result.js';

export class ThreadsService {
  constructor(client) {
    this.client = client;
  }

  listThreads(query = {}) {
    return this.client.get('/v1/thread/list', { searchParams: query }).then(readResultResponse);
  }

  getThread(threadId) {
    return this.client.get('/v1/thread/get', { searchParams: { threadId } }).then(readResultResponse);
  }

  listThreadMessages(threadId, query = {}) {
    return this.client.get('/v1/thread/messages', { searchParams: { threadId, ...query } }).then(readResultResponse);
  }
}
