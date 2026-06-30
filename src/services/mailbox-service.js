import { readResultResponse } from '../core/result.js';
import { apiPath } from '../commands/shared.js';

export class MailboxService {
  constructor(client) {
    this.client = client;
  }

  listMailboxes(query = {}) {
    return this.client.get(apiPath('/mailbox/list'), { searchParams: query }).then(readResultResponse);
  }
}