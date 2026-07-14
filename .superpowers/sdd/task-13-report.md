# Task 13 Report: Agent Loop (Core)

## Status: ✅ Complete

### Deliverables
- `src/harness/loop.ts` — `agentLoop` function with full loop implementation
- `tests/harness/loop.test.ts` — 6 tests covering all scenarios

### Implementation Details
The `agentLoop` function implements the core agent loop:
1. **Build context** — system prompt + rules + memory + retriever + goal
2. **Call LLM** — via `harness.config.llmProvider`
3. **Handle actions**: `done`, `take_note`, `call_tool`, `use_skill`, `spawn_subagent`, `unknown`
4. **Guardrail** — blocks dangerous actions via `harness.guardrail.allow()`
5. **Tool execution** — via sandbox, supports both local tools and MCP tools
6. **Hooks** — PreToolUse, PostToolUse, SessionEnd
7. **Memory consolidation** — at end of session
8. **Tracing** — each step recorded via `harness.tracer.record()`
9. **Max steps/depth** — stops when limit reached
10. **Context compaction** — when token limit exceeded

### Test Summary
- **6/6 tests passing**
  - Done-only flow: ✓
  - Tool execution (FSM: echo → done): ✓
  - Max steps limit: ✓
  - Guardrail interception: ✓
  - take_note action: ✓
  - Unknown action type handling: ✓

### Commits
- `feat: implement agent loop with guardrail, tools, skills, subagent, memory`