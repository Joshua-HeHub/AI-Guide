---
name: skill-commit-p9000ag7
description: >
  用于 P9000AG7（P9500AG7 分支）的提交、commit 说明撰写、推送到 Gerrit refs/for、patchset 更新。
  适用于用户提到：提交、MR、push、patchset、refs/for、审核、提交备注、Change-Id。
argument-hint: '输入需求，例如：提交当前 MID 修改并推送评审；更新已有 MR 18945 的 patchset；检查 MR 是否已合入'
user-invocable: true
applyTo: '**/P9000AG7/**'
---

# Commit Workflow — P9000AG7 (P9500AG7 branch)

## 项目基本信息

- **仓库路径**：`/bmc/joshua/P9000AG7`
- **主分支**：`P9500AG7`
- **远端**：`ssh://IES235016@172.17.8.216:29418/IPT/BMC/IEC-Turin-Host-bmc`
- **Gerrit 地址**：`https://10.99.182.200:18443/c/IPT/BMC/IEC-Turin-Host-bmc/`
- **推送格式**：`git push origin HEAD:refs/for/P9500AG7`

> 说明：本技能只处理 P9000AG7/P9500AG7 固件仓库提交。AI 指南内容后续应提交到独立的 `AI-Guide-Joshua` 仓库；MR `19247` 的目标仓库、分支和 Change-Id 尚未确认前，不得套用本技能推送。

---

## Commit Message 规则

### 标题格式（第一行）

```
[<项目标签>][<模块>][<类型>] 一句话描述
```

**项目标签**常见值（参考历史）：
- `P9500AG7` — 当前分支专属修改
- `P9000AG7` — 平台通用修改
- `通用问题-<关键词>` — 跨项目通用问题

**模块**常见值：
- `Common`、`Project`、`Bytedance`、`BUG-Fix`、`Bug-Fix`、`FR`（Feature Request）、`Doc`

**类型**常见值：
- `[Project]`（项目配置类）
- `[BUG-Fix]` / `[Bug-Fix]`（缺陷修复）
- `[FR]`（需求）
- `[from P5000AG7]` / `[Cherry pick from JiGuangV3.5]`（cherry-pick 注明来源）

> ⚠️ Gerrit 会警告 subject >50 字符，属于 warning 不阻断，但建议尽量精简。

### Body 格式

两种主流格式并存，选择与历史类似 commit 一致的：

**格式 A（结构化，推荐用于功能修改/Bug Fix）：**

```text
[P9500AG7][模块][类型] 一句话描述

Description：

  1.问题原因：……

  2.解决办法：……

  3.测试方法：……

  4.测试结果：……

Tracker: #单号

Change-Id: Ixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**格式 B（简洁，用于配置/项目类修改）：**

```text
[P9500AG7][Common][Project] 一句话描述

    Description:

        [问题根因] ……
        [解决方案] ……
        [测试结果] ……
        [测试流程] ……

Change-Id: Ixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**参考范例**（commit `c758a619`，本项目 MID 修改）：

```text
[P9500AG7][Common][Project] ManufacturerID = 0x0019A9 (IEC IANA ID)

    Description:

        [问题根因] MID 需要从 0x00B3DD 更新为 IEC 的 IANA ID 0x0019A9
        [解决方案] 修改 PDKHooks.c、iec_func_cmd.c 及所有 HPM conf 文件中的 ManufacturerID
        [测试结果] 语法验证通过，同 P5000AG7 commit a70754b2 相同修改模式
        [测试流程] ARM 交叉编译器语法检查通过

Change-Id: I6f2d7bd91ed73e4974e194acd87269dd135b8aa9
```

---

## Change-Id 规则（关键！踩坑记录）

Gerrit 要求 Change-Id：
1. 必须在 commit message **最后一行**（单独一行，前面空一行）
2. 格式：`Change-Id: I` + **40 位小写 hex**（共 41 字符）
3. **不能手工构造短 UUID**（`$(uuidgen | tr -d '-' | head -c 40)` 生成的长度不对，会报 `invalid Change-Id`）

**正确的 Change-Id 生成方式**：

```bash
CHANGEID="I$(echo "$(git log -1 --format=%T)$(git log -1 --format=%P)$(git log -1 --format=%an)$(git log -1 --format=%ae)$(date)" | git hash-object --stdin)"
```

这会生成标准 40 位 SHA-1，格式正确。

---

## 推送规则

```bash
# 推送到 P9500AG7 分支评审
git push origin HEAD:refs/for/P9500AG7

# 更新已有 MR（patchset）：保持 Change-Id 不变，amend 后推送
git commit --amend
git push origin HEAD:refs/for/P9500AG7
```

- 同一个问题只保留一个 MR，不要制造额外 abandon 提交。
- 更新已有 MR 时，必须复用原 MR 的 Change-Id，禁止生成新 Change-Id。
- 推送后必须检查 Gerrit 输出：
   - `updated: 1` / `Updated Changes` 代表正确更新 patchset
   - `new: 1` / `New Changes` 代表错误新建 MR，必须立即修正
- 若误推为新 MR：先 `abandon` 新 MR，再 `git commit --amend` 还原旧 Change-Id，重新推送。

---

## 标准操作流程

### 提交新修改

1. 确认当前分支是 `P9500AG7`，工作区干净：
   ```bash
   git branch --show-current
   git status --short
   ```

2. 只暂存与本次问题相关的文件，**不要 `git add .`**：
   ```bash
   git add <具体文件>
   git diff --cached --stat   # 确认 staged 内容
   ```

3. 生成 Change-Id 后提交：
   ```bash
   CHANGEID="I$(echo "$(git log -1 --format=%T)$(git log -1 --format=%P)$(git log -1 --format=%an)$(git log -1 --format=%ae)$(date)" | git hash-object --stdin)"
   git commit -m "[P9500AG7][模块][类型] 描述

    ...

Change-Id: $CHANGEID"
   ```

4. 推送：
   ```bash
   git push origin HEAD:refs/for/P9500AG7
   ```

5. 确认输出包含 `SUCCESS` 和 `New Changes:` URL，复制 URL 给用户。

### 更新已有 MR（patchset）

1. 检查 MR 当前最新 patchset：
   ```bash
   git ls-remote origin | grep "refs/changes/.*/18945/"
   ```

2. `git commit --amend` 修改内容，**保持 Change-Id 不变**。

3. 推送，确认输出是 `[updated]` 而非 `[new change]`。

4. 如果输出是 `New Changes`：
   - 说明 Change-Id 没对上，已经创建了垃圾 MR。
   - 立即废弃新 MR，并将提交 amend 回旧 Change-Id 后重推。

---

## 常见错误和解决方法

| 错误信息 | 原因 | 解决 |
|---|---|---|
| `missing Change-Id in message footer` | Change-Id 不在最后一行，或缺失 | `git commit --amend`，把 `Change-Id: I...` 移到最底部单独一行 |
| `invalid Change-Id` | Change-Id 不足 40 位 hex | 用 `git hash-object` 方式重新生成 |
| `subject >50 characters` | 标题太长 | 仅 warning，不阻断，可忽略 |
| `! [remote rejected]` + ahead 多个 commit | 夹带了其他提交 | 切 temp branch 到目标 commit，单独推送 |

---

## Constraints

- 不要把 `tools/generatehpmimagetool/FW/rom.ima` 等构建产物带入提交（确认在 .gitignore 或手动排除）。
- 只 stage 与本次任务相关的文件。
- 分支领先 origin 多于 1 个 commit 时，先检查是否需要 temp branch。
- 不要在未确认 ahead 数量前直接 push。
- 需要更新 patchset 时，禁止新建 MR；必须沿用原 Change-Id。
