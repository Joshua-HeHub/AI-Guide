# skill-pua 上游说明

## 上游来源

当前仓库内的 [SKILL.md](./SKILL.md) 是本地落地版，不是上游仓库的原文镜像。

上游项目和文档入口如下：

- 官网：[https://openpua.ai/](https://openpua.ai/)
- GitHub 仓库：[https://github.com/tanweai/pua](https://github.com/tanweai/pua)
- 上游 skill 文件：[https://github.com/tanweai/pua/blob/main/skills/pua/SKILL.md](https://github.com/tanweai/pua/blob/main/skills/pua/SKILL.md)
- 上游英文 README：[https://github.com/tanweai/pua/blob/main/README.md](https://github.com/tanweai/pua/blob/main/README.md)
- 上游中文 README：[https://github.com/tanweai/pua/blob/main/README.zh-CN.md](https://github.com/tanweai/pua/blob/main/README.zh-CN.md)

## 为什么这里不是原文镜像

当前仓库内的版本做了本地化裁剪，保留了这些核心机制：

- 卡壳触发条件
- 失败升级机制
- 五步排查方法
- 七项强制检查
- 交付后验证和结构化退出

没有直接做成上游原文镜像的原因是：

- 当前仓库更需要本地可维护、可控的版本。
- 上游内容更新较快，直接拷贝后容易和官方版本漂移。
- 本地版本更适合作为仓库内的工作流 skill 使用。

## 如果你想保持“上游原味”

更合适的方式不是继续手工改本地文本，而是把这里当成“本地落地版”，把上游当成“官方来源”。

建议后续按下面方式维护：

1. 先看上游 skill 和 README 是否有更新。
2. 比较上游方法论、触发条件、安装方式和本地版本差异。
3. 只把你确认要引入当前仓库的变化手工同步到 [SKILL.md](./SKILL.md)。

## 已确认的上游信息

- 上游仓库存在 `README.md`、`README.zh-CN.md` 和 `skills/pua/SKILL.md`。
- 官网 `openpua.ai` 也提供项目说明、触发条件、方法论、实验数据和安装方式。
- 上游项目更新频率较高，当前抓取到的仓库状态显示最近数小时内仍有更新。

## 当前仓库的取舍

当前仓库保留的是：

- 一个可被本地 VS Code 发现和使用的 `skill-pua`
- 一个较短、可维护、适合本仓库风格的 `SKILL.md`
- 这一份 README 用来指向官方来源和说明差异

如果后续你确定要切换成“尽量贴近上游原文”的版本，建议基于上游链接重新评估后再覆盖本地文件。