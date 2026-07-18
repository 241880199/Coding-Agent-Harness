# REFLECTION.md — Coding Agent Harness 反思报告

> AI4SE 期末项目 · 个人反思
> 学生：241880199 · 日期：2026-07-18

---

## 1. Superpowers 技能评估

### 1.1 发挥最大作用的技能

**brainstorming** 是本项目价值最大的技能。它不是简单地让 AI 问"你想做什么"，而是从定位、规模、技术选型、架构等角度逐层追问，迫使我在动手前想清楚每个关键决策。例如，当 AI 追问"市面上已有 LangChain、AutoGen，你为什么还要自己做一个？"时，我被迫明确了项目的核心命题——"Agent = LLM + Harness，LLM 只负责推理，Harness 负责所有工程层"。这个定位直接决定了后续所有设计决策：白箱实现而非黑箱封装、确定性代码而非提示词机制、mock LLM 可单测的硬标准。

**test-driven-development** 是另一个关键技能。在 AI 协作场景下，TDD 的"红-绿-重构"循环起到了"锚点"作用——它强制我在让 AI 写代码之前，先想清楚"这段代码应该做什么"。mock LLM 下的 112 个确定性测试，让我对 harness 每个机制的独立性有了信心。特别值得一提的是，测试在项目后期成为了安全网：当 call_tool bug 导致 agent 循环 200 步找不到工具时，是 `loop.test.ts` 中的循环检测测试帮我快速定位了问题。

**subagent-driven-development** 在并行化方面发挥了作用。将 19 个 task 按依赖关系分组为 4 个 worktree（foundation / memory-tools / core-loop / delivery），每个 worktree 派发 subagent 独立推进，确实节省了时间。但 subagent 的输出质量高度依赖 SPEC 和 PLAN 的清晰度——规约不清的地方，subagent 必然跑偏。

### 1.2 哪些"形式大于实质"

**writing-plans** 产出的 PLAN.md 在实际实现中价值有限。PLAN 中嵌入了完整代码示例，但因为环境差异（`better-sqlite3` 不可用）和设计变更（消息格式从 `string[]` 变为 `Message[]`），这些示例代码几乎全部无法复用，反而增加了推翻重写的成本。如果重来，我会要求 PLAN 保持接口契约级别，不嵌入具体实现代码。

**using-git-worktrees** 在单人项目中增加了不必要的复杂度。worktree 的隔离优势在多人协作中很明显，但单人项目里，4 个 worktree 之间的上下文切换和 merge 冲突解决反而拖慢了进度。实际开发中，我更多是直接在 main 分支上顺序推进，worktree 更多是形式上的存在。

---

## 2. TDD 在 AI 协作下的体验

### 2.1 TDD 是阻碍还是放大器？

总体而言，TDD 在 AI 协作下是**放大器**——它放大了好的设计决策，也放大了规约中的模糊之处。

**正向放大**：当 SPEC 清晰时，AI 能写出精准的失败测试，然后写出刚好通过的最小实现。例如 `guardrail.test.ts` 中"拦截 rm -rf /"的测试，AI 一次就写出了正确的 Guardrail 实现。TDD 的红色阶段充当了"需求验证器"——如果 AI 写的测试不符合预期，说明 SPEC 有问题。

**负向放大**：当 SPEC 模糊时，AI 写的测试往往测试了错误的东西。例如，消息格式在 SPEC 中未明确讨论，导致 AI 最初写的 `loop.test.ts` 假设 `string[]` 上下文，但实际实现需要 `Message[]` 格式。这种不匹配在 TDD 循环中被放大——测试全绿，但实际行为错误。

**关键洞察**：TDD 在 AI 协作下最大的价值不是"先写测试"，而是**测试作为 SPEC 的二次验证**。如果 AI 无法写出正确的测试，说明 SPEC 有问题。这比人工 review SPEC 更早发现缺陷。

---

## 3. Subagent 驱动开发体验

### 3.1 自主运行时长与偏离

subagent 在 task 颗粒度适中时能自主运行 5-10 分钟而不偏离主题。最优颗粒度是"一个文件 + 测试 + 实现"的独立单元，例如 Task 7（Guardrail + HITL）——subagent 可以独立完成 `guardrail.ts`、`hitl.ts` 及其测试文件，不需要外部上下文。

**偏离案例**：Task 13（Agent 主循环）颗粒度过大，包含了 guardrail、tools、skills、subagent、memory 五个子系统的集成。subagent 在实现时多次偏离设计——它最初将 guardrail 放在工具执行之后（而非之前），将传感器运行放在循环外（而非循环内）。这些偏离暴露了 SPEC 中 agent_loop 数据流图不够精确的问题。

**教训**：subagent 的 task 应该"单一文件 + 单一职责"。交叉依赖的 task 不应交给 subagent 独立完成，而应由人工主导集成。

---

## 4. SPEC / PLAN 质量对实现的影响

### 4.1 具体案例：规约不清导致 subagent 偏离

**案例 1：`better-sqlite3` → `node:sqlite`**

SPEC 和 PLAN 都假设使用 `better-sqlite3`，但实际在 Windows + Node 22 环境下，`better-sqlite3` 需要原生编译且编译失败。这个问题如果在设计阶段做一次环境验证就能发现——但 brainstorming 技能没有"环境验证"追问环节。

影响：所有数据库相关代码（database.ts、session.ts、knowledge.ts、retriever.ts）都需要重写，从 `better-sqlite3` 的异步 API 改为 `node:sqlite` 的同步 `DatabaseSync` API。更麻烦的是，`node:sqlite` 的类型定义与 Vitest 存在兼容性问题，需要大量 `as unknown as` 类型断言。

**案例 2：消息格式未定义**

SPEC 没有讨论 LLM 交互的消息格式——context 是 `string[]` 还是 `Message[]`？role 如何分配？这导致 subagent 实现 agent loop 时，将所有消息以 `role: 'user'` 发送，模型无法区分 system/user/assistant/tool 角色，行为完全失控。

影响：需要重构整个 context 工程模块（`context.ts`），将 `string[]` 改为 `Message[]`，并正确分配 role。

**核心教训**：这两个案例的共同点是——SPEC 在"接口"层面不够精确。数据库选型是接口（同步 vs 异步 API），消息格式也是接口（string vs structured）。brainstorming 阶段应该追问"每个模块的输入输出是什么类型"，而不仅仅是"这个模块做什么"。

---

## 5. Prompt / Context 工程策略

### 5.1 最有效的策略

**策略 1：给 subagent 提供"反例"**

我发现单纯告诉 subagent"做什么"效果一般，但同时告诉它"不要做什么"能显著减少偏离。例如在 Task 13 的 prompt 中，我明确写了"guardrail 必须在工具执行前运行，不是之后"和"传感器必须在循环内运行，每次工具调用后触发，不是循环外"。这种"正向 + 反向"的 prompt 模式，让 subagent 的首次正确率从约 60% 提升到约 85%。

**策略 2：SPEC 引用而非全文载入**

subagent 的 context 窗口有限，直接把 555 行 SPEC 全文载入会挤占实现空间。我改为在 prompt 中只引用 SPEC 中与当前 task 相关的节号（如"参见 SPEC §3.5 治理模块"），让 subagent 按需查阅。这显著减少了 context 浪费。

**策略 3：在 commit message 中标注 subagent**

每个 subagent 完成的 commit 在 message 中标注 `(by opencode)` 或 `(by opencode, fix-ci)`。这不仅满足课程要求，也让我在后续 review 时能快速区分"AI 写的代码"和"人工修改的代码"，提高 review 效率。

---

## 6. 凭据与分发的工程思考

### 6.1 这两条要求迫使你想清楚了什么

**凭据安全**迫使我想清楚了"开发者体验 vs 安全性"的权衡。keytar 是最安全的方案，但在 Windows 下需要原生编译工具，在 Docker 容器内完全不可用。这迫使我在 CredentialManager 中实现了三层回退：keytar → `~/.harness/config.json`（明文文件，`0o600` 权限）→ 环境变量。每一层都有明确的适用场景和风险说明，用户在 README 和 SPEC 中都能找到对应的安全警告。

更重要的是，`view-key` 命令只显示"已配置"或"未配置"，绝不回显明文——这个设计看似简单，但实现时需要确保 CredentialManager 内部没有将 key 传递给任何日志或输出函数。这让我意识到：**凭据安全的难点不在存储，而在"不泄露"**——任何一个 `console.log` 都可能让前面的安全措施白费。

**分发**迫使我想清楚了"从零开始的用户体验"。npm 分发需要 `engines` 字段声明 Node.js 22+ 要求；Docker 分发需要处理容器内凭据存储（因为 keytar 不可用）。`install.cmd` 的存在是因为 PowerShell 执行策略限制 `npm link`——这个坑如果不是亲自在 Windows 上测试，永远不会发现。

---

## 7. 如果重做会改变什么

1. **技术选型前先做环境验证**：在确定 `better-sqlite3` 之前，先在 Windows + Node 22 上跑一次 `npm install`。节省大约 3-4 小时的重写时间。

2. **SPEC 中明确消息格式**：将 LLM 交互的 Message 格式作为 SPEC 的独立一节，包含 role 分配规则、tool_call 回灌格式、system prompt 结构。这能避免 agent loop 实现中最严重的偏离。

3. **PLAN 保持抽象，不嵌入代码**：PLAN 只保留接口契约（函数签名、输入输出类型），代码示例移到附录。实际实现时，subagent 根据接口契约自行编写实现，而非机械复制 PLAN 中的示例代码。

4. **主循环先做集成测试**：agent loop 是集成度最高的模块，应该在实现 guardrail、tools、memory 等子系统后，先做一个端到端的 mock LLM 集成测试，再逐个修补子系统的实现细节。我实际的做法是反过来（先实现子系统再集成），导致集成时发现多个子系统间的不匹配。

5. **worktree 只在真正需要并行时使用**：单人项目中，顺序开发 + 频繁 commit 比 worktree 并行更高效。worktree 的价值在于隔离破坏性实验，而非日常开发。

---

## 8. 对 Superpowers 方法论的批判

### 8.1 Superpowers 假设了什么？这些假设在你的项目里成立吗？

**假设 1：subagent 可以独立完成一个 task**

成立条件：task 颗粒度足够小、SPEC 足够精确、无跨模块依赖。在本项目中，Task 2-9 满足这些条件，subagent 表现良好；Task 13（agent loop）不满足（跨 5 个子系统），subagent 多次偏离。

**假设 2：TDD 在 AI 协作下仍然有效**

成立，但有前提：SPEC 必须定义了精确的接口。如果 SPEC 只说"agent loop 处理各种动作"，AI 写的测试可能覆盖了错误的行为。TDD 的有效性取决于 SPEC 的精确性，而非 TDD 本身。

**假设 3：brainstorming 能产出足够清晰的 SPEC**

部分成立。brainstorming 在"做什么"层面产出很好（架构、组件、数据流），但在"怎么做"的接口层面不够深入（消息格式、数据库 API 风格、类型系统）。建议 brainstorming 增加一个"接口追问"环节：每个模块的输入输出类型是什么？同步还是异步？错误如何传播？

**假设 4：Superpowers 的方法论适用于单人项目**

Superpowers 的设计明显偏向多人团队场景——worktree 隔离、PR 工作流、两阶段 review、subagent 并行。在单人项目中，这些流程的 overhead 往往超过其价值。例如，worktree 隔离在单人项目中变成了"在不同目录间切换"的体力活，而非真正的并行开发。但另一方面，TDD 和 brainstorming 在单人项目中同样有效——它们不依赖团队规模，而是依赖工程纪律。

---

## 9. 核心收获

### 9.1 "当 LLM 能完成大部分编码工作时，工程师的真正价值在哪里"

在完成这个项目后，我对这个问题的答案是：**工程师的价值在于定义"正确"的含义，并构建验证"正确"的系统**。

LLM 能写出看起来合理的代码，但它不知道什么是"正确"——它不知道 `better-sqlite3` 在 Windows 上编译失败，不知道 guardrail 应该在工具执行前而非之后运行，不知道 API key 绝不因该出现在日志中。这些知识不是编码知识，而是**工程判断**——对约束、边界、失败模式的系统性理解。

本项目中的 harness 内核是一个很好的隐喻：LLM 是"决策引擎"，但真正让系统可靠运转的是围绕它的工程层——护栏拦截危险动作、传感器提供客观反馈、记忆系统跨会话保持上下文、凭据管理器确保安全。这些层不是 LLM 能"想"出来的，而是需要工程师定义"什么情况下系统是正确的"、然后用确定性代码实现这个定义。

这个项目让我明白：AI 协作时代，工程师的核心能力不是"写代码快"，而是**"定义清楚问题"**和**"设计验证机制"**。SPEC 的质量决定了 AI 产出的质量，测试的覆盖度决定了重构的信心，凭据和分发的设计决定了项目是否真正可用。这些都不是 AI 能替你做决策的——它们需要你对"一个可靠的系统到底需要哪些工程"有第一手的理解。

---

## 10. 对课程的反馈

1. **Superpowers 工作流在单人项目中 overhead 较大**：worktree、PR、两阶段 review 等流程更适合多人协作。建议课程对单人项目给出简化版工作流选项。

2. **冷启动验证是很好的设计，但时间紧张**：在实际时间安排下，很难在 SPEC 完成后、实现开始前插入一个完整的冷启动验证环节。建议将冷启动验证作为"实现中发现的问题"的追溯分析，而非前置要求。

3. **凭据与分发要求很有价值**：这两个要求迫使我从"玩具项目"思维转向"可交付产品"思维，是课程中最有工程教育意义的环节。

4. **建议增加"失败案例分享"环节**：让同学们分享自己在 AI 协作中遇到的坑（如 better-sqlite3 编译失败），比单纯讲方法论更有教育价值。

---

> **AI 使用声明**：本报告由学生本人撰写，AI 辅助用于结构建议和语法润色。核心观点、经验总结、批判性分析均来自个人项目实践。