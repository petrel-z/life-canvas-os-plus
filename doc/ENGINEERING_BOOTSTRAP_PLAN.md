# T1 工程骨架实施计划

> **执行说明：** 使用 superpowers:executing-plans 按步骤实施；用户明确选择子任务开发时再使用 superpowers:subagent-driven-development。复选框只代表实际实现及验证结果。

**目标：** 建立能够运行、连接真实 PostgreSQL、提供统一 API 响应并接受自动检查的 Web、iOS/Android 与后端工程。

**架构：** pnpm workspace 管理两个客户端和实际共用的包，uv 管理 FastAPI 后端。OpenAPI 由后端导出，再生成客户端类型；本地 PostgreSQL 负责数据库验证。原型继续位于 `ui/mobile/` 和 `ui/desktop/`。

**技术栈：** 沿用已确定的 React/Vite、Expo/React Native、TypeScript、FastAPI/Pydantic 2、SQLAlchemy 2/psycopg 3、Alembic、PostgreSQL、pnpm 与 uv。

**依据：** [开发规范](../AGENT.md)、[V1 需求](LIFE_CANVAS_V1_REQUIREMENTS.md)、[核心契约](CORE_DATA_API.md)、[总开发计划 T1](DEVELOPMENT_PLAN.md#t1可启动的工程数据库和契约检查)。

更新：2026-10-23。状态：**S01–S04 已完成，S05–S11 待执行**。工具链选择见 [S01 环境记录](validation/T1-environment.md)，workspace 见 [S02 记录](validation/T1-workspace.md)，后端入口与配置见 [S03 记录](validation/T1-backend.md)，接口与追踪见 [S04 记录](validation/T1-api.md)。本文件细化 T1，不替代 T2–T7；后续步骤的新增文件、命令和测试仍是实施目标。

## 1. 范围与约束

- 本轮交付基础页面、运行配置、健康检查、数据库连接与迁移框架、共享类型/设计变量、质量检查和启动说明。业务登录、权限/RLS、餐次、日记、AI、上传及云同步在后续任务实施，不提前建立空业务模块。
- Python 使用 3.12，pnpm 使用需求指定的 10.30.3。Node、Expo SDK、React Native 和移动 React 的兼容组合在 S01 核实并记录，后续步骤使用同一记录；Web React 版本单独遵守需求，不能强行覆盖移动依赖。
- 包名固定为 `@life-canvas/web`、`@life-canvas/mobile`、`@life-canvas/api-client`、`@life-canvas/design-tokens`。`packages/client-core/` 在 T4 出现实际业务逻辑时创建。
- 安装依赖使用 pnpm/uv，生成并提交各自锁文件。Git 初始化属于 S02；不自动配置远程仓库、推送或部署。
- 业务 API 前缀为 `/api/v1`。基础设施健康接口沿用 `/health/live`、`/health/ready`；普通 JSON 遵循 `code/msg/data/traceId`，状态码、协议例外及错误结构遵循核心契约。
- 运行配置按使用时校验：T1 后端需要数据库配置，T2 才要求 Auth 配置，M3 才要求模型/Worker 配置。不能要求尚未实现的服务凭据才能启动骨架。
- 正式 Web 默认使用 5173，API 使用 8000，Metro 使用 8081，本地数据库映射 54322；执行前检查占用，冲突时同步配置和文档。原型的 4173 端口保留。
- 配置缺失、数据库断开、接口失败必须呈现真实结果。不能返回模拟成功或借原型 localStorage 充当正式服务。
- 保留现有文件；不格式化原型和第三方 vendor。测试先明确行为、确认失败再实现；目录、配置等低风险项直接检查，不创建复述实现的测试。

## 2. 当前环境与审查重点

S01 记录机器默认环境；S02/S03 已安装项目本地工具与根/后端依赖，详细依据与验证见 [环境记录](validation/T1-environment.md)、[workspace 记录](validation/T1-workspace.md)、[后端入口记录](validation/T1-backend.md)：

| 项目 | 2026-10-22 观察结果 | 实施时处理 |
| --- | --- | --- |
| 工程 | 根 workspace 与基线提交已建立；后端工厂、配置、uv 锁文件和测试可运行；尚无正式客户端 | S04 响应与追踪已完成，S05 接入数据库 |
| Node / pnpm | 机器默认 20.19.6 / 10.28.2；项目本地 24.22.1 / 10.30.3 | 根目录选择 `.tools/bin`；未修改全局默认值 |
| Python / uv | 机器原有 Python 3.13.9 / uv 0.10.2；项目本地已安装 Python 3.12.15 arm64 / uv 0.13.5 | 按 README 选择项目工具与 uv 目录；未修改原有默认环境 |
| Docker | CLI 29.1.3；`docker info` 返回非零 | S05 确认 Docker 服务可用后才验证数据库；不能据此判断 Docker 未安装 |
| iOS | Xcode 26.2；iOS SDK / 可用模拟器运行时 26.2 | 采用兼容的 Expo SDK 55；S09/S11 验证实际构建启动 |
| Android | SDK 标准目录及 adb 未找到；当前 Java 21，无已登记 JDK 17 | S09 补齐 JDK 17、SDK Platform 36 及设备后验收 |

| 输入或故障 | 必须得到的结果 | 验证归属 |
| --- | --- | --- |
| workspace 中 React/Metro 解析不兼容 | 两端依赖可独立解析，iOS/Android 实际启动无重复 React 错误 | S01、S09、S11 |
| 配置缺失或数据库暂时断开 | 缺必需配置明确失败；DB 断开时 live=200、ready=503，可恢复 | S03、S05 |
| 框架错误、伪造追踪头与内部异常 | 正确 HTTP 状态、统一响应、同次日志/响应 traceId 一致，不泄露输入或凭据 | S04 |
| 生成类型过期或干净安装缺依赖 | 契约检查和冻结锁文件安装能发现问题，不靠全局依赖通过 | S06、S10 |
| 浏览器跨域或手机误用 localhost | Web 能读取 traceId；手机使用可达地址；失败可见且可重试 | S04、S08、S09、S11 |

## 3. 步骤总览与依赖

| 步骤 | 独立交付 | 前置 |
| --- | --- | --- |
| S01 | 工具链版本与兼容性记录 | 无 |
| S02 | Git、workspace 与基础检查配置 | S01 |
| S03 | 可启动的后端与环境配置 | S02 |
| S04 | 统一响应、异常处理、traceId 和存活检查 | S03 |
| S05 | 真实数据库、就绪检查与可执行迁移 | S04 |
| S06 | OpenAPI 导出、共享类型与最小健康请求 | S05 |
| S07 | 正式设计变量包 | S02 |
| S08 | Web 基础页面与 API 连通 | S06、S07 |
| S09 | iOS/Android 基础页面与 API 连通 | S06、S07 |
| S10 | 自动化检查与构建流程 | S05、S08、S09 |
| S11 | 干净启动、故障恢复与交付说明 | S10 |

默认按编号顺序推进。每步完成相关检查后记录结果，再进入下一步；基础工程可运行但某平台环境未就绪时，单独记录通过项与阻塞项，不将整个 T1 勾为完成。

## 4. 文件级实施清单

### S01：确认并锁定工具链

**文件：** 已新增 [doc/validation/T1-environment.md](validation/T1-environment.md)。

**输入/输出：** 读取当前工具版本与需求约定；产出明确的 Node、pnpm、Python、uv、Expo SDK/React Native/React、Web React 和 PostgreSQL 版本表，供后续安装与 CI 使用。

- [x] 查询官方兼容说明与包发布信息，核实 pnpm 10.30.3 可用，选择当前项目可使用的稳定 Expo 组合和符合其要求的 Node；记录准确版本、官方来源和核实日期。PostgreSQL major 对齐将使用的 Supabase 环境，尚无云环境时记录本地选择及待对齐项。
- [x] 检查可用 Node/Python、Docker 服务、Xcode SDK/模拟器、Android SDK/adb；分别记录已可用、需安装/启动、未验证，不写真实凭据。
- [x] 验收：版本表足以直接生成 S02/S03/S09 配置，没有用“latest”代替兼容版本。需要调整本机工具时在实施记录中说明影响，不覆盖其他项目的配置。

### S02：初始化仓库与 workspace

**文件：** 新增 `.gitignore`、`.editorconfig`、`.nvmrc`、`.python-version`、`package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`、`tsconfig.base.json`、`biome.json`、`README.md`。

**完成记录：** [S02 workspace 验证](validation/T1-workspace.md)。复用已有 Git，项目本地工具可用；尚未创建正式应用包。

**输入/输出：** 使用 S01 版本表；产出 `apps/*`、`packages/*` workspace 规则、严格 TypeScript 基础配置，以及后续任务可扩展的根脚本。

- [x] 复查目录和 Git 状态，复用已有本地 Git。忽略真实 `.env`、凭据、node_modules、.venv、构建/测试缓存；明确保留 `.env.example`、锁文件和应提交的生成类型，不忽略现有原型交付物。
- [x] 固定 `packageManager: pnpm@10.30.3` 与 Node/Python 版本文件；安装 Biome/TypeScript 等本步实际使用的工具并生成锁文件。后续包新增时正常更新锁文件。
- [x] 配置 Biome 只覆盖正式源码/配置；建立当前确实可运行的脚本，暂不存在的检查不伪造通过，待对应步骤添加。README 标明骨架尚在搭建及原型入口。
- [x] 验收：`pnpm install --frozen-lockfile` 成功；当前已有文件的 `pnpm lint` 成功；`git status --short` 中没有真实环境配置或依赖目录。空 workspace 不视为两个客户端已创建。

### S03：建立后端入口和配置边界

**文件：** 新增 `services/backend/{pyproject.toml,uv.lock,app/__init__.py,app/main.py,app/core/__init__.py,app/core/config.py,tests/conftest.py,tests/test_config.py}` 与根 `.env.example`。下文 `{a,b}` 表示同一目录下的多个文件。

**接口：** `Settings` 读取 `APP_ENV`、`DATABASE_URL`、`CORS_ORIGINS`；`load_settings() -> Settings`；`create_app(settings: Settings | None = None) -> FastAPI`。`DATABASE_URL` 使用不直接打印的敏感值类型；无参数的 factory 从环境读取。

**完成记录：** [S03 后端入口与配置验证](validation/T1-backend.md)。25 项测试、实际启动与失败路径、Ruff 和依赖一致性检查通过；没有连接数据库。

- [x] 写 `test_missing_database_url_fails`、`test_invalid_database_url_fails`、`test_explicit_settings_override_environment`，断言必需项错误明确且异常文本/配置 repr 不含测试密码；运行确认行为尚未实现。
- [x] 配置 Python 3.12、FastAPI/Pydantic/SQLAlchemy/psycopg/Alembic 与 Ruff/pytest/httpx 测试依赖；用 uv 生成锁文件。建立工厂入口，环境文件加载位置明确，不依赖调用者碰巧位于某个 cwd。
- [x] `.env.example` 只放变量、说明和占位符；根 `.env` 供本地后端/Compose 使用，前端仅读取各自公开配置。后续迁移独立使用 `MIGRATION_DATABASE_URL`，不把迁移凭据塞进客户端。
- [x] 验收：`uv run --project services/backend pytest services/backend/tests/test_config.py -q` 通过；`uv run --project services/backend uvicorn app.main:create_app --factory --app-dir services/backend --port 8000` 能启动；缺配置时启动失败且无秘密值。

### S04：实现 REST API 的公共响应能力

**完成记录：** [S04 接口、追踪与存活检查验证](validation/T1-api.md)。52 项测试、lint 和真实 HTTP 检查通过；数据库仍未接入。

**文件：** 新增 `services/backend/app/core/{response.py,errors.py,tracing.py}`、`services/backend/app/health.py`、`services/backend/tests/{test_api_contract.py,test_health.py}`；修改 `services/backend/app/main.py`。

**接口：** `ApiResponse[T]` 仅含 `code: int`、`msg: str`、`data: T`、`traceId: str`；`HealthRead.status` 为字面量 `"ok"`；`GET /health/live` 返回 `ApiResponse[HealthRead]`。`get_trace_id() -> str` 提供当前请求日志/响应使用的标识。成功响应构造 `success(data: T, *, trace_id: str, status_code: int = 200) -> ApiResponse[T]`，路由 HTTP 状态须同步设置。

- [x] 写响应断言：`set(body) == {"code", "msg", "data", "traceId"}`、`body["code"] == response.status_code`、`body["traceId"] == response.headers["X-Trace-Id"]`，traceId 匹配 `[0-9a-f]{32}`；live 的 `data == {"status": "ok"}`。
- [x] 在隔离测试应用覆盖 200/201/202、400 损坏 JSON、404/405、422 字段错误、401/429 和未处理 500；核对 `Location`、`Allow`、`WWW-Authenticate`、`Retry-After` 保留，错误不含堆栈和测试敏感输入。调试故障路由只存在于测试应用。
- [x] 增加伪造 `X-Trace-Id`、并发请求日志隔离、204/304/HEAD 无体与 CORS 测试；允许的 Web origin 在正常和 500 响应中均能读取 `X-Trace-Id`/`Location`。先确认失败再实现追踪中间件、异常处理及健康路由。
- [x] 保持 OpenAPI JSON 和文档端点的标准协议；不提前实现 SSE/下载业务，只确保统一响应通过路由 schema/异常处理完成，不是无差别改写所有响应字节。
- [x] 验收：`uv run --project services/backend pytest services/backend/tests/test_api_contract.py services/backend/tests/test_health.py -q` 通过；`curl -i http://127.0.0.1:8000/health/live` 返回 200 和约定 JSON。

### S05：接通 PostgreSQL、就绪检查和迁移

**文件：** 新增 `infra/compose.yaml`、`services/backend/{app/core/db.py,alembic.ini,alembic/env.py,alembic/script.py.mako,alembic/versions/0000_baseline.py,tests/integration/test_database.py}`；修改 `services/backend/{app/main.py,app/health.py,tests/test_health.py}` 和根 `.env.example`。

**接口：** `create_engine(settings: Settings) -> AsyncEngine`，SQLAlchemy async engine 使用 psycopg 3；`probe_database(engine: AsyncEngine) -> bool` 在 2 秒总超时内执行 `SELECT 1`。`GET /health/ready` 可用时返回与 live 相同的成功结构；不可用时为 503，`data.reason == "DATABASE_UNAVAILABLE"`。

- [ ] 写真实 PostgreSQL 连接和迁移测试，以及 DB 不可达时 `live.status_code == 200`、`ready.status_code == 503` 的接口测试。测试使用独立临时数据库，不能清理开发库或现有数据卷。
- [ ] 创建只绑定本机的 PostgreSQL Compose 服务和 healthcheck；镜像版本来自 S01。凭据来自被忽略的本地环境配置，停止/恢复测试不删除数据卷。
- [ ] 在应用 lifespan 创建/释放连接池，数据库连接失败不阻止存活检查；执行 DB 探测时不阻塞事件循环。T1 不加入身份事务或业务表，`UnitOfWork`、角色权限与 RLS 在 T2 实现。
- [ ] 配置 Alembic 从 `MIGRATION_DATABASE_URL` 读取迁移连接。`0000_baseline` 仅建立迁移基线记录，不伪造业务模型；T2 的 `0001_identity` 接在它之后。
- [ ] 验收：从根目录运行 `docker compose --env-file .env -f infra/compose.yaml up -d`，在后端目录运行 `uv run alembic upgrade head` 和 `uv run alembic current`；测试库执行基线升级→降到 base→再次升级成功。运行 `uv run --project services/backend pytest services/backend/tests/integration/test_database.py services/backend/tests/test_health.py -q`；手动停止/恢复数据库确认 ready 随之 503→200。

### S06：打通 OpenAPI 与共享客户端类型

**文件：** 新增 `services/backend/{scripts/export_openapi.py,openapi.json}`、`packages/api-client/{package.json,tsconfig.json,src/index.ts,src/generated/schema.d.ts,src/health.ts,tests/health.test.ts}`；修改根脚本/锁文件。

**接口：** `ReadyResponse` 从生成的 `/health/ready` 200 schema 派生；`getReadiness(options: {baseUrl: string; signal?: AbortSignal}): Promise<ReadyResponse>`。`HealthCheckError` 携带 `kind: "network" | "http" | "protocol"`、可选 `status`/`traceId`，保留取消语义。完整认证 transport 和业务方法仍由 T4 实现。

- [ ] 后端导出 OpenAPI，健康成功/503 与公共错误模型在 schema 中可见。导出过程只读取路由/schema，不连接数据库，也不需要真实 DB/Auth/模型凭据；测试配置值不写入产物。
- [ ] 用固定版本生成工具建立 `pnpm api:generate` 和只校验漂移、不悄悄修改工作区的 `pnpm api:check`；生成类型不手工编辑，API 包不依赖任何 React 版本。
- [ ] 为健康请求写行为测试：200 返回生成类型对应数据；503 保留 HTTP 状态/traceId；200 配合 `code:503` 或缺少字段时拒绝为协议错误；网络失败不返回假成功；取消请求不改写为普通业务失败。确认失败后实现最小请求函数。
- [ ] 验收：`pnpm api:generate` 后 `pnpm api:check` 通过，连续生成无差异；刻意改变测试 schema 后 check 能失败；`pnpm --filter @life-canvas/api-client test` 和 `typecheck` 通过。schema 导出无需启动真实服务。

### S07：建立两端共用的设计变量

**文件：** 新增 `packages/design-tokens/{package.json,tsconfig.json,src/tokens.json,src/index.ts,scripts/generate-css.mjs,generated/web.css,README.md}`；修改根锁文件。

**接口：** 包根导出 `tokens`，包括颜色、间距、圆角、字号/行高和动效时长；Web 从 `@life-canvas/design-tokens/web.css` 读取生成变量，手机从包根读取原生可用值。映射字段在包 README 固定，两端依赖它而不各自复制一份。

- [ ] 对照 `ui/shared/design-tokens.json` 提取已确认的纸白、墨绿和间距等基础值，记录原型字段到正式字段的对应；正式包自包含，不在运行时跨目录读取 `ui/`。
- [ ] 建立 `tokens.json` 到 CSS 的 `generate` 命令与只检查漂移的 `check:generated` 命令，保留两端字体和布局的独立适配；不提前建完整组件库或把 CSS 单位强塞给原生样式。
- [ ] 验收：`pnpm --filter @life-canvas/design-tokens typecheck` 与 `generate` 成功；生成 CSS 可重复；S08/S09 各有真实使用方后才算两端接入完成。此步不添加机械的色值快照测试。

### S08：创建 Web 基础应用

**文件：** 新增 `apps/web/{package.json,index.html,vite.config.ts,tsconfig.json,.env.example,components.json,src/main.tsx,src/app/App.tsx,src/app/router.tsx,src/app/styles.css,src/features/system/ConnectionPage.tsx,src/components/ui/button.tsx}`；修改根脚本/锁文件。

**输入/输出：** 通过 `VITE_API_BASE_URL` 指定 API origin；使用 S06 `getReadiness`、S07 变量；产出可构建的 React/Vite/Router/Tailwind/shadcn 应用和开发阶段连接检查页。

- [ ] 初始化应用、根路由和样式接入；只加入基础页面实际需要的组件及依赖，不生成饮食/日记/AI 的空页面。
- [ ] 页面显示连接检查的加载、成功、错误和重试，错误保留可复制的 traceId；检查动作调用真实 `/health/ready`。未配置 URL 时明确提示配置问题，不静默访问生产环境。
- [ ] 增加 Web 实际构建/类型检查脚本；验证标题层级、键盘焦点和常用桌面宽度，视觉沿用现有原型规范。
- [ ] 验收：`pnpm --filter @life-canvas/web dev` 可访问；`typecheck` 与 `build` 通过；真实数据库断开后显示服务不可用，恢复后重试成功，开发者控制台无 CORS 错误。

### S09：创建 iOS/Android 基础应用

**文件：** 新增 `apps/mobile/{package.json,app.json,tsconfig.json,.env.example,app/_layout.tsx,app/index.tsx,src/features/system/ConnectionScreen.tsx}`；按所选 SDK 的实际需要配置 Metro，修改根脚本/锁文件。

**输入/输出：** 使用 S01 的完整 Expo 兼容组合、S06 健康请求和 S07 变量；从 `EXPO_PUBLIC_API_BASE_URL` 读取可达 API origin；产出原生组件实现的基础连接检查页。

- [ ] 初始化 Expo Router、StyleSheet 页面与安全区；API/types 包不引入第二份 React，不添加 Web CSS 或浏览器专属依赖。
- [ ] 接入同样的加载、成功、失败和重试行为；校验字体缩放、安全区、触摸范围。仅在应用中公开 API origin，不打包后端 `.env` 或数据库配置。
- [ ] 分别配置 iOS 模拟器、Android 模拟器和真机访问地址：真机 localhost 指向手机自身，需可达的开发机局域网地址；有需要时后端监听 `0.0.0.0`，仅开发环境允许本地 HTTP，正式环境使用 HTTPS。
- [ ] 验收：`pnpm --filter @life-canvas/mobile typecheck`、`doctor` 通过；`export:ios` 和 `export:android` 分别验证 JS/资源打包。再执行 `ios`/`android` 脚本完成原生构建与启动，记录所用设备；导出或 Expo Go 运行不能代替原生构建验收。

### S10：建立统一检查与 CI

**文件：** 新增 `.github/workflows/ci.yml`、`tests/web/bootstrap.spec.ts`、`playwright.config.ts`；修改根/各包脚本、`services/backend/pyproject.toml` 和锁文件。

**接口：** 根目录固定提供 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build:web`、`pnpm api:check`、`pnpm test:web`；每个命令清楚说明覆盖范围。`lint` 包括 Biome、Ruff check 和 Ruff format check；`test` 汇总已有 Vitest/pytest，数据库集成测试失败不能静默跳过。

- [ ] CI 使用 S01 的 Node/Python/pnpm/uv 版本，运行 `pnpm install --frozen-lockfile`、`uv sync --project services/backend --frozen`，从空测试 PostgreSQL 执行迁移，再运行检查、测试、契约漂移检查和 Web 构建。
- [ ] 添加两条关键 Playwright 检查：Web 真实访问 API 成功；数据库停止导致 ready=503 后页面提示失败，恢复后重试成功。数据库故障测试串行运行在独立测试环境，避免影响其他用例。
- [ ] CI 验证移动端 TypeScript、Expo 配置和 iOS/Android bundle；原生构建/设备启动单独保留验收记录，不把 Linux CI bundle 成功写成手机运行成功。
- [ ] 用 `pnpm api:check` 和 `pnpm --filter @life-canvas/design-tokens check:generated` 校验生成类型/CSS 无漂移；缺失锁文件/不匹配依赖应使检查失败。CI 日志不输出完整环境变量；缓存仅用于提速，不作为安装依赖来源。
- [ ] 验收：本地运行同一组命令全部通过并记录输出摘要。未配置 Git 远程时，标明“CI 配置已建立、本地等价检查通过、远端 CI 待运行”，不能声称 GitHub Actions 已绿。

### S11：完成启动说明和骨架验收

**文件：** 完善根 `README.md`、新增 `services/backend/README.md`、`infra/README.md`、`doc/validation/T1-bootstrap.md`；同步 `AGENT.md`、`doc/README.md`、准备清单及总计划的实际状态。

- [ ] 写清依赖版本、环境文件位置、安装顺序、Compose/迁移/API/Web/手机启动命令、端口和常见错误；命令与实际 scripts 一致，说明云 Auth/模型凭据尚不属于 T1 启动前提。
- [ ] 在临时干净目录验证冻结安装、迁移及 Web/后端启动；不复用项目外的临时 node_modules，不依赖开发者机器上未声明的包。
- [ ] 逐项记录 Web、API、PostgreSQL、iOS、Android 的实际环境、命令、成功/失败/未运行以及截图；对数据库断开/恢复、错误 traceId 与跨域进行最终联调。
- [ ] 复查 `http://127.0.0.1:4173/` 的原型入口仍可访问，现有原型文件引用保持有效；没有视觉修改时不重新导出全部原型截图。
- [ ] 相关检查通过后，按已验证步骤做本地提交并检查无秘密信息或无关变更。仅当 S01–S11 全部验收通过才勾选总计划 T1；未完成的原生构建/环境验证单独列出，已通过部分可以交付但不能宣称整个 T1 完成。

## 5. 交付顺序与完成边界

先完成 **S01–S05**，得到能启动、能测数据库状态且响应规范正确的后端；接着完成 **S06–S09**，得到共用契约和设计变量的两个真实客户端；最后通过 **S10–S11** 固定自动检查、启动方法和验证证据。

本次文档拆分不代表上述实现已经完成。T1 完成后进入总计划 T2：真实认证、设备会话、角色/RLS 与账号隔离，再推进三餐业务流程。
