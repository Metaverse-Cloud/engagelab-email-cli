export function createHttpClient({
  baseURL,
  token,
  timeout = 30000,
  headers = {},
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required');
  }

  return {
    async request(config = {}) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetchImpl(buildUrl(baseURL, config.url, config.params), {
          method: config.method || 'GET',
          headers: buildHeaders(headers, token, config.headers, config.data),
          body: serializeBody(config.data),
          signal: controller.signal,
        });
        const data = await parseResponseBody(response);

        if (!response.ok) {
          const error = new Error(`Request failed with status code ${response.status}`);
          error.response = {
            status: response.status,
            data,
          };
          throw error;
        }

        return {
          data,
          status: response.status,
          headers: response.headers,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}

function buildUrl(baseURL, url = '', params) {
  const base = baseURL || 'http://localhost';
  const requestPath = url.startsWith('/') ? url.slice(1) : url;
  const fullUrl = new URL(requestPath, ensureTrailingSlash(base));

  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) {
      fullUrl.searchParams.set(key, String(value));
    }
  }

  if (!baseURL) {
    return `${fullUrl.pathname}${fullUrl.search}`;
  }

  return fullUrl.toString();
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function buildHeaders(defaultHeaders, token, requestHeaders, data) {
  const finalHeaders = {
    ...defaultHeaders,
    ...requestHeaders,
  };

  if (isPlainObject(data) && !hasHeader(finalHeaders, 'content-type')) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  return finalHeaders;
}

function serializeBody(data) {
  if (data === undefined || data === null) {
    return undefined;
  }

  if (typeof data === 'string' || data instanceof URLSearchParams) {
    return data;
  }

  return JSON.stringify(data);
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function hasHeader(headers, name) {
  return Object.keys(headers).some((key) => key.toLowerCase() === name);
}

async function parseResponseBody(response) {
  const contentType = response.headers?.get?.('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? tryParseJson(text) : null;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
