# Gerrit MR / Change Diff 获取方法

仅在用户提供 Gerrit MR/Change 链接、change number，或明确要求审查某个 Gerrit MR 但未提供 diff 时加载本文件。普通 patch、commit、本地文件审查不需要加载。

## 原则

- 不要优先使用浏览器或网页抽取 Gerrit diff；Gerrit change 的真实内容应通过 SSH/Git ref 获取。
- 不要基于本地相似代码推断 MR diff；如果没有拉到 patchset，要明确说明未取得真实 diff。
- 抓取 patchset 时使用 `FETCH_HEAD`，不要切换当前分支，不要改动工作区。
- 本项目命令优先使用 `rtk` 前缀。

## 当前已验证访问方式

- Gerrit SSH：`172.17.8.216:29418`
- Repository：`IPT/BMC/IEC-Turin-Host-bmc`
- 优先账号和密钥：`IES235016` + `~/.ssh/id_ed25519`

如果用户指定了其他 Gerrit、repo、账号或 key，以用户输入为准。

## 操作步骤

### 1. 解析 change number

从 URL 或用户输入中取 change number。

示例 URL：

```bash
https://10.99.182.200:18443/c/IPT/BMC/IEC-Turin-Host-bmc/+/18606
```

change number 为 `18606`。

### 2. 查找 patchset ref

```bash
rtk git -c core.sshCommand="ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no" \
  ls-remote ssh://IES235016@172.17.8.216:29418/IPT/BMC/IEC-Turin-Host-bmc '*<change_no>*'
```

Gerrit ref 格式：

```bash
refs/changes/<change_no_last_two_digits>/<change_no>/<patchset_no>
```

例：change `18606` 的 patchset 7 是：

```bash
refs/changes/06/18606/7
```

### 3. 查询 Gerrit 元数据和文件列表

```bash
rtk ssh -p 29418 -i ~/.ssh/id_ed25519 IES235016@172.17.8.216 \
  gerrit query --current-patch-set --files change:<change_no>
```

用此输出确认：

- branch
- current patchset number
- revision hash
- modified files
- commit message

### 4. 非侵入式 fetch patchset

```bash
rtk git -c core.sshCommand="ssh -i ~/.ssh/id_ed25519 -o StrictHostKeyChecking=no" \
  fetch ssh://IES235016@172.17.8.216:29418/IPT/BMC/IEC-Turin-Host-bmc \
  refs/changes/<last2>/<change_no>/<patchset_no>
```

此命令只更新 `FETCH_HEAD`，不切换分支。

### 5. 查看 diff

```bash
rtk git --no-pager show --stat --oneline FETCH_HEAD
rtk git --no-pager show --no-ext-diff --unified=20 FETCH_HEAD
```

若只审查部分文件，可加路径限制：

```bash
rtk git --no-pager show --no-ext-diff --unified=20 FETCH_HEAD -- <file1> <file2>
```

## 失败处理

- `ls-remote` 无结果：确认 change number、repo、账号、网络、SSH key。
- `gerrit query` 失败：确认 Gerrit SSH 权限和账号。
- `fetch` 成功但 diff 不符合用户目标：检查是否取错 patchset 或 repo。
- 无法取得真实 diff 时，不要把本地相似代码当作 MR diff；回答必须标注“未取得 Gerrit diff”。

## 已验证案例

2026-07-09 验证：change `18606` 最新 patchset 为 `refs/changes/06/18606/7`，revision `15713d16664a1333f5e495c943055e4e2de74db5`。