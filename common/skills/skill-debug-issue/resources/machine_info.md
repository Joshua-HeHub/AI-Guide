# 机台信息与 BMC IP（按需加载）

仅在用户请求机台信息、machine info、BMC IP、HOST OS 本地 KCS/IPMI 查询，或需要确认采集目标时读取本文件。其他调试分支不默认加载或执行这里的采集步骤。

## 入口与认证来源

- 机台 IP、HOST OS、串口映射和各协议认证专用列以 [访问台账](pass.md) 为唯一来源，不维护第二份机台清单。
- 非交互访问使用仓库统一工具 [bmc_exec.py](../../../../scripts/bmc_exec.py)，由它按表头在内存中解析授权信息，不打印或复制凭据。
- 采集脚本是 [machine_info.py](machine_info.py)；HOST OS SSH、BMC SSH、Redfish/IPMI 的认证边界分别核对。
- KCS 查询在目标 HOST OS 本地执行，不需要带外 IPMI 凭据。

## 只读采集

以下命令在代码机的仓库根目录执行，通过 SSH 访问指定 HOST OS，再在该 HOST OS 上运行本地 KCS 查询：

```bash
rtk proxy bash scripts/ai_terminal_exec.sh '列出机台目标（只读）' rtk proxy python3 scripts/bmc_exec.py --list-targets
rtk proxy bash scripts/ai_terminal_exec.sh '从 RR12 HOST OS 只读采集机台信息' rtk proxy python3 scripts/bmc_exec.py --target rr12-host --script-file .github/skills/skill-debug-issue/resources/machine_info.py --interpreter 'python3 -'
```

按用户指定机台选择 target；RR13 / P9500AG7 使用 `rr13-host`，不要自动扩展为双平台采集。也可在已确认的目标 HOST OS 本地运行采集脚本，不能把代码机的本地信息当作目标机台信息。

脚本读取 hostname，并只读执行 `uname`、`ip -brief address` 和 `ipmitool -I open lan print`，输出 JSON：

- `hostname`、`os.uname`、`os.ip_addr`：HOST OS 身份与网络信息。
- `ipmi.status`、`ipmi.returncode`：KCS/IPMI 子步骤状态。
- `bmc.ip`、`bmc.lan_summary`：KCS 查询得到的 BMC IP、MAC 和地址来源。

脚本不会修改 BMC、OS、网络或固件，也不读取 BMC 固件版本或产品信息。如需固件版本，另行通过 SSH 在对应 BMC 上只读查询：

```bash
rtk proxy bash scripts/ai_terminal_exec.sh '读取 RR12 BMC 固件版本（只读）' rtk proxy python3 scripts/bmc_exec.py --target rr12 --cmd 'cat /proc/ractrends/Helper/FwInfo'
```

## 结果确认

- 同时核对远端退出码和 JSON 子步骤状态；采集脚本退出码为 0 不代表 KCS 查询成功。
- 只有 `ipmi.status` 为 `ok` 且 `bmc.ip` 非空时，才能确认已取得 BMC IP。
- `ipmitool_not_found`、`failed` 或 BMC IP 为空时，按实际结果记录缺口；KCS 失败不等于 SSH 认证失败或 BMC 网络不可达。
- 串口设备号仍须现场探测，静态台账或本脚本不能证明当前 `/dev/ttyUSB*` 映射和占用状态。