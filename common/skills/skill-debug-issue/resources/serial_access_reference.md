# 串口访问快速参考

具体机台与串口映射、认证来源统一查阅 [访问台账](pass.md)，并在操作前现场探测 `/dev/ttyUSB*` 与占用情况；只有需要确认 HOST OS 或 BMC IP 时，才读取 [机台信息采集资源](machine_info.md)。下文均使用占位符，严禁在命令或文档中写入明文密码。

## 常规流程

1. 登录串口宿主机（或 HOST OS）：

```bash
ssh <SERIAL_USER>@<SERIAL_HOST>
```

2. 进入串口（`<TTY_DEV>` 由现场 `ls -l /dev/ttyUSB*` 确认；有 `dialout` 权限时无需 `sudo`）：

```bash
# 方法1：直接使用 minicom
minicom -o -D <TTY_DEV>

# 方法2：使用 screen
screen <TTY_DEV> 115200

# 方法3：使用 cu
cu -l <TTY_DEV> -s 115200
```

3. BMC 串口状态处理：
   - 如果看到 `login:`，在可见终端输入串口账号与密码。
   - 如果看到 `~ #`，直接执行命令。
   - 如果不确定状态，先执行 `id`。

4. 若需要恢复 SSH 密码：

```bash
passwd sysadmin
```

5. 若希望自动完成整套串口改密流程，必须显式传入所有目标与授权参数（脚本无硬编码默认凭据/IP）：

```bash
cd /home/zlsu/bmcrepo/RR12_1_07/.github/skills/skill-debug-issue
python3 resources/reset_bmc_ssh_password_via_serial.py \
  --serial-host <SERIAL_HOST> --serial-user <SERIAL_USER> --serial-password '<SERIAL_PASS>' \
  --serial-device <TTY_DEV> \
  --bmc-serial-user <BMC_SERIAL_USER> --bmc-serial-password '<BMC_SERIAL_PASS>' \
  --new-password '<NEW_SSH_PASS>' \
  --verify-ssh-host <BMC_IP> --verify-ssh-password '<NEW_SSH_PASS>'
```

可选参数：`--skip-ssh-verify`（跳过 SSH 验证）、`--preserve-capture`（保留现有串口采集进程不中断）。

## 状态判断

1. 等待登录状态：显示 `login:`。
2. 已登录 shell 状态：显示 `~ #`。
3. 空闲状态：无输出，按回车可激活。

```bash
# 发送回车激活串口
[回车]

# 如果不确定，执行 id 确认
id
```

## 常见避坑

1. SSH host key 冲突时，先核对真实主机指纹再清理旧记录；临时排查可使用一次性验证：

```bash
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null <SERIAL_USER>@<SERIAL_HOST>
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null sysadmin@<BMC_IP>
```

2. 如果报 `sudo: no tty present and no askpass program specified`，先交互式 SSH 登录目标主机再本地执行 `sudo`。
3. 如果 `minicom` 报 `No cursor motion capability (cm)`，先执行 `export TERM=xterm`，或改用 `screen` / `cu`。
4. 如果不确定当前是否已进 BMC shell，先发 `Ctrl+C`、回车，再执行 `id`；若输出 `uid=0(sysadmin)`，说明已在 BMC shell。
5. 自动化脚本不要只匹配 `#`、`>` 或 minicom 控制字符，必须用真实命令回显确认；串口可能被其他进程占用，先检查 `lsof <TTY_DEV>`。
6. `reset_bmc_ssh_password_via_serial.py` 默认会临时停止直接读取 `<TTY_DEV>` 的 `cat <TTY_DEV>` 采集进程，并在改密完成后自动恢复到当天的 `/tmp/bmc_serial_YYYYMMDD.cap`；若现场明确要求不动采集进程，加 `--preserve-capture`。

## 串口日志轮转（跨天/按需）

串口采集进程（`cat <TTY_DEV> >> /tmp/bmc_serial_YYYYMMDD.cap`）不会自动轮转，跨天前需手动操作。

### 步骤

**1. 登录串口宿主机后查看当前采集进程与日志文件**

```bash
ls -lh /tmp/bmc_serial_*.cap; echo "---"; ps aux | grep "<TTY_DEV>" | grep -v grep
```

关注：文件名日期是否落后于今天；`bash -c cat <TTY_DEV> >> ...`（父进程）与 `cat <TTY_DEV>`（子进程）各自的 PID。

**2. Kill 旧进程（两个 PID 都要 kill；需提权时在可见终端手工输密码）**

```bash
sudo kill <父PID>; sleep 1; sudo kill <子PID>
```

**3. 启动新采集进程**

```bash
sudo sh -c "nohup cat <TTY_DEV> >> /tmp/bmc_serial_$(date +%Y%m%d).cap &"
```

**4. 验证**

```bash
ps aux | grep "<TTY_DEV>" | grep -v grep; ls -lh /tmp/bmc_serial_$(date +%Y%m%d).cap
# 仅剩 1 个 cat 进程；文件已创建（初始 0 字节，有串口输出即增长）
```

### 注意事项

- 串口宿主机地址与认证信息统一查阅 [访问台账](pass.md)，不要在命令行或历史记录里 `echo <密码> | sudo -S`。
- 旧的 bash wrapper（父进程）和 cat（子进程）均需 kill，否则旧子进程仍在占设备写旧文件。
- 压测脚本 `run_redfish_restart_repro_mode6.sh` 的 `--serial-source` 参数每次启动时需指定当天文件路径，不要硬编码日期。

---

## 串口排查命令

```bash
# 检查当前用户和权限
id

# 查看进程列表
ps | head -10

# 检查文件描述符使用
ls /proc/$$/fd | wc -l

# 查看系统负载
uptime

# 检查内存使用
cat /proc/meminfo | head -5

# 查看网络连接
netstat -tuln 2>/dev/null | head -5

# 检查 Redfish 会话
ls -la /tmp/redfish/ 2>/dev/null || echo "No redfish tmp dir"
ls -la /var/racsessioninfo 2>/dev/null || echo "No racsessioninfo"
```