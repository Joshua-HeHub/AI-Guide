---
name: skill-debug-issue
description: "BMC 在线排查与实测：机台信息（machine info）、BMC IP 与 HOST OS KCS/IPMI 只读采集，RR12/RR13 SSH 访问、一键日志、固件版本核对、串口、core dump、RFDBG、在线实测避坑与 Autopilot 敏感输入取消。"
---
# BMC 在线问题排查

## 索引 & 关键词

| 场景                                          | 跳转                                                      | 关键词                                                                                   |
| --------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 在线访问、统一 CLI、HOST OS、串口与访问约束   | [→](#按需加载-在线访问与访问约束)                         | `bmc_exec.py` `在线访问` `HOST OS` `串口` `paramiko` `/proc`                             |
| 机台信息与 BMC IP（仅查询或确认采集目标时加载） | [resources/machine_info.md](resources/machine_info.md)   | `machine info` `机台信息` `机器信息` `BMC IP` `KCS` `ipmitool lan print`                |
| 触发 / 下载一键日志                           | [→](#按需加载-一键日志获取方法)                           | `一键日志` `onekey log` `CollectAllLog` `DownloadAllLog`                                 |
| 解压日志包，查看关键文件                      | [→](#按需加载-解压与查看)                                 | `audit.log` `err.log` `racsessioninfo` `qsession` `FwInfo`                               |
| 判断正式版 / 测试版                           | [→](#按需加载-判断正式版测试版)                           | `FW_DATE` `release` `正式版` `测试版`                                                    |
| 串口登录、minicom、恢复 SSH 密码              | [→](#按需加载-串口访问)                                   | `串口` `minicom` `ttyUSB` `login:` `~ #` `serial_timestamped.log`                        |
| 跨章节通用限制与避坑                          | [→](#按需加载-注意事项)                                   | `HTTP` `session` `conf 权限` `RemoteDisconnected` `MALLOC_CHECK` `lighttpd_ext.conf`     |
| 检查本地产物与 HPM/rom.ima 差异               | [→](#按需加载-检查本地产物与确认-hpmromima-差异)          | `bmc.hpm` `rom.ima` `ImageTree` `ParseHPM`                                               |
| core dump 分析、崩溃栈、信号类型              | [resources/coredump_analysis.md](resources/coredump_analysis.md) | `core dump` `gdb` `bt` `SIGSEGV` `SIGABRT` `/tmp/core.*`                                 |
| RFDBG 调试日志、session 时序                  | [resources/rfdbg_debug_log.md](resources/rfdbg_debug_log.md) | `RFDBG` `rfdbg.log` `racsession` `cleanup_orphan`                                        |
| 在线实测避坑（通用：基线/观察点/恢复）        | [resources/live_verification_pitfalls.md](resources/live_verification_pitfalls.md) | `实测` `复现` `基线差分` `ftrace` `静默失败` `交叉印证` `终态回读`                       |

## 附件资源

仅在对应分支需要时按需读取，不默认展开：

- `resources/coredump_analysis.md`：core_pattern 复核、SFTP 拉取 core、ARM gdb 栈分析与信号表。
- `resources/rfdbg_debug_log.md`：`RFDBG` 日志路径、打点含义与 session 时序定位。
- `resources/live_verification_pitfalls.md`：在线实测通用避坑（实验设计、观察点绑定、硬阻塞 vs 软阻力、状态恢复与输出落盘）。
- `resources/onekey_log_redfish_example.py`：Redfish 一键日志收集、轮询、下载、删 session 的 Python 示例（凭据通过环境变量或参数传入）。
- `resources/onekey_log_quick_reference.md`：一键日志 API、解压查看命令、正式版/测试版判断命令。
- `resources/serial_access_reference.md`：串口登录流程、状态判断、常见避坑、串口排查命令。
- `resources/serial_connect_pexpect_example.py`：基于 `pexpect` 的串口自动化连接示例。
- `resources/reset_bmc_ssh_password_via_serial.py`：直连 ttyUSB 的串口改密脚本；使用前必须显式指定目标机台、串口和经批准的授权参数，无硬编码默认值。

## [按需加载] 在线访问与访问约束

按需读取：仅在需要登录在线机台、HOST OS、串口或执行远程采集时读取本节。机台 IP、HOST OS、串口映射和认证来源统一维护在 [访问台账](resources/pass.md) 中；本 skill 不重复维护平台关系表。仅查询机台信息或需要确认采集目标时，再读取 [机台信息采集资源](resources/machine_info.md)。

1. Web/Redfish/IPMI 与 SSH 账号必须区分；沿用已有授权配置，不在新命令、日志、文档或聊天中复制凭据。不同机台/镜像不得猜测或轮试密码。
2. 串口设备使用前必须现场探测，检查 `id`、设备读写权限及占用；有 `dialout` 权限时不调用 sudo，不停止其他人的采集进程。
3. **BMC / HOST OS 稳定访问规范（强制）**：

- **首选统一 CLI `scripts/bmc_exec.py`**：非交互执行 RR12 / RR13(P9500AG7) BMC 或 HOST OS 命令时，直接调用统一工具，不再重复手写内联 `paramiko` 或凭据解析代码：
  ```bash
  # 列出当前解析到的 4 个目标节点（不输出凭据）
  python3 scripts/bmc_exec.py --list-targets
  # 单条只读命令（target: rr12 | rr12-host | rr13/p9500 | rr13-host/p9500-host；兼容 p9000）
  python3 scripts/bmc_exec.py --target rr12 --cmd 'cat /proc/ractrends/Helper/FwInfo'
  # 复杂多行脚本经 stdin 传递并落盘日志（避免嵌套引号转义碎裂）
  python3 scripts/bmc_exec.py --target rr13 --script-file /tmp/check.sh --tee-log /tmp/AI_terminal/rr13_check.log
  ```
- 人工临时直连：`ssh -o StrictHostKeyChecking=no sysadmin@<bmc-ip>`，再手工输入对应机台密码；没有免密时，**不要求**必须有 `sshpass`。
- `ping` 或 TCP 22 成功、但 SSH 报 `Permission denied (publickey,password)` 时，结论只能是“认证失败”，不能写成“目标不可达”。先用 `ssh -vvv -o BatchMode=yes` 确认服务端认证方式和实际提交的 key。
- SSH 报 `REMOTE HOST IDENTIFICATION HAS CHANGED` 时，连接尚未进入用户认证；先通过已确认通道核对 `/etc/ssh/ssh_host_rsa_key.pub` 指纹一致后，再执行 `ssh-keygen -f ~/.ssh/known_hosts -R <bmc-ip>` 并用 `StrictHostKeyChecking=accept-new` 收录新 key。禁止删除本机私钥或远端 `authorized_keys`。
- 机台认证以权威授权表专用列 + 实机探活为准，不凭记忆或旧文档盲试。多协议表里同一账号名可能出现在多个列（SSH/IPMI/串口/Web），脚本必须按表头定位专用列再在内存中解析。
- 仅在需要持续交互 shell（`invoke_shell`）或 SFTP 文件传输时再直接使用 Python `paramiko`；必须同时指定 `look_for_keys=False, allow_agent=False`（否则部分 BMC sshd 在公钥握手阶段挂起），禁止同一连接串行开多个 `exec_command` channel，且关闭 `client` 前先显式关闭 `stdin`/`stdout`/`stderr` 以免触发 `BufferedFile.__del__` 噪音。
- 如需安装 SSH key，先验证主机指纹并使用显式目标参数，详见 `docs/bmc-password-ssh-access.md`。

4. 精简 BMC 环境 `syslog`/`messages` 通常为空，`/var/log/lighttpd/` 可能不存在；进程状态优先看 `ps`、`/proc`，日志优先看 `/extlog/audit*`、`/conf/audit*`、`/var/log/log/err.log`、`/tmp/rfdbg.log`。
5. **SEL 不记录进程重启信息**：进程重启时刻从 `/extlog/audit.log` 的 PID 变化时间戳推导。
6. 在线访问 Redfish 时，先创建 session，带 `X-Auth-Token` 与 cookie 请求，结束后删除 session；session 异常专项切 `skill-redfish-session-debug`。
7. **确认根因后再讨论修复，获得明确授权后再改源码**。

### Autopilot 敏感输入取消处理

- 已有授权入口优先：优先用 `scripts/bmc_exec.py`、免密 SSH 或现成已登录会话；不把等待 `Password:` 再回灌密码的交互流程放进自动执行。
- 返回“终端命令已取消 - 需要敏感信息输入”时，记录为工具安全取消（不是认证失败或网络不通），先只读确认遗留进程/占用与日志，从最后已确认状态继续。
- 确需用户交互时由用户在可见终端操作；单点受阻时继续推进不依赖它的资料采集、源码分析、其他平台验证和已确认结果落表。
- 采集结束关闭本次连接并恢复临时参数；只读评估不修改密码、key、配置或重启服务。

## [按需加载] 一键日志获取方法

按需读取：仅在需要触发、轮询、下载一键日志时读取本节。若日志包已经拿到，直接跳到 `## [按需加载] 解压与查看`。

### 背景

BMC 一键日志（Onekey Log）包含 audit.log、err.log、debug.log、racsessioninfo、session 文件、配置快照等，是排查 BMC 运行态问题的首选数据来源。

日志包为 ZIP 格式，解压后结构为：

```
IEC_Diag/Development/
├── conf/          # BMC 配置文件（lighttpd.conf、adviserd.conf 等）
├── log/
│   ├── extlog/audit.log      # 审计日志（登录/登出/操作记录）
│   └── log/{err,debug,info,warning}.log
├── var/
│   ├── racsessioninfo        # session 共享内存（二进制）
│   ├── session_token         # KVM token 存储（二进制）
│   ├── tmp/qsession-*.properties  # Web session 文件
│   ├── tmp/redfish/qsession-*     # Redfish session 文件
│   └── process.conf          # 进程列表
└── proc/
    └── FwInfo                # 固件版本和 build 日期
```

### 操作概要

1. 常规带外路径：先创建 Redfish session。
2. 调 `CollectAllLog` 触发一键日志。
3. 轮询 `CollectAllLog.Status`，`1` 表示收集中，`0` 表示完成。
4. 收集完成后等待 web service 恢复。
5. 必要时重新创建 session，再调 `DownloadAllLog` 下载 ZIP。
6. 操作完成后删除 session，避免遗留测试会话。
7. LAN over USB 带内一键日志使用 Web API 方式（`/api/session` + Cookie + `X-CSRFTOKEN`），不要优先走 Redfish；详见 `docs/lan-over-usb-onekey-log.md`。

### 参考资源

1. 仓库现成脚本：`/home/zlsu/bmcrepo/RR12_1_07/sel_false_alarm_checker/release/check_false_alarm_during_onekey.sh`
2. 关键函数：`check_bmc_log_status()`、`download_and_parse_audit_log()`
3. 完整 Python 示例：`resources/onekey_log_redfish_example.py`
4. API 路径与长命令：`resources/onekey_log_quick_reference.md`
5. LAN over USB 带内一键日志 runbook：`docs/lan-over-usb-onekey-log.md`

## [按需加载] 解压与查看

按需读取：仅在日志包已经下载完成，需要解压和看关键文件时读取本节。

1. 核心文件优先看：`proc/FwInfo`、`log/extlog/audit.log`、`var/racsessioninfo`、`log/log/err.log`。
2. 现成解压与查看命令：`resources/onekey_log_quick_reference.md`。

### FwInfo 路径速查

| 场景                           | 路径                                  |
| ------------------------------ | ------------------------------------- |
| **BMC 在线直读**（最快） | `cat /proc/ractrends/Helper/FwInfo` |
| **一键日志包解压后**     | `IEC_Diag/Development/proc/FwInfo`  |

关键字段：`FW_VERSION`、`FW_DATE`、`FW_BUILDTIME`（UTC）。`FW_DATE` + `FW_BUILDTIME` 一起确认编译时间，对比本地产物 mtime 验证是否已刷入。

---

## [按需加载] 判断正式版/测试版

按需读取：仅在需要判断当前固件是正式版还是测试版时读取本节。

1. 对比 `FwInfo` 中的 `FW_DATE` 与 git 中对应版本号的 release commit 日期。
2. `FW_DATE` 接近 release commit 日期，一般判为正式版；若明显更近且相差数周或更长，一般判为测试版。
3. 现成命令见 `resources/onekey_log_quick_reference.md`。

---

## [按需加载] 串口访问

按需读取：仅在需要登录串口、判断当前是否已在 BMC shell、或通过串口恢复 SSH 密码时读取本节。

1. 常规流程：登录串口服务器，进入 `minicom` / `screen` / `cu`，再判断当前是 `login:`、`~ #` 还是空闲状态。
2. 若需要恢复 SSH 密码，只记命令：`passwd sysadmin`。
3. 详细流程、状态判断、常见避坑、串口排查命令：`resources/serial_access_reference.md`。
4. 自动化连接示例：`resources/serial_connect_pexpect_example.py`。
5. 需要一键恢复 SSH 密码时，优先直接运行：`python3 resources/reset_bmc_ssh_password_via_serial.py`。
6. **所有在线测试（尤其压测、复现、长时间后台任务）都必须保存带时间戳的串口 log**。至少保留两份：
   - 串口服务器上的原始采集文件，例如 `/tmp/bmc_serial_YYYYMMDD.cap`
   - 本地或代码机侧带时间戳的跟随日志，例如 `serial_timestamped.log`
7. 启动监控时必须先确认串口源文件路径是当前活跃文件；跨天或文件名变化时，不要依赖默认值，需显式指定当前 `bmc_serial` 路径。

---

## [按需加载] 注意事项

按需读取：本节是跨章节通用限制，只有在相关操作涉及 Redfish session、HTTP/HTTPS、conf 权限或日志路径时再回看。

1. **必须使用 HTTP（80 端口）访问 Redfish**，HTTPS（443 端口）在本项目中会 RemoteDisconnected
2. **收集完成后 web service 会重启**（约 30-60s），期间连接 refused 属正常，需等待恢复后再下载
3. **每次操作完必须删除 session**，不允许遗留会话；若问题本身就是 session 残留或创建删除异常，切到 `skill-redfish-session-debug`
4. **conf 目录权限为 `--x--x--x`**，`ls` 无法列出但可以直接 `cat` 文件（知道文件名的情况下），或先 `chmod +x` 后访问
5. log 目录下 `syslog`/`messages` 通常为空，实际日志在 `err.log`、`debug.log`、`audit.log`
6. **所有测试都要同步保存带时间戳的串口 log**；若当前没有 `serial_timestamped.log` 或同类时间戳日志，本轮测试视为监控链路不完整。
7. **测试脚本和 log 必须放在 `/home/zlsu/bmcrepo/test/`**，禁止在仓库根目录 `/home/zlsu/bmcrepo/RR12_1_07/` 直接创建测试脚本或日志文件，避免污染项目目录。
8. **Redfish 持续崩溃时先检查调试环境变量**：若 lighttpd/spx_restservice_ext 崩溃频繁，先检查 `/conf/lighttpd_ext.conf` 是否遗留 `MALLOC_CHECK_=3`（仅供调试使用，线上不应保留）。如有，恢复出厂配置：`cp /etc/defconfig/lighttpd_ext.conf /conf/lighttpd_ext.conf`，然后重启 lighttpd。详见 `docs/spx-restservice-ext-crash-analysis.md`。

---

## [按需加载] 检查本地产物与确认 HPM/rom.ima 差异

按需读取：仅在用户怀疑编译或打包未生效，想要直接 `cmp bmc.hpm rom.ima` 或在不明白的情况下对比这两个文件差异时读取本节。

### 为什么不应直接比较 bmc.hpm 与 rom.ima

1. `cmp bmc.hpm rom.ima` 行不通。HPM 文件**不是**由 `header + rom.ima`、甚至 `rom.ima + tail` 简单拼接而成的线性文件。
2. 依据 `fw_update_tool/FwUpdate_Inventec.sh::ParseHPM()`，本项目的 HPM 生成与解析逻辑包含：
   - 基础头部（如 `HPMImageHeader=35`, `HPMUpgActRec=34`, `OEMHPMHeader=16`，共 85 字节）
   - Component 及哈希（每个 firmware payload 后不仅有尾部填充，还带有 `HashLen + MD5(16)` 的验证信息）
   - 对于 BMC 这类 FW TYPE，还会特意分离 boot 和 app 两段并在解包时跳过内部偏移以重新拼装
3. 这意味着 HPM 文件大小和内部偏移与 `rom.ima` 截然不同。直接查看两个文件的 diff/二进制差异**通常毫无意义**。

### 正确的检查方法

当需要验证某代码改动是否确实打包进最终产物时，不要从 HPM 包入手拆包找证据，而应优先在 ImageTree 和构建阶段库中寻找可执行文件特征：

1. **查 ImageTree 中动态库是否包含对应变更的字符串/符号：**
   ```bash
   strings workspace/Build/output/ImageTree/usr/local/lib/libipmioemdevice.so.1.0.0 | grep -E '目标特征字符串'
   ```
2. **比较不同本地构建的 .so 哈希值：**
   ```bash
   md5sum workspace/Build/output/ImageTree/usr/local/lib/libipmioemdevice.so.1.0.0
   ```
3. 若确实遇到只有 `bmc.hpm` 需要验证且确无其它源码产物的场景，必须严格按照 `ParseHPM` 逻辑解析出 payload 来比较，切勿手算固定偏移。
