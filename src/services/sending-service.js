import { readResultResponse } from '../core/result.js';
import { apiPath } from '../commands/shared.js';

export class SendingService {
  constructor(client) {
    this.client = client;
  }

  sendEmail(body) {
    return this.client.post(apiPath('/mail/send'), { json: body }).then(readResultResponse);
  }
}
