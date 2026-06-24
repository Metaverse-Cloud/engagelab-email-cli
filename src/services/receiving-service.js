import { readResultResponse } from '../core/result.js';
import { apiPath } from '../commands/shared.js';

export class ReceivingService {
  constructor(client) {
    this.client = client;
  }

  listMessages(query = {}) {
    return this.client.get(apiPath('/message/list'), { searchParams: query }).then(readResultResponse);
  }

  getMessage(messageUid) {
    return this.client.get(apiPath('/message/get'), { searchParams: { messageUid } }).then(readResultResponse);
  }

  listenMessages(query = {}) {
    return this.client.get(apiPath('/message/listen'), { searchParams: query }).then(readResultResponse);
  }

  replyMessage(messageUid, body) {
    return this.client.post(apiPath('/message/reply'), { searchParams: { messageUid }, json: body }).then(readResultResponse);
  }
}
