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

## SPX 提交前门禁

依据：[Inventec SPX项目BMC代码提交规范-New](https://my.feishu.cn/wiki/QrcYwGTwBis1NQkmDJUcfCQGn9g)，2026-10-12 已核对正文 revision 380，以及工作簿 `WQn0s4w7Yh70BEtN25gcMHOFnxd` revision 20 的三张内嵌表：ChangeList 自查 `uf9I7G`（23 项）、Review 汇总 `MYwxJK`（24 类）、配置风险 `cJAdHf`（7 种套餐）。本地对应清单见 `../skill-code-review/SKILL.md`；原表的 PASS/NA、风险判定和“不影响”是示例结果，不能作为新提交的结论。

1. 先确认当前仓库、分支和实际项目归属，不得仅凭本地目录名判断字节项目或 IEC OTS 项目。
2. 新增自有函数的命名前缀：字节项目用 `Byte`，IEC OTS 项目用 `IEC`。不得把 `Byte` 一律改为 `IEC`，也不得因沿用 P9000AG7 目录而将 IEC OTS 函数命名为 `Byte`。检查本次改动涉及的声明、定义和调用是否一致；既有 ABI、框架回调或第三方函数的固定名称不得为满足前缀规则而盲目改名，应记录约束和评估结论。
3. Bug 修复在 Redmine 中应包含：问题描述、问题分析及根因、解决方案、测试步骤及结果、代码提交链接、ChangeList 自查检查项评估、AI Review 评估及逐条澄清、已知配置风险评估。记录规则见 `../skill-redmine/SKILL.md`。
4. 提交前执行 `../skill-code-review/SKILL.md` 的审查，完成 23 项自查、24 类 Review 汇总和已知配置风险评估，逐项记录结果及证据；未知或未实测项不能写 PASS。把 AI Review report 和对问题的澄清整理为 Redmine 可用内容，不得把规范中的示例 finding 当成本次问题。
5. 测试不只覆盖修改功能点，还应覆盖调用链、相关功能、AC Cycle 及回归风险；必要时参考 SIT 用例。依据评审 skill 的 7 种已知套餐逐项判断适用性，评估 Base/DPU、硬件配置、保留配置升级等实际受影响组合，不要求无关组合测试。
6. 存在确认的阻塞问题、未澄清的关键风险或验证缺口时，明确报告，不得宣称达到合入条件；不因文档要求自动执行构建、硬件操作、Redmine 写入或 push。
7. 新增功能应关联实现方案或设计方案；量产版本应关联待合入内容规划。缺少链接时记录待补充，不编造已完成的设计或版本规划。

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

**格式依据（2026-10-14 已核对）**：飞书规范《Inventec SPX项目BMC代码提交规范-New》正文与自查表只要求 commit 信息描述清楚（问题、根因、方案、测试、Tracker），**未要求 `Description:` 行，也没有规定段首缩进**；规范截图里带 `Description:` 的示例只是排版参考，不得当成硬性要求。

Bug 修复必须清楚描述实际问题、根因、修改逻辑、测试方法和真实结果，并关联实际 Tracker 单号。未执行的测试写“未验证”，不得复制示例中的通过结果；简洁格式不能替代 Redmine 中的完整分析、自查及 Review 记录。

**推荐格式（顶格、无 `Description:` 行、段落之间空一行）**：

```text
[P9500AG7][模块][类型] 一句话描述

[问题根因] ……

[解决方案] ……

[测试流程] ……

[测试结果] ……

Tracker: #单号

Change-Id: Ixxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**实测范例**（change 19828 PS2/`1aafa081`，2026-10-14 已推送验证：相对 PS1 仅删除 `Description:` 与缩进、段落间加空行，实质内容、Tracker 与 Change-Id 不变）：

```text
[P9500AG7][Common][BUG-Fix] 修正 AMD MI355X 资产信息设备名称为空

[问题根因] WebUI 资产信息 PCIe 页签及 REST 接口的设备名称由
sg_asPCIeBrandNameString[] 静态映射表按 VID/DID/SVID/SDID 查表生成，
表中 AMD 仅有 MI308X(0x74A2)/MI308XHF(0x74A8) 条目，缺少 MI355X
(DID 0x75A3)，查表失败返回空字符串，导致 8 张 MI355X 加速卡
设备名称在资产信息页显示为空

[解决方案] 依据 AMD 官方 GIM 驱动确认 MI355X Device ID=0x75A3，
在 sg_asPCIeBrandNameString[] 新增 AMD MI355X 条目(0x1002/0x75A3)；
已核查 Redfish AcceleratorAdapter 接口为 BIOS H2B 资产数据通用透传，
无需额外适配

[测试结果] git-spx buildsrc 全量编译通过，编译产物
assets_info_configuration.o 已包含 AMD MI355X 字符串；
真机显示效果待随下一版本由 SIT 在 MI355X 整机验证

[测试流程] 全量编译 + 编译产物离线字符串校验；未在 MI355X
硬件上实测，已在 Track 注明

Tracker: #60980070

Change-Id: Ic7d12c442e19920830327f23e1a37f6a84d1a613
```

历史提示：旧提交（如 `c758a619`）使用 `Description:` + 4/8 格缩进；读历史时不要被误导，新提交不要为“与旧格式一致”把该行或缩进加回。

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

# 更新已有 MR（patchset）：保持 Change-Id 不变（amend，或按“更新已有 MR”一节的仅说明更新）
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

**仅更新提交说明时（工作区有其他改动，或原 patchset 提交不在 HEAD）**：不要 amend 当前 HEAD；用 `git commit-tree` 基于原 patchset 对象生成仅说明变更的新提交（2026-10-14 已在 19828 验证）：

```bash
# 1. 非侵入式取回原 patchset 并记录 tree/parent/author（不切分支、不暂存）
git fetch origin refs/changes/<last2>/<change_no>/<patchset>
git show -s --format=fuller FETCH_HEAD

# 2. 新提交说明写入临时文件：保留 Tracker 与原 Change-Id

# 3. 用原 tree/parent/author 生成新提交，不碰 HEAD/索引/工作区
GIT_AUTHOR_NAME=<name> GIT_AUTHOR_EMAIL=<email> GIT_AUTHOR_DATE=<date> \
  git commit-tree $(git rev-parse FETCH_HEAD^{tree}) \
  -p $(git rev-parse FETCH_HEAD^) -F /tmp/message.txt

# 4. 推送前必验：代码零变化 + change 仍 open 且未被并发更新
git diff --exit-code FETCH_HEAD <new_rev>
ssh -p 29418 -i ~/.ssh/id_ed25519 IES235016@172.17.8.200 \
  gerrit query --current-patch-set change:<change_no>
git push origin <new_rev>:refs/for/P9500AG7

# 5. 推送后回读：current-patch-set 号 +1、revision 与新提交一致、
#    commitMessage 与本地文件一致、git diff --exit-code <旧rev> <新rev> 通过；
#    Gerrit 输出应含 `updated: 1` 与 `no files changed, message updated`
```

常规流程（干净工作区且原提交在 HEAD）：

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
