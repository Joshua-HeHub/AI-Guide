---
name: skill-create-chat
description: '用于新系列聊天的初始化。适用于用户提到创建聊天、设置聊天标题、记录聊天路径、设定终极目标、回顾当前聊天、jsonl 路径、Session Trace 路径等场景。'
argument-hint: '提供聊天标题文字与终极目标，或说明要初始化哪一轮系列聊天'
user-invocable: true
---

# Create Chat

## 使用场景

- 用户想为新系列聊天建立稳定标题和终极目标。
- 用户想知道当前聊天记录的 `jsonl` 路径怎么找。
- 用户想把当前聊天的路径与终极目标写入 session memory，作为全局防偏离约束。

## 执行目标

1. 确立当前系列聊天的标准标题和本会话唯一稳定的终极目标。
2. 讲解当前聊天记录路径如何获取。
3. 将当前聊天的路径与终极目标写入 session memory。

## 执行步骤

1. 先确立用户给出的标题文字与终极目标；若用户给出指令不够明确，必须主动向其询问“请明确本次聊天的终极目标”。
2. 若当前环境支持直接定位聊天记录，优先获取：
   a. `session_id`
   b. 主会话 `jsonl` 路径
   c. 当前远端可见的调试 `jsonl` 或关联目录
3. 将以下信息写入 session memory：
   a. 当前系列聊天标题
   b. 终极目标（严格遵循 goal-layering 规则，此期间不可被具体子操作或路径查询覆盖替换）
   c. `session_id`
   d. 主会话 `jsonl` 路径
   e. 调试 `jsonl` 路径或关联目录
4. 向用户说明如何回顾该聊天：
   a. 优先看 session memory 中记录的路径
   b. 若需要校验，再用 Session Trace 查 `session_id` 和 `file_path`

## 标题规则

1. 默认把用户给的文字视为当前系列聊天的标准标题。
2. VS Code Copilot Chat 会将对话首条用户消息自动作为 UI 标题显示。因此，当用户在对话开头直接给出标题文字时，UI 标题会正确显示，无需额外操作。
3. 执行完成后，直接确认标题已生效，不要说"无法修改 UI 标题"。

## 路径获取说明

1. 优先通过 Session Trace 查询当前会话的 `session_id` 和 `file_path`。
2. 若当前远端机器能看到 `GitHub.copilot-chat/debug-logs/<session_id>/`，一并记录其 `main.jsonl` 路径。
3. 若暂时拿不到主会话 `jsonl`，先记录当前可见调试路径，后续再补齐。

## 输出要求

1. 明确给出当前系列聊天标题，确认 UI 标题已生效。
2. 明确给出已记录到 session memory 的路径。

## 限制

1. 不要在没有查证路径时凭印象编造 `jsonl` 路径。
2. 回顾聊天时，先读 session memory，再结合 Session Trace；不要只靠总结记忆。