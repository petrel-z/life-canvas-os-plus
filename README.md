# Life Canvas

个人生活记录产品，规划提供 iOS、Android 和电脑 Web 端。需求与原型已经建立，正式工程正在按步骤搭建。

## 当前进度

- S01：工具链版本确认完成，见 [环境记录](doc/validation/T1-environment.md)。
- S02：建立根 workspace、版本约定、TypeScript 基础配置和 Biome 检查；验证结果见 [S02 记录](doc/validation/T1-workspace.md)。
- Web、手机应用、后端和数据库尚未创建。当前没有应用启动、业务测试或构建命令。

开发前阅读 [AGENT.md](AGENT.md)、[文档入口](doc/README.md)和 [工程骨架实施计划](doc/ENGINEERING_BOOTSTRAP_PLAN.md)。

## 工具版本

| 工具 | 版本 |
| --- | --- |
| Node.js | 24.22.1 |
| pnpm | 10.30.3 |
| TypeScript | 5.9.3 |
| Biome | 2.6.2 |
| Python（S03 后端使用） | 3.12.15 |

`.nvmrc` 与 `.python-version` 固定解释器版本；`packageManager` 固定 pnpm；`pnpm-lock.yaml` 固定已安装的 JavaScript 依赖。Python 环境和 `uv.lock` 在 S03 建立。

## 安装与检查

在项目根目录使用 Node 24.22.1 和 pnpm 10.30.3：

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm lint
```

当前开发机已准备项目本地工具，打开新终端后可以使用：

```sh
export PATH="$PWD/.tools/bin:$PATH"
node --version
pnpm --version
```

`.tools/` 是被忽略的本机工具目录，克隆仓库不会自动包含它。其他机器可用 nvm 按 `.nvmrc` 执行 `nvm install` / `nvm use`，再通过 Corepack 的 `corepack pnpm` 使用 `packageManager` 指定的版本；也可使用自行安装的准确版本 pnpm。无需改动其他项目的默认工具版本。

pnpm 依赖缓存固定在项目的 `.tools/pnpm-store/`；从根目录安装，其他机器按锁文件重新下载即可。

| 命令 | 实际覆盖范围 |
| --- | --- |
| `pnpm lint` | Biome 检查格式、支持的语法与推荐规则，警告也会失败；当前处理根目录的三个 JSON 配置 |
| `pnpm format` | 自动格式化同一范围；会修改文件 |

Biome 仅覆盖根配置与后续 `apps/`、`packages/`、`tests/` 下的正式文件。`ui/` 原型、第三方 vendor 和生成文件不在格式化范围。当前尚无正式 TypeScript 源码，`tsconfig.base.json` 作为后续各包配置的基础；`typecheck`、`test`、`build` 在对应实现出现后添加。

## 目录约定

| 目录 | 状态与用途 |
| --- | --- |
| `doc/` | 已有：需求、接口契约、开发计划及验证记录 |
| `ui/mobile/` | 已有：手机端原型 |
| `ui/desktop/` | 已有：PC 端原型 |
| `ui/shared/`、`ui/brand/` | 已有：共用设计资料和品牌提案 |
| `apps/*` | 已配置 workspace 匹配规则；Web / 手机应用将在 S08 / S09 创建 |
| `packages/*` | 已配置 workspace 匹配规则；API 类型与设计变量包将在 S06 / S07 创建 |
| `services/backend/` | 待 S03 创建 FastAPI 后端 |
| `infra/` | 待 S05 创建本地数据库配置 |

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
