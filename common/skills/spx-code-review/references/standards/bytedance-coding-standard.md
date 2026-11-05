# ByteD 固件 C 编码规范 — 可检查清单

基于《固件C编码规范_V1.4》。审查 C 代码时逐条对照以下规则。

---

## 1. 类型定义

- [ ] 使用 `INT8U/INT16U/INT32U` (无符号) 和 `INT8S/INT16S/INT32S` (有符号)
- [ ] 未使用原始 `unsigned char/short/int` 等类型

## 2. 变量命名 — 匈牙利命名体系

### 一般变量
- [ ] 格式: `<类型前缀><大写开头名字>`, 中间不允许 `_`
- [ ] 无符号: `u8Xxx` / `u16Xxx` / `u32Xxx`
- [ ] 有符号: `s8Xxx` / `s16Xxx` / `s32Xxx`
- [ ] 定义时必须初始化

```
INT8U u8LengthOfPacket = 0;
INT16U u16LengthOfPacket = 0;
INT32U u32LengthOfPacket = 0;
INT8S s8LengthOfPacket = 0;
INT16S s16LengthOfPacket = 0;
INT32S s32LengthOfPacket = 0;
```

### 数组变量
- [ ] 前缀 `a`, 如 `au8PacketPayload[100]`, `as16PacketPayload[100]`

### 指针变量
- [ ] `*` 紧跟类型后面, 和变量以空格隔开
- [ ] 前缀 `p` (一级指针), `pp` (二级指针)
- [ ] 初始化为 NULL

```
INT8U* pu8PacketPayload = NULL;
INT16U* pu16PacketPayload = NULL;
INT32U* pu32PacketPayload = NULL;
```

### 枚举变量
- [ ] 类型名以大写 `E` 开始, 枚举值全大写 + `_`
- [ ] 变量前缀 `e`

```
typedef enum {
    FUNC_OK = 0,
    FUNC_FAILED,
} EFuncRetCode;

EFuncRetCode eFuncRetCode = FUNC_OK;
```

### 结构体变量
- [ ] 类型名以大写 `S` 开始
- [ ] 变量前缀 `s`, 使用后 memset 清零

```
typedef struct {
    INT8U u8PacketID;
    char acStringName[0x20];
} SPacketInfo;

SPacketInfo sPacketInfo;
memset(&sPacketInfo, 0, sizeof(SPacketInfo));
```

### 全局/静态变量
- [ ] 全局变量: `g_` 前缀 → `g_u8LengthOfPacket`
- [ ] 静态全局: `sg_` 前缀 → `sg_u8LengthOfPacket`
- [ ] 静态局部: `s_` 前缀 → `s_u8LengthOfPacket`
- [ ] 全局变量和静态变量允许变量名含 `_`

## 3. 函数规范

### 命名
- [ ] 格式: `ByteD` + 厂商编号 + FunctionName **或** `IEC` + FunctionName (满足任一格式即可，均不允许下划线)
- [ ] 示例: `ByteD03ReadFlashSize(u8FlashIndex, pu16FlashSize)` **或** `IECReadFlashSize(u8FlashIndex, pu16FlashSize)`
- [ ] 命名以动词或动词+名词表达函数动作

### 修饰与返回
- [ ] 仅当前 .c 使用的函数必须 `static` 修饰
- [ ] 每个函数必须有返回值 (`EFuncRetCode` 或等效)
- [ ] 异常返回必须打印详细信息 (返回值、出参、关键变量、errno)
- [ ] 多模块调用需确保原子性和可重入性

## 4. 代码结构

### if / else
- [ ] 必须使用括号 `{ }`, 即使只有一行代码
- [ ] 括号另起一行, 与 if/else 对齐
- [ ] if / else if / else 分支必须完整覆盖所有条件

### switch
- [ ] 每个 case 必须加括号 `{ }`
- [ ] 括号另起一行, 与 case 对齐
- [ ] 必须有 default 分支
- [ ] 每个 case 明确 break

### 循环
- [ ] 所有循环必须使用括号 `{ }`
- [ ] 固定次数用 for, 不定次数用 while
- [ ] do-while 的左括号紧跟 do (特例)

### goto
- [ ] **应用层不建议使用** goto; 底层驱动可接受但需有充分理由

## 5. 内存管理

- [ ] 内存分配和释放必须在**同一函数内**完成
- [ ] malloc/calloc 必须检查返回值
- [ ] 禁止使用 sprintf/vsprintf/strcpy/strcat/gets
- [ ] 替代使用 snprintf/strlcpy/strlcat/fgets
- [ ] 所有字符串确保以 '\0' 结尾
- [ ] 禁止跨线程传递指针变量（防止一方提前释放）

## 6. 常量与宏

- [ ] 常量相等判断: 常量放 `==` 左侧 (`if (ENABLE == u8Enable)`)
- [ ] 宏全大写 + `_` 组成, 不使用小写字母
- [ ] 宏表达式加完整括号 (`#define MAX_USER_COUNT (10)`)
- [ ] 宏中不使用 return/goto/continue/break
- [ ] 代码中避免魔鬼数字, 使用宏定义值

## 7. 头文件

- [ ] 不包含 `../` 相对路径
- [ ] **头文件不允许放置函数实现**
- [ ] 依赖方向: 产品→平台→标准库, 不稳定模块依赖稳定模块
- [ ] 禁止在 .c 中通过 extern 引用外部函数/变量, 只通过 #include 头文件

## 8. 注释规范

- [ ] 全部采用 `/* */` 格式
- [ ] 文件头注释含: Copyright + File name + Description
- [ ] 函数上方注释含: Name / Return Value / Parameter Input / Parameter Output

## 9. 其他

- [ ] 代码对齐: 每行第一个有效代码 4 空格缩进
- [ ] 异常情况必须打印调试信息
- [ ] 第三方源码用 `/* Third_Part_Code Start */.../* Third_Part_Code End */` 包裹, 保持原风格
