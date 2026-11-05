---
name: skill-create-release
description: "用于 P9500AG7 BMC 固件发布包制作和复核。适用于创建或更新 1.06/1.07/1.08/1.09 等版本发布目录、替换 HPM/IMA、同步 Inb/Oob 升级工具、整理 Tools 目录、更新 Release Note/Test Report、生成发布 zip、计算 Sum32/MD5/SHA-256，以及按上一版正式包对齐目录结构。"
user-invocable: true
---

# P9000AG7 Release Package Workflow

## 目标

生成可发布的 P9500AG7 BMC 版本目录和总 zip，保持与上一版正式发布包结构一致，并完成固件、升级工具和最终压缩包校验。

默认项目：P9500AG7 / P9500AG7 分支。

## 重要约束

1. 不自动编译；版本发布包制作不等于触发 `git-spx buildsrc`。
2. 不覆盖用户自己维护的 BMC Release Notes、TestReports 和测试报告；用户明确要求时才替换。
3. 先以对应上一版正式包为结构基线，再整理新版本目录。
4. 不保留临时 Office 锁定文件，例如 `~$lease Note.docx`。
5. 不要凭文件名判断固件版本；使用 AMI `CreateHPMImage show` 检查 HPM 内部版本。
6. 修改发布目录前先读取当前内容，避免覆盖用户已经放入的 release note 或测试报告。
7. 最终必须检查 zip 内容，确认没有误打包的解压目录、旧版本工具或临时文件。
8. 测试失败时必须把 `FAIL`、失败用例和限制同步到 Test Report 与 BMC Release Note；可以生成供评审的候选包，但不得称为 release-ready 或正式放行包。
9. 检查升级工具代码路径时必须精确读取 ZIP 内 `scripts/P9000AG7.sh`；release note 中描述旧路径的文字不等于代码仍残留旧路径。
10. 原始测试证据放在版本目录之外，除非用户明确要求，不要把 `test-evidence-*` 打进总发布 ZIP。

## 目录约定

测试和发布目录：

```text
/bmc/joshua/P9000s/test/
```

版本目录示例：

```text
/bmc/joshua/P9000s/test/v107/Inventec_P9500AG7_BMC_1.07.00/
/bmc/joshua/P9000s/test/v108/Inventec_P9500AG7_BMC_1.08.00/
/bmc/joshua/P9000s/test/v109/Inventec_P9500AG7_BMC_1.09.00/
```

发布总包放在 test 上层：

```text
/bmc/joshua/P9000s/test/Inventec_P9500AG7_BMC_1.08.00.zip
/bmc/joshua/P9000s/test/Inventec_P9500AG7_BMC_1.09.00.zip
```

固件模板目录：

```text
/bmc/joshua/Templates/
```

升级工具仓库：

```text
/bmc/joshua/P9000s/fw_update_tool/
```

## 第一步：读取上一版正式包结构

不要直接照当前目录猜结构，先查看上一版总 zip：

```bash
cd /bmc/joshua/P9000s/test
unzip -l Inventec_P9500AG7_BMC_1.07.00.zip
```

典型正式包内容包括：

```text
BMC Load Default Config.xlsx
InbUpdateTool.zip
Inventec_P9500AG7_BMC_1.07.00.hpm
Inventec_P9500AG7_BMC_1.07.00.ima
OobUpdateTool.zip
P9500AG7 BMC Release Note.docx
TestReports/
Tools/
    FruTools/
    UpdateTools/
        FwUpdate_Inventec_SOP_v1.0.pdf
        FwUpdate_Inventec_v0.9_20260127.zip
```

上一版 zip 没有以下内容时，新版也应删除：

```text
OobUpdateTool/       # 解压后的重复目录
bmc.hpm              # 如果上一版包没有该 link
~$*                  # Office 临时锁定文件
```

## 第二步：检查新版本固件

1. 固件通常从 `Templates` 复制：

```text
/bmc/joshua/Templates/Inventec_P9500AG7_BMC_1.08.00.hpm
/bmc/joshua/Templates/Inventec_P9500AG7_BMC_1.08.00.ima
```

2. 复制到新版本目录并使用规范文件名。
3. 使用 AMI 工具确认 HPM 内部版本：

```bash
/bmc/joshua/P9000AG7/tools/createhpmimage-ANY/data/obj/Linux_x86_64/CreateHPMImage show \
  /bmc/joshua/P9000s/test/v108/Inventec_P9500AG7_BMC_1.08.00/Inventec_P9500AG7_BMC_1.08.00.hpm
```

必须看到类似：

```text
Firmware revision: 1.8
```

4. 文件名改名不会改变 MD5；必须确认内容来源和 HPM 内部版本。

## 第三步：升级工具处理

升级工具仓库：

```bash
cd /bmc/joshua/P9000s/fw_update_tool
```

当前工具分为两种用途：

- `InbUpdateTool.zip` / `OobUpdateTool.zip`：发布包根目录中的带内、带外工具。
- `Tools/UpdateTools/FwUpdate_Inventec_v1.1_20260903.zip`：1.09 已验证的完整 FwUpdate tool 归档。

如果只发布工具功能版本升级：

1. 在 `FwUpdate_Inventec.sh`、`InbUpdate.sh`、`OobUpdate.sh` 中同步更新显示版本，例如 `Version 1.0` → `Version 1.1`。
2. 修改通用 `release_note.txt`，记录工具功能变更。
3. Inb/Oob 专用 release note 是否修改，要根据需求决定；不要把工具版本和 BMC 固件版本强行绑定。
4. 重新生成 Inb/Oob zip。
5. 重新生成完整 `FwUpdate_Inventec_v<版本>_YYYYMMDD.zip`。

1.09 / v1.1 已验证的打包命令：

```bash
cd /bmc/joshua/P9000s/fw_update_tool
./package_script.sh 1.1 20260903
```

第二个参数必须是完整 8 位日期 `YYYYMMDD`。当前 v1.1 脚本会生成 `FwUpdate_Inventec_v1.1_20260903.zip`；不要传四位短日期，也不要在脚本中额外硬编码年份前缀。

常见工具功能变更：

- BIOS 版本解析去除 Major 前导零，并兼容三位 BIOS 版本格式。
- 升级进度达到 100% 后等待 2 秒，再提示完成。

这些功能是否是某个 BMC 版本的必需项，要根据实际 HPM 格式判断，不能因为 BMC 从 1.07 升到 1.08 就默认绑定。

### 重新生成 Inb/Oob zip

优先使用仓库现有打包脚本，执行前先检查脚本会复制哪些文件：

```bash
cd /bmc/joshua/P9000s/fw_update_tool
sed -n '1,160p' package_script.sh
```

生成后检查：

```bash
unzip -l InbUpdateTool.zip
unzip -l OobUpdateTool.zip
unzip -p InbUpdateTool.zip FwUpdate.sh | sed -n '300,305p'
unzip -p OobUpdateTool.zip FwUpdate.sh | sed -n '300,305p'
```

还必须精确检查项目脚本，不要对整包执行模糊 `strings` 后直接下结论：

```bash
unzip -p OobUpdateTool.zip scripts/P9000AG7.sh | grep -n 'Oem\.IEC\|Oem\.Bytedance'
unzip -p InbUpdateTool.zip scripts/P9000AG7.sh | grep -n 'Oem\.IEC\|Oem\.Bytedance'
```

P9500AG7 v1.1 预期为 `.Oem.IEC` 6 处、`.Oem.Bytedance` 0 处。release note 会正常出现“由 Oem.Bytedance 更新为 Oem.IEC”的描述，不能把该描述误报为代码残留。

如果发布目录包含解压后的 `OobUpdateTool/` 或 `InbUpdateTool/`，应按上一版正式包结构决定是否删除；通常正式包只放 zip。

## 第四步：替换发布目录

先确认目录名称和用户文件：

```bash
find /bmc/joshua/P9000s/test/v108 -maxdepth 2 -printf '%y %P -> %l\n' | sort
```

典型替换动作：

- 目录：`Inventec_P9500AG7_BMC_1.07.00` → `Inventec_P9500AG7_BMC_1.08.00`。
- 固件文件改成 `1.08.00` 文件名。
- 替换 `InbUpdateTool.zip` 和 `OobUpdateTool.zip`。
- `Tools/UpdateTools/` 删除旧 v0.9 完整工具包，放入新 v1.0 完整工具包。
- 清理多余解压目录、旧 link 和 Office 锁文件，但不要删除用户的 release note 或测试报告。

注意：如果上一版正式 zip 没有 `bmc.hpm`，新版不要保留它。不要为了方便自行新增 link。

## 第五步：更新 Release Note 和 Test Report

1. BMC Release Note 的 Changelist 只保留当前项目标签；`Common` 和“通用问题”统一为团队确认的显示标签，并保留可追溯的 Bug/Tracker/MR 编号。
2. Test Report 必须从上一版样式复制后清除旧截图、旧 PASS 和旧 Changelist；未执行项目写 `NA`，不能继承上一版结果。
3. Release Note 的 `Sanity Test Result`、报告文件名和“重要遗留问题”必须与 Test Report 一致。
4. 测试存在阻断项时写 `FAIL`，并把失败现象、恢复动作和环境限制分开记录；手工恢复成功不能覆盖自动恢复用例的失败结论。
5. 测试报告加入发布目录后，重新打总 ZIP 并重新计算全部校验值。

## 第六步：计算校验值

统一脚本：

```text
/bmc/joshua/scripts/calc_checksums.sh
```

脚本计算：

- `sum32`：所有文件字节累加，对 $2^{32}$ 取模。
- MD5：调用 `md5sum`。
- SHA-256：调用 `sha256sum`。

运行：

```bash
/bmc/joshua/scripts/calc_checksums.sh \
  /bmc/joshua/P9000s/test/v108/Inventec_P9500AG7_BMC_1.08.00/Inventec_P9500AG7_BMC_1.08.00.hpm \
  /bmc/joshua/P9000s/test/v108/Inventec_P9500AG7_BMC_1.08.00/Inventec_P9500AG7_BMC_1.08.00.ima \
  /bmc/joshua/P9000s/test/v108/Inventec_P9500AG7_BMC_1.08.00/InbUpdateTool.zip \
  /bmc/joshua/P9000s/test/v108/Inventec_P9500AG7_BMC_1.08.00/OobUpdateTool.zip
```

MD5/SHA-256 可用独立命令交叉验证：

```bash
md5sum <file>
sha256sum <file>
```

Sum32 可用独立 C 流式实现交叉验证；不要把 Sum32 和 CRC32 混淆。

## 第七步：打包总发布包

删除 Office 临时文件并从 `v108` 父目录打包，确保 zip 内根目录正确：

```bash
cd /bmc/joshua/P9000s/test
base=v108/Inventec_P9500AG7_BMC_1.08.00
find "$base" -name '~$*' -delete
rm -f Inventec_P9500AG7_BMC_1.08.00.zip
(cd v108 && zip -qr ../Inventec_P9500AG7_BMC_1.08.00.zip Inventec_P9500AG7_BMC_1.08.00/)
```

验证：

```bash
unzip -Z1 Inventec_P9500AG7_BMC_1.08.00.zip | wc -l
unzip -Z1 Inventec_P9500AG7_BMC_1.08.00.zip | grep -E '(^|/)(~\\$|OobUpdateTool/|bmc\\.hpm|FwUpdate_Inventec_v0\\.9)' || true
md5sum Inventec_P9500AG7_BMC_1.08.00.zip
sha256sum Inventec_P9500AG7_BMC_1.08.00.zip
```

最终包不应包含：

```text
~$lease Note.docx
OobUpdateTool/
bmc.hpm
FwUpdate_Inventec_v0.9*
```

## 第八步：最终检查清单

- [ ] 版本目录、HPM/IMA文件名和总 ZIP 名均为目标版本。
- [ ] HPM 内部版本与目标版本一致。
- [ ] HPM/IMA 文件内容来自确认过的源文件。
- [ ] Inb/Oob zip 内容正确，`FwUpdate.sh` 版本符合发布要求。
- [ ] `Tools/UpdateTools` 使用目标工具归档，旧工具归档已删除。
- [ ] 没有 `~$` 临时文件。
- [ ] 没有上一版不存在的解压目录或 link。
- [ ] BMC Release Note 与测试报告的结果、报告名、Changelist编号和已知问题一致。
- [ ] 未测试项为 `NA`，没有继承上一版截图或 PASS。
- [ ] 若总体测试为 `FAIL`，输出明确称为候选包并列 release blocker，不称正式放行。
- [ ] 固件、工具包、总发布包均已计算 MD5/SHA-256，必要时计算 Sum32。
- [ ] 总 zip 根目录和文件清单与上一版正式包一致。
- [ ] 最终输出记录文件来源、替换内容、删除内容和所有校验值。

## 1.09 已验证记录（2026-09-04）

- 目录：`/bmc/joshua/P9000s/test/v109/Inventec_P9500AG7_BMC_1.09.00/`
- 候选 ZIP：`/bmc/joshua/P9000s/test/Inventec_P9500AG7_BMC_1.09.00.zip`
- HPM 内部版本：`1.9`
- FWUpdate Tool：v1.1；Gerrit Change 19615 已合入；v1.1 Release 在恢复后的 `.200` Gerrit 重建为 Change 19653，已合入（旧 Change 19632 已丢失且编号被其他变更占用）。
- 最终结构：16 个 ZIP 条目、10 个文件；含1.09测试报告，不含外部 `test-evidence-20260904`。
- 总 ZIP：Sum32 `e4b3ccf1`，MD5 `1d50c9235f74205cc26fe5c9c003e4c8`，SHA-256 `10cece6ecd56a4d4c0347eb754f1a24cea25c31c99f559765497ae42cce43e43`。
- 测试总结果：`FAIL`。阻断项为 Bug #31568 的 `MEM_Power=0 W`（稳定态10/10）和 PSU OEM AC 自动恢复仅2/3。
- 详细状态：`/bmc/joshua/P9000s/test/v109/RELEASE_STATUS.md`。
