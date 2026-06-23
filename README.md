# EngageLab Email CLI

Command line tool for EngageLab Email Agent workflows. Use it to query inbound messages, inspect threads, listen for new messages, reply to inbound mail, and send outbound mail.

## Install

```bash
npm install -g engagelab-email-cli
```

Check the installed command:

```bash
engagelab-email-cli -V
```

## Configure

Save your API base URL and Secret Key locally:

```bash
engagelab-email-cli config set --base-url http://localhost:8087 --secret-key sk_xxx
```

View the current configuration:

```bash
engagelab-email-cli config list
```

`config list` masks the Secret Key and never prints the full value.

You can also pass credentials per command:

```bash
engagelab-email-cli --base-url http://localhost:8087 --secret-key sk_xxx emails receiving list --json
```

Configuration priority:

1. Command options: `--base-url`, `--secret-key`
2. Environment variables: `ENGAGELAB_EMAIL_BASE_URL`, `ENGAGELAB_EMAIL_SECRET_KEY`
3. Local config file

## Recommended Agent Usage

For Agent or Skill integrations, use `--json` and JSON body files. This avoids shell quoting issues with long text, HTML, arrays, and newlines.

```bash
engagelab-email-cli emails receiving listen --limit 10 --interval 5 --json
engagelab-email-cli threads messages <thread-id> --include-content --json
engagelab-email-cli emails receiving reply <message-uid> --body-file reply.json --json
engagelab-email-cli emails send --body-file send.json --json
```

`emails receiving listen --json` prints NDJSON: one JSON object per new message line.

## Threads

List threads:

```bash
engagelab-email-cli threads list --mailbox-id 1001 --subject refund --participant alice@example.com --page-no 1 --page-size 20
```

Get one thread:

```bash
engagelab-email-cli threads get <thread-id> --json
```

List messages in a thread:

```bash
engagelab-email-cli threads messages <thread-id> --limit 50 --include-content --json
```

## Receiving

List inbound messages:

```bash
engagelab-email-cli emails receiving list --mailbox-id 1001 --keyword refund --json
```

Get one inbound message:

```bash
engagelab-email-cli emails receiving get <message-uid> --json
```

Listen for new inbound messages:

```bash
engagelab-email-cli emails receiving listen --limit 10 --interval 5 --json
```

Continue from a known cursor:

```bash
engagelab-email-cli emails receiving listen --after 1500 --limit 10 --interval 5 --json
```

`listen` is a long-running polling command:

- If `--after` is not provided, it seeds the cursor from the latest message and does not print historical messages on startup.
- It polls `GET /v1/message/listen` every `--interval` seconds.
- `--interval` defaults to `5`; the minimum is `2`.
- It updates the cursor from the newest returned message.
- It keeps running until `Ctrl+C` or process termination.

## Reply

Reply with plain text:

```bash
engagelab-email-cli emails receiving reply <message-uid> --text "您好，您的邮件已收到。" --json
```

Reply with a JSON file:

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

Send with command options:

```bash
engagelab-email-cli emails send --mailbox-id 1001 --to alice@example.com --subject "Refund update" --text "您的退款申请已经处理完成。" --json
```

Send an HTML file:

```bash
engagelab-email-cli emails send --mailbox-id 1001 --to alice@example.com --subject "Refund update" --html-file ./email.html --json
```

Send with a JSON file:

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
- `--body-file` or `--body-json` cannot be combined with field-level body options.
- `--text` and `--text-file` are mutually exclusive.
- `--html` and `--html-file` are mutually exclusive.
- `emails send` requires `mailboxId`, at least one `to`, `subject`, and at least one of `text` or `html`.
- `emails receiving reply` requires at least one of `text` or `html`.
