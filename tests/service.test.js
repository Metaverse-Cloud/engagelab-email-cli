import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createHttpClient } from '../src/http-client.js';
import { EmailService, ServiceRequestError } from '../src/email-service.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listJavaScriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return listJavaScriptFiles(entryPath);
      }
      return entry.name.endsWith('.js') ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

describe('email service internals', () => {
  it('uses native fetch client with base URL, query params, auth header, and JSON parsing', async () => {
    const calls = [];
    const client = createHttpClient({
      baseURL: 'https://java.example.test/api',
      token: 'secret-token',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ok: true }),
          text: async () => JSON.stringify({ ok: true }),
        };
      },
    });

    const result = await client.request({
      method: 'GET',
      url: '/messages',
      params: { page: 1, keyword: 'hello world' },
    });

    assert.deepEqual(result.data, { ok: true });
    assert.equal(
      calls[0].url,
      'https://java.example.test/api/messages?page=1&keyword=hello+world',
    );
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer secret-token');
  });

  it('serializes object request bodies as JSON with the correct content type', async () => {
    const calls = [];
    const client = createHttpClient({
      baseURL: 'https://java.example.test/api',
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 'message-1' }),
          text: async () => JSON.stringify({ id: 'message-1' }),
        };
      },
    });

    await client.request({
      method: 'POST',
      url: '/messages',
      data: { subject: 'Hello' },
    });

    assert.equal(calls[0].init.body, JSON.stringify({ subject: 'Hello' }));
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  });

  it('sends API requests through the injected HTTP client and returns response data', async () => {
    const calls = [];
    const service = new EmailService({
      baseURL: 'https://java.example.test/api',
      token: 'secret-token',
      httpClient: {
        request: async (config) => {
          calls.push(config);
          return { data: { ok: true, config } };
        },
      },
    });

    const result = await service.request({
      method: 'GET',
      url: '/messages',
      params: { page: 1 },
    });

    assert.equal(result.ok, true);
    assert.deepEqual(calls, [
      {
        method: 'GET',
        url: '/messages',
        params: { page: 1 },
      },
    ]);
  });

  it('wraps backend failures in ServiceRequestError without terminating the process', async () => {
    const service = new EmailService({
      httpClient: {
        request: async () => {
          const error = new Error('Request failed with status code 500');
          error.response = {
            status: 500,
            data: { message: 'backend unavailable' },
          };
          throw error;
        },
      },
    });

    await assert.rejects(
      () => service.getMessages({ limit: 10 }),
      (error) => {
        assert.equal(error instanceof ServiceRequestError, true);
        assert.equal(error.status, 500);
        assert.deepEqual(error.data, { message: 'backend unavailable' });
        return true;
      },
    );
  });

  it('keeps terminal concerns out of service source files', async () => {
    const files = await listJavaScriptFiles(path.join(rootDir, 'src'));

    for (const file of files) {
      const source = await readFile(file, 'utf8');
      if (file.endsWith(`${path.sep}index.js`) || file.includes(`${path.sep}commands${path.sep}`)) {
        continue;
      }
      assert.doesNotMatch(source, /console\./, `${file} must not use console output`);
      assert.doesNotMatch(source, /\bchalk\b/, `${file} must not import terminal colors`);
      assert.doesNotMatch(source, /process\.exit/, `${file} must not terminate the process`);
    }
  });
});
