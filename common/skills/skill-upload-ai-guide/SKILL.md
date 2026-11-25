---
name: skill-upload-ai-guide
description: '整理并发布本地 AI 指南到公网 GitHub 镜像仓库 Joshua-HeHub/AI-Guide。'
argument-hint: '说明要上传的目录或文件；可选说明是否只检查、不提交或不推送'
disable-model-invocation: true
user-invocable: true
---

# 上传 AI 指南到公网 GitHub

## 固定目标

- **公网仓库**：`https://github.com/Joshua-HeHub/AI-Guide.git`，默认分支 `main`
- **推送协议**：写操作使用 SSH 远端 `git@github.com:Joshua-HeHub/AI-Guide.git`（key 认证）；HTTPS 仅用于只读克隆
- **本地上传副本**：`/home/zlsu/bmcrepo/AI-Guide-upload/`（首次使用时 `git clone` 创建；换位置只改本行）
- **内容来源**：本项目 `/home/zlsu/bmcrepo/RR12_1_07/.github/`（生效技能与指南）及个人级配置，按用户指定范围选择
- **已知基线**：历史同步提交 `fda605b`；执行时以当前远端和本地状态为准

## 环境适配注记

- 本版为本机（`/home/zlsu`）适配；早期版本为 `/bmc/joshua` 软链环境所写。换机器使用时仅需修改"本地上传副本"路径。
- **认证（2026-11-25 已验证）**：本机 `~/.ssh/id_ed25519` 已绑定 GitHub 账号 Joshua-HeHub，推送全程免密。入口自检：`ssh -T git@github.com` 返回 `Hi Joshua-HeHub!` 即就绪。
- **指纹陷阱**：首次连接报 `Host key verification failed` 是 known_hosts 缺 github.com 指纹，不是认证失败；在命令上加 `-o StrictHostKeyChecking=accept-new` 接受一次即可，不要改走 HTTPS 密码路径。
- 方向分工：本技能是发布（本地 → 公网）；反向拉取用 `skill-sync-guide`，推回 Gerrit 评审用 `skill-ai-guide-backup`。

## 执行流程

1. **确认范围**：明确本次要发布的目录、文件或全部指南；只取 `.github/` 下确认为 AI 指南的内容，不把固件仓库其它内容混入。
2. **准备副本**：上传副本不存在时先 clone；存在时先 `git fetch origin main` 获取远端最新状态；存在远端新提交时，先审查差异并合并或重新整理，不覆盖远端历史。
3. **整理文件**：只复制已确认属于 AI 指南的内容，保持 `common/` 与 `P9000AG7/` 的边界；保留必要的 README、agents、instructions、skills、memories 和脚本目录结构。
4. **敏感信息扫描**：提交前搜索密码、Token、私钥、Cookie、内网凭据、串口凭据、真实机台账号和未经脱敏的内部地址。发现疑似敏感内容时暂停上传并列出文件和位置，由用户决定脱敏或排除。
5. **审查差异**：查看 `git status` 和 `git diff --stat`，再检查完整 diff；确认没有大文件、构建产物、日志、临时目录或用户未授权的改动。
6. **本地验证**：检查新增或修改的 skill frontmatter、引用路径和 Markdown 结构；对脚本只做静态检查，除非用户明确要求执行。
7. **提交前确认**：向用户报告待提交文件、差异摘要、敏感信息扫描结果和拟用提交信息。用户未明确同意时，只完成检查，不执行 commit 或 push。
8. **提交与推送**：获得明确授权后，在上传副本创建提交并推送 `main`；不要使用 `--force`，不要改写远端历史。推送默认走 SSH key 认证：确认远端为 SSH 地址（`git remote -v`，必要时 `git remote set-url origin git@github.com:Joshua-HeHub/AI-Guide.git`）后直接 `git push origin main`；用 `ssh -T git@github.com` 的 `Hi Joshua-HeHub!` 输出确认认证身份。密码、Token、私钥不索取、不记录、不经 HTTPS 凭据提示输入。
9. **闭环复核**：推送后读取 push 返回值，查询远端 `main` 的最新提交，并用 GitHub 页面或公开 Git 引用确认仓库可访问；记录提交 ID、时间、范围和未验证事项。

## 推荐检查命令

以下命令均在 `/home/zlsu/bmcrepo/AI-Guide-upload/` 执行；遵守当前环境的终端日志记录规则：

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

只有同时满足以下条件，才能报告"已上传"：

- 本地差异已审查，范围与用户要求一致。
- 敏感信息扫描无未处理命中。
- 用户明确授权了 commit 和 push。
- push 成功，且远端 `main` 可读到新提交。

仅完成整理、检查或本地提交时，必须分别报告为"已整理""已检查"或"已本地提交"，不得称为已上传。任何未执行的实机、网页或远端验证都必须标记为"未验证"。