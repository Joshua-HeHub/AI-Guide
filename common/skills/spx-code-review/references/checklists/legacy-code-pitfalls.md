# AMI Codebase 老代码常见隐患

在 AMI BMC 代码库中, 以下模式反复出现, 审查时必须特别关注。

---

## 1. goto error 清理不完整

老代码中常见用 `goto error` 做错误处理, 但经常遗漏某些资源的释放。

```
// 检查模式
func() {
    resource1 = alloc();
    if (fail1) goto error1;

    resource2 = alloc();
    if (fail2) goto error2;

    resource3 = alloc();
    if (fail3) goto error3;

    // ...
    return OK;

error3:  free(resource3);
error2:  free(resource2);  // ← 是否遗漏了 resource3?
error1:  free(resource1);  // ← 是否遗漏了 resource2?
    return FAILED;
}
```

- [ ] 每个 goto 标签释放的资源集合是否正确？
- [ ] 是否有资源在所有 error 路径都被遗漏？

## 2. 早 return 未释放资源

- [ ] 函数中是否有中途 return 但未释放已分配资源？
- [ ] 推荐使用 goto error 统一清理, 或确保 return 前释放了所有资源

## 3. 多层 if 嵌套错误路径遗漏

```c
if (cond1) {
    if (cond2) {
        if (cond3) {
            // success
        } else {
            // 处理 cond3 失败, 是否遗漏了 cond1/cond2 的资源？
        }
    } else {
        // 处理 cond2 失败, 是否遗漏了 cond1 的资源？
    }
}
```

- [ ] 每层嵌套的错误分支是否完整释放了该层及之前层的资源？

## 4. 静态缓冲区复用（线程不安全）

- [ ] 函数中是否使用 static 局部缓冲区？
- [ ] 该函数是否在多线程环境中被调用？
- [ ] 如果多线程调用, static 缓冲区是否为竞态条件来源？

```c
// 线程不安全
char* get_status_str(int code) {
    static char buf[64];
    snprintf(buf, sizeof(buf), "status_%d", code);
    return buf;  // 多线程同时调用会互相覆盖
}
```

## 5. 全局变量滥用

- [ ] 全局变量是否真的必要？
- [ ] 多线程访问全局变量是否加了锁？
- [ ] 全局变量初始化是否有顺序依赖？

## 6. 多进程间文件锁错误使用

- [ ] flock/fcntl 锁的使用是否正确？
- [ ] 是否处理了锁的继承问题（fork 后）？
- [ ] 是否考虑了死锁风险（多进程争夺多把锁）

## 7. fork 后未关闭多余 fd

- [ ] fork 后子进程是否关闭了不需要的文件描述符？
- [ ] fork + thread 混用是否安全？（fork 只复制调用线程, 其他线程的锁状态被继承到子进程, 可能导致死锁）
- [ ] 子进程是否继承了不应继承的锁？

## 8. 额外工程规范建议

- [ ] 使用固定宽度整数类型 (uint32_t / int32_t 或 INT32U / INT32S)
- [ ] 使用显式边界检查
- [ ] 使用防御性编程 (defensive programming)
- [ ] 尽量减少动态内存分配
- [ ] 所有函数单一职责
- [ ] 明确 ownership 语义（谁分配、谁释放）
