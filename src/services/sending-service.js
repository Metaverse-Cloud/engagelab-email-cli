import { readResultResponse } from '../core/result.js';

export class SendingService {
  constructor(client) {
    this.client = client;
  }

  sendEmail(body) {
    return this.client.post('v1/mail/send', { json: body }).then(readResultResponse);
  }
}
