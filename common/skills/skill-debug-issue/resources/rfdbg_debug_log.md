# RFDBG 调试日志参考

按需读取：仅在分析 `spx_restservice_ext` session 创建/重启时序时读取。

## 背景

`rest_default.c` 中的 `RFDBG` 宏在编译时通过 `-DREDFISH_RESTART_DEBUG` 开启（本项目 Makefile 已默认加入）。日志写到 `/tmp/rfdbg.log`（经 `TINFO` → `local0.info`），**不是** `info.log` 或 `debug.log`。

常见误区：
1. 只查 `info.log` / `debug.log`，漏看 `/tmp/rfdbg.log`。
2. 只看当前 `rfdbg.log`，忽略轮转文件 `/tmp/rfdbg.log.1` 及 `info.log.*.gz`。
3. 刷机后误以为已生效，实际 BMC 仍在运行旧 binary。

## 确认 RFDBG 是否生效

```bash
python3 scripts/bmc_exec.py --target rr12 --cmd "grep '\[RFDBG\]' /tmp/rfdbg.log | tail -5; cat /proc/ractrends/Helper/FwInfo"
```

## 日志路径与查看命令

```bash
# 在线查看（优先用 scripts/bmc_exec.py）
python3 scripts/bmc_exec.py --target rr12 --cmd "grep '\[RFDBG\]' /tmp/rfdbg.log | tail -50"

# 一键日志解压后
grep '\[RFDBG\]' IEC_Diag/Development/log/log/rfdbg.log 2>/dev/null || \
grep '\[RFDBG\]' IEC_Diag/Development/log/log/info.log

# 只看复现窗口附近（UTC 时间）
awk '/13:03:[0-9]/{p=1} p{print}' /tmp/rfdbg.log | grep '\[RFDBG\]' | head -40
```

## RFDBG 打点含义

| 日志关键词 | 含义 |
| --- | --- |
| `create_session auth success` | PAM 认证通过，开始创建 session |
| `racsession scan: total_records=...` | 当前 racsession 数量 |
| `racsession register: ret=... id=...` | racsession 注册结果，`ret != 0` 表示失败 |
| `racsession limit reached` | session 数量触及上限（max=10） |
| `qcgisess_save failed` | session 文件落盘失败（racsession 已注册但文件未写） |
| `cleanup_orphan_rac_sessions completed: total=X cleaned=Y` | 孤立 session 自愈结果 |
| `cleanup_orphan_rac_sessions skipped` | 自愈跳过（通常因为 lock file 存在） |

注意：`/v1/SessionService/Sessions` 的实际实现在 `rest_default.c` 的 `login_handler`，不是 `post_sessions.c`（`main()` 未调用后者）。

## 关键分析路径

1. `info.log` 无 `[RFDBG]` → 查 `/tmp/rfdbg.log` 和 `info.log.*.gz`。
2. 出现 `racsession limit reached` → session 满路径已触发。
3. 出现 `qcgisess_save failed` → racsession 已注册但 qsession 文件未落盘（孤立 session 来源）。
4. `cleanup completed: total=X cleaned=0` → 自愈条件未满足（目录非空或 60s 未过）。
5. `rfdbg.log` 长时间空白（gap）→ 进程 hang 或 crash 窗口，与 `redfish_pid_monitor.log` 的 `[change]` 行对齐定位崩溃时刻。
