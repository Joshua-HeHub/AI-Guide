---
name: skill-handoff
description: "为新的 GitHub Copilot chat 生成面向下一会话目标的 handoff / continuation context。仅在用户明确要把当前工作交接到新 chat 继续时触发；不要用于普通总结、状态同步、代码评审、changelog 或文章摘要。基于只读证据输出可直接粘贴到新 chat 的中文优先接续上下文。"
argument-hint: 请说明要交接到新建会话的目标、要求或关注点；可留空
---

# Handoff Skill

为新的 GitHub Copilot chat 生成自包含、基于证据、上下文损失尽可能小的交接摘要。  
固定骨架标题和续接说明默认中英双语；正文默认中文优先。

## 触发条件

触发：用户明确要 handoff、交接总结、continuation summary、"新开 chat 接着做"。  
**不触发**：普通总结/状态同步/代码 review/PR 摘要/文章摘要/用户只是想继续在当前 chat 做事。

## 硬约束

- Phase 1 全程**只读**，不改文件、不改 git 状态
- 证据不可用时写 `未知`，不猜测
- 不包含 secrets / credentials
- 对"用户请求"和"显式约束"先按 materiality 过滤，再 verbatim 保留；过滤后为空写 `无`
- 输出必须**自包含**，可直接作为新 chat 第一条消息粘贴

## PHASE 0: 验证请求

确认：当前 chat 有值得保留的工作，且用户真的要交接而非只是回顾。  
若 chat 几乎为空，直接告知无实质内容可交接。

## PHASE 1: 收集证据（只读）

证据优先级：同会话历史（含 compact 前） > 当前可见对话 > todo 状态 > git 检查 > 必要文件  

执行顺序：
1. 同会话历史（含 pre-compaction 轮次）
2. 当前 todo 状态
3. `git diff --stat HEAD~10..HEAD` / `git status --porcelain`
4. 只读取必要文件（最少够用为止）

冲突处理：compact 后优先同会话历史 > 对话回忆；文件事实优先直接读取 > 回忆；用户显式指令 > 推断偏好。  
证据源不可用时记录下来，然后继续。

## PHASE 2: 提炼上下文

- 聚焦决策与能力，不陷入逐文件细节
- 明确区分 verified facts / inferred context / unknowns
- 已存在于 commit/issue/文件中的信息只引用路径/URL，不重复展开
- 无证据的细节：省略或标 `未知`

## PHASE 3: 格式化输出

严格按 `references/handoff-output-template.md` 填充；  
把从 `交接上下文 / HANDOFF CONTEXT` 到 `正文结束 / END OF HANDOFF CONTEXT` 的正文整体放入**单个代码块**，便于复制粘贴；  
不要新增模板之外的章节。

## 立即执行

收集证据 → 提炼 → 按模板输出。  
若用户额外给出下一个 chat 的焦点，仅用于收紧 `目标 / GOAL` 和 `待办事项 / PENDING TASKS`，不改写被引用的原话请求或约束。
