/* Run against the local static server. Uses an isolated browser context. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const base=process.env.PROTOTYPE_URL||'http://127.0.0.1:4173';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const p=await context.newPage(),errors=[];p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));
 const go=async(screen='home')=>{await p.goto(base+'/desktop/index.html?screen='+screen);await p.waitForFunction(()=>Boolean(window.desktopDemo));};
 const click=async action=>p.locator(`[data-action="${action}"]`).first().click();
 const state=()=>p.evaluate(()=>desktopDemo.getState());
 await go();
 if(!process.env.DESKTOP_LAYOUT_ONLY){
 const dinner=await p.locator('[data-action="meal-edit:dinner"]').boundingBox();assert(dinner.y+dinner.height<960,'Dinner action must be visible at 1440×960');
 // Calendar: leap year, browsing does not mutate selection, independent journal filter.
 await p.locator('[data-cal-year="diet"]').selectOption('2024');await p.locator('[data-cal-month="diet"]').selectOption('2');
 assert.equal(await p.locator('[data-action="cal-pick:diet:2024-02-29"]').count(),1);assert.equal(await p.locator('[data-action="cal-pick:diet:2024-02-30"]').count(),0);assert.equal((await state()).state.date,'2026-10-20');
 await click('cal-pick:diet:2024-02-29');assert.equal((await state()).state.date,'2024-02-29');
 await click('nav:journals');await click('journal-filter');await p.locator('[data-cal-year="journal-filter"]').selectOption('2026');await p.locator('[data-cal-month="journal-filter"]').selectOption('10');await click('cal-pick:journal-filter:2026-10-19');assert.equal((await state()).state.date,'2024-02-29');assert.equal(await p.locator('.journal-item').count(),1);
 console.log('PASS calendar and independent diary date filter');
 // Meals: no unintended edits, valid/unknown quantities, discard guard, undo.
 await go();const before=(await state()).meals['2026-10-20'];await click('meal-edit:lunch');
 await p.locator('[data-food-index="2"] [data-food="source"]').selectOption('明确数量');await p.locator('[data-food-index="2"] [data-food="amount"]').fill('0');await click('meal-save');assert.match(await p.locator('[data-food-error="2"]').textContent(),/大于 0/);
 await p.locator('[data-food-index="2"] [data-food="amount"]').fill('100');await click('meal-save');let s=await state();assert.equal(s.meals['2026-10-20'].lunch.foods[2].amount,'100');assert.deepEqual(s.meals['2026-10-20'].breakfast,before.breakfast);assert.deepEqual(s.meals['2026-10-20'].lunch.foods.slice(0,2),before.lunch.foods.slice(0,2));await click('undo');assert.deepEqual((await state()).meals['2026-10-20'],before);
 await click('meal-edit:lunch');await p.locator('[data-food-index="0"] [data-food="name"]').fill('修改中的米饭');await click('modal-close');assert.equal(await p.locator('#confirm[open]').count(),1);await click('confirm-cancel');assert.equal(await p.locator('#modal[open]').count(),1);await click('modal-close');await click('confirm-accept');assert.deepEqual((await state()).meals['2026-10-20'],before);
 await click('meal-skip:dinner');await click('confirm-accept');assert.equal((await state()).meals['2026-10-20'].dinner.status,'skipped');await click('undo');assert.equal((await state()).meals['2026-10-20'].dinner.status,'empty');
 console.log('PASS meal validation, preservation, unsaved guard and undo');
 // Journals: actual local persistence, no remount, composition, failure feedback and retry.
 await go('journals');await click('journal-new');await p.locator('#journal-title').fill('验证：从容的一天');await p.locator('#journal-body').fill('写下今天值得记住的小事。');await p.evaluate(()=>window.editorNode=document.querySelector('#journal-body'));await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>window.editorNode===document.querySelector('#journal-body')),true);
 let journals=await p.evaluate(()=>JSON.parse(localStorage.getItem('life-canvas-journals-v1')));assert(journals.some(j=>j.title==='验证：从容的一天'&&j.body.includes('小事')));
 await p.locator('#tag-input').fill('散步');await p.locator('#tag-input').press('Enter');assert.equal(await p.locator('.tag-chip').count(),1);await p.locator('#tag-input').fill('散步');await p.locator('#tag-input').press('Enter');assert.match(await p.locator('#tag-error').textContent(),/已经/);await click('journal-mood:4');await click('journal-focus');assert.equal(await p.locator('.sidebar').isVisible(),false);assert.equal(await p.locator('#journal-body').isVisible(),true);await click('journal-focus');
 await p.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('storage blocked');};});await p.locator('#journal-body').fill('存储失败时也不能丢掉这段文字。');await p.waitForTimeout(800);assert.match(await p.locator('#save-status').textContent(),/未能保存/);await click('nav:home');assert.equal((await state()).state.page,'journals');assert.match(await p.locator('#journal-body').innerText(),/不能丢掉/);await p.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);await click('journal-retry');assert.match(await p.locator('#save-status').textContent(),/已自动保存/);
 const saved=await p.evaluate(()=>localStorage.getItem('life-canvas-journals-v1'));await p.locator('#journal-body').dispatchEvent('compositionstart');await p.locator('#journal-body').fill('中文输入组合未结束。');await p.waitForTimeout(800);assert.equal(await p.evaluate(()=>localStorage.getItem('life-canvas-journals-v1')),saved);await p.locator('#journal-body').dispatchEvent('compositionend');await p.waitForTimeout(800);assert.notEqual(await p.evaluate(()=>localStorage.getItem('life-canvas-journals-v1')),saved);
 await p.reload();assert.match(await p.locator('#journal-body').innerText(),/中文输入组合/);await p.evaluate(()=>localStorage.removeItem('life-canvas-journals-v1'));
 console.log('PASS journal autosave, stable editor, tags, focus, IME and storage failure');
 // AI: no write before approval, undo, cancel, stale proposal, interrupted response.
 await go('confirmation');const aiBefore=(await state()).meals['2026-10-20'];assert.equal(aiBefore.lunch.foods[2].amount,'');await p.locator('[data-action^="proposal-confirm:"]').click();assert.equal((await state()).meals['2026-10-20'].lunch.foods[2].amount,'100');await click('undo');assert.deepEqual((await state()).meals['2026-10-20'],aiBefore);
 await go('confirmation');await p.locator('[data-action^="proposal-cancel:"]').click();assert.equal((await state()).meals['2026-10-20'].lunch.foods[2].amount,'');
 await go('confirmation');await click('nav:home');await click('meal-edit:lunch');await p.locator('#meal-note').fill('新的午餐备注');await click('meal-save');await click('nav:assistant');await p.locator('[data-action^="proposal-confirm:"]').click();assert.match(await p.locator('.chat-messages').textContent(),/发生了变化/);assert.equal((await state()).meals['2026-10-20'].lunch.note,'新的午餐备注');assert.equal((await state()).meals['2026-10-20'].lunch.foods[2].amount,'');
 await go('assistant');await click('chat-prompt:query');await click('chat-new');await p.waitForTimeout(1300);assert.equal(await p.locator('.welcome').count(),1);assert.equal(await p.locator('.message').count(),0);await click('chat-open:history-1');assert.equal(await p.locator('.welcome').count(),0);
 console.log('PASS AI approval, undo, stale record guard and new-conversation cancellation');
 // ZIP: real upload, preflight, no overwrite, duplicate skipping, actual round trip.
 await go('data');await click('data-import');await p.locator('#import-file').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('not a zip')});await p.locator('#import-error').filter({hasText:'没有找到'}).waitFor();assert.match(await p.locator('#import-error').textContent(),/没有找到/);await p.locator('#import-file').setInputFiles(path.join(__dirname,'../assets/life-canvas-example.zip'));await p.locator('[data-action="import-confirm"]').waitFor();const existing=(await state()).meals['2026-10-20'];const stats=await p.locator('.import-stat strong').allTextContents();assert.deepEqual(stats,['01','01','01']);await click('import-confirm');assert((await state()).meals['2026-10-18']);assert.deepEqual((await state()).meals['2026-10-20'],existing);await click('data-import');await p.locator('#import-file').setInputFiles(path.join(__dirname,'../assets/life-canvas-example.zip'));await p.locator('[data-action="import-confirm"]').waitFor();assert.equal(await p.locator('[data-action="import-confirm"]').isDisabled(),true);await click('modal-close');
 const roundTrip=await p.evaluate(async()=>{const data={meals:Desktop.clone(Desktop.meals),journals:Desktop.clone(Desktop.journals)};return JSON.stringify(await Desktop.readZip(Desktop.makeZip(data)))===JSON.stringify(data);});assert(roundTrip);await click('data-export');const downloadPromise=p.waitForEvent('download');await click('confirm-accept');const download=await downloadPromise;assert.match(download.suggestedFilename(),/\.zip$/);assert.equal(await download.failure(),null);
 console.log('PASS ZIP parsing, preflight, duplicates, conflicts and export download');
 await go('profile');await p.locator('#profile-name').fill('新的昵称');await click('profile-save');assert.match(await p.locator('.account-name').textContent(),/新的昵称/);await p.keyboard.press('Meta+k');await p.locator('#global-search').fill('西兰花');assert.match(await p.locator('#search-results').textContent(),/西兰花/);await p.keyboard.press('Escape');
 console.log('PASS profile and keyboard search');
 }
 const screens=['home','history','journals','journal-focus','journal-options','journal-markdown','journal-new','assistant','confirmation','meal','profile','appearance','data','import','devices','memories','dark','login'];
 for(const width of [1024,1280,1440,1920]){await p.setViewportSize({width,height:960});for(const screen of screens){await go(screen);const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${width} ${screen} overflow`);const broken=await p.evaluate(()=>[...document.images].some(i=>i.complete&&!i.naturalWidth));assert.equal(broken,false,`${width} ${screen} image`);}}
 console.log('PASS 18 routes at 1024 / 1280 / 1440 / 1920');
 assert.deepEqual(errors,[]);await browser.close();console.log('All desktop checks passed; no uncaught browser errors.');
})().catch(e=>{console.error(e);process.exit(1)});
