# Coding Agent Harness

一个 TypeScript 实现的编码 agent harness：包含 agent 主循环、SQLite 记忆、护栏、反馈传感器，以及 CLI/Docker 分发。

Agent = LLM + Harness。本项目即 harness 部分。

## 快速开始

### 本地开发

```bash
# 1. 安装依赖 + 构建
npm install
npm run build

# 2. 全局安装（可选，推荐）
.\install.cmd          # 将 harness.cmd 复制到 PATH 目录
harness                  # 之后在任何目录都可以直接运行
```

### 使用方式

```bash
# 在项目目录下
.\harness.cmd start "你的任务"    # 启动 agent 执行任务
.\harness.cmd config set-key     # 配置 API Key
.\harness.cmd config set-url     # 配置 Base URL
.\harness.cmd init my-project    # 初始化新项目

# 或者安装后，任何目录下
harness                          # 交互 REPL 模式
harness start "修复类型错误"     # 直接执行任务
harness config view-key          # 查看配置
```

### PowerShell 用户

PowerShell 默认执行策略可能阻止 `npm link`。使用以下方式：

**方式 A：项目内直接运行（无需改动系统设置）**
```powershell
.\harness.cmd start "你的任务"
```

**方式 B：全局安装（推荐）**
```powershell
.\install.cmd                     # 复制到 PATH 目录
harness                           # 之后任何目录都能用
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
| `harness` | 进入交互 REPL 模式 |
| `harness start <goal>` | 启动 coding agent 执行目标 |
| `harness config set-key` | 设置 API Key（隐藏输入） |
| `harness config view-key` | 查看 Key 状态（不显示明文） |
| `harness config clear-key` | 清除已存储的 API Key |
| `harness config set-url` | 设置 LLM 提供商 Base URL |
| `harness config view-url` | 查看当前 Base URL |
| `harness config clear-url` | 清除 Base URL（恢复默认） |
| `harness trace <session>` | 查看会话追踪记录 |
| `harness init <project>` | 初始化新项目 |

## API Key 安全

- Key 存储在系统钥匙串（`keytar`）或 `~/.harness/config.json`（全局）
- 环境变量 `HARNESS_API_KEY` / `HARNESS_BASE_URL` 可覆盖文件配置
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