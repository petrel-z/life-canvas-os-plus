/* Optional design export tool. Requires Playwright and Chrome, not used by the prototype. */
const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:4173';
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 let page=await browser.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,reducedMotion:'reduce'});
 await page.goto(base+'/mobile/index.html');
 const screens=await page.evaluate(()=>window.lifeCanvasScreens);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const s of screens){
  const url=base+'/mobile/prototype.html?screen='+(s.screen||s.id)+(s.theme?'&theme='+s.theme:'')+(s.id==='data-ready'?'&export=ready':'')+(s.newEntry?'&new=1':'')+(s.options?'&options=open':'')+(s.calendar?'&calendar=open':'');
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.locator('.view').waitFor();await page.evaluate(()=>document.activeElement.blur());
  await page.screenshot({path:path.join(root,'screens',s.id+'.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)errors.push('Horizontal overflow: '+s.id);
  console.log('Exported',s.id,'786 × 1704');
 }
 await page.close();
 page=await browser.newPage({viewport:{width:1600,height:1800},deviceScaleFactor:2,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/mobile/index.html');await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:path.join(root,'exports','overview.png'),fullPage:true});
 await page.locator('[data-view="all"]').first().click();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 await page.screenshot({path:path.join(root,'exports','all-screens.png'),fullPage:true});
 await page.locator('[data-view="system"]').click();
 await page.screenshot({path:path.join(root,'exports','design-system.png'),fullPage:true});
 fs.writeFileSync(path.join(root,'screens','manifest.json'),JSON.stringify(screens.map(s=>({id:s.id,title:s.title,file:s.id+'.png',width:786,height:1704})),null,2)+'\n');
 await browser.close();
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(`Exported ${screens.length} screens, overview, all-screens and design system. No page errors or document overflow.`);
})().catch(e=>{console.error(e);process.exit(1)});
