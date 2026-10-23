# Life Canvas 开发文档

更新：2026-10-22。本目录为正式开发依据；手机与 PC 原型位于 `ui/`，原型能力与正式实现状态分别记录。开始开发先阅读根目录的 [AGENT.md 开发规范](../AGENT.md)。

| 文档 | 用途与优先级 |
| --- | --- |
| [V1 需求 V1.2](LIFE_CANVAS_V1_REQUIREMENTS.md) | 产品范围、技术方向、最新交互与验收标准；功能范围以此为准 |
| [交互与数据行为](INTERACTION_SPEC.md) | 两端页面规则、实现默认、自动保存、Markdown、修订、图片、多端冲突、撤销与 AI 权限 |
| [核心数据与接口契约](CORE_DATA_API.md) | RESTful、code/msg/data/traceId、状态码与追踪；首条流程的实体、认证、幂等、版本与后续模块边界 |
| [开发计划](DEVELOPMENT_PLAN.md) | 全部 V1 阶段与第一阶段 T1–T7 文件级任务、接口和验证方式 |
| [T1 工程骨架步骤](ENGINEERING_BOOTSTRAP_PLAN.md) | S01–S11 小步骤：文件、依赖、接口与验收；S01–S03 完成，S04–S11 待执行 |
| [T1 工具链与环境记录](validation/T1-environment.md) | S01 固定版本、官方兼容依据、本机检查结果与后续待安装/验证项 |
| [T1 workspace 验证](validation/T1-workspace.md) | S02 配置与锁文件、项目本地工具、冻结安装、lint 范围和严格检查结果 |
| [T1 后端入口验证](validation/T1-backend.md) | S03 Python/uv、配置脱敏、应用工厂、25 项测试及实际启动验证 |
| [准备清单](PRE_DEVELOPMENT_CHECKLIST.md) | 哪些设计已具备，哪些正式工程、环境和验证尚未完成 |
| [2026-10-20 历史方案](2026-10-20-life-canvas-next-design.md) | 架构调研与技术取舍参考；旧交互及旧待确认项不能覆盖当前需求 |

阅读顺序：需求 → 交互规范 → 核心契约 → 开发计划。用户最新明确修订优先；修改任一决定时同步关联文档，不能让原型和开发依据长期分叉。

## 设计资料

- [UI 目录说明](../ui/README.md)
- [手机原型](../ui/mobile/index.html) / [手机设计说明](../ui/mobile/docs/DESIGN.md)
- [PC 画廊](../ui/desktop/gallery.html) / [PC 原型说明](../ui/desktop/README.md)
- [共用组件](../ui/shared/components/index.html) / [设计变量](../ui/shared/design-tokens.json)
- [品牌名称与图标提案](../ui/brand/index.html)

当前已有统一需求、交互原型、开发计划、根 workspace 与后端配置入口。真实账号、业务接口、数据库、云同步、图片存储、模型任务及发布验收按计划实施；第一条交付路径是“手机记录一餐，电脑查看并修改”。

历史方案中的旧项目源码链接仅用于追溯调研，不是新项目依赖；新工程不继承 Electron/IPC/SQLite 等旧项目约束。
