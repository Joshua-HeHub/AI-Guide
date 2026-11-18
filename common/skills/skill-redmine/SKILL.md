---
name: skill-redmine
description: >
  用于操作 Redmine issue：创建 issue、添加 Note（评论）、修改状态、查看 issue 详情。
  适用于用户提到：创建 redmine、写到 redmine、更新 issue、添加备注、记录到 redmine、
  redmine 评论、更新 ticket、写 note、记录分析结果到 redmine、添加代码提交链接。
argument-hint: '例如：把这次分析结果写到 redmine #31105；把修复方案记录到当前 issue'
user-invocable: true
---

# Redmine Skill

## 基本信息

- **Redmine 地址**：`https://10.99.182.200:8443`
- **当前项目**：sprint06-0601（IPT BMC-B Team 下属）

---

## SPX Bug 修复记录

依据：[Inventec SPX项目BMC代码提交规范-New](https://my.feishu.cn/wiki/QrcYwGTwBis1NQkmDJUcfCQGn9g)，2026-10-12 已核对正文 revision 380，以及工作簿 `WQn0s4w7Yh70BEtN25gcMHOFnxd` revision 20 的自查 `uf9I7G`、Review 汇总 `MYwxJK` 和配置风险 `cJAdHf`；三张表均未截断。对应的 23 项自查、24 类 Review 和 7 种套餐基线见 `../skill-code-review/SKILL.md`，示例 PASS/NA、风险判定及“不影响”不得沿用为本次结果。

记录 SPX Bug 修复时，Description 或后续 Note 应覆盖下列内容；可引用已有有效记录，避免重复粘贴，但不能遗漏证据和结论：

1. **问题描述**：问题现象、复现步骤、软硬件环境、发生概率及相关日志、截图或视频。
2. **问题分析**：实际执行的实验、实验结果、日志和具体根因。低概率或压测问题需记录日期时间、压测圈数、机台环境配置，便于环境对齐；根因未明确时标为待确认。
3. **解决方案**：修改逻辑及依据；存在多种方案时分别说明优缺点和选择理由。
4. **测试步骤及结果**：可复现的测试步骤、修改点与相关功能的回归、预期和实际结果及证据；必要时参考 SIT 用例。未实测写“未验证”，不能只用编译成功或枚举正常证明运行逻辑正确。
5. **代码提交链接**：实际 Gerrit/MR/PR/commit URL，按下方强制规则处理。
6. **ChangeList 自查检查项评估**：依据 `../skill-code-review/SKILL.md` 完成 23 项自查，逐项记录 PASS/FAIL/待确认/N/A、证据和关闭条件，包含 AC Cycle；新增自有函数检查字节项目 `Byte`、IEC OTS 项目 `IEC` 前缀。
7. **AI Review 评估及问题澄清**：粘贴实际 AI Review report 和 24 类汇总表（编号、标记、检查项、状态、关联详细项、结果与证据），对每条确认问题或待确认风险分别记录处理决定、证据、修复提交或后续验证。判定非问题必须有依据，不能仅写“AI 误报”；禁止把规范中的 report 示例写成本次结论。
8. **已知配置风险评估**：依据评审 skill 的 7 种已知套餐基线，逐项说明适用性、影响、依据、测试与关闭条件，并补充实际项目特有组合；记录 Base/DPU、硬件或配置组合、保留配置升级及相关功能风险，不将未知组合标为无影响，也不照搬原表示例结果。

新增功能关联实现方案或设计方案文档；量产版本关联待合入内容规划。缺失材料写待补充，不编造链接或结果。提交 Redmine 后必须回读确认记录已保存；未经用户授权不要自动写入或改变 issue 状态。

## 代码提交链接（强制）

创建 Redmine Issue，或在 Issue 中记录代码修复方案/测试结果时，必须在 Description
或 Note 中包含对应的代码提交链接，例如 Gerrit Change、MR、PR 或 commit URL。

### 执行规则

1. 操作 Redmine 前，先从用户消息、当前上下文和已验证的提交结果中查找代码链接。
2. 只接受能够直接访问具体变更的链接；仓库首页、分支名、纯 commit hash 或本地路径
  不能替代提交链接。
3. 如果用户没有提供链接，且当前上下文也没有经过验证的链接，必须先调用
  `vscode_askQuestions` 弹框提醒用户提供，不能猜测、编造或跳过。
4. 提醒文案建议：
  > 请提供本问题对应的 Gerrit/MR/PR/commit 链接；Redmine 记录必须包含可直接访问的代码提交链接。
5. 用户明确说明“暂时没有代码提交”时，可以继续创建 Issue，但 Description/Note 中
  必须记录“代码提交链接：待补充”，并在结果中提醒用户后续补齐。
6. 已有链接时，写入独立的“代码提交”段落；多个提交应逐条列出，禁止只写“见 MR”。

示例：

```text
代码提交：
- Gerrit MR 19210：https://10.99.182.200:18443/c/IPT/BMC/IEC-Turin-Host-bmc/+/19210
```

---

## 操作通道

- 以当前实际可用工具为准，不因 Agent 名称断言浏览器工具缺失；需要时先发现浏览器工具。
- 优先复用已登录浏览器；浏览器不可用时，可使用下方凭据文件访问受支持的 Redmine API，先以只读请求核实认证和权限。
- 浏览器和 API 均不可用时，再说明具体阻塞并请求用户恢复相应通道；切换 Agent 必须由用户操作。

---

## 添加 Note（评论）到 Issue

### 完整流程

#### 1. 导航到 Issue 页面

```
navigate_page(pageId, url="https://10.99.182.200:8443/issues/<issue_id>")
```

#### 2. 用 JavaScript 填充 Notes 文本框

> ⚠️ **关键**：Redmine 的 `#issue_notes` textarea 被 `.jstEditor` 包装，
> 用 Playwright 的 `page.fill()` 会超时（元素标记为 not visible）。
> 必须用 `page.evaluate()` + `textarea.value =` 直接赋值。

```javascript
// run_playwright_code 中使用：
await page.evaluate((text) => {
  const ta = document.getElementById('issue_notes');
  if (ta) {
    ta.value = text;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, noteContent);
```

#### 3. 提交表单

```javascript
// run_playwright_code 中使用：
await page.evaluate(() => {
  const form = document.querySelector('form#issue-form, form.edit_issue');
  if (form) {
    const submit = form.querySelector('input[type=submit], button[type=submit]');
    if (submit) submit.click();
  }
});
```

#### 4. 验证提交成功

提交后 URL 不会跳转（仍是 `/issues/<id>`），通过 DOM 查询确认 journal 是否出现：

```javascript
return await page.evaluate(() => {
  const journals = document.querySelectorAll('.journal');
  return {
    count: journals.length,
    lastText: journals.length
      ? journals[journals.length - 1].textContent.trim().substring(0, 200)
      : 'none'
  };
});
```

成功标志：`lastText` 中包含刚写入的内容开头文字。

---

## 注意事项 / 常见坑

| 问题 | 原因 | 解决 |
|------|------|------|
| `page.fill('#issue_notes')` 超时 | textarea 被 `.jstEditor` 包裹，Playwright 判断为 not visible | 改用 `page.evaluate()` 直接赋值 |
| 截图看 Notes 框是空的 | jstEditor 用 div 覆盖了 textarea 的视觉渲染 | 不影响实际值，用 JS 检查 `ta.value` 确认 |
| 提交后值丢失 | 之前 `evaluate` 赋值后页面刷新，未实际提交 | 赋值后立即 click submit，不要刷新页面 |
| `page.click('input[type=submit]')` 无响应 | form 找不到 | 用 `form.querySelector` 先找 form 再找 submit |

---

## 脚本入口

Redmine 的具体浏览器实现已下沉到同目录脚本：[redmine-browser-snippets.mjs](redmine-browser-snippets.mjs)。

这个脚本提供可复用的代码生成器：

- `buildFillIssueNotesSnippet`
- `buildSubmitIssueNotesSnippet`
- `buildVerifyIssueJournalSnippet`
- `buildUploadScreenshotSnippet`
- `buildAttachScreenshotSnippet`
- `buildOneShotNoteSnippet`

主文件只保留入口说明、约束和维护提示；需要具体 Playwright 代码时，优先看脚本文件。

## [按需加载] 凭据与会话

- 凭据文件：`/bmc/joshua/.config/redmine/credentials`（权限 600，不入 Git）。格式：
  ```text
  REDMINE_BASE=https://172.17.8.200:8443
  REDMINE_USER=IES235016
  REDMINE_PASS=<仅存于本机凭据文件>
  ```
- 2026-11-18 用户已授权配置账号 `IES235016`；运行时读取上述文件，不在 skill、记忆、报告、终端命令日志或 Git 中保存或回显实际密码。
- 需要新凭据时，让用户在自己的终端直接写入该文件；不通过 `vscode_askQuestions` 收集密码。用户已主动提供并授权保存的凭据仅更新到该文件，保持权限 600。
- 密码为空、占位或权限不符时停止 API 认证；有已登录浏览器时优先复用，不假定旧会话仍然有效。
- 先用只读请求验证认证，只输出 HTTP 状态和账户标识。`GET /users/current.json` 返回 403 不足以判断密码错误；可使用标准 `/login` 表单（保留 CSRF token 与 Cookie），再回读 `/my/account` 确认登录。
- 2026-11-18 已验证管理网 `https://172.17.8.200:8443` 表单登录及账户页回读成功，原 `10.99.182.200:8443` 在当前环境超时；API 当时返回 403，未确认可用。
- 生成的会话仅存 `/bmc/joshua/.config/redmine/session.cookies`（权限 600）；密码、Authorization 请求头及 Cookie 值不进入诊断输出。

## [按需加载] 创建 Issue 踩坑（2026-10-29 实测）

| 坑 | 处理 |
|---|---|
| 短项目路径 404：`/projects/sprint06-0601` | 真实标识 `/projects/ipt-sw3b-2025y-sprint06-0601`（先查 `/projects` 列表的 href） |
| Assignee cannot be blank | 项目要求必填。给自己：`issue[assigned_to_id]=196`（IES235016） |
| 普通按钮 click / form.click() 提交无反应、页面状态残留（h2 仍 "New issue"） | 兜底：页面内 `new FormData(form)` + `fetch(form.action,{method:'POST',body:fd,credentials:'same-origin'})`；成功=响应含 "created successfully" 或 URL 以 /issues/<id> 结尾。fetch 不跟随跨页面渲染，务必再 GET /issues/<id> 回读 |
| 错误藏在响应体 | 抓 `<div class=errorExplanation>`（如 Assignee 为空时 200 + 列表 URL，无 flash） |
| page.evaluate 里 join("\\n") 变字面量 | 换行用 `String.fromCharCode(10)`，或分次赋值 |

## 用户新规（2026-10-29）

- 工作尚未提交 Gerrit/MR 时，创建 Issue 的"代码提交"段落直接写 **"待补充（修复现行于本地工作区，尚未推 Gerrit）"**，之后用户提交了再补 Note——**不要再弹窗询问**（用户原话："还没提交的时候，你先留空，以后别问我了"）。
- 创建后必须回读：GET `/issues/<id>` 确认标题、Assignee、Description 落库。

---
