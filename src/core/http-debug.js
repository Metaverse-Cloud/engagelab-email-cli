import { maskSecretKey } from '../config/config-store.js';

const MAX_BODY_PREVIEW_LENGTH = 20 * 1024;
const requestStartTimes = new WeakMap();

export function createHttpDebugHooks({ stderr = process.stderr } = {}) {
  return {
    beforeRequest: [
      async ({ request }) => {
        requestStartTimes.set(request, Date.now());
        stderr.write(`${formatRequest(request, await readRequestBody(request))}\n`);
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        const elapsedMs = Date.now() - (requestStartTimes.get(request) ?? Date.now());
        stderr.write(`${await formatResponse(response, elapsedMs)}\n`);
        return response;
      },
    ],
  };
}

async function readRequestBody(request) {
  if (!request.body) return undefined;
  try {
    return await request.clone().text();
  } catch {
    return '<unavailable>';
  }
}

function formatRequest(request, rawBody) {
  const lines = [
    '[engagelab-email-cli debug] HTTP Request',
    `${request.method} ${request.url}`,
    'headers:',
    ...formatHeaders(request.headers),
  ];

  if (rawBody !== undefined && rawBody !== "") {
    lines.push('body:', formatBody(rawBody));
  }

  return `${lines.join('\n')}\n`;
}

async function formatResponse(response, elapsedMs) {
  const rawBody = await readResponseBody(response);
  const lines = [
    `[engagelab-email-cli debug] HTTP Response ${response.status} ${elapsedMs}ms`,
    'headers:',
    ...formatHeaders(response.headers),
  ];

  if (rawBody !== undefined && rawBody !== "") {
    lines.push('body:', formatBody(rawBody));
  }

  return `${lines.join('\n')}\n`;
}

async function readResponseBody(response) {
  try {
    return await response.clone().text();
  } catch {
    return '<unavailable>';
  }
}

function formatHeaders(headers) {
  if (!headers || typeof headers.entries !== 'function') return ['  <none>'];

  const lines = [];
  for (const [name, value] of headers.entries()) {
    lines.push(`  ${name}: ${sanitizeHeader(name, value)}`);
  }
  return lines.length > 0 ? lines : ['  <none>'];
}

function sanitizeHeader(name, value) {
  if (name.toLowerCase() === 'authorization') {
    const match = value.match(/^Bearer\s+(.+)$/i);
    return match ? `Bearer ${maskSecretKey(match[1])}` : '<redacted>';
  }
  return value;
}

function formatBody(rawBody) {
  const parsed = parseJson(rawBody);
  const text = parsed === undefined ? rawBody : JSON.stringify(sanitizeValue(parsed), null, 2);
  if (text.length <= MAX_BODY_PREVIEW_LENGTH) return text;
  return `${text.slice(0, MAX_BODY_PREVIEW_LENGTH)}\n<truncated, length=${text.length}>`;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function sanitizeValue(value, key = "") {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (!value || typeof value !== "object") return sanitizeScalar(value, key);

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitizeValue(entryValue, entryKey)]),
  );
}

function sanitizeScalar(value, key) {
  if (typeof value !== "string") return value;
  if (key === 'content') return `<base64 omitted, length=${value.length}>`;
  if (key.toLowerCase().includes('secret')) return maskSecretKey(value);
  return value;
}
