# core dump 分析参考

按需读取：仅在 BMC 进程崩溃留有 `/tmp/core.*` 文件，需要分析崩溃原因时读取。

> **参考文档：**
> 详细的 Coredump 获取、gdb 交叉编译链挂载流水线以及已知崩溃的原始分析过程与结论，参阅：
> - `docs/coredump-analysis-howto.md`
> - `docs/spx-restservice-ext-crash-analysis.md`

## 背景

- BMC 上 `cwd=/usr/local/bin` 是 cramfs 只读分区，默认 core dump 无法落盘。
- 解决方法：在进程启动时或在线把 core dump 路径重定向到可写目录 `/tmp`：

  ```bash
  echo '/tmp/core.%e.%p' > /proc/sys/kernel/core_pattern
  ```

  `%e` = 可执行文件名（最多 15 字符），`%p` = PID。BMC 重启后失效，需重设。
- 本项目 `spx_rest_ext.c` 的 `main()` 已加入自动写入逻辑，刷机后进程每次启动时自动设置。

## 强制复核项

1. **每次刷机、BMC reboot、web 重拉后，在线重新确认运行态**，至少检查：
   - `cat /proc/sys/kernel/core_pattern`
   - `grep 'Max core file size' /proc/<PID>/limits`
   - `readlink /proc/<PID>/cwd`
   - `cwd` 所在目录是否可写
2. 若 `core_pattern` 仍是相对路径 `core`，且 `cwd=/usr/local/bin`、`/` 为 `cramfs (ro)`，直接判定为 **coredump 没有真正打开**。
3. 若目标是尽量保留下一次崩溃现场，优先把 `core_pattern` 指向持久可写目录 `/extlog/core.%e.%p`；若不满足再退回 `/tmp/core.%e.%p`。
4. 设置完成后，用最小 shell 进程独立验证：`sh -c 'ulimit -c unlimited; kill -SEGV $$'`，确认目标目录下真的生成 `core.sh.<pid>`。

## 步骤一：在线确认 core 文件

优先使用统一远端执行工具检查（避免重复手写 paramiko 模板）：

```bash
python3 scripts/bmc_exec.py --target rr12 --cmd 'ls -la /tmp/core.* 2>/dev/null || echo NO_CORE; cat /proc/sys/kernel/core_pattern'
```

注意：`spx_restservice_ext`（19 字符）因 `%e` 最多 15 字符限制，core 文件名会截断为 `core.spx_restservice.<pid>`。

## 步骤二：立即把 core 文件下载到本地

**core 文件在 `/tmp`（tmpfs），BMC 重启后消失，收到 core 要立即下载。**

> **注意**：BMC 无 `md5sum`，校验完整性时用本地 Python `hashlib` 对下载文件计算 MD5。

### 批量下载（SFTP）

需要 SFTP 传文件时，凭据在内存中按表头从授权表解析（或复用 `scripts/bmc_exec.py` 中的 `parse_inventory`/`connect_ssh`），严禁硬编码密码：

```python
import os
from pathlib import Path
from scripts.bmc_exec import connect_ssh, DEFAULT_INVENTORY, parse_inventory, resolve_target

info = resolve_target("rr12", parse_inventory(Path(DEFAULT_INVENTORY)))
client = connect_ssh(info, auth_mode="auto", timeout=20, strict_host_key=False)
sftp = client.open_sftp()
for fname in sftp.listdir("/tmp"):
    if fname.startswith("core."):
        local = os.path.join("/tmp", fname)
        sftp.get(f"/tmp/{fname}", local)
        print(f"downloaded {fname}, size={os.path.getsize(local)}")
sftp.close()
client.close()
```

如有多个 core，优先分析**第一个**（PID 最小、文件最大），后续是 respawn 后重复崩溃。

## 步骤三：找 ARM 交叉工具链 gdb

```bash
which arm-linux-gnueabihf-gdb || which gdb-multiarch
find /opt /usr -name "arm-*gdb" 2>/dev/null | head -5
```

## 步骤四：用 gdb 分析 core dump

```bash
# 带符号的 spx_restservice_ext 二进制（workspace 构建产物，未 stripped）
SPX_BIN=/home/zlsu/bmcrepo/RR12_1_07/workspace/Build/.workspace/tmp/spx_restservice_extension-6.1.0.0.0-src/tmp/spx_restservice_ext
CORE=/tmp/core.spx_restservice.1749

arm-linux-gnueabihf-gdb "$SPX_BIN" "$CORE" <<'EOF'
set pagination off
bt full
info registers
info threads
thread apply all bt
quit
EOF
```

常用 gdb 命令：

| 命令 | 作用 |
| --- | --- |
| `bt` / `bt full` | 打印崩溃调用栈（含局部变量） |
| `info registers` | 查看 CPU 寄存器，`pc` 指向崩溃指令 |
| `info threads` / `thread apply all bt` | 查看全部线程调用栈（多线程崩溃关键） |
| `frame N` / `list` / `p <var>` | 切帧、看源码、打印变量 |

## 步骤五：信号类型速查

在 gdb 输出中查 `Program terminated with signal`：

| 信号 | 编号 | 含义 | 常见原因 |
| --- | --- | --- | --- |
| `SIGSEGV` | 11 | 段错误 | 空指针解引用、野指针、栈溢出 |
| `SIGABRT` | 6 | 主动中止 | `assert()` 失败、`abort()`、heap corruption |
| `SIGBUS` | 7 | 总线错误 | 内存对齐错误（ARM 常见） |
| `SIGFPE` | 8 | 浮点异常 | 除以零 |
| `SIGILL` | 4 | 非法指令 | 函数指针损坏、代码段损坏 |

## 注意事项

1. gdb 需要与 core 对应的**未 stripped 二进制**（workspace 构建产物），不是 BMC 上的 stripped 版本。
2. 若 gdb 报 `No debugging symbols found`，说明 binary 已 stripped，结合 `addr2line` 与汇编定位源码行。
