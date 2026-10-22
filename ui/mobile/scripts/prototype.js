/* Life Canvas mobile design prototype. All data is local demo data. */
(() => {
'use strict';
const $ = (s, root = document) => root.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {icon, button:btn, iconButton:ibtn, badge:pill}=window.CanvasUI;
const names = ['早餐','午餐','晚餐'];
const mealIcons=['sunrise','sun','moon'];
const emptyMeal=()=>({status:'empty',time:'',accuracy:'未知',foods:[],note:'',photos:[]});
const todayMeals=[
 {status:'recorded',time:'08:20',accuracy:'准确',foods:[{name:'水煮鸡蛋',amount:'2',unit:'个',source:'明确数量',icon:'egg'},{name:'纯牛奶',amount:'250',unit:'ml',source:'明确数量',icon:'cup'}],note:'慢慢吃早餐，也是一件小小的幸福。',photos:[]},
 {status:'recorded',time:'12:30',accuracy:'准确',foods:[{name:'米饭',amount:'150',unit:'g',source:'明确数量',detail:'熟重',icon:'rice'},{name:'香煎鸡胸肉',amount:'100',unit:'g',source:'估计',detail:'熟重',icon:'bowl'},{name:'清炒西兰花',amount:'',unit:'g',source:'未知',icon:'leaf'}],note:'家里做的午餐。',photos:[]},emptyMeal()
];
const clone = obj => JSON.parse(JSON.stringify(obj));
const params = new URLSearchParams(location.search);
let screen = params.get('screen') || 'home';
let theme = params.get('theme') || 'light';
let selectedDate='2026-10-20';
let byDate = {'2026-10-20':clone(todayMeals),'2026-10-19':[clone(todayMeals[0]),clone(todayMeals[1]),{...emptyMeal(),status:'skipped'}]};
let mealIndex=1, draft=null, returnScreen='home', modal=null, foodIndex=-1, foodSource='明确数量', foodUnit='g';
let offline=screen==='offline', conflict=screen==='conflict', reducedMotion=false;
let historyFilter='全部', historyQuery='', historyDate='';
let journalPrivate=true, journalMood=3, currentJournal=0, journalDraft=null;
let journalQuery='', journalDateFilter='', journalTagInput='';
let journals=[{title:'把日子过得慢一点',body:'午后的阳光刚好落在餐桌上。\n\n认真给自己做了一顿午饭，吃完沿着楼下的小路走了一会儿。树叶开始变黄，风里有一点秋天的味道。\n\n原来，照顾好自己，可以从这些小事开始。',date:'2026-10-20',time:'14:32',tags:'日常,小确幸',mood:3,private:true},{title:'周一，也有小小的好事',body:'下班路上买到一束喜欢的花。晚饭没有吃，回家后早早休息。明天记得给自己留一点时间。',date:'2026-10-19',time:'21:08',tags:'生活碎片',mood:2,private:false}];
const journalStorageKey='life-canvas-journals-v1';
let journalStored=false;
journals.forEach((j,i)=>j.id='sample-'+i);
try{const saved=JSON.parse(localStorage.getItem(journalStorageKey));if(Array.isArray(saved)&&saved.every(j=>j&&typeof j.id==='string'&&typeof j.title==='string'&&typeof j.body==='string'&&typeof j.date==='string'&&typeof j.tags==='string'&&Number.isInteger(j.mood)&&j.mood>=0&&j.mood<=4&&typeof j.private==='boolean')){journals=saved;journalStored=true;}}catch{}
if(params.get('new')==='1')currentJournal=-1;else if(params.get('entry'))currentJournal=journals.findIndex(j=>j.id===params.get('entry'));
let journalSaveTimer,journalSelection=null,journalSaveState='empty',journalOptionsOpen=false,journalComposing=false;
let chatMode=screen==='confirmation'?'pending':'welcome', pendingValid=true, chatText='今天午餐的西兰花是 100g，帮我补上。', aiResult='', exportReady=params.get('export')==='ready', deviceRevoked=false;
let authMode='login', memories=['喜欢清淡一点的家常菜','希望每天留一点时间认真吃饭'];
let toastTimer, streamTimer, modalFocus;
let draftDate=selectedDate, draftKind=mealIndex, notesExpanded=false, saving=false, undoAction=null;
let profileName='Petrel', profileTimezone='上海 · UTC+8';
let foodEntryState=null, suspendedFoodModal=null;
let pendingMealVersion=JSON.stringify(byDate['2026-10-20'][1]);
const meals=()=>byDate[selectedDate]||(byDate[selectedDate]=[emptyMeal(),emptyMeal(),emptyMeal()]);
const dateLabel=(date=selectedDate)=>`${Number(date.slice(5,7))} 月 ${Number(date.slice(8,10))} 日`;
const currentMeal=()=>meals()[mealIndex];
const statusBar=()=>`<div class="statusbar"><span>9:41</span><div class="island" aria-hidden="true"></div><div class="status-icons">${icon('signal')}${icon('wifi')}<span class="battery" aria-label="电量充足"></span></div></div>`;
const tabs=active=>`<nav class="tabbar" aria-label="主导航">${[['home','bowl','饮食'],['journals','book','日记'],['assistant','spark','AI'],['profile','user','我的']].map(([id,i,t])=>btn(`nav:${id}`,icon(i)+`<span>${t}</span>`,`tab ${active===id?'active':''}`,active===id?'aria-current="page"':'')).join('')}</nav>`;
const top=(title,back='home',right='')=>`<header class="topbar">${ibtn(`nav:${back}`,'back','返回')}<h2>${title}</h2>${right||'<span></span>'}</header>`;
const head=(title,eyebrow,action='calendar',name='calendar',label='选择日期')=>`<header class="mainhead"><div><h1>${title}</h1></div>${ibtn(action,name,label,'soft')}</header>`;
function mealCard(m,i,history=false,date=selectedDate){
 const target=`meal:${i}:${date}`;
 const status=m.status==='empty'?'未记录':m.status==='skipped'?'明确未吃':'已记录';
 const header=`<div class="meal-heading"><div class="row"><span class="meal-glyph meal-glyph-${i}">${icon(mealIcons[i])}</span><h3>${names[i]}</h3>${m.time?`<span class="meal-time">${m.accuracy==='大约'?'约 ':''}${m.time}</span>`:''}</div>${m.status==='recorded'?btn(target,'编辑','text-button small-action',`aria-label="编辑${names[i]}"`):`<span class="meal-status">${status}</span>`}</div>`;
 if(m.status==='empty')return `<article class="meal-card unrecorded ${i===byDate[date]?.findIndex(meal=>meal.status==='empty')?'next-meal':''}">${header}<div class="empty-meal-actions">${btn(target,icon('plus')+'记录'+names[i],'button')}${btn(`skip-home:${i}:${date}`,'这餐没吃','text-button')}</div></article>`;
 if(m.status==='skipped')return `<article class="meal-card skipped">${header}<div class="between"><span class="sub">这餐没有进食</span>${btn(target,'重新记录','text-button')}</div></article>`;
 return `<article class="meal-card recorded">${header}<div class="meal-items">${m.foods.map((f,j)=>`<div class="meal-item"><span>${esc(f.name)}</span>${f.source==='未知'?btn(`quick-food:${i}:${date}:${j}`,'补用量'+icon('chevron'),'missing-action',`aria-label="补充${esc(f.name)}用量"`):`<span class="amount">${f.source==='估计'?'<span class="approx">约 </span>':''}${esc(f.amount)}<small>${esc(f.unit)}</small></span>`}</div>`).join('')}</div></article>`;
}
function home(){
 const ms=meals(),recorded=ms.filter(m=>m.status==='recorded').length;
 const missing=ms.flatMap(m=>m.foods).filter(f=>f.source==='未知').length;
 const weekStart=new Date(selectedDate+'T12:00:00Z');weekStart.setUTCDate(weekStart.getUTCDate()-(weekStart.getUTCDay()+6)%7);const dates=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setUTCDate(d.getUTCDate()+i);return d.toISOString().slice(0,10);});
 return `<main class="content home-content"><header class="daily-mast"><div class="wordmark">${icon('canvas')}<span>Life Canvas</span></div>${btn('nav:history',icon('clock')+'历史','text-button')}</header><div class="daily-title"><div><span class="section-kicker">${Number(selectedDate.slice(5,7))} 月 · ${['周日','周一','周二','周三','周四','周五','周六'][new Date(selectedDate+'T12:00:00Z').getUTCDay()]}</span><h1>${selectedDate==='2026-10-20'?'今天的三餐':'这一天的三餐'}</h1></div>${btn('calendar',`<span class="date-numeral">${Number(selectedDate.slice(-2))}</span><span class="date-caption">${selectedDate==='2026-10-20'?'今天':'查看日期'} ${icon('down')}</span>`,'date-stamp',`aria-label="选择日期，当前${dateLabel()}"`)}</div>
 <div class="week" aria-label="本周日期">${dates.map((d,i)=>btn(`date:${d}`,`<span>${['一','二','三','四','五','六','日'][i]}</span><b>${Number(d.slice(-2))}</b>`,`day ${selectedDate===d?'selected':''}`,`aria-label="${dateLabel(d)}" aria-pressed="${selectedDate===d}"`)).join('')}</div>
 <div class="day-summary"><span class="record-count"><span class="record-tracks" aria-hidden="true">${ms.map(m=>`<i class="${m.status==='recorded'?'filled':m.status==='skipped'?'skipped':''}"></i>`).join('')}</span><span><b>${recorded}</b> / 3 餐已记录</span></span>${missing?btn('first-missing',`${missing} 项待补用量${icon('chevron')}`,'summary-action'):''}</div>
 <div class="meal-list">${ms.map((m,i)=>mealCard(m,i)).join('')}</div></main>${tabs('home')}`;
}
function foodRows(foods,editable=true){return foods.map((f,i)=>`<${editable?'button':'div'} ${editable?`type="button" data-action="food:${i}" aria-label="编辑${esc(f.name)}"`:''} class="food-row"><span class="food-symbol">${icon(f.icon||'bowl')}</span><div class="food-text"><b>${esc(f.name)}</b>${f.detail?`<p>${esc(f.detail)}</p>`:''}</div><div class="food-amount">${f.source==='未知'?pill('待补充','warm'):`${f.source==='估计'?'<span class="approx">约 </span>':''}<b>${esc(f.amount)}</b> <span class="muted">${esc(f.unit)}</span>`}</div>${editable?`<span class="row-chevron">${icon('chevron')}</span>`:''}</${editable?'button':'div'}>`).join('');}
function mealEditor(){
 if(!draft)draft=clone(currentMeal());
 const missing=draft.foods.filter(f=>f.source==='未知').length;
 return `${top('记录一餐',returnScreen,ibtn('meal-options','dots','餐次更多操作'))}<main class="content editor-content">
 ${offline?`<div class="notice">${icon('offline')}<div><b>离线 · 尚未保存</b><p>输入已留在当前页面，联网后重试。</p></div></div>`:''}
 ${conflict?`<div class="notice">${icon('info')}<div><b>另一台设备更新了这餐</b><p>你的编辑已保留，先核对最新版本。</p></div></div>`:''}
 <div class="editor-context"><span>${dateLabel(draftDate)} · ${draftDate==='2026-10-20'?'今天':'补记'}</span>${btn('meal-details','日期与餐次'+icon('chevron'),'text-button')}</div>
 <div class="meal-editor-title"><div><p class="section-kicker">${['BREAKFAST','LUNCH','DINNER'][draftKind]}</p><h1>${names[draftKind]}记录</h1></div><span class="editor-meal-glyph">${icon(mealIcons[draftKind])}</span></div><div class="section-label"><h2>食物明细</h2><span class="sub">${draft.foods.length} 种食物</span></div>
 <div class="group food-group">${draft.foods.length?foodRows(draft.foods):'<div class="empty-state">添加这餐吃过的食物</div>'}${btn('food:-1',icon('plus')+'添加食物','add-row')}</div>
 ${missing?'<p class="helper">用量不确定时，可以先保留「待补充」。</p>':''}
 <div class="group-title"><span>进餐时间</span></div><div class="group"><div class="fieldrow"><label for="meal-time">实际时间</label><div class="row"><input id="meal-time" type="time" value="${draft.time}" ${draft.accuracy==='未知'?'disabled':''}>${btn('time-accuracy',esc(draft.accuracy)+icon('down'),'text-button')}</div></div></div>
 <details class="optional-fields" ${notesExpanded?'open':''}><summary>备注与照片<span>选填 ${icon('down')}</span></summary><div class="optional-body"><textarea id="meal-note" class="note-field" placeholder="添加备注" aria-label="餐次备注">${esc(draft.note)}</textarea><div class="photo-strip">${(draft.photos||[]).map((photo,i)=>`<div class="photo-item"><img class="photo-preview" src="${esc(photo)}" alt="餐次照片">${ibtn(`remove-photo:${i}`,'close','移除照片')}</div>`).join('')}${btn('pick-photo',icon('image')+'添加照片','photo-add')}</div><input hidden id="photo-input" type="file" accept="image/jpeg,image/png,image/webp"></div></details>
 </main><div class="footer-action save-bar"><div><span>${draft.foods.length} 种食物</span><small>${offline?'尚未保存':missing?`${missing} 项用量待补充`:'确认后保存记录'}</small></div>${conflict?btn('resolve-conflict','核对记录','button'):btn('save-meal',offline?'重试保存':'保存','button',saving?'disabled':'')}</div>`;
}
function history(){
 let entries=[]; Object.keys(byDate).sort().reverse().forEach(date=>{const filtered=byDate[date].map((m,i)=>({m,i})).filter(({m,i})=>m.status!=='empty'&&(historyFilter==='全部'||names[i]===historyFilter)&&(!historyQuery||m.foods.some(f=>f.name.includes(historyQuery)))&&(!historyDate||date===historyDate));if(filtered.length)entries.push(`<div class="history-date">${dateLabel(date)}<span class="muted"> · ${date==='2026-10-20'?'今天':'周一'}</span></div>${filtered.map(({m,i})=>mealCard(m,i,true,date)).join('')}`)});
 return `${top('饮食记录','home',ibtn('calendar','calendar','按日期筛选'))}<main class="content"><div class="search">${icon('search')}<input id="history-search" placeholder="搜索食物名称" aria-label="搜索食物名称" value="${esc(historyQuery)}"></div><div class="chips">${['全部',...names].map(n=>btn(`filter:${n}`,n,`chip ${historyFilter===n?'selected':''}`)).join('')}</div>${historyDate?btn('clear-date',dateLabel(historyDate)+' · 清除日期筛选','text-button'):''}<div id="history-results">${entries.join('')||'<div class="empty-state">没有找到记录<br><small>试试其他日期或食物名称。</small></div>'}</div></main><div class="footer-action">${btn('backfill',icon('plus')+'补记一餐','button secondary')}</div>`;
}
function journalList(){return `<main class="content journal-list-content"><header class="mainhead editorial-head"><div><p class="section-kicker">LIFE / NOTES</p><h1>日记<span class="title-count">${String(journals.length).padStart(2,'0')}</span></h1></div>${btn('new-journal',icon('edit')+'写日记','write-button')}</header><div class="search">${icon('search')}<input id="journal-search" placeholder="搜索你的生活片段" aria-label="搜索日记" value="${esc(journalQuery)}"></div><div class="section-label journal-section"><h2>${journalDateFilter?journalDateFilter.slice(0,4)+' 年 · '+dateLabel(journalDateFilter):'全部日记'}</h2><div class="row">${journalDateFilter?btn('journal-clear-date','清除','text-button'):''}${ibtn('journal-date','calendar','筛选日期')}</div></div><div id="journal-list">${journalCards()}</div></main>${tabs('journals')}`;}
function journalCards(query=journalQuery){return journals.map((j,i)=>({j,i})).filter(({j})=>(j.title+j.body+j.date+j.tags).includes(query)&&(!journalDateFilter||j.date===journalDateFilter)).map(({j,i})=>btn(`journal:${i}`,`<div class="journal-card-header"><span class="journal-date"><b>${j.date.slice(-2)}</b><span>${Number(j.date.slice(5,7))} 月<small>${j.time}</small></span></span>${j.private?`<span class="private-label" role="img" aria-label="不提供给 AI" title="不提供给 AI">${icon('lock')}</span>`:''}</div><div class="journal-entry-content"><h3>${esc(j.title||'无标题')}</h3><p class="excerpt">${esc(j.body.replaceAll(String.fromCharCode(10),' '))}</p></div><div class="journal-card-footer"><span class="journal-mood">${icon(j.mood>2?'sun':'moon')}${['低落','有点累','平静','不错','很开心'][j.mood]}</span><span>${j.tags.split(',').filter(Boolean).map(t=>'#'+esc(t)).join('　')}</span>${icon('chevron')}</div>`,`journal-card ${i===0?'featured':''}`)).join('')||'<div class="empty-state">没有找到日记<br><small>换个关键词或日期试试。</small></div>';}
function cleanJournalHtml(html){
 const template=document.createElement('template');template.innerHTML=html||'';
 const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','H2','H3','UL','OL','LI','BLOCKQUOTE','U','S']);
 const clean=node=>{if(node.nodeType===3)return esc(node.textContent);if(node.nodeType!==1)return '';if(['SCRIPT','STYLE','IFRAME','OBJECT','IMG','SVG'].includes(node.tagName))return '';const children=[...node.childNodes].map(clean).join('');return allowed.has(node.tagName)?node.tagName==='BR'?'<br>':`<${node.tagName.toLowerCase()}>${children}</${node.tagName.toLowerCase()}>`:children;};
 return [...template.content.childNodes].map(clean).join('');
}
function journalHtml(entry){return entry.bodyHtml?cleanJournalHtml(entry.bodyHtml):entry.body?entry.body.split('\n\n').map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join(''):'';}
function journalEditor(){
 if(!journalDraft){journalDraft=clone(journals[currentJournal]||{id:crypto.randomUUID(),title:'',body:'',date:'2026-10-20',time:'14:32',tags:'',mood:3,private:true});journalPrivate=journalDraft.private;journalMood=journalDraft.mood;journalSaveState=currentJournal<0||!journalStored?'empty':'saved';journalSelection=null;journalTagInput='';}
 const weekday=['周日','周一','周二','周三','周四','周五','周六'][new Date(journalDraft.date+'T12:00:00Z').getUTCDay()];
 return `<header class="topbar journal-topbar">${ibtn('nav:journals','back','返回日记列表')}<h2>日记</h2>${btn('journal-settings',icon('sliders')+icon('down'),'icon-button journal-settings-trigger','aria-label="日记设置" aria-haspopup="dialog" aria-expanded="false" aria-controls="journal-options"')}</header><main class="content journal-writing"><div class="journal-meta"><span>${dateLabel(journalDraft.date)} · ${weekday}</span><span id="journal-save-status" role="status" aria-live="polite"></span></div><input class="journal-title-input" id="journal-title" value="${esc(journalDraft.title)}" placeholder="标题" aria-label="日记标题" autocomplete="off"><div class="journal-body" id="journal-body" contenteditable="true" role="textbox" aria-label="日记正文" aria-multiline="true" data-placeholder="写下今天的事…" data-empty="${!journalDraft.body.trim()}" spellcheck="false">${journalHtml(journalDraft)}</div></main><div class="journal-toolbar" role="toolbar" aria-label="文字格式">${[['heading','Aa','小标题'],['bold','<b>B</b>','加粗'],['italic','<i>I</i>','斜体'],['bullet',icon('list'),'无序列表'],['number',icon('ordered'),'有序列表'],['quote',icon('quote'),'引用'],['undo',icon('undo'),'撤销输入']].map(([command,label,name])=>btn('format:'+command,label,'format-button',`aria-label="${name}" title="${name}" ${command==='undo'?'':'aria-pressed="false"'}`)).join('')}</div><div id="journal-popover-root"></div>`;
}
function updateJournalStatus(){
 const label=$('#journal-save-status');if(label){label.dataset.state=journalSaveState;label.textContent=({empty:'自动保存',pending:'保存中…',saved:'已保存到本机',error:'保存失败 · 点击重试'})[journalSaveState];if(journalSaveState==='error'){label.setAttribute('role','button');label.tabIndex=0;label.setAttribute('data-action','journal-retry');}else{label.setAttribute('role','status');label.removeAttribute('tabindex');label.removeAttribute('data-action');}}
 $('#journal-body')?.setAttribute('data-empty',String(!journalDraft?.body?.trim()));
}
function setJournalUrl(){
 const url=new URL(location.href);url.searchParams.set('screen','journal');if(currentJournal>=0){url.searchParams.set('entry',journalDraft.id);url.searchParams.delete('new');}else{url.searchParams.set('new','1');url.searchParams.delete('entry');}window.history.replaceState(null,'',url);
}
function persistJournals(next){try{localStorage.setItem(journalStorageKey,JSON.stringify(next));return true;}catch{journalSaveState='error';updateJournalStatus();return false;}}
function saveJournalNow(){
 clearTimeout(journalSaveTimer);if(!journalDraft)return true;captureJournal();
 if(currentJournal<0&&!journalDraft.title.trim()&&!journalDraft.body.trim()){journalSaveState='empty';updateJournalStatus();return true;}
 const next=clone(journals);if(currentJournal<0)next.unshift(clone(journalDraft));else next[currentJournal]=clone(journalDraft);
 if(!persistJournals(next))return false;journals=next;journalStored=true;if(currentJournal<0)currentJournal=0;
 journalSaveState='saved';if(screen==='journal')setJournalUrl();updateJournalStatus();return true;
}
function scheduleJournalSave(){
 captureJournal();clearTimeout(journalSaveTimer);journalSaveState='pending';updateJournalStatus();
 if(!journalComposing)journalSaveTimer=setTimeout(saveJournalNow,650);
}
function openJournalOptions(){
 captureJournal();journalOptionsOpen=true;
 $('#journal-popover-root').innerHTML=`<div class="journal-options-layer"><button class="journal-options-scrim" data-action="journal-settings-close" aria-label="收起日记设置" tabindex="-1"></button><section class="journal-options" id="journal-options" role="dialog" aria-label="日记设置"><div class="journal-options-title"><h3>日记设置</h3>${ibtn('journal-settings-close','close','收起设置')}</div><p class="journal-option-label">此刻的心情 <span>选填</span></p><div class="moods">${['低落','有点累','平静','不错','很开心'].map((m,i)=>btn(`mood:${i}`,`<span>${['☁','☂','◌','☀','✿'][i]}</span>${m}`,`mood-choice ${i===journalMood?'selected':''}`,`aria-pressed="${i===journalMood}"`)).join('')}</div><label class="journal-option-label" for="journal-tag-input">标签</label><div id="journal-tag-list" class="journal-tag-list" aria-label="已添加的标签">${journalTagChips()}</div><div class="journal-tag-entry"><input id="journal-tag-input" value="${esc(journalTagInput)}" placeholder="输入一个标签" aria-describedby="journal-tag-feedback" autocomplete="off" enterkeyhint="done">${btn('journal-tag-add',icon('plus'),'icon-button',`aria-label="添加标签" ${journalTagInput.trim()?'':'disabled'}`)}</div><p id="journal-tag-feedback" class="journal-tag-feedback" role="status" aria-live="polite"></p><div class="journal-privacy"><div>不提供给 AI<small>AI 使用前需要你单次授权</small></div>${btn('journal-private','',`toggle ${journalPrivate?'on':''}`,`role="switch" aria-checked="${journalPrivate}" aria-label="不提供给 AI"`)}</div><div class="journal-options-actions">${btn('revisions',icon('clock')+'修订历史','text-button')}${btn('delete-journal',icon('trash')+'删除日记','text-button danger-text')}</div></section></div>`;
 $('.journal-settings-trigger').setAttribute('aria-expanded','true');$('.journal-options .icon-button').focus({preventScroll:true});
}
function journalTags(){return journalDraft.tags.split(',').map(tag=>tag.trim()).filter(Boolean);}
function journalTagChips(){return journalTags().map((tag,i)=>`<span class="journal-tag-chip"><span>${esc(tag)}</span>${btn('journal-tag-remove:'+i,icon('close'),'tag-remove',`aria-label="移除标签：${esc(tag)}"`)}</span>`).join('');}
function addJournalTag(){
 const input=$('#journal-tag-input');const tag=input.value.trim();if(!tag)return;
 const tags=journalTags(),feedback=$('#journal-tag-feedback');
 if(/[,，]/.test(tag)){feedback.textContent='每次添加一个标签，无需逗号分隔。';input.setAttribute('aria-invalid','true');input.focus();return;}
 if(tags.some(item=>item.toLocaleLowerCase()===tag.toLocaleLowerCase())){feedback.textContent='这个标签已经添加过了。';input.setAttribute('aria-invalid','true');input.focus();return;}
 journalDraft.tags=[...tags,tag].join(',');journalTagInput='';input.value='';input.removeAttribute('aria-invalid');feedback.textContent='';
 $('#journal-tag-list').innerHTML=journalTagChips();$('[data-action="journal-tag-add"]').disabled=true;input.focus({preventScroll:true});scheduleJournalSave();
}
function removeJournalTag(index){
 const tags=journalTags();tags.splice(index,1);journalDraft.tags=tags.join(',');$('#journal-tag-list').innerHTML=journalTagChips();
 $('#journal-tag-feedback').textContent='';$('#journal-tag-input').focus({preventScroll:true});scheduleJournalSave();
}
function closeJournalOptions(restoreFocus=true){
 captureJournal();journalOptionsOpen=false;const root=$('#journal-popover-root');if(root)root.innerHTML='';$('.journal-settings-trigger')?.setAttribute('aria-expanded','false');if(restoreFocus)$('.journal-settings-trigger')?.focus({preventScroll:true});
}
function rememberJournalSelection(){
 const editor=$('#journal-body'),sel=window.getSelection();if(editor&&sel?.rangeCount&&editor.contains(sel.anchorNode)&&editor.contains(sel.focusNode)){journalSelection=sel.getRangeAt(0).cloneRange();updateJournalToolbar();}
}
function updateJournalToolbar(){
 if(!$('#journal-body'))return;
 const block=document.queryCommandValue('formatBlock').toLowerCase();
 const states={bold:document.queryCommandState('bold'),italic:document.queryCommandState('italic'),bullet:document.queryCommandState('insertUnorderedList'),number:document.queryCommandState('insertOrderedList'),heading:block==='h2',quote:block==='blockquote'};
 for(const [key,on]of Object.entries(states)){$(`[data-action="format:${key}"]`)?.setAttribute('aria-pressed',String(on));}
}
function formatJournal(command){
 const editor=$('#journal-body');if(!editor)return;editor.focus({preventScroll:true});const selection=window.getSelection();
 if(journalSelection&&editor.contains(journalSelection.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(journalSelection);}else{const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);selection.removeAllRanges();selection.addRange(range);}
 if(command==='heading'||command==='quote'){const tag=command==='heading'?'h2':'blockquote';document.execCommand('formatBlock',false,document.queryCommandValue('formatBlock').toLowerCase()===tag?'p':tag);}else{document.execCommand(({bold:'bold',italic:'italic',bullet:'insertUnorderedList',number:'insertOrderedList',undo:'undo'})[command],false,null);}
 rememberJournalSelection();scheduleJournalSave();
}
function aiWelcome(){return `<section class="conversation-welcome" aria-label="新对话"><span class="conversation-welcome-mark" aria-hidden="true">${icon('canvas')}</span><h2>今天，想记点什么？</h2><p>记录与查找，修改前会先确认。</p></section><div class="conversation-starters" aria-label="试着开始对话"><p>试着问一句</p>${btn('ai-query','今天都吃了什么？'+icon('arrow'),'conversation-starter')}${btn('ai-sample','午餐的西兰花是 100g，帮我补上'+icon('arrow'),'conversation-starter')}</div>`;}
function approval(){return `<section class="approval"><div class="approval-head"><div class="between"><h3>补全这一餐</h3>${pill(pendingValid?'待确认':'已结束','warm')}</div><p>10 月 20 日 · 午餐 · 修改 1 项</p></div><div class="approval-body"><div class="approval-food"><span class="food-symbol">${icon('leaf')}</span><div><h3>清炒西兰花</h3><span class="sub">补充实际用量</span></div></div><div class="change-comparison"><div><span>修改前</span><p class="muted">待补充</p></div>${icon('chevron')}<div><span>修改后</span><p class="new-value">100 <small>g</small></p></div></div><p class="retained-note">${icon('check')}保留米饭、鸡胸肉及其他内容</p></div></section><p class="approval-expiry">${icon('clock')}此确认 15 分钟内有效</p>`;}
function aiChat(){return `<p class="chat-date">今天 12:45</p><div class="user-bubble">${esc(chatText)}</div><div class="assistant-label"><span class="assistant-mark">${icon('spark')}</span>Life Canvas</div><p class="assistant-message">${chatMode==='pending'?'只补充这项用量，请确认。':chatMode==='done'?'已更新午餐记录。':chatMode==='rejected'?'已取消，没有修改记录。':chatMode==='streaming'?'正在整理记录…':esc(aiResult)}</p>${chatMode==='pending'?approval():chatMode==='done'?`<div class="success-note">${icon('check')}<div><b>清炒西兰花 · 100 g</b><br>${btn('meal:1:2026-10-20','查看午餐'+icon('chevron'),'text-button')}</div></div>`:chatMode==='streaming'?btn('ai-stop',icon('stop')+'停止','text-button'):''}`;}
function assistant(){return `<header class="topbar">${ibtn('ai-history','book','会话历史')}<h2>生活助手 <span class="ai-tag">AI</span></h2>${ibtn('ai-new','edit','新建会话')}</header><main class="content ${chatMode==='welcome'?'conversation-empty':''}" id="chat-content">${chatMode==='welcome'?aiWelcome():aiChat()}</main>${chatMode==='pending'?`<div class="footer-action approval-actions"><p>确认后才会修改记录</p><div class="double-action">${btn('ai-reject','取消','button outline')}${btn('ai-confirm','确认修改','button',pendingValid?'':'disabled')}</div></div>`:`<div class="composer-wrap"><div class="composer">${ibtn('ai-private','plus','选择本次可用日记')}<input id="chat-input" placeholder="输入食物、用量或问题" aria-label="给 AI 助手发送消息" ${chatMode==='streaming'?'disabled':''}>${btn('ai-send',icon('arrow'),'send',`aria-label="发送消息" ${chatMode==='streaming'?'disabled':''}`)}</div><p class="composer-caption">今日剩余 ${chatMode==='welcome'?'48':'47'} 次</p></div>`}${tabs('assistant')}`;}
const setting=(action,i,title,detail='',tone='')=>btn(action,`<span class="settings-icon ${tone}">${icon(i)}</span><span>${title}</span>${detail?`<small>${detail}</small>`:''}${icon('chevron')}`,'settings-row');
function profile(){return `<main class="content profile-content"><header class="mainhead editorial-head"><div><p class="section-kicker">YOUR OWN SPACE</p><h1>我的</h1></div><span class="mini-brand" aria-hidden="true">${icon('canvas')}</span></header><button class="profile-card" data-action="edit-profile"><span class="profile-card-top"><span class="profile-name"><small>生活的每一笔，都属于你。</small><strong>${esc(profileName)}</strong></span><span class="avatar">${esc(profileName.slice(0,1).toUpperCase())}</span></span><span class="profile-card-bottom"><span>个人资料</span>${icon('chevron')}</span></button><div class="group-title"><span>偏好设置</span><span class="section-index">01</span></div><div class="group">${setting('nav:appearance','sun','外观与动效',theme==='dark'?'深色':theme==='system'?'跟随系统':'浅色')}${setting('timezone','globe','记录时区',profileTimezone.split(' · ')[0])}</div><div class="group-title"><span>数据与 AI</span><span class="section-index">02</span></div><div class="group">${setting('nav:memories','memory','AI 记忆',memories.length+' 条')}${setting('nav:data','folder','数据导出')}</div><div class="group-title"><span>账号</span><span class="section-index">03</span></div><div class="group">${setting('nav:devices','phone','登录设备',deviceRevoked?'1 台':'2 台')}${setting('privacy','shield','隐私与账号')}</div></main>${tabs('profile')}`;}
function devices(){return `${top('登录设备','profile')}<main class="content"><div class="space"></div><p class="sub">移除设备后，需要重新登录才能访问记录。</p><div class="space"></div><div class="device-list"><div class="card"><div class="device"><span class="device-icon">${icon('phone')}</span><div><h3>iPhone 16 Pro</h3><p>上海 · 最近活跃于现在</p>${pill('当前设备')}</div></div></div>${!deviceRevoked?`<div class="card"><div class="device"><span class="device-icon">${icon('laptop')}</span><div><h3>MacBook Pro · Chrome</h3><p>上海 · 最近活跃于 10 分钟前</p>${btn('revoke-device','移除此设备','text-button danger-text')}</div></div></div>`:''}</div><div class="notice" style="background:var(--sage);color:var(--green)">${icon('shield')}定期查看登录设备，及时移除不再使用的会话。</div></main>`;}
function dataPage(){return `${top('数据导出','profile')}<main class="content"><div class="page-intro"><h2>导出你的记录</h2><p>三餐、日记和照片，打包为一份 ZIP。</p></div><div class="group-title"><span>包含的数据</span></div><div class="group export-list">${['三餐与食物明细','日记、修订与照片','个人资料与偏好','AI 记忆与可读对话'].map(t=>`<div class="fieldrow"><span>${t}</span>${icon('check')}</div>`).join('')}</div><p class="helper">不包含密码或登录凭据。</p><div class="group-title"><span>最近导出</span></div><div class="card"><div class="between"><div><h3>生活记录.zip</h3><p class="sub">${exportReady?'今天生成 · 24 小时内可下载':'还没有导出记录'}</p></div>${exportReady?pill('已完成'):pill('未开始','gray')}</div>${exportReady?'<a class="button secondary" style="margin-top:16px;text-decoration:none" href="assets/life-canvas-demo.zip" download>下载记录副本</a>':''}</div><p class="helper">如需导入数据，请在电脑端操作。</p></main><div class="footer-action save-bar"><span class="sub">ZIP 格式</span>${btn('export',exportReady?'重新导出':'开始导出','button')}</div>`;}
function appearance(){return `${top('外观与动效','profile')}<main class="content"><div class="group-title"><span>主题</span></div><div class="theme-grid">${[['light','浅色'],['dark','深色'],['system','跟随系统']].map(([id,n])=>btn(`theme:${id}`,`<div class="mini-phone ${id==='light'?'':id}"><i></i><i></i><i></i></div><span>${n}</span><span class="selection-radio">${theme===id?icon('check'):''}</span>`,`theme-option ${theme===id?'selected':''}`,`aria-pressed="${theme===id}"`)).join('')}</div><div class="group-title"><span>动效</span></div><div class="group"><div class="fieldrow"><div>减少动态效果<small>关闭位移和缩放，保留状态反馈</small></div>${btn('reduce-motion','',`toggle ${reducedMotion?'on':''}`,`role="switch" aria-checked="${reducedMotion}" aria-label="减少动态效果"`)}</div>${setting('motion-demo','refresh','预览动效')}</div><p class="helper">同时遵循系统的「减少动态效果」设置。</p></main>`;}
function memoriesPage(){return `${top('AI 记忆','profile',ibtn('memory-add','plus','添加记忆'))}<main class="content"><div class="space"></div><p class="sub">由你确认的偏好，可随时修改或删除。</p><div class="space"></div>${memories.map((m,i)=>`<div class="card" style="margin-bottom:12px"><div class="row"><span class="settings-icon purple">${icon('memory')}</span><p style="font-size:13px;flex:1;line-height:1.8">${esc(m)}</p>${ibtn(`memory-edit:${i}`,'edit','修改记忆')}</div><p class="tiny-note">由你确认保存 · ${btn(`memory-delete:${i}`,'删除','text-button danger-text')}</p></div>`).join('')||'<div class="empty-state">还没有保存记忆。</div>'}<p class="helper">不会自动从不提供给 AI 的日记中提取记忆。</p></main>`;}
function login(){return `<main class="content login"><div class="login-brand"><div class="logo-mark">${icon('canvas')}</div><span>Life Canvas</span></div><h1>${authMode==='register'?'创建账号':authMode==='reset'?'找回密码':'欢迎回来'}</h1><p class="intro">${authMode==='reset'?'输入注册邮箱，获取重置链接。':'登录后，在手机和电脑上继续记录。'}</p><form id="auth-form"><label class="input-label" for="auth-email">邮箱</label><input id="auth-email" class="form-input" name="email" type="email" autocomplete="email" required placeholder="name@example.com">${authMode!=='reset'?'<label class="input-label" for="auth-password">密码</label><input id="auth-password" class="form-input" name="password" type="password" minlength="8" autocomplete="current-password" required placeholder="至少 8 位">':''}${authMode==='login'?`<div class="login-reset">${btn('auth-reset','忘记密码？','text-button')}</div>`:''}<button class="button" type="submit">${authMode==='register'?'注册':authMode==='reset'?'发送重置邮件':'登录'}</button></form><div class="auth-switch">${btn('auth-mode',authMode==='login'?'还没有账号？注册':'已有账号？登录','text-button')}</div><p class="terms">设计原型 · 使用示例账号，不发送登录信息</p></main>`;}
function render(){
 const actual=screen==='food'||screen==='offline'||screen==='conflict'?'meal':screen==='confirmation'?'assistant':screen;
 const pages={home,meal:mealEditor,history,journals:journalList,journal:journalEditor,assistant,profile,devices,data:dataPage,appearance,memories:memoriesPage,login};
 if(!pages[actual])screen='home';
 const app=$('#app'); const dark=theme==='dark'||theme==='system'&&matchMedia('(prefers-color-scheme:dark)').matches;
 app.className=`app ${dark?'dark-mode':''} ${reducedMotion?'reduced-motion':''} ${actual==='journal'?'journal-mode':''}`;
 app.innerHTML=`${statusBar()}<div class="view">${(pages[actual]||home)()}</div><div class="home-indicator"></div><div id="modal-root"></div><div id="toast-root" role="status" aria-live="polite"></div>`;
 document.title=`Life Canvas · ${({home:'饮食',meal:'餐次记录',history:'历史记录',journals:'日记',journal:'日记编辑',assistant:'生活助手',profile:'我的',devices:'登录设备',data:'我的数据',appearance:'外观',memories:'AI 记忆',login:'欢迎'})[actual]||'原型'}`;
 if(modal)renderModal();
 if(actual==='journal'){updateJournalStatus();updateJournalViewport();}
}
function navigate(next){
 if(screen==='journal'){if(!saveJournalNow())return;journalOptionsOpen=false;const url=new URL(location.href);url.searchParams.set('screen',next);url.searchParams.delete('entry');url.searchParams.delete('new');window.history.replaceState(null,'',url);}
 if(['meal','offline','conflict','food'].includes(screen))captureMeal();
 modal=null;screen=next;offline=next==='offline';conflict=next==='conflict';
 if(!['meal','offline','conflict','food'].includes(next))draft=null;
 if(next==='journal'){journalDraft=null;journalSelection=null;}
 if(next==='confirmation'){chatMode='pending';pendingValid=true;}
 render();
 if(next==='journal')setJournalUrl();
 if(next==='food'){foodIndex=-1;foodSource='明确数量';foodUnit='g';showSheet('food');}
}
function captureMeal(){
 if(!draft)return;
 if($('#meal-note'))draft.note=$('#meal-note').value;
 if($('#meal-time')&&!$('#meal-time').disabled)draft.time=$('#meal-time').value;
 if($('.optional-fields'))notesExpanded=$('.optional-fields').open;
}
function captureJournal(){if(!journalDraft)return;for(const k of ['title'])if($('#journal-'+k))journalDraft[k]=$('#journal-'+k).value;const body=$('#journal-body');if(body){journalDraft.body=body.innerText.replace(/\n+$/,'');journalDraft.bodyHtml=cleanJournalHtml(body.innerHTML);}journalDraft.mood=journalMood;journalDraft.private=journalPrivate;}
function toast(text,undo=null){
 const failure=/^(请|未连接|当前离线|这餐已有|操作未完成|原记录)/.test(text);
 clearTimeout(toastTimer);undoAction=undo;
 $('#toast-root').innerHTML=`<div class="toast"><span class="toast-message">${icon(failure?'info':'check')}${esc(text)}</span>${undo?btn('undo','撤销',''):''}</div>`;
 toastTimer=setTimeout(()=>{const node=$('#toast-root');if(node)node.innerHTML='';undoAction=null;},undo?8000:3000);
}
function showSheet(type,extra={}){modalFocus=document.activeElement;modal={type,...extra};if(type==='calendar'){const date=extra.purpose==='journal'?(journalDateFilter||'2026-10-20'):(historyDate&&screen==='history'?historyDate:selectedDate);modal.year=Number(date.slice(0,4));modal.month=Number(date.slice(5,7));modal.selected=date;}if(type==='food'){const f=extra.cached||draft.foods[foodIndex]||{name:'',amount:'',detail:''};foodEntryState=JSON.stringify({name:f.name,amount:f.amount||'',detail:f.detail||'',source:foodSource,unit:foodUnit});}renderModal();}
function closeSheet(force=false){if(modal?.type==='leave-food'&&!force){modal=suspendedFoodModal;suspendedFoodModal=null;renderModal();return;}if(!force&&modal?.type==='food'){const cached={name:$('#food-name').value,amount:$('#food-amount')?.value||'',detail:$('#food-detail')?.value||''};foodUnit=$('#food-unit')?.value||foodUnit;const current=JSON.stringify({...cached,source:foodSource,unit:foodUnit});if(current!==foodEntryState){suspendedFoodModal={...modal,cached};showSheet('leave-food');return;}}modal=null;$('#modal-root').innerHTML='';$('.view').inert=false;if(modalFocus?.isConnected)modalFocus.focus();}
function dialog(title,body,action,label='确认',danger=false){showSheet('dialog',{title,body,action,label,danger});}
function renderModal(focusSelector){
 const m=modal;let body='';
 if(m.type==='leave-food'){$('#modal-root').innerHTML=`<div class="sheet-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="食物修改尚未保存"><h2>食物修改尚未保存</h2><p>继续编辑，或放弃这次修改。</p>${btn('resume-food','继续编辑','button')}${btn('discard-food','放弃修改','button outline')}</section></div>`;$('.view').inert=true;requestAnimationFrame(()=>$('.dialog button')?.focus({preventScroll:true}));return;}
 if(m.type==='leave'){$('#modal-root').innerHTML=`<div class="sheet-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="有尚未保存的修改"><h2>有尚未保存的修改</h2><p>离开后，这次编辑将丢失。</p>${btn('close-sheet','继续编辑','button')}${btn('discard-draft:'+m.destination,'放弃修改','button outline')}</section></div>`;$('.view').inert=true;requestAnimationFrame(()=>$('.dialog button')?.focus({preventScroll:true}));return;}
 if(m.type==='dialog'){ $('#modal-root').innerHTML=`<div class="sheet-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-label="${esc(m.title)}"><h2>${esc(m.title)}</h2><p>${esc(m.body)}</p>${btn(m.action,esc(m.label),`button ${m.danger?'danger':''}`)}${btn('close-sheet','取消','button outline')}</section></div>`;$('.view').inert=true;return; }
 let title='';
 if(m.type==='food'){
  title=foodIndex<0?'添加一种食物':'编辑食物';const f=m.cached||draft.foods[foodIndex]||{name:'',amount:'',detail:''};
  body=`<label class="sheet-label" for="food-name">吃了什么</label><input class="sheet-input" id="food-name" value="${esc(f.name)}" placeholder="例如：清炒西兰花"><label class="sheet-label">用量来源</label><div class="segmented">${['明确数量','估计','未知'].map(s=>btn(`source:${s}`,s==='未知'?'待补充':s,foodSource===s?'selected':'')).join('')}</div><label class="sheet-label" for="food-amount">${foodSource==='未知'?'暂时不知道用量':'实际食用量'}</label>${foodSource==='未知'?'<div class="notice">用量会显示「待补充」，不会保存为 0。</div>':`<div class="amount-input"><input class="sheet-input" id="food-amount" type="number" min="0.001" step="any" inputmode="decimal" placeholder="0" value="${esc(f.amount)}"><select id="food-unit" aria-label="食物单位">${['g','ml','个','片','杯','碗','份'].map(u=>`<option ${u===foodUnit?'selected':''}>${u}</option>`).join('')}</select></div>`}<details class="optional-fields compact"><summary>更多信息<span>选填 ${icon('down')}</span></summary><div class="optional-body"><label class="sheet-label" for="food-detail">品牌、做法、生熟重</label><input class="sheet-input" id="food-detail" placeholder="例如：清炒，熟重" value="${esc(f.detail||'')}"></div></details><div id="food-error" class="inline-error" role="alert"></div><div class="sheet-save">${foodIndex>=0?btn('delete-food','删除','text-button danger-text'):'<span></span>'}${btn('save-food',foodIndex<0?'添加':'保存','button')}</div>`;
 } else if(m.type==='meal-details'){
  title='日期与餐次';body=`<div class="group"><div class="fieldrow"><label for="meal-date">归属日期</label><input id="meal-date" type="date" value="${draftDate}"></div><div class="fieldrow"><label for="meal-kind">餐次</label><select id="meal-kind">${names.map((n,i)=>`<option value="${i}" ${i===draftKind?'selected':''}>${n}</option>`).join('')}</select></div></div><div class="sheet-save">${btn('save-meal-details','完成','button')}</div>`;
 } else if(m.type==='meal-options'){
  title='这餐的记录';body=`${btn('mark-skipped','明确标记为未吃','button secondary')}${btn('delete-meal','删除整餐记录','button danger')}<p class="helper">删除后回到「未记录」。标记未吃会清除已有食物明细，两者含义不同。</p>`;
 } else if(m.type==='time'){
  title='进餐时间有多确定？';body=`<p class="helper">记录真正吃饭的时间，不以保存时间代替。</p>${['准确','大约','未知'].map(s=>btn(`accuracy:${s}`,`${s}${draft.accuracy===s?' ✓':''}`,'button secondary')).join('')}`;
 } else if(m.type==='calendar'){
  title=m.purpose==='journal'?'寻找某一天的日记':'选择日期';
  const firstDay=(new Date(Date.UTC(m.year,m.month-1,1)).getUTCDay()+6)%7;
  const days=new Date(Date.UTC(m.year,m.month,0)).getUTCDate();
  body=`<div class="calendar-head">${btn('calendar-month:-1',icon('back'),'icon-button','aria-label="上个月" '+(m.year===1900&&m.month===1?'disabled':''))}<div class="calendar-selects"><label><select id="calendar-year" aria-label="选择年份">${Array.from({length:201},(_,i)=>1900+i).map(year=>`<option value="${year}" ${year===m.year?'selected':''}>${year} 年</option>`).join('')}</select>${icon('down')}</label><label><select id="calendar-month" aria-label="选择月份">${Array.from({length:12},(_,i)=>i+1).map(month=>`<option value="${month}" ${month===m.month?'selected':''}>${month} 月</option>`).join('')}</select>${icon('down')}</label></div>${btn('calendar-month:1',icon('chevron'),'icon-button','aria-label="下个月" '+(m.year===2100&&m.month===12?'disabled':''))}</div><div class="calendar-grid" role="group" aria-label="${m.year} 年 ${m.month} 月">${['一','二','三','四','五','六','日'].map(day=>`<span>${day}</span>`).join('')}${'<span aria-hidden="true"></span>'.repeat(firstDay)}${Array.from({length:days},(_,i)=>{const date=`${m.year}-${String(m.month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return btn(`calendar-day:${date}`,i+1,date===m.selected?'selected':'',`aria-label="${m.year} 年 ${m.month} 月 ${i+1} 日" aria-pressed="${date===m.selected}"`);}).join('')}</div><div class="calendar-footer"><span>上海时区</span>${btn('calendar-today','回到今天','text-button')}</div><p class="helper">${m.purpose==='journal'?'选择日期查看当天日记，清除筛选可查看全部。':'可选择历史日期补记，归属日期不会随个人时区改变。'}</p>`;
 } else if(m.type==='revisions'){
  title='修订历史';body=`<div class="revision"><h3>今天 14:32 · 当前版本</h3><p>修改了正文，添加「小确幸」标签。</p></div><div class="revision"><h3>今天 14:20 · 初次记录</h3><p>午后的阳光刚好落在餐桌上。认真给自己做了一顿午饭。</p></div><p class="helper">历史内容只读查看，真实修订记录由服务端保存。</p>`;
 } else if(m.type==='ai-history'){
  title='你的对话';body=`${btn('open-conversation','补充今天午餐的用量 <small>今天 12:45</small>','suggestion')}${btn('ai-new',icon('plus')+'新建对话','button secondary')}${btn('ai-delete-conversation','删除这段对话','text-button danger-text','style="width:100%"')}`;
 } else if(m.type==='ai-private'){
  title='本次对话可用的日记';body=`<p class="helper">你选择的内容只用于当前任务。下一次使用时，需要重新授权。</p>${journals.map((j,i)=>`<label class="settings-row"><input type="checkbox" name="authorized-journal" value="${i}"><span>${esc(j.title)}<small style="display:block;margin-top:5px">${dateLabel(j.date)}${j.private?' · 默认不提供给 AI':''}</small></span></label>`).join('')}${btn('authorize-journal','仅本次允许使用','button')}`;
 } else if(m.type==='conflict'){
  title='记录有了新版本';body=`<p class="helper">电脑端刚刚更新了这餐。你的未保存内容已留在当前页面。</p><div class="card"><h3 style="font-size:14px">最新记录 · 12:46</h3><p class="helper">清炒西兰花：100 g<br>备注：家里做的午餐。</p></div>${btn('keep-draft','保留我的编辑，继续核对','button')}${btn('use-latest','放弃当前编辑，使用最新记录','button outline')}`;
 } else if(m.type==='memory'){
  title=m.index>=0?'编辑记忆':'记住一件小事';body=`<p class="helper">这是你主动确认的偏好，可随时修改或删除。</p><textarea id="memory-input" class="sheet-input" rows="4" placeholder="例如：喜欢清淡的家常菜">${esc(memories[m.index]||'')}</textarea><div class="sheet-save"><span></span>${btn('memory-save','保存','button')}</div>`;
 } else if(m.type==='profile'){
  title='个人资料';body=`<label class="sheet-label">昵称</label><input id="profile-name" class="sheet-input" value="${esc(profileName)}"><label class="sheet-label">生日 · 选填</label><input class="sheet-input" type="date"><label class="sheet-label">MBTI / 价值观 · 选填</label><input class="sheet-input" placeholder="不必给自己下定义"><div class="sheet-save"><span></span>${btn('profile-save','保存','button')}</div>`;
 } else if(m.type==='timezone'){
  title='记录时区';body=`<p class="helper">时区影响之后的默认日期，历史记录的归属日期保持不变。</p><select class="sheet-input" id="timezone"><option>Asia/Shanghai · UTC+8</option><option>Asia/Tokyo · UTC+9</option><option>Europe/London</option></select><div class="sheet-save"><span></span>${btn('timezone-save','保存','button')}</div>`;
 } else if(m.type==='privacy'){
  title='隐私与账号';body=`<div class="success-note">${icon('shield')}三餐、日记和照片属于你的账号。私密日记需要单次授权才可被 AI 使用。</div>${btn('logout','退出当前设备','button outline')}${btn('delete-account','注销账号','button danger')}`;
 } else if(m.type==='motion'){
  title='动效预览';body=`<p class="helper">弹层 240ms · 按压 120ms · 页面淡入 160ms</p><div class="success-note">${icon('check')}操作已完成</div><p class="helper">开启减少动态效果后，直接呈现最终状态。</p><div class="sheet-save"><span></span>${btn('close-sheet','完成','button')}</div>`;
 } else if(m.type==='auth-email'){
  title='去邮箱看看吧';body=`<div class="assistant-mark large" style="margin:20px auto">${icon('mail')}</div><p class="helper">真实产品会向你的邮箱发送${authMode==='reset'?'密码重置链接':'验证链接'}。本次是界面演示，不会发送邮件。</p>${btn('auth-continue','返回登录','button')}`;
 }
 $('#modal-root').innerHTML=`<div class="sheet-backdrop" data-dismiss="true"><section class="sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="handle"></div><div class="sheet-title"><h2>${title}</h2>${ibtn('close-sheet','close','关闭弹层')}</div>${body}</section></div>`;
 $('.view').inert=true;
 requestAnimationFrame(()=>$(focusSelector||'.sheet input:not([type=checkbox]),.sheet button,.dialog button')?.focus({preventScroll:true}));
}
function startAiSample(){pendingMealVersion=JSON.stringify(byDate['2026-10-20'][1]);clearTimeout(streamTimer);chatText='今天午餐的西兰花是 100g，帮我补上。';chatMode='pending';pendingValid=true;screen='assistant';modal=null;render();}
async function commitMeal(){
 if(saving)return;
 captureMeal();if(offline){toast('未连接网络，内容尚未保存');return;}
 const date=draftDate,kind=draftKind;
 if(!date){toast('请选择归属日期');return;}
 if(!draft.foods.length){toast('请先添加食物，或标记为未吃');return;}
 if(draft.accuracy!=='未知'&&!draft.time){toast('请选择进餐时间，或标为未知');return;}
 if((date!==selectedDate||kind!==mealIndex)&&byDate[date]?.[kind]?.status!=='empty'&&byDate[date]?.[kind]){toast('这餐已有记录，请在原记录中追加');return;}
 const previous=clone(byDate);const button=$('[data-action="save-meal"]');saving=true;button.disabled=true;button.innerHTML='<span class="spinner" aria-hidden="true"></span>保存中';
 await new Promise(resolve=>setTimeout(resolve,360));
 if(date!==selectedDate||kind!==mealIndex)byDate[selectedDate][mealIndex]=emptyMeal();
 selectedDate=date;mealIndex=kind;draft.status='recorded';meals()[kind]=clone(draft);draft=null;saving=false;screen='home';render();
 toast(`${names[kind]}已保存`,()=>{byDate=previous;navigate('home');});
}
function hasUnsavedChanges(){
 if(['meal','food','offline','conflict'].includes(screen)&&draft){captureMeal();return JSON.stringify(draft)!==JSON.stringify(currentMeal())||draftDate!==selectedDate||draftKind!==mealIndex;}

 return false;
}
function enterMeal(index,date=selectedDate,back=screen==='history'?'history':'home'){
 returnScreen=back;selectedDate=date;mealIndex=index;draft=clone(currentMeal());draftDate=date;draftKind=index;notesExpanded=false;navigate('meal');
}
async function act(action){
 const [key,...args]=action.split(':');
 if(key==='nav'){if(saving)return;if(hasUnsavedChanges()){showSheet('leave',{destination:args[0]});return;}navigate(args[0]);return;}
 if(key==='discard-draft'){draft=null;journalDraft=null;navigate(args[0]);return;}
 if(key==='undo'){const undo=undoAction;clearTimeout(toastTimer);undoAction=null;if(undo){undo();toast('已撤销');}return;}
 if(key==='close-sheet'){closeSheet();return;}
 if(key==='resume-food'){modal=suspendedFoodModal;suspendedFoodModal=null;renderModal();return;}
 if(key==='discard-food'){suspendedFoodModal=null;closeSheet(true);return;}
 if(key==='date'){selectedDate=args[0];render();return;}
 if(key==='meal'){enterMeal(+args[0],args[1]||selectedDate);return;}
 if(key==='quick-food'){enterMeal(+args[0],args[1]);await act('food:'+args[2]);return;}
 if(key==='first-missing'){const i=meals().findIndex(m=>m.foods.some(f=>f.source==='未知'));if(i>=0){const j=meals()[i].foods.findIndex(f=>f.source==='未知');await act(`quick-food:${i}:${selectedDate}:${j}`);}return;}
 if(key==='skip-home'){mealIndex=+args[0];selectedDate=args[1];draft=clone(currentMeal());showSheet('dialog',{title:`${names[mealIndex]}没有吃？`,body:'将标记为明确未吃，可随时撤销或重新记录。',action:'confirm-skipped',label:'标记未吃',danger:false});return;}
 if(key==='meal-details'){captureMeal();showSheet('meal-details');return;}
 if(key==='save-meal-details'){draftDate=$('#meal-date').value;draftKind=+$('#meal-kind').value;if(!draftDate){toast('请选择日期');return;}modal=null;render();return;}
 if(key==='food'){captureMeal();foodIndex=+args[0];const f=draft.foods[foodIndex];foodSource=f?.source||'明确数量';foodUnit=f?.unit||'g';showSheet('food');return;}
 if(key==='source'){modal.cached={name:$('#food-name').value,amount:$('#food-amount')?.value??modal.cached?.amount??draft.foods[foodIndex]?.amount??'',detail:$('#food-detail').value};foodUnit=$('#food-unit')?.value||foodUnit;foodSource=args[0];renderModal();return;}
 if(key==='save-food'){
  const name=$('#food-name').value.trim(),amount=$('#food-amount')?.value||'';
  if(!name||foodSource!=='未知'&&(!Number.isFinite(Number(amount))||Number(amount)<=0)){ $('#food-error').textContent=!name?'先写下食物的名字吧。':'用量需大于 0；不确定时请选择待补充。';return;}
  const f={name,amount:foodSource==='未知'?'':amount,unit:$('#food-unit')?.value||foodUnit,source:foodSource,detail:$('#food-detail').value,icon:name.includes('奶')?'cup':name.includes('蛋')?'egg':name.includes('菜')||name.includes('花')?'leaf':'bowl'};
  if(foodIndex<0)draft.foods.push(f);else draft.foods[foodIndex]=f;
  modal=null;render();toast(foodIndex<0?'已添加，保存整餐后生效':'用量已更新，保存整餐后生效');return;
 }
 if(key==='delete-food'){const previous=clone(draft.foods);draft.foods.splice(foodIndex,1);modal=null;render();toast('食物已移除',()=>{draft.foods=previous;render();});return;}
 if(key==='save-meal'){await commitMeal();return;}
 if(key==='meal-options'){captureMeal();showSheet('meal-options');return;}
 if(key==='time-accuracy'){captureMeal();showSheet('time');return;}
 if(key==='accuracy'){draft.accuracy=args[0];if(args[0]==='未知')draft.time='';modal=null;render();return;}
 if(key==='mark-skipped'){dialog('这餐没有吃？',`将清除${names[mealIndex]}的 ${draft.foods.length} 条食物明细，并标记为「明确未吃」。`,'confirm-skipped','确认未吃',true);return;}
 if(key==='confirm-skipped'){if(offline){closeSheet();toast('当前离线，未修改记录');return;}const previous=clone(byDate);meals()[mealIndex]={...emptyMeal(),status:'skipped'};draft=null;modal=null;navigate('home');toast('已标记为未吃',()=>{byDate=previous;navigate('home');});return;}
 if(key==='delete-meal'){dialog('删除这餐记录？','这餐和食物明细将一起删除，状态恢复为「未记录」。','confirm-delete-meal','删除记录',true);return;}
 if(key==='confirm-delete-meal'){if(offline){closeSheet();toast('当前离线，未删除记录');return;}const previous=clone(byDate);meals()[mealIndex]=emptyMeal();navigate('home');toast('记录已删除',()=>{byDate=previous;navigate('home');});return;}
 if(key==='remove-photo'){captureMeal();draft.photos.splice(+args[0],1);render();return;}
 if(key==='pick-photo'){$('#photo-input').click();return;}
 if(key==='calendar'||key==='journal-date'){showSheet('calendar',{purpose:key==='journal-date'?'journal':'meal'});return;}
 if(key==='calendar-month'){const date=new Date(Date.UTC(modal.year,modal.month-1+Number(args[0]),1));if(date.getUTCFullYear()<1900||date.getUTCFullYear()>2100)return;modal.year=date.getUTCFullYear();modal.month=date.getUTCMonth()+1;renderModal(`[data-action="${action}"]`);return;}
 if(key==='calendar-today'){modal.year=2026;modal.month=10;renderModal('[data-action="calendar-today"]');return;}
 if(key==='journal-clear-date'){journalDateFilter='';render();return;}
 if(key==='calendar-day'){const date=args[0];if(modal.purpose==='journal'){journalDateFilter=date;modal=null;render();return;}selectedDate=date;if(screen==='history')historyDate=date;modal=null;render();return;}
 if(key==='filter'){historyFilter=args[0];render();return;}
 if(key==='clear-date'){historyDate='';render();return;}
 if(key==='backfill'){enterMeal(0,historyDate||selectedDate,'history');showSheet('meal-details');return;}
 if(key==='new-journal'){currentJournal=-1;journalDraft=null;navigate('journal');return;}
 if(key==='journal'){currentJournal=+args[0];journalDraft=null;navigate('journal');return;}
 if(key==='journal-settings'){if(journalOptionsOpen)closeJournalOptions();else openJournalOptions();return;}
 if(key==='journal-settings-close'){closeJournalOptions();return;}
 if(key==='journal-tag-add'){addJournalTag();return;}
 if(key==='journal-tag-remove'){removeJournalTag(Number(args[0]));return;}
 if(key==='journal-retry'){saveJournalNow();return;}
 if(key==='format'){formatJournal(args[0]);return;}
 if(key==='mood'){captureJournal();journalMood=+args[0];document.querySelectorAll('.journal-options .mood-choice').forEach((button,i)=>{button.classList.toggle('selected',i===journalMood);button.setAttribute('aria-pressed',String(i===journalMood));});scheduleJournalSave();return;}
 if(key==='journal-private'){journalPrivate=!journalPrivate;const toggle=$('.journal-options .toggle');toggle.classList.toggle('on',journalPrivate);toggle.setAttribute('aria-checked',String(journalPrivate));scheduleJournalSave();return;}
 if(key==='revisions'){if(!saveJournalNow())return;closeJournalOptions(false);showSheet('revisions');return;}
 if(key==='delete-journal'){closeJournalOptions(false);clearTimeout(journalSaveTimer);dialog('删除这篇日记？','这篇日记会从记录中移除，删除后可以撤销。','confirm-delete-journal','删除日记',true);return;}
 if(key==='confirm-delete-journal'){clearTimeout(journalSaveTimer);const previous=clone(journals),next=clone(journals);if(currentJournal>=0)next.splice(currentJournal,1);if(!persistJournals(next)){toast('操作未完成，日记仍保留');return;}journals=next;journalDraft=null;navigate('journals');toast('日记已删除',()=>{if(persistJournals(previous)){journals=previous;navigate('journals');}});return;}
 if(key==='ai-sample'||key==='open-conversation'){startAiSample();return;}
 if(key==='ai-send'){
  const input=$('#chat-input');const value=input.value.trim();if(!value)return;
  if(value.includes('西兰花')&&value.includes('100')){startAiSample();return;}
  chatText=value;chatMode='streaming';render();streamTimer=setTimeout(()=>{chatMode='message';aiResult='想记录哪一天、哪一餐呢？请告诉我食物名称和实际用量；不确定的用量也可以标记为待补充。';render();},1200);return;
 }
 if(key==='ai-query'){chatText='今天都吃了些什么？';chatMode='message';aiResult=byDate['2026-10-20'].map((meal,i)=>names[i]+'：'+(meal.status==='empty'?'未记录':meal.status==='skipped'?'明确未吃':meal.foods.map(food=>food.name+(food.source==='未知'?'（用量待补充）':(food.source==='估计'?'约':'')+food.amount+' '+food.unit)).join('、'))+'。').join(' ');render();return;}
 if(key==='ai-confirm'){if(!pendingValid)return;if(pendingMealVersion!==JSON.stringify(byDate['2026-10-20'][1])){pendingValid=false;chatMode='message';aiResult='这餐已有新修改。本次提议未执行，请重新发起确认。';render();return;}const previous=clone(byDate);const ms=byDate['2026-10-20'];const target=ms[1].foods.find(f=>f.name.includes('西兰花'));if(!target){toast('原记录已经变化，请重新发起修改');pendingValid=false;render();return;}target.amount='100';target.source='明确数量';target.unit='g';pendingValid=false;chatMode='done';render();toast('午餐已更新',()=>{byDate=previous;chatMode='message';aiResult='已撤销这次修改。';render();});return;}
 if(key==='ai-reject'||key==='ai-stop'){clearTimeout(streamTimer);pendingValid=false;chatMode='rejected';modal=null;render();return;}
 if(key==='ai-new'){if(chatMode==='pending'){dialog('结束当前待确认任务？','当前提议将取消，不会修改记录。','confirm-ai-new','结束并新建');return;}clearTimeout(streamTimer);pendingValid=false;chatMode='welcome';modal=null;render();return;}
 if(key==='confirm-ai-new'){clearTimeout(streamTimer);pendingValid=false;chatMode='welcome';modal=null;render();return;}
 if(key==='ai-history'||key==='ai-private'){showSheet(key);return;}
 if(key==='authorize-journal'){const count=document.querySelectorAll('input[name="authorized-journal"]:checked').length;if(!count){toast('请选择一篇本次允许使用的日记');return;}closeSheet();toast(`已为本次任务选择 ${count} 篇日记`);return;}
 if(key==='ai-delete-conversation'){dialog('删除这段对话？','对话将从列表中移除，已经保存的三餐记录仍保留。','confirm-delete-conversation','删除对话',true);return;}
 if(key==='confirm-delete-conversation'){chatMode='welcome';pendingValid=false;modal=null;render();toast('对话已删除');return;}
 if(key==='revoke-device'){dialog('移除 MacBook Pro？','该电脑的会话将失效，需要重新登录才能查看你的数据。','confirm-revoke','移除此设备',true);return;}
 if(key==='confirm-revoke'){deviceRevoked=true;modal=null;render();toast('演示设备已移除');return;}
 if(key==='export'){if(saving)return;saving=true;const button=$('[data-action="export"]');button.disabled=true;button.innerHTML='<span class="spinner"></span>生成中';await new Promise(resolve=>setTimeout(resolve,600));saving=false;exportReady=true;render();toast('导出文件已准备好');return;}
 if(key==='theme'){theme=args[0];render();return;}
 if(key==='reduce-motion'){reducedMotion=!reducedMotion;render();return;}
 if(key==='motion-demo'){showSheet('motion');return;}
 if(key==='resolve-conflict'){captureMeal();showSheet('conflict');return;}
 if(key==='keep-draft'){conflict=false;modal=null;render();toast('编辑已保留，请逐项核对后保存');return;}
 if(key==='use-latest'){dialog('放弃当前未保存的编辑？','将使用电脑端的最新记录，当前页面的编辑将被丢弃。','confirm-use-latest','使用最新记录',true);return;}
 if(key==='confirm-use-latest'){draft=clone(todayMeals[1]);draft.foods[2].amount='100';draft.foods[2].source='明确数量';conflict=false;modal=null;render();return;}
 if(key==='memory-add'||key==='memory-edit'){showSheet('memory',{index:key==='memory-add'?-1:+args[0]});return;}
 if(key==='memory-save'){const value=$('#memory-input').value.trim();if(!value){toast('请写下你希望记住的偏好');return;}if(modal.index<0)memories.push(value);else memories[modal.index]=value;modal=null;render();toast('记忆已确认保存');return;}
 if(key==='memory-delete'){dialog('删除这条记忆？','之后的 AI 对话将不再使用这条偏好。',`confirm-memory-delete:${args[0]}`,'删除记忆',true);return;}
 if(key==='confirm-memory-delete'){memories.splice(+args[0],1);modal=null;render();return;}
 if(key==='edit-profile'){showSheet('profile');return;}
 if(key==='timezone'||key==='privacy'){showSheet(key);return;}
 if(key==='profile-save'){const value=$('#profile-name').value.trim();if(!value){toast('请填写昵称');return;}profileName=value;modal=null;render();toast('资料已保存');return;}
 if(key==='timezone-save'){profileTimezone=$('#timezone').selectedOptions[0].textContent;modal=null;render();toast('时区已更新');return;}
 if(key==='logout'){dialog('退出当前设备？','真实产品会清理本设备的账号缓存。','confirm-logout','退出登录');return;}
 if(key==='confirm-logout'){navigate('login');return;}
 if(key==='delete-account'){dialog('注销账号？','真实产品会停止任务并删除账号数据、文件、记忆及 AI 派生内容。此处仅演示确认界面。','demo-delete-account','确认注销',true);return;}
 if(key==='demo-delete-account'){closeSheet();toast('注销确认演示完成，未删除真实账号');return;}
 if(key==='auth-mode'){authMode=authMode==='login'?'register':'login';render();return;}
 if(key==='auth-reset'){authMode='reset';render();return;}
 if(key==='auth-continue'){authMode='login';navigate('login');return;}
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled){act(b.dataset.action).catch(error=>{console.error(error);saving=false;toast('操作未完成，请重试');});return;}if(e.target.matches('.sheet-backdrop[data-dismiss]'))closeSheet();});
document.addEventListener('input',e=>{
 if(e.target.id==='history-search'){historyQuery=e.target.value;const pos=e.target.selectionStart;render();const input=$('#history-search');input.focus();input.setSelectionRange(pos,pos);}
 if(e.target.id==='journal-search'){journalQuery=e.target.value;$('#journal-list').innerHTML=journalCards();}
 if(e.target.id==='journal-tag-input'){journalTagInput=e.target.value;$('[data-action="journal-tag-add"]').disabled=!journalTagInput.trim();e.target.removeAttribute('aria-invalid');$('#journal-tag-feedback').textContent='';}
});
document.addEventListener('input',e=>{if(screen==='journal'&&['journal-title','journal-body'].includes(e.target.id)){if(!e.isComposing)scheduleJournalSave();}});
document.addEventListener('compositionstart',e=>{if(['journal-title','journal-body'].includes(e.target.id)){journalComposing=true;clearTimeout(journalSaveTimer);}});
document.addEventListener('compositionend',e=>{if(['journal-title','journal-body'].includes(e.target.id)){journalComposing=false;scheduleJournalSave();}});
document.addEventListener('selectionchange',rememberJournalSelection);
document.addEventListener('mousedown',e=>{if(e.target.closest('.format-button'))e.preventDefault();});
document.addEventListener('paste',e=>{if(e.target.closest('#journal-body')){e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));scheduleJournalSave();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&screen==='journal')saveJournalNow();});
window.addEventListener('pagehide',()=>{if(screen==='journal')saveJournalNow();});
window.addEventListener('beforeunload',e=>{if(screen==='journal'&&!saveJournalNow()){e.preventDefault();e.returnValue='';}});
function updateJournalViewport(){document.documentElement.style.setProperty('--journal-viewport',`${Math.round(window.visualViewport?.height||innerHeight)}px`);}
window.visualViewport?.addEventListener('resize',updateJournalViewport);
document.addEventListener('change',e=>{
 if(modal?.type==='calendar'&&['calendar-year','calendar-month'].includes(e.target.id)){modal[e.target.id==='calendar-year'?'year':'month']=Number(e.target.value);renderModal('#'+e.target.id);return;}
 if(e.target.id==='photo-input'){const f=e.target.files[0];if(!f)return;if(f.size>10*1024*1024){toast('请选择 10 MB 以内的图片');return;}if(!['image/jpeg','image/png','image/webp'].includes(f.type)){toast('请选择 JPEG、PNG 或 WebP 图片');return;}captureMeal();draft.photos.push(URL.createObjectURL(f));notesExpanded=true;render();toast('照片已加入当前编辑');}
});
document.addEventListener('submit',e=>{if(e.target.id==='auth-form'){e.preventDefault();if(authMode==='login'){navigate('home');toast('已进入本地演示，不会校验账号');}else showSheet('auth-email');}});
document.addEventListener('keydown',e=>{
 if(e.key==='Enter'&&e.target.id==='journal-tag-input'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();addJournalTag();return;}
 if(e.key==='Escape'&&journalOptionsOpen){e.preventDefault();closeJournalOptions();return;}
 if(e.target.id==='journal-save-status'&&['Enter',' '].includes(e.key)){e.preventDefault();saveJournalNow();return;}
 if(e.key==='Tab'&&journalOptionsOpen){const els=[...document.querySelectorAll('.journal-options button:not(:disabled),.journal-options input')];if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}}
 if(e.key==='Escape'&&modal){closeSheet();return;}
 if(e.key==='Enter'&&e.target.id==='chat-input'){e.preventDefault();act('ai-send');}
 if(e.key==='Tab'&&modal){const els=[...document.querySelectorAll('#modal-root button:not(:disabled),#modal-root input:not(:disabled),#modal-root select,#modal-root textarea')];if(!els.length)return;const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
});
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(theme==='system')render();});
if(['meal','food','offline','conflict'].includes(screen))draft=clone(currentMeal());
render();
if(screen==='journal'&&params.get('options')==='open')openJournalOptions();
if(params.get('calendar')==='open')showSheet('calendar',{purpose:screen==='journals'?'journal':'meal'});
if(screen==='food'){foodIndex=2;foodSource='估计';foodUnit='g';showSheet('food',{cached:{name:'清炒西兰花',amount:'100',detail:'清炒，熟重'}});}
window.lifeCanvasDemo={navigate,getState:()=>clone({screen,selectedDate,byDate,chatMode,pendingValid,theme,journals,deviceRevoked}),setOffline:v=>{offline=v;render();}};
})();
