---
name: skill-upload-ai-guide
description: '将当前 Joshua AI 指南整理并同步到公网 GitHub 仓库。用户明确要求上传、发布、同步现有 skills、instructions、agents 或 memories 到 AI-Guide-Joshua 时使用。'
argument-hint: '说明要上传的目录或文件；可选说明是否只检查、不提交或不推送'
user-invocable: true
---

# 上传 AI 指南

## 固定目标

- **公网仓库**：`https://github.com/Joshua-HeHub/AI-Guide.git`
- **本地上传副本**：`/bmc/joshua/AI-Guide-upload/`
- **默认分支**：`main`
- **已知基线**：历史同步提交 `fda605b`；执行前必须以当前远端和本地状态为准。
- **同步范围**：按用户指定范围处理；未指定时检查 `common/`、`P9000AG7/`、根目录说明文件及相关同步脚本。

## 执行流程

1. **确认范围**：明确本次要发布的目录、文件或全部指南；将 `/bmc/joshua/.github/` 解析到实际保存目录，避免把固件仓库内容误当成指南仓库。
2. **检查远端**：在上传副本中确认 `origin`、当前分支和远端 `main`，先获取远端最新状态；存在远端新提交时，先审查差异并合并或重新整理，不覆盖远端历史。
3. **整理文件**：只复制已确认属于 AI 指南的内容，保持 `common/` 与 `P9000AG7/` 的边界；保留必要的 README、agents、instructions、skills、memories 和脚本目录结构。
4. **敏感信息扫描**：提交前搜索密码、Token、私钥、Cookie、内网凭据、串口凭据、真实机台账号和未经脱敏的内部地址。发现疑似敏感内容时暂停上传并列出文件和位置，由用户决定脱敏或排除。
5. **审查差异**：查看 `git status` 和 `git diff --stat`，再检查完整 diff；确认没有大文件、构建产物、日志、临时目录或用户未授权的改动。
6. **本地验证**：检查新增或修改的 skill frontmatter、引用路径和 Markdown 结构；对脚本只做静态检查，除非用户明确要求执行。
7. **提交前确认**：向用户报告待提交文件、差异摘要、敏感信息扫描结果和拟用提交信息。用户未明确同意时，只完成检查，不执行 commit 或 push。
8. **提交与推送**：获得明确授权后，在上传副本创建提交并推送 `main`；不要使用 `--force`，不要改写远端历史。涉及认证时让用户在终端完成，技能不得索取或记录密码、Token、私钥。
9. **闭环复核**：推送后读取 push 返回值，查询远端 `main` 的最新提交，并用 GitHub 页面或公开 Git 引用确认仓库可访问；记录提交 ID、时间、范围和未验证事项。

## 推荐检查命令

以下命令均在 `/bmc/joshua/AI-Guide-upload/` 执行；实际执行时遵守当前环境的终端日志记录规则：

```bash
git remote -v
git status --short
git fetch origin main
git log --oneline --decorate -5 --all
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

敏感信息扫描应优先使用可审计的关键词和文件类型检查，并人工复核命中结果；不要把完整凭据输出到聊天或日志。至少检查：

```text
password, passwd, token, api_key, secret, private key, BEGIN .* PRIVATE KEY
```

## 结果标准

只有同时满足以下条件，才能报告“已上传”：

- 本地差异已审查，范围与用户要求一致。
- 敏感信息扫描无未处理命中。
- 用户明确授权了 commit 和 push。
- push 成功，且远端 `main` 可读到新提交。

仅完成整理、检查或本地提交时，必须分别报告为“已整理”“已检查”或“已本地提交”，不得称为已上传。任何未执行的实机、网页或远端验证都必须标记为“未验证”。