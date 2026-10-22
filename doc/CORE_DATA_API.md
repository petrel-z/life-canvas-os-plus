# 核心数据与接口开发契约

更新：2026-10-22。依据 [V1 需求](LIFE_CANVAS_V1_REQUIREMENTS.md) 与 [交互规范](INTERACTION_SPEC.md)。本文件锁定首条真实业务流程需要的数据结构和接口，并定义后续模块的边界；不是已经生成或部署的 OpenAPI。

## 1. 范围与执行顺序

首条流程为“同账号手机记录一餐 → PC 查看并修改 → 手机看到更新”。包含真实身份、用户隔离、三餐读取、创建、编辑、精度、幂等、版本冲突和前台刷新。首条流程不以 AI 或图片完成为前置；图片、删除/撤销、历史查询、日记与 AI 仍属于 V1，见 [开发计划](DEVELOPMENT_PLAN.md)。

后端采用模块化单体。HTTP 路由解析请求，业务服务控制权限/事务/版本，数据访问层访问 PostgreSQL。未来 Agent 调用同一业务服务，不直接写数据库。客户端只通过 FastAPI 读写业务数据，不直接使用 Supabase 数据 API 绕过服务。

## 2. 公共约定

| 项目 | 契约 |
| --- | --- |
| 路由 | RESTful、统一 `/api/v1`；资源集合用复数、小写和短横线；认证令牌放 Authorization Bearer 请求头 |
| 身份 | 服务端从已验证 token 与有效 device session 得到 Actor，不能从请求正文接收 user_id |
| 类型 | 主键 UUID；归属日 YYYY-MM-DD；时区 IANA；时间戳带时区、数据库 UTC timestamptz |
| 小数 | HTTP 十进制字符串，数据库 numeric(20,6)；禁止经 JS number / Python float 中转 |
| 请求校验 | Pydantic 禁止未知写入字段；空白名称、非法日期/时区、负数、NaN/Infinity、指数写法及超精度拒绝 |
| 更新 | `base_version` 是客户端读取时的整数版本；服务器原子比较后 version + 1 |
| 幂等 | 所有创建及版本写请求带 Idempotency-Key UUID，重试同一意图使用同一键 |
| 响应 | 应用自有 JSON 响应仅有 code、msg、data、traceId 四个顶层字段；code 为整数且等于 HTTP 状态码 |
| 错误 | 使用真实 4xx/5xx；字段校验、鉴权、未知路由、方法不支持及未处理异常都统一响应格式，具体见下表 |

### 2.1 RESTful 路由与方法

- 路径描述资源：`/nutrition/meals`、`/journals/{id}`、`/device-sessions`；不使用 `getMeal`、`saveMeal`、`deleteMeal` 等动作路径。`/me` 和 `/device-sessions/current` 是当前身份/会话的单资源别名。
- GET/HEAD 只读取，不改变业务状态；POST 在集合中创建资源；PUT 替换资源完整的可编辑表示；PATCH 只修改明确提供的字段；DELETE 删除资源或终止其有效关联。DELETE 会话表示撤销访问，审计记录仍保留。
- GET/DELETE 不携带 JSON 请求体。过滤、分页、排序放 query；资源 ID 放 path；待创建/修改的数据放 body。每个请求独立校验身份，不依赖单机进程中的临时对话状态。
- 本项目餐次采用 PUT 提交完整快照；不以 PATCH 名义要求完整替换。今后增加 PATCH 时，单独定义部分字段 schema、null/省略语义和集合更新规则，不能复用全部字段必填的创建 schema。
- 创建返回 201 和 `Location` 指向创建的资源；异步任务返回 202、任务标识及查询地址，202 只表示受理。任务停止、审批等通过相应子资源建模，不以 GET 触发操作。
- 集合查询使用稳定排序和游标分页，具体过滤字段与分页结构在各资源契约明确；禁止无上限返回全量账号数据。
- GET 的安全语义及 PUT/DELETE 的幂等语义不能靠前端防重复点击代替。版本条件与 Idempotency-Key 继续生效；重复请求允许得到不同状态码，但不能重复产生业务效果。

方法、状态码和无响应体规则依据 [HTTP Semantics，RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html)；部分修改的方法语义依据 [PATCH，RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html)。资源命名、响应包装及字段选择是本项目约定。

### 2.2 统一 JSON 响应

HTTP 200 示例：

```json
{
  "code": 200,
  "msg": "success",
  "data": {},
  "traceId": "0f4e8a9b3c2d4f619a0b1c2d3e4f5678"
}
```

| 字段 | 类型与规则 |
| --- | --- |
| code | integer，与实际 HTTP 状态码一致：例如成功创建为 201，冲突为 409；不使用字符串业务码 |
| msg | string，成功固定为 success；失败为可读的简短原因，不包含堆栈或秘密信息；客户端不按文案判断分支 |
| data | object，业务资源或结果；没有业务结果时为 `{}`；集合及其分页信息放在该对象中 |
| traceId | string，非空追踪标识；与响应头 X-Trace-Id 及同次请求日志一致 |

成功、校验失败和应用错误均保持这四个顶层字段，不再增加顶层 message、timestamp 或 request_id。业务资源内部的 created_at/updated_at 仍按原契约保留。只有应用自有 API 使用本包装，第三方 Auth/Storage 协议由适配层处理。

| HTTP / code | 语义与项目用法 |
| --- | --- |
| 200 | 读取、更新、带 JSON 结果的删除，或幂等复用已存在的会话 |
| 201 | 同步创建成功，提供 Location |
| 202 | 后台任务已受理，尚未表示业务操作完成 |
| 400 | 请求无法解析，例如损坏的 JSON |
| 401 | 身份无效、未登录、令牌过期或会话撤销；提供适用的 WWW-Authenticate 响应头 |
| 403 | 身份有效但操作被禁止，例如邮箱尚未验证；不泄漏他人资源是否存在 |
| 404 | 路由/资源不存在，或资源不属于当前账号 |
| 405 | 路由存在但方法不支持；提供 Allow 响应头 |
| 409 | 版本、餐次唯一性、幂等键或业务状态冲突 |
| 422 | 请求可解析，但字段类型、范围或组合不符合契约 |
| 429 | 配额或限流，能够计算等待时间时提供 Retry-After |
| 500 / 503 | 未处理的内部错误 / 暂时不可用；对外不返回内部堆栈 |

HTTP 422 示例：

```json
{
  "code": 422,
  "msg": "请求参数校验失败",
  "data": {
    "reason": "VALIDATION_ERROR",
    "errors": [
      {"path": ["items", "0", "quantity"], "msg": "已知用量必须大于零"}
    ]
  },
  "traceId": "c42b94c6b1e54a5da5f35f50b13a4021"
}
```

`data.reason` 是稳定的业务错误标识。校验错误 `data.errors` 为 `{path: string[], msg: string}[]`，数组下标以字符串表示；前端按 path 定位字段。冲突 data 为 `{reason, latest}`，reason 包括 VERSION_CONFLICT、MEAL_EXISTS、IDEMPOTENCY_KEY_REUSED；无可返回的最新资源时 latest=null，否则返回当前账号的完整最新资源，不泄漏其他账号数据。

### 2.3 追踪、特殊响应与幂等

- 请求入口生成 32 位小写十六进制 traceId，或复用经验证的可信基础设施追踪上下文；不直接反射任意客户端 X-Trace-Id。正常和错误路径都设置响应头及 JSON 字段，下游调用和日志传递同一追踪上下文。
- 跨域客户端需要读取的 X-Trace-Id、Location 等头在 CORS expose headers 中显式开放；浏览器错误反馈可展示 traceId 供排查，不能把它当作授权凭据。
- DELETE 默认返回 200 与统一 JSON。明确使用 204/304 或 HEAD 时按协议不返回响应体，只保留适用的响应头和追踪标识；不能为了统一格式给无体响应塞 JSON。
- SSE 与二进制下载不套 JSON 外壳。建立流/下载前的应用错误仍返回对应 HTTP 错误和统一 JSON；流已开始后的失败使用约定的失败事件并关联 traceId，不能再改 HTTP 状态或夹入普通 JSON 包装。
- 基础设施健康接口保留 `/health/live`、`/health/ready`，其 JSON 仍使用统一响应；它们不属于 `/api/v1` 业务资源。`/openapi.json`、`/docs`、`/redoc` 使用框架标准的 OpenAPI/HTML 格式，不能套业务响应后破坏类型生成或文档工具。
- 幂等记录唯一键 `(user_id, operation, key)`，保存规范化请求摘要、HTTP 状态、稳定业务结果 code/msg/data 及必要的 Location，不缓存旧 traceId。摘要包含方法、目标 ID、完整有效载荷及 base_version。
- 相同键不同请求返回 409，同一请求并发只执行一次；业务写入与成功幂等结果同事务提交。已确认身份和资源授权后，幂等重放先于版本比较，返回原业务结果但生成本次请求的 traceId，不把旧请求当新写入。
- 未提交的失败可重试，不能把 5xx 固化为永久成功。V1 默认不自动清理幂等结果，账号注销时删除；调整保留策略需同时定义客户端重试上限。

## 3. 首条流程的数据模型

### 3.1 身份与资料

| 表 | 必需字段与约束 |
| --- | --- |
| profiles | user_id UUID PK 对齐 Auth subject；nickname；timezone；theme；version；created_at/updated_at |
| device_sessions | id UUID；user_id；auth_session_id；device_label；last_seen_at；revoked_at；unique(user_id, auth_session_id) |
| idempotency_records | user_id、operation、key、request_hash、response_status、response_json、created_at；复合唯一键 |
| audit_events | id、user_id、actor_session_id、action、resource_type/id、resource_version、created_at；默认不存正文/令牌 |

注册、验证邮箱、密码登录及重置通过 Supabase Auth；客户端只持有公开配置和本人令牌。服务端验证签名、issuer、audience、有效期、subject 与可信 auth session claim，再检查应用会话未撤销。

首次登录调用 `POST /device-sessions`，正文仅 `{device_label, timezone}`。时区由客户端系统时区提出，服务端校验；无法取得时使用 Asia/Shanghai，并允许资料设置修改。资料与设备登记原子且幂等；已经 revoked 的同一 auth_session_id 不得重新激活，必须重新登录产生新会话。登记不得让未验证邮箱账号进入业务区。首次创建返回 201，已有有效会话登记返回 200，data 均为 DeviceSessionRead；新增时提供 Location。后续所有业务 API 检查该会话。

`GET /me` 返回 `{user_id,nickname,timezone,theme,version,device_session_id}`。返回 user_id 仅用于客户端账号缓存分区，不接受其作为资源授权依据。

退出登录调用 `DELETE /device-sessions/current` 撤销当前 `auth_session_id` 对应的应用设备会话，提交后立即阻止该会话访问所有业务 API 与流重连，即使旧 access token 尚未到期。此端点验证 token 的可信身份但允许同会话重复撤销，重复调用仍返回 200，统一包装的 data 为 `{revoked:true}`；不接受其他 session_id 作为正文参数。未知会话返回 404，不能借退出接口创建有效会话。

收到服务器成功后，两端清理本地凭证、业务缓存与草稿，并退出身份提供方的当前设备会话；后者失败不恢复已经撤销的应用会话。普通退出不取消已授权的云端任务。离线退出仍清除本地数据，但必须提示“本机已退出，云端会话撤销未完成”，不得标记服务器退出成功；可从另一有效设备撤销。服务端失效验收以撤销事务成功为准。


### 3.2 三餐

| 表 | 必需字段与约束 |
| --- | --- |
| meals | id、user_id、meal_date、recorded_timezone、meal_type、status、consumed_at、time_precision、note、version、created_at、updated_at |
| meal_items | id、user_id、meal_id、name、quantity numeric(20,6) nullable、unit nullable、quantity_source、brand、preparation、weight_basis、position |

约束：

- meals 唯一 `(user_id, meal_date, meal_type)`；meal_type 为 breakfast/lunch/dinner；持久化 status 仅 recorded/skipped。
- 无记录不是数据库行；日视图补出 unrecorded。recorded 至少一条 food item；skipped 没有食物及照片，实际时间为 null、time_precision 为 unknown。
- quantity_source 为 exact/estimated/unknown；unknown 时 quantity=null，unit 可为 null 或支持单位；其余 quantity > 0 且 unit 必填。
- 单位枚举 g、ml、个、片、杯、碗、份；不用食物库推导或换算。weight_basis 为 raw/cooked/unspecified，默认 unspecified。
- time_precision 为 exact/approximate/unknown；unknown 时 consumed_at=null，其余填写带时区时间。归属日由用户明确选择，不从创建时间或进餐时间重新推导。
- name trim 后 1–100 字符；一餐最多 100 条；note 最多 2000 字符；brand/preparation 最多 100 字符。这些是本轮实现默认，校验失败不截断保存。
- meal_items 使用 `(user_id,meal_id)` 到 meals 的复合外键，禁止混入其他账号明细；名称可重复，position 表示用户顺序。
- 用量严格验证上限及小数位，再写 numeric；不让数据库隐式四舍五入。响应可规范化去掉无意义尾零，但数值必须等价。

事务内完成 meal、items、version、审计和幂等结果。创建冲突由唯一约束兜底；修改使用 `WHERE id=:id AND user_id=:actor AND version=:base_version`，不能只在 Python 中先读后判断。同餐明细替换在一笔事务中完成，不暴露绕过餐次版本的单条明细写接口。

## 4. 首条流程的 HTTP 接口

| 方法/路径 | 请求 | 成功结果 |
| --- | --- | --- |
| POST /device-sessions | device_label、timezone；Bearer token；Idempotency-Key | 201 创建 / 200 已存在，DeviceSessionRead；新增返回 Location |
| GET /device-sessions/{id} | 当前账号的会话 ID | 200，DeviceSessionRead；越权为 404 |
| GET /me | 无正文 | 200，Me |
| DELETE /device-sessions/current | 当前 Bearer token，无正文 | 200，data 为 {revoked:true}；重复撤销仍成功 |
| GET /nutrition/days/{date} | 合法归属日期 | 200，DayRead |
| POST /nutrition/meals | MealCreate；Idempotency-Key | 201，MealRead 和 Location；已有同餐返回 409 + latest |
| GET /nutrition/meals/{id} | 当前账号的餐次 ID | 200，MealRead；越权为 404 |
| PUT /nutrition/meals/{id} | MealUpdate；Idempotency-Key | 200，MealRead；过期版本返回 409 + latest |

上表成功结果均指统一包装内的 data；所有路径省略 `/api/v1` 前缀。资源创建的 Location 分别为 `/api/v1/device-sessions/{id}` 和 `/api/v1/nutrition/meals/{id}`。

`DeviceSessionRead = {id,device_label,last_seen_at,revoked_at}`，不返回 token 或内部 auth_session_id；固定路径 current 在动态 `{id}` 路由前匹配。

`DayRead = {date, meals: [BreakfastSlot, LunchSlot, DinnerSlot]}`，三项始终按早午晚顺序返回。未记录槽位为 `{meal_type,status:"unrecorded",record:null}`；其余槽位 `record` 为 MealRead。当天定义采用资料时区，客户端调用前生成明确日期；服务器不把日期字符串当 UTC 午夜转换。

`MealCreate = {meal_date,recorded_timezone,meal_type,status,consumed_at,time_precision,note,items}`。

`MealUpdate = MealCreate + {base_version}`。第一阶段 PUT 提交上述完整可编辑快照；不接受遗漏字段的部分覆盖，保证原明细是否保留由用户看到的完整表单决定。可改变归属日期/餐次，但目标槽已有记录时 409，不覆盖目标。客户端编辑已有记录时先加载完整快照；PUT 只更新现存资源，不作隐式 upsert，目标不存在时返回 404。

`ItemWrite = {id?: UUID,name,quantity: string|null,unit: Unit|null,quantity_source,brand,preparation,weight_basis}`。数组顺序决定 position。新增项可省略 id，更新保留原明细 ID；提交其他餐次或其他账号的明细 ID 时拒绝。`MealRead` 为已保存快照加 id、version、created_at、updated_at；每项都有 id。未来 attachment_ids 增加时同步契约、迁移和版本兼容，不能先返回假图片数据。

创建示例（省略 HTTP 包装）：

```json
{
  "meal_date": "2026-10-21",
  "recorded_timezone": "Asia/Shanghai",
  "meal_type": "lunch",
  "status": "recorded",
  "consumed_at": null,
  "time_precision": "unknown",
  "note": "家里做的午饭",
  "items": [
    {"name":"米饭","quantity":"150","unit":"g","quantity_source":"exact","brand":"","preparation":"","weight_basis":"cooked"},
    {"name":"西兰花","quantity":null,"unit":"g","quantity_source":"unknown","brand":"","preparation":"清炒","weight_basis":"unspecified"}
  ]
}
```

PC 读取 version=1 后，将西兰花改为 quantity="100"、quantity_source="exact"，保留米饭/备注与所有明细 ID，提交 base_version=1，成功得到 version=2。另一客户端继续提交 base_version=1 时收到 409，保留其本地输入并进入冲突处理。

## 5. 服务与客户端接口边界

后端建议模块名固定为 `app.modules.identity`、`app.modules.profiles`、`app.modules.nutrition`。以下是计划接口，开发时以真实类型及 OpenAPI 为准：

- `resolve_actor(token: str) -> Actor(user_id: UUID, device_session_id: UUID)`：只从可信认证与数据库会话得到身份。
- `register_device(identity: VerifiedIdentity, input: RegisterDevice, key: UUID) -> RegisterDeviceResult`：认证验证在外层完成，未验证邮箱拒绝登记；RegisterDeviceResult 为 `{session: DeviceSessionRead, created: bool}`；路由据 created 区分 201/200，只把 session 放进响应 data，created 不对外输出。
- `get_device_session(actor: Actor, session_id: UUID) -> DeviceSessionRead`：仅返回本人会话。
- `revoke_current_session(identity: VerifiedIdentity) -> LogoutRead(revoked: bool)`：只撤销可信当前 session，重复撤销幂等。
- `get_day(actor: Actor, date: date) -> DayRead`。
- `get_meal(actor: Actor, meal_id: UUID) -> MealRead`：仅返回本人餐次。
- `create_meal(actor: Actor, input: MealCreate, key: UUID) -> MealRead`。
- `update_meal(actor: Actor, meal_id: UUID, input: MealUpdate, key: UUID) -> MealRead`。

服务使用请求注入的 UnitOfWork，事务边界只在服务层；Agent 后续通过相同服务传入审批过的参数。Repository 不接受模型提供的 user_id。

共享客户端由 OpenAPI 生成 schema 类型，手写薄 transport 负责 envelope、鉴权与错误，不在各端再维护手抄 DTO。封装 `getDay(date, signal?)`、`getMeal(id)`、`createMeal(input,key)`、`updateMeal(id,input,key)`（PUT）与 `logout()`（DELETE current 会话）。transport 校验 code 与 HTTP 状态一致，读取 data，错误保留 msg、data.reason 和 traceId；不能仅把 code===200 当作所有成功。token 回调可刷新一次；401 后保留草稿并引导重新登录，不能无限刷新重放。

Query key 以账号分区：`['nutrition', userId, 'day', date]`。退出登录先按 §3.1 撤销当前服务端会话，再清空该账号缓存及内存草稿，禁止下一账号看到旧内容；主动退出存在未保存内容时先提示。提交失败的同一请求保留其 key；用户改动内容后是新意图，使用新 key。DayRead 不作为编辑中的可变对象，编辑器持有副本和 base_version。

## 6. 用户隔离与数据库验证

- PostgreSQL 表以 user_id 隔离，FastAPI 验证归属是第一层；RLS 为第二层。
- API/Worker 的业务查询使用受限、非 BYPASSRLS 角色；每个事务 `SET LOCAL` 当前 user_id，退出事务自动复原，不能跨连接池请求泄漏。迁移角色与运行角色分开。
- RLS SELECT/UPDATE/DELETE 的 USING 与 INSERT/UPDATE 的 WITH CHECK 都绑定事务身份。无身份时默认无权读写；复合外键阻断跨账号关系。
- Supabase service role 凭据仅用于必要的服务端身份/文件管理，不用于通用客户端业务读取；数据库连接角色必须实际测试 RLS 生效，不能仅创建策略就宣称隔离完成。
- 用真实 PostgreSQL 测事务、唯一约束、Decimal、RLS 和并发；SQLite 与 mock 不能作为这些场景的验收证据。

## 7. 后续模块的已定数据边界

| 模块 | 已定实体/约束 | 开发前补充产物 |
| --- | --- | --- |
| 日记 | journals 存 title、body_markdown、journal_date、recorded_timezone、mood nullable、tags、ai_excluded、version；不限制同日篇数。journal_revisions 对 `(journal_id,version)` 唯一，保存不可变快照及附件引用 | 按交互规范生成 CRUD/自动保存/修订/日历计数接口和 schema 迁移 |
| 图片 | attachments 有 owner、暂存/ready/failed 状态、object_key、mime、size、hash；关联一个餐次或日记，修订引用保留 | 上传许可、完成登记、鉴权下载、未引用回收接口与测试 |
| 撤销 | operation_receipts 记录 owner、目标、前后版本、受限快照、expires_at、consumed_at；一次性原子消费 | 删除/未吃/保存及 AI 修改共享撤销服务；版本变化拒绝 |
| AI | conversations/messages 与 runs 分离；每会话最多一个未终结 run；approval 绑定参数摘要与版本；每 run 独立 checkpoint | 持久化任务状态机、SSE 事件 schema、审批与 outbox、取消及权限测试 |
| 记忆 | memories 存本人确认的偏好与目标，来源可追溯；私密日记不自动生成记忆 | 增删改查、来源删除传播与授权验证 |
| 数据管理 | data_jobs/import_items 保存稳定来源标识、去重映射、附件关系与结果 | 版本化 manifest/JSON schema、预检与往返测试 |

这些模块的规则已确定到可以分别编写实施计划；本文件没有把未定义的完整 HTTP 字段当作已经完成的接口设计。正式实现必须从服务端类型导出 OpenAPI，并测试当前与上一个移动版本兼容。

## 8. 首条业务流程的验收证据

必须使用同一测试后端、真实 PostgreSQL、真实身份服务以及 iOS/Android 测试构建和 Web。使用两个账号检查隔离，使用同账号两设备检查共享。

1. 手机创建上述午餐，HTTP 成功后显示已保存，DB 为一餐两明细；未知数量和时间均为 null。
2. PC 30 秒内看到原始值和备注，补 100g 后 DB 仍是一餐两明细，version=2。
3. 手机回前台立即刷新，或活跃页 30 秒内显示 100g；不得以 localStorage 复制演示代替。
4. 重放同创建/更新请求不新增餐次或版本；相同 key 不同内容返回 409。
5. 两个独立请求同时写同 version，仅一个成功；失败方返回 409 和本账号最新记录，草稿不丢失。
6. 账号 B 猜测账号 A 的 ID、伪造 owner、复用明细 ID，均不能读取或写入；复用同一数据库连接亦不泄漏身份。
7. quantity="0.125001" 无损往返，超过 6 位小数或数量上限时 422；未知数量不变成 0。
8. 断网、令牌过期、会话撤销、时区改变、跨年/闰年、目标餐次已存在均有可观察结果；未验证邮箱无法进入业务区。成功退出后持原未过期 access token 访问业务 API 返回 401，重复退出成功，旧 session 不能被登记接口复活。

记录构建标识、迁移版本、traceId、测试结果和真机截图到 `doc/validation/`。目前这些是待执行的正式开发验收，不是原型测试已经证明的结果。

## 9. 接口规范验收补充

- 所有自有 JSON 成功/错误响应验证四个字段、类型和 code/HTTP 状态一致；覆盖 200/201/202、400/401/403/404/405/409/422/429/500/503 中已实现的路径。原生框架异常不能漏出另一种包装。
- 201 验证 Location 可读且属于本人；PUT 完整替换缺字段拒绝；GET 不产生业务写入；DELETE current 会话重复调用不恢复权限。
- 同一请求的 JSON traceId、X-Trace-Id 与日志一致；重放幂等请求只重复业务结果，当前请求有自己的追踪标识。
- transport 正确识别 201/202，不按 msg 文案或 HTTP 200 单一值分支；204/HEAD 不尝试解析 JSON，SSE/下载走独立 transport。
