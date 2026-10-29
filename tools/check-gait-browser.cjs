const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1300,height:900}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:3012/tools/expanded-animation-review.html');
 for(const role of ['noble','jianke','armored','unarmored']){
  await page.locator('#role').selectOption(role);
  for(const action of ['walk','run','walkBack','charge','uCharge']){
   console.log('Checking',role,action);
   await page.locator('#action').selectOption(action);
   await page.waitForFunction(()=>{const role=document.getElementById('role').value,id=['armored','unarmored'].includes(role)?'shouwang':role,key=document.getElementById('action').value;return active.length===2&&active[1].a===CONFIG.characters[id].anims[key]&&active.every(a=>a.images.every(im=>im.complete&&im.naturalWidth));});
   const result=await page.evaluate(()=>({key:document.getElementById('action').value,fps:active[1].a.fps,n:active[1].n}));
   assert.equal(result.key,action);assert.equal(result.fps,action==='run'?32:['charge','uCharge'].includes(action)?12:24);
  }
 }
 await page.locator('#role').selectOption('jianke');await page.locator('#action').selectOption('run');await page.waitForFunction(()=>active[1].a.path.includes('jianke/run-v3')&&active[1].images.every(i=>i.complete&&i.naturalWidth));
 await page.locator('#toggle').click();await page.locator('#all').click();await page.screenshot({path:path.resolve(__dirname,'../assets/chars/gait-v2/run-v3-preview.png'),fullPage:true});
 await page.goto('http://127.0.0.1:3012/index.html?practice=noble');await page.waitForFunction(()=>window.game?.phase==='fight');
 await page.waitForFunction(()=>Object.entries(SPRITES).filter(([k])=>/_(walk|run|walkBack)_/.test(k)).every(([,im])=>im.complete&&im.naturalWidth>0));
 await page.keyboard.down('KeyD');await page.waitForTimeout(180);await page.keyboard.up('KeyD');
 await page.waitForTimeout(350);await page.keyboard.press('KeyD',{delay:40});await page.waitForTimeout(40);await page.keyboard.down('KeyD');await page.waitForFunction(()=>game.p1.animKey==='run',{},{timeout:3000});
 assert.equal(await page.evaluate(()=>game.p1.def.anims.run.fps),32);await page.keyboard.up('KeyD');
 const state=await page.evaluate(()=>({phase:game.phase,fps:game.p1.def.anims.walk.fps,chargeCap:CONFIG.resources.maxChargeSeconds}));assert.equal(state.fps,24);assert.equal(state.chargeCap,7);
 // Exercise the actual keyboard -> game loop path, including a held key past the cap.
 await page.keyboard.down('KeyP');await page.waitForFunction(()=>game.p1.chargeHeldFrames>=100&&game.p1.state==='charge');
 assert.equal(await page.evaluate(()=>game.p1.animFrame),11);
 await page.waitForFunction(()=>game.p1.chargeInterrupted,{},{timeout:15000});
 assert.deepEqual(await page.evaluate(()=>[game.p1.state,game.p1.chargeHeldFrames]),['idle',420]);
 await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>game.p1.state),'idle');await page.keyboard.up('KeyP');
 await page.keyboard.down('KeyU');await page.waitForFunction(()=>game.p1.rangedChargeFrames>=100&&game.p1.state==='rangedCharge');
 assert.equal(await page.evaluate(()=>game.p1.animFrame),11);
 await page.waitForFunction(()=>game.p1.rangedInterrupted,{},{timeout:15000});
 assert.equal(await page.evaluate(()=>game.p1.rangedChargeFrames),420);
 await page.waitForTimeout(1200);assert.notEqual(await page.evaluate(()=>game.p1.state),'rangedCharge');await page.keyboard.up('KeyU');
 console.log('PASS live keyboard: P and U hold final pose, stop/release at exactly 420 ticks, and stay locked until keyup');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS browser: all role gait/charge assets, preview and live practice; no JavaScript or HTTP errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
