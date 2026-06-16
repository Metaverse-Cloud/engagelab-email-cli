export class ServiceRequestError extends Error {
  constructor(message, { status, data, cause } = {}) {
    super(message, { cause });
    this.name = 'ServiceRequestError';
    this.status = status;
    this.data = data;
  }
}

export class EmailService {
  constructor({
    baseURL,
    token,
    timeout,
    headers,
    httpClient,
    clientFactory = createDefaultHttpClient,
  } = {}) {
    this.options = { baseURL, token, timeout, headers };
    this.httpClient = httpClient;
    this.clientFactory = clientFactory;
  }

  async request(config) {
    try {
      const httpClient = await this.getHttpClient();
      const response = await httpClient.request(config);
      return response.data;
    } catch (error) {
      throw toServiceRequestError(error);
    }
  }

  getMessages(params = {}) {
    return this.request({
      method: 'GET',
      url: '/messages',
      params,
    });
  }

  sendMessage(data) {
    return this.request({
      method: 'POST',
      url: '/messages',
      data,
    });
  }

  async getHttpClient() {
    if (!this.httpClient) {
      this.httpClient = await this.clientFactory(this.options);
    }

    return this.httpClient;
  }
}

async function createDefaultHttpClient(options) {
  const { createHttpClient } = await import('./http-client.js');
  return createHttpClient(options);
}

function toServiceRequestError(error) {
  if (error instanceof ServiceRequestError) {
    return error;
  }

  const status = error?.response?.status;
  const data = error?.response?.data;
  const message = data?.message || error?.message || 'Service request failed';

  return new ServiceRequestError(message, {
    status,
    data,
    cause: error,
  });
}
