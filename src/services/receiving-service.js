import { readResultResponse } from '../core/result.js';

export class ReceivingService {
  constructor(client) {
    this.client = client;
  }

  listMessages(query = {}) {
    return this.client.get('/v1/message/list', { searchParams: query }).then(readResultResponse);
  }

  getMessage(messageUid) {
    return this.client.get('/v1/message/get', { searchParams: { messageUid } }).then(readResultResponse);
  }

  listenMessages(query = {}) {
    return this.client.get('/v1/message/listen', { searchParams: query }).then(readResultResponse);
  }

  replyMessage(messageUid, body) {
    return this.client.post('/v1/message/reply', { searchParams: { messageUid }, json: body }).then(readResultResponse);
  }
}
