# Role & Goal

你是一个精通 Node.js 命令行开发的资深专家。请帮助构建一个纯 CLI 项目：EngageLab Email CLI。

项目目标是提供给 Agent/Skill 使用的命令行入口，覆盖入站邮件读取、Thread 查询、长轮询消费、邮件回复和直接发送邮件。

**当前项目不再建设外部客户端库，也不再使用 monorepo 分层。**

## 技术限制

- 使用纯 JavaScript。
- 使用 ES Modules，即 `package.json` 配置 `"type": "module"`。
- 不引入 TypeScript。
- 不需要编译或打包步骤。
- Node.js 可以直接原生运行。

## 架构要求

项目采用单 CLI 包结构：

```text
src/
  index.js
  config/
  core/
  services/
  commands/
  output/
tests/
```

分层原则：

- `core/` 负责 HTTP 请求、Result 响应解析、错误模型和参数校验。
- `services/` 负责封装 EngageLab Email REST API 调用，但它们只是 CLI 内部服务模块，不作为外部客户端库发布。
- `commands/` 负责 Commander 命令注册、参数解析和调用内部服务。
- `output/` 负责 JSON、表格、人类可读摘要和状态格式化。
- `config/` 负责本地配置读写和运行时配置解析。

服务和 core 模块不能包含终端交互逻辑，例如 `console.*`、`chalk`、spinner 或 `process.exit`。
