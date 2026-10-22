/* Design-only export. Uses the same optional Playwright + Chrome setup as the mobile and desktop tools. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173';
const root = path.resolve(__dirname,'..');
const concepts = JSON.parse(fs.readFileSync(path.join(root, 'concepts.json'), 'utf8'));
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  let page = await browser.newPage({viewport:{width:1024,height:1024},reducedMotion:'reduce'});
  for (const c of concepts) {
    for (const name of ['app-icon','app-icon-paper','app-icon-dark','mark','mark-reversed']) {
      await page.setViewportSize({width:1024,height:1024});
      await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:100vw;height:100vh}</style><img src="${base}/brand/${c.id}/${name}.svg" alt="">`);
      await page.locator('img').evaluate(img=>img.decode());
      await page.screenshot({path:path.join(root,c.id,name+'-1024.png'),omitBackground:name.startsWith('mark')});
    }
    console.log('Exported vector renders:',c.name);
  }
  await page.close();
  page = await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,reducedMotion:'reduce'});
  for (const c of concepts) {
    const mark = fs.readFileSync(path.join(root,c.id,'mark.svg'),'utf8');
    for (const screen of ['home','assistant']) {
      await page.goto(base+'/mobile/prototype.html?screen='+screen);
      await page.evaluate(({name,mark})=>{
        const template=document.createElement('template');template.innerHTML=mark;
        const svg=template.content.firstElementChild;
        svg.setAttribute('class','icon');svg.setAttribute('viewBox','32 32 192 192');svg.setAttribute('aria-hidden','true');
        svg.removeAttribute('role');svg.removeAttribute('width');svg.removeAttribute('height');
        const wordmark=document.querySelector('.wordmark');
        if(wordmark){wordmark.querySelector('.icon').replaceWith(svg.cloneNode(true));wordmark.querySelector('span').textContent=name;wordmark.style.fontFamily='"Songti SC",serif';wordmark.style.fontSize='20px';wordmark.style.letterSpacing='2px';}
        const welcome=document.querySelector('.conversation-welcome-mark');
        if(welcome)welcome.replaceChildren(svg.cloneNode(true));
        document.title=name+' · 品牌应用预览';
      },{name:c.name,mark});
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:path.join(root,c.id,'context-'+screen+'.png')});
    }
    console.log('Exported mobile contexts:',c.name);
  }
  await page.close();
  page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.goto(base+'/brand/');await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:path.join(root,'exports/brand-study.png'),fullPage:true});
  await page.setViewportSize({width:1600,height:1120});
  await page.goto(base+'/brand/board.html');await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await page.screenshot({path:path.join(root,'exports/brand-overview.png')});
  await browser.close();
  console.log('Exported brand-study.png and brand-overview.png');
})().catch(error=>{console.error(error);process.exit(1)});
