# Redmine Markdown Format And Recovery

仅在从外部文档转写内容、Markdown / Textile 模式不明确，或处理历史渲染错误时加载。

## Redmine Format

本实例 `https://10.99.182.200:8443` 的 wiki 引擎使用 Markdown（CommonMark）。description 和 Notes 应使用 Markdown 语法：

| Textile 写法 | Redmine Markdown 写法 | 常见结果 |
|---|---|---|
| `h2. 标题` | `## 标题` | `h2.` 会作为普通文本显示 |
| `@code@` | `` `code` `` | `@...@` 不会按行内代码渲染 |
| `# @IMAGE_INSTALL:append@ ...` | `1. \`IMAGE_INSTALL:append\` ...` | Textile 列表写法可能被解析成 Markdown H1 |
| `<pre>...</pre>` | 围栏代码块 | `<pre>` 在部分内容中无法按预期渲染 |
| `*bold*` | `**bold**` | Textile 单星号格式不适用 |

首次写入 description 或 Notes 前，确认编辑器处于 Markdown 模式。外部文档语法不明时先识别，再转换为 CommonMark；不要把 Textile 标记原样复制进 Redmine。旧 issue 若已有 Textile 格式，保持该正文原样，除非用户明确要求迁移。

## Note Recovery

Redmine Notes（journal）提交后不可编辑。发现旧 note 的标题或列表渲染错误时，追加正确格式的新 note，并在开头说明：“注：上一条 note 误用了 Textile 语法，本条为正确版本”。提交后检查标题实际渲染为目标 H2/H3；成功提示不能代替渲染验证。
