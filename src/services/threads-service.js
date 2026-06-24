import { readResultResponse } from '../core/result.js';
import { apiPath } from '../commands/shared.js';

export class ThreadsService {
  constructor(client) {
    this.client = client;
  }

  listThreads(query = {}) {
    return this.client.get(apiPath('/thread/list'), { searchParams: query }).then(readResultResponse);
  }

  getThread(threadId) {
    return this.client.get(apiPath('/thread/get'), { searchParams: { threadId } }).then(readResultResponse);
  }

  listThreadMessages(threadId, query = {}) {
    return this.client.get(apiPath('/thread/messages'), { searchParams: { threadId, ...query } }).then(readResultResponse);
  }
}
