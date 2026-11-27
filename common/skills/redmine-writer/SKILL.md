---
name: redmine-writer
description: 'Redmine 双通道读写（试运行版）：通道 A 复用共享浏览器已登录会话（来自 marketplace redmine-writer，带登录门禁探针）；通道 B curl+LDAP 自动登录（无人值守，凭据取自 pass.md）。仅显式调用；任何写入前先提供 Markdown 草稿并取得用户对当前版本的明确确认。普通浏览、统计和搜索不触发。'
argument-hint: '例如：通道A把分析结果写到 #31105；通道B自动登录创建 issue；#31021 补根因和方案'
user-invocable: true
disable-model-invocation: true
---

# Redmine Writer（双通道试运行版）

> 来源与本版说明：骨架与浏览器通道取自 `ipt-bmc-marketplace` 的 `redmine-writer`
> （2026-11 版），新增通道 B（curl 自动登录）与通道选择器。试运行期间与本机原
> `skill-redmine` 并存；试用通过后原 skill 退役，本 skill 更名为正式版。
> 两个 Redmine 等价地址：OA 代理 `https://10.99.182.200:8443` 与内网直连
> `https://172.17.8.200:8443`；展示给用户的链接优先 OA 地址。

## 通道选择（先跑这一步）

| 场景 | 通道 | 依据 |
|------|------|------|
| 已有共享浏览器页且已登录 Redmine | A 浏览器复用 | 门禁探针 `logged_in_ready` 通过 |
| 无人值守 / 定时任务 / 批量写入 | B curl 自动登录 | 无浏览器会话依赖 |
| 用户在场且要求可视化确认 | A 浏览器复用 | 用户可见每一步 |
| 通道 A 门禁失败（未登录/证书页）且任务允许自动化 | 转 B | 仅限用户已授权该任务的写入口径 |

写入安全边界（两通道共同）：不绕证书、不代填用户未确认的字段、写前必须有已确认
草稿、写后必须逐字段回读。写入口径与本地 `skill-redmine` 现行规则一致，冲突时以
用户当前确认版本为准。

## [通道 A] 共享浏览器会话复用

按需读取：仅当走浏览器路径时执行本节。

### Session Reuse 纪律

1. 优先复用当前已共享、host 相同且已打开本次目标的 Redmine 页面。
2. 页面读取默认用紧凑 `run_playwright_code`，只返回关键字段 JSON；`read_page` 仅
   在首次访问或结构未知时兜底。
3. 没有可复用页面时不主动导航或另开页面，只提供目标 URL 并请用户打开目标页、完成
   登录，当前轮次结束。
4. **session 失效后的等待纪律（踩坑 2026-07-07）**：提示登录后立即结束轮次，禁止
   `forceNew=true` 再开第二个同类页，避免 URL 重复与 session 竞争；等用户明确回复
   已登录再继续。

### 登录门禁检查模板（写/读前必跑，失败即停）

```js
const operation = 'update'; // 新建时设为 'create'
const expectedIssueId = null; // 更新时填入确切 ID；新建保持 null
return JSON.stringify(await page.evaluate(({ operation, expectedIssueId }) => {
  const url = location.href;
  const path = location.pathname;
  const title = document.title || '';
  const text = `${title}\n${document.body?.innerText || ''}`;
  const pageMatch = path.match(/^\/issues\/(\d+)(?:\/edit)?$/);
  const pageIssueId = pageMatch?.[1] ?? null;
  const isNewIssue = /^\/(?:projects\/[^/]+\/)?issues\/new$/.test(path);
  const targetMatches = operation === 'create'
    ? isNewIssue
    : operation === 'update' && Boolean(expectedIssueId) &&
      pageIssueId === String(expectedIssueId);
  const hasIssueForm = Boolean(
    document.querySelector('#issue_description') ||
    document.querySelector('#issue_notes') ||
    document.querySelector('#issue_done_ratio'));
  const blocked =
    /\/login\b/.test(path) ||
    /certificate|privacy|not secure|ERR_CERT|证书/i.test(text) ||
    /403|404|not found|forbidden/i.test(text);
  return {
    url, title, operation, expectedIssueId, pageIssueId, targetMatches,
    pageReady: document.readyState === 'complete',
    logged_in_ready:
      ['10.99.182.200:8443', '172.17.8.200:8443'].includes(location.host) &&
      targetMatches && document.readyState === 'complete' && !blocked &&
      (hasIssueForm || document.querySelector('#content h2, .subject h3')),
  };
}, { operation, expectedIssueId }));
```

`logged_in_ready !== true` → 停止读取/写入，转通道 B 或提示用户。

### 提交后验证与隐藏字段

- 提交后必须确认 `target_matches` 为 true、无 `.flash.error`，并逐项回读改动字段；
  仅有跳转或成功提示不算通过。
- wiki editor 隐藏 textarea 导致 `locator.fill()` 超时时，先回读已确认草稿中的字段
  再单独提交；不得覆盖未获准修改的字段。

## [通道 B] curl+LDAP 自动登录（无人值守）

按需读取：仅当无浏览器会话或无人值守场景时执行本节。

### 前置条件与凭据

- 凭据唯一来源：`skill-debug-issue/resources/pass.md` 的 `## Redmine 8443` 或
  `## GitLab 28443` 段（`user:` / `pass:` 行，0600、git-ignored）。段落缺失时停止，
  向文件所有者索取，禁止猜口令。
- 密码不得出现在命令行明文、终端日志、聊天输出；shell 内解析变量注入。
- 所有请求带 `-k`（自签证书）与 `--noproxy "*"`（环境代理会拦内网地址）。
- 本机访问用 `172.17.8.200:8443`（`10.99.` 段从编译机路由不通）。

### 登录序列（已实测 2026-11，第 3 步 302 即成功）

```bash
BASE=https://172.17.8.200:8443           # Redmine；GitLab 为 28443
J=/tmp/AI_terminal/redmine_cookies.txt   # cookie jar，token 与 session 须同源
rm -f "$J"
# 1. 登录页：取 CSRF token（正则锚定 name= 防抓到 UTF-8 干扰字段）+ 建立 session
TOK=$(curl -sk --noproxy "*" -c "$J" "$BASE/login" \
  | grep -o 'name="authenticity_token" content="[^"]*"' | head -1 \
  | sed 's/.*content="//;s/"$//')
[ -z "$TOK" ] && { echo NO_TOKEN; exit 1; }
# 2. LDAP 表单登录（--data-urlencode 处理密码元字符）
curl -sk --noproxy "*" -b "$J" -c "$J" -o /dev/null -w "login HTTP %{http_code}\n" \
  -X POST "$BASE/login" \
  --data-urlencode "authenticity_token=$TOK" \
  --data-urlencode "username=$USER_" \
  --data-urlencode "password=$PASS" \
  --data-urlencode "login=登录"
```

Redmine 原生登录端点为 `/login`（POST 302=成功）；GitLab 为
`/users/auth/ldapmain/callback`。若返回 422/401，多为 token 过期或错用端点，重取
token 再试一次；连续失败按认证受阻处理，不盲目重试。

### 已登录判定（防匿名误判）

匿名访问部分页面也返回 200，必须调身份接口确认：

```bash
curl -sk --noproxy "*" -b "$J" -o /dev/null -w "session HTTP %{http_code}\n" \
  "$BASE/my/account"          # 200=已登录；302→login=未登录
```

### 写入与回读

- 写 Note/状态：登录会话下 POST `/issues/<id>.json`?key=<API key> 或表单接口；写
  前草稿确认规则与通道 A 相同。
- 写后回读 `GET /issues/<id>.json`，逐字段核对本次改动与 note 标记句。
- 会话过期（突然 302→login）：重跑登录序列一次；再失败即报告，不循环重试。

## Default Workflow（两通道通用）

1. 通道选择 → 已确认草稿（Markdown，含目标 issue/项目、Subject、Note 全文）。
2. 执行写入（通道按上表）。
3. 提交后验证：通道 A 走门禁回读模板；通道 B 走 JSON 回读。
4. 汇报：issue URL、改动字段、note 标记句命中情况、未验证项。

## Quality Gate（沿用 marketplace 版要点）

- 更新时页面/回读 ID 必须等于预期 issue ID；创建时校验新 ID 与 Subject 一致。
- 禁止占位文本提交；禁止覆盖用户未确认的字段。
- Token 预算：读页面/回读一律紧凑 JSON，不整页粘贴。

## 项目专属参考（按需）

- 表单字段与 tracker 选项采集、Markdown 格式恢复、样例案例：试用期直接查看
  marketplace 原版 references（`/tmp/AI_terminal/mkt/repo/plugins/ipt-bmc/skills/
  redmine-writer/references/`，临时区，重启即清）。试用期通过定稿时，把仍命中的
  reference 落到本目录。
