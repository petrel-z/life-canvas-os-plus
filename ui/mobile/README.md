# Life Canvas · 手机端 UI 原型 03 · 交互细节更新

第三版在现有可用性基础上建立「生活手帐」视觉：纸白、墨绿、柔杏色，宋体标题与衬线日期，细线餐次记录、纸页式日记、统一品牌图形。参考用户指定的 UI 世界作品，具体来源与取舍见 [REFERENCES.md](docs/REFERENCES.md)。

## 查看

- [PC 端设计画廊：17 个画面](../desktop/gallery.html) / [PC 交互原型](../desktop/index.html) / [PC 交付说明](../desktop/README.md)
- [PC 日记：三栏、日历与 Markdown](../desktop/index.html?screen=journals&v=1.2)

- [设计总览与交互入口](index.html)
- [产品名称与图标方案](../brand/index.html) / [品牌素材包](../brand/exports/brand-assets.zip)
- [独立手机原型](prototype.html)
- [全屏日记](prototype.html?screen=journal&new=1&v=3.3) / [日记设置](prototype.html?screen=journal&options=open&v=3.3)
- [年月选择](prototype.html?screen=home&calendar=open&v=3.3) / [生活助手](prototype.html?screen=assistant&v=3.3)
- [本轮四处调整](exports/interaction-refinements.png)
- [可交互组件规范](../shared/components/index.html)
- [六个核心页面](exports/overview.png) / [全部 21 张画面](exports/all-screens.png)
- [组件规范图](exports/design-system.png)
- [设计交付说明](docs/DESIGN.md) / [设计变量](../shared/design-tokens.json)

直接用浏览器打开 HTML，无需安装项目依赖；也可在项目根目录启动：

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory ui
```

浏览器打开 <http://127.0.0.1:4173/mobile/index.html?v=3.3>。已有预览页请刷新，或打开此新版地址。

## 日记编辑

日记打开后全屏书写，标题与正文聚焦不出现边框。没有预览入口和手动保存按钮。右上角设置下拉包含心情、标签、不提供给 AI、修订与删除；底部提供小标题、加粗、斜体、无序 / 有序列表、引用和撤销。

标签通过输入后按回车或点击「＋」逐个添加，已添加的标签可单独移除；重复标签会就近提示。日记列表的私密状态仅显示锁图标，保留辅助技术说明。

输入停止 650ms 后自动保存到当前浏览器本机存储；返回、切换到后台或刷新前会立即尝试保存。输入过程中不重绘编辑区，中文输入组合结束后再保存。保存失败会保留编辑并显示重试入口，不会显示已保存。新建空白页不会生成空记录。

## 日期与助手

日历支持左右翻月、直接选择年月（1900–2100 年），正确处理跨年和闰年。浏览月份不会改变已选日期，点击具体日期才应用。「回到今天」回到示例日期所在月份；日记日期筛选可单独清除，不改变饮食记录的日期。

生活助手仅在新对话中显示小尺寸品牌图标、「今天，想记点什么？」与一行次要说明，去掉整块提示背景。示例问题靠近输入框，历史对话保留在左上角。发送消息或打开历史对话后，欢迎内容与示例入口收起；新建对话时重新出现。等待回复时新建对话会取消上一次模拟回复，避免旧回复覆盖新会话。

## 建议体验

1. 饮食 → 午餐西兰花右侧「补用量」→ 输入用量 → 保存食物 → 右下保存整餐 → 撤销。
2. 饮食 →「记录晚餐」→ 添加食物；可以选择未知用量，不猜测份量或进餐时间。
3. 编辑食物或备注后尝试返回，分别体验继续编辑和放弃修改。
4. 餐次更多菜单 → 标记未吃 / 删除 → 确认 → 撤销，观察三种状态的区别。
5. AI → 补充午餐示例 → 查看修改前后 → 确认 / 取消。确认后也可撤销。
6. 我的 → 外观与动效 → 深色 / 减少动态效果。
7. 组件规范 → 点击保存、分段选择、开关和弹层，查看共用组件的状态行为。

## 页面图片

逻辑画布 393 × 852；每张 PNG 为 786 × 1704。长页面在原型内可滚动。

| 页面 | 图片 |
| --- | --- |
| 饮食首页 | [home.png](screens/home.png) |
| 餐次编辑 | [meal.png](screens/meal.png) |
| AI 确认 | [confirmation.png](screens/confirmation.png) |
| 日记列表 | [journals.png](screens/journals.png) |
| AI 助手 | [assistant.png](screens/assistant.png) |
| 我的 | [profile.png](screens/profile.png) |
| 登录与注册入口 | [login.png](screens/login.png) |
| 食物编辑弹层 | [food.png](screens/food.png) |
| 日历年月选择 | [calendar.png](screens/calendar.png) |
| 历史记录 | [history.png](screens/history.png) |
| 日记编辑 | [journal.png](screens/journal.png) |
| 全屏新日记 | [journal-new.png](screens/journal-new.png) |
| 日记设置下拉 | [journal-options.png](screens/journal-options.png) |
| 登录设备 | [devices.png](screens/devices.png) |
| 数据导出 | [data.png](screens/data.png) |
| 外观与动效 | [appearance.png](screens/appearance.png) |
| AI 记忆 | [memories.png](screens/memories.png) |
| 离线状态 | [offline.png](screens/offline.png) |
| 编辑冲突 | [conflict.png](screens/conflict.png) |
| 深色首页 | [dark.png](screens/dark.png) |
| 导出完成 | [data-ready.png](screens/data-ready.png) |

## 文件与组件

- `../shared/tokens.css`：页面、主题、颜色、间距和动效的共享变量。
- `../shared/components.js`：图标、按钮、徽标、组件目录及示例交互。
- `styles/prototype.css`：全产品共用的控件、表单、列表、弹层、反馈和导航样式。
- `scripts/prototype.js`：示例页面、日记本机自动保存及交互状态。
- `styles/journal-editor.css`：全屏日记、格式工具栏与设置下拉。
- `../shared/components/index.html`：直接使用上述实现的组件目录。
- `styles/studio.css` / `scripts/studio.js`：设计稿画廊与预览入口。

## 原型边界

这是本地设计原型，示例日期固定为 2026-10-20，日记使用当前浏览器的本地存储，刷新或重开可继续；其他演示数据只在当前页面内存中存在。

三餐、日记、偏好、主题、撤销等可本地交互。AI 为预设对话；不发送登录信息、不调用模型、不连接云端；审批 15 分钟有效期为文案示意，不运行实际计时。日记直接编辑富文本，取消独立预览；修订为固定示例。餐次照片只在本页预览，不执行 HEIC 转换、隐私处理或上传。

导出下载的是标有 `demo: true` 的示例 ZIP，不是正式数据协议。原生实现仍按 V1 需求采用 React Native + Expo。

## 重新导出

在可解析 Playwright、已安装 Chrome 的 Node 环境运行静态服务后执行：

```sh
node ui/mobile/tools/export.cjs
```

可用 `PROTOTYPE_URL` 指定服务地址。Playwright 只用于导图，使用原型不需要它。

日记的本机保存不等同于云同步或账号级存储。浏览器富文本命令用于交互原型验证；正式 Expo 版本需接入编辑器、服务端保存、修订与多端冲突协议。

正式产品的自动保存、跨端 Markdown、修订、图片与云端任务行为以[交互规范](../../doc/INTERACTION_SPEC.md)为准；本页的本机存储和模拟回复描述仅适用于原型。
