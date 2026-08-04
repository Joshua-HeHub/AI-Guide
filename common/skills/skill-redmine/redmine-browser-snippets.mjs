#!/usr/bin/env node

const REDMINE_BASE_URL = 'https://10.99.182.200:8443';

function indent(lines, spaces = 2) {
  const prefix = ' '.repeat(spaces);
  return lines.map((line) => `${prefix}${line}`).join('\n');
}

export function buildIssueUrl(issueIdExpression = 'issueId') {
  return `${REDMINE_BASE_URL}/issues/${issueIdExpression}`;
}

export function buildFillIssueNotesSnippet(noteExpression = 'noteContent') {
  return [
    'await page.evaluate((text) => {',
    indent([
      "const ta = document.getElementById('issue_notes');",
      'if (!ta) return;',
      '',
      'ta.value = text;',
      "ta.dispatchEvent(new Event('input', { bubbles: true }));",
      "ta.dispatchEvent(new Event('change', { bubbles: true }));",
    ]),
    `}, ${noteExpression});`,
  ].join('\n');
}

export function buildSubmitIssueNotesSnippet(formSelector = 'form#issue-form, form.edit_issue') {
  return [
    'await page.evaluate(() => {',
    indent([
      `const form = document.querySelector(${JSON.stringify(formSelector)});`,
      'if (!form) return;',
      '',
      "const submit = form.querySelector('input[type=submit], button[type=submit]');",
      'if (submit) submit.click();',
    ]),
    '});',
  ].join('\n');
}

export function buildVerifyIssueJournalSnippet() {
  return [
    'return await page.evaluate(() => {',
    indent([
      "const journals = document.querySelectorAll('.journal');",
      'return {',
      indent([
        'count: journals.length,',
        'lastText: journals.length',
        '  ? journals[journals.length - 1].textContent.trim().substring(0, 200)',
        "  : 'none'",
      ]),
      '};',
    ]),
    '});',
  ].join('\n');
}

export function buildUploadScreenshotSnippet() {
  return [
    "const buf = await page.screenshot({ type: 'png', fullPage: false });",
    "const base64 = buf.toString('base64');",
    '',
    'const uploadResult = await page.evaluate(async (b64) => {',
    indent([
      "const authToken = document.querySelector('input[name=\"authenticity_token\"]')?.value;",
      '',
      'const binary = atob(b64);',
      'const bytes = new Uint8Array(binary.length);',
      'for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);',
      "const blob = new Blob([bytes], { type: 'application/octet-stream' });",
      '',
      "const res = await fetch('/uploads.js', {",
      indent([
        "method: 'POST',",
        'headers: {',
        indent([
          "'Content-Type': 'application/octet-stream',",
          "'X-CSRF-Token': authToken,",
          "'X-Requested-With': 'XMLHttpRequest',",
          "'Accept': 'application/json, text/javascript, */*'",
        ]),
        '},',
        'body: blob,',
        "credentials: 'include'",
      ]),
      '});',
      '',
      'return { status: res.status, body: await res.text() };',
    ]),
    '}, base64);',
  ].join('\n');
}

export function buildParseUploadTokenSnippet() {
  return [
    "const tokenMatch = uploadResult.body.match(/\\.val\\('([^']+)'\\)/);",
    'const uploadToken = tokenMatch?.[1];',
    'const attachId = uploadToken?.split(\'.\')[0];',
  ].join('\n');
}

export function buildAttachScreenshotSnippet({
  issueIdExpression = '31105',
  tokenExpression = 'uploadToken',
  filenameExpression = "'screenshot.png'",
  noteExpression = 'noteText',
} = {}) {
  return [
    'const noteText = `h2. 标题\\n\\n说明文字\\n\\n!screenshot.png!\\n`;',
    '',
    'await page.evaluate(async ({ token, fname, note, issueId }) => {',
    indent([
      "const authToken = document.querySelector('input[name=\"authenticity_token\"]')?.value;",
      '',
      'const formData = new FormData();',
      'formData.append(\'authenticity_token\', authToken);',
      'formData.append(\'issue[notes]\', note);',
      'formData.append(\'attachments[0][token]\', token);',
      'formData.append(\'attachments[0][filename]\', fname);',
      'formData.append(\'attachments[0][content_type]\', \'image/png\');',
      "formData.append('_method', 'put');",
      '',
      'await fetch(`/issues/${issueId}`, {',
      indent([
        "method: 'POST',",
        "headers: { 'X-CSRF-Token': authToken },",
        'body: formData,',
        "credentials: 'include',",
        "redirect: 'follow'",
      ]),
      '});',
    ]),
    `}, { token: ${tokenExpression}, fname: ${filenameExpression}, note: ${noteExpression}, issueId: ${issueIdExpression} });`,
  ].join('\n');
}

export function buildOneShotNoteSnippet({
  issueIdExpression = '31105',
  noteExpression = 'noteContent',
  formSelector = 'form.edit_issue',
} = {}) {
  return [
    `await navigate_page(pageId, ${JSON.stringify(buildIssueUrl(issueIdExpression))});`,
    '',
    buildFillIssueNotesSnippet(noteExpression),
    '',
    buildSubmitIssueNotesSnippet(formSelector),
    '',
    buildVerifyIssueJournalSnippet(),
  ].join('\n');
}

export function buildSnippet(name, options = {}) {
  switch (name) {
    case 'fill-note':
      return buildFillIssueNotesSnippet(options.noteExpression);
    case 'submit-note':
      return buildSubmitIssueNotesSnippet(options.formSelector);
    case 'verify-journal':
      return buildVerifyIssueJournalSnippet();
    case 'upload-screenshot':
      return buildUploadScreenshotSnippet();
    case 'parse-upload-token':
      return buildParseUploadTokenSnippet();
    case 'attach-screenshot':
      return buildAttachScreenshotSnippet(options);
    case 'one-shot-note':
      return buildOneShotNoteSnippet(options);
    default:
      throw new Error(`Unknown snippet name: ${name}`);
  }
}

function printHelp() {
  const lines = [
    'Usage: node redmine-browser-snippets.mjs <snippet-name>',
    '',
    'Available snippets:',
    '  fill-note',
    '  submit-note',
    '  verify-journal',
    '  upload-screenshot',
    '  parse-upload-token',
    '  attach-screenshot',
    '  one-shot-note',
  ];
  console.log(lines.join('\n'));
}

const isMainModule = process.argv[1] && process.argv[1].endsWith('redmine-browser-snippets.mjs');

if (isMainModule) {
  const snippetName = process.argv[2];
  if (!snippetName || snippetName === 'help' || snippetName === '--help' || snippetName === '-h') {
    printHelp();
  } else {
    try {
      console.log(buildSnippet(snippetName));
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}