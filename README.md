# Life Canvas

个人生活记录产品，规划提供 iOS、Android 和电脑 Web 端。需求与原型已经建立，正式工程正在按步骤搭建。

## 当前进度

- S01：工具链版本确认完成，见 [环境记录](doc/validation/T1-environment.md)。
- S02：建立根 workspace、版本约定、TypeScript 基础配置和 Biome 检查；验证结果见 [S02 记录](doc/validation/T1-workspace.md)。
- S03：FastAPI 入口、环境配置与脱敏校验完成；25 项测试及实际启动通过，见 [S03 记录](doc/validation/T1-backend.md)。
- S04：统一响应、错误处理、追踪、CORS 和存活检查完成；52 项后端测试与真实 HTTP 验证通过，见 [S04 记录](doc/validation/T1-api.md)。
- S05：PostgreSQL、本机 Compose、就绪检查与 Alembic 基线迁移完成，见 [S05 记录](doc/validation/T1-database.md)。
- Web、手机应用尚未创建；后端当前没有业务接口。

开发前阅读 [AGENT.md](AGENT.md)、[文档入口](doc/README.md)和 [工程骨架实施计划](doc/ENGINEERING_BOOTSTRAP_PLAN.md)。

## 工具版本

| 工具 | 版本 |
| --- | --- |
| Node.js | 24.22.1 |
| pnpm | 10.30.3 |
| TypeScript | 5.9.3 |
| Biome | 2.6.2 |
| Python | 3.12.15 |
| uv | 0.13.5 |

`.nvmrc` 与 `.python-version` 固定解释器版本；`packageManager` 固定 pnpm；`pnpm-lock.yaml` 固定 JavaScript 依赖，`services/backend/uv.lock` 固定 Python 依赖。

## 安装与检查

在项目根目录使用上表中的固定版本工具。当前开发机已准备项目本地工具，打开新终端后先执行：

```sh
export PATH="$PWD/.tools/bin:$PATH"
export UV_CACHE_DIR="$PWD/.tools/uv-cache"
export UV_PYTHON_INSTALL_DIR="$PWD/.tools/python"
node --version
pnpm --version
uv --version
```

`.tools/` 是被忽略的本机工具目录，克隆仓库不会自动包含它。其他机器可用 nvm 按 `.nvmrc` 执行 `nvm install` / `nvm use`，再通过 Corepack 的 `corepack pnpm` 使用 `packageManager` 指定的版本；也可使用自行安装的准确版本 pnpm。uv 使用固定的 0.13.5；运行 `uv sync` 时可按需下载 Python。无需改动其他项目的默认工具版本。

pnpm 依赖缓存固定在项目的 `.tools/pnpm-store/`；从根目录安装，其他机器按锁文件重新下载即可。

工具准备好后安装与检查：

```sh
pnpm install --frozen-lockfile
uv sync --project services/backend --frozen --python 3.12.15
pnpm lint
```

完整后端测试需真实 PostgreSQL：按 [数据库说明](infra/README.md) 配置根 `.env` 并启动 Compose，再运行 `pnpm test:backend`。测试只在随机临时库内执行迁移，不使用开发库做回退测试。

首次下载在慢速网络下超时时，可临时加 `UV_HTTP_TIMEOUT=900` 重试 uv 安装命令，不修改依赖源或锁文件。

| 命令 | 实际覆盖范围 |
| --- | --- |
| `pnpm lint` | 顺序执行 Biome 与 Python 检查，任一失败则整体失败 |
| `pnpm lint:js` | Biome 格式、语法与推荐规则，警告也失败；当前处理三个根 JSON 配置 |
| `pnpm lint:python` | 后端 Ruff 规则与格式检查 |
| `pnpm format` / `pnpm format:python` | 分别格式化 Biome 范围 / Python 后端；会修改文件 |
| `pnpm test:backend` | 后端 pytest；覆盖配置、响应、追踪、健康接口、真实 PostgreSQL 与迁移，需配置 `TEST_DATABASE_URL` |
| `pnpm dev:backend` | 在 127.0.0.1:8000 启动 FastAPI；需先配置根 `.env` 或进程环境 |

Biome 仅覆盖根配置与后续 `apps/`、`packages/`、`tests/` 下的正式文件；Ruff 覆盖 `services/backend/`。`ui/` 原型、第三方 vendor 和生成文件不在格式化范围。当前尚无正式 TypeScript 源码，`tsconfig.base.json` 作为后续各包配置的基础；全局 `typecheck`、`test`、`build` 在对应实现出现后添加。

后端配置、启动与检查详见 [services/backend/README.md](services/backend/README.md)。根 [`.env.example`](.env.example) 只提供占位符；已有本地 `.env` 时不要覆盖。配置有效即可启动后端并访问 `/health/live`；`/health/ready` 在数据库可连接时返回 200，不可用时返回 503。Compose、迁移与数据库测试命令见 [infra/README.md](infra/README.md)。

## 目录约定

| 目录 | 状态与用途 |
| --- | --- |
| `doc/` | 已有：需求、接口契约、开发计划及验证记录 |
| `ui/mobile/` | 已有：手机端原型 |
| `ui/desktop/` | 已有：PC 端原型 |
| `ui/shared/`、`ui/brand/` | 已有：共用设计资料和品牌提案 |
| `apps/*` | 已配置 workspace 匹配规则；Web / 手机应用将在 S08 / S09 创建 |
| `packages/*` | 已配置 workspace 匹配规则；API 类型与设计变量包将在 S06 / S07 创建 |
| `services/backend/` | S03–S05：后端公共能力、数据库连接、健康接口、迁移与测试 |
| `infra/` | 本机 PostgreSQL Compose、配置与操作说明 |

共享代码仅在出现实际使用方时建立，不提前创建空业务模块。

## 原型预览

先确认 4173 端口没有现有预览服务，再启动：

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory ui
```

- [手机原型画廊](http://127.0.0.1:4173/mobile/index.html)
- [PC 原型画廊](http://127.0.0.1:4173/desktop/gallery.html)
- [PC 日记原型](http://127.0.0.1:4173/desktop/index.html?screen=journals)

这些是设计原型；正式账号、云端保存与跨端同步按后续步骤实现。

## 本地文件与提交

真实 `.env`、凭据、依赖安装目录、本机工具、构建输出和缓存由 `.gitignore` 排除；`.env.example`、锁文件、生成的 API 类型与原型交付物保留。添加文件前检查 `git status --short`。
