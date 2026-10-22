/* Local Markdown conversion. Vendor versions and licenses are in vendor/. */
(() => {
'use strict';
const allowed=['p','div','br','b','strong','i','em','h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','u','s','del','a','code','pre','hr','table','thead','tbody','tr','th','td','input','span'];
const clean=html=>{const safe=DOMPurify.sanitize(html||'',{ALLOWED_TAGS:allowed,ALLOWED_ATTR:['href','title','class','type','checked','disabled','start','align','data-md-image','contenteditable'],ALLOW_DATA_ATTR:false,ALLOW_ARIA_ATTR:false});const t=document.createElement('template');t.innerHTML=safe;t.content.querySelectorAll('input').forEach(el=>{if(el.type!=='checkbox'){el.remove();return;}el.setAttribute('type','checkbox');});t.content.querySelectorAll('[class]').forEach(el=>{if(el.tagName!=='CODE'||!/^language-[\w-]+$/.test(el.className))el.removeAttribute('class');});return t.innerHTML;};
const converter=new TurndownService({headingStyle:'atx',bulletListMarker:'-',codeBlockStyle:'fenced',emDelimiter:'*'});converter.use(turndownPluginGfm.gfm);
converter.addRule('blockDiv',{filter:'div',replacement:content=>'\n\n'+content+'\n\n'});
const escape=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
marked.use({renderer:{image(token){return `<span data-md-image="${escape(token.raw)}" contenteditable="false" title="${escape(token.href)}">图片 · ${escape(token.text||'未命名图片')}</span>`;}}});
converter.addRule('imageReference',{filter:node=>node.nodeName==='SPAN'&&node.hasAttribute('data-md-image'),replacement:(_content,node)=>node.getAttribute('data-md-image')});
const render=md=>clean(marked.parse(String(md||''),{gfm:true,breaks:true,async:false}));
const toMarkdown=html=>converter.turndown(clean(html));
const plain=html=>{const el=document.createElement('div');el.innerHTML=clean(html);el.querySelectorAll('br').forEach(n=>n.replaceWith('\n'));el.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre,tr').forEach(n=>n.append('\n'));return el.textContent.replace(/\n{3,}/g,'\n\n').trimEnd();};
// A phone edit changes body/bodyHtml, so it must supersede a previously saved Markdown source.
const source=entry=>typeof entry.markdown==='string'&&entry.markdownBody===entry.body&&entry.markdownHtml===(entry.bodyHtml||'')?entry.markdown:entry.bodyHtml?toMarkdown(entry.bodyHtml):entry.body||'';
window.JournalMarkdown={clean,render,toMarkdown,plain,source};
})();
