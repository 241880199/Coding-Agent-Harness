# push-branches.ps1
# 推送所有 worktree 分支并创建 GitHub PR
# 用法: .\push-branches.ps1 -Token "ghp_xxx"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$Repo = "241880199/Coding-Agent-Harness"
$Base = "main"

$Branches = @(
    @{Name="group-1-foundation"; Title="feat: Foundation - scaffold, core types, MockLLM, SQLite database"; Body=@"
## 完成内容（Task 1-4）

### Task 1: 项目脚手架
- 创建 package.json、tsconfig.json、vitest.config.ts、.gitignore
- 创建规则文件模板

### Task 2: 核心类型定义
- Action union type、ActionResult、LLMResponse、Message、HarnessConfig
- 13 tests pass

### Task 3: MockLLM 实现
- fixed / FSM / context-aware 三种模式
- 5 tests pass

### Task 4: SQLite 数据库层
- node:sqlite 内置模块，5 张表，WAL 模式
- 4 tests pass
"@},
    @{Name="group-2-memory-tools"; Title="feat: Memory module and tool registry"; Body=@"
## 完成内容（Task 5-6）

### Task 5: 记忆模块
- SessionManager、KnowledgeManager（自动去重）、Retriever（关键词检索）
- 13 tests pass

### Task 6: 工具注册与内建工具
- ToolRegistry + read_file、write_file、bash
- 8 tests pass
"@},
    @{Name="group-3-core-loop"; Title="feat: Core loop - guardrail, feedback, tracer, sandbox, context, agent loop"; Body=@"
## 完成内容（Task 7-13）

### Task 7: 护栏 + HITL
- Guardrail（8 个危险模式）+ HITL 确认
- 10 tests pass

### Task 8-9: 反馈传感器 + 追踪器
- SensorRunner（test/lint 聚合）+ Tracer（步骤记录 + JSON 导出）
- 8 tests pass

### Task 10-12: OpenAI 提供者 + 沙箱 + 上下文工程
- OpenAIProvider、30s 超时沙箱、buildContext + compact
- 10 tests pass

### Task 13: Agent 主循环 + buildAgent
- agentLoop（MAX_STEPS=50, MAX_DEPTH=3）+ buildAgent 装配
- 9 tests pass
"@},
    @{Name="group-4-delivery"; Title="feat: Delivery - credentials, CLI, demo tests, Docker, README, CI"; Body=@"
## 完成内容（Task 14-19）

### Task 14: 凭据管理
- keytar → 文件 → 环境变量三层回退
- 13 tests pass

### Task 15-16: CLI + Demo 测试
- 6 个命令 + REPL 模式
- 3 个机制演示（护栏、反馈、记忆）
- 13 tests pass

### Task 17-19: Docker + README + CI
- 多阶段 Docker 构建
- GitHub Actions CI（typecheck + test + build）
"@}
)

$Headers = @{
    "Authorization" = "Bearer $Token"
    "Accept" = "application/vnd.github+json"
}

foreach ($Branch in $Branches) {
    $Name = $Branch.Name
    Write-Host "Pushing $Name ..."
    git push origin "$Name" --force
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to push $Name, skipping PR creation" -ForegroundColor Red
        continue
    }

    Write-Host "Creating PR for $Name ..."
    $Body = @{
        title = $Branch.Title
        head = $Name
        base = $Base
        body = $Branch.Body
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/pulls" `
        -Method Post -Headers $Headers -Body $Body -ContentType "application/json"
    
    Write-Host "PR created: $($Response.html_url)" -ForegroundColor Green
}

Write-Host "`nDone!" -ForegroundColor Green