(() => {
const screens=[
 {id:'home',title:'饮食 · 今天',en:'EVERYDAY',desc:'三餐与用量首屏可见，直接记录或补全。',core:true},
 {id:'meal',title:'记录 · 一餐',en:'MEAL DETAILS',desc:'先编辑食物，更多信息按需展开，右下保存。',core:true},
 {id:'confirmation',title:'AI · 写入确认',en:'YOUR DECISION',desc:'修改前后并排展示，确认操作固定在底部。',core:true},
 {id:'journals',title:'日记 · 生活片段',en:'LITTLE MOMENTS',desc:'标题、正文与心情分层，搜索和新建就近可见。',core:true},
 {id:'assistant',title:'AI · 生活助手',en:'A LITTLE HELP',desc:'新对话用轻量欢迎态，发送后收起，专注消息与输入。',core:true},
 {id:'profile',title:'我的 · 个人空间',en:'YOUR OWN SPACE',desc:'按偏好、数据和账号分组，统一列表交互。',core:true},
 {id:'login',title:'欢迎 · 从一餐开始',en:'WELCOME',desc:'邮箱登录、注册与找回密码的统一入口。'},
 {id:'food',title:'食物 · 底部弹层',en:'ONE MORE THING',desc:'明确用量来源，单手完成一次轻量编辑。'},
 {id:'calendar',screen:'home',calendar:true,title:'日期 · 年月选择',en:'FIND A DAY',desc:'左右翻月，也可以直接选择年份和月份；点日期后应用。'},
 {id:'history',title:'饮食 · 历史记录',en:'LOOK BACK',desc:'按食物、餐次和日期寻找记录，也能补记。'},
 {id:'journal',title:'日记 · 写下今天',en:'MAKE A NOTE',desc:'全屏写作、自动保存；设置收进右上角，格式工具留在底部。'},
 {id:'journal-new',screen:'journal',newEntry:true,title:'日记 · 全屏书写',en:'JUST WRITE',desc:'去掉预览与保存按钮，留出完整写作空间。'},
 {id:'journal-options',screen:'journal',options:true,title:'日记 · 设置下拉',en:'KEEP IT CLOSE',desc:'标签逐个添加与移除，心情和隐私收进右上角。'},
 {id:'devices',title:'账号 · 登录设备',en:'CONNECTED',desc:'查看设备会话，主动撤销不再使用的设备。'},
 {id:'data',title:'数据 · 随身带走',en:'KEEP A COPY',desc:'手机发起导出，查看结果并下载记录副本。'},
 {id:'appearance',title:'外观 · 舒适优先',en:'FEEL AT HOME',desc:'浅色、深色、跟随系统，以及减少动态效果。'},
 {id:'memories',title:'AI · 记住的偏好',en:'ONLY WITH YOU',desc:'只保存用户确认的记忆，随时查看和修改。'},
 {id:'offline',title:'状态 · 暂时离线',en:'STAY HONEST',desc:'明确告知尚未保存，保留当前页面的编辑。',state:true},
 {id:'conflict',title:'状态 · 编辑冲突',en:'TAKE YOUR TIME',desc:'查看另一台设备的新版本，自主决定保留什么。',state:true},
 {id:'dark',screen:'home',theme:'dark',title:'深色 · 晚间的光',en:'AFTER HOURS',desc:'降低大面积亮度，保留清晰层级与状态色。'},
 {id:'data-ready',screen:'data',title:'导出 · 已准备好',en:'READY TO GO',desc:'清楚呈现完成状态与文件有效期，提供下载。'}
];
window.lifeCanvasScreens=screens;
let view='core',active=0;
const imageRevision=Date.now();
document.querySelector('#design-system').innerHTML=renderComponentCatalog();
const url=s=>`prototype.html?v=3.3&screen=${s.screen||s.id}${s.theme?'&theme='+s.theme:''}${s.id==='data-ready'?'&export=ready':''}${s.newEntry?'&new=1':''}${s.options?'&options=open':''}${s.calendar?'&calendar=open':''}`;
function render(){
 const isSystem=view==='system';document.querySelector('#design-system').hidden=!isSystem;document.querySelector('#screens-grid').hidden=isSystem;
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
 const selection=screens.filter(s=>view==='all'||view==='states'&&s.state||view==='core'&&s.core);
 document.querySelector('#screens-grid').innerHTML=selection.map(s=>`<article class="screen-item"><div class="screen-label"><span class="screen-number">${String(screens.indexOf(s)+1).padStart(2,'0')}</span><h2>${s.title}</h2><small>${s.en}</small></div><button class="device-wrap" data-open="${s.id}" aria-label="体验${s.title}原型"><span class="device-inner"><img src="screens/${s.id}.png?revision=${imageRevision}" width="393" height="852" alt="${s.title}手机界面" loading="eager"></span></button><p class="screen-caption"><span>${s.desc}</span><span>↗</span></p></article>`).join('');
}
function open(id){active=Math.max(0,screens.findIndex(s=>s.id===id));const s=screens[active];document.querySelector('#preview-frame').src=url(s);document.querySelector('#preview-title').textContent=s.title;document.querySelector('#preview-description').textContent=s.desc;document.querySelector('#preview-link').href=url(s);const dialog=document.querySelector('#preview-dialog');if(!dialog.open)dialog.showModal();}
document.addEventListener('click',e=>{const v=e.target.closest('[data-view]'),o=e.target.closest('[data-open]');if(v){view=v.dataset.view;render();}if(o)open(o.dataset.open);if(e.target.closest('[data-close]'))document.querySelector('#preview-dialog').close();if(e.target.closest('[data-prev]'))open(screens[(active-1+screens.length)%screens.length].id);if(e.target.closest('[data-next]'))open(screens[(active+1)%screens.length].id);if(e.target===document.querySelector('#preview-dialog'))e.target.close();});
document.querySelector('#preview-dialog').addEventListener('close',()=>{document.querySelector('#preview-frame').src='about:blank';});
render();
})();
