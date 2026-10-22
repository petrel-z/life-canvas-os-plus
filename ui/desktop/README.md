# Life Canvas · PC 端交互原型 01.2

沿用手机端已经确定的纸白、墨绿、柔杏色与宋体标题，为桌面重新组织导航、记录、书写和对话。名称继续使用 Life Canvas；`../brand/` 的命名方案尚未被应用。

## 查看

- [设计画廊：6 个核心页面 / 全部 17 个画面](gallery.html)
- [直接体验 PC 原型](index.html)
- [六页设计总览](exports/overview.png) / [完整画面总览](exports/all-screens.png)
- [饮食](index.html?screen=home) / [日记](index.html?screen=journals) / [AI 对话](index.html?screen=assistant)
- [专注书写](index.html?screen=journal-focus) / [AI 确认](index.html?screen=confirmation) / [导入预检](index.html?screen=import)
- [返回手机端画廊](../mobile/index.html)

在项目根目录启动静态服务：

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory ui
```

打开 `http://127.0.0.1:4173/desktop/gallery.html`。不需要安装前端依赖；也可直接打开 HTML。PNG 为 1440 × 960，原型按窗口宽度适配。

## 桌面设计

**导航。** 主导航固定在左侧，饮食、日记、AI、设置各自有明确位置。小于 1050px 时收起为图标栏，保留辅助标签。搜索支持 ⌘K / Ctrl+K，可检索食物、日记标题和页面。

**饮食。** 三餐作为首页主体；年月日历位于右侧，旁边留出当天日记的轻量入口。食物、用量、来源按列对齐。晚餐未记录、明确未吃和已记录是不同状态。餐次在右侧抽屉编辑，保存固定在右下角；未知用量留空，估计值展示「约」。历史记录提供搜索和餐次筛选。

**日记。** 左侧为独立的所有日记列表，中间为编辑器，右侧上方为日历、下方常驻日记设置；标准桌面宽度下正文左侧留白为 32px。格式工具栏紧接标题，包括小标题、加粗、斜体、列表、引用、代码和撤销；底部只保留字数与状态。心情、逐个添加的标签、记录日期、AI 隐私、修订与删除随时可用。专注模式由用户主动开启，会收起两侧导航；没有独立预览页或手动保存按钮。

**Markdown。** 在「书写 / Markdown」两种编辑方式间切换；Markdown 是可编辑源码，不是只读预览。支持标题、加粗、斜体、列表、任务列表、引用、行内代码、代码块、表格、链接与分隔线。书写模式输入 `## `、`- `、`1. `、`> ` 可转换当前块；粘贴常见 Markdown 会转换为格式化内容。源码模式的格式按钮作用于选区，支持 ⌘/Ctrl+B、I、Z。右侧支持导入 `.md` / `.markdown`（最大 1MB）为新日记，以及导出当前标题和 Markdown 正文。导入第一行的一级标题用作日记标题，原有日记不会被覆盖。

**AI。** 左侧是会话列表，中间是消息，输入区固定在底部。轻量欢迎态只出现在空白新对话。修改建议展示前后差异，明确确认后才写入。等待回复时可停止；当前原型新建对话会取消上一次模拟回复。正式产品切换会话不自动取消云端任务，采用[交互规范](../../doc/INTERACTION_SPEC.md)中的任务生命周期。原记录已变化时，旧建议不可应用。

**数据与设置。** 电脑端增加 ZIP 导入前检查。新增、重复和差异项分开计数，仅写入确认的新增记录。个人资料、外观、设备、AI 记忆沿用统一设置布局。

## 页面清单

| 画面 | 图片 | 交互入口 |
| --- | --- | --- |
| 饮食首页 | [home.png](screens/home.png) | [体验](index.html?screen=home) |
| 餐次抽屉 | [meal.png](screens/meal.png) | [体验](index.html?screen=meal) |
| 历史记录 | [history.png](screens/history.png) | [体验](index.html?screen=history) |
| 日记分栏 | [journals.png](screens/journals.png) | [体验](index.html?screen=journals) |
| 专注书写 | [journal-focus.png](screens/journal-focus.png) | [体验](index.html?screen=journal-focus) |
| Markdown 编辑 | [journal-markdown.png](screens/journal-markdown.png) | [体验](index.html?screen=journal-markdown) |
| 新日记 | [journal-new.png](screens/journal-new.png) | [体验](index.html?screen=journal-new) |
| 新对话 | [assistant.png](screens/assistant.png) | [体验](index.html?screen=assistant) |
| AI 修改确认 | [confirmation.png](screens/confirmation.png) | [体验](index.html?screen=confirmation) |
| 导入与导出 | [data.png](screens/data.png) | [体验](index.html?screen=data) |
| 导入预检 | [import.png](screens/import.png) | [体验](index.html?screen=import) |
| 个人资料 | [profile.png](screens/profile.png) | [体验](index.html?screen=profile) |
| 外观设置 | [appearance.png](screens/appearance.png) | [体验](index.html?screen=appearance) |
| 登录设备 | [devices.png](screens/devices.png) | [体验](index.html?screen=devices) |
| AI 记忆 | [memories.png](screens/memories.png) | [体验](index.html?screen=memories) |
| 深色首页 | [dark.png](screens/dark.png) | [体验](index.html?screen=dark) |
| 登录 | [login.png](screens/login.png) | [体验](index.html?screen=login) |

## 建议体验

1. 在午餐点击「补用量」，把西兰花设为明确数量并填入 100g。保存后撤销，检查其余食物未改变。
2. 编辑餐次后关闭抽屉，体验保留编辑、放弃修改及错误提示。
3. 切换日历年份和月份，选择历史日期；切换月份本身不会改动已选日期。
4. 打开日记并输入内容，等待自动保存；进入专注模式，添加标签，再刷新检查文字仍在。
5. 在新对话点击补记示例，检查确认前饮食记录没变；分别体验确认、取消、撤销。
6. 在导入窗口下载 [示例 ZIP](assets/life-canvas-example.zip)，上传后查看 1 条新增、1 条重复、1 条差异的检查结果。确认后只有新增记录进入历史列表。
7. 导出当前记录，将下载的 ZIP 再次导入，查看重复检查；不是固定内容的假下载。

## 原型边界

示例日期为 2026-10-20。日记保存到当前浏览器的 `life-canvas-journals-v1`，与同源的手机原型共用本地数据。输入停止 650ms 后保存；离开页面和隐藏页面时尝试立即保存。中文组合输入期间暂停保存，保存失败时保留编辑并阻止切换页面。新建空白页不会写入记录。修订只保存本次打开期间的正文变化。

饮食、会话、个人资料、主题、设备、记忆和导入历史是当前页面内存中的演示状态，刷新会重置。日记的私密设置是原型状态，浏览器本地存储并不等于加密存储。跨设备、后台持久化、账号登录、模型调用均未连接。AI 为固定演示逻辑，不上传内容、不实际检索私密日记。设备退出仅改变本地展示，不撤销真实账号会话；时区字段不驱动真实日期转换。照片只在本次餐次编辑中预览，不随餐次保存或上传。

导出会生成包含当前原型饮食和日记的真实 ZIP；清单明确标记 `demo: true`。支持同一原型格式的导入、CRC 校验、结构校验、重复跳过和差异保留。ZIP 使用不压缩存储，最多 5MB / 2000 天记录；不兼容手机端旧示例 ZIP，也不代表正式产品的数据协议。不会自动覆盖冲突项。示例 ZIP 中的数据都是演示记录。

登录页仅展示校验和反馈，不提交邮箱、密码；账号创建及找回密码未接入。

## 文件结构

- `index.html`：交互入口。
- `styles/desktop.css`：桌面布局、组件和适配；复用 `../shared/tokens.css` 的色彩、字体、动效变量。
- `scripts/app.js`：导航、搜索、日历、弹层和反馈；复用 `../shared/components.js` 图标。
- `scripts/meals.js` / `scripts/journal.js` / `scripts/assistant.js` / `scripts/settings.js`：页面与对应演示交互。
- `styles/journal.css`：日记桌面布局、常驻侧栏、Markdown 正文样式。
- `scripts/markdown.js` / `vendor/`：Markdown 转换、内容清理、固定版本的本地依赖与许可证。
- `gallery.html` / `styles/gallery.css` / `scripts/gallery.js`：画廊和画面清单。
- `screens/`：17 张 PNG 和清单；`exports/overview.png` / `exports/all-screens.png`：总览。
- `assets/life-canvas-example.zip`：可验证的导入样例。
- `tools/verify.cjs`：隔离浏览器中的核心交互和适配检查。
- `tools/export.cjs`：批量输出 PNG 和画廊总览。

在可解析 Playwright、已安装 Chrome 的 Node 环境运行：

```sh
node ui/desktop/tools/verify.cjs
node --test ui/desktop/tools/verify-journal.cjs
node ui/desktop/tools/export.cjs
```

开发机可使用 `NODE_PATH=/tmp/life-canvas-ui-tools/node_modules`。脚本使用独立浏览器上下文，不修改用户正在打开的原型数据。

## 本轮验证

核心交互已在隔离 Chrome 上验证：餐次校验与撤销、日历闰年和独立筛选、日记自动保存与刷新恢复、中文组合输入、存储失败后的保留与重试、AI 确认 / 取消 / 撤销与旧建议失效、ZIP 实际上传和下载、重复跳过与差异保留。17 个画面分别检查 1024、1280、1440、1920px 宽度，没有页面横向溢出或未捕获脚本错误。图片与总览由实际原型导出。

可用 [Markdown 示例日记](assets/journal-example.md) 体验导入和格式化书写。

## 日记更新说明与参考

本轮调整参考 [Obsidian 的编辑模式](https://obsidian.md/help/edit-and-read)、[属性与侧栏](https://obsidian.md/help/properties) 和 [Typora Markdown Reference](https://support.typora.io/Markdown-Reference/)。采用同一文档的格式化书写与源码编辑两种方式，把管理信息放在侧栏。

Markdown 使用本地固定版本的 Marked、Turndown、Turndown GFM 与 DOMPurify；来源、版本、SHA-256 与许可证见 `vendor/`。运行时无需 CDN。图片以占位信息展示并保留原始 Markdown 引用，不加载远程图片。公式、嵌入媒体和第三方笔记软件的专用语法未实现。原始 HTML 在展示前清理；此静态原型不等于完整的 Typora / Obsidian 编辑器。

保存时同时保留 Markdown 源码、手机端可读正文与经过清理的 HTML。检测到手机端后来修改了正文或格式时，以最新内容重新生成源码，避免旧源码覆盖新文字。现有手机编辑器不支持的格式，在手机编辑后可能会被简化。日期、标签、心情与隐私属于日记元数据，`.md` 导出只包含标题与正文；完整元数据可通过 ZIP 导出。

01.1 更新额外验证了 9 项日记场景：标题下工具栏与右侧常驻栏、Markdown 格式切换与刷新恢复、.md 导入导出、HTML 清理、选区格式和撤销、手机端后续编辑兼容、源码输入法与存储失败恢复、小窗口独立滚动、图片引用保留且不请求远程图片。

## 01.2 日记分栏修正

日记列表恢复为编辑器左侧的独立一栏。中间保留窄边距、标题下格式工具栏、Markdown 与自动保存。右侧上方直接展示与饮食页一致的日历，下方常驻日记设置；两侧栏与正文独立滚动，专注模式收起两侧栏。

日历标记有日记的日期，选择日期打开当天最新一篇，全部日记仍留在左侧。没有日记的日期显示空白引导，可以直接补写当天日记。切换年月只浏览日历，不会修改当前日记或饮食日期；日记归属日期仍在设置中单独修改。

日记验收共 10 项，覆盖三栏位置、日历独立浏览与补记、Markdown、自动保存及小窗口滚动。画廊与导出图片同步更新。
