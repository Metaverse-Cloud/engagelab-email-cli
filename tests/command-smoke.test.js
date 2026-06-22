import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

describe('CLI command smoke tests', () => {
  it('runs config set and list without touching the API', async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `engagelab-email-cli-config-${Date.now()}`), {
      recursive: true,
    });
    const env = { ...process.env, ENGAGELAB_EMAIL_CONFIG: path.join(dir, 'config.json') };

    try {
      const saved = await runCli(['config', 'set', '--base-url', 'http://127.0.0.1:8080', '--secret-key', 'sk_local'], {
        env,
      });
      logCliResult(saved);
      assert.match(saved.stdout, /Config saved/);

      const listed = await runCli(['config', 'list'], { env });
      logCliResult(listed);
      assert.match(listed.stdout, /baseUrl: http:\/\/127\.0\.0\.1:8080/);
      assert.match(listed.stdout, /secretKey: sk_loca\*\*\*\*/);
      assert.doesNotMatch(listed.stdout, /sk_local/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  for (const scenario of apiCommandScenarios()) {
    it(`runs ${scenario.name}`, async () => {
      await withApiServer(async ({ baseUrl, requests }) => {
        const result = await runCli([
          '--base-url',
          baseUrl,
          '--secret-key',
          'sk_smoke',
          ...scenario.args,
        ]);
        logCliResult(result);

        assert.equal(requests.length, 1);
        assert.equal(requests[0].method, scenario.method);
        assert.equal(requests[0].path, scenario.path);
        assert.equal(requests[0].authorization, 'Bearer sk_smoke');
        assert.equal(requests[0].statusCode, scenario.statusCode ?? 200);
        assert.deepEqual(requests[0].body, scenario.body);
        assert.match(result.stdout, scenario.output);
      });
    });
  }
});

function apiCommandScenarios() {
  return [
    {
      name: 'threads list',
      args: [
        'threads',
        'list',
        '--mailbox-id',
        '12',
        '--subject',
        'Hello',
        '--participant',
        'user@example.com',
        '--page-no',
        '1',
        '--page-size',
        '20',
      ],
      method: 'GET',
      path: '/v1/thread/list?mailboxId=12&subject=Hello&participant=user%40example.com&pageNo=1&pageSize=20',
      output: /Thread ID/,
    },
    {
      name: 'threads get',
      args: ['threads', 'get', 'thread-1'],
      method: 'GET',
      path: '/v1/thread/get?threadId=thread-1',
      output: /thread-1/,
    },
    {
      name: 'threads messages',
      args: ['threads', 'messages', 'thread-1', '--limit', '2', '--include-content'],
      method: 'GET',
      path: '/v1/thread/messages?threadId=thread-1&limit=2&includeContent=true',
      output: /Message UID/,
    },
    {
      name: 'emails send',
      args: [
        'emails',
        'send',
        '--mailbox-id',
        '12',
        '--to',
        'user@example.com',
        '--subject',
        'Hello',
        '--html',
        '<p>Hello</p>',
      ],
      method: 'POST',
      path: '/v1/mail/send',
      body: {
        mailboxId: 12,
        to: ['user@example.com'],
        subject: 'Hello',
        html: '<p>Hello</p>',
      },
      output: /Sent/,
    },
    {
      name: 'emails receiving list',
      args: ['emails', 'receiving', 'list', '--mailbox-id', '12', '--keyword', 'Hello', '--page-no', '1'],
      method: 'GET',
      path: '/v1/message/list?mailboxId=12&keyword=Hello&pageNo=1',
      output: /Message UID/,
    },
    {
      name: 'emails receiving get',
      args: ['emails', 'receiving', 'get', 'msg-1'],
      method: 'GET',
      path: '/v1/message/get?messageUid=msg-1',
      output: /msg-1/,
    },
    {
      name: 'emails receiving listen',
      args: ['emails', 'receiving', 'listen', '--after', '1500', '--limit', '1'],
      method: 'GET',
      path: '/v1/message/listen?after=1500&limit=1',
      output: /Message UID/,
    },
    {
      name: 'emails receiving reply',
      args: ['emails', 'receiving', 'reply', 'msg-1', '--subject', 'Re: Hello', '--text', 'Thanks'],
      method: 'POST',
      path: '/v1/message/reply?messageUid=msg-1',
      body: {
        subject: 'Re: Hello',
        text: 'Thanks',
      },
      output: /Sent/,
    },
  ];
}

async function withApiServer(callback) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const body = await readRequestBody(request);
    const smokeResponse = responseFor(request.method, request.url);
    requests.push({
      method: request.method,
      path: request.url,
      authorization: request.headers.authorization,
      body,
      statusCode: smokeResponse.statusCode,
    });

    response.setHeader('content-type', 'application/json');
    response.statusCode = smokeResponse.statusCode;
    logHttpRequest(request.method, request.url, smokeResponse.statusCode);
    response.end(JSON.stringify(smokeResponse.body));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    await callback({ baseUrl: `http://127.0.0.1:${port}`, requests });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : undefined;
}

function responseFor(method, url) {
  if (method === 'POST' && url === '/v1/mail/send') {
    return ok({ messageUid: 'msg-sent', requestId: 'req-1' });
  }
  if (method === 'POST' && url.startsWith('/v1/message/reply?')) {
    return ok({ messageUid: 'msg-reply', requestId: 'req-2' });
  }
  if (url.startsWith('/v1/thread/messages?')) {
    return ok({ list: [{ messageUid: 'msg-1', threadId: 'thread-1', subject: 'Hello' }] });
  }
  if (url.startsWith('/v1/thread/list?')) {
    return ok({ list: [{ threadId: 'thread-1', subject: 'Hello', messageCount: 1 }] });
  }
  if (url === '/v1/thread/get?threadId=thread-1') {
    return ok({ threadId: 'thread-1', subject: 'Hello' });
  }
  if (url.startsWith('/v1/message/list?') || url.startsWith('/v1/message/listen?')) {
    return ok({ list: [{ messageUid: 'msg-1', threadId: 'thread-1', subject: 'Hello' }] });
  }
  if (url === '/v1/message/get?messageUid=msg-1') {
    return ok({ messageUid: 'msg-1', threadId: 'thread-1', subject: 'Hello' });
  }
  return {
    statusCode: 404,
    body: { code: 404, message: `No smoke response for ${method} ${url}` },
  };
}

function ok(data) {
  return {
    statusCode: 200,
    body: { code: 200, message: 'success', data },
  };
}

async function runCli(args, options = {}) {
  const command = ['node', 'src/cli.js', ...maskSecretArgs(args)].map(formatArg).join(' ');
  console.log(`[CLI] ${command}`);
  return execFileAsync(process.execPath, ['src/cli.js', ...args], {
    ...options,
    env: options.env || process.env,
  });
}

function logCliResult(result) {
  console.log(`[CLI EXIT] 0`);
  if (result.stdout.trim()) console.log(`[STDOUT] ${oneLine(result.stdout)}`);
  if (result.stderr.trim()) console.log(`[STDERR] ${oneLine(result.stderr)}`);
}

function logHttpRequest(method, url, statusCode) {
  console.log(`[HTTP] ${method} ${url} -> ${statusCode}`);
}

function oneLine(value) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 240);
}

function maskSecretArgs(args) {
  const masked = [...args];
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === '--secret-key' && masked[index + 1]) {
      masked[index + 1] = `${masked[index + 1].slice(0, 7)}****`;
    }
  }
  return masked;
}

function formatArg(value) {
  return /\s|<|>/.test(value) ? JSON.stringify(value) : value;
}

