# SPEC: Coding Agent Harness

> AI4SE 期末项目 · 设计文档
> Spec-Driven, Subagent-Built, Human-Owned.

---

## 1. 问题陈述

### 1.1 要解决什么问题

当 LLM 能完成大部分"思考"时，从"一个只会产生下一步设想的 LLM"到"一台能稳定、可靠工作的编码系统"之间存在巨大的工程鸿沟。这个鸿沟由 **Agent = LLM + Harness** 中的 Harness 层填补。本项目的核心命题是：**在 LLM 之上，用代码构建一个可治理、可观测、可分发、可测试的工程层**。

### 1.2 目标用户

- 在开发工作流中引入 AI 辅助的软件工程师
- 希望通过声明式规则（CLAUDE.md / AGENTS.md）约束 agent 行为的团队
- 需要在安全边界内让 agent 自主执行编码任务的开发者

### 1.3 为什么值得做

现有 agent 框架（LangChain、AutoGen、CrewAI）将底层循环封装为黑箱，用户只能通过提示词影响行为。本项目反其道而行：**自己实现 agent 主循环的每一层**，让治理、反馈、记忆、工具分发、上下文工程全部以确定性代码而非提示词的方式存在。这不仅是工程实践，更是对"AI 协作时代工程师价值何在"这一命题的亲身回答。

---

## 2. 用户故事

> 遵循 INVEST 原则（Independent, Negotiable, Valuable, Estimable, Small, Testable）。

| ID | 故事标题 | 描述 | 验收标准 |
|----|----------|------|----------|
| US-1 | 作为用户，我想在命令行输入一个目标，让 agent 自动执行多步编码任务 | 用户在终端执行 `harness start "修复 src/utils.ts 中的类型错误"`，agent 自动读取文件、分析问题、执行修复、运行测试验证 | CLI 启动后 30 秒内输出首个动作；agent 能自主完成至少 3 轮工具调用后输出完成报告 |
| US-2 | 作为用户，我想让 agent 记住项目的历史决策，避免重复犯同样的错误 | 首次修复时 agent 记录了一条架构约定；同一项目的第二次会话中，agent 在预检索阶段自动加载了该约定并遵守 | 跨会话的 `project_knowledge` 表在第二次启动时被检索到并出现在上下文中 |
| US-3 | 作为用户，我想在 agent 执行危险操作前收到拦截提示并人工确认 | agent 尝试执行 `rm -rf ./node_modules`，CLI 输出 `[!] 危险操作已被拦截，输入 y 确认 / n 拒绝：`，用户输入 `n` 后 agent 放弃该操作 | `guardrail.allow()` 返回 false；HITL 提示输出；用户拒绝后上下文回灌了拒绝消息 |
| US-4 | 作为用户，我想在首次运行时安全录入 API Key，且 key 不暴露在终端或日志中 | 运行 `harness config set-key` 后，终端提示输入 API Key，输入内容不回显；之后运行 `harness config view-key` 只显示"已配置"，不显示明文 | 使用 `keytar` 或加密文件存储；`view-key` 不回显；Git 仓库中无任何 key 痕迹 |
| US-5 | 作为用户，我想让 agent 在修改代码后自动运行测试，并根据测试结果自我修正 | agent 修改了文件后，自动触发 `run_sensors`，测试失败信息回灌上下文，agent 下一轮据此修正代码 | mock LLM 下注入失败后，下一轮动作与失败前的动作不同，且上下文包含失败信息 |
| US-6 | 作为用户，我想通过 Docker 或 npm 快速安装和运行 harness | `npm install -g coding-agent-harness` 后即可使用 `harness` 命令；或 `docker pull ...` + `docker run` 后即可使用 | 两种分发方式各自可在全新机器上从零运行成功 |
| US-7 | 作为用户，我想在 agent 执行过程中看到每一步的决策和结果，便于理解它在做什么 | agent 每轮在终端输出 `[Step 1] 动作: read_file src/utils.ts → 完成` 这类可读日志 | 每轮至少输出动作类型 + 状态 + 简要结果；可观测性 tracer 记录可事后回放 |

---

## 3. 功能规约

### 3.1 装配模块（`build_agent`）

| 项目 | 说明 |
|------|------|
| **输入** | 项目路径、配置参数（规则文件路径、LLM 供应商、模型名等） |
| **行为** | 加载规则文件 → 注册技能名片 → 注册内建工具 → 连接 MCP 服务器 → 注册 hooks → 注册 guardrail → 创建沙箱 → 打开 tracer → 打开 memory/retriever |
| **输出** | `Harness` 实例，包含所有组件的引用 |
| **边界条件** | 规则文件不存在时静默跳过；MCP 服务器连接失败时记录警告但继续装配；LLM 配置缺失时在循环阶段报错而非装配阶段 |
| **错误处理** | 装配阶段任何组件初始化失败，抛出 `HarnessInitError` 并附详细原因 |

### 3.2 主循环模块（`agent_loop`）

| 项目 | 说明 |
|------|------|
| **输入** | `goal`（字符串目标）、`Harness` 实例、`depth`（递归深度，默认 0） |
| **行为** | 构建上下文 → 调用 LLM → 解析动作 → 护栏拦截 → hooks 执行前 → 分发动作（工具/skill/MCP/子 agent/记忆）→ 结果回灌 → 反馈传感器 → hooks 执行后 → 循环直到 done 或超限 |
| **输出** | `answer`（最终回答文本） |
| **边界条件** | `MAX_STEPS` 达到后强制退出；`MAX_DEPTH` 防止子 agent 递归过深；token 超限时自动压缩上下文 |
| **错误处理** | 工具调用失败时错误信息作为 user 消息回灌，不中断循环；guardrail 拦截后回灌拦截消息并继续 |

### 3.3 工具模块（`register_builtin_tools` + `connect_mcp_servers`）

| 项目 | 说明 |
|------|------|
| **输入** | 工具名称 + 参数（由 LLM 动作解析后提供） |
| **行为** | 内建工具直呼处理函数；MCP 工具按 MCP 协议调用外部进程 |
| **内建工具清单** | `read_file(path)`、`write_file(path, content)`、`bash(command)`、`run_test(pattern)`、`search(pattern)`、`list_files(path)` |
| **输出** | 工具执行结果文本 |
| **边界条件** | 工具名称不存在时返回错误信息；MCP 工具超时（默认 30s）返回超时错误 |
| **错误处理** | 所有工具错误捕获为 `ToolError`，标准化错误格式回灌 |

### 3.4 记忆模块（重点维度）

**会话级记忆（`action_logs` 表）**

| 项目 | 说明 |
|------|------|
| **输入** | `session_id`、`step`、`action_type`、`action_json`、`result`、`feedback` |
| **行为** | 每轮循环将动作和结果写入 `action_logs` 表 |
| **输出** | 写入确认 |
| **边界条件** | 同一 session 的 step 递增；允许 result 为 null（动作未完成） |

**项目级记忆（`project_knowledge` 表）**

| 项目 | 说明 |
|------|------|
| **输入** | `project`、`category`、`content`、`source_session`（可选） |
| **行为** | `take_note` 动作实时写入；`consolidate()` 在会话末提取关键决策写入 |
| **输出** | 写入确认 |
| **边界条件** | 同一项目 + 同一内容的重复条目自动去重；`category` 限定为 `decision`/`convention`/`architecture`/`lesson` |

**检索模块（`retriever.retrieve`）**

| 项目 | 说明 |
|------|------|
| **输入** | `goal`（目标文本） |
| **行为** | 按项目名 + 关键词匹配从 `project_knowledge` 检索，返回最多 5 条最相关记忆 |
| **输出** | 格式化的记忆文本片段 |
| **边界条件** | 无匹配时返回空字符串；不检索 `action_logs`（那是会话内细节，consolidate 后才进 knowledge） |

### 3.5 治理模块（`register_guardrail` + `register_hooks`）

**Guardrail 危险动作拦截**

| 项目 | 说明 |
|------|------|
| **输入** | `action` 对象 |
| **行为** | 识别危险 shell 命令（`rm -rf`、`DROP TABLE`、`git push --force`、`format C:` 等）→ 返回 `allow: false` + 拦截原因 |
| **输出** | `{allow: boolean, reason?: string}` |
| **边界条件** | 用户 HITL 确认后放行（`guardrail.override()`）；扩展规则可配置 |
| **错误处理** | guardrail 自身异常时默认放行（fail-open）并记录警告 |

**Hooks 生命周期事件**

| 事件 | 触发时机 | 参数 | 可返回 |
|------|----------|------|--------|
| `PreToolUse` | 工具执行前 | `action` | `"deny"` 或 `"allow"` |
| `PostToolUse` | 工具执行后 | `action`, `result` | 无 |
| `SessionEnd` | 循环退出后 | `null` | 无 |

### 3.6 反馈模块（`run_sensors`）

| 项目 | 说明 |
|------|------|
| **输入** | 变更后的代码上下文 |
| **行为** | 运行测试 → 运行 lint → 运行类型检查 → 解析输出为结构化报告 |
| **输出** | `{pass: boolean, details: {test: string, status: "pass"|"fail", message: string}[]}` |
| **边界条件** | 无测试文件时跳过测试传感器；无 lint 配置时跳过 lint 传感器 |
| **错误处理** | 传感器自身崩溃不影响主循环，记录错误后继续 |

### 3.7 收尾模块（`consolidate`）

| 项目 | 说明 |
|------|------|
| **输入** | `context`（完整对话历史） |
| **行为** | 扫描 `action_logs` 中 `take_note` 动作 → 提取关键决策 → 去重写入 `project_knowledge` → 更新 `sessions.status = 'consolidated'` → 刷新 tracer |
| **输出** | 汇总的 consolidate 报告 |
| **边界条件** | 无 `take_note` 记录时跳过 knowledge 写入；consolidate 失败不抛出异常，仅记录日志 |

---

## 4. 非功能性需求

### 4.1 性能

- 单轮 LLM 调用后，工具执行 + 反馈传感器应在 5 秒内完成（网络延迟除外）
- `MAX_STEPS` 默认 50，CLI 可配置
- SQLite 记忆读写应在 10ms 内完成
- 上下文 token 数超过限制（默认 128K）时自动压缩

### 4.2 安全（含凭据威胁模型）

| 威胁 | 风险等级 | 对策 |
|------|----------|------|
| API Key 硬编码在源码 | 高 | 禁止硬编码，从系统钥匙串或 `.env` 加载 |
| Key 泄露进 Git 历史 | 高 | `.gitignore` 排除 `.env`；提交前自查；`pre-commit` hook 扫描 |
| Shell history 泄露 | 中 | 拒绝 `export KEY=xxx` 方式，仅通过文件或钥匙串加载 |
| 进程环境变量可见性 | 中 | 使用前读取，用后立即清除变量引用 |
| 容器内 key 持久化 | 中 | 容器内使用 AES-256-GCM 加密文件，主密码由环境变量提供 |
| 危险 shell 命令执行 | 高 | guardrail 拦截 + HITL 确认，双保险 |

### 4.3 可用性

- CLI 提供 `--help` 子命令，覆盖所有操作说明
- 首次运行自动引导 key 录入
- 错误信息包含可操作建议（而非仅堆栈跟踪）
- 每步输出格式统一：`[Step N] 动作类型: 描述 → 状态`

### 4.4 可观测性

- `tracer` 记录每轮（决策，观察）对
- 支持导出为 JSON 格式供事后回放分析
- `harness trace <session_id>` 命令查看历史会话记录
- 日志分级：`ERROR`/`WARN`/`INFO`/`DEBUG`

---

## 5. 系统架构

### 5.1 组件图

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLI 入口 (harness)                        │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ start    │  │ config       │  │ trace      │  │ init      │ │
│  │ <goal>   │  │ set-key/view │  │ <session>  │  │ <project> │ │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘ │
└───────┼───────────────┼────────────────┼───────────────┼───────┘
        │               │                │               │
        ▼               ▼                ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        Harness 内核                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    agent_loop                             │   │
│  │  ┌──────────┐    ┌──────┐    ┌────────────────────────┐ │   │
│  │  │ Context  │───→│ LLM  │───→│     Action Router      │ │   │
│  │  │ Engineer │    │(1行) │    │  guardrail → hook →    │ │   │
│  │  │ (CE)     │    │      │    │  tool/mcp/skill/       │ │   │
│  │  └──────────┘    └──────┘    │  subagent/memory       │ │   │
│  │       ↑                      └───────────┬────────────┘ │   │
│  │       │                                  │              │   │
│  │  ┌────┴──────┐                    ┌──────▼─────────┐   │   │
│  │  │ Memory    │                    │   Feedback     │   │   │
│  │  │ (SQLite)  │◄───────────────────│   Sensors      │   │   │
│  │  │ Retriever │                    │ (test/lint/ts) │   │   │
│  │  └───────────┘                    └────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ Guardrail │  │ Hooks     │  │ Sandbox   │  │ Tracer       │ │
│  │ (拦截)    │  │ (事件)    │  │ (隔离)    │  │ (可观测性)   │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────────┘ │
│                                                                  │
│  ┌────────────────┐  ┌────────────────────┐                     │
│  │ Builtin Tools  │  │ MCP Servers        │                     │
│  │ read/write/bash│  │ (外部工具协议)      │                     │
│  └────────────────┘  └────────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 数据流

```
用户输入 goal
    │
    ▼
build_agent() ──→ 装配所有组件 → Harness 实例
    │
    ▼
agent_loop(goal, H)
    │
    ├─ ① 构建上下文: system_prompt + rules + memory.read(goal) + retriever.retrieve(goal) + goal
    │
    ├─ ② LLM(context, menu) → (text, action)
    │
    ├─ ③ 路由动作:
    │   ├─ type == "done"          → 退出循环
    │   ├─ type == "call_tool"     → guardrail → hook → sandbox.run(tool) / MCP.call(tool)
    │   ├─ type == "use_skill"     → 加载 SKILL.md 全文 → 回灌上下文
    │   ├─ type == "spawn_subagent"→ 递归 agent_loop(subtask, restricted_H, depth+1)
    │   ├─ type == "take_note"     → memory.write(note) → 实时持久化
    │   └─ type == 其他            → 回灌错误信息
    │
    ├─ ④ 反馈: 若 action.changed_code → run_sensors() → 回灌测试结果
    │
    └─ ⑤ 循环继续 / 停机
            │
            ▼
    consolidate() → 固化记忆 → tracer.flush() → 返回 answer
```

### 5.3 外部依赖

| 依赖 | 用途 | 类型 |
|------|------|------|
| OpenAI API（及兼容格式供应商） | LLM 调用 | 运行时（可替换为 mock） |
| SQLite（`better-sqlite3`） | 记忆存储 | 运行时 |
| `keytar` | 系统钥匙串接口 | 可选运行时 |
| `dotenv` | `.env` 文件加载 | 可选运行时 |
| Node.js 20+ | 运行时 | 运行时 |
| MCP 协议（各外部工具服务器） | 外部工具接入 | 按需 |

---

## 6. 数据模型

### 6.1 实体关系图

```
sessions 1────N action_logs
sessions N────N project_knowledge (通过 project 字段关联)
```

### 6.2 表结构

```sql
-- 会话记录
CREATE TABLE sessions (
    id          TEXT PRIMARY KEY,
    project     TEXT NOT NULL,
    goal        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','consolidated','archived'))
);

-- 动作日志（会话级记忆）
CREATE TABLE action_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  TEXT NOT NULL REFERENCES sessions(id),
    step        INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    action_json TEXT NOT NULL,
    result      TEXT,
    feedback    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 项目知识（项目级记忆，跨会话）
CREATE TABLE project_knowledge (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    project         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK(category IN ('decision','convention','architecture','lesson')),
    content         TEXT NOT NULL,
    source_session  TEXT REFERENCES sessions(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 工具注册表
CREATE TABLE builtin_tools (
    name        TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    handler     TEXT NOT NULL
);

-- MCP 服务器注册表
CREATE TABLE mcp_servers (
    name        TEXT PRIMARY KEY,
    command     TEXT NOT NULL,
    args        TEXT,
    enabled     INTEGER NOT NULL DEFAULT 1
);
```

### 6.3 约束

- `sessions.id` 使用 UUID v4
- `action_logs.step` 在同一 session 内递增
- `project_knowledge` 中同一 `(project, content)` 组合不允许重复（去重写入）
- 索引：`action_logs(session_id)`、`project_knowledge(project, category)`

---

## 7. 凭据与分发设计

### 7.1 凭据存储方案

| 场景 | 方案 | 说明 |
|------|------|------|
| 本地开发（npm 安装） | `keytar` → 系统钥匙串 | Windows Credential Manager / macOS Keychain / Linux Secret Service |
| 本地开发（回退方案） | `.env` 文件 + `dotenv` 加载 | 明文风险已在 SPEC 中标明；`.env` 在 `.gitignore` 中排除 |
| Docker 容器内 | 加密文件 `~/.config/harness/keys.json` | AES-256-GCM 加密，主密码由环境变量 `HARNESS_MASTER_PASS` 提供 |

### 7.2 凭据生命周期

```
首次运行:
  harness config set-key
    → 检测钥匙串可用性
    → 可用: 隐藏输入 → keytar.setPassword()
    → 不可用: 隐藏输入 → 生成加密文件 + 提示设置 HARNESS_MASTER_PASS

查看状态:
  harness config view-key
    → 输出 "已配置: <供应商> (存储于: 系统钥匙串)" 或 "未配置"
    → 绝不回显明文

更新:
  harness config set-key
    → 覆盖已有值

清除:
  harness config clear-key
    → 删除钥匙串条目或加密文件
```

### 7.3 分发

**npm 包分发：**
- 包名：`coding-agent-harness`
- 安装：`npm install -g coding-agent-harness`
- CLI 入口：`harness`
- 子命令：`harness init <project>`、`harness start "<goal>"`、`harness config set-key`、`harness config view-key`、`harness config clear-key`、`harness trace <session_id>`
- 前提：Node.js 20+

**Docker 容器分发：**
- 基础镜像：`node:20-alpine`
- 构建：`docker build -t coding-agent-harness .`
- 运行：
  ```
  docker run -it --rm \
    -v $(pwd):/workspace \
    -v harness-keys:/root/.config/harness \
    -e HARNESS_MASTER_PASS=<your-master-password> \
    coding-agent-harness start "<goal>"
  ```
- CI 中自动构建并推送至 GitHub Container Registry

**README 需包含：**
- 两种分发方式的获取与运行命令
- key 在目标机器上的安全配置方式
- 已知限制（平台、架构、依赖前提）

---

## 8. 技术选型与理由

| 层面 | 选型 | 理由 |
|------|------|------|
| **语言** | TypeScript (Node.js 20+) | 与 Superpowers 生态一致；async/await 天然适合 agent 循环；TDD 工具链成熟 |
| **LLM 协议** | OpenAI API 兼容格式 | 事实标准，多种供应商（OpenAI、DeepSeek、Anthropic 等）均可接入 |
| **记忆存储** | `better-sqlite3` | 零配置、`:memory:` 模式支持确定性单测、事务安全、结构化查询 |
| **凭据** | `keytar` + `dotenv` | 跨平台系统钥匙串 + 回退方案 |
| **测试** | Vitest | 零配置、快速、原生 TypeScript 支持 |
| **分发** | npm + Docker | npm 符合 Node.js 生态直觉；Docker 保证环境一致性 |
| **CI** | GitHub Actions | 与 GitHub 仓库集成，自动运行测试 + 构建 Docker 镜像 |

---

## 9. 领域与机制设计（Coding Agent Harness 专属）

### 9.1 四类机制映射

| 机制 | Coding 领域形态 | 实现方式 |
|------|----------------|----------|
| **动作/工具** | 读写文件、执行 shell、运行构建与测试 | `register_builtin_tools()` 注册 `read_file`/`write_file`/`bash`/`run_test`/`search`/`list_files` |
| **客观反馈信号** | 测试运行结果、lint 报告、类型检查输出 | `run_sensors()` 解析产物 → 结构化判定（pass/fail + 错误详情）→ 回灌上下文 |
| **危险动作** | 删除文件/目录、危险 shell、`git push --force`、发布命令 | `guardrail.allow()` 模式匹配 + 关键词识别 → 拦截 → HITL 终端确认 |
| **记忆** | 项目约定（CLAUDE.md）、历史决策、架构知识 | SQLite 双表 + 预检索（retriever）+ 循环内写（take_note）+ 会话末 consolidate |

### 9.2 重点维度：记忆/上下文

**选择理由：** 记忆是 harness 中最容易被"提示词替代"的维度——很多人会简单地在 system prompt 里写一句"记住之前的决策"。本项目要求记忆必须编码为确定性代码，SQLite 读写 + 结构化检索 + 会话末 consolidate 的完整流水线天然满足"移除 LLM 后仍可单测"的硬标准。

**编码深度：**
- `memory.read(goal)` → 按项目 + 关键词检索 `project_knowledge`，返回结构化文本
- `memory.write(note)` → 写入 `project_knowledge`，实时持久化
- `retriever.retrieve(goal)` → 预检索逻辑，限定最多 5 条
- `consolidate(context)` → 扫描 `action_logs` 中 `take_note` 记录 → 去重 → 写入 `project_knowledge`

### 9.3 机制演示（§A.6）

三个确定性演示用例（全部使用 mock LLM + SQLite `:memory:`）：

1. **护栏拦截演示**：mock LLM 发出 `{type: "call_tool", tool: "bash", args: {command: "rm -rf /"}}` → `guardrail.allow()` 返回 `{allow: false, reason: "危险命令: rm -rf"}` → 断言拦截消息回灌上下文
2. **反馈闭环演示**：mock LLM 发出写文件动作 → `run_sensors` 注入测试失败 → 断言失败消息回灌 → mock LLM 下一轮据此发出修正动作
3. **记忆 consolidate 演示**：模拟多轮 `take_note` 写入 `project_knowledge` → 调用 `consolidate()` → 断言 `project_knowledge` 表包含正确条目 → 新会话 `retriever.retrieve()` 返回该条目

---

## 10. 验收标准

| ID | 功能 | 验收标准 |
|----|------|----------|
| AC-1 | 装配 | `build_agent()` 在规则文件缺失时静默跳过，MCP 连接失败时警告不崩溃，返回完整 Harness 实例 |
| AC-2 | 主循环 | mock LLM 下运行 3 轮：第 1 轮 read_file，第 2 轮 write_file，第 3 轮 done，循环正常退出并返回 answer |
| AC-3 | 护栏 | mock LLM 发出危险命令 → guardrail 拦截 → HITL 提示 → 用户拒绝后上下文包含拒绝消息 |
| AC-4 | 反馈 | mock LLM 修改代码 → `run_sensors` 注入测试失败 → 下一轮上下文包含失败信息 |
| AC-5 | 记忆写入 | `take_note` 动作后 → `project_knowledge` 表写入正确条目 |
| AC-6 | 记忆检索 | 预检索时 → `retriever.retrieve()` 返回项目对应的 knowledge 条目 |
| AC-7 | 记忆 consolidate | 会话结束后 → `action_logs` 中的 `take_note` 记录被提取到 `project_knowledge` |
| AC-8 | 凭据 | `set-key` 隐藏输入 → `view-key` 不回显 → `clear-key` 删除 → 钥匙串/加密文件验证通过 |
| AC-9 | 分发 | `npm install -g` 后 `harness --help` 可用；`docker build` + `docker run` 可启动 |
| AC-10 | 测试 | `npm test` 一键运行，所有 mock-LLM 单元测试通过，不依赖网络与真实 LLM |

---

## 11. 风险与未决问题

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| SQLite 在并发子 agent 场景下的写冲突 | 数据不一致 | 使用 WAL 模式 + 每 session 独立事务；`take_note` 写操作加锁 |
| 上下文 token 压缩策略不当导致信息丢失 | agent 决策质量下降 | 压缩策略优先保留最近 N 轮 + 所有 `take_note` 结果 + 最近的 sensor 报告 |
| 多供应商 LLM 的 API 响应格式差异 | 动作解析失败 | 统一的 `LLMResponse` 接口 + 各供应商适配器；解析失败时重试 1 次 |
| MCP 服务器进程崩溃导致工具不可用 | 工具调用失败 | 超时检测 + 自动重连 + 错误回灌 |
| Docker 容器内无法使用系统钥匙串 | 凭据无法安全存储 | 已规划加密文件回退方案 |
| `subagent` 递归深度不可控 | 无限递归 | `MAX_DEPTH` 硬限制（默认 3 层） |

### 未决问题

- 是否需要支持多个 LLM 供应商在同一会话中切换（如简单任务用小模型，复杂任务用大模型）？→ 当前设计暂不支持，未来版本可考虑
- 是否需要导出 `project_knowledge` 为可读文件格式（如 YAML）供用户手动编辑？→ 取决于反馈，暂不实现
- 是否需要支持远程 MCP 服务器（SSE 协议）？→ 当前仅支持本地进程 MCP

---

## 12. 附录：项目结构

```
coding-agent-harness/
├── src/
│   ├── cli/                  # CLI 入口与子命令
│   │   ├── index.ts          # 主入口，命令路由
│   │   ├── start.ts          # harness start
│   │   ├── config.ts         # harness config
│   │   ├── trace.ts          # harness trace
│   │   └── init.ts           # harness init
│   ├── harness/              # Harness 内核
│   │   ├── index.ts          # build_agent() + Harness 类型
│   │   ├── loop.ts           # agent_loop()
│   │   ├── context.ts        # 上下文工程
│   │   ├── consolidate.ts    # 收尾 consolidate
│   │   └── types.ts          # 核心类型定义
│   ├── tools/                # 工具系统
│   │   ├── registry.ts       # register_builtin_tools()
│   │   ├── builtin/          # 内建工具实现
│   │   │   ├── read-file.ts
│   │   │   ├── write-file.ts
│   │   │   ├── bash.ts
│   │   │   ├── run-test.ts
│   │   │   ├── search.ts
│   │   │   └── list-files.ts
│   │   └── mcp/              # MCP 协议支持
│   │       ├── client.ts     # MCP 客户端
│   │       └── registry.ts   # connect_mcp_servers()
│   ├── memory/               # 记忆模块（重点维度）
│   │   ├── database.ts       # SQLite 初始化 + 迁移
│   │   ├── session.ts        # 会话级记忆读写
│   │   ├── knowledge.ts      # 项目级记忆读写
│   │   ├── retriever.ts      # 预检索
│   │   └── consolidate.ts    # 会话末固化
│   ├── llm/                  # LLM 抽象层
│   │   ├── provider.ts       # LLMProvider 接口
│   │   ├── openai.ts         # OpenAI 兼容格式适配器
│   │   └── mock.ts           # MockLLM（固定响应 + FSM）
│   ├── governance/           # 治理模块
│   │   ├── guardrail.ts      # 危险动作识别
│   │   ├── hitl.ts           # 人工审批交互
│   │   └── hooks.ts          # 生命周期事件系统
│   ├── feedback/             # 反馈模块
│   │   └── sensors.ts        # run_sensors（test/lint/ts）
│   ├── sandbox/              # 沙箱模块
│   │   └── sandbox.ts        # 执行隔离与资源限制
│   ├── observability/        # 可观测性
│   │   └── tracer.ts         # 步骤记录与回放
│   └── config/               # 配置管理
│       ├── loader.ts         # 加载规则文件
│       └── credential.ts     # 凭据存取（keytar / 加密文件）
├── tests/                    # 单元测试
│   ├── harness/              # 主循环测试
│   ├── memory/               # 记忆模块测试
│   ├── governance/           # 护栏测试
│   ├── feedback/             # 反馈测试
│   ├── llm/                  # mock LLM 测试
│   └── demo/                 # 机制演示用例
├── rules/                    # 默认规则文件模板
│   ├── CLAUDE.md.example
│   └── AGENTS.md.example
├── Dockerfile
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── README.md
├── SPEC.md
├── PLAN.md
├── SPEC_PROCESS.md
├── AGENT_LOG.md
└── REFLECTION.md
```