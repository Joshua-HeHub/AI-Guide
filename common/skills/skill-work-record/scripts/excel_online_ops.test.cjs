const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getExcelFrame, probeClipboardWrite, assertIdle, validateFields, validateTargetRange,
  expandSingleRowAddresses, preflight, pasteTsvRow, readbackSelection
} = require('./excel_online_ops.js');

function makeFrame({ visible = true, editing = false, selected = true, formulaValues = [] } = {}) {
  const calls = [];
  let formulaIndex = 0;
  const locator = {
    count: async () => 1,
    isVisible: async () => visible,
    getAttribute: async name => {
      if (name === 'class') return editing ? 'okbox' : 'okbox button-disabled';
      if (name === 'aria-selected') return String(selected);
      return null;
    },
    innerText: async () => formulaValues[formulaIndex++] ?? '\n',
    click: async () => calls.push('click'),
    fill: async () => calls.push('fill'),
    press: async () => calls.push('press'),
    first() { return this; },
    waitFor: async () => calls.push('wait')
  };
  return { calls, url: () => '', getByRole: () => locator };
}

test('discovers a visible workbook without depending on its frame URL', async () => {
  const hidden = makeFrame({ visible: false });
  const workbook = makeFrame();
  assert.equal(await getExcelFrame({ frames: () => [hidden, workbook] }), workbook);
});

test('rejects ambiguous workbook frames', async () => {
  await assert.rejects(getExcelFrame({ frames: () => [makeFrame(), makeFrame()] }),
    { code: 'WORKBOOK_UNAVAILABLE' });
});

test('a visible but CSS-disabled commit button is not an active edit', async () => {
  await assertIdle(makeFrame());
  await assert.rejects(assertIdle(makeFrame({ editing: true })), { code: 'ACTIVE_EDIT' });
});

test('clipboard write probe accepts frame or page write without requiring readText', async () => {
  for (const value of [false, '', undefined]) {
    await assert.rejects(probeClipboardWrite(null, { evaluate: async () => value }),
      { code: 'CLIPBOARD_UNAVAILABLE' });
  }
  await probeClipboardWrite({ evaluate: async () => true }, { evaluate: async () => false });
  await probeClipboardWrite({ evaluate: async () => false }, { evaluate: async () => true });
});

test('unavailable clipboard stops before navigation or typing', async () => {
  const frame = makeFrame();
  const page = { frames: () => [frame], evaluate: async () => false };
  await assert.rejects(preflight(page), { code: 'CLIPBOARD_UNAVAILABLE' });
  await assert.rejects(pasteTsvRow(page, ['完成'], {
    targetRange: 'C5:C5', sheetTabName: '工作表 P9500AG7'
  }), { code: 'CLIPBOARD_UNAVAILABLE' });
  assert.deepEqual(frame.calls, []);
});

test('rejects embedded row separators and formula prefixes', () => {
  validateFields(['2026/11/17', '完成', '', 'eth0 排查']);
  for (const value of ['=1', '+1', '-1', '@SUM(A1)', ' =1', 'row\nnext', 'col\tnext']) {
    assert.throws(() => validateFields([value]), { code: 'INVALID_FIELDS' });
  }
});

test('paste range must match exactly one row and all fields', () => {
  validateTargetRange('B5:H5', 7);
  validateTargetRange('Z5:AB5', 3);
  for (const range of ['B5:H6', 'H5:B5', 'B5:C5', 'B5', 'B0:H0']) {
    assert.throws(() => validateTargetRange(range, 7), { code: 'INVALID_RANGE' });
  }
});

test('wrong worksheet cannot receive a paste', async () => {
  const frame = makeFrame({ selected: false });
  const page = { frames: () => [frame], evaluate: async () => true };
  await assert.rejects(pasteTsvRow(page, ['完成'], {
    targetRange: 'C5:C5', sheetTabName: '工作表 P9500AG7'
  }), { code: 'WRONG_SHEET' });
  assert.deepEqual(frame.calls, []);
});

test('formula-bar readback retains empty cells without requiring clipboard-read permission', async () => {
  assert.deepEqual(expandSingleRowAddresses('C5:E5'), ['C5', 'D5', 'E5']);
  const frame = makeFrame({ formulaValues: ['完成\n', '\n', '备注'] });
  const page = {
    frames: () => [frame],
    keyboard: { press: async () => {} }
  };
  assert.deepEqual(await readbackSelection(page, ['完成', '', '备注'], { targetRange: 'C5:E5' }),
    { actual: ['完成', '', '备注'] });
});

test('formula-bar mismatch raises READBACK_MISMATCH', async () => {
  const page = {
    frames: () => [makeFrame({ formulaValues: ['wrong\n'] })],
    keyboard: { press: async () => {} }
  };
  await assert.rejects(readbackSelection(page, ['完成'], { targetRange: 'C5:C5' }),
    { code: 'READBACK_MISMATCH' });
});
