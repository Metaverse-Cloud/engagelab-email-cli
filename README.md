# EngageLab Email CLI

EngageLab Email CLI helps agents and developers work with inbound and outbound email from the command line.

Use it to:

- List available mailboxes
- List and inspect email threads
- Read inbound messages
- Poll for new inbound messages
- Reply to inbound messages
- Send new emails

## Install

```bash
npm install -g @engagelabemail/cli
```

Check the installed version:

```bash
engagelab-email-cli -V
```

When you run a command that connects to EngageLab Email, the CLI checks whether a newer CLI version is available. If an update is required, it stops and shows the update command:

```bash
npm install -g @engagelabemail/cli@latest
```

## Configuration

### Manage Saved Configuration

Use the `config` command group to save, inspect, or clear local credentials.

Save your service address and Secret Key locally:

```bash
engagelab-email-cli config set --base-url http://localhost:8087 --secret-key sk_xxx
```

View the saved configuration:

```bash
engagelab-email-cli config list
```

Clear the saved configuration:

```bash
engagelab-email-cli config clear
```

`config list` masks the Secret Key.

### Use Global Credentials With Any Business Command

You do not have to save credentials first. You can pass `--base-url` and `--secret-key` directly before any business command such as `threads ...` or `emails ...`. These command-line credentials apply only to the current command and do not overwrite saved config.

Example:

```bash
engagelab-email-cli --base-url http://localhost:8087 --secret-key sk_xxx threads get thread-1
```

## Quick Start

List recent inbound messages:

```bash
engagelab-email-cli emails receiving list --mailbox-id 12 --page-size 20
```

Read one inbound message:

```bash
engagelab-email-cli emails receiving get <message-uid>
```

View the full thread around a message:

```bash
engagelab-email-cli threads messages <thread-id> --include-content --limit 10
```

Reply to an inbound message:

```bash
engagelab-email-cli emails receiving reply <message-uid> --subject "Re: Hello" --text "Thanks, we received your message."
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
engagelab-email-cli emails receiving list --mailbox-id 12 --page-size 20 --json
```

## Commands

### `config set`

Save local configuration.

| Option | Description |
| --- | --- |
| `--base-url <url>` | Service address. Defaults to `ENGAGELAB_EMAIL_BASE_URL` when set. |
| `--secret-key <key>` | Secret Key. Defaults to `ENGAGELAB_EMAIL_SECRET_KEY` when set. |

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

### `config clear`

Clear saved local configuration, including `baseUrl` and `secretKey`.

Example:

```bash
engagelab-email-cli config clear
```

### `mailbox list`

List available mailboxes.

| Option | Description |
| --- | --- |
| `--mailbox <address>` | Filter by mailbox address. |
| `--page-no <number>` | Page number. |
| `--page-size <number>` | Page size. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli mailbox list --page-size 20
```

### `threads list`

List email threads.

| Option | Description |
| --- | --- |
| `--mailbox-id <id>` | Filter by mailbox ID. |
| `--subject <text>` | Search by normalized subject. |
| `--participant <email>` | Search by participant. |
| `--start-time <timestamp>` | Latest message start timestamp in milliseconds. |
| `--end-time <timestamp>` | Latest message end timestamp in milliseconds. |
| `--page-no <number>` | Page number. |
| `--page-size <number>` | Page size. |
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
| `--limit <number>` | Message limit. |
| `--include-content` | Include text/html/headers/attachments. |
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
| `--keyword <text>` | Search keyword. |
| `--page-no <number>` | Page number. |
| `--page-size <number>` | Page size. |
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
| `--after <id>` | Cursor ID from the previous result. |
| `--limit <number>` | Message limit. |
| `--interval <seconds>` | Polling interval in seconds (minimum 2). |
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
| `--text <text>` | Plain text body. |
| `--html <html>` | HTML body. |
| `--text-file <path>` | Read plain text body from file. |
| `--html-file <path>` | Read HTML body from file. |
| `--cc <email>` | CC address. Can be repeated. |
| `--bcc <email>` | BCC address. Can be repeated. |
| `--reply-to <email>` | Reply-To address. Can be repeated. |
| `--preview-text <text>` | Email preview text. |
| `--attachment <path>` | Attach local file. Can be repeated. Requires `--disposition`. Up to 10 files, 10MB total after base64 encoding (about 7.5MB raw files). |
| `--disposition <value>` | Attachment disposition: `attachment` or `inline`. Required when using `--attachment`. Can be repeated or provided once for all attachments. |
| `--content-id <id>` | Content-ID for inline image attachments. Required when `--disposition inline` is used with an image attachment. |
| `--sandbox` | Send in sandbox mode. |
| `--json` | Output raw JSON. |

Example:

```bash
engagelab-email-cli emails receiving reply 7e2b2de6-14c5-4ef1-a1e2-f4337e4606e2 \
  --subject "Re: Refund update" \
  --text "Thanks, we received your message." \
  --attachment ./receipt.pdf \
  --disposition attachment
```

### `emails send`

Send a new email.

| Option | Description |
| --- | --- |
| `--mailbox-id <id>` | Mailbox ID. |
| `--from <email>` | Sender email address. |
| `--to <email>` | Recipient email address. Can be repeated. |
| `--subject <text>` | Email subject. |
| `--text <text>` | Plain text body. |
| `--html <html>` | HTML body. |
| `--text-file <path>` | Read plain text body from file. |
| `--html-file <path>` | Read HTML body from file. |
| `--cc <email>` | CC address. Can be repeated. |
| `--bcc <email>` | BCC address. Can be repeated. |
| `--reply-to <email>` | Reply-To address. Can be repeated. |
| `--preview-text <text>` | Email preview text. |
| `--attachment <path>` | Attach local file. Can be repeated. Requires `--disposition`. Up to 10 files, 10MB total after base64 encoding (about 7.5MB raw files). |
| `--disposition <value>` | Attachment disposition: `attachment` or `inline`. Required when using `--attachment`. Can be repeated or provided once for all attachments. |
| `--content-id <id>` | Content-ID for inline image attachments. Required when `--disposition inline` is used with an image attachment. |
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
  --attachment ./receipt.pdf \
  --disposition attachment
```

Send HTML with an inline image attachment:

```bash
engagelab-email-cli emails send --mailbox-id 1001 --to alice@example.com --subject "Inline image" --html "<p>Logo <img src=cid:image_1000></p>" --attachment ./logo.png --disposition inline --content-id image_1000
```

Attachment metadata can be passed in two compatible ways. The recommended form binds metadata to each file path, which avoids ambiguity with multiple attachments:

```bash
engagelab-email-cli emails send --mailbox-id 1001 --to alice@example.com --subject "Mixed attachments" --html "<p>Logo <img src=cid:image_1000></p>" --attachment "./receipt.pdf;disposition=attachment" --attachment "./logo.png;disposition=inline;content_id=image_1000"
```

The legacy split-option form is also supported for compatibility:

```bash
engagelab-email-cli emails send --mailbox-id 1001 --to alice@example.com --subject "Inline image" --html "<p>Logo <img src=cid:image_1000></p>" --attachment ./logo.png --disposition inline --content-id image_1000
```

Do not mix inline attachment metadata (`path;disposition=...`) with `--disposition` or `--content-id` in the same command.
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


## Errors

Human-readable errors include the business error code when the API returns one, for example `[100101] unauthorized`.

`--json` errors use this shape:

```json
{
  "error": {
    "code": "auth_error",
    "errorCode": 100101,
    "message": "unauthorized"
  }
}
```

Exit codes follow the API document:

| Exit Code | Meaning |
| --- | --- |
| `1` | Parameter error or missing config |
| `2` | Authentication failure |
| `3` | Resource not found |
| `4` | Conflict or in-progress state |
| `5` | Server error or network error |

