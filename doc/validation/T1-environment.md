# T1 · S01 工具链与环境核实

核实日期：2026-10-22（Asia/Shanghai）。对应 [工程骨架计划 S01](../ENGINEERING_BOOTSTRAP_PLAN.md#s01确认并锁定工具链)。

**状态：S01 完成。** 已确定版本基线，检查包发布信息、官方兼容要求与本机工具。这里只完成版本确认和环境盘点；依赖安装、锁文件、数据库连接及原生构建仍在后续步骤验收。

## 1. 后续工程采用的版本

下表是项目初始化的固定输入，不代表这些版本已安装。S02/S03/S09 将其写入配置与锁文件；不要通过浮动发布标签重新选择版本。

| 工具或依赖 | 确定版本 | 配置归属与依据 |
| --- | --- | --- |
| Node.js | **24.22.1 LTS** | S02 `.nvmrc`；CI 使用同一版本；[官方发布索引](https://nodejs.org/dist/index.json)确认发布于 2026-10-20，提供 macOS arm64 构建 |
| pnpm | **10.30.3** | 根 `packageManager: "pnpm@10.30.3"`；[包元数据](https://registry.npmjs.org/pnpm/10.30.3)确认已发布，Node 要求 `>=18.12` |
| Python | **3.12.15** | S02 `.python-version`、S03 后端环境；本机使用 arm64 解释器；[官方发布页](https://www.python.org/downloads/release/python-31215/)确认是 3.12 系列安全更新 |
| uv | **0.13.5** | 后端安装与 CI 固定版本；[正式发布](https://github.com/astral-sh/uv/releases/tag/0.13.5)及 macOS arm64 安装包已核实 |
| TypeScript | **5.9.3** | S02/S08/S09；[包元数据](https://registry.npmjs.org/typescript/5.9.3)，满足 Expo SDK 55 官方模板的 `~5.9.2` 范围 |
| Biome | **2.6.2** | S02；[包元数据](https://registry.npmjs.org/@biomejs%2fbiome/2.6.2)，Node 要求 `>=14.21.3` |
| Expo SDK / expo 包 | **55 / 55.0.32** | S09；采用本机 Xcode 可支持的稳定组合；[包元数据](https://registry.npmjs.org/expo/55.0.32) |
| React Native | **0.83.10** | S09；来自 expo 55.0.32 内置兼容清单；[包元数据](https://registry.npmjs.org/react-native/0.83.10) |
| 移动 React / React DOM（需要时） | **19.2.0 / 19.2.0** | S09；遵循同一 Expo 兼容清单，不由 Web 端覆盖 |
| Expo Router | **55.0.18** | S09；[包元数据](https://registry.npmjs.org/expo-router/55.0.18)，对应内置清单的 `~55.0.18` |
| Web React / React DOM | **19.3.1 / 19.3.1** | S08；[React](https://registry.npmjs.org/react/19.3.1)与 [React DOM](https://registry.npmjs.org/react-dom/19.3.1)已发布，DOM 的 React peer 为 `^19.3.1` |
| Vite | **8.3.5** | S08；[包元数据](https://registry.npmjs.org/vite/8.3.5)，Node 要求 `^20.19.0 || >=22.12.0` |
| 本地 PostgreSQL | **17.11**，镜像 **postgres:17.11-bookworm** | S05；[官方支持列表](https://www.postgresql.org/support/versioning/)与 [Docker 官方镜像清单](https://raw.githubusercontent.com/docker-library/official-images/master/library/postgres)确认版本、标签及 arm64v8 支持 |
| iOS 构建工具 | **Xcode 26.2（17C52）**、iOS SDK / 模拟器运行时 **26.2** | S09/S11 使用本机现有版本，实际构建待验收 |
| Android 基线 | **JDK 17**、Android SDK Platform **36**、Build-Tools **36.0.0** | S09 安装并记录 JDK/SDK 工具补丁号；Gradle/AGP 使用所选 Expo/RN 模板生成的配套版本，不单独追新 |

Python `requires-python` 约束为 `>=3.12,<3.13`；解释器和 CI 固定到上表补丁号。FastAPI/Pydantic 2、SQLAlchemy 2、psycopg 3 等后端依赖在 S03 解析并写入 `uv.lock`，本步没有声称它们已完成安装或集成测试。

### Expo 版本选择与两端依赖隔离

采用 SDK 55 是本次实施选择：其稳定版本能够使用当前 macOS 15.6.1 / Xcode 26.2。SDK 56–58 的官方要求为 Xcode 26.4 及以上；Apple 对 Xcode 26.4.1 要求 macOS 26.2 及以上，直接升级会扩大到开发机系统升级。因此骨架先使用 SDK 55，后续升级须重新核对整套兼容组合。依据：[Expo 平台兼容表](https://docs.expo.dev/versions/v57.0.0/)、[Apple Xcode 系统要求](https://developer.apple.com/xcode/system-requirements)。

本步实际读取了 [expo 55.0.32 发布包](https://registry.npmjs.org/expo/-/expo-55.0.32.tgz)中的 `package/bundledNativeModules.json`，并与 [官方 SDK 55 模板 55.1.40](https://registry.npmjs.org/expo-template-default/55.1.40)交叉核对。S09 最小页面需要的配套版本为：

| 包 | 固定版本 | 发布包内兼容范围 |
| --- | --- | --- |
| react | 19.2.0 | 19.2.0 |
| react-native | 0.83.10 | 0.83.10 |
| expo-router | 55.0.18 | ~55.0.18 |
| expo-constants | 55.0.17 | ~55.0.17 |
| expo-linking | 55.0.17 | ~55.0.17 |
| expo-status-bar | 55.0.6 | ~55.0.6 |
| react-native-safe-area-context | 5.6.2 | ~5.6.2 |
| react-native-screens | 4.23.0 | ~4.23.0 |

Router 的实际必需 peer 随 S09 安装一并检查；本表不是宣称仅安装这些包就完成原生工程。后续新增设备能力通过当前 SDK 的 `expo install` 选择配套依赖。

- Node 24.22.1 满足 SDK 55 官方 Node 24 支持范围 `^24.3.0`、RN 0.83.10 的 `>=20.19.4`，以及 pnpm/Vite/TypeScript/Biome 的 Node 要求。[SDK 55 发布说明](https://expo.dev/changelog/sdk-55)
- 两个应用各自声明 React；共享 API/types/设计变量包不依赖 React，不通过根 overrides 强行统一两端版本。pnpm 保留隔离依赖布局，Metro 按 Expo 的 monorepo 支持配置；S09 检查移动依赖图与重复原生模块。[Expo monorepo 指南](https://docs.expo.dev/guides/monorepos/)
- SDK 55 并非最新 SDK。S09 使用开发构建；正式发布前重新核对 SDK 支持周期及应用商店要求。本步版本匹配不代表完成发布兼容验收。

### PostgreSQL 与 Supabase

本地明确选择 PostgreSQL 17.11；Supabase 云项目版本**尚未核实**，不能声称已对齐。接入真实云环境时读取 `SHOW server_version`，比对 major 和所需扩展；若不同，先统一本地/CI/云端 major，再执行迁移、RLS 和并发集成验收。普通 PostgreSQL 容器不提供 Supabase Auth/Storage，相关服务仍属于 T2 之后的接入工作。

Docker Hub 标签接口本次访问超时，标签与架构通过 Docker 官方镜像仓库清单确认；没有拉取镜像、获取运行时 digest 或运行数据库。镜像拉取、digest 记录与 SQL 连接在 S05 验收。

## 2. 本机实际检查结果

平台：macOS **15.6.1**，Apple Silicon **arm64**。检查未安装/升级工具，未修改 shell 默认环境、Git 状态或已有原型。

| 项目 | 实际结果 | 状态与后续处理 |
| --- | --- | --- |
| Node | 当前 20.19.6；nvm 已安装列表不含 Node 24 | 需在 S02 为项目安装/选择 24.22.1；不改其他项目的默认版本 |
| pnpm / Corepack | 10.28.2 / 0.34.1 | S02 以项目 `packageManager` 使用 pnpm 10.30.3，不全局替换现有 pnpm |
| Python 默认值 | `python3` 指向 Anaconda 3.13.9 | 不作为后端解释器 |
| Python 3.12 | 3.12.13，实际架构 **x86_64** | 虽可执行，但不采用 Rosetta 环境；S03 使用独立的 3.12.15 arm64 环境，不替换现有解释器 |
| uv | 0.10.2 | S03 使用固定 0.13.5；项目工具路径/CI 明确选择，不依赖本机旧命令碰巧可用 |
| Git | 2.50.1；本地 `.git` 已存在，main 尚无提交 | 本步未初始化或提交；S02 复用现有仓库并再次检查状态，不覆盖已有 Git 元数据 |
| 正式工程 | 尚无 package.json、pyproject.toml、workspace 或锁文件 | S02/S03 后续创建；Git 目录存在不代表骨架已创建 |
| Docker / Compose | CLI 29.1.3 / Compose 5.0.1；`docker info` 退出 1，daemon socket 不存在 | 工具已安装，服务不可达；S05 启动后再做真实数据库验证 |
| Xcode / iOS SDK | Xcode 26.2（17C52）；iPhoneOS / Simulator SDK 26.2 | 满足所选 SDK 55 工具要求；尚未编译应用 |
| iOS 模拟器 | iOS 26.2 runtime `isAvailable=true`；iPhone 17 Pro 等可用，均为 Shutdown | 安装状态已核实；启动、构建、联网在 S09/S11 验证 |
| Android SDK | 无 ANDROID_HOME/ANDROID_SDK_ROOT；默认 SDK 目录、Android Studio.app 不存在；PATH 无 adb/sdkmanager/emulator | 在已检查位置未找到；S09 需要补齐 SDK、工具和设备 |
| Java | 默认 Microsoft OpenJDK 21.0.7；已登记 JVM 无 JDK 17 | S09 单独安装/选择 JDK 17，不改其他项目的 Java 默认值 |
| CocoaPods / Watchman | PATH 均未找到 | S09 安排 iOS CocoaPods 及可选 Watchman；记录实际安装版本 |
| Supabase | 未提供或检查云项目连接 | major、Auth/Storage 和云连通性均未验证；无须为 S01 提供凭据 |

只检查明确的环境变量、标准目录和工具输出，没有搜索其他项目的配置或读取凭据。

## 3. 本次验证证据与复查命令

已执行并检查输出：

```sh
node --version
pnpm --version
corepack --version
python3 --version
python3.12 -c 'import sys, platform; print(sys.version.split()[0], platform.machine())'
uv --version
uv python list --only-installed
git status --short
git log -1 --format='%h %s'
docker --version
docker compose version
docker info --format '{{.ServerVersion}}'
xcodebuild -version
xcodebuild -showsdks
xcode-select -p
xcrun simctl list runtimes --json
xcrun simctl list devices available --json
java -version
/usr/libexec/java_home -V
```

其中 `git log` 因尚无提交退出 128；`docker info` 因 daemon 不可达退出 1。两者已作为实际环境状态记录，不计作成功验证。其余上述工具查询正常返回。另通过可执行文件查找和目录存在性检查核实 Android、CocoaPods、Watchman 状态。

在线核验使用 npm 发布元数据、Expo 发布包/模板、Node 发布索引、Python/uv 发布记录及 Docker 官方镜像清单；只读取公开信息。所选 JS 版本、peer/engine 条件和 Expo 清单已交叉核对，最终依赖解析、`expo install --check`、`expo-doctor` 和原生运行属于 S02/S09，不以本步取代。

## 4. 验收与下一步交接

- [x] 明确 Node、pnpm、Python、uv、Expo/RN/React、Web React 和 PostgreSQL 的版本及来源。
- [x] pnpm 10.30.3 发布可用；Expo 配套值与发布包及官方模板一致；Node 满足各引擎要求。
- [x] 分清本机已可用工具、待安装/启动项和待实际运行验证项，记录了 Python 架构差异。
- [x] 明确本地 PostgreSQL major 与云环境待对齐事项；本机调整只在后续对应步骤进行，不覆盖其他项目配置。

S02 可以据此写入 `.nvmrc`、`.python-version`、`packageManager`、workspace 与检查工具配置，并生成首份锁文件。S03 选择 Python/uv 后建立独立后端环境；S05 处理 Docker；S09 补齐原生工具。S02–S11 仍未完成，本次没有运行应用构建、数据库迁移或业务测试。
