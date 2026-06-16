# Resend CLI 对比结果

本文基于 `resend.md` 中描述的官方 Resend CLI 能力，对比当前仓库里的 CLI 实现。

## 总体结论

当前 CLI 只是一个很小的 Java 后端邮件服务包装器，主要通过内部服务封装调用 `/messages` 相关接口；`resend.md` 描述的是官方 Resend CLI，目标是覆盖完整 Resend API，包括邮件、入站邮件、域名、API Keys、广播、联系人、模板、日志、Webhook、自动化、事件、认证、诊断和 CI/CD 友好输出等。

两者不是同一量级：

- 当前 CLI 名称是 `my-project`，不是 `resend`。
- 当前命令组只有 `engagelab`，不是 `emails`、`domains`、`contacts` 等完整资源模型。
- 当前全局参数只有 Java 后端地址和 token。
- 当前内部服务封装只实现了 `GET /messages` 和 `POST /messages`。
- 当前没有 Resend CLI 的认证、profile、JSON 输出、错误结构、doctor、completion、本地 webhook listen 等能力。

## 当前已有能力

### CLI 入口

文件：`src/index.js`

当前 CLI：

- 名称：`my-project`
- 描述：`CLI for the Java backend email service`
- 版本：`0.1.0`
- 全局参数：
  - `-u, --base-url <url>`：Java backend API base URL
  - `-t, --token <token>`：API bearer token

### 命令组

文件：`src/commands/messages.js`

当前只有一个命令组：

```bash
my-project engagelab
```

包含两个子命令：

```bash
my-project engagelab list --limit 20
my-project engagelab send --to user@example.com --subject "Hello" --body "Message body"
```

### 内部服务封装能力

文件：`src/email-service.js`

当前内部服务封装只包含：

- `getMessages(params)`：调用 `GET /messages`
- `sendMessage(data)`：调用 `POST /messages`
- `request(config)`：通用请求包装
- `ServiceRequestError`：请求错误包装

## 当前明显问题

### 1. `engagelab list` 实际不可用

`src/commands/messages.js` 中调用了：

```js
service.getengagelab({ limit: options.limit })
```

但内部服务封装中没有 `getengagelab` 方法，只有：

```js
getMessages(params = {})
```

因此 `my-project engagelab list` 会在运行时报错。

### 2. README 和实际命令不一致

`README.md` 中写的是：

```bash
messages list
messages send
```

但实际实现的命令是：

```bash
engagelab list
engagelab send
```

需要统一命令命名。

### 3. README 对技术栈描述不准确

`README.md` 里曾经混用旧脚手架描述，当前 HTTP 调用实际使用的是 native `fetch`。

## 与 `resend.md` 的主要区别

| 维度 | `resend.md` 中的 Resend CLI | 当前 CLI |
| --- | --- | --- |
| CLI 名称 | `resend` | `my-project` |
| 目标 | 官方 Resend API 全量 CLI | Java 后端邮件服务 CLI |
| API 覆盖 | 覆盖 emails、domains、contacts、templates、webhooks、automations 等 | 只封装 `/messages` |
| 认证 | `--api-key`、`RESEND_API_KEY`、saved credentials、profile | `--token`、`MY_PROJECT_TOKEN` |
| 配置 | secure credential storage、config dir、profile | 无持久配置 |
| 输出 | TTY 格式化；pipe/CI/`--json` 自动 JSON | 始终打印 pretty JSON，spinner 始终启用 |
| 错误格式 | 结构化 `{ error: { message, code } }` | stderr 输出错误文本 |
| CI/CD | 原生支持 env key 和 JSON 输出 | 基础 token 方式 |
| 本地开发 | webhooks listen、本地 server、forward-to | 无 |
| 诊断 | `doctor` | 无 |
| shell completion | 支持 | 无 |

## 缺少功能清单

### 认证与账号

`resend.md` 支持：

- `--api-key <key>`
- `RESEND_API_KEY`
- `resend login`
- `resend login --key`
- `resend logout`
- secure credential storage
- `resend auth list`
- `resend auth switch [name]`
- `resend auth rename [old] [new]`
- `resend auth remove [name]`
- `resend whoami`
- `--profile`
- `RESEND_PROFILE`

当前缺少以上全部能力。

### Emails

`resend.md` 支持：

- `resend emails send`
- `resend emails batch`
- `resend emails list`
- `resend emails get <id>`
- `resend emails cancel <id>`
- `resend emails update <id>`

当前只类似支持一个非常简化的 send：

```bash
my-project engagelab send --to --subject --body
```

缺少：

- `--from`
- 多个 `--to`
- `--text`
- `--text-file`
- `--html`
- `--html-file`
- `--react-email`
- `--cc`
- `--bcc`
- `--reply-to`
- `--scheduled-at`
- `--attachment`
- `--headers`
- `--tags`
- `--idempotency-key`
- `--template`
- `--var`
- batch JSON 文件发送
- stdin 输入
- scheduled email cancel/update
- email get/list 的完整资源模型

### Receiving

`resend.md` 支持：

- `resend emails receiving list`
- `resend emails receiving get <id>`
- `resend emails receiving listen`
- `resend emails receiving forward <id>`
- `resend emails receiving attachments <id>`
- `resend emails receiving attachment <id> <attachment-id>`

当前完全缺失入站邮件处理能力。

### Domains

`resend.md` 支持：

- `resend domains create`
- `resend domains list`
- `resend domains get <id>`
- `resend domains verify <id>`
- `resend domains update <id>`
- `resend domains delete <id>`

当前完全缺失域名管理能力。

### API Keys

`resend.md` 支持：

- `resend api-keys create`
- `resend api-keys list`
- `resend api-keys delete <id>`

当前完全缺失 API Key 管理能力。

### Broadcasts

`resend.md` 支持：

- `resend broadcasts create`
- `resend broadcasts list`
- `resend broadcasts get <id>`
- `resend broadcasts send <id>`
- `resend broadcasts update <id>`
- `resend broadcasts delete <id>`
- `resend broadcasts open [id]`

当前完全缺失广播邮件能力。

### Contacts

`resend.md` 支持：

- `resend contacts create`
- `resend contacts list`
- `resend contacts get <id>`
- `resend contacts update <id>`
- `resend contacts delete <id>`
- `resend contacts segments <id>`
- `resend contacts add-segment <id>`
- `resend contacts remove-segment <id> <segment-id>`
- `resend contacts topics <id>`
- `resend contacts update-topics <id>`

当前完全缺失联系人管理能力。

### Contact Properties

`resend.md` 支持：

- `resend contact-properties create`
- `resend contact-properties list`
- `resend contact-properties get`
- `resend contact-properties update`
- `resend contact-properties delete`

当前完全缺失联系人自定义属性能力。

### Segments

`resend.md` 支持：

- `resend segments create`
- `resend segments list`
- `resend segments get <id>`
- `resend segments contacts <id>`
- `resend segments delete <id>`

当前完全缺失分群能力。

### Topics

`resend.md` 支持：

- `resend topics create`
- `resend topics list`
- `resend topics get`
- `resend topics update`
- `resend topics delete`

当前完全缺失订阅主题能力。

### Templates

`resend.md` 支持：

- `resend templates create`
- `resend templates list`
- `resend templates get <id>`
- `resend templates update <id>`
- `resend templates publish <id>`
- `resend templates duplicate <id>`
- `resend templates delete <id>`
- `resend templates open [id]`

当前完全缺失模板管理能力，也没有 React Email 模板渲染能力。

### Logs

`resend.md` 支持：

- `resend logs list`
- `resend logs get <id>`
- `resend logs open [id]`

当前完全缺失日志查看能力。

### Webhooks

`resend.md` 支持：

- `resend webhooks create`
- `resend webhooks list`
- `resend webhooks get <id>`
- `resend webhooks update <id>`
- `resend webhooks delete <id>`
- `resend webhooks listen`

`webhooks listen` 还包含：

- 启动本地 server
- 注册临时 webhook
- 流式输出事件
- 退出时清理 webhook
- `--url`
- `--events`
- `--forward-to`
- `--port`
- 保留并转发 Svix headers

当前完全缺失 webhook 能力。

### Automations

`resend.md` 支持：

- `resend automations create`
- `resend automations list`
- `resend automations get <id>`
- `resend automations update <id>`
- `resend automations stop <id>`
- `resend automations delete <id>`
- `resend automations open [id]`
- `resend automations runs list <automation-id>`
- `resend automations runs get --automation-id <id> --run-id <id>`

当前完全缺失自动化工作流能力。

### Events

`resend.md` 支持：

- `resend events send`
- `resend events create`
- `resend events list`
- `resend events get <id>`
- `resend events update <id>`
- `resend events delete <id>`
- `resend events open`

当前完全缺失事件定义和事件触发能力。

### Utility

`resend.md` 支持：

- `resend doctor`
- `resend doctor --json`
- `resend whoami`
- `resend open`
- `resend update`
- `resend completion [shell]`
- `resend completion --install`

当前完全缺失这些工具类命令。

### 全局选项

`resend.md` 支持：

- `--api-key <key>`
- `-p, --profile <name>`
- `--json`
- `-q, --quiet`
- `--insecure-storage`
- `--version`
- `--help`

当前只支持：

- `--base-url <url>`
- `--token <token>`
- `--version`
- `--help`

缺少 Resend 风格的全局选项和输出控制。

### 输出行为

`resend.md` 定义：

- Interactive 模式：stdout 输出格式化文本，stderr 输出 spinners 和 prompts。
- Machine 模式：piped、CI 或 `--json` 时 stdout 输出 JSON，stderr 不输出。
- 错误始终结构化输出：

```json
{ "error": { "message": "No API key found", "code": "auth_error" } }
```

当前 CLI：

- spinner 始终启用。
- 成功时输出 pretty JSON。
- 错误时输出彩色错误文本到 stderr。
- 没有 `--json`。
- 没有 `--quiet`。
- 没有根据 TTY、pipe、CI 自动切换输出模式。
- 没有统一错误 code。

### CI/CD

`resend.md` 推荐使用：

- `RESEND_API_KEY`
- 非交互 JSON 输出
- 无需 `login`

当前只支持：

- `MY_PROJECT_TOKEN`
- `MY_PROJECT_BASE_URL`

没有 Resend 风格的 CI 行为和 API key 解析优先级。

### 配置与安装

`resend.md` 定义：

- config directory：`~/.config/resend/`
- Windows 使用 `%APPDATA%`
- credentials 使用系统安全存储
- install directory：`~/.resend/bin/`
- 尊重 `$XDG_CONFIG_HOME`
- 尊重 `$RESEND_INSTALL`

当前完全缺失配置目录、凭据存储和安装目录逻辑。

## 建议实现优先级

### P0：修正当前可用性问题

1. 修复 `engagelab list` 调用不存在的内部服务方法。
2. 统一 README 和实际命令名。
3. 决定命令名到底使用 `messages`、`engagelab`，还是直接向 `resend emails` 靠拢。
4. 修正 README 中 Axios/fetch 描述不一致的问题。

### P1：补齐基础 CLI 体验

1. 增加 `--json`。
2. 增加 `--quiet`。
3. 区分 TTY 和非 TTY 输出。
4. 统一错误结构，例如 `{ "error": { "message": "...", "code": "..." } }`。
5. 增加更明确的 exit code 行为。

### P2：补齐邮件发送能力

1. 支持 `--from`。
2. 支持 `--text`、`--html`。
3. 支持 `--text-file`、`--html-file` 和 stdin。
4. 支持多个收件人。
5. 支持 `cc`、`bcc`、`reply-to`。
6. 支持附件。
7. 支持 headers、tags、idempotency key。
8. 支持 scheduled send。

### P3：认证和配置

1. 增加 `--api-key`。
2. 增加 `RESEND_API_KEY`。
3. 增加 `login/logout/whoami`。
4. 增加 profile 管理。
5. 增加 secure credential storage 或明确的本地 fallback。

### P4：扩展资源模块

按业务优先级逐步补：

1. `emails get/list/cancel/update/batch`
2. `domains`
3. `api-keys`
4. `webhooks`
5. `contacts`
6. `segments`
7. `topics`
8. `templates`
9. `broadcasts`
10. `logs`
11. `automations`
12. `events`

## 最小迁移路径

如果目标不是完整复刻 Resend CLI，而是做一个“兼容部分 Resend 体验的内部 CLI”，建议最小目标如下：

```bash
my-project emails send \
  --from "Acme <onboarding@example.com>" \
  --to user@example.com \
  --subject "Hello" \
  --text "It works!"

my-project emails list --limit 20
my-project emails get <id>
my-project doctor --json
```

并支持：

- `--base-url`
- `--token`
- `--json`
- `--quiet`
- `MY_PROJECT_BASE_URL`
- `MY_PROJECT_TOKEN`

这样可以先解决当前 CLI 的可用性和自动化脚本友好度，再决定是否继续向完整 Resend CLI 靠拢。
