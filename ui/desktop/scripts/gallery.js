window.desktopScreens=[
{id:'home',title:'饮食 · 今天的三餐',en:'DAILY TABLE',description:'三餐记录与日期并排，补用量和记录入口就近可达。',group:'core'},
{id:'journals',title:'日记 · 写下生活',en:'LITTLE MOMENTS',description:'左侧全部日记，中间书写，右侧日历与设置常驻。',group:'core'},
{id:'assistant',title:'AI · 生活助手',en:'A LITTLE HELP',description:'新对话才出现欢迎态，会话与消息各有明确位置。',group:'core'},
{id:'meal',title:'记录 · 餐次编辑',en:'MEAL DETAILS',description:'在右侧抽屉完成食物、用量与来源编辑，右下保存。',group:'core'},
{id:'confirmation',title:'AI · 写入前确认',en:'YOUR DECISION',description:'并排比较修改前后，确认后写入，也可取消或撤销。',group:'core'},
{id:'data',title:'数据 · 带走与带回',en:'KEEP A COPY',description:'电脑端专属导入预检，保留现有记录，避免静默覆盖。',group:'core'},
{id:'history',title:'饮食 · 历史记录',en:'LOOK BACK',description:'按食物或日期搜索、按餐次筛选，直接打开记录。',group:'detail'},
{id:'journal-focus',title:'日记 · 专注书写',en:'JUST WRITE',description:'收起导航与两侧栏，保留自动保存和标题下的格式工具。',group:'detail'},
{id:'journal-markdown',title:'日记 · Markdown 编辑',en:'WRITE IN MARKDOWN',description:'切换 Markdown 源码编辑，支持格式按钮与 .md 文件导入导出。',group:'detail'},
{id:'journal-new',title:'日记 · 空白新篇',en:'A NEW PAGE',description:'从一句话开始，空白页不会生成无内容的记录。',group:'detail'},
{id:'import',title:'数据 · 导入前检查',en:'CHECK FIRST',description:'新增、重复与差异分别计数，最后由用户确认导入。',group:'detail'},
{id:'profile',title:'设置 · 个人资料',en:'YOUR SPACE',description:'必要资料在前，选填信息弱化，保存位置统一。',group:'detail'},
{id:'appearance',title:'外观 · 舒适优先',en:'FEEL AT HOME',description:'浅色、深色、跟随系统与减少动态效果。',group:'detail'},
{id:'devices',title:'账号 · 登录设备',en:'CONNECTED',description:'识别当前设备，其他设备退出前需要确认。',group:'detail'},
{id:'memories',title:'AI · 记住的偏好',en:'ONLY WITH YOU',description:'确认过的记忆可以查看、编辑、删除与撤销。',group:'detail'},
{id:'dark',title:'深色 · 晚间的光',en:'AFTER HOURS',description:'沿用相同语义与排版，降低夜间大面积亮度。',group:'detail'},
{id:'login',title:'欢迎 · 回到自己的空间',en:'WELCOME BACK',description:'品牌与登录分区，输入标签清晰，反馈就近呈现。',group:'detail'}
];
if(document.querySelector('#desktop-grid')){
const grid=document.querySelector('#desktop-grid');let filter='core';
const render=()=>{const items=window.desktopScreens.filter(s=>filter==='all'||s.group===filter);grid.innerHTML=items.map(s=>`<article class="design-item"><header><span>${String(window.desktopScreens.indexOf(s)+1).padStart(2,'0')}</span><h2>${s.title}</h2><small>${s.en}</small></header><a class="screen-link" href="index.html?screen=${s.id}" target="_blank" rel="noopener" aria-label="体验${s.title}"><div class="browser-strip"><i></i><i></i><i></i><span>Life Canvas</span></div><img src="screens/${s.id}.png?v=1.2" width="1440" height="960" alt="${s.title}桌面界面" loading="eager"></a><footer><p>${s.description}</p><a href="index.html?screen=${s.id}" target="_blank" rel="noopener">体验 ↗</a></footer></article>`).join('');document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===filter));};
document.addEventListener('click',e=>{const el=e.target.closest('[data-filter]');if(el){filter=el.dataset.filter;render();}});render();
}
