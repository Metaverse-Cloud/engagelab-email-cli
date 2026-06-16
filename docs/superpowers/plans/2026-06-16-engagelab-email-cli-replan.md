# EngageLab Email CLI Replan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current generic CLI scaffold into the phase-one `engagelab-email` Agent CLI described by `agent-email-cli-dev.md`.

**Architecture:** Keep terminal concerns in command/output modules, keep HTTP and service modules terminal-free, and model EngageLab API calls through focused services for threads, inbound receiving, and outbound sending. Runtime configuration is resolved from CLI flags, environment variables, and local config in that order.

**Tech Stack:** Node.js 20+, ES Modules, Commander, native `fetch`, Node test runner.

---

## File Structure

- Modify: `package.json` - rename bin/package metadata and keep test script.
- Modify: `README.md` - replace generic scaffold docs with EngageLab CLI usage.
- Modify: `src/index.js` - create `engagelab-email` root command and global options.
- Create: `src/config/config-store.js` - read/write local CLI config and mask Secret Keys.
- Create: `src/config/resolve-runtime-config.js` - resolve `baseUrl` and `secretKey` precedence.
- Modify: `src/http-client.js` or move logic into `src/core/http-client.js` - send fetch requests and parse responses.
- Create: `src/core/result.js` - validate `Result<T>` envelopes.
- Create: `src/core/errors.js` - central CLI/service error classes and exit code mapping.
- Create: `src/core/validators.js` - shared argument validation helpers.
- Create: `src/services/threads-service.js` - map thread commands to `/v1/thread`.
- Create: `src/services/receiving-service.js` - map inbound commands to `/v1/message`.
- Create: `src/services/sending-service.js` - map send command to `/v1/mail/send`.
- Create: `src/commands/config.js` - register `config set/list`.
- Create: `src/commands/threads.js` - register `threads list/get/messages`.
- Create: `src/commands/emails.js` - register `emails receiving ...` and `emails send`.
- Create: `src/output/json.js` - JSON success/error output helpers.
- Create: `src/output/table.js` - table rendering helpers.
- Create: `src/output/formatters.js` - human-readable summaries and masking helpers.
- Create: `src/output/status.js` - message status display mapping.
- Modify: `tests/cli.test.js` - update package/bin and command registration tests.
- Modify: `tests/service.test.js` and add focused service tests - cover HTTP, Result, and service mapping.
- Create: `tests/config.test.js` - cover config persistence and precedence.
- Create: `tests/commands.test.js` - cover command validation and output behavior with mocked services where possible.

## Task 1: Rename CLI Identity

**Files:**
- Modify: `package.json`
- Modify: `src/index.js`
- Modify: `tests/cli.test.js`

- [ ] **Step 1: Write failing package identity test**

```js
assert.deepEqual(pkg.bin, {
  'engagelab-email': './src/index.js',
});
assert.equal(pkg.name, '@engagelab/email-cli');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because the current package still declares `my-project`.

- [ ] **Step 3: Update package metadata**

Change `package.json`:

```json
{
  "name": "@engagelab/email-cli",
  "bin": {
    "engagelab-email": "./src/index.js"
  }
}
```

- [ ] **Step 4: Update root command**

Change `src/index.js` root program:

```js
program
  .name('engagelab-email')
  .description('CLI for EngageLab Email Agent workflows')
  .version('0.1.0')
  .option('--base-url <url>', 'EngageLab Email API base URL')
  .option('--secret-key <key>', 'EngageLab Email Secret Key');
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS for package identity tests.

## Task 2: Add Config Storage

**Files:**
- Create: `src/config/config-store.js`
- Create: `tests/config.test.js`

- [ ] **Step 1: Write failing config store tests**

Cover:

```js
await store.writeConfig({ baseUrl: 'http://localhost:8087', secretKey: 'sk_test1234' });
assert.deepEqual(await store.readConfig(), {
  baseUrl: 'http://localhost:8087',
  secretKey: 'sk_test1234',
});
assert.equal(maskSecretKey('sk_test1234'), 'sk_t****');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `config-store.js` does not exist.

- [ ] **Step 3: Implement config store**

Implement exported functions:

```js
export async function readConfig({ configPath } = {}) {}
export async function writeConfig(config, { configPath } = {}) {}
export function maskSecretKey(secretKey) {}
export function getDefaultConfigPath(platformEnv = process.env) {}
```

Use a test-injected `configPath` so tests do not write to the user's real home directory.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS for config store tests.

## Task 3: Resolve Runtime Configuration

**Files:**
- Create: `src/config/resolve-runtime-config.js`
- Modify: `tests/config.test.js`

- [ ] **Step 1: Write failing precedence tests**

Test order:

```js
const resolved = await resolveRuntimeConfig({
  cliOptions: { baseUrl: 'http://cli', secretKey: 'sk_cli' },
  env: { ENGAGELAB_EMAIL_BASE_URL: 'http://env', ENGAGELAB_EMAIL_SECRET_KEY: 'sk_env' },
  readConfig: async () => ({ baseUrl: 'http://file', secretKey: 'sk_file' }),
});
assert.equal(resolved.baseUrl, 'http://cli');
assert.equal(resolved.secretKey, 'sk_cli');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because resolver does not exist.

- [ ] **Step 3: Implement resolver**

Implement:

```js
export async function resolveRuntimeConfig({ cliOptions, env, readConfig } = {}) {}
```

Validate:

- `baseUrl` must be present for API commands.
- `secretKey` must start with `sk_` for API commands.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: PASS for config precedence tests.

## Task 4: Register Config Commands

**Files:**
- Create: `src/commands/config.js`
- Modify: `src/index.js`
- Modify: `tests/commands.test.js`

- [ ] **Step 1: Write failing CLI command tests**

Test:

```bash
engagelab-email config set --base-url http://localhost:8087 --secret-key sk_test
engagelab-email config list
```

Expected output must not include the full Secret Key.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because command is not registered.

- [ ] **Step 3: Implement command registration**

Export:

```js
export function registerConfigCommands(program, dependencies = {}) {}
```

Use dependency injection for `readConfig` and `writeConfig` in tests.

- [ ] **Step 4: Wire root command**

In `src/index.js`:

```js
import { registerConfigCommands } from './commands/config.js';
registerConfigCommands(program);
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS for config command tests.

## Task 5: Implement HTTP Result Handling

**Files:**
- Modify: `src/http-client.js`
- Create: `src/core/result.js`
- Create: `src/core/errors.js`
- Modify: `tests/service.test.js`

- [ ] **Step 1: Write failing HTTP tests**

Cover:

- Authorization header is `Bearer <secretKey>`.
- Query params are appended.
- JSON body is serialized.
- HTTP non-2xx becomes service error.
- Invalid JSON response becomes service error.
- `Result.code != 200` becomes business error.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because current client returns raw data and uses `token`.

- [ ] **Step 3: Implement result parser**

```js
export function unwrapResultEnvelope(value) {
  if (!value || typeof value !== 'object' || typeof value.code !== 'number') {
    throw new ServiceRequestError('Invalid server response format', { exitCode: 5 });
  }
  if (value.code !== 200) {
    throw new ServiceRequestError(value.message || 'Request failed', { code: value.code });
  }
  return value;
}
```

- [ ] **Step 4: Update HTTP client**

Keep the client terminal-free. Use `secretKey`, not `token`.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS for HTTP and Result tests.

## Task 6: Implement Thread Service and Commands

**Files:**
- Create: `src/services/threads-service.js`
- Create: `src/commands/threads.js`
- Modify: `src/index.js`
- Create or modify: `tests/threads.test.js`

- [ ] **Step 1: Write failing service mapping tests**

Expected service calls:

```js
threads.listThreads({ pageNo: 1, pageSize: 20 }) -> GET /v1/thread
threads.getThread('abc') -> GET /v1/thread/abc
threads.listThreadMessages('abc', { includeContent: true }) -> GET /v1/thread/abc/messages
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because thread service does not exist.

- [ ] **Step 3: Implement service**

Export `ThreadsService` with:

```js
listThreads(params)
getThread(threadId)
listThreadMessages(threadId, params)
```

- [ ] **Step 4: Register commands**

Support:

```bash
engagelab-email threads list
engagelab-email threads get <thread-id>
engagelab-email threads messages <thread-id> --include-content
```

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS for thread service and command tests.

## Task 7: Implement Receiving Service and Commands

**Files:**
- Create: `src/services/receiving-service.js`
- Create: `src/commands/emails.js`
- Modify: `src/index.js`
- Create or modify: `tests/receiving.test.js`

- [ ] **Step 1: Write failing service mapping tests**

Expected mappings:

```js
listMessages(params) -> GET /v1/message
getMessage(messageUid) -> GET /v1/message/{messageUid}
listenMessages(params) -> GET /v1/message/listen
replyMessage(messageUid, body) -> POST /v1/message/{messageUid}/reply
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because receiving service does not exist.

- [ ] **Step 3: Implement service**

Export `ReceivingService` with the four methods above.

- [ ] **Step 4: Register receiving commands**

Support:

```bash
engagelab-email emails receiving list
engagelab-email emails receiving get <message-uid>
engagelab-email emails receiving listen
engagelab-email emails receiving reply <message-uid> --text "..."
```

- [ ] **Step 5: Add validation**

Rules:

- `<message-uid>` is required.
- `reply` requires at least one of `--text` or `--html`.
- `--cc` and `--bcc` may be repeated and should become arrays.

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: PASS for receiving tests.

## Task 8: Implement Sending Service and Command

**Files:**
- Create: `src/services/sending-service.js`
- Modify: `src/commands/emails.js`
- Create or modify: `tests/sending.test.js`

- [ ] **Step 1: Write failing service mapping tests**

Expected mapping:

```js
sendEmail(body) -> POST /v1/mail/send
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because sending service does not exist.

- [ ] **Step 3: Implement service**

Export `SendingService` with:

```js
sendEmail(body)
```

- [ ] **Step 4: Register send command**

Support:

```bash
engagelab-email emails send --mailbox-id 1001 --to alice@example.com --subject "Refund update" --text "Done"
```

- [ ] **Step 5: Add validation**

Rules:

- `--mailbox-id` is required.
- At least one `--to` is required.
- `--subject` is required.
- At least one of `--text` or `--html` is required.
- `--to`, `--cc`, and `--bcc` may be repeated and should become arrays.

- [ ] **Step 6: Run tests**

Run: `npm test`

Expected: PASS for sending tests.

## Task 9: Implement Output Helpers

**Files:**
- Create: `src/output/json.js`
- Create: `src/output/table.js`
- Create: `src/output/formatters.js`
- Create: `src/output/status.js`
- Modify: `src/commands/threads.js`
- Modify: `src/commands/emails.js`
- Create or modify: `tests/output.test.js`

- [ ] **Step 1: Write failing output tests**

Cover:

- `--json` prints raw Result envelope.
- Message status `2` displays as `parsed`.
- Message status `4` displays as `replied`.
- Secret Keys are masked.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because output helpers do not exist.

- [ ] **Step 3: Implement helpers**

Implement terminal-free formatting functions where possible, with command modules responsible for stdout/stderr writes.

- [ ] **Step 4: Wire command output**

Commands should choose JSON or human output based on each command's `--json` option.

- [ ] **Step 5: Run tests**

Run: `npm test`

Expected: PASS for output tests.

## Task 10: Update Documentation

**Files:**
- Modify: `README.md`
- Optionally modify: `agent-email-cli-dev.md` if implementation decisions need to be reflected.

- [ ] **Step 1: Replace scaffold README**

Document:

- Install
- Test
- Config
- Authentication precedence
- Threads commands
- Receiving commands
- Send command
- Agent workflow
- Exit codes

- [ ] **Step 2: Add examples**

Include:

```bash
engagelab-email config set --base-url http://localhost:8087 --secret-key sk_xxx
engagelab-email emails receiving listen --json
engagelab-email threads messages <thread-id> --include-content --json
engagelab-email emails receiving reply <message-uid> --text "..."
```

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: PASS.

## Task 11: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run help commands manually**

Run:

```bash
node src/index.js --help
node src/index.js config --help
node src/index.js threads --help
node src/index.js emails --help
node src/index.js emails receiving --help
```

Expected: commands match the phase-one command surface.

- [ ] **Step 3: Inspect old naming**

Run:

```bash
rg "my-project|MY_PROJECT|--token|engagelab list|engagelab send"
```

Expected: no active implementation or README references remain, except historical docs if intentionally retained.

- [ ] **Step 4: Commit**

```bash
git add package.json README.md src tests docs/superpowers
git commit -m "feat: replan engagelab email cli"
```

Skip commit if the workspace is not a git repository.
