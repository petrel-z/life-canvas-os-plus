# V1 开发计划与首条业务流程实施清单

> **执行说明：** 使用 superpowers:executing-plans 按任务实施；如明确采用子任务开发，则使用 superpowers:subagent-driven-development。下列复选框代表正式实现状态，不能用静态原型检查勾选。

**目标：** 先交付“手机真实记录一餐，PC 查看并修改，手机看到更新”，再完成全部 V1。

**架构：** Expo 手机端与 React Web 共用 API 类型、校验和与平台无关的业务逻辑；FastAPI 模块化单体提供业务服务，PostgreSQL 为权威数据源。后续 Agent、Worker 复用这些服务与权限规则。

**技术栈：** 沿用 V1 需求中的 TypeScript、Expo、React、FastAPI、SQLAlchemy、Supabase/PostgreSQL、pnpm 与 uv；本轮不更换技术栈、不安装未经兼容验证的生产依赖。

**依据：** [V1 需求](LIFE_CANVAS_V1_REQUIREMENTS.md)、[交互规范](INTERACTION_SPEC.md)、[核心数据/API](CORE_DATA_API.md)。

更新：2026-10-22。当前已有文档、静态原型、Git、根 workspace 与后端配置入口；T1 的 S01–S03 已完成，见 [工程骨架计划](ENGINEERING_BOOTSTRAP_PLAN.md)。正式客户端、业务接口及数据库仍待实现；下文未勾选任务的文件与命令仍为实施目标。

## 1. 全局约束

- iOS、Android 和 Web 共用同一账号与云端数据，各账号隔离。
- 自有 API 采用 RESTful；JSON 响应为 code/msg/data/traceId，整数 code 与 HTTP 状态一致；完整替换用 PUT，局部修改才用 PATCH。
- 首版仅饮食这一生活维度；未知用量为 null，不猜用量/时间，不做营养计算。
- 修改携带版本，冲突返回 409 且保留草稿；创建/更新重试使用幂等键。
- 用量为十进制字符串，数据库 numeric(20,6)，不经浮点中转。
- 活跃设备正常网络下 30 秒内可见其他设备修改；前台恢复与重新联网立即刷新。
- 日记自动保存、无独立预览、Markdown 保真；界面按两端已确定布局实现。
- AI 所有写入先确认，私密日记按任务单次授权；云端任务不得绑定页面生命周期。
- PostgreSQL 真数据库集成测试不可被 SQLite 替代；手机能力最终必须真机验收。
- 生产密码、密钥不写文档/客户端/日志；原型示例数据不迁移为真实账号数据。

## 2. 首轮审查重点

| 输入/故障 | 必须观察到的行为 | 归属任务 |
| --- | --- | --- |
| 同版本并发更新、响应丢失后重试 | 一次有效写入，重试不新增版本，冲突保留草稿 | T3、T4、T7 |
| 账号切换与连接池复用 | 不复用另一账号的缓存或数据库事务身份 | T2、T4、T7 |
| 时区变化、闰年、跨年、未知时间 | 历史归属日期稳定，未知不被提交时间补齐 | T3、T5、T6 |
| 小数、超精度、未知量及已存在目标餐次 | 无损保存或明确拒绝，原餐与明细不被覆盖 | T3、T5、T6 |
| 保存中离页、断网、令牌过期与后台恢复 | 真实状态可见，未保存内容保留，不显示假成功 | T4、T5、T6、T7 |

## 3. 分阶段交付与需求覆盖

| 阶段 | 交付范围 | 依赖与完成条件 |
| --- | --- | --- |
| M0：工程与最小技术验证 | 可运行的三端/后端、真实 Auth、PostgreSQL、权限；另做 SSE/Agent 审批与 Worker 重启验证 | T1–T2；AI 技术验证可早做，但不伪装成完整 AI 产品 |
| M1：三餐跨端流程 | 创建、查看、编辑、未知量、小数、版本、幂等、前台同步 | T3–T7；核心契约 §8 和 UX-01–03 全部通过 |
| M2：完整记录与日记 | 餐次删除/未吃/撤销/照片、历史筛选；日记两端编辑、修订、标签、日历、图片、.md | M1 后细化模块计划；UX-04–09、UX-11；跨端正文与图片保真 |
| M3：AI 与记忆 | 会话/流式/任务/审批/停止/恢复、工具、单次授权、配额、记忆 CRUD | 依赖 M2 业务服务；UX-10、UX-12，重复批准与 Worker 重启不重复写入 |
| M4：账号与数据管理完善 | 资料与主题、设备撤销、找回密码/注销、ZIP 预检/去重/导入导出/附件/只读历史 | 依赖稳定实体和权限；导出往返一致，账号删除清理派生数据，旧客户端兼容 |
| M5：发布验收 | 无障碍、原生输入/图片/后台恢复、性能、部署、监控、备份与恢复演练 | V1 §5/§7 全部通过，p95/RPO/RTO 有记录，提供三端测试构建 |

分阶段只划分顺序，不删除 V1 功能。M2–M5 各自产生详细文件级计划后实施；本文件将 M0/M1 的第一条业务流程展开为可执行任务。独立 AI 技术验证不应提前耦合进三餐保存事务。

## 4. 首条流程的文件与模块

| 目录/文件 | 职责 |
| --- | --- |
| package.json、pnpm-workspace.yaml、pnpm-lock.yaml、biome.json | workspace、统一命令、前端版本锁与格式检查 |
| apps/mobile/app/、apps/mobile/src/features/{auth,nutrition}/ | Expo 路由、认证与手机三餐页面；包名 @life-canvas/mobile |
| apps/web/src/{app,features/auth,features/nutrition}/ | Web 路由、认证与桌面三餐页面；包名 @life-canvas/web |
| packages/api-client/src/{transport.ts,nutrition.ts,generated/schema.d.ts} | 生成类型与 API transport；包名 @life-canvas/api-client |
| packages/client-core/src/{auth,nutrition}/ | 账号缓存边界、日期/用量校验、表单状态与 Query key；包名 @life-canvas/client-core |
| packages/design-tokens/ | 从 ui/shared/design-tokens.json 映射正式跨端设计变量，平台排版分别实现 |
| services/backend/app/{main.py,core/,modules/} | FastAPI 入口、公共错误/配置、identity/profiles/nutrition 模块 |
| services/backend/alembic/、services/backend/tests/ | 数据迁移、真实 PostgreSQL 集成与接口测试 |
| services/backend/openapi.json | 从运行应用导出的 API schema，生成客户端时检查漂移 |
| infra/compose.yaml、.env.example、.github/workflows/ci.yml | 本地 PostgreSQL、环境项说明、可复现 CI；不放真实凭据 |
| tests/web/、tests/mobile/、doc/validation/ | 跨端验收脚本、真机步骤与实际验证记录 |

ui/mobile 与 ui/desktop 保持设计参考职责，正式工程不直接依赖原型 localStorage、模拟 AI、固定日期或 contenteditable 保存机制。

## 5. 首条流程实施任务

### T1：可启动的工程、数据库和契约检查

**执行拆分：** 见 [T1 工程骨架实施计划](ENGINEERING_BOOTSTRAP_PLAN.md)，分为 S01–S11：工具链、workspace、后端配置、响应与追踪、数据库迁移、共享契约、设计变量、Web、手机端、CI、联调交付。逐项记录验收后再更新本节；该计划只细化 T1。

**创建：** 上表 workspace 配置；`services/backend/{pyproject.toml,uv.lock,app/main.py,app/core/config.py,app/core/errors.py,app/core/response.py,app/core/tracing.py}`；`infra/compose.yaml`；`apps/web/src/app/App.tsx`；`apps/mobile/app/_layout.tsx`；`services/backend/tests/test_health.py`、`services/backend/tests/test_api_contract.py`；CI 与 `.env.example`。

**接口：** `GET /health/live` 表示进程可用，`GET /health/ready` 在数据库可用时 200、不可用时 503；不得把数据库密码返回到健康响应。运行配置从环境读取，缺少必需项明确失败。

- [ ] 创建健康/配置及响应契约测试，断言缺配置不静默切 demo、DB 不可用返回 503、响应不含凭据；验证四个响应字段、code 与 HTTP 状态一致、头/正文 traceId 一致、框架错误包装、无体响应不输出 JSON；运行测试并确认目标功能尚未实现导致失败。
- [ ] 初始化 Git、workspace、可构建的三端基础工程和后端入口，采用需求指定版本方向；确定一个兼容 Expo SDK 组合并提交实际锁文件，记录选择依据。配置 Biome/Ruff/类型检查，不只建空目录。
- [ ] 实现健康接口与数据库连接生命周期、统一 ApiResponse[T]（code/msg/data/traceId）、追踪中间件与异常处理；校验 404/405/422/500 等框架错误也统一包装，保留必要 HTTP 头；配置 CI 可启动真实 PostgreSQL并导出 OpenAPI。
- [ ] 验证 `uv run --project services/backend pytest services/backend/tests/test_health.py services/backend/tests/test_api_contract.py`、`pnpm lint`、`pnpm typecheck`、Web 构建；iOS/Android 基础构建实际启动。记录结果并提交该任务。

### T2：真实登录与不会串账号的身份边界

**创建：** `services/backend/app/modules/identity/{schemas.py,auth.py,service.py,router.py,repository.py}`、`modules/profiles/{models.py,schemas.py}`；`app/core/uow.py`；迁移 `0001_identity.py`（接续 T1 的 `0000_baseline`）；`tests/integration/test_identity.py`；两端 `src/features/auth/{provider.ts,session.ts}` 和登录/邮箱验证路由。**扩展：** T1 已建立的 `app/core/db.py` 数据库连接能力。

**输入：** 已配置的 Auth issuer/JWKS/公开客户端配置与 DB 连接。**输出：** 核心契约的 `Actor`、`VerifiedIdentity`、`resolve_actor`、`register_device`、`get_device_session`、`revoke_current_session`、RegisterDeviceResult/DeviceSessionRead/MeRead/LogoutRead，以及 `POST /device-sessions`、`GET /device-sessions/{id}`、`GET /me`、`DELETE /device-sessions/current`；`UnitOfWork` 管事务身份与提交/回滚。

- [ ] 写测试：未验证邮箱拒绝；签名/issuer/audience/过期校验；token 中没有可信 session 时拒绝；首次会话创建 201/Location 可读，同 session 以新 key 重复登记返回 200，不复制、不复活已撤销 session；连接池复用不串 user_id；成功退出后旧未过期 token 被拒绝，重复退出成功。先运行并观察预期失败。
- [ ] 实现 profiles/device_sessions、事务内身份、RLS与运行/迁移角色分离；真实登录后登记设备。两端保存认证凭证，手机使用 SecureStore；退出先撤销当前应用会话，再清除本人业务缓存与凭证；离线退出按核心契约说明未完成云端撤销。
- [ ] 接入已验证邮箱账号 A/B，确认两端分别可登录、401/撤销有真实反馈。密钥或测试账号缺失时标为待外部配置，不能用 mock 结果标记真实 Auth 已通过。
- [ ] 运行 `uv run --project services/backend pytest services/backend/tests/integration/test_identity.py`；核对真实账号登录和两端退出缓存清理记录；提交。

### T3：原子保存三餐与明细

**创建：** `services/backend/app/modules/nutrition/{models.py,schemas.py,repository.py,service.py,router.py}`；`app/core/{idempotency.py,audit.py}`；迁移 `0002_nutrition.py`；`tests/integration/test_nutrition.py`、`test_nutrition_concurrency.py`。

**输入：** T2 的 Actor/UnitOfWork。**输出：** `get_day`、`get_meal`、`create_meal`、`update_meal` 和 DayRead/MealRead/MealCreate/MealUpdate；具体字段、枚举、路径及错误采用核心契约 §3–5。

- [ ] 写集成测试：一餐多食物；unknown 为 null；"0.125001" 无损；0/负数/超精度拒绝；无明细 recorded 拒绝；skipped 明细必须为空；真实闰日；个人时区变更不迁移记录。
- [ ] 加并发/隔离测试：创建返回 201/Location 且 GET 对应资源可读；GET 不修改业务数据；PUT 缺必填字段拒绝；同槽并发创建只有一份；同版本并发更新只成功一次；同幂等键重放不增版本且使用当前 traceId；同键换内容拒绝；另一账号或另一餐的明细 ID 不可使用；移动到已有餐次不覆盖。确认未实现时这些测试失败。
- [ ] 在单事务中实现版本条件写、明细、审计与幂等结果；添加唯一/复合归属约束及 RLS。API 只调用该服务，所有测试使用真实 PostgreSQL。
- [ ] 运行 `uv run --project services/backend pytest services/backend/tests/integration/test_nutrition.py services/backend/tests/integration/test_nutrition_concurrency.py`；生成 OpenAPI 并校验示例请求；提交。

### T4：共享客户端、表单状态与同步规则

**创建：** `packages/api-client/src/{transport.ts,nutrition.ts}`、`packages/client-core/src/auth/cache.ts`、`src/nutrition/{validation.ts,query.ts,draft.ts}`；对应 `tests/{transport,nutrition-draft,account-cache}.test.ts`。**扩展：** T1 已建立的 API 包与 OpenAPI 生成流程，重新生成 `packages/api-client/src/generated/schema.d.ts`，健康请求可复用新增 transport，不另建第二套契约来源。

**输入：** T3 导出的 OpenAPI、MeRead 与可刷新 token 回调。**输出：** `createApiClient({baseUrl,getAccessToken,onUnauthorized})` 的 getDay/getMeal/createMeal/updateMeal/logout（updateMeal 使用 PUT，logout 使用 DELETE current 会话）；`mealDayKey(userId,date)`；`createMealDraft(record)`、`applyMealConflict(draft,latest)` 保留用户输入与原 base_version，用户核对后才接受新版本。

- [ ] 写测试：transport 接受 200/201/202，校验 code 与 HTTP 状态一致，错误保留 msg/reason/traceId，204 不解析 JSON；序列化数量不经 number；401 只刷新一次；网络失败重试同 key；变更内容使用新 key；409 保留草稿；后台刷新不覆盖草稿；账号切换清空旧缓存；logout 先撤销服务端会话，失败不显示云端退出成功。先确认失败。
- [ ] 生成接口类型并实现 transport/错误映射；封装 Query key、15 秒活跃检查及前台/网络恢复刷新，纯逻辑不依赖具体 UI。日期计算输入明确 IANA 时区。
- [ ] 实现保存状态、base_version 和提交快照；只有成功响应才能使编辑变干净；“不确定是否提交成功”的重试仍使用原 key。
- [ ] 运行 `pnpm --filter @life-canvas/api-client test`、`pnpm --filter @life-canvas/client-core test`、`pnpm typecheck`；重新生成 schema 无未解释差异；提交。

### T5：PC 上查看和编辑真实三餐

**创建：** `apps/web/src/features/nutrition/{DailyMealsPage.tsx,MealEditor.tsx,ConflictDialog.tsx,queries.ts}`；`tests/web/nutrition.spec.ts`。**输入：** T4 客户端、草稿与同步逻辑。**输出：** 登录后的日历/三餐/编辑页面，以实际服务数据驱动。

- [ ] 写 Playwright 场景：创建示例午餐、补未知量、保留原明细与备注、取消未保存编辑、422 字段提示、409 保留表单、保存失败不关闭抽屉；用失败断言定位未实现功能。
- [ ] 依据 `ui/desktop/` 实现页面，接入所有实际接口；日历翻月与选日分开，真实今天按资料时区计算。查询加载/空数据/错误/重试均可见。
- [ ] 验证 1024、1280、1440、1920 宽度与键盘操作，切换账号不见旧数据；刷新/重新登录仍从同一后端读到记录。
- [ ] 运行 `pnpm exec playwright test tests/web/nutrition.spec.ts`、Web 类型检查与构建；提交。

### T6：手机记录与修改真实三餐

**创建：** `apps/mobile/app/(tabs)/nutrition.tsx`、`app/meal/[id].tsx`、`src/features/nutrition/{DailyMealsScreen.tsx,MealEditorScreen.tsx,ConflictSheet.tsx}`；`tests/mobile/nutrition.yaml`。

**输入：** T4 客户端、草稿与同步逻辑；T2 真实认证。**输出：** iOS/Android 可安装测试构建，完整记录与补用量流程。

- [ ] 写移动端状态/校验测试与 Maestro 主流程：未知量、单位、小数、离开未保存、断网、409 保留输入、时区与日期；确认目标功能未实现时失败。
- [ ] 依据 `ui/mobile/` 实现页面，适配安全区、键盘与返回；React Native AppState 和联网恢复触发同步，不能照搬浏览器 visibility 事件。
- [ ] 在 iOS 与 Android 真机或测试设备输入中文和十进制数量；验证后台恢复、系统返回、登录回跳及账号缓存清理。至少一次实际真机验收，不能只凭 Web 模拟器。
- [ ] 运行 `pnpm --filter @life-canvas/mobile test`、`pnpm --filter @life-canvas/mobile typecheck`、`maestro test tests/mobile/nutrition.yaml`；记录两个平台构建标识及验证结果；提交。

### T7：跨端验收与第一阶段交付

**创建：** `tests/web/cross-device.spec.ts`、`tests/mobile/cross-device.yaml`、`doc/validation/first-flow.md`；补充根 README 的真实启动/配置步骤。

**输入：** T1–T6 实际部署的同一测试 API/DB/Auth 与三端构建。**输出：** 核心契约 §8 的逐条验收记录，以及可复现构建/迁移/运行方法。

- [ ] 手机 A 创建米饭 150g、西兰花未知、进餐时间未知；PC B 同账号 30 秒内看到，改西兰花 100g；手机回前台核对，数据库仍一餐两明细。
- [ ] 故意触发同版本并发、创建响应丢失重试、断网、账号越权和会话撤销，验证 409/幂等/隔离与草稿保护；所有核心契约 §8 项目记录实际结果。
- [ ] 运行完整后端集成、共享包测试、Web e2e 与移动端流程；记录环境、版本、失败及修复，不用“待测”替代通过。所有新阶段迁移从空库及上一版本库验证。
- [ ] 提交第一阶段交付文档与代码，保留验证日志；未连接的 AI/日记/图片不显示为已完成功能，继续进入 M2 的模块计划。

## 6. 后续模块实施前必须锁定的接口

| 阶段 | 需要写清的接口/状态 | 对应验收 |
| --- | --- | --- |
| M2 | 日记 CRUD 与不可变修订；保存排队和图片暂存；日历计数；条件撤销 receipt；meal 历史分页/删除与图片版本兼容 | UX-04–09、UX-11；两端格式与附件往返 |
| M3 | run/approval/events/outbox/cancel 状态与事件字段；权限来源传播；记忆 CRUD；预算及配额计算 | 跨设备确认、过期/拒绝、断连重连、取消、重复任务及 Worker 重启 |
| M4 | 账号删除任务、设备撤销、资料更新；ZIP schema/来源标识/附件关系；预检和分批事务重试 | V1 §7 的导出往返、重复零新增、冲突保留、用户隔离与删除清理 |
| M5 | 构建、发布、升级兼容、监控与备份恢复流程 | 实测性能与 RPO ≤ 24 小时、RTO ≤ 4 小时；真机能力与无障碍检查 |

## 7. 环境与非阻塞待办

正式名称/图标仍沿用提案状态，不影响模块开发。首发地区、托管服务区域与生产预算应在供应商/发布决定前落实；不能把技术文档中的建议误写成已经采购或通过连通性验证。

真实 Auth/云端验收需要测试 Supabase 项目、后端部署环境、有效配置和测试账号；iOS/Android 分发需要相应签名与账号。缺少这些条件时可以推进本地工程、真实本地 PostgreSQL、契约及自动测试，但真实云端/真机验收保持未完成。凭据通过环境配置提供，不写入本文件。
