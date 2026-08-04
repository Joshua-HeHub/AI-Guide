---
name: skill-sync-guide
description: '用于审查并同步 AI 工作环境指南文件。适用于用户提到同步指南、更新 skill、拉取 MR、更新 AI 配置、sync guide、指南同步等场景。执行两步：① 拉取 Gerrit MR 最新 patchset 到 ~/VSC_guide/.github/；② 生成 ~/VSC_guide/.github/ 与 ~/VSC_guide/common/ 的候选覆盖/新增清单，人工确认适配性后再手动同步。'
argument-hint: '可选说明是否跳过某一步，或只同步特定文件'
user-invocable: true
---

# AI 工作环境指南同步

## 固定事实

- **Gerrit 服务器**：`ssh://IES235016@172.17.8.216:29418`
- **仓库路径**：`IPT/BMC/RR12_1_07`
- **目标 MR**：change 18767（`refs/changes/67/18767/<PS>`）
- **本地临时仓库**：`/tmp/RR12_1_07_tmp`
- **本地指南根目录**：`~/VSC_guide/`
  - `.github/`：MR 原始内容，直接从 Gerrit 同步，保留 RR12_1_07 上游状态
  - `common/`：当前工作环境实际生效副本，只放已确认适合 P9000AG7 或通用的内容
- **重要路径规则**：只修改并保存 `~/VSC_guide/common/`。当前 workspace 的 `/bmc/joshua/.github` 是 `/bmc/joshua/VSC_guide/common` 的 symlink，common 保存后软链接路径自动可见；不要单独维护 `/bmc/joshua/.github` 内容。

## AI-Guide-Joshua 迁移待办

- 建立独立的 `AI-Guide-Joshua` 仓库，用于保存 Joshua 环境的 instructions、skills、memories、执行纪律和同步脚本。
- AI 指南仓库与 P9000AG7 固件仓库解耦；指南内容不应混入固件仓库提交。
- MR `19247` 后续优先提交到 AI 指南仓库；在远程仓库路径正式确认前，不擅自创建远程仓库或推送。
- 远程仓库路径、默认分支和 MR `19247` 对应的 Change-Id 尚未确认，提交前必须补齐并复核。

## 路径判断

| 路径 | 含义 | 是否直接编辑 |
|------|------|--------------|
| `~/VSC_guide/.github/` | Gerrit MR 原始副本，保留 RR12_1_07 上游状态 | 否，除非执行 step1 |
| `~/VSC_guide/common/` | 当前工作环境实际生效副本 | 是 |
| `/bmc/joshua/.github/` | 指向 `~/VSC_guide/common/` 的 symlink | 否；仅观察，不作为保存目标 |

若新增或修改 skill，只保存到 `~/VSC_guide/common/skills/...`。软链接 `/bmc/joshua/.github/skills/...` 会自动看到同一内容。

## 脚本文件

所有可执行脚本放在 `scripts/` 子目录：

| 脚本 | 说明 |
|------|------|
| `scripts/step1_fetch_github.sh` | 查询最新 patchset → fetch → rsync 到 `~/VSC_guide/.github/` |
| `scripts/step2_sync_common.sh` | 安全审查模式：只列 `~/VSC_guide/.github/` 对 `~/VSC_guide/common/` 的候选覆盖、候选新增和本地独有文件，不自动修改 `common/` |
| `scripts/sync_all.sh` | 顺序执行步骤一 + 步骤二；步骤二只生成审查清单 |

## 常用执行方式

```bash
# 拉取上游并生成审查清单（推荐）
bash ~/VSC_guide/common/skills/skill-sync-guide/scripts/sync_all.sh

# 仅拉取 ~/VSC_guide/.github/ 上游副本（不动 common/）
bash ~/VSC_guide/common/skills/skill-sync-guide/scripts/step1_fetch_github.sh

# 仅生成 common/ 审查清单（~/VSC_guide/.github/ 已是最新时）
bash ~/VSC_guide/common/skills/skill-sync-guide/scripts/step2_sync_common.sh
```

## 注意事项

1. **步骤一依赖 SSH key 免密**：本机已配置 `IES235016@172.17.8.216:29418` 的 SSH key，无需输密码。
2. **步骤二禁止自动覆盖**：该同步源来自 RR12_1_07，不能默认适用于 P9000AG7。脚本只输出审查清单，真正复制前必须逐项判断。
3. **`/tmp/RR12_1_07_tmp` 不存在时**：`step1_fetch_github.sh` 会自动 `git init`，无需手动处理。
4. **`skill-sync-guide` 本身不在 `~/VSC_guide/.github/` 上游副本中**：它只存放在 `common/`，不会被步骤二覆盖或清除。注意 `/bmc/joshua/.github` 是 `common` 的 symlink，因此在那里看到它是正常的；实际保存仍只写 `~/VSC_guide/common/`。
5. 同步前可查看本次 patchset 变更范围：`git -C /tmp/RR12_1_07_tmp diff FETCH_HEAD HEAD -- .github/`
6. 若要引入新 skill/md，优先判断它属于：通用、P9000AG7 专属、需改造、或其他项目专属。只有前两类可直接进入 `common/`。
