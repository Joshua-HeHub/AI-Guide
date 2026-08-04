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

## 💡 关键限制与 AI 提醒行为准则（划重点）

> ⚠️ **对 AI 的工作约束**：
> 1. 作为 AI 助手，你**无法自己切换 VS Code 的 Agent**。切 Agent 的操作必须由用户在客户端手动选择。
> 2. 当用户在 **P9000AG7 专属 Project Agent** 会话下要求你运行此 Redmine Skill（或者任何需要浏览器交互的任务）时，你会发现自己的工具库中没有 `read_page` / `run_playwright_code` 等浏览器接口。
> 3. **你此时要做的事就是坚决、主动地提醒用户**，而不是尝试用 `curl` 等方式自行绕过。请直接在第一句中向用户发送以下回复：
>    > *“您当前使用的是 P9000AG7 专属 Project Agent。在此模式下，我的浏览器操作工具链已被 VS Code 屏蔽（无法使用 `read_page` / Playwright 进行网页自动填写）。为了帮您自动更新 Redmine，请您在客户端聊天窗口中，将 Agent 切换回「默认 Agent」或「默认 Copilot」，然后再交给我处理。”*

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
