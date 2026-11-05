# KVM Injector Usage

## 用途

`kvm_injector.js` 用于在支持 Playwright / `run_playwright_code` 的 Agent 中，通过 KVM 页面内部的键盘事件处理函数稳定投递大小写、数字、常见符号和回车。

## 适用前提

- 当前 Agent 能执行浏览器脚本。
- KVM 页面存在隐藏焦点输入框，常见为 `input#kvm_textbox`。
- 页面内部为 AMI HTML5 Viewer 或类似的 `onkeydown` / `onkeyup` 键盘事件模型。

## 调用模式

1. 读取脚本文件内容：

```javascript
const injectorCode = "...kvm_injector.js content...";
```

2. 在浏览器页面上下文注入并调用：

```javascript
return await page.evaluate(async (codeText) => {
  eval(codeText);
  return await window.kvmInjectString("echo YOUR_UPPERCASE_CMD\n", 30);
}, injectorCode);
```

## 关键时序

- Shift down 后等待 15ms。
- 主键 keydown 后等待 25ms。
- 主键 keyup 后等待 15ms。
- Shift up 后等待 15ms。
- 字符之间默认等待 30ms。

## 验证要求

- 注入后必须截图或读取输出，确认字符真实进入 Host shell。
- 若出现乱码、缺字符、重复字符，应提高字间延迟，例如 50ms 或 80ms。
- 若页面没有 `kvm_textbox` 或事件模型不匹配，应停止脚本化输入，改用用户手动输入或重新分析页面 DOM。

## 限制

- 不要用该脚本输入密码、token、API key 等敏感信息。
- 不要仅凭脚本返回成功判断 Host 已执行命令；必须看 Host 输出或用 BMC/本地侧证据闭环。
