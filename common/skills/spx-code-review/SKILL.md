---
name: spx-code-review
description: "人工调用的 SPX BMC 固件代码审查 skill：面向 Aspeed/AMI 嵌入式 C 代码与 Commit/PR/MR，按路由加载专项清单，输出带固定汇总表与 V/X 标记的审查报告。"
agent_created: true
disable-model-invocation: true
metadata:
  version: "1.0.1"
---

# SPX BMC 固件代码审查 (spx-code-review)

面向 Aspeed/AMI 生产级 BMC 固件。默认环境为资源受限的嵌入式 Linux、多线程/多进程长驻 daemon，网络暴露面包括 IPMI、Web 和 Redfish。主要审查 C，兼顾 Python、Shell、DTS 和 DTSI。

版本历史见 [变更日志](./CHANGELOG.md)，仅在查看版本差异或维护 skill 时按需读取，不属于每次审查的必须加载材料。

## 必须加载

开始审查前读取：

- `references/review-policy.md`
- `references/checklists/general-review-checklist.md`
- `references/checklists/spx-project-checklist.md`
- `assets/review-report-template.md`

## 按场景加载

| 场景 | 必须加载 |
|---|---|
| Commit、PR 或 MR | `references/standards/ami-bmc-submission-standard.md` |
| C/C++ 代码 | `references/checklists/c-highrisk-checklist.md`、`references/standards/bytedance-coding-standard.md` |
| Python 或 Shell | `references/checklists/script-review-checklist.md` |
| AMI 老代码、daemon、fork/thread 或复杂错误清理 | `references/checklists/legacy-code-pitfalls.md` |
| 输出变更图 | `references/workflows/mermaid-guidelines.md` |
| 候选问题复核 | `references/workflows/cross-validation.md` |

只加载与当前变更有关的专项参考，避免无关规则占用上下文。

## 不可省略的规则

1. 按 `references/review-policy.md` 的优先级完成审查，问题使用 diff 右侧的新版本行号。
2. 每个问题必须有代码证据、风险后果、严重级别和具体修复建议。
3. 按 `references/checklists/spx-project-checklist.md` 的检查领域路由逐领域判断命中并加载对应专项清单，执行清单规定的检查、强制 `X` 与风险确认要求；材料齐全不自动解除强制提示。
4. Review 事项汇总必须固定输出全部检查领域及“标记”“关联详细项”列；三态结果、`V`/`X` 标记与关联项的填写规则以 `assets/review-report-template.md` 为准。
5. 默认只审查，不修改代码；用户在报告后明确选择修复项，才进入修复循环。

## 七步审查流程

### Step 1：确认范围与提交信息

- 用户指定文件、commit、分支差异或 PR/MR 时遵循指定范围。
- 用户未指定范围时，先询问要审查当前变更、指定文件、分支差异还是 PR/MR。
- Commit、PR 或 MR 同时获取标题、Description、Tracker、测试步骤和测试结果；材料缺失与仅文件审查的标记按 `review-policy.md` 约束 6 处理。

### Step 2：收集代码与设计上下文

- 读取完整 diff、变更函数和必要的相邻实现，不仅检查新增行。
- 修改已有函数时，遍历其上下级调用处，评估对原流程的影响。
- 按「按场景加载」读取相关规范，并按 `references/checklists/spx-project-checklist.md` 的触发条件加载对应专项清单。

### Step 3：推断作者意图

将 diff 作为整体，简要说明它要修复的问题、添加的能力或改变的流程。后续问题必须结合该意图判断，避免把有意行为误报为缺陷。

### Step 4：可视化关键变更

按 `references/workflows/mermaid-guidelines.md` 同时输出“变更前方案”和“变更后方案”两张可比较的 Mermaid 图。两图使用相同图类型、方向和节点命名；仅注释或格式变更可以省略。无法取得基线代码时明确说明，不得猜测原方案。

### Step 5：扫描问题

- 按 `review-policy.md` 的优先级和已加载清单逐项检查。
- 对照 `references/checklists/spx-project-checklist.md` 的检查领域表逐领域判断命中；未命中领域记录 `已检查-不涉及`，命中领域完成清单检查后记录三态结果、`V`/`X` 标记并关联详细项。
- 专项清单对强制标记、证据与报告行为的要求以清单本身为准。

### Step 5.5：交叉验证

按 `references/workflows/cross-validation.md` 由两个独立验证者复核全部候选问题。2/2 确认为 High，1/2 确认为 Medium，0/2 确认则排除。子代理不可用时执行该文档中的自检降级流程。

### Step 6：输出报告

按 `assets/review-report-template.md` 输出审查概览和作者意图、Mermaid 变更前/变更后对照图、全部检查领域的汇总表、确认代码问题、待确认风险与证据缺口。汇总表填写、根因合并与“未发现问题”的输出条件以模板为准。

### Step 7：询问修复选择

报告问题后询问用户修复全部、指定问题或暂不修改。完成修复后重新执行相关检查，并继续呈现尚未解决的问题，直到全部处理或用户停止。
