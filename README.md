# EngageLab Email CLI

EngageLab Email CLI helps agents and developers work with inbound and outbound email from the command line.

Use it to:

- List and inspect email threads
- Read inbound messages
- Poll for new inbound messages
- Reply to inbound messages
- Send new emails

## Install

```bash
npm install -g engagelab-email-cli
```

Check the installed version:

```bash
engagelab-email-cli -V
```

When you run a command that connects to EngageLab Email, the CLI checks whether a newer CLI version is available. If an update is required, it stops and shows the update command:

```bash
npm install -g engagelab-email-cli@latest
```

## Configure

Save your service address and Secret Key locally:

```bash
engagelab-email-cli config set --base-url http://localhost:8087 --secret-key sk_xxx
```

View the saved configuration:

```bash
engagelab-email-cli config list
```

`config list` masks the Secret Key.

You can also pass credentials for a single command:

```bash
engagelab-email-cli --base-url http://localhost:8087 --secret-key sk_xxx emails receiving list
```

Configuration priority:

1. Command options: `--base-url`, `--secret-key`
2. Environment variables: `ENGAGELAB_EMAIL_BASE_URL`, `ENGAGELAB_EMAIL_SECRET_KEY`
3. Local config file

## Quick Start

List recent inbound messages:

```bash
engagelab-email-cli emails receiving list --page-size 20
```

Read one inbound message:

```bash
engagelab-email-cli emails receiving get <message-uid>
```

View the full thread around a message:

```bash
engagelab-email-cli threads messages <thread-id> --include-content
```

Reply to an inbound message:

```bash
engagelab-email-cli emails receiving reply <message-uid> --text "Thanks, we received your message."
```

Send a new email:

```bash
engagelab-email-cli emails send \
  --mailbox-id 1001 \
  --to alice@example.com \
  --subject "Hello" \
  --text "Hello from EngageLab Email CLI."
```

For scripts or agents, add `--json` to get machine-readable output:

```bash
engagelab-email-cli emails receiving list --page-size 20 --json
```

## Commands

### `config set`

Save local configuration.

| Option | Description |
| --- | --- |
| `--base-url <url>` | Service address, such as `http://localhost:8087`. |
| `--secret-key <key>` | Secret Key. It must start with `sk_`. |

Example:

```bash
engagelab-email-cli config set --base-url http://localhost:8087 --secret-key sk_xxx
```

### `config list`

Show saved configuration.

Example:

```bash
engagelab-email-cli config list
```

### `threads list`

List email threads.

| Option | Description |
| --- | --- |
| `--mailbox-id <id>` | Filter by mailbox ID. |
| `--subject <text>` | Search by subject. |
| `--participant <email>` | Search by participant email address. |
| `--start-time <timestamp>` | Filter by latest message start time in milliseconds. |
| `--end-time <timestamp>` | Filter by latest message end time in milliseconds. |
| `--page-no <number>` | Page number. |
| `--page-size <number>` | Number of results per page. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli threads list --subject refund --page-no 1 --page-size 20
```

### `threads get <thread-id>`

Show one thread.

| Argument/Option | Description |
| --- | --- |
| `<thread-id>` | Thread ID. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli threads get b0d9d6a1-1d17-4df8-8245-c807d7e8cb50
```

### `threads messages <thread-id>`

List messages in a thread.

| Argument/Option | Description |
| --- | --- |
| `<thread-id>` | Thread ID. |
| `--limit <number>` | Maximum number of messages to return. |
| `--include-content` | Include message content and attachment information. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli threads messages b0d9d6a1-1d17-4df8-8245-c807d7e8cb50 --include-content --json
```

### `emails receiving list`

List inbound messages.

| Option | Description |
| --- | --- |
| `--mailbox-id <id>` | Filter by mailbox ID. |
| `--keyword <text>` | Search by keyword. |
| `--page-no <number>` | Page number. |
| `--page-size <number>` | Number of results per page. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli emails receiving list --keyword refund --page-size 20
```

### `emails receiving get <message-uid>`

Show one inbound message.

| Argument/Option | Description |
| --- | --- |
| `<message-uid>` | Message UID. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli emails receiving get 7e2b2de6-14c5-4ef1-a1e2-f4337e4606e2 --json
```

### `emails receiving listen`

Poll for new inbound messages. This command keeps running until you stop it with `Ctrl+C`.

| Option | Description |
| --- | --- |
| `--after <id>` | Start after a known cursor ID. |
| `--limit <number>` | Maximum messages per poll. Default: `10`. |
| `--interval <seconds>` | Polling interval. Default: `5`; minimum: `2`. |
| `--json` | Output one JSON message per line. |

Example:

```bash
engagelab-email-cli emails receiving listen --limit 10 --interval 5 --json
```

Continue from a known cursor:

```bash
engagelab-email-cli emails receiving listen --after 1500 --limit 10 --interval 5 --json
```

### `emails receiving reply <message-uid>`

Reply to an inbound message.

| Argument/Option | Description |
| --- | --- |
| `<message-uid>` | Message UID to reply to. |
| `--subject <text>` | Reply subject. |
| `--text <text>` | Plain text reply content. |
| `--html <html>` | HTML reply content. |
| `--text-file <path>` | Read plain text reply content from a file. |
| `--html-file <path>` | Read HTML reply content from a file. |
| `--cc <email>` | CC address. Can be repeated. |
| `--bcc <email>` | BCC address. Can be repeated. |
| `--reply-to <email>` | Reply-To address. Can be repeated. |
| `--preview-text <text>` | Preview text. |
| `--attachment <path>` | Attach a file. Can be repeated. |
| `--sandbox` | Send in sandbox mode. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli emails receiving reply 7e2b2de6-14c5-4ef1-a1e2-f4337e4606e2 \
  --text "Thanks, we received your message." \
  --attachment ./receipt.pdf
```

### `emails send`

Send a new email.

| Option | Description |
| --- | --- |
| `--mailbox-id <id>` | Mailbox ID to send from. Required. |
| `--from <email>` | Sender address. |
| `--to <email>` | Recipient address. Can be repeated. Required. |
| `--subject <text>` | Email subject. Required. |
| `--text <text>` | Plain text email content. |
| `--html <html>` | HTML email content. |
| `--text-file <path>` | Read plain text email content from a file. |
| `--html-file <path>` | Read HTML email content from a file. |
| `--cc <email>` | CC address. Can be repeated. |
| `--bcc <email>` | BCC address. Can be repeated. |
| `--reply-to <email>` | Reply-To address. Can be repeated. |
| `--preview-text <text>` | Preview text. |
| `--attachment <path>` | Attach a file. Can be repeated. |
| `--sandbox` | Send in sandbox mode. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli emails send \
  --mailbox-id 1001 \
  --to alice@example.com \
  --to bob@example.com \
  --subject "Refund update" \
  --text "Your refund has been processed." \
  --attachment ./receipt.pdf
```

Send HTML content from a file:

```bash
engagelab-email-cli emails send \
  --mailbox-id 1001 \
  --to alice@example.com \
  --subject "Monthly report" \
  --html-file ./report.html
```

## Output

By default, the CLI prints readable tables or summaries and shows a short loading message while requests are running.

Use `--json` when another tool or script needs to parse the result.

```bash
engagelab-email-cli emails receiving get <message-uid> --json
```

`emails receiving listen --json` prints one message JSON object per line.
