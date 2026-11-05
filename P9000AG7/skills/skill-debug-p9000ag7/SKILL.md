---
name: skill-debug-p9000ag7
description: "用于 P9000AG7 单点调试和代码/配置背景分析。适用于：lancfg2、PrimaryRMCPPort、RMCP 623、runtime=0、lan-over-USB、usb0、channel 7、Ethindex 2、InbUpdate、带内升级失败、Incorrect username or password、保留配置、恢复出厂后可用、Graphify、graph.json、docs/graphify-analysis、sensor、iecpack、生成配置、代码关系分析。"
---

# P9000AG7 Debug

> 本 skill 支持按需加载。先读索引；只展开命中章节。

## 索引 & 关键词

| 场景 | 跳转 | 关键词 |
|------|------|--------|
| `lancfg2` / RMCP 623 / runtime=0 | [→](#按需加载-lancfg2--rmcp-623) | `lancfg2` `PrimaryRMCPPort` `RMCP 623` `runtime=0` `LANCfs` |
| lan-over-USB / channel 7 | [→](#按需加载-lancfg2--rmcp-623) | `usb0` `channel 7` `Ethindex 2` `LanIfccfg.ini` |
| Inb tool 是否被改 | [→](#按需加载-inb-tool-是否被改) | `InbUpdate` `Incorrect username or password` `fw_update_tool` `ipmitool` |
| Graphify / 代码背景分析 | [→](#按需加载-graphify--代码背景分析) | `Graphify` `graph.json` `docs/graphify-analysis` `sensor` `iecpack` `生成配置` `代码关系` |
| 通用避坑 | [→](#按需加载-避坑) | `netstat :::623` `strings rom.ima` `IOCTL to get IP failed` |

## [按需加载] Graphify / 代码背景分析

按需读取：仅当问题需要代码结构、文件关系、生成配置、sensor、iecpack 或跨模块背景分析时读取。

优先入口（若已随 MR 合入）：

```text
P9000AG7/docs/graphify-analysis/README.md
P9000AG7/docs/graphify-analysis/graph-metadata.json
P9000AG7/docs/graphify-analysis/graph.json
P9000AG7/docs/graphify-analysis/converted/
P9000AG7/docs/graphify-analysis/sensor/GRAPH_REPORT.md
P9000AG7/docs/graphify-analysis/iecpack/ENHANCED_REPORT.md
```

本地未合入时的临时入口：

```text
P9000AG7/graphify-out/converted/
P9000AG7/docs/graphify-sensor/graphify-out/GRAPH_REPORT.md
P9000AG7/packages/iecpack/packages/graphify-out/ENHANCED_REPORT.md
P9000AG7/packages/iecpack/packages/graphify-out/summary.txt
P9000AG7/packages/iecpack/packages/graphify-out/graph.json
```

使用规则：

1. 先读 `README.md` / `GRAPH_REPORT.md` / `ENHANCED_REPORT.md` / `summary.txt`，再决定是否查 `graph.json`。
2. 不要直接整文件读取 `graph.json`；用 `rg`、`jq`、`head`、`sed` 按关键词/节点名缩小范围。
3. 若 `graph-metadata.json` 的 source baseline 与当前分支差距较大，结论标注“图谱可能过期”，再用源码验证。
4. Graphify 只能加速定位和形成假设，最终结论仍需源码、日志或实测闭环。

## [按需加载] lancfg2 / RMCP 623

按需读取：仅当问题涉及 `lancfg2`、`PrimaryRMCPPort`、RMCP 623、runtime=0、lan-over-USB、`usb0`、channel 7 时读取。

先分三层，勿混：

1. 源码默认：`lancfg2.c` 的 `623` 只在 key 缺失时用。
2. 持久化：`/conf/BMC1/lancfg2.ini` 优先。
3. runtime：`Get LAN` 读 `pBMCInfo->LANCfs[EthIndex]`。

`usb0` → channel 7 / Ethindex 2。故 channel 7 RMCP 看 `LANCfs[2].PrimaryRMCPPort`。

### 先查

```bash
rtk run "sshpass -p '<BMC_SSH_PASSWORD>' ssh -o ConnectTimeout=8 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null sysadmin@172.17.8.118 'cat /proc/ractrends/Helper/FwInfo 2>/dev/null || true'"

rtk run "sshpass -p '<BMC_SSH_PASSWORD>' ssh -o ConnectTimeout=8 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null sysadmin@172.17.8.118 'echo ===conf===; grep -n \"^PrimaryRMCPPort=\|^IPAddrSrc=\|^IPv4_Enable=\|^BMCGeneratedARPControl=\" /conf/BMC1/lancfg2.ini; echo ===bkupconf===; grep -n \"^PrimaryRMCPPort=\|^IPAddrSrc=\|^IPv4_Enable=\|^BMCGeneratedARPControl=\" /bkupconf/BMC1/lancfg2.ini; echo ===golden===; find /var/goldenconf /var/goldenbkupconf -name lancfg2.ini -print -exec grep -n \"^PrimaryRMCPPort=\" {} \; 2>/dev/null'"

rtk run "sshpass -p '<BMC_SSH_PASSWORD>' ssh -o ConnectTimeout=8 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null sysadmin@172.17.8.118 'sed -n \"6,22p\" /conf/BMC1/LanIfccfg.ini'"
```

### 2026-06-26 定论

现象：源码是 `623`，新固件已运行，runtime 仍是 `0`。

证据：

```text
/conf/BMC1/lancfg2.ini: PrimaryRMCPPort=0
/bkupconf/BMC1/lancfg2.ini: PrimaryRMCPPort=0
/var/goldenconf/BMC1/lancfg2.ini: PrimaryRMCPPort=0
/var/goldenbkupconf/BMC1/lancfg2.ini: PrimaryRMCPPort=0
```

根因：保留配置覆盖。`rsync-golden-includes` 保留：

```text
BMC1/LanIfccfg.ini
BMC1/lancfg*.ini
```

用户恢复出厂后 in-band update 可用。结论闭环。

### 勿先追

- PRJ / 版本号。
- image 没编进。
- ARP / kernel / DTB。

## [按需加载] Inb tool 是否被改

按需读取：仅当用户怀疑 Inb tool、脚本被改、或报 `Incorrect username or password` 时读取。

比对四份：

1. 本地 `fw_update_tool/`。
2. `P9000AG7/tools/InbUpdateTool/`。
3. release 包。
4. Host OS 实际执行副本。

看：`md5sum`、`diff -ru`、`-U/-P`、`lanplus`、`usb0`、`169.254`、`curl`、`ipmitool raw`。

## [按需加载] 避坑

按需读取：仅当证据互相冲突或工具输出迷惑时读取。

- `netstat :::623` 不证明 channel 7 在 623；可能是别的 LAN channel。
- `strings rom.ima` 无结果，不证明 image 无配置；可能在 squashfs 的 `libipmipar.so` 生成逻辑里。
- BMC 本机 `ipmitool` 报 `IOCTL to get IP failed`，不可单独判定 IPMI server 失败。