# SPX BMC 项目审查路由

本文件是 SPX 项目检查入口，只负责将代码特征路由到对应清单。具体规则以被引用的专项文件为准，不在本文件重复维护。

## 基础路由

基础清单的加载范围由 SKILL.md「必须加载」与「按场景加载」决定；所有代码变更固定使用 `references/checklists/general-review-checklist.md`。

## SPX 检查领域

| 检查领域 | 触发条件 | 加载文件 | 报告行为 |
|---|---|---|---|
| 资源生命周期 | 文件、FD、内存、cJSON、锁、socket、timer 等需释放资源 | `references/checklists/spx/resource-lifecycle-checklist.md` | 发现问题时报告；所有权不明时标记待提供证据 |
| 控制流与边界 | 判断、循环、数组、内存复制、初始化、格式化字符串 | `references/checklists/spx/control-flow-boundary-checklist.md` | 发现问题时报告 |
| 并发与调用链 | 修改已有函数契约、共享状态、线程/进程/回调/fork | `references/checklists/spx/concurrency-call-chain-checklist.md` | 记录调用链覆盖范围；无法解析处标记待提供证据 |
| 全仓符号冲突 | 新增或修改全局变量、数组、`extern` 或宏 | `references/checklists/spx/symbol-conflict-checklist.md` | 输出逐标识符搜索证据 |
| 日志转储 | 日志缓冲、队列、转储、轮转、发送、清理或所有权 | `references/checklists/spx/logging-risk-checklist.md` | 固定输出三态结果；命中风险时说明积压/泄漏原因和所需证据 |
| 升级与系统文件 | BMC 升级逻辑或系统内部文件新增、修改、移动、删除 | `references/checklists/spx/upgrade-system-file-risk.md` | 按专项清单保留强制 `X` 和风险确认；材料齐全时如实说明已验证范围 |
| 硬件与配置 | 硬件控制、寄存器、配置映射、北向接口或 AC Cycle 影响 | `references/checklists/spx/hardware-config-risk.md` | 固定输出三态结果；命中风险时说明配置影响和测试缺口 |
| Sensor 与 ADC | Sensor 参数、显示状态、负值/符号转换、Health LED 联动、温度 Sensor 散热策略、事件 mask、ADC 采样/转换/校准/AC 读值 | `references/checklists/spx/sensor-adc-risk.md` | 固定输出三态结果；逐 Sensor 列出显示场景、负值策略、Health LED 级别/恢复条件及温度 Sensor 散热策略，缺失时提示风险 |
| 北向操作审计日志 | 新增或修改 IPMI、Web、Redfish 状态变更动作 | `references/checklists/spx/northbound-operation-audit-checklist.md` | 固定输出三态结果；命中风险时说明入口、缺失审计路径和敏感信息风险 |
| IPMI 权限变更影响 | IPMI 指令权限、角色、通道权限、会话要求或权限映射变更 | `references/checklists/spx/ipmi-privilege-impact-checklist.md` | 按专项清单区分调用方命中的强制 `X` 与搜索/测试证据缺口 |
| 部件升级/长时操作散热 | 部件固件升级、烧录、校验、诊断或长时间占用总线/锁/线程的操作 | `references/checklists/spx/long-operation-thermal-risk.md` | 固定输出三态结果；命中风险时说明温度数据过期、临时散热、fail-safe 和恢复条件 |

## 证据状态

- `已检查-不涉及`：变更未命中该领域，并简述判断依据。
- `已检查-无风险`：变更涉及该领域，检查完成且未发现问题或证据缺口，且未命中专项强制提示条件。
- `当前项有风险`：存在确定性问题、潜在影响，缺少生成物、仓外调用、硬件规格、运行测试、测量结果及部门确认材料，或命中专项强制提示；必须按模板定义的四要素说明，不得将材料齐全的强制提示写成证据缺口。
- 三态对应的 `V`/`X` 标记取值、状态一致性及关联详细项填写以 `assets/review-report-template.md` 为准，标记不得留空。
