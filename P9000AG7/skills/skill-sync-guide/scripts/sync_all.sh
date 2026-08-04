#!/usr/bin/env bash
# sync_all.sh — 一键执行步骤一 + 步骤二
# 用法：bash sync_all.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== [1/2] 拉取最新 patchset 到 .github/ ==="
bash "$SCRIPT_DIR/step1_fetch_github.sh"

echo ""
echo "=== [2/2] 将更新覆盖到 common/ ==="
bash "$SCRIPT_DIR/step2_sync_common.sh"

echo ""
echo "=== 同步完成 ==="
find ~/VSC_guide/common -type f | sort
