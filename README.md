# My Project CLI

Pure JavaScript ES Modules CLI for a Java backend email service.

## Structure

```text
src/
  index.js                CLI entrypoint
  commands/messages.js    Commander commands and terminal output
  email-service.js        Internal email service wrapper
  http-client.js          Native fetch HTTP client
```

## Install

```bash
pnpm install
```

## Test

```bash
pnpm test
```

## CLI

```bash
pnpm cli -- --help
pnpm cli -- --base-url https://java.example.test/api --token <token> engagelab list --limit 20
pnpm cli -- --base-url https://java.example.test/api --token <token> engagelab send --to user@example.com --subject "Hello" --body "Message body"
```

You can also set `MY_PROJECT_BASE_URL` and `MY_PROJECT_TOKEN` instead of passing `--base-url` and `--token`.

## Layering Rules

- `src/email-service.js` and `src/http-client.js` own network concerns only: fetch requests, bearer token injection, and `ServiceRequestError` wrapping.
- Internal service modules must not use terminal concerns such as `console.*`, `chalk`, or `process.exit`.
- CLI command modules own terminal concerns: Commander parsing, Ora progress display, Chalk formatting, stdout/stderr, and process exit code handling.
