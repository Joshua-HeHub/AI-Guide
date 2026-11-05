---
name: skill-track-handler
description: "用于操作 IPT Track 内部缺陷系统：读取 Track/SIT 报告、下载并分析一键日志、关联源码定位根因、填写 Root Cause 和 Comments/Answer、提交回复并回读验证。适用于用户提到 Track、IPT Tracking、SIT 报告、Defect、Track bug、读取 track、回复 track、更新 track、写根因、一键日志、Answer/Change、AttachFilesEx。"
argument-hint: "例如：分析 Track 60980073 的 SIT 报告并回复根因；读取附件一键日志后更新 Root Cause"
user-invocable: true
---

# Track Handler Skill

## 目标

将 Track 缺陷处理闭环为：

1. 通读完整报告和附件，对照需求基线、测试基线及实际通用使用/业界场景，先判断是否真的是 Bug。
2. 只有确认是 Bug，才从一键日志建立时间线并继续根因查找和方案设计；非 Bug 或待确认按下方前置判断分支处理。
3. 对确认的 Bug 沿源码调用链验证根因。
4. 区分根因、现象、日志归类和未验证假设。
5. 按用户要求填写 Root Cause、Comments/Answer 或状态。
6. 提交后回到只读页面验证内容已落库。

默认只分析和回复 Track，不修改源码、不构建固件、不操作真实机台，除非用户明确要求。

## 账号与安全

- 优先复用当前浏览器的已登录 Track 会话。
- 本次用户授权的内部测试账号保存在本机私有文件 `/bmc/joshua/.config/track_handler/credentials`，文件权限必须保持为 `600`；该文件不属于 skill 内容，也不应加入 Git。
- 会话过期时，允许从该私有文件读取凭据并在浏览器登录页填写；只在内存中使用，不在聊天、终端输出、工作日志、源码、Track 评论或附件中回显密码。
- 不要通过 `vscode_askQuestions` 收集密码，也不要把凭据拼接进终端命令或 URL。
- 下载附件后只分析必要文件；不要展示 `shadow`、私钥、证书、SSH key 或其他敏感配置内容。
- Track 写操作必须有用户明确请求；提交一次后先验证，不要因页面停留在编辑页而重复点击 Enter。

## 适用工具

浏览器操作优先使用当前可用的浏览器工具：

- `read_page`：读取报告字段、附件链接和当前页面状态。
- `open_browser_page`：打开 Track 表单或附件页面。
- `run_playwright_code`：在同一浏览器会话中读取 DOM、下载附件、提交表单并验证结果。
- `click_element`：点击普通页面按钮；老旧页面不可见时改用 Playwright `click({force: true})` 或原生表单提交。

终端操作遵循项目规则：使用 `rtk`，并记录到 `/tmp/AI_terminal/YYYYMMDD.log`；禁止直接把大日志全部读入上下文。

## 流程一：读取 Track 报告

1. 读取当前 Track 页面，记录：Defect ID、Project、Priority、Status、Owner、Submitter（提报者）、Synopsis、Detail Description、Comments/Answer、Root Cause 和附件列表。
2. 以 Defect ID 为主键保存工作上下文；不要只依赖浏览器页签标题或 Bookmark。
3. 重点提取：
   - 复现步骤和实际命令。
   - Expected/Current Behavior。
   - 测试时间、固件版本、BIOS/OS、Host/Box 配置。
   - 附件文件名、大小和上传时间。
4. 如果 Detail 文本过长，用 Playwright 读取对应 `textarea` 的 `value`，不要依赖无障碍快照的截断文本。

## 流程二：下载和校验一键日志

内部 Track 附件常见链接形式：

```text
AttachFilesEx%2F<defect-prefix>%2F<defect-id>%2F<filename>
```

优先在原 Track 浏览器会话中下载：

1. 读取附件 `<a>` 的 `href`。
2. 使用同源 `fetch(..., {credentials: "include"})` 获取附件，不能假设终端能直连内部域名。
3. 将附件保存到工作区隔离目录，例如：

```text
Downloads/track-<defect-id>/
```

4. 下载后必须验证：

```bash
rtk run 'gzip -t <archive> && tar -tzf <archive> | head -80'
```

5. 解压到隔离目录，不覆盖已有日志；若同名目录已存在，确认它属于当前 Defect 后再清理或使用新目录。
6. 若终端访问 `ipt-track2` 超时，不据此判定附件不存在；继续使用浏览器会话取证。

## 前置判断：是否真的是 Bug（强制）

在进入流程三至五的根因查找和方案设计前，必须完成以下判断，不得仅凭标题、Fail 标记或 Expected Behavior 直接认定为 Bug：

1. 通读整个问题描述，包括复现步骤、Current/Expected Behavior、`[Verification]`、历史回复和全部附件中的相关证据；不得跳过需求澄清、其他项目基线或附件中与初步判断相反的内容。
2. 对照该项目适用的需求基线和测试基线，结合实际通用使用场景、业界惯例及跨项目代码一致性评估当前行为。其他项目实现相同不自动证明存在通用 Bug；业界惯例和代码统一性也不能替代已确认的本项目需求。
3. 明确给出以下分支及证据依据：
  - **确认是 Bug**：实际行为违反适用且已确认的基线，或存在可验证的功能错误；才继续根因查找和方案设计。修改源码、构建、机台操作仍须用户明确授权。
  - **确认不是 Bug**：当前行为符合适用基线或合理设计，报告属于理解或预期差异；不继续设计修复。回复原因、基线依据及使用场景上的理由；必要时说明保持各项目代码统一的好处，建议保持当前设计。用户已授权回复/处理时，将 Owner assign 给 Submitter（提报者），Status 改为 `Answered`，Root Cause 保持空白。
  - **待确认**：需求/测试基线冲突、适用范围不明，或关键附件不可读取时，标明缺失证据和确认事项；不能擅自判为 Bug 或非 Bug，不进入修复方案设计，不擅自改变状态或 Owner。
4. Comments/Answer 只写面向提报者的判断和理由，不写“本 Track 先回复为 Answered”等状态操作说明，不机械承诺“下一版本解决”。

## 流程三：一键日志分析

按风险和信息密度优先读取：

```text
OneKeyLog/OneKeyLog.log
OneKeyLog/configuration/mc_info
OneKeyLog/configuration/fwinfo/bmc_ver_current
OneKeyLog/log/extlog/audit.log
OneKeyLog/log/log/notice.log
OneKeyLog/log/log/err.log
OneKeyLog/log/log/sel.log
OneKeyLog/runningdata/rundatainfo/ProcessStatus
OneKeyLog/runningdata/rundatainfo/IPMIMainps
OneKeyLog/runningdata/rundatainfo/sensor_list
OneKeyLog/runningdata/rundatainfo/sdr_elist
```

分析要求：

- 先用 `grep -n`、`grep -c`、`sed -n`、`head`、`tail` 缩小范围。
- 对报告中的命令和关键日志字符串做精确搜索，例如 `Set Sensor Threshold`、`KCS`、`Warm Reset`、`Cold Reset`、`GPUBox`、`threshold sync`、`threshold applied`。
- 对齐时间线：触发命令、服务/线程日志、实际操作日志、审计记录和完成日志。
- 统计成功与失败：数量、分组数量、`Normal`、`Err`，不能只摘一条样例。
- 先确认一键日志采集时间；采集开始前的日志可能来自更早的操作，不能直接归因于当前复现步骤。
- 如果 `syslog`/`messages` 为空，继续检查 `log/extlog/audit.log`、`log/log/*.log` 和 `runningdata/var/log/`。

## 流程四：源码定位

P9000AG7/P9500AG7 中涉及 GPUBox 阈值同步和审计归类时，优先检查：

```text
P9000AG7/packages/iecpack/packages/pdk/packages/libipmiiecpdk-src/data/iec_gpubox_device.c
P9000AG7/packages/common/packages/libipmipdkapi-src/data/CoreAPI.c
P9000AG7/packages/common/packages/libipmimsghndlr-src/data/MsgHndlr.c
P9000AG7/packages/iecpack/packages/common/packages/libipmiieccommon-src/data/iec_func_rsyslog.c
P9000AG7/packages/common/packages/libipmiieccommon-src/data/iec_thread_rsyslog.c
```

重点符号：

- GPUBox：`IECPreGPUBoxLinkStatusMon`、`IECGPUBoxDeviceRun`、`IECPostGPUBoxDeviceMon`、`IECGPUSetThreshold`。
- 内部 API：`API_SetSensorThresholds`、`API_ExecuteCmd`、`PDK_API_Q`。
- 请求处理：`ProcessIPMIReq`、`QSP_OPERATION_RSYSLOG_RECORD`。
- 审计归类：`IECGetInterfaceNameInfo`、`IECRecordOperationLog`、`IECRunOperationLog`。

必须区分以下四层：

1. **触发根因**：哪个功能、链路恢复、服务或请求触发了动作。
2. **实际动作**：哪个 API/命令修改了什么对象。
3. **日志表现**：审计模块如何格式化和记录该动作。
4. **测试结论**：为什么被判定为 Fail，是否与产品预期一致。

不要把 `KCS`、`N/A`、日志描述文字直接当作根因。先确认请求来源队列、`Channel`、`SessionType` 和实际调用者。内部 PDK API 可能复用 `SYS_IFC_CHANNEL(0x0F)`/KCS 会话标识；这只能解释日志归类，不能替代触发根因。

## 流程五：形成 Root Cause

仅对前置判断确认的 Bug，根因必须写成可验证的因果句；非 Bug 的 Root Cause 保持空白，待确认时不填写推断性根因：

```text
根因：<功能或条件>触发<实际动作>，导致<可观察结果>。
```

推荐同时给出证据，但不要把方案混入 Root Cause：

```text
根因：Host 侧 GPU sensor 阈值同步功能被触发，Host BMC 将从 Switch BMC/GPUBox 获取的 GPU/GPU MEM 阈值写入 Host 侧 18 个 GPU/GPU MEM sensor，因此产生多条 Set Sensor Threshold 审计记录。
```

如果用户明确要求“方案暂时先不写”，回复中只写：

```text
方案暂不展开，下一版本解决此问题。
```

不要在没有源码、日志或实测证据时声称已验证；使用“未验证”标记缺口。

## 流程六：回复 Track

用户明确要求回复时：

1. 打开 `Answer/Change`。
2. 等待编辑页面加载完成，确认 `textarea[name="ctlRtCause"]` 和 `textarea[name="ctlComments"]` 不再是 `readonly`。
3. 确认的 Bug：Root Cause 写根因，不写解决方案；非 Bug：Root Cause 保持空白。待确认：不填写推断性根因。
4. Comments/Answer 写简短证据和当前判断；非 Bug 写明不需要修复的原因及设计依据，不写状态操作说明。版本计划只按用户要求填写。
5. 用户已授权回复/处理且前置判断确认非 Bug 时，将 Status 设为 `Answered`，Owner assign 给 Submitter（提报者）；其他情况不擅自改变 Status 或 Owner，始终不擅自改变 Priority 或 Verify Count。提交前核对实际表单字段，缺少 Owner 控件不代表 Owner 应为空；不得在提交时意外清空 Owner。
6. 老旧 Track 页面可能使用两个 `<form>`：操作按钮在第一个 POST 表单，查询表单在第二个 GET 表单。不要选错表单。
7. 普通点击可能因旧页面事件或隐藏页签失效；提交时使用原生表单提交并捕获 POST：

```javascript
const form = page.locator('form').first();
const button = await form.locator('input[name="cmdAction"][value="Enter"]').elementHandle();
await form.evaluate((form, button) => {
  if (form.requestSubmit) form.requestSubmit(button);
  else button.click();
}, button);
```

8. 提交前确认 POST 中含 `cmdAction=Enter` 和预期 Root Cause；提交后确认 HTTP 状态正常、响应包含新文本。
9. 最后回到只读 URL：

```text
DefectForm.aspx?cmdAction=Form&Bookmark=<bookmark>
```

回读 `ctlComments`、`ctlRtCause`、Status 和 Owner，确认内容已落库；非 Bug 分支必须确认 Root Cause 为空、Status 为 `Answered`、Owner 为提报者。若第一次提交状态不明确，先回读 Last Change、Changed By 和现有评论，再决定是否重试；禁止盲目重复提交。

## 本次案例经验

本次 `60980073` 的一键日志中：

- `09:02:04` 出现 `[GPUBox][Sync] start threshold sync`。
- `09:02:08` 出现 GPU Temp/GPU MEM Temp threshold applied。
- 同一时间产生 18 条 `Set Sensor Threshold` 审计记录。
- 统计结果为 432 条同类记录全部 `Normal`，0 条 `Err`。
- 正确根因是 Host 侧 GPU sensor 阈值同步被触发；`KCS` 是内部 API 使用系统通道后的审计归类表现，不应写成主因。

## 完成标准

只有同时满足以下条件才能报告“已回复 Track”：

- Root Cause 和 Comments/Answer 已按用户要求填写。
- 没有把未验证推断写成事实。
- POST 提交成功，且没有重复提交。
- 只读页面回读确认文本已落库。
- 最终反馈包含 Defect ID、写入字段和验证结果。
