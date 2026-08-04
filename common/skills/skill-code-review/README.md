# skill-code-review 上游说明

## 来源

当前目录中的本地版 skill 参考了以下公开仓库的能力设计：

- GitHub 仓库：https://github.com/iasiv5/code-review

已确认该上游仓库包含：

- `SKILL.md`
- `resources/REVIEW-CHECKLIST.md`
- `resources/FEEDBACK-GUIDELINES.md`

## 当前仓库的处理方式

这里没有直接镜像上游原文，而是保留其核心能力后，按当前仓库的命名、触发方式和使用习惯重写为本地版：

- skill 名称统一使用 `skill-` 前缀
- 内容更贴合当前仓库已有 skill 的中文风格
- 输出要求与当前 Copilot review 习惯保持一致
- 资源文档保留为“审查检查清单 + 反馈指南”两部分

## 为什么不直接照搬

当前未在上游仓库页面确认到明确的许可声明，因此这里优先采用“参考思路后本地改写”的方式，避免把外部内容整份 vendor 进仓库。

如果后续你确认要切换成更贴近上游原文的版本，建议先补充许可确认，再决定是否同步全文。