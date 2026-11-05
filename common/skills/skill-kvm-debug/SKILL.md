---
name: skill-kvm-debug
description: '用于远程 KVM / 浏览器 KVM / Host OS 在线调试。适用于用户提到 KVM、远程控制台、浏览器 KVM、Host OS、带内调试、KVM 输入失败、KVM 截图、远程机台验证、Lan-over-USB、需要用户在 KVM 手动执行命令等场景。重点处理 KVM 输入不可靠、人机分工、Host/BMC/本地三端证据闭环。'
argument-hint: '可选说明目标机台、KVM 页面、Host OS 状态、需要执行的命令或当前失败现象'
user-invocable: true
---

# KVM Remote Debug Skill

## 何时使用

- 需要通过浏览器 KVM / 远程控制台观察或操作 Host OS。
- KVM 输入异常，例如按键丢失、大写/Shift/特殊字符错误、命令进入网页隐藏输入框。
- 需要用户在 Host OS 手动执行命令，AI 同步在 BMC / 本地侧验证。
- 带内升级、Lan-over-USB、Host 与 BMC 之间链路排查。
- 需要用截图、BMC SSH、IPMI、iptables 计数器等证据形成闭环。

## Agent 模式提醒

如果任务需要直接操作浏览器 KVM 页面，必须先确认当前 Agent 是否有浏览器交互工具，例如截图、页面读取、Playwright / `run_playwright_code`、键盘输入等能力。

当当前 Agent 没有这些工具时，不要硬凑，也不要假装能操作 KVM。应立即提醒用户：

> 当前 Agent 模式缺少浏览器/KVM 交互工具，无法可靠操作远程 KVM 页面。请切换到默认 Agent / 默认 Copilot，或由你在 KVM 内手动执行命令，我负责在 BMC/本地侧并行验证。

如果浏览器工具存在但普通键盘输入不稳定，先尝试标准 KVM 注入脚本；脚本不适配时再把 KVM 降级为观察通道。

## 核心原则

1. KVM 首先是观察通道，不是可靠 shell。
2. 如果当前 Agent 有浏览器脚本能力，优先使用标准 KVM 注入脚本输入长文本、大写和常见符号；不要依赖普通键盘 type。
3. 涉及密码、token、API key 等敏感信息时，必须让用户手动输入，AI 不经手。
4. 不要仅凭 KVM 截图判断命令已执行；必须看到输出、返回码、状态变化或对端计数。
5. 远程调试要分清三端：Host OS、BMC、AI 本地环境。
6. 所有结论必须标注证据来源；未实测的推断必须写“未验证”。

## KVM 输入可靠性规则

浏览器 KVM 常见问题：

- 隐藏文本框抢焦点，输入进入网页控件而非 Host shell。
- `type_in_page` / 自动键盘注入可能吞字符、重复字符或错位。
- Shift、大写参数、感叹号、引号、反斜杠等特殊字符容易出错。
- 只按 Enter 有时也不会送进 Host shell。
- 截图上的光标位置不一定代表浏览器焦点位置。

### 稳定的大写/长文本/特殊符号脚本化注入技术（AI 专用）

如果 AI 正在使用支持 Playwright 或 `run_playwright_code` 的 Agent，切忌直接使用底层键盘 type 命令。应调用标准投递脚本自动化输入：

- 脚本：[resources/kvm_injector.js](resources/kvm_injector.js)
- 调用说明：[resources/kvm_injector_usage.md](resources/kvm_injector_usage.md)

1. **查找隐藏焦点输入组件**：该页面（如 AMI HTML5 Viewer）往往有一个隐藏的焦点文本框（通常为 `input#kvm_textbox`），它注册了 `onkeydown` 和 `onkeyup` 事件。
2. **加载并运行标准投递脚本**：读取 `resources/kvm_injector.js`，在浏览器上下文注册 `window.kvmInjectString()`。
3. **投递后验证**：每次脚本输入后必须截图或读取输出，确认字符真实进入 Host shell；必要时用 BMC/本地侧证据闭环。
4. **降级条件**：如果页面没有 `kvm_textbox`、事件模型不匹配、脚本输入失败，或内容涉及敏感信息，停止自动输入并请用户手动输入。

## 人机分工

当 Host OS 只能通过 KVM 访问时，推荐分工：

- 用户：只在涉及敏感信息、浏览器脚本工具不可用、或标准注入脚本失效时手动输入。
- AI：优先用标准 KVM 注入脚本输入非敏感长命令、大写和常见符号。
- AI：通过 BMC SSH、IPMI、Redfish、本地脚本并行验证另一侧状态。
- AI：读源码、查日志、设置临时计数器、解释输出和给出下一步。

触发人机分工提醒的场景：

- 标准 KVM 注入脚本失败 1 次以上，或页面事件模型不匹配。
- 命令包含密码、token、API key 等敏感信息。
- 当前 Agent 缺少浏览器/KVM 交互工具。
- 手动执行预计比自动操作快很多。

建议话术：

> 这一步涉及敏感输入或当前 KVM 页面不适配标准注入脚本，建议你在 Host shell 手动执行。我会同时在 BMC 侧看计数器/日志，执行完告诉我即可。

## 保留现场规则

排查脚本类问题时，不要忽略脚本退出清理逻辑。

常见清理动作：

- 关闭 Lan-over-USB / USB 网卡。
- 删除临时网络配置。
- kill 后台进程。
- 删除临时文件或日志。

排查方法：

1. 先读脚本退出路径、trap、cleanup、close 函数。
2. 必要时临时注释清理调用，或在清理前插入暂停点。
3. 记录是否改过现场脚本，以及是否需要恢复。
4. 不要在脚本退出后用“设备不存在”反推执行中设备没起来。

## 三端定位法

### Host OS 侧

常用证据：

```bash
ip addr
ip route get <target-ip>
ip neigh show dev <iface>
arp -n
ping -c 3 <target-ip>
ipmitool -vvv ...
dmesg | tail -80
```

关注点：

- 网卡是否出现。
- IP / netmask 是否正确。
- route 是否走目标接口。
- ARP 是否 `REACHABLE`、`STALE`、`FAILED` 或 `INCOMPLETE`。
- 命令真实 stderr 是什么，脚本是否吞掉了错误。

### BMC 侧

常用证据：

```bash
ip addr show <iface>
ip neigh show dev <iface>
cat /sys/class/net/<iface>/carrier
cat /sys/class/net/<iface>/operstate
iptables -L INPUT -n -v --line-numbers
iptables -L OUTPUT -n -v --line-numbers
netstat -lunp 2>/dev/null | grep ':623'
lsof -i UDP:623 2>/dev/null
```

关注点：

- BMC 接口是否 `UP/LOWER_UP`。
- BMC 是否能反向 ping Host。
- 防火墙是否允许目标地址/端口。
- 服务是否监听，例如 UDP 623 / RMCP。
- 是否有系统参数影响 ARP，例如 `arp_ignore`、`arp_filter`、`rp_filter`。

### AI 本地侧

常用动作：

- 读脚本和源码定位真实失败分支。
- 用管理口 IPMI/SSH 验证账号、服务、channel 配置。
- 用 grep 搜索固定 IP、接口名、raw command、cleanup 函数。
- 保留对照证据，避免被脚本统一误报误导。

## 网络分层排查模板

按顺序排查，避免跳层猜测：

1. 设备层：Host/BMC 两端接口是否存在、是否 up。
2. 地址层：两端 IP、netmask、route 是否正确。
3. ARP 层：Host 是否能解析 BMC MAC，BMC 是否回复 ARP。
4. ICMP 层：双向 ping 是否一致。
5. 防火墙层：iptables/nft 是否允许目标地址和端口。
6. 服务层：目标端口是否监听，进程是否存在。
7. 协议层：认证、cipher、channel、权限、session limit。
8. 脚本层：脚本是否吞 stderr、统一误报或过早清理现场。

## 无 tcpdump 时的 iptables 计数法

如果远端没有 tcpdump，可以用 iptables 计数器判断包是否到达/是否回包。

示例：观察 BMC 是否收到 Host 到 UDP 623 的请求，以及是否回给 Host：

```bash
iptables -C INPUT -i <iface> -p udp --dport 623 -j ACCEPT 2>/dev/null || \
  iptables -I INPUT 1 -i <iface> -p udp --dport 623 -j ACCEPT

iptables -C OUTPUT -o <iface> -p udp --sport 623 -j ACCEPT 2>/dev/null || \
  iptables -I OUTPUT 1 -o <iface> -p udp --sport 623 -j ACCEPT

iptables -Z INPUT
iptables -Z OUTPUT

iptables -L INPUT -n -v --line-numbers | sed -n '1,10p'
iptables -L OUTPUT -n -v --line-numbers | sed -n '1,10p'
```

解读：

- `INPUT` 增加、`OUTPUT` 不增加：请求到达 BMC，但 BMC 服务没有生成响应或被本机处理链路丢弃。
- `INPUT` 不增加：Host 包没有到 BMC，回到 Host route/ARP/firewall 排查。
- `INPUT` 和 `OUTPUT` 都增加：BMC 已响应，继续查 Host 是否收到、协议/cipher/session 是否失败。

注意：

- 计数前应清零，避免历史包污染。
- 不要同时用外部管理口执行同端口协议命令，否则会污染全局计数。
- 必要时按接口、源/目的地址进一步限定规则。

## Lan-over-USB / IPMI over USB 特别提醒

Lan-over-USB 问题容易被脚本误报成账号错误。排查时先确认：

```bash
ip addr show <usb-iface>
ip neigh show dev <usb-iface>
cat /proc/sys/net/ipv4/conf/<usb-iface>/arp_ignore
cat /proc/sys/net/ipv4/conf/all/arp_ignore
```

如果 Host 侧 ARP 为 `FAILED` 或 `INCOMPLETE`，优先查 BMC 是否回复 ARP，而不是继续猜密码。

IPMI 失败时，要区分：

- 账号在管理口是否有效。
- Host 到 BMC USB IP 是否 ping 通。
- UDP 623 请求是否到达 BMC。
- BMC 是否从 USB 口回包。
- IPMI channel / RMCP / cipher 是否配置正确。

## 结论输出要求

结论必须包含：

1. 当前终极目标和当前目标。
2. 已验证事实，列出证据来源。
3. 已排除项。
4. 未验证项，明确写“未验证”。
5. 下一步最短验证命令或修复方向。

不要把脚本的统一错误文案直接当作根因。例如 `Incorrect username or password` 可能只是底层网络、ARP、RMCP、cipher、channel 任意失败的外层误报。