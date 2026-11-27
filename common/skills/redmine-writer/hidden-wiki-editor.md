# Hidden Wiki Editor Fields

仅在通过登录门禁后，确认本次目标 textarea 存在但 wiki editor 将其隐藏、导致 `locator.fill()` 不可用时加载。

## Set Only Approved Fields

将草稿中已获用户确认的完整内容放入本次实际变更字段；其他字段设为 `null`。空字符串不用于清空字段，未批准的字段保持 `null`。此调用只设置值，不提交表单。

```js
const approvedValues = {
  description: null,
  notes: null
}; // 将已确认草稿原文放入需修改字段；其余保持 null

const result = await page.evaluate(({ values }) => {
  const selectors = {
    description: '#issue_description',
    notes: '#issue_notes'
  };
  const entries = Object.entries(values).filter(([, value]) => value !== null);
  if (entries.length === 0) return {ok: false, reason: 'no-approved-fields'};

  for (const [name, value] of entries) {
    if (!Object.prototype.hasOwnProperty.call(selectors, name)) return {ok: false, reason: 'unknown-field'};
    if (typeof value !== 'string' || value.length === 0 ||
        /^(正文内容占位|Notes 占位|TODO|PLACEHOLDER)$/i.test(value.trim())) {
      return {ok: false, reason: 'empty-or-placeholder-value'};
    }
    const el = document.querySelector(selectors[name]);
    if (!(el instanceof HTMLTextAreaElement)) return {ok: false, reason: 'field-not-found'};
  }

  for (const [name, value] of entries) {
    const el = document.querySelector(selectors[name]);
    el.value = value;
    el.dispatchEvent(new Event('input', {bubbles: true}));
    el.dispatchEvent(new Event('change', {bubbles: true}));
  }

  return {
    ok: entries.every(([name, value]) =>
      document.querySelector(selectors[name]).value === value),
    updated: entries.map(([name]) => name)
  };
}, {values: approvedValues});
return JSON.stringify(result);
```

返回的 `ok` 已表示 DOM 当前值与输入逐项一致。只有 `ok: true` 且 `updated` 与草稿变更字段一致时才继续；随后单独提交，不把字段正文返回到聊天。

## Submit Separately

回读一致后，使用与创建 / 更新操作相符的明确提交按钮单独提交。不要在设置字段的 `page.evaluate()` 中调用 `requestSubmit()`，也不要使用通用占位内容。提交后按主 skill 的 **紧凑字段扫描 / 提交后验证模板** 核对目标 issue ID、flash/error 和本次改动字段；任何不匹配都停止并报告失败。
