# Life Canvas · UI 原型与设计交付

手机、PC、品牌方案和组件规范各自保留独立入口；每端的说明与工具放在对应目录，共用变量、组件与资源验证集中到 `shared/`。

## 目录

```text
ui/
├── index.html                    # 转到手机画廊，保留 query / hash
├── prototype.html               # 旧手机原型入口兼容跳转
├── components.html              # 旧组件目录入口兼容跳转
├── mobile/
│   ├── index.html / prototype.html / README.md
│   ├── styles/ / scripts/        # 手机布局、画廊与演示交互
│   ├── docs/ / tools/            # 手机设计说明与导出工具
│   ├── assets/                   # demo: true 的示例 ZIP
│   ├── screens/                  # 21 张页面 PNG 与 manifest.json
│   └── exports/                  # 总览、规范图及历次交互说明图
├── desktop/
│   ├── index.html / gallery.html / README.md
│   ├── styles/ / scripts/        # PC 布局、Markdown 与演示交互
│   ├── docs/ / tools/            # PC 设计清单、导出与交互验证
│   ├── assets/                   # 示例 ZIP 与 Markdown
│   ├── screens/ / exports/       # 页面 PNG / 画廊总览
│   └── vendor/                   # 固定版本依赖、清单与全部许可证
├── brand/
│   ├── index.html / board.html / README.md / concepts.json
│   ├── styles/ / scripts/ / exports/ / tools/
│   └── yirili/ / changye/ / riyu/ # 各方案 SVG 源文件、PNG 与应用图
└── shared/
    ├── tokens.css / components.js / design-tokens.json
    ├── assets/mark.svg / everyday.svg
    ├── components/               # index.html 与 styles/catalog.css
    └── tools/verify-resources.cjs
```

## 查看

在项目根目录启动静态服务，无需安装产品依赖：

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory ui
```

- [手机画廊](mobile/index.html) / [独立手机原型](mobile/prototype.html) / [手机交付说明](mobile/README.md)
- [PC 画廊](desktop/gallery.html) / [PC 原型](desktop/index.html) / [PC 交付说明](desktop/README.md)
- [PC 日记三栏与 Markdown](desktop/index.html?screen=journals&v=1.2)
- [品牌三方案](brand/index.html) / [品牌交付说明](brand/README.md)
- [可交互组件规范](shared/components/index.html) / [设计变量](shared/design-tokens.json)
- [手机设计说明](mobile/docs/DESIGN.md) / [参考与取舍](mobile/docs/REFERENCES.md) / [PC 设计清单](desktop/docs/PLAN.md)

浏览器打开 <http://127.0.0.1:4173/>。旧 `/prototype.html` 和 `/components.html` 保留极小兼容页面，跳转时保留查询参数与 hash；`/desktop/index.html`、`/desktop/gallery.html`、`/brand/index.html` 地址保持可用。

## 导出图与下载

- 手机：[核心页总览](mobile/exports/overview.png)、[全部页面](mobile/exports/all-screens.png)、[组件规范图](mobile/exports/design-system.png)、[日记编辑说明](mobile/exports/journal-editor-overview.png)、[交互调整](mobile/exports/interaction-refinements.png)。单页图见 `mobile/screens/`。
- PC：[核心页总览](desktop/exports/overview.png)、[全部页面](desktop/exports/all-screens.png)。单页图见 `desktop/screens/`。
- 品牌：[方案总览](brand/exports/brand-overview.png)、[完整设计稿](brand/exports/brand-study.png)、[完整素材 ZIP](brand/exports/brand-assets.zip)。三个方案目录保留可编辑 SVG 与 PNG。
- 演示数据：[手机 ZIP](mobile/assets/life-canvas-demo.zip)、[PC ZIP](desktop/assets/life-canvas-example.zip)、[Markdown 日记](desktop/assets/journal-example.md)。

## 导出与验证

脚本需要可解析 Playwright、已安装 Chrome，并使用上面的静态服务；原型运行本身无需 Playwright。默认地址为 `http://127.0.0.1:4173`，可设置 `PROTOTYPE_URL`。

在项目根目录执行；开发机可先设置 `export NODE_PATH=/tmp/life-canvas-ui-tools/node_modules`：

```sh
node ui/shared/tools/verify-resources.cjs
node ui/desktop/tools/verify.cjs
node --test ui/desktop/tools/verify-journal.cjs
node ui/mobile/tools/export.cjs
node ui/desktop/tools/export.cjs
node ui/brand/tools/export.cjs
```

导出脚本更新对应的 `screens/`、清单与 `exports/`，品牌图标及场景图更新至方案目录；历次说明图和品牌 ZIP 保留原交付文件。验证使用独立浏览器上下文，不改动用户正在使用的原型数据。

## 原型边界

这是静态交互与设计原型，示例日期固定为 2026-10-20。手机日记全屏书写，无独立预览或手动保存按钮；PC 日记为左侧独立所有日记列表、中间编辑器、右上日历与右下设置，保留书写 / Markdown 切换与 `.md` 导入导出。

日记自动保存到当前浏览器的本机存储，支持刷新恢复；这不等于正式云同步或账号级保存。其余数据、登录、设备、AI 对话、写入确认与照片处理均为演示，未连接后端或模型。手机 ZIP 标记为 `demo: true`，PC 导入导出仅处理原型示例格式。正式服务端保存、修订、多端冲突、隐私处理与 React Native + Expo 实现以产品需求为准。

正式开发依据见[需求文档](../doc/LIFE_CANVAS_V1_REQUIREMENTS.md)、[交互规范](../doc/INTERACTION_SPEC.md)和[开发计划](../doc/DEVELOPMENT_PLAN.md)。本目录优先按手机端与 PC 端归档，新增页面、截图、说明和工具放回所属端；两端都使用的资源才进入 shared。
