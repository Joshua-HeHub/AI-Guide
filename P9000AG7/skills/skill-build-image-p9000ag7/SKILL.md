---
name: skill-build-image-p9000ag7
description: "用于 P9000AG7 BMC 编译监控、镜像内容离线分析、TFTP/IMA/HPM 一致性校验、源码改了但镜像不生效排查、刷机前后版本和运行态配置核实。适用于用户提到：P9000AG7 build、git-spx buildsrc、workspace/Build/output/rom.ima、TFTP rom.ima、test106.ima、CreateHPMImage、HPM、版本不一致、源码没生效、lancfg2、PrimaryRMCPPort、lan-over-USB、usb0、刷上去不是预期版本、确认 image 里是否包含某配置。"
---

# P9000AG7 Build / Image / Update Check Skill

## 适用场景

当用户要确认 P9000AG7 的编译产物、TFTP 镜像、HPM 包或目标机运行态是否符合预期时使用本 skill。

典型问题：

- `configs/Quartz.PRJ` 是 1.06，但刷上去显示 1.07。
- 本地源码已把 `lancfg2` / `PrimaryRMCPPort` 改为 623，但目标机 runtime 读到 0。
- 需要确认 `/srv/tftp/joshua/*.ima` 是否就是刚 build 的 `workspace/Build/output/rom.ima`。
- 需要判断 image 自带默认值、运行时 `/conf` 持久化值、内存 `LANCfs` 三者谁在生效。
- 怀疑 `workspace/source`、`.pristine`、`.build` 或 `.spx` 包缓存导致旧源码进了镜像。

## 基本约束

1. 不要自动触发编译；只有用户明确要求时才执行 `git-spx buildsrc`。
2. 默认使用 `rtk run` 包裹 shell 命令，减少大输出进入上下文。
3. 不要直接读取大 log / dump / build output；必须用 `tail`、`grep`、`sed -n`、`head` 缩小范围。
4. 遇到账号、目标镜像、是否重启刷机等不确定项，先弹框问用户，同时并行做只读探索。
5. 刷机不是验证 image 内容的第一选择。要确认镜像自带配置时，先离线读 image；刷机只用于验证启动后的保留配置、ABR side、初始化脚本和 runtime 行为。
6. 结论必须标注证据层级：源码事实、镜像离线证据、目标机 runtime 证据。未完成实测时写“未验证”。

## 编译入口

P9000AG7 Base：

```bash
cd /bmc/joshua/P9000AG7 && sudo git-spx buildsrc ./configs/Quartz.PRJ ./packages workspace
```

P9000AG7 DPU：

```bash
cd /bmc/joshua/P9000AG7 && sudo git-spx buildsrc ./configs/QuartzDPU.PRJ ./packages workspace
```

不要使用 `build.sh` 作为默认入口；项目文档记录该脚本依赖 Docker license 缓存，当前机器可能没有。

## 编译监控

只监控用户已启动的构建，不主动启动构建。

推荐检查：

```bash
cd /bmc/joshua/P9000AG7
rtk run 'ls -lh build.log workspace/Build/output 2>/dev/null || true'
rtk run 'tail -n 80 build.log 2>/dev/null'
rtk run 'grep -Ein "error|failed|fatal|undefined reference|No such file|cannot find" build.log 2>/dev/null | tail -n 80'
```

输出先给结论：编译中、成功、失败、还是证据不足。

## 版本字段来源

`configs/Quartz.PRJ` 中 Base 版本字段示例：

```text
CONFIG_SPX_MAP_QUARTZ_ATTR_Major="01"
CONFIG_SPX_MAP_QUARTZ_ATTR_Minor="06"
CONFIG_SPX_MAP_QUARTZ_ATTR_Aux="03"
```

`Release.sh` 只负责调用 `git spx buildsrc` 并复制 `workspace/Build/output/rom.ima` 到 `Release/`，通常不改版本号。

运行态版本优先从 BMC 查询：

```bash
rtk run "sshpass -p 'superuser' ssh -o ConnectTimeout=8 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null sysadmin@172.17.8.118 'cat /proc/ractrends/Helper/FwInfo 2>/dev/null || true; ipmitool mc info 2>/dev/null || true'"
```

注意：OOB update 日志里的 `fw_ver` 反映目标机当时运行态，不证明 TFTP 目录当前 image 内容。

## IMA / TFTP 镜像一致性

先列出 TFTP 目录，确认实际文件名和大小：

```bash
rtk run 'find /srv/tftp/joshua -maxdepth 1 -type f -name "*.ima" -printf "%TY-%Tm-%Td %TH:%TM %s %p\n" 2>/dev/null | sort'
rtk run 'find /srv/tftp/joshua -maxdepth 1 -type f -name "*.ima" -exec md5sum {} \;'
```

64 MiB BMC image 预期大小：

```text
67108864 bytes
0x4000000
```

和 build 产物对比：

```bash
rtk run 'md5sum /bmc/joshua/P9000AG7/workspace/Build/output/rom.ima /srv/tftp/joshua/*.ima 2>/dev/null || true'
rtk run 'ls -lh /bmc/joshua/P9000AG7/workspace/Build/output/rom.ima /srv/tftp/joshua/*.ima 2>/dev/null || true'
```

如果 md5 不同，先不要讨论 runtime，先确认 TFTP 是否放错文件。

## 离线分析 IMA 内容

### 1. 不要先刷机

要证明 image 是否自带某配置，优先离线解 image。刷机只能证明启动后的实际行为，不能区分 image 默认值和 `/conf` 保留值覆盖。

### 2. 搜索明文

```bash
rtk run 'strings -a /srv/tftp/joshua/test106.ima | grep -n -A3 -B3 "PrimaryRMCPPort" | head -n 80'
```

如果无输出，不代表没有该配置；P9000AG7 的 LAN 默认配置可能在压缩 squashfs 内的 `libipmipar.so` 生成逻辑里，而不是明文 ini。

### 3. 定位 squashfs

`binwalk` 可能因 capstone 依赖报错：

```text
AttributeError: module capstone has no attribute CS_ARCH_ARM64
```

此时用魔数搜索替代：

```bash
rtk run "grep -aob 'hsqs\|sqsh\|FMH\|MODULE_INFO\|lancfg2\|LAN2ConfigParams\|LAN3ConfigParams' /srv/tftp/joshua/test106.ima | head -n 80"
```

P9000AG7 64 MiB image 中常见 squashfs 偏移示例：

```text
5308480:hsqs
41877504:hsqs
```

### 4. 快速裁剪并解 squashfs

不要用 `dd bs=1 skip=...`，会很慢。使用 `iflag=skip_bytes`：

```bash
rtk run 'rm -rf /tmp/p9000ag7_ima_extract; mkdir -p /tmp/p9000ag7_ima_extract; dd if=/srv/tftp/joshua/test106.ima of=/tmp/p9000ag7_ima_extract/part_5308480.sqfs bs=1M skip=5308480 iflag=skip_bytes status=none; dd if=/srv/tftp/joshua/test106.ima of=/tmp/p9000ag7_ima_extract/part_41877504.sqfs bs=1M skip=41877504 iflag=skip_bytes status=none; file /tmp/p9000ag7_ima_extract/*.sqfs'
rtk run 'unsquashfs -q -d /tmp/p9000ag7_ima_extract/root1 /tmp/p9000ag7_ima_extract/part_5308480.sqfs; unsquashfs -q -d /tmp/p9000ag7_ima_extract/root2 /tmp/p9000ag7_ima_extract/part_41877504.sqfs'
```

### 5. 查找 LAN 配置来源

```bash
rtk run 'find /tmp/p9000ag7_ima_extract/root1 /tmp/p9000ag7_ima_extract/root2 -type f \( -iname "*lancfg*" -o -iname "*LanIfc*" -o -iname "*ipmi*conf*" \) | sed -n "1,120p"'
rtk run 'grep -RIn --binary-files=without-match -E "PrimaryRMCPPort|LAN2ConfigParams|LAN3ConfigParams|BMCGeneratedARPControl|IPv4_Enable|IPAddrSrc" /tmp/p9000ag7_ima_extract/root1 /tmp/p9000ag7_ima_extract/root2 2>/dev/null | head -n 160'
```

2026-06-26 已验证的 `test106.ima` 现象：镜像中没有现成明文 `lancfg2.ini`，但有：

```text
/usr/local/lib/ipmi/quartz/libipmipar.so.13.0.0
```

其中包含：

```text
LANConfig2_LoadFile
LAN2ConfigParams
PrimaryRMCPPort
LAN3ConfigParams
usb0
LANIfcConfig/LanIfcConfig/3
```

### 6. 对照源码确认默认值

项目定制 LAN2 默认加载代码：

```text
packages/projects/packages/libipmipar_ast2600evb-ARM-AST2600-Quartz-src/data/lancfg2.c
```

关键逻辑：

```c
data->PrimaryRMCPPort = IniGetUInt(ini, "LAN2ConfigParams", "PrimaryRMCPPort", 623);
```

严格结论写法：如果 image 解包后只有 `libipmipar.so`、没有明文 `lancfg2.ini`，且源码对应版本确认为 623，但尚未完成 ARM 反汇编到 `r3=623`，应写：

```text
已确认源码默认值为 623，image 内包含对应 LAN2 生成逻辑；image 二进制层默认参数是否为 623 仍需反汇编确认。
```

不要把源码事实直接写成 image 二进制事实。

## lancfg2 / lan-over-USB 单点 debug

若问题是 `lancfg2`、`PrimaryRMCPPort`、RMCP 623、`runtime=0`、lan-over-USB、`usb0`、channel 7、InbUpdate 失败，改读 `skill-debug-p9000ag7`。

最短结论：先分源码默认、`/conf` 持久化、runtime `LANCfs` 三层。2026-06-26 已闭环一次：恢复出厂后 in-band update 可用，根因是 `lancfg2.ini` 保留配置覆盖，不是 PRJ、版本号或 build image 未生效。

## 源码改了但镜像没生效

如果问题表现为 runtime 值与源码默认值不同，先按 `skill-debug-p9000ag7` 排除持久化配置覆盖。只有确认持久化配置不存在或已恢复默认后，再继续怀疑 `.spx`、`workspace/source`、`.pristine`、`.build` 或 PRJ。

优先检查这些层级：

1. 源码文件是否已改。
2. 对应包 `spx/FILES` 的 size/md5 是否同步。
3. `.spx` 包内是否包含新文件。
4. `workspace/source/<pkg>-src` 是否旧副本。
5. `workspace/.pristine/<pkg>-src` 是否旧副本。
6. `workspace/Build/.build/<pkg>-src` 是否旧副本。

示例检查 libipmipar：

```bash
cd /bmc/joshua/P9000AG7
rtk run 'md5sum packages/projects/packages/libipmipar_ast2600evb-ARM-AST2600-Quartz-src/data/lancfg2.c workspace/source/libipmipar_ast2600evb-ARM-AST2600-Quartz-src/data/lancfg2.c workspace/.pristine/libipmipar_ast2600evb-ARM-AST2600-Quartz-src/data/lancfg2.c workspace/Build/.build/libipmipar_ast2600evb-ARM-AST2600-Quartz-src/data/lancfg2.c 2>/dev/null || true'
rtk run 'grep -n "lancfg2.c" packages/projects/packages/libipmipar_ast2600evb-ARM-AST2600-Quartz-src/spx/FILES 2>/dev/null || true'
```

如果 `workspace` 已存在，构建可能复用旧副本；用户已明确删除 `workspace/` 后重新编译时，不要干扰构建，等产物出来再核对 md5。

## HPM 生成校验

P9000AG7 常用 HPM 生成：

```bash
cd /bmc/joshua/P9000AG7/tools/generatehpmimagetool/ && \
sudo cp /bmc/joshua/P9000AG7/workspace/Build/output/rom.ima ./FW/rom.ima && \
sudo ./CreateHPMImage create ./Conf/bmc_image.conf
```

注意：`tools/generatehpmimagetool/Conf/bmc_image.conf` 内的 `FwVersionMajor/Minor/Aux` 可能是 HPM 组件版本，不等于 raw IMA 内部运行版本。不要用 HPM conf 版本替代 runtime `FwInfo` 或 IMA 头判断。

## shell / rtk 踩坑

1. `rtk run "... $var ..."` 会被本地 shell 提前展开。复杂变量逻辑优先用单引号包裹，或避免变量。
2. 远端命令内含 `|`、`$()`、正则括号时容易被多层 shell 误解析。优先拆成多条简单命令。
3. BusyBox 目标机可能没有 `ss`、`nl`，`cat -n` 也可能不支持。用 `grep -n`、`sed -n` 更稳。
4. `ipmitool` 在 BMC 本机可能打印 `IOCTL to get IP failed`，不要单独据此判断 IPMI server 失败。
5. `binwalk` 可能坏在 Python/capstone 依赖；用 `grep -aob 'hsqs'` + `dd iflag=skip_bytes` + `unsquashfs` 替代。
6. 不要让长时间命令留后台；如果发现命令写错或太慢，及时 kill 后改用更小、更确定的命令。

## 阶段性汇报模板

每个阶段都按这四点汇报：

```text
目标：
已做：
结论：
下一步：
```

示例：

```text
目标：确认 /srv/tftp/joshua/test106.ima 是否自带 PrimaryRMCPPort=623。
已做：定位两个 squashfs，解包 rootfs，确认没有明文 lancfg2.ini，但 libipmipar.so 包含 LANConfig2_LoadFile 和 PrimaryRMCPPort。
结论：源码默认值是 623；image 内有生成逻辑，但二进制默认参数还需反汇编确认。
下一步：对比新 build rom.ima 与 TFTP image 的 md5，并精确定位 libipmipar.so 中 IniGetUInt 默认参数。
```
