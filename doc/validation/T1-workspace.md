# T1 · S02 workspace 初始化记录

日期：2026-10-22（Asia/Shanghai）。依据：[S02 实施清单](../ENGINEERING_BOOTSTRAP_PLAN.md#s02初始化仓库与-workspace)、[S01 版本基线](T1-environment.md)。

**状态：S02 完成。** 根 workspace、版本约定、忽略规则、TypeScript 基础配置与 Biome 检查已建立。Web、手机应用、后端、数据库和 CI 留在各自后续步骤。

## 1. 实际交付

| 文件 | 作用 |
| --- | --- |
| `.gitignore` | 排除真实环境配置、凭据、依赖、本机工具、缓存与构建输出；保留环境示例、锁文件、生成类型和原型素材 |
| `.editorconfig` | UTF-8、LF、末尾换行；默认 2 空格，Python 4 空格 |
| `.nvmrc`、`.python-version` | 固定 Node 24.22.1、Python 3.12.15；Python 安装在 S03 执行 |
| `package.json` | 私有 workspace 根包；pnpm 10.30.3；Node 版本约束；`lint` / `format` 两个实际可用脚本 |
| `pnpm-workspace.yaml` | `apps/*`、`packages/*` 规则；严格引擎检查、隔离依赖布局、准确版本保存与项目本地 store |
| `pnpm-lock.yaml` | pnpm 实际生成；固定 Biome 2.6.2、TypeScript 5.9.3 和平台依赖的完整性信息 |
| `tsconfig.base.json` | strict、空值检查、可选属性与索引访问检查等；各端 JSX / lib 在各自应用中配置 |
| `biome.json` | 正式配置与未来源码的格式、语法和推荐规则；排除原型、vendor、生成文件 |
| 根 `README.md` | 当前状态、准确版本、安装检查、目录约定和已有原型入口 |

两个 workspace 匹配规则已经配置，尚未创建空应用或空共享包。当前没有根 `typecheck`、`test` 或 `build` 脚本，避免把不存在的正式源码检查伪装成通过。

## 2. 工具与 Git 处理

- 复用已有 Git 仓库；保留原有 HEAD、索引状态和未提交的文档/原型。本步没有创建分支、初始提交、远程仓库或推送。
- 从官方发行源下载 Node 24.22.1 macOS arm64 与 pnpm 10.30.3，分别验证 SHA-256 / 包元数据中的 SHA-512 后解包。
- 工具放在被忽略的 `.tools/`，通过 `.tools/bin` 选择；pnpm store 位于 `.tools/pnpm-store/`。未修改系统 PATH 配置、nvm 默认版本或全局 pnpm。
- Python 只写版本文件，尚未安装 3.12.15 或创建后端虚拟环境。没有启动 Docker、模拟器或更改 4173 原型服务。

当前终端使用：

```sh
export PATH="$PWD/.tools/bin:$PATH"
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm lint
```

项目检查是配置与安装验证，不涉及业务实现，本步未增加长期维护的单元测试文件。临时验证夹具在系统临时目录中运行并自动清理。

## 3. 验证结果

| 检查 | 实际结果 |
| --- | --- |
| 工具版本 | Node 24.22.1 / arm64；pnpm 10.30.3 |
| 根目录安装 | `pnpm install --frozen-lockfile` 成功；锁文件未变化 |
| 干净目录复现 | 仅复制根配置和锁文件到空临时目录，冻结安装成功，随后 `pnpm lint` 成功 |
| Biome 基础检查 | 检查当前 3 个 JSON 配置，零错误、零警告 |
| 检查范围 | 在临时目录的 ui、vendor、generated 中放入无效 TS，检查仍只处理正式配置；没有误纳入这些目录 |
| 违规代码拦截 | 在临时 apps 源码中加入显式 any，`pnpm lint` 退出 1；改成合法源码后退出 0 |
| TypeScript 配置 | 5.9.3 编译器可读取基础配置；合法夹具通过，空值、可选属性和未检查索引访问的违规夹具被拒绝 |
| Git 忽略规则 | 13 类环境/凭据/生成目录被忽略；8 类示例、锁文件、生成类型与原型交付物保留 |
| 格式化与原型保护 | `pnpm format` 处理 3 个配置且无需修改；149 个原型文件的前后 SHA-256 全部一致 |
| 文档与范围 | 7 份相关文档、58 个本地链接检查通过；仅 S01/S02 勾选完成；Git HEAD/索引未改变 |

首次违规夹具验证发现 Biome 默认将显式 any 视为警告，命令仍退出 0；已通过 `biome check --error-on-warnings .` 修正，复测确认失败状态能正确传递。Biome 配置同时采用 2.6.2 的 `preset` 和目录排除写法，消除旧语法提示。

## 4. 范围与交接

本次直接执行 S02，未开启后端或客户端实现。依据侧边会话的范围限制，在当前目录做局部改动，复用现有 Git；不调度子代理，不为配置任务建立额外分支或 worktree。验证由当前执行者完成。

下一步 S03：建立 `services/backend/`，安装项目所需 Python/uv，编写配置校验与 FastAPI 工厂。当前 lint 仅包含 Biome；Ruff、业务测试、类型检查和构建将在对应文件实际出现后接入，整个 T1 尚未完成。
