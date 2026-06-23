# EngageLab Email CLI

Pure JavaScript ES Modules CLI for EngageLab Email Agent/Skill workflows.

## Install

Install dependencies for local development:

```bash
pnpm install
```

Install from npm after publishing:

```bash
npm install -g engagelab-email-cli
```

## Test

```bash
npm test
```

The test command runs CLI smoke tests. The console prints each CLI command, the mocked HTTP request, the HTTP status code, and the CLI output summary.

## Build And Publish

Build the CLI package locally:

```bash
npm run build
```

Check the package contents before publishing:

```bash
npm run packcheck
```

Publish manually to the public npm registry:

```bash
npm login
npm run publish:npm
```

GitHub Actions can also publish the package from `.github/workflows/publish-npm.yml`. The workflow runs tests before publishing.

Current package name and CLI command:

```text
engagelab-email-cli
```

## Configuration

```bash
engagelab-email-cli config set --base-url http://localhost:8087 --secret-key sk_xxx
engagelab-email-cli config list
```

Runtime config precedence:

1. CLI options: `--base-url`, `--secret-key`
2. Environment variables: `ENGAGELAB_EMAIL_BASE_URL`, `ENGAGELAB_EMAIL_SECRET_KEY`
3. Local config file

`config list` masks the Secret Key and never prints the full value.

## Skill-Friendly Usage

For Agent/Skill integrations, prefer JSON input files and JSON output:

```bash
engagelab-email-cli emails receiving listen --limit 10 --interval 5 --json
engagelab-email-cli threads messages <thread-id> --include-content --json
engagelab-email-cli emails receiving reply <message-uid> --body-file reply.json --json
engagelab-email-cli emails send --body-file send.json --json
```

`listen` is a long-running polling command. It prints each new message as it arrives and exits when you press `Ctrl+C`.
With `--json`, `listen` outputs NDJSON: one JSON object per message line. JSON input files avoid shell quoting issues with long text, HTML, arrays, and newlines.

## Threads

```bash
engagelab-email-cli threads list \
  --mailbox-id 1001 \
  --subject refund \
  --participant alice@example.com \
  --page-no 1 \
  --page-size 20

engagelab-email-cli threads get <thread-id> --json

engagelab-email-cli threads messages <thread-id> \
  --limit 50 \
  --include-content \
  --json
```

## Receiving

```bash
engagelab-email-cli emails receiving list \
  --mailbox-id 1001 \
  --keyword refund \
  --json

engagelab-email-cli emails receiving get <message-uid> --json

engagelab-email-cli emails receiving listen \
  --limit 10 \
  --interval 5 \
  --json

engagelab-email-cli emails receiving listen \
  --after 1500 \
  --limit 10 \
  --interval 5
```

`emails receiving listen` follows the Resend-style CLI polling model:

- It seeds the cursor from the latest message when `--after` is not provided, so historical messages are not printed on startup.
- It polls `GET /v1/message/listen` every `--interval` seconds; the default is `5`, and the minimum is `2`.
- It sends `after=<cursor>` on later polls and updates the cursor from the newest returned message.
- It keeps running until `Ctrl+C` or process termination.
- In `--json` mode, each new message is printed as one compact JSON line.

## Reply

Short manual reply:

```bash
engagelab-email-cli emails receiving reply <message-uid> \
  --text "您好，您的邮件已收到。" \
  --json
```

Skill-friendly reply:

```bash
engagelab-email-cli emails receiving reply <message-uid> --body-file reply.json --json
```

`reply.json`:

```json
{
  "subject": "Re: Refund request",
  "text": "您好，您的退款申请已收到。",
  "html": "<p>您好，您的退款申请已收到。</p>",
  "cc": ["ops@example.com"],
  "bcc": []
}
```

## Send

Manual send:

```bash
engagelab-email-cli emails send \
  --mailbox-id 1001 \
  --to alice@example.com \
  --subject "Refund update" \
  --text "您的退款申请已经处理完成。" \
  --json
```

Skill-friendly send:

```bash
engagelab-email-cli emails send --body-file send.json --json
```

`send.json`:

```json
{
  "mailboxId": 1001,
  "to": ["alice@example.com"],
  "subject": "Refund update",
  "text": "您的退款申请已经处理完成。",
  "html": "<p>您的退款申请已经处理完成。</p>",
  "cc": [],
  "bcc": []
}
```

## Body Input Rules

- `--body-file` and `--body-json` are mutually exclusive.
- `--body-file` / `--body-json` cannot be combined with field-level body options.
- `--text` and `--text-file` are mutually exclusive.
- `--html` and `--html-file` are mutually exclusive.
- `emails send` requires `mailboxId`, at least one `to`, `subject`, and at least one of `text` or `html`.
- `emails receiving reply` requires at least one of `text` or `html`.

## Exit Codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Invalid arguments or missing config |
| `2` | Authentication failure |
| `3` | Resource not found |
| `4` | State conflict |
| `5` | Server, network, invalid JSON, or unknown request failure |
