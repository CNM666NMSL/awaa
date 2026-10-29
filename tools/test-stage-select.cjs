'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 const base='http://127.0.0.1:3012';
 await page.goto(base+'/index.html?practice=select');
 const picker=page.locator('#practice-stage-picker');await picker.waitFor({state:'visible'});
 for(const [id,name,style]of [['astral','星辉王城','西方魔法'],['arcane','秘法回廊','西方魔法'],['neoncity','霓雨旧城','中式都市'],['lanterncity','灯河夜市','中式都市']]){
  await picker.getByRole('button',{name:style,exact:true}).click();
  assert.equal(await picker.locator('.scene-option').count(),2);
  await picker.getByRole('button',{name:'选择场景：'+name,exact:true}).click();
  assert.equal(await picker.getByRole('button',{name:'选择场景：'+name}).getAttribute('aria-pressed'),'true');
  await page.locator('#btn-practice-start').click();
  await page.waitForFunction(id=>game.matchOptions.stage===id&&game.phase==='fight',id);
  await page.waitForFunction(id=>game._stageImgs?.[CONFIG.stages[id].img]?.naturalWidth>0,id);
  assert.equal(await page.evaluate(()=>game.p1.onGround),true);
  if(id==='astral'||id==='neoncity')await page.locator('#game-canvas').screenshot({path:path.resolve(__dirname,'../assets/stages/new-scenes/'+id+'-ingame.png')});
  await page.locator('#practice-change-character').click();
  assert.equal(await picker.getByRole('button',{name:'选择场景：'+name}).getAttribute('aria-pressed'),'true');
 }
 // Persistence and desktop selection layout.
 await page.reload();await picker.waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>game.selectedStage),'lanterncity');
 await picker.getByRole('button',{name:'西方魔法',exact:true}).click();
 await picker.getByRole('button',{name:'选择场景：星辉王城'}).click();
 await page.screenshot({path:path.resolve(__dirname,'../assets/stages/new-scenes/stage-selection.png'),fullPage:true});
 // Local and CPU menus must carry the selected stage into startMatch.
 for(const [button,mode,name,id,style]of [['#btn-local','local','秘法回廊','arcane','西方魔法'],['#btn-cpu','cpu','霓雨旧城','neoncity','中式都市']]){
  await page.goto(base+'/index.html');await page.locator('[data-target="duel"]').click();await page.locator(button).click();
  const local=page.locator('#local-stage-picker');await local.getByRole('button',{name:style,exact:true}).click();await local.getByRole('button',{name:'选择场景：'+name}).click();
  await page.locator('#btn-local-start').click();assert.deepEqual(await page.evaluate(()=>[game.mode,game.matchOptions.stage]),[mode,id]);
 }
 // Existing host option messages carry the new scene IDs; guests cannot edit them.
 await page.goto(base+'/index.html');
 await page.evaluate(()=>{game.stageTestMessages=[];game.net={send:d=>game.stageTestMessages.push(d)};game.enterLobby('TEST',true);});
 const lobby=page.locator('#stage-grid');await lobby.getByRole('button',{name:'中式都市',exact:true}).click();await lobby.getByRole('button',{name:'选择场景：灯河夜市'}).click();
 assert.equal(await page.evaluate(()=>game.stageTestMessages.at(-1).stage),'lanterncity');
 await page.evaluate(()=>{game.isHost=false;game.onNetMessage({k:'options',stage:'astral',format:'bo3',boss:false});});
 assert.equal(await lobby.locator('.scene-preview strong').textContent(),'星辉王城');assert.equal(await lobby.locator('.scene-option:enabled').count(),0);
 // Touch-width selection remains horizontally contained and operable.
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/index.html?practice=select');await picker.waitFor({state:'visible'});
 await picker.getByRole('button',{name:'中式都市',exact:true}).click();await picker.getByRole('button',{name:'选择场景：灯河夜市'}).click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:path.resolve(__dirname,'../assets/stages/new-scenes/stage-selection-mobile.png'),fullPage:true});
 await page.locator('#btn-practice-start').click();assert.equal(await page.evaluate(()=>game.matchOptions.stage),'lanterncity');
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('PASS: four rendered stages; filter, selection and persistence; local/CPU/practice start; LAN host options and guest lock; 390px layout; no HTTP/JS errors.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
