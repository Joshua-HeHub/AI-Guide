# P9000AG7 Project Guidelines

## 一、项目介绍

1. 这是 P9000AG7（G225-B6 / G225-B6-2）BMC 固件项目，平台为 AMD Turin，BMC 为 AST2600，系统为 ARM 32-bit Buster。
2. 项目基于 AMI git-spx V9.3 与 MDS V13.4。
3. 本地项目路径为 `/bmc/joshua/P9000AG7/`。

## 二、资源与入口

1. 主要源码位于 `packages/`。
2. Base 配置文件为 `configs/Quartz.PRJ`。
3. DPU/SmartNIC 配置文件为 `configs/QuartzDPU.PRJ`。
4. 常用工具位于 `tools/`，包括 OOB/INB 刷机、一键日志、ipmitool、HPM 打包和签名工具。
5. 输出镜像通常位于 `workspace/Build/output/rom.ima`，Release 产物位于 `Release/`。
6. 测试 SOP 和技术文档位于 `docs/`，包括 I2C bus hang 模拟/恢复测试 SOP。
7. IPT Track 浏览器自动化操作技巧记录在 repo 记忆 `/memories/repo/track-browser-ops.md`（表单程序化提交、文件上传、回读验证等）。

## 三、环境与访问

1. 不要自动触发构建；只有用户明确要求时才编译。
2. 构建前必须确认 License 与环境条件，不要默认可用。
3. 本机正确编译入口优先使用系统 `git-spx`，不要使用依赖 Docker License 缓存的 `build.sh`。
4. 涉及远程机器在线复核、测试或采集时，优先通过 `172.17.8.*` 管理网段访问。
5. 涉及代码审查时，按需读取 `skill-code-review`。
6. 涉及 CVE 分析时，按需读取 `skill-bmc-cve-analysis`。
7. 任务卡壳、重复失败或结论未闭环时，按需读取 `skill-pua`。
8. 当用户明确要把当前工作交接到新 chat 继续时，按需读取 `skill-handoff`。

## 四、shell 命令和问题分析规则

1. 所有 shell 命令优先使用 `rtk` 前缀，以减少大输出进入上下文。
2. 对 `rtk` 没有专用子命令的场景，使用 `rtk run '<command>'` 或 `rtk proxy <command>`。
3. 禁止直接读取大文件（log / dump / 构建输出）；必须用 `grep` / `tail` / `head` / `sed -n` 等方式缩小范围。
4. 优先用命令分析和摘要，不要把全量数据直接读入上下文。
5. `rtk` 位于 `$HOME/.local/bin/rtk`；如果当前终端找不到，先确认 `$HOME/.local/bin` 是否在 `PATH` 中。

## 五、编译与发布规则

1. Base 编译命令：

```bash
cd /bmc/joshua/P9000AG7 && sudo git-spx buildsrc ./configs/Quartz.PRJ ./packages workspace
```

2. DPU 编译命令：

```bash
cd /bmc/joshua/P9000AG7 && sudo git-spx buildsrc ./configs/QuartzDPU.PRJ ./packages workspace
```

3. workspace 切换分支后首次编译，或 patch 冲突时，先确认是否需要删除旧 `workspace/`。
4. 完整 Release 只有用户明确要求时才执行：

```bash
cd /bmc/joshua/P9000AG7 && sudo ./Release.sh
```

## 六、工作流约束

1. 如果用户指令与项目文档冲突，先引用文档确认，再继续执行。
2. 启动任务后先读取 `.github/memories/execution-discipline.md`，并严格执行其中规则。
3. 推理结论未经源码、日志或实测验证时，必须明确标注“未验证”。
4. 不要回滚或删除用户已有改动；遇到无关 dirty worktree 时只记录，不主动清理。
5. 文件修改必须形成闭环：修改后立即读回目标位置验证。