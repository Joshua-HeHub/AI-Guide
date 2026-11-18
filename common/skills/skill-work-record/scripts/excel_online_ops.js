function operationError(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code });
}

async function getExcelFrame(page) {
  const matches = [];
  for (const frame of page.frames()) {
    const nameBox = frame.getByRole('combobox', { name: /名称框/ });
    if (await nameBox.count() === 1 && await nameBox.isVisible()) matches.push(frame);
  }
  if (matches.length !== 1) {
    throw operationError('WORKBOOK_UNAVAILABLE', 'Expected one visible workbook frame');
  }
  return matches[0];
}

async function probeClipboardWrite(excelFrame, page, timeoutMs = 1500) {
  const token = `work-record-probe-${Date.now()}-${Math.random()}`;
  const writeOn = async target => target.evaluate(async ({ expected, timeoutMs }) => {
    let timer;
    try {
      return await Promise.race([
        navigator.clipboard.writeText(expected).then(() => true),
        new Promise(resolve => { timer = setTimeout(() => resolve(false), timeoutMs); })
      ]);
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }, { expected: token, timeoutMs });
  const ok = (excelFrame && typeof excelFrame.evaluate === 'function' && await writeOn(excelFrame) === true)
    || (page && typeof page.evaluate === 'function' && await writeOn(page) === true);
  if (ok !== true) {
    throw operationError('CLIPBOARD_UNAVAILABLE', 'Clipboard write failed; stop before editing');
  }
}

async function assertIdle(excelFrame) {
  const commit = excelFrame.getByRole('button', { name: 'commit edit', exact: true });
  if (await commit.count() === 0 || !await commit.isVisible()) return;
  const className = await commit.getAttribute('class') || '';
  const disabled = await commit.getAttribute('aria-disabled') === 'true'
    || await commit.getAttribute('disabled') !== null
    || className.split(/\s+/).includes('button-disabled');
  if (!disabled) throw operationError('ACTIVE_EDIT', 'Leave the existing cell edit untouched');
}

function validateFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0 || fields.some(value => typeof value !== 'string')) {
    throw operationError('INVALID_FIELDS', 'Expected a nonempty array of strings');
  }
  if (fields.some(value => /[\t\r\n]/.test(value) || /^[\s]*[=+@-]/.test(value))) {
    throw operationError('INVALID_FIELDS', 'Use plain single-line values without formula prefixes');
  }
}

function validateTargetRange(targetRange, fieldCount) {
  const match = /^([A-Z]+)([1-9]\d*):([A-Z]+)([1-9]\d*)$/.exec(targetRange || '');
  const columnIndex = column => Array.from(column).reduce(
    (total, character) => total * 26 + character.charCodeAt(0) - 64, 0);
  if (!match || match[2] !== match[4]
    || columnIndex(match[3]) - columnIndex(match[1]) + 1 !== fieldCount) {
    throw operationError('INVALID_RANGE', 'Range must cover exactly one row with the expected field count');
  }
}

function expandSingleRowAddresses(targetRange) {
  const match = /^([A-Z]+)([1-9]\d*):([A-Z]+)([1-9]\d*)$/.exec(targetRange || '');
  const toIndex = col => Array.from(col).reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  const toCol = idx => {
    let s = '';
    for (let n = idx; n > 0; n = Math.floor((n - 1) / 26)) {
      s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    }
    return s;
  };
  if (!match || match[2] !== match[4] || toIndex(match[3]) < toIndex(match[1])) {
    throw operationError('INVALID_RANGE', 'Expected a valid single-row range');
  }
  const addresses = [];
  for (let i = toIndex(match[1]); i <= toIndex(match[3]); i++) {
    addresses.push(`${toCol(i)}${match[2]}`);
  }
  return addresses;
}

async function preflight(page) {
  const excelFrame = await getExcelFrame(page);
  await assertIdle(excelFrame);
  await probeClipboardWrite(excelFrame, page);
  return { ready: true, strategy: 'clipboard-write+formula-readback', workbookEdited: false };
}

async function selectRangeByNameBox(page, targetRange, options = {}) {
  if (!/^[A-Z]+[1-9]\d*(?::[A-Z]+[1-9]\d*)?$/.test(targetRange)) {
    throw operationError('INVALID_RANGE', 'Expected a concrete cell or range');
  }
  const excelFrame = await getExcelFrame(page);
  await assertIdle(excelFrame);
  const nameBox = excelFrame.getByRole('combobox', { name: /名称框/ });
  const timeout = options.timeoutMs ?? 3000;
  await nameBox.click({ timeout });
  await nameBox.fill(targetRange, { timeout });
  await nameBox.press('Enter', { timeout });
  await excelFrame.getByRole('button', {
    name: new RegExp('选定区域 ' + targetRange)
  }).first().waitFor({ state: 'attached', timeout });
  return { requestedRange: targetRange };
}

async function pasteTsvRow(page, fields, options = {}) {
  validateFields(fields);
  validateTargetRange(options.targetRange, fields.length);
  await preflight(page);
  const excelFrame = await getExcelFrame(page);
  const selectedTab = excelFrame.getByRole('tab', { name: options.sheetTabName, exact: true });
  if (!options.sheetTabName || await selectedTab.getAttribute('aria-selected') !== 'true') {
    throw operationError('WRONG_SHEET', 'Select and verify the intended worksheet first');
  }
  await selectRangeByNameBox(page, options.targetRange, options);
  const tsv = fields.join('\t');
  const wroteOnFrame = typeof excelFrame.evaluate === 'function'
    && await excelFrame.evaluate(text => navigator.clipboard.writeText(text).then(() => true, () => false), tsv);
  if (!wroteOnFrame) {
    await page.evaluate(text => navigator.clipboard.writeText(text), tsv);
  }
  await page.keyboard.press('Control+v');
  if (typeof page.waitForTimeout === 'function') await page.waitForTimeout(600);
  const result = await readbackSelection(page, fields, options);
  return { action: 'pasted', readbackVerified: true, persistedAfterReload: false, ...result };
}

async function readbackSelection(page, expectedFields, options = {}) {
  const excelFrame = await getExcelFrame(page);
  await assertIdle(excelFrame);
  if (!options.targetRange) throw operationError('INVALID_RANGE', 'targetRange is required');
  validateTargetRange(options.targetRange, expectedFields.length);
  await page.keyboard.press('Escape');
  const addresses = expandSingleRowAddresses(options.targetRange);
  const nameBox = excelFrame.getByRole('combobox', { name: /名称框/ });
  const formula = excelFrame.getByRole('textbox', { name: 'formula bar', exact: true });
  const timeout = options.timeoutMs ?? 4000;
  const actual = [];
  for (const addr of addresses) {
    await nameBox.click({ timeout });
    await nameBox.fill(addr, { timeout });
    await nameBox.press('Enter', { timeout });
    await excelFrame.getByRole('button', {
      name: new RegExp('(^| )' + addr + '($| )')
    }).first().waitFor({ state: 'attached', timeout });
    actual.push((await formula.innerText()).replace(/\r?\n$/, ''));
  }
  if (JSON.stringify(actual) !== JSON.stringify(expectedFields)) {
    throw operationError('READBACK_MISMATCH', 'Formula-bar values differ from the expected row: ' + JSON.stringify(actual));
  }
  return { actual };
}

async function waitForSaved(page, options = {}) {
  const excelFrame = await getExcelFrame(page);
  const timeout = options.timeoutMs ?? 5000;
  await excelFrame.getByRole('button', { name: /正在保存/ }).first().waitFor({ state: 'hidden', timeout });
  const saved = excelFrame.getByRole('button', { name: /上次保存时间|已保存/ }).first();
  await saved.waitFor({ state: 'visible', timeout });
  const saveState = await saved.getAttribute('aria-label');
  if (!/上次保存时间|已保存/.test(saveState || '')) {
    throw operationError('SAVE_UNVERIFIED', 'A saved indicator was not confirmed');
  }
  return { saveState, persistedAfterReload: false };
}

if (typeof module !== 'undefined') {
  module.exports = { getExcelFrame, probeClipboardWrite, assertIdle, validateFields,
    validateTargetRange, expandSingleRowAddresses, preflight, selectRangeByNameBox,
    pasteTsvRow, readbackSelection, waitForSaved };
}
