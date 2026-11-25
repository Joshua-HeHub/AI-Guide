# 一键日志快速参考

## 现成脚本

1. 脚本路径：`/home/zlsu/bmcrepo/RR12_1_07/sel_false_alarm_checker/release/check_false_alarm_during_onekey.sh`
2. 关键函数：`check_bmc_log_status()`、`download_and_parse_audit_log()`

## API 路径

1. 触发：`POST /redfish/v1/Managers/0/LogServices/Actions/Oem/Bytedance/CollectAllLog`
2. 状态：`GET /redfish/v1/Managers/0/LogServices/Actions/Oem/Bytedance/CollectAllLog.Status`
3. 下载：`POST /redfish/v1/Managers/0/LogServices/Actions/Oem/Bytedance/DownloadAllLog`

## 解压与查看

```bash
EXTRACT_DIR="/tmp/bmc_logs_extract"
mkdir -p "$EXTRACT_DIR"
unzip /tmp/bmc_onekey_log.zip -d "$EXTRACT_DIR"

# 查看固件版本
cat "$EXTRACT_DIR/IEC_Diag/Development/proc/FwInfo"

# 查看 KVM/Web 登录记录
grep -i "kvm\|adviser\|Login\|Logout" "$EXTRACT_DIR/IEC_Diag/Development/log/extlog/audit.log"

# 查看 session 状态
xxd "$EXTRACT_DIR/IEC_Diag/Development/var/racsessioninfo" | head -60

# 查看错误日志
cat "$EXTRACT_DIR/IEC_Diag/Development/log/log/err.log" | tail -50
```

## 判断正式版 / 测试版

```bash
cd /home/zlsu/bmcrepo/RR12_1_07
git log --oneline | grep "RELEASE.*3.18"
git show <commit_hash> --format="%ai" --no-patch
```

1. `FW_DATE` 接近 release commit 日期，一般判为正式版。
2. `FW_DATE` 为近期 build 日期，且与 release commit 日期相差数周或更长，一般判为测试版。