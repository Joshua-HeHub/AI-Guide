#!/usr/bin/env bash
# step1_fetch_github.sh
# 查询 Gerrit MR 18767 最新 patchset 并同步到 ~/VSC_guide/.github/
set -e

GERRIT_USER=IES235016
GERRIT_HOST=172.17.8.216
GERRIT_PORT=29418
GERRIT_REPO=IPT/BMC/RR12_1_07
CHANGE=18767
TMP_REPO=/tmp/RR12_1_07_tmp
GITHUB_DIR=~/VSC_guide/.github

# 1. 查询最新 patchset ref
REF=$(ssh -p "$GERRIT_PORT" "$GERRIT_USER@$GERRIT_HOST" \
  gerrit query --format=JSON --current-patch-set "change:$CHANGE" 2>&1 \
  | python3 -c "import sys,json; d=json.loads(sys.stdin.readline()); print(d['currentPatchSet']['ref'])")
echo "最新 ref: $REF"

# 2. 初始化临时仓库（若不存在）
[[ -d "$TMP_REPO/.git" ]] || git init "$TMP_REPO"

# 3. fetch + checkout .github/
cd "$TMP_REPO"
git fetch "ssh://$GERRIT_USER@$GERRIT_HOST:$GERRIT_PORT/$GERRIT_REPO" "$REF"
git checkout FETCH_HEAD -- .github

# 4. rsync 到本地 .github/
rsync -a --delete "$TMP_REPO/.github/" "$GITHUB_DIR/"

echo "步骤一完成：.github/ 已更新到 $REF"
