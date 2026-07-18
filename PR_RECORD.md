# PR 工作流记录

> 本项目遵循 Superpowers 工作流：每个独立功能组开一个 worktree，对应一个 PR。
> 以下记录各 worktree 分支与对应 PR 的映射关系。

## 分支与 PR 映射

| 分支 | PR | 对应 Task | 内容 | 
|------|-----|-----------|------|
| `pr-group-1-foundation` | [#3](https://github.com/241880199/Coding-Agent-Harness/pull/3) | Task 1-4 | 脚手架、核心类型、MockLLM、SQLite 数据库 |
| `pr-group-2-memory-tools` | [#4](https://github.com/241880199/Coding-Agent-Harness/pull/4) | Task 5-6 | 记忆模块、工具注册与内建工具 |
| `pr-group-3-core-loop` | [#5](https://github.com/241880199/Coding-Agent-Harness/pull/5) | Task 7-13 | 护栏、反馈、追踪器、沙箱、上下文工程、主循环、buildAgent |
| `pr-group-4-delivery` | [#6](https://github.com/241880199/Coding-Agent-Harness/pull/6) | Task 14-19 | 凭据管理、CLI、Demo 测试、Docker、README、CI |

## Commit 标注

部分 commit message 中标注了执行 subagent：
- `(by opencode)` — 由 OpenCode subagent 完成
- `(by opencode, fix-ci)` — 由 OpenCode subagent 完成 CI 修复

其余 commit 由主 agent 在 TDD 循环中完成（红-绿-重构）。