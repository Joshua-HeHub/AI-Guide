---
name: skill-bmc-serial-update
description: "用于通过串口/U-Boot/TFTP 物理更新或回刷 BMC 固件。适用于用户提到：串口刷 BMC、U-Boot 刷机、TFTP 烧录、sf update、关 WDT、看门狗复位、BMC 回刷正式版、rom.ima 物理刷写、ABR 回滚、Flash 写入被 WDT 打断。重点处理串口输入掉字、U-Boot 阶段关狗、TFTP 镜像校验、sf update 长时间写入、重启后版本验证闭环。"
---

# BMC Serial Update Skill

## 适用场景

当需要绕过带内/带外更新工具，直接通过串口进入 U-Boot 并用 TFTP + SPI Flash 命令更新 BMC 固件时使用本 skill。

典型触发场景：

- 带内更新依赖 lan-over-usb / `usb0`，链路不稳定或更新工具不可用。
- 带外 Web / Redfish / IPMI 更新失败，但串口可用。
- BMC 固件需要回刷正式版 `rom.ima` / `.ima`。
- U-Boot `sf update` 执行几分钟后被 `RST: WDT* SOC` 复位打断。
- 需要利用 ABR/fail-safe 机制恢复或确认当前 Boot side。

## 已验证环境

P9000AG7 已验证入口：

```text
串口服务器：172.17.8.38
串口服务器账号：storage / <SERIAL_SERVER_PASSWORD>
串口设备：/dev/ttyUSB7
BMC 管理口：172.17.8.118 / 10.99.182.118
BMC 串口账号：sysadmin / <BMC_SSH_PASSWORD>
BMC 备用串口账号：admin / <BMC_SERIAL_PASSWORD>
```

P9000AG7 官方 1.06.03 镜像示例：

```text
/bmc/joshua/P9000AG7/test/v106/Inventec_P9000AG7_BMC_1.06.03/Inventec_P9000AG7_BMC_1.06.03.ima
```

TFTP 发布文件示例：

```text
/srv/tftp/joshua/rom.ima
```

## 推荐用法

优先复用 [run_uboot_cmds_remote.py](run_uboot_cmds_remote.py) 做串口刷写与版本采集；skill 不再重复展开整套 U-Boot 操作步骤。

推荐入口：

- `flash106`：完成登录、重启、抢 U-Boot、关 WDT、TFTP 下载、`sf update`、`reset`
- `collect_version`：在 Linux 串口下登录并采集 `hostname`、`uptime`、`FwVersion.ini`、`DualImageCfg.ini`、`/proc/version`

`flash` 写入的是 Image 1；双镜像设备不能仅凭 `sf update` 成功判断刷后运行的是目标镜像。脚本会在 reset 前保存 `bootselector=1`，刷后还必须用 IPMI 查询 `active_image=01`。

## 前置检查

执行前至少确认：

- 目标镜像路径明确，例如 `/bmc/joshua/P9000s/P9500AG7-worktree/workspace/Build/output/rom.ima`
- `/srv/tftp/joshua/rom.ima` 已替换为目标镜像，且 md5 一致
- TFTP 根目录正确，通常来自 `/etc/default/tftpd-hpa`
- 串口无人占用；必要时可直接 `pkill -f ttyUSB7`

## 人工介入点

- 自动化会在 `Password:`、passphrase、token 等敏感输入提示处被平台拦截；这不是换 agent 能解决的问题。
- 实际绕法只有两种：
  - 能非交互就非交互：优先用 `sshpass` 等方式完成远端登录。
  - 不能非交互就拆段：由用户只输入一次敏感信息，后续非敏感步骤再交回 agent。
- 如果脚本在 `reset` 后没有继续抓到 post-reset 日志，要单独补采启动 side 原文。
- 写入 bank、boot selector、active image 必须分别记录；三者不一致时不得宣布刷写成功。

## 踩坑点

### 1. 串口输入会掉字

- 慢速逐字发送是必需项，不是优化项。
- 命令前先发送 `\r` 清空当前行。
- 即使是 `help wdt` 这类短命令，也可能被吞成 `elp wdt`。

### 2. `sf update` 前必须关 WDT

- U-Boot 下长时间写 Flash 会被看门狗硬复位。
- P9000AG7 当前实测依赖 AST2600 WDT 寄存器关狗，不依赖 `wdt` 命令存在。

### 3. TFTP 成功不等于刷写成功

必须继续确认：

- `Bytes transferred = 67108864 (4000000 hex)`
- `sf probe 0` 成功识别 64 MiB Flash
- `sf update` 完成并回到 `ast#`
- `reset` 后系统继续启动
- IPMI `raw 0x32 0x8f 0x07` 返回 `01`，确认运行的是 Image 1

### 4. 网络不通不等于刷写失败

- 若管理口未恢复，不要只靠 ping/SSH 判失败。
- 只要串口已确认 kernel、init、sshd、版本文件正常，就应继续按串口闭环推进。

## 验收项

最终结论至少包含：

- 目标镜像路径
- 目标镜像 md5 与 TFTP 镜像 md5
- TFTP `Bytes transferred` 输出
- `sf probe` Flash 识别输出
- `sf update` 完成输出
- reset 后启动 side 或等价启动证据
- active image 查询结果
- 启动后版本证据

若网络未恢复，补充串口版本验证输出；若涉及 dual-image，补充 `DualImageCfg.ini` 运行态证据。
