/* Migration smoke checks: actual resources, legacy routes and independent UI entry points. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:4173';
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);
(async()=>{
 let references=0;
 for(const file of files(root).filter(f=>/\.(html|css)$/.test(f))){
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:src|href)=["']([^"']+)["']|url\(\s*["']?([^\s)'";]+)["']?\s*\)/g)){
   const value=match[1]||match[2];
   if(/^(?:[a-z]+:|#|\/\/)/i.test(value))continue;
   const pathname=decodeURIComponent(value.split(/[?#]/)[0]);
   const resolved=pathname.startsWith('/')?path.join(root,pathname):path.resolve(path.dirname(file),pathname);
   assert(fs.existsSync(resolved),`${path.relative(root,file)}: missing ${value}`);references++;
  }
 }
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],checked=new Set();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const resources=async()=>{
   await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
   const urls=await page.evaluate(()=>[...document.querySelectorAll('a[href],link[href],script[src],img[src]')].map(e=>e.href||e.src));
   for(const url of urls){
    if(!url.startsWith(base)||checked.has(url))continue;
    checked.add(url);const response=await context.request.get(url);assert(response.ok(),`${response.status()} ${url}`);
   }
  };
  for(const [old,target]of[['/index.html','/mobile/index.html'],['/prototype.html','/mobile/prototype.html'],['/components.html','/shared/components/index.html']]){
   await page.goto(base+old+'?screen=journals&v=migration#kept');
   await page.waitForURL(url=>url.pathname===target);
   const url=new URL(page.url());assert.equal(url.search,'?screen=journals&v=migration');assert.equal(url.hash,'#kept');await resources();
  }
  console.log('PASS 3 legacy entries preserve query and hash');
  await page.goto(base+'/mobile/index.html');await resources();
  const screens=await page.evaluate(()=>window.lifeCanvasScreens);
  await page.locator('[data-open="home"]').first().click();
  await page.frameLocator('#preview-frame').locator('.view').waitFor();
  assert.match(await page.locator('#preview-frame').getAttribute('src'),/^prototype\.html/);
  await page.locator('[data-close]').click();
  await page.setViewportSize({width:393,height:852});
  for(const s of screens){
   await page.goto(base+'/mobile/prototype.html?screen='+(s.screen||s.id)+(s.theme?'&theme='+s.theme:'')+(s.id==='data-ready'?'&export=ready':'')+(s.newEntry?'&new=1':'')+(s.options?'&options=open':'')+(s.calendar?'&calendar=open':''));
   await page.locator('.view').waitFor();await resources();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`mobile overflow ${s.id}`);
  }
  console.log(`PASS mobile gallery iframe and ${screens.length} mobile states`);
  await page.setViewportSize({width:1440,height:960});
  await page.goto(base+'/desktop/gallery.html');await page.locator('[data-filter="all"]').click();await resources();
  await page.goto(base+'/desktop/index.html?screen=journals&v=1.2');await page.waitForFunction(()=>Boolean(window.desktopDemo));await resources();
  await page.goto(base+'/shared/components/index.html');assert(await page.locator('#catalog button').count()>0);await resources();
  await page.goto(base+'/brand/index.html');
  for(const concept of ['yirili','changye','riyu']){
   await page.locator(`[data-concept="${concept}"]`).click();
   for(const variant of ['default','paper','dark']){
    await page.locator(`[data-variant="${variant}"]`).click();await resources();
   }
   for(const screen of ['home','assistant']){await page.locator(`[data-screen="${screen}"]`).click();await resources();}
  }
  await page.goto(base+'/brand/board.html');await resources();
  assert.deepEqual(errors,[]);
  console.log(`PASS desktop entries, component catalog and 3 brand concepts; ${references} static references / ${checked.size} HTTP resources; no missing resources or browser errors`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
