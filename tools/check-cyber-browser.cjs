'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:3012/index.html?practice=select&v=cyber1');
 await page.locator('#practice-grid-player .char-card').first().waitFor({state:'visible'});
 assert.equal(await page.locator('#practice-grid-player .char-card').count(),6);
 for(const [id,name]of [['motong','墨瞳'],['liequan','猎犬旅者'],['wuxiang','无相司夜']]){
  await page.getByRole('button',{name:'操控：'+name,exact:true}).click();
  await page.locator('#practice-stage-picker').getByRole('button',{name:'中式都市',exact:true}).click();
  await page.getByRole('button',{name:'选择场景：霓雨旧城',exact:true}).click();
  if(id==='motong')await page.screenshot({path:path.resolve(__dirname,'../assets/chars/cyber-v1/selection-preview.png'),fullPage:true});
  await page.locator('#btn-practice-start').click();
  await page.waitForFunction(id=>game.p1?.charId===id&&game.phase==='fight',id);
  await page.waitForFunction(id=>Object.keys(CONFIG.characters[id].anims).every(key=>{const f=game.p1,n=f._animFrameCount(f.def.anims[key]);return Array.from({length:n},(_,i)=>SPRITES[id+'_'+key+'_'+i]?.naturalWidth).every(Boolean);}),id);
  const checks=await page.evaluate(()=>{
   const f=game.p1,stable=new Set();for(let i=0;i<120;i++){f._updateAnim();stable.add(f.animFrame);}return {idleFrames:[...stable],walkFPS:f.def.anims.walk.fps,runFPS:f.def.anims.run.fps,superFrames:f.def.anims.super_.frames};
  });assert.deepEqual(checks,{idleFrames:[0],walkFPS:24,runFPS:32,superFrames:25});
  await page.keyboard.press('KeyJ');await page.waitForFunction(()=>game.p1.state==='attack');
  await page.waitForFunction(()=>game.p1.canAct());
  await page.keyboard.press('KeyU',{delay:100});await page.waitForFunction(()=>game.p1.state==='skill'||game.projectiles.length>0);
  await page.waitForFunction(()=>game.p1.canAct());
  await page.locator('#practice-contract').click();await page.keyboard.press('KeyO');
  await page.waitForFunction(()=>game.cyberObjects?.length===1&&game.cyberObjects[0].age>=18);
  await page.locator('#game-canvas').screenshot({path:path.resolve(__dirname,'../assets/chars/cyber-v1/'+id+'-special-preview.png')});
  await page.waitForFunction(()=>game.p1.canAct());
  await page.locator('#practice-meter').selectOption('100');await page.keyboard.press('KeyI');
  await page.waitForFunction(()=>game.superFreeze?.left>0);
  await page.screenshot({path:path.resolve(__dirname,'../assets/chars/cyber-v1/'+id+'-ultimate-preview.png'),fullPage:true});
  await page.waitForFunction(()=>game.p1.state==='super'&&!(game.superFreeze?.left>0));
  await page.waitForFunction(()=>game.p1.canAct());
  await page.locator('#practice-change-character').click();
  console.log('PASS browser',id,'selection, assets, melee, ranged, special, ultimate cinematic and recovery');
 }
 // Dossier and selection controls work for all six fighters, including mobile width.
 await page.goto('http://127.0.0.1:3012/index.html');await page.getByRole('button',{name:'角色图鉴',exact:true}).click();
 for(const id of ['motong','liequan','wuxiang']){await page.evaluate(id=>game.showCg(id),id);assert((await page.locator('#cg-card').innerText()).includes(await page.evaluate(id=>CONFIG.characters[id].name,id)));}
 for(const [button,mode]of [['#btn-local','local'],['#btn-cpu','cpu']]){
  await page.goto('http://127.0.0.1:3012/index.html');await page.getByRole('button',{name:'双人对决',exact:true}).click();await page.locator(button).click();
  await page.locator('#local-grid-p1').getByText('墨瞳',{exact:true}).click();await page.locator('#local-grid-p2').getByText('无相司夜',{exact:true}).click();
  await page.locator('#btn-local-start').click();assert.deepEqual(await page.evaluate(()=>[game.mode,game.p1.charId,game.p2.charId]),[mode,'motong','wuxiang']);
 }
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:3012/index.html?practice=select');
 await page.getByRole('button',{name:'操控：无相司夜',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#btn-practice-start').click();assert.equal(await page.evaluate(()=>game.p1.charId),'wuxiang');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);console.log('PASS new roster desktop/mobile; no HTTP or JavaScript errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
