import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { CLI_VERSION } from '../src/version.js';

const execFileAsync = promisify(execFile);
let registryVersion = '1.1.1';

describe('CLI command smoke tests', () => {
  it('prints the package version with -V', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    const result = await runCli(['-V']);
    logCliResult(result);

    assert.equal(result.stdout.trim(), packageJson.version);
  });

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
      assert.match(stripAnsi(saved.stdout), /OK Config saved/);
      assert.match(saved.stdout, /\u001B\[[0-9;]*m/);

      const listed = await runCli(['config', 'list'], { env });
      logCliResult(listed);
      assert.match(stripAnsi(listed.stdout), /baseUrl: http:\/\/127\.0\.0\.1:8080/);
      assert.match(stripAnsi(listed.stdout), /secretKey: sk_loca\*\*\*\*/);
      assert.doesNotMatch(stripAnsi(listed.stdout), /sk_local/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('uses the configured baseUrl from local config when only the secret key is provided to the CLI', async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `engagelab-email-cli-config-infer-${Date.now()}`), {
      recursive: true,
    });
    const env = { ...process.env, ENGAGELAB_EMAIL_CONFIG: path.join(dir, 'config.json') };

    try {
      await withApiServer(async ({ baseUrl, requests }) => {
        const saved = await runCli(['config', 'set', '--base-url', baseUrl], { env });
        logCliResult(saved);

        const result = await runCli([
          '--secret-key',
          'sk_sg_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM',
          'threads',
          'get',
          'thread-1',
        ], { env });
        logCliResult(result);

        assert.equal(requests.length, 1);
        assert.equal(requests[0].path, '/api/email/agent/v1/thread/get?threadId=thread-1');
        assert.equal(requests[0].authorization, 'Bearer sk_sg_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM');
        assert.match(result.stdout, /thread-1/);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('prefers explicit baseUrl over the secret key mapping', async () => {
    await withApiServer(async ({ baseUrl, requests }) => {
      const result = await runCli([
        '--base-url',
        baseUrl,
        '--secret-key',
        'sk_tr_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM',
        'threads',
        'get',
        'thread-1',
      ]);
      logCliResult(result);

      assert.equal(requests.length, 1);
      assert.equal(requests[0].path, '/api/email/agent/v1/thread/get?threadId=thread-1');
      assert.equal(requests[0].authorization, 'Bearer sk_tr_XDfUt2_RXkCWdOMGk6_GecyhRKOZiKvNtGDQbBbgxtM');
      assert.match(result.stdout, /thread-1/);
    });
  });

  it('runs config clear and removes saved local configuration', async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `engagelab-email-cli-config-clear-${Date.now()}`), {
      recursive: true,
    });
    const env = { ...process.env, ENGAGELAB_EMAIL_CONFIG: path.join(dir, 'config.json') };

    try {
      const saved = await runCli(['config', 'set', '--base-url', 'http://127.0.0.1:8080', '--secret-key', 'sk_local'], {
        env,
      });
      logCliResult(saved);

      const cleared = await runCli(['config', 'clear'], { env });
      logCliResult(cleared);
      assert.match(stripAnsi(cleared.stdout), /OK Config cleared/);

      const listed = await runCli(['config', 'list'], { env });
      logCliResult(listed);
      assert.match(stripAnsi(listed.stdout), /^baseUrl:\s*$/m);
      assert.match(stripAnsi(listed.stdout), /^secretKey:\s*$/m);
      assert.doesNotMatch(stripAnsi(listed.stdout), /sk_local|127\.0\.0\.1:8080/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('honors NO_COLOR for human-readable output', async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `engagelab-email-cli-no-color-${Date.now()}`), {
      recursive: true,
    });
    const env = { ...process.env, ENGAGELAB_EMAIL_CONFIG: path.join(dir, 'config.json'), NO_COLOR: '1' };

    try {
      const result = await runCli(['config', 'set', '--base-url', 'http://127.0.0.1:8080'], { env });
      logCliResult(result);

      assert.match(result.stdout, /OK Config saved/);
      assert.doesNotMatch(result.stdout, /\u001B\[[0-9;]*m/);
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
        if (!scenario.args.includes('--json')) {
          const loading = stripAnsi(result.stderr);
          assert.match(loading, new RegExp(`Starting ${scenario.spinner.source.replace('^', '')}`));
          assert.match(loading, new RegExp(`Done ${scenario.spinner.source.replace('^', '')}`));
        }
      });
    });
  }

  it('does not expose raw JSON body options in send help', async () => {
    const result = await runCli(['emails', 'send', '--help']);
    logCliResult(result);

    assert.doesNotMatch(result.stdout, /--body-json/);
    assert.doesNotMatch(result.stdout, /--body-file/);
    assert.match(result.stdout, /--text-file/);
    assert.match(result.stdout, /--attachment/);
  });

  it('rejects more than 10 attachments before sending', async () => {
    await withApiServer(async ({ baseUrl, requests }) => {
      const attachmentArgs = Array.from({ length: 11 }, () => ['--attachment', 'tests/fixtures/attachment.txt']).flat();
      const result = await runCliAllowFailure([
        '--base-url',
        baseUrl,
        '--secret-key',
        'sk_smoke',
        'emails',
        'send',
        '--mailbox-id',
        '12',
        '--to',
        'user@example.com',
        '--subject',
        'Hello',
        '--text',
        'See attachments',
        ...attachmentArgs,
      ]);
      logCliFailure(result);

      assert.equal(result.code, 1);
      assert.match(result.stderr, /Attachments cannot exceed 10 files/);
      assert.equal(requests.length, 0);
    });
  });

  it('rejects attachments larger than 10MB in total before sending', async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `engagelab-email-cli-attachment-${Date.now()}`), {
      recursive: true,
    });
    const largeAttachment = path.join(dir, 'large.bin');

    try {
      await writeFile(largeAttachment, Buffer.alloc(10 * 1024 * 1024 + 1));
      await withApiServer(async ({ baseUrl, requests }) => {
        const result = await runCliAllowFailure([
          '--base-url',
          baseUrl,
          '--secret-key',
          'sk_smoke',
          'emails',
          'send',
          '--mailbox-id',
          '12',
          '--to',
          'user@example.com',
          '--subject',
          'Hello',
          '--text',
          'See attachment',
          '--attachment',
          largeAttachment,
        ]);
        logCliFailure(result);

        assert.equal(result.code, 1);
        assert.match(result.stderr, /Attachments total size cannot exceed 10MB/);
        assert.equal(requests.length, 0);
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });


  it('stops API commands when npm registry reports a newer version', async () => {
    registryVersion = '999.0.0';
    try {
      await withApiServer(async ({ baseUrl, requests }) => {
        const result = await runCliAllowFailure(
          [
            '--base-url',
            baseUrl,
            '--secret-key',
            'sk_smoke',
            'threads',
            'get',
            'thread-1',
          ],
          {
            env: {
              ...process.env,
              ENGAGELAB_EMAIL_CLI_DISABLE_UPDATE_CHECK: '',
              ENGAGELAB_EMAIL_CLI_UPDATE_REGISTRY_URL: baseUrl,
            },
          },
        );
        logCliFailure(result);

        assert.equal(result.code, 1);
        assert.match(result.stderr, /A newer version of engagelab-email-cli is required/);
        assert.match(result.stderr, /npm install -g engagelab-email-cli@latest/);
        assert.deepEqual(requests.map((request) => request.path), ['/engagelab-email-cli/latest']);
      });
    } finally {
      registryVersion = '1.1.1';
    }
  });


  it('returns structured update details in json mode', async () => {
    registryVersion = '999.0.0';
    try {
      await withApiServer(async ({ baseUrl, requests }) => {
        const result = await runCliAllowFailure(
          [
            '--base-url',
            baseUrl,
            '--secret-key',
            'sk_smoke',
            'threads',
            'get',
            'thread-1',
            '--json',
          ],
          {
            env: {
              ...process.env,
              ENGAGELAB_EMAIL_CLI_DISABLE_UPDATE_CHECK: '',
              ENGAGELAB_EMAIL_CLI_UPDATE_REGISTRY_URL: baseUrl,
            },
          },
        );
        logCliFailure(result);

        const payload = JSON.parse(result.stderr);
        assert.equal(result.code, 1);
        assert.equal(payload.error.code, 'update_required');
        assert.equal(payload.error.data.currentVersion, CLI_VERSION);
        assert.equal(payload.error.data.latestVersion, '999.0.0');
        assert.equal(payload.error.data.updateCommand, 'npm install -g engagelab-email-cli@latest');
        assert.deepEqual(requests.map((request) => request.path), ['/engagelab-email-cli/latest']);
      });
    } finally {
      registryVersion = '1.1.1';
    }
  });

  it('renders listen status with centralized colors in human mode', async () => {
    await withApiServer(async ({ baseUrl, requests }) => {
      const child = spawn(
        process.execPath,
        [
          'src/cli.js',
          '--base-url',
          baseUrl,
          '--secret-key',
          'sk_smoke',
          'emails',
          'receiving',
          'listen',
          '--limit',
          '1',
          '--interval',
          '2',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ENGAGELAB_EMAIL_CLI_DISABLE_UPDATE_CHECK: '1' } },
      );

      const output = collectChildOutput(child);
      try {
        await waitFor(() => requests.length >= 2, 10000);
        await waitFor(() => output.stdout.includes('msg-2'), 10000);
        child.kill();
        await waitForExit(child);

        const stderr = stripAnsi(output.stderr);
        assert.match(output.stderr, /\u001B\[[0-9;]*m/);
        assert.match(stderr, />> Connecting/);
        assert.match(stderr, /OK Ready/);
        assert.match(stderr, /Polling: every 2s/);
        assert.doesNotMatch(stderr, /\? Ready/);
        assert.match(stripAnsi(output.stdout), /msg-2/);
        assert.match(output.stdout, /\u001B\[[0-9;]*m/);
      } finally {
        if (!child.killed) child.kill();
      }
    });
  });
  it('polls emails receiving listen and advances the cursor', async () => {
    await withApiServer(async ({ baseUrl, requests }) => {
      const child = spawn(
        process.execPath,
        [
          'src/cli.js',
          '--base-url',
          baseUrl,
          '--secret-key',
          'sk_smoke',
          'emails',
          'receiving',
          'listen',
          '--limit',
          '1',
          '--interval',
          '2',
          '--json',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ENGAGELAB_EMAIL_CLI_DISABLE_UPDATE_CHECK: '1' } },
      );

      const output = collectChildOutput(child);
      try {
        await waitFor(() => requests.length >= 2, 10000);
        await waitFor(() => output.stdout.includes('msg-2'), 10000);
        child.kill();
        await waitForExit(child);

        assert.equal(requests[0].method, 'GET');
        assert.equal(requests[0].path, '/api/email/agent/v1/message/listen?limit=1');
        assert.equal(requests[1].method, 'GET');
        assert.equal(requests[1].path, '/api/email/agent/v1/message/listen?after=1500&limit=1');
        assert.equal(requests[0].authorization, 'Bearer sk_smoke');
        assert.equal(requests[1].authorization, 'Bearer sk_smoke');
        assert.doesNotMatch(output.stdout, /msg-1/);
        assert.match(output.stdout, /msg-2/);
      } finally {
        if (!child.killed) child.kill();
      }
    });
  });
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
      path: '/api/email/agent/v1/thread/list?mailboxId=12&subject=Hello&participant=user%40example.com&pageNo=1&pageSize=20',
      output: /Thread ID/,
      spinner: /Fetching threads/,
    },
    {
      name: 'threads get',
      args: ['threads', 'get', 'thread-1'],
      method: 'GET',
      path: '/api/email/agent/v1/thread/get?threadId=thread-1',
      output: /thread-1/,
      spinner: /Fetching thread/,
    },
    {
      name: 'threads messages',
      args: ['threads', 'messages', 'thread-1', '--limit', '2', '--include-content'],
      method: 'GET',
      path: '/api/email/agent/v1/thread/messages?threadId=thread-1&limit=2&includeContent=true',
      output: /Message UID/,
      spinner: /Fetching thread messages/,
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
      path: '/api/email/agent/v1/mail/send',
      body: {
        mailboxId: 12,
        to: ['user@example.com'],
        subject: 'Hello',
        html: '<p>Hello</p>',
      },
      output: /Sent/,
      spinner: /Sending email/,
    },
    {
      name: 'emails send with attachment',
      args: [
        'emails',
        'send',
        '--mailbox-id',
        '12',
        '--to',
        'user@example.com',
        '--subject',
        'Hello',
        '--text',
        'See attachment',
        '--attachment',
        'tests/fixtures/attachment.txt',
      ],
      method: 'POST',
      path: '/api/email/agent/v1/mail/send',
      body: {
        mailboxId: 12,
        to: ['user@example.com'],
        subject: 'Hello',
        text: 'See attachment',
        attachments: [
          {
            filename: 'attachment.txt',
            contentType: 'text/plain',
            type: 'text/plain',
            content: 'c2FtcGxlIGF0dGFjaG1lbnQK',
          },
        ],
      },
      output: /Sent/,
      spinner: /Sending email/,
    },
    {
      name: 'emails receiving list',
      args: ['emails', 'receiving', 'list', '--mailbox-id', '12', '--keyword', 'Hello', '--page-no', '1'],
      method: 'GET',
      path: '/api/email/agent/v1/message/list?mailboxId=12&keyword=Hello&pageNo=1',
      output: /Message UID/,
      spinner: /Fetching inbound messages/,
    },
    {
      name: 'emails receiving get',
      args: ['emails', 'receiving', 'get', 'msg-1'],
      method: 'GET',
      path: '/api/email/agent/v1/message/get?messageUid=msg-1',
      output: /msg-1/,
      spinner: /Fetching inbound message/,
    },
    {
      name: 'emails receiving reply',
      args: ['emails', 'receiving', 'reply', 'msg-1', '--subject', 'Re: Hello', '--text', 'Thanks'],
      method: 'POST',
      path: '/api/email/agent/v1/message/reply?messageUid=msg-1',
      body: {
        subject: 'Re: Hello',
        text: 'Thanks',
      },
      output: /Sent/,
      spinner: /Sending reply/,
    },
    {
      name: 'emails receiving reply with attachment',
      args: [
        'emails',
        'receiving',
        'reply',
        'msg-1',
        '--subject',
        'Re: Hello',
        '--text',
        'Thanks',
        '--attachment',
        'tests/fixtures/attachment.txt',
      ],
      method: 'POST',
      path: '/api/email/agent/v1/message/reply?messageUid=msg-1',
      body: {
        subject: 'Re: Hello',
        text: 'Thanks',
        attachments: [
          {
            filename: 'attachment.txt',
            contentType: 'text/plain',
            type: 'text/plain',
            content: 'c2FtcGxlIGF0dGFjaG1lbnQK',
          },
        ],
      },
      output: /Sent/,
      spinner: /Sending reply/,
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
  if (method === 'GET' && url === '/engagelab-email-cli/latest') {
    return { statusCode: 200, body: { version: registryVersion } };
  }
  if (method === 'POST' && url === '/api/email/agent/v1/mail/send') {
    return ok({ messageUid: 'msg-sent', requestId: 'req-1' });
  }
  if (method === 'POST' && url.startsWith('/api/email/agent/v1/message/reply?')) {
    return ok({ messageUid: 'msg-reply', requestId: 'req-2' });
  }
  if (url.startsWith('/api/email/agent/v1/thread/messages?')) {
    return ok({ list: [{ messageUid: 'msg-1', threadId: 'thread-1', subject: 'Hello' }] });
  }
  if (url.startsWith('/api/email/agent/v1/thread/list?')) {
    return ok({ list: [{ threadId: 'thread-1', subject: 'Hello', messageCount: 1 }] });
  }
  if (url === '/api/email/agent/v1/thread/get?threadId=thread-1') {
    return ok({ threadId: 'thread-1', subject: 'Hello' });
  }
  if (url === '/api/email/agent/v1/message/listen?limit=1') {
    return ok([{ id: 1500, messageUid: 'msg-1', threadId: 'thread-1', subject: 'Seed' }]);
  }
  if (url === '/api/email/agent/v1/message/listen?after=1500&limit=1') {
    return ok([{ id: 1501, messageUid: 'msg-2', threadId: 'thread-1', subject: 'New' }]);
  }
  if (url.startsWith('/api/email/agent/v1/message/list?') || url.startsWith('/api/email/agent/v1/message/listen?')) {
    return ok({ list: [{ messageUid: 'msg-1', threadId: 'thread-1', subject: 'Hello' }] });
  }
  if (url === '/api/email/agent/v1/message/get?messageUid=msg-1') {
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
    env: {
      ...process.env,
      ENGAGELAB_EMAIL_CLI_DISABLE_UPDATE_CHECK: '1',
      ...(options.env || {}),
    },
  });
}

async function runCliAllowFailure(args, options = {}) {
  try {
    const result = await runCli(args, options);
    return { ...result, code: 0 };
  } catch (error) {
    return {
      code: error.code,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  }
}

function logCliResult(result) {
  console.log(`[CLI EXIT] 0`);
  if (result.stdout.trim()) console.log(`[STDOUT] ${oneLine(result.stdout)}`);
  if (result.stderr.trim()) console.log(`[STDERR] ${oneLine(result.stderr)}`);
}

function logCliFailure(result) {
  console.log(`[CLI EXIT] ${result.code}`);
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

function collectChildOutput(child) {
  const output = { stdout: '', stderr: '' };
  child.stdout.on('data', (chunk) => {
    output.stdout += chunk.toString('utf8');
  });
  child.stderr.on('data', (chunk) => {
    output.stderr += chunk.toString('utf8');
  });
  return output;
}

function waitFor(predicate, timeoutMs) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Timed out waiting for condition'));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once('exit', resolve));
}

function stripAnsi(value) {
  return value.replace(/\u001B\[[0-9;]*m/g, '');
}
