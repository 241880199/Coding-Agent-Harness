# AGENT_LOG

> 按时间顺序记录开发过程中的关键节点。每条包含：时间戳与 task 编号、触发的 Superpowers 技能、关键 prompt/context 配置、subagent 输出的关键片段或 commit hash、人工干预、学到的教训。

---

## 2026-07-13

### 阶段 0：规约与计划生成

- **触发技能**：`brainstorming` → `writing-plans`
- **产出**：`SPEC.md`（555 行）、`PLAN.md`（19 个 task）
- **关键决策**：定位为"白箱实现"而非黑箱封装；记忆/上下文作为重点维度；SQLite + 关键词检索而非向量库
- **人工干预**：在 AI 追问下确认了技术栈选型、记忆粒度（会话级 + 项目级）、交互模式（单次命令 + REPL）
- **Commit**：`3315919` docs: add SPEC.md and PLAN.md from brainstorming + writing-plans (by opencode)

### Task 1：项目脚手架

- **触发技能**：`subagent-driven-development`
- **目标**：创建 package.json、tsconfig.json、vitest.config.ts、.gitignore、规则文件模板
- **技术选型**：TypeScript 5.5+、Vitest 2.x、Node.js 22+、ES modules
- **Commit**：`302d30d` chore: scaffold project structure
- **人工干预**：后续发现 `better-sqlite3` 在 Windows + Node 22 环境不可用，改为 `node:sqlite` 内置模块

### Task 2：核心类型定义

- **触发技能**：`test-driven-development`
- **目标**：定义 Action、ActionResult、LLMResponse、Message、HarnessConfig 等核心类型
- **实现要点**：Action 为 union type（call_tool / use_skill / spawn_subagent / take_note / done）；Message 兼容 OpenAI chat format
- **Commit**：`62563bf` feat: add core types for action, result, provider, guardrail, memory, trace
- **测试**：`tests/harness/types.test.ts`（13 tests）

### Task 3：MockLLM 实现

- **触发技能**：`test-driven-development`
- **目标**：实现可注入 mock 的 LLM 抽象层，支持 fixed / FSM / context-aware 三种模式
- **实现要点**：`MockLLM` 类实现 `LLMProvider` 接口；FSM 模式按顺序返回预设响应；context-aware 模式根据上下文内容匹配规则
- **Commit**：`e8ba581` feat: add MockLLM with fixed, FSM, and context-aware modes
- **测试**：`tests/llm/mock.test.ts`（5 tests）

### Task 4：SQLite 数据库层

- **触发技能**：`test-driven-development`
- **目标**：创建 SQLite 数据库初始化与迁移，使用 `node:sqlite` 内置模块
- **实现要点**：5 张表（sessions / action_logs / project_knowledge / builtin_tools / mcp_servers）；WAL 模式；`:memory:` 测试模式
- **Commit**：`ca1096b` feat: add SQLite database layer with memory migrations
- **测试**：`tests/memory/database.test.ts`（4 tests）
- **人工干预**：PLAN 中设计使用 `better-sqlite3`，实测发现 Windows + Node 22 编译失败，改为 `node:sqlite` 的 `DatabaseSync`；需使用 `as unknown as` 类型断言绕过 TS 类型不兼容问题

### Task 5：记忆模块（session + knowledge + retriever）

- **触发技能**：`test-driven-development`
- **目标**：实现会话级记忆（action_logs 读写）、项目级记忆（project_knowledge CRUD + 去重）、关键词检索
- **实现要点**：SessionManager 管理会话 CRUD；KnowledgeManager 的 writeNote 自动去重（同一 project + content 不重复）；Retriever 将 goal 分词后逐词 LIKE 匹配，最多返回 5 条
- **Commit**：`d8daf3f` feat: add memory module with session, knowledge, and retriever
- **补充修复**：`b4bf743` Fix retriever fallback logic and import types
- **测试**：`tests/memory/session.test.ts`（6 tests）、`tests/memory/knowledge.test.ts`（4 tests）、`tests/memory/retriever.test.ts`（3 tests）

---

## 2026-07-14

### Task 6：工具注册与内建工具

- **触发技能**：`test-driven-development`
- **目标**：实现 ToolRegistry 类 + 3 个内建工具（read_file / write_file / bash）
- **实现要点**：每个工具含 JSON Schema 参数定义；统一错误处理格式
- **Commit**：`cbeeee2` feat: add tool registry and built-in tools (read-file, write-file, bash)
- **测试**：`tests/tools/registry.test.ts`（4 tests）、`tests/tools/builtin/read-file.test.ts`（2 tests）、`tests/tools/builtin/write-file.test.ts`（2 tests）、`tests/tools/builtin/bash.test.ts`（2 tests）

### Task 7：护栏 + HITL

- **触发技能**：`test-driven-development`
- **目标**：实现 Guardrail 危险命令拦截 + HITL 人工确认
- **实现要点**：8 个默认危险模式（`rm -rf /`、`DROP TABLE`、`git push --force`、`format C:` 等）；可扩展规则；override 支持；HITL 为可注入的确认函数
- **Commit**：`a82dfe2` feat: add guardrail with dangerous command detection and HITL
- **测试**：`tests/governance/guardrail.test.ts`（7 tests）、`tests/governance/hitl.test.ts`（3 tests）

### Task 8：反馈传感器

- **触发技能**：`test-driven-development`
- **目标**：实现 SensorRunner，聚合 test + lint 检查结果
- **实现要点**：传感器函数可注入；支持 fail-open（传感器崩溃不影响主循环）；结构化 SensorReport
- **Commit**：`4436ca5` feat: add feedback sensor runner with test/lint aggregation
- **测试**：`tests/feedback/sensors.test.ts`（4 tests）

### Task 9：追踪器

- **触发技能**：`test-driven-development`
- **目标**：实现 Tracer 步骤记录与 JSON 导出
- **实现要点**：每步记录 (decision, observation) 对；支持导出 JSON 格式供事后回放
- **Commit**：`486b269` feat: add tracer for step-by-step observability
- **测试**：`tests/observability/tracer.test.ts`（4 tests）

### Task 10：上下文工程

- **触发技能**：`test-driven-development`
- **目标**：实现 buildContext + estimateTokens + compact
- **实现要点**：system prompt + rules + 记忆 + 检索 + goal 组装；token 超限时自动压缩（保留最近 N 轮 + 关键记忆）
- **Commit**：`7cfcef0` feat: add context engineering with build and compact
- **测试**：`tests/harness/context.test.ts`（4 tests）

### Task 11：沙箱

- **触发技能**：`test-driven-development`
- **目标**：实现工具执行的超时保护与隔离
- **实现要点**：默认 30s 超时；超时后自动终止
- **Commit**：`9ee5cb8` feat: add sandbox with timeout protection
- **测试**：`tests/sandbox/sandbox.test.ts`（3 tests）

### Task 12：Agent 主循环

- **触发技能**：`test-driven-development`
- **目标**：实现 agentLoop()：构建上下文 → 调用 LLM → 解析动作 → 护栏拦截 → 分发执行 → 回灌结果 → 停机判断
- **实现要点**：MAX_STEPS=50、MAX_DEPTH=3；连续错误检测（3 次 = 退出）；循环检测（同工具+同参数 3 次 = 退出）；token 压缩；子 agent 递归
- **Commit**：`5234c46` feat: implement agent loop with guardrail, tools, skills, subagent, memory
- **测试**：`tests/harness/loop.test.ts`（6 tests）

### Task 13：buildAgent 装配

- **触发技能**：`test-driven-development`
- **目标**：实现 buildAgent() 将所有组件装配为 Harness 实例
- **实现要点**：规则文件缺失时静默跳过；MCP 连接失败时警告不崩溃
- **Commit**：`b914b20` feat: add buildAgent harness assembly
- **测试**：`tests/harness/index.test.ts`（3 tests）

### Task 14：README + CI 配置

- **触发技能**：`subagent-driven-development`
- **目标**：创建 README.md、AGENT_LOG.md 占位、GitHub Actions CI 配置
- **Commit**：`6d6e4f6` docs: add README, AGENT_LOG, CI config
- **人工干预**：README 包含项目简介、安装、运行、分发、目录结构、安全边界说明和已知限制

### Task 15：Docker 分发

- **触发技能**：`subagent-driven-development`
- **目标**：创建 Dockerfile（多阶段构建）+ .dockerignore
- **实现要点**：node:22-alpine 基础镜像；builder 阶段编译 TS；runner 阶段仅复制 dist + node_modules
- **Commit**：`4148b78` chore: add Dockerfile for container distribution

### Task 16：凭据管理

- **触发技能**：`test-driven-development`
- **目标**：实现 CredentialManager（keytar → 文件 → 环境变量三层回退）
- **实现要点**：set-key 隐藏输入；view-key 仅显示"已配置/未配置"；clear-key 删除；文件存储使用 0o600 权限
- **Commit**：`c28939f` feat: add credential management with keytar
- **测试**：`tests/config/credential.test.ts`（13 tests）

---

## 2026-07-16

### Task 17：CI 修复 + 环境适配

- **触发技能**：`subagent-driven-development`
- **目标**：修复 CI 配置兼容 Node.js 22、修复 Dockerfile、添加 engines 字段
- **Commit**：`4571b81` fix: update CI to Node.js 22, fix Dockerfile, add engines field (by opencode, fix-ci)
- **补充修复**：`2861cd1` fix: use as unknown as for node:sqlite type assertions (by opencode, fix-ci)
- **人工干预**：`node:sqlite` 的 `DatabaseSync` 类型推断与 Vitest 存在兼容性问题，需强制类型断言

### Task 18：CLI 入口 + Demo 测试

- **触发技能**：`subagent-driven-development`
- **目标**：实现 CLI 入口（harness start / config / trace / init / REPL + 3 个机制演示测试）
- **实现要点**：REPL 模式支持 `/new-session`、`/help`、`/exit`；首次运行引导配置 API Key
- **Commit**：`c33c6e9` feat: add CLI entry point and demo tests (by opencode)
- **测试**：`tests/demo/guardrail-demo.test.ts`（3 tests）、`tests/demo/feedback-demo.test.ts`（1 test）、`tests/demo/memory-demo.test.ts`（3 tests）、`tests/cli/index.test.ts`（10 tests）

---

## 2026-07-17

### Bug 修复阶段

以下问题在集成测试中发现并修复，均由 subagent 执行：

| Commit | 问题 | 修复 |
|--------|------|------|
| `84ef9df` | LLM 输出结构与 action 分发不匹配 | 移除 call_tool 包装层，直接使用工具函数 |
| `ddf046e` | 构建缓存导致旧代码残留、循环检测误判、token 压缩 bug | 清理构建缓存、修正循环检测逻辑、修复 compaction |
| `8ee893b` | Message 往返时 tool_calls 和 tool_call_id 丢失 | 修正 Message 类型的序列化/反序列化 |
| `31f7ad7` | 连续错误中断 + 模型配置缺失 + 日志不够详细 | 添加连续错误检测、模型配置、verbose 模式 |
| `7c36ad5` | 连续错误 break 消息被 max-steps 消息覆盖 | 修正错误优先级 |
| `ebe4dbd` | REPL banner 不显示模型/URL | 在 banner 中添加模型和 URL 信息 |
| `f869c2a` | 缺少 CI 配置 | 添加 GitHub Actions workflow（typecheck + test + build） |
| `7ab6b40` | 默认分支名称为 master | 重命名为 main |

### 关键教训

1. **环境验证应先于技术选型**：PLAN 假设 `better-sqlite3` 可用，实际 Windows + Node 22 不支持原生编译，导致需要改用 `node:sqlite` 并处理类型兼容问题。
2. **消息格式是 agent 交互的核心**：SPEC 未讨论消息格式（string[] vs Message[]），导致实现时 role 分配和 tool_call 回灌出现偏差。
3. **失败模式应在设计阶段纳入**：设计时未考虑 LLM 返回格式异常、API key 无效、工具超时等情况，这些在实现中全部遇到但无设计预案。
4. **PLAN 过于具体的代码示例反而增加成本**：嵌入的完整代码因环境差异无法复用，需推翻重写。
5. **连续错误检测和循环检测是 agent 稳定性的关键**：没有这些机制，agent 会在 LLM 输出异常时无限循环。