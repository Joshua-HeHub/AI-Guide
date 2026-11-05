#!/usr/bin/env bash
# neat-freak-reminder.sh — Stop 事件提醒脚本
# 在对话结束时提醒用户考虑运行 neat-freak 同步文档与记忆。
# 输入：stdin 接收 hook JSON（包含对话上下文）
# 输出：stdout 返回 systemMessage 提醒

cat <<'EOF'
{
  "systemMessage": "🧹 本次对话可能涉及代码或配置变更，建议在下次对话开始时运行 neat-freak（说"整理一下"或"/neat"）同步文档和记忆，避免知识腐化。"
}
EOF
