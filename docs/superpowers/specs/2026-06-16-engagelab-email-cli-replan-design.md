# EngageLab Email CLI Replan Design

## Context

`agent-email-cli-dev.md` defines the project as an EngageLab Email CLI for Agent/Skill usage. The current repository is still a small generic CLI scaffold:

- The executable is `my-project`, not `engagelab-email`.
- The current command group is `engagelab list/send`, not `emails`, `emails receiving`, and `threads`.
- Authentication uses `--token` and `MY_PROJECT_TOKEN`, while the target design uses Secret Key authentication.
- Service calls still target simplified `/messages` endpoints instead of `/v1/message`, `/v1/thread`, and `/v1/mail/send`.

The project should be replanned around the first-phase Agent workflow rather than a full Resend-compatible platform CLI.

## Goal

Build `engagelab-email`, a Node.js CLI that lets Agents consume inbound email, read thread context, reply to inbound messages, and send new email through the EngageLab Email backend.

## Non-Goals

- Do not implement Mailbox management.
- Do not generate or manage Secret Keys from the CLI.
- Do not implement profiles, multi-account switching, secure OS credential storage, or login/logout in phase one.
- Do not implement attachments, file body input, permanent `--watch`, webhooks, domains, contacts, templates, or other full Resend resource groups in phase one.

## Command Surface

Phase one should expose these commands:

```bash
engagelab-email config set --base-url http://localhost:8087 --secret-key sk_xxx
engagelab-email config list

engagelab-email threads list
engagelab-email threads get <thread-id>
engagelab-email threads messages <thread-id> --include-content

engagelab-email emails receiving list
engagelab-email emails receiving get <message-uid>
engagelab-email emails receiving listen
engagelab-email emails receiving reply <message-uid> --text "..."

engagelab-email emails send --mailbox-id 1001 --to user@example.com --subject "..." --text "..."
```

Each API command should support `--json`. Human-readable output is the default.

## Runtime Configuration

Runtime configuration consists of:

- `baseUrl`
- `secretKey`

Secret Key resolution order:

1. CLI option `--secret-key`
2. Environment variable `ENGAGELAB_EMAIL_SECRET_KEY`
3. Local config file

Base URL resolution order:

1. CLI option `--base-url`
2. Environment variable `ENGAGELAB_EMAIL_BASE_URL`
3. Local config file

The local config file may store the Secret Key in plain text for phase one, but terminal output must never print the full value. `config list` should mask it as `sk_abcd****`.

## Architecture

Recommended source layout:

```text
src/
  index.js
  config/
    config-store.js
    resolve-runtime-config.js
  core/
    http-client.js
    result.js
    errors.js
    validators.js
  services/
    threads-service.js
    receiving-service.js
    sending-service.js
  commands/
    config.js
    threads.js
    emails.js
  output/
    json.js
    table.js
    formatters.js
    status.js
```

Responsibilities:

- `src/index.js`: creates the root Commander program and registers command modules.
- `src/config/*`: owns config file read/write and runtime config precedence.
- `src/core/http-client.js`: owns URL construction, timeout, headers, fetch calls, and response parsing.
- `src/core/result.js`: validates EngageLab `Result<T>` and `Result<Page<T>>` envelopes.
- `src/core/errors.js`: maps configuration, validation, HTTP, business, JSON, and network failures to CLI error codes.
- `src/services/*`: maps domain methods to REST endpoints without terminal output.
- `src/commands/*`: owns Commander parsing, validation, service calls, and process exit behavior.
- `src/output/*`: owns JSON output, table output, status labels, and masking.

Service and core modules must not use `console`, `chalk`, spinners, or `process.exit`.

## API Mapping

Threads:

- `threads list` -> `GET /v1/thread`
- `threads get <thread-id>` -> `GET /v1/thread/{threadId}`
- `threads messages <thread-id>` -> `GET /v1/thread/{threadId}/messages`

Inbound email:

- `emails receiving list` -> `GET /v1/message`
- `emails receiving get <message-uid>` -> `GET /v1/message/{messageUid}`
- `emails receiving listen` -> `GET /v1/message/listen`
- `emails receiving reply <message-uid>` -> `POST /v1/message/{messageUid}/reply`

Outbound email:

- `emails send` -> `POST /v1/mail/send`

All business API calls must inject:

```http
Authorization: Bearer <secretKey>
```

## Output Rules

Default mode:

- Print concise human-readable tables or summaries.
- Hide full Secret Keys.
- Show status labels instead of raw message status numbers where appropriate.

JSON mode:

- Print the raw service `Result<T>` envelope returned by the backend.
- Print only JSON to stdout.
- Put errors on stderr as structured JSON where possible.

The default Agent integration path should use `--json`.

## Error Handling

Exit code mapping:

| Exit Code | Scenario |
| --- | --- |
| `0` | Success |
| `1` | Invalid arguments or missing configuration |
| `2` | Authentication failure |
| `3` | Resource not found |
| `4` | State conflict |
| `5` | Server, network, invalid JSON, or unknown request failure |

HTTP non-2xx and `Result.code != 200` should both become CLI errors. `data == null` should be treated as an empty result when the request itself succeeded.

## Agent Workflow

The primary supported Agent loop is:

1. `engagelab-email emails receiving listen --json`
2. Read `messageUid` and `threadId` from the returned message.
3. `engagelab-email threads messages <threadId> --include-content --json`
4. Generate an answer using the full thread context.
5. `engagelab-email emails receiving reply <messageUid> --text "..."`

The backend updates the original inbound message to `replied` after a successful reply.

## Phase Two Candidates

- `emails receiving listen --watch`
- Local de-duplication cursor for repeated listen output
- `--text-file`, `--html-file`, and stdin body input
- Attachment upload
- `doctor`
- Shell completion
- Secure credential storage
- Profile management
