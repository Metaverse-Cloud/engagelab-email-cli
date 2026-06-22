import { readResultResponse } from '../core/result.js';

export class ReceivingService {
  constructor(client) {
    this.client = client;
  }

  listMessages(query = {}) {
    return this.client.get('v1/message', { searchParams: query }).then(readResultResponse);
  }

  getMessage(messageUid) {
    return this.client.get(`v1/message/${encodeURIComponent(messageUid)}`).then(readResultResponse);
  }

  listenMessages(query = {}) {
    return this.client.get('v1/message/listen', { searchParams: query }).then(readResultResponse);
  }

  ackMessage(messageUid) {
    return this.client.post(`v1/message/${encodeURIComponent(messageUid)}/ack`).then(readResultResponse);
  }

  failMessage(messageUid) {
    return this.client.post(`v1/message/${encodeURIComponent(messageUid)}/fail`).then(readResultResponse);
  }

  replyMessage(messageUid, body) {
    return this.client.post(`v1/message/${encodeURIComponent(messageUid)}/reply`, { json: body }).then(readResultResponse);
  }
}
