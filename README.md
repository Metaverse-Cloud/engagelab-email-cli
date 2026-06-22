# EngageLab Email CLI

Pure JavaScript ES Modules CLI for EngageLab Email Agent/Skill workflows.

## Install

```bash
pnpm install
```

## Test

```bash
npm test
```

## Build And Publish

This package is a pure Node.js ESM CLI, so it does not need a transpile or bundle step. The build step is a verification step:

```bash
npm run build
```

Check the package contents before publishing:

```bash
npm run packcheck
```

Publish to the public npm registry:

```bash
npm login
npm publish
```

`prepack` runs `npm test`, so `npm pack` and `npm publish` fail if tests fail.

Current package name:

```text
engagelab-email
```

## Configuration

```bash
engagelab-email config set --base-url http://localhost:8087 --secret-key sk_xxx
engagelab-email config list
```

Runtime config precedence:

1. CLI options: `--base-url`, `--secret-key`
2. Environment variables: `ENGAGELAB_EMAIL_BASE_URL`, `ENGAGELAB_EMAIL_SECRET_KEY`
3. Local config file

`config list` masks the Secret Key and never prints the full value.

## Skill-Friendly Usage

For Agent/Skill integrations, prefer JSON input files and JSON output:

```bash
engagelab-email emails receiving listen --json
engagelab-email threads messages <thread-id> --include-content --json
engagelab-email emails receiving reply <message-uid> --body-file reply.json --json
engagelab-email emails send --body-file send.json --json
```

This avoids shell quoting issues with long text, HTML, arrays, and newlines.

## Threads

```bash
engagelab-email threads list \
  --mailbox-id 1001 \
  --keyword refund \
  --participant alice@example.com \
  --page-no 1 \
  --page-size 20

engagelab-email threads get <thread-id> --json

engagelab-email threads messages <thread-id> \
  --limit 50 \
  --include-content \
  --json
```

## Receiving

```bash
engagelab-email emails receiving list \
  --mailbox-id 1001 \
  --status 2 \
  --agent-consume-status 0 \
  --keyword refund \
  --json

engagelab-email emails receiving get <message-uid> --json

engagelab-email emails receiving listen \
  --mailbox-id 1001 \
  --limit 1 \
  --timeout-seconds 30 \
  --interval-millis 1000 \
  --claim-ttl-seconds 300 \
  --json

engagelab-email emails receiving ack <message-uid> --json
engagelab-email emails receiving fail <message-uid> --json
```

## Reply

Short manual reply:

```bash
engagelab-email emails receiving reply <message-uid> \
  --text "您好，您的邮件已经收到。" \
  --json
```

Skill-friendly reply:

```bash
engagelab-email emails receiving reply <message-uid> --body-file reply.json --json
```

`reply.json`:

```json
{
  "subject": "Re: Refund request",
  "text": "您好，您的退款申请已经收到。",
  "html": "<p>您好，您的退款申请已经收到。</p>",
  "cc": ["ops@example.com"],
  "bcc": []
}
```

## Send

Manual send:

```bash
engagelab-email emails send \
  --mailbox-id 1001 \
  --to alice@example.com \
  --subject "Refund update" \
  --text "您的退款申请已经处理完成。" \
  --json
```

Skill-friendly send:

```bash
engagelab-email emails send --body-file send.json --json
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

## Project Layout

```text
src/
  index.js
  commands/
  config/
  core/
  output/
  services/
tests/
```

`core/` and `services/` contain no terminal output concerns. Command modules own CLI parsing and terminal behavior.
