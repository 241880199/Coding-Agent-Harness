# PR 工作流记录

> 本项目遵循 Superpowers 工作流：每个独立功能组开一个 worktree，对应一个 PR。
> 以下记录各 worktree 分支与对应 PR 的映射关系。

## 分支与 PR 映射

| 分支 | 对应 Task | 内容 | 最后 Commit |
|------|-----------|------|-------------|
| `group-1-foundation` | Task 1-4 | 脚手架、核心类型、MockLLM、SQLite 数据库 | `ca1096b` |
| `group-2-memory-tools` | Task 5-6 | 记忆模块（session + knowledge + retriever）、工具注册与内建工具 | `cbeeee2` |
| `group-3-core-loop` | Task 7-13 | 护栏、反馈、追踪器、沙箱、上下文工程、主循环、buildAgent | `b914b20` |
| `group-4-delivery` | Task 14-19 | 凭据管理、CLI、Demo 测试、Docker、README、CI | `f869c2a` |
| `fix-ci-config` | 修复 | CI 配置修复、Node 22 兼容性、类型断言修复 | `7ab6b40` |

## PR 描述

### PR #1: group-1-foundation → main

**标题**: feat: Foundation - scaffold, core types, MockLLM, SQLite database

**内容**:
```
## 完成内容（Task 1-4）

### Task 1: 项目脚手架
- 创建 package.json、tsconfig.json、vitest.config.ts、.gitignore
- 创建规则文件模板（CLAUDE.md.example、AGENTS.md.example）

### Task 2: 核心类型定义
- 定义 Action union type（call_tool / use_skill / spawn_subagent / take_note / done）
- 定义 ActionResult、LLMResponse、Message、HarnessConfig 等核心类型
- 13 个测试全部通过

### Task 3: MockLLM 实现
- 实现 MockLLM 类（fixed / FSM / context-aware 三种模式）
- 5 个测试全部通过

### Task 4: SQLite 数据库层
- 使用 node:sqlite（Node.js 22 内置）创建 5 张表
- WAL 模式、:memory: 测试支持
- 4 个测试全部通过

### 测试
- 24 个测试全部通过，mock LLM + :memory: SQLite，无网络依赖
```

### PR #2: group-2-memory-tools → main

**标题**: feat: Memory module and tool registry

**内容**:
```
## 完成内容（Task 5-6）

### Task 5: 记忆模块
- SessionManager：会话 CRUD
- KnowledgeManager：项目知识 CRUD + 自动去重
- Retriever：关键词分词检索，最多 5 条结果
- 13 个测试全部通过

### Task 6: 工具注册与内建工具
- ToolRegistry 类：注册、查询、调用
- 3 个内建工具：read_file、write_file、bash
- 每个工具含 JSON Schema 参数定义
- 8 个测试全部通过

### 测试
- 21 个测试全部通过，mock LLM + :memory: SQLite
```

### PR #3: group-3-core-loop → main

**标题**: feat: Core loop - guardrail, feedback, tracer, sandbox, context, agent loop

**内容**:
```
## 完成内容（Task 7-13）

### Task 7: 护栏 + HITL
- Guardrail：8 个默认危险模式，可扩展，支持 override
- HITL：可注入确认函数
- 10 个测试全部通过

### Task 8: 反馈传感器
- SensorRunner：聚合 test + lint 检查结果
- 支持 fail-open（传感器崩溃不影响主循环）
- 4 个测试全部通过

### Task 9: 追踪器
- Tracer：每步记录 (decision, observation) 对
- 支持 JSON 导出
- 4 个测试全部通过

### Task 10: OpenAI 提供者
- OpenAIProvider：OpenAI 兼容 API 调用
- 3 个测试全部通过

### Task 11: 沙箱
- 30s 超时保护
- 3 个测试全部通过

### Task 12: 上下文工程
- buildContext：system prompt + rules + 记忆 + 检索 + goal
- estimateTokens + compact：token 超限自动压缩
- 4 个测试全部通过

### Task 13: Agent 主循环 + buildAgent
- agentLoop：构建上下文 → LLM → 路由 → 护栏 → 执行 → 回灌 → 循环
- MAX_STEPS=50、MAX_DEPTH=3
- 连续错误检测、循环检测、token 压缩
- buildAgent：装配所有组件为 Harness 实例
- 9 个测试全部通过

### 测试
- 37 个测试全部通过，mock LLM + :memory: SQLite
```

### PR #4: group-4-delivery → main

**标题**: feat: Delivery - credentials, CLI, demo tests, Docker, README, CI

**内容**:
```
## 完成内容（Task 14-19）

### Task 14: 凭据管理
- CredentialManager：keytar → 文件 → 环境变量三层回退
- set-key 隐藏输入、view-key 不回显、clear-key 删除
- 13 个测试全部通过

### Task 15-16: CLI 入口 + Demo 测试
- 6 个命令：start、config、trace、init、REPL
- 交互 REPL 模式（/new-session、/help、/exit）
- 3 个机制演示测试（护栏拦截、反馈闭环、记忆 consolidatation）
- 13 个测试全部通过

### Task 17: Docker 分发
- 多阶段构建（node:22-alpine）
- .dockerignore

### Task 18: README + CI
- README：安装、运行、分发、安全说明、已知限制
- GitHub Actions CI：typecheck + test + build（ubuntu + windows）

### 测试
- 26 个测试全部通过，mock LLM + :memory: SQLite
```

## Commit 标注

部分 commit message 中标注了执行 subagent：
- `(by opencode)` — 由 OpenCode subagent 完成
- `(by opencode, fix-ci)` — 由 OpenCode subagent 完成 CI 修复

其余 commit 由主 agent 在 TDD 循环中完成（红-绿-重构）。