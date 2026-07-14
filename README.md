# Coding Agent Harness

一个 TypeScript 实现的编码 agent harness：包含 agent 主循环、SQLite 记忆、护栏、反馈传感器，以及 CLI/Docker 分发。

Agent = LLM + Harness。本项目即 harness 部分。

## 快速开始

### npm

```bash
npm install -g coding-agent-harness
harness config set-key   # 输入你的 API Key
harness start "修复 src/utils.ts 中的类型错误"
```

### Docker

```bash
docker build -t coding-agent-harness .
docker run -it --rm \
  -v $(pwd):/workspace \
  -e HARNESS_API_KEY=sk-... \
  coding-agent-harness start "修复类型错误"
```

## 命令

| 命令 | 描述 |
|---------|-------------|
| `harness start <goal>` | 启动 coding agent 执行目标 |
| `harness config set-key` | 设置 API Key（隐藏输入） |
| `harness config view-key` | 查看 Key 状态（不显示明文） |
| `harness config clear-key` | 清除已存储的 API Key |
| `harness trace <session>` | 查看会话追踪记录 |
| `harness init <project>` | 初始化新项目 |

## API Key 安全

- Key 存储在系统钥匙串（通过 `keytar`）或环境变量（`HARNESS_API_KEY`）
- Key 绝不硬编码、绝不提交到 Git、绝不写入日志
- `view-key` 仅显示状态，不显示明文 key

## 架构

详见 `SPEC.md` 完整设计文档。

## 项目结构

```
src/
├── cli/          # CLI 入口与命令
├── harness/      # 核心：类型、主循环、上下文、装配
├── tools/        # 工具注册与内建工具
├── memory/       # SQLite 记忆（会话 + 项目知识）
├── llm/          # LLM 提供者抽象（OpenAI + Mock）
├── governance/   # 护栏 + HITL
├── feedback/     # 传感器运行器
├── sandbox/      # 执行沙箱
├── observability/# 追踪器
└── config/       # 凭据管理
```

## 测试

```bash
npm test
```

所有测试使用 mock LLM + `:memory:` SQLite — 无需网络或真实 LLM。

## 分发

- **npm：** `npm install -g coding-agent-harness`
- **Docker：** `docker build -t coding-agent-harness .`

## 已知限制

- Windows：keytar 需要原生构建工具
- MCP 服务器支持已搭建骨架但未完整实现
- 追踪信息持久化到 SQLite 尚未实现