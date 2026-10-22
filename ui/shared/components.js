/* Shared UI primitives; used by every screen and components.html. */
(() => {
const paths = {
 sliders:'M4 7h5m4 0h7M4 17h9m4 0h3M9 4v6m4 4v6M9 7h4m0 10h4',
 list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
 ordered:'M10 6h11M10 12h11M10 18h11M3 3h1v6M2 13c0-3 4-3 4 0 0 2-4 3-4 6h4',
 quote:'M4 7h6v6H5c0 3 1 4 4 4M14 7h6v6h-5c0 3 1 4 4 4',
 undo:'M9 5 3 11l6 6M3 11h11a6 6 0 0 1 6 6',

 canvas:'M9 3H5a2 2 0 0 0-2 2v4m12-6h4a2 2 0 0 1 2 2v4M3 15v4a2 2 0 0 0 2 2h4m6 0h4a2 2 0 0 0 2-2v-4M8 16C7 10 10 7 16 8c1 6-2 9-8 8Zm0 0 5-5',
 leaf:'M19 4C10 3 4 8 5 15c5 4 13 1 14-11ZM5 20l9-10',
 bowl:'M3 11h18c0 6-4 9-9 9s-9-3-9-9ZM7 7l1-3m4 3 1-3m4 3 1-3M8 22h8',
 book:'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4V4Zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3V4Z',
 spark:'m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7L12 3Zm7-1v4m-2-2h4',
 user:'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
 plus:'M12 5v14M5 12h14', chevron:'m9 6 6 6-6 6', back:'m15 5-7 7 7 7',
 down:'m6 9 6 6 6-6', close:'m6 6 12 12M6 18 18 6', check:'m5 12 4 4L19 6',
 sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
 sunrise:'M6 15a6 6 0 0 1 12 0M3 15h18M5 19h14M12 3v3M4 8l2 2m14-2-2 2',
 moon:'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 6v6l4 2',
 calendar:'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2ZM7 3v5m10-5v5M3 11h18m-13 4h1m6 0h1m-8 3h1',
 edit:'m14 5 5 5M4 20l5-1L21 7l-5-5L4 14v6Zm9 0h8',
 search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
 image:'M3 4h18v16H3V4Zm0 12 5-5 5 5 3-3 5 5M16 8h.01',
 shield:'m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Zm-4 9 3 3 5-6',
 lock:'M6 11h12v10H6V11Zm3 0V7a3 3 0 0 1 6 0v4m-3 4v2',
 cloud:'M7 18a5 5 0 1 1-1-10 6 6 0 0 1 12-1 5.5 5.5 0 0 1 0 11M9 16l3 3 5-6',
 arrow:'M12 19V5m-6 6 6-6 6 6', download:'M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6',
 phone:'M7 2h10v20H7V2Zm4 17h2', laptop:'M5 3h14v12H5V3ZM2 18h20v3H2v-3',
 globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
 memory:'M9 4a3 3 0 0 0-5 3 4 4 0 0 0-1 7 4 4 0 0 0 5 6c2 2 4 0 4-2V5c0-3-4-3-4 0m7-1a3 3 0 0 1 5 3 4 4 0 0 1 1 7 4 4 0 0 1-5 6c-2 2-4 0-4-2m-6-7c3-1 4 1 4 3m8-3c-3-1-4 1-4 3',
 wifi:'M2 8c6-6 14-6 20 0M5 12c4-4 10-4 14 0m-10 4c2-2 4-2 6 0m-3 4h.01',
 offline:'m3 3 18 18M2 8c2-2 4-3 6-3m6-1c3 0 6 2 8 4M5 12c2-2 5-3 7-2m-3 6c2-2 4-2 6 0m-3 4h.01',
 signal:'M4 18v-3m5 3v-6m5 6V9m5 9V5', dots:'M5 12h.01M12 12h.01M19 12h.01',
 info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-1v5m0-9h.01',
 refresh:'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
 logout:'M10 3H4v18h6m4-14 5 5-5 5m-6-5h12', trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
 egg:'M19 15c0 5-3 7-7 7s-7-2-7-7S9 2 12 2s7 8 7 13Z',
 rice:'M4 13h16c0 5-4 8-8 8s-8-3-8-8Zm1 0a7 7 0 0 1 14 0M9 8l1 1m4-2 1 1m-3 2 1 1',
 cup:'M5 5h12v12a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V5Zm12 2h2a3 3 0 0 1 0 6h-2M8 2h6',
 heart:'M12 21 3 12C-2 5 7-1 12 6c5-7 14-1 9 6l-9 9Z',
 folder:'M3 6h7l2 3h9v12H3V6Zm0 0V3h7l2 3h9v3',
 stop:'M6 6h12v12H6V6Z', mail:'M3 5h18v14H3V5Zm0 0 9 8 9-8',
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.leaf}"/></svg>`;
const button = (action, content, cls='text-button', extra='') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${content}</button>`;
const iconButton = (action, name, label, cls='') => button(action,icon(name),`icon-button ${cls}`,`aria-label="${label}"`);
const badge = (text, cls='') => `<span class="pill ${cls}">${text}</span>`;
window.CanvasUI = { icon, button, iconButton, badge };
})();

/* Live catalogue: these examples use the same primitives and styles as the app. */
window.renderComponentCatalog = () => {
  const {button,icon,badge}=window.CanvasUI;
  return `<div class="catalog-intro"><p class="catalog-kicker">LIFE CANVAS / UI SYSTEM 03</p><h1>有辨识度，也有一致的秩序。</h1><p>组件直接使用原型的样式与交互基础，避免独立画稿与实际页面脱节。</p></div>
  <div class="catalog-palette">${[['背景','#F7F6F2'],['主文字','#283C33'],['主操作','#284F40'],['待补充','#8E5D21'],['错误','#B3433B']].map(([name,color])=>`<div><span style="background:${color}"></span><b>${name}</b><small>${color}</small></div>`).join('')}</div>
  <div class="catalog-grid">
    <section class="spec-card"><div class="spec-heading"><span>01</span><h2>按钮层级</h2></div><p class="spec-description">每个区域只有一个主要操作，次要操作退后一级。</p><div class="catalog-actions">${button('demo-save','保存','button')}${button('demo-secondary','取消','button outline')}${button('demo-secondary','添加食物','button secondary')}${button('demo-secondary','删除','button danger')}${button('demo-secondary','不可用','button','disabled')}</div><div id="component-feedback" class="catalog-feedback" role="status">点击「保存」体验加载与完成反馈。</div></section>
    <section class="spec-card"><div class="spec-heading"><span>02</span><h2>输入与校验</h2></div><p class="spec-description">标签始终可见，错误就近说明；允许未知用量。</p><label class="sheet-label" for="sample-food">食物名称</label><input id="sample-food" class="sheet-input" value="清炒西兰花"><label class="sheet-label" for="sample-amount">实际用量</label><div class="amount-input"><input id="sample-amount" class="sheet-input" value="0" inputmode="decimal" aria-describedby="sample-error"><select aria-label="单位"><option>g</option><option>碗</option><option>份</option></select></div><p id="sample-error" class="inline-error">用量需要大于 0；不确定时选择「待补充」。</p></section>
    <section class="spec-card"><div class="spec-heading"><span>03</span><h2>状态语义</h2></div><p class="spec-description">状态同时用文字和颜色表达，不依赖颜色猜测。</p><div class="catalog-badges">${badge('已记录')}${badge('用量待补充','warm')}${badge('未记录','gray')}${badge('明确未吃','gray')}</div><div class="notice">${icon('offline')}<div><b>离线 · 尚未保存</b><p>内容留在当前页，联网后重试。</p></div></div><div class="success-note">${icon('check')}午餐已保存</div></section>
    <section class="spec-card"><div class="spec-heading"><span>04</span><h2>选择与开关</h2></div><p class="spec-description">选择保持稳定，开关只控制一个明确状态。</p><div class="segmented">${['明确数量','估计','待补充'].map((text,i)=>button('demo-segment:'+i,text,i===0?'selected':'',`aria-pressed="${i===0}"`)).join('')}</div><div class="group catalog-setting"><div class="fieldrow"><div>不提供给 AI<small>本人仍可正常阅读</small></div>${button('demo-toggle','', 'toggle on','role="switch" aria-label="不提供给 AI" aria-checked="true"')}</div></div></section>
    <section class="spec-card"><div class="spec-heading"><span>05</span><h2>弹层与返回</h2></div><p class="spec-description">辅助编辑从底部出现；关闭在右上，保存保持右下。</p>${button('demo-sheet','打开编辑弹层','button secondary')}<div class="spec-rule"><span>最小点击区域</span><b>44 × 44</b></div><div class="spec-rule"><span>主要按钮</span><b>48px 高 · 14px 圆角</b></div><div class="spec-rule"><span>信息卡片</span><b>22px 圆角 · 16px 内边距</b></div></section>
    <section class="spec-card"><div class="spec-heading"><span>06</span><h2>文字与动效</h2></div><p class="spec-description">标题采用宋体与衬线数字，操作与正文使用系统黑体。</p><div class="type-example"><b>饮食</b><h3>今天的三餐</h3><p>米饭 <span>150 g</span></p><small>1 项用量待补充</small></div><div class="spec-rule"><span>标题 / 正文 / 辅助</span><b>32 / 15 / 12px</b></div><div class="spec-rule"><span>按压 / 页面 / 弹层</span><b>120 / 160 / 240ms</b></div><p class="helper">系统或应用开启减少动态效果时，取消过渡。</p></section>
  </div>`;
};
document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action^="demo-"]');if(!el||el.disabled)return;
  const action=el.dataset.action;
  if(action==='demo-save'){el.disabled=true;el.innerHTML='<span class="spinner"></span>保存中';await new Promise(r=>setTimeout(r,600));el.disabled=false;el.textContent='保存';const feedback=document.querySelector('#component-feedback');if(feedback){feedback.textContent='已保存 · 操作完成';feedback.classList.add('complete');}}
  if(action==='demo-toggle'){const on=el.classList.toggle('on');el.setAttribute('aria-checked',String(on));}
  if(action.startsWith('demo-segment:')){el.parentElement.querySelectorAll('button').forEach(b=>{b.classList.toggle('selected',b===el);b.setAttribute('aria-pressed',String(b===el));});}
  if(action==='demo-sheet'){
    const dialog=document.createElement('dialog');dialog.className='catalog-modal';dialog.innerHTML=`<section class="sheet"><div class="handle"></div><div class="sheet-title"><h2>编辑用量</h2><button class="icon-button" data-close-catalog aria-label="关闭">${CanvasUI.icon('close')}</button></div><label class="sheet-label" for="catalog-quantity">实际食用量 · g</label><input id="catalog-quantity" class="sheet-input" value="100"><div class="sheet-save"><span></span><button class="button" data-close-catalog>保存</button></div></section>`;document.body.append(dialog);dialog.showModal();dialog.addEventListener('click',e=>{if(e.target.closest('[data-close-catalog]'))dialog.close();});dialog.addEventListener('close',()=>dialog.remove());
  }
});
