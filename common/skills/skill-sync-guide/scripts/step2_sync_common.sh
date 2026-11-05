#!/usr/bin/env bash
# step2_sync_common.sh
# 安全审查模式：只列出候选变更，不自动覆盖、不自动新增。
# 背景：该同步源来自 RR12_1_07，不能假定所有 skill/md 都适合 P9000AG7。
# 真正同步前必须人工确认适配性，再按需手动复制单个文件或目录。

GITHUB_DIR=~/VSC_guide/.github
COMMON_DIR=~/VSC_guide/common

would_update=()
would_add=()
common_only=()

# 1. 第一阶段：遍历 .github/，只记录候选覆盖和候选新增，不执行复制。
while IFS= read -r -d '' github_file; do
  rel="${github_file#$GITHUB_DIR/}"
  dst="$COMMON_DIR/$rel"
  
  if [[ -f "$dst" ]]; then
    if ! cmp -s "$github_file" "$dst"; then
      would_update+=("$rel")
    fi
  else
    would_add+=("$rel")
  fi
done < <(find "$GITHUB_DIR" -type f -print0)

# 2. 第二阶段：查找 common/ 独享的本地组件，予以保留信息记录。
while IFS= read -r -d '' common_file; do
  rel="${common_file#$COMMON_DIR/}"
  src="$GITHUB_DIR/$rel"
  if [[ ! -f "$src" ]]; then
    common_only+=("$rel")
  fi
done < <(find "$COMMON_DIR" -type f -print0)

echo "--- [候选覆盖] 源端存在且内容不同，需人工确认后再覆盖 (${#would_update[@]}) ---"
for f in "${would_update[@]}"; do echo "  $f"; done

echo "--- [候选新增] 源端新增文件，默认不导入 (${#would_add[@]}) ---"
for f in "${would_add[@]}"; do echo "  $f"; done

echo "--- [本地独有] common 本地特制组件，保持不动 (${#common_only[@]}) ---"
for f in "${common_only[@]}"; do echo "  $f"; done

echo "步骤二完成：本脚本仅生成审查清单，未修改 common/。"
