'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url='http://127.0.0.1:3012/index.html';await page.goto(url+'?practice=motong&v=motion2');await page.waitForFunction(()=>window.game?.phase==='fight');
 await page.waitForFunction(()=>CONFIG.roster.every(id=>{const forms=id==='shouwang'?['armored','unarmored']:[null];return forms.every(form=>SPRITES[id+(form?'_'+form:'')+'_idle_0']?.naturalWidth>0);}));
 const checks=await page.evaluate(()=>{
  game.phase='paused';const results=[];
  for(const id of CONFIG.roster)for(const form of id==='shouwang'?['armored','unarmored']:[null]){
   const f=new Fighter(id,200,1);f.form=form;f._updateAnim();const c=document.createElement('canvas');c.width=420;c.height=540;const ctx=c.getContext('2d'),pictures=new Set(),feet=new Set(),tops=[];
   for(let t=0;t<192;t+=2){f.stateTimer=t;ctx.clearRect(0,0,420,540);f._drawSprite(ctx,f._animImg());pictures.add(c.toDataURL());const pixels=ctx.getImageData(0,0,420,540).data;let bottom=0,top=540;for(let y=0;y<540;y++)for(let x=0;x<420;x++)if(pixels[(y*420+x)*4+3]>160){bottom=Math.max(bottom,y);top=Math.min(top,y);}feet.add(bottom);tops.push(top);}
   results.push({id,form,breathing:f.def.anims.idle.breathing,fps:f.def.anims.idle.fps,variants:pictures.size,feet:feet.size,headRange:Math.max(...tops)-Math.min(...tops)});
   // Ordinary and charged U share the same actual-launch cooldown.
   for(const charged of [false,true]){f.resetForRound(200,1);const shot=f.castSkill(charged);if(!shot)throw Error('initial shot denied');f.pendingProj=shot;while(f.stateTimer<shot.startup)f.update();game.updateSkillCasts(f);if(f.rangedCooldown!==120)throw Error('shot cooldown shorter than two seconds');f.setState('idle');for(let n=0;n<119;n++){f.update();if(f.castSkill(!charged)!==null)throw Error('accepted a shot before cooldown expired');}while(f.rangedCooldown>0)f.update();if(!f.castSkill(!charged))throw Error('shot not ready after cooldown');}
  }
  return results;
 });
 for(const r of checks){assert(r.breathing);assert.equal(r.fps,60);assert(r.variants>20,r.id+' continuous animation');assert.equal(r.feet,1,r.id+' planted feet');assert(r.headRange<=2,r.id+' bounded head movement');}
 // All mode phases offer one consistent exit through the top-left settings.
 for(const mode of ['practice','local','cpu','lan-host','lan-guest'])for(const phase of ['intro','fight','paused','ko','between','matchEnd']){
  await page.evaluate(({mode,phase})=>{game.mode=mode;game.phase=phase;game.p1=new Fighter('noble',400,1);game.p2=new Fighter('jianke',800,-1);game.show(null);game.net=mode.startsWith('lan-')?{send(){},close(){window.testDisconnected=true;}}:null;window.testDisconnected=false;game.projectiles=[{x:10,y:10,vx:1,vy:0,size:8,damage:1,scale:1,color:"#fff",owner:game.p1,life:90}];game.cyberObjects=[{type:"motong",x:10,y:460,age:0,life:95,dir:1,owner:game.p1}];}, {mode,phase});
  await page.locator('#quick-settings').click();await page.locator('#btn-settings-home').click();
  const state=await page.evaluate(()=>({phase:game.phase,p1:game.p1,projectiles:game.projectiles.length,objects:game.cyberObjects.length,net:game.net,closed:window.testDisconnected}));assert.equal(state.phase,'menu');assert.equal(state.p1,null);assert.equal(state.projectiles,0);assert.equal(state.objects,0);assert.equal(state.net,null);if(mode.startsWith('lan-'))assert(state.closed);
  assert(await page.locator('#menu-main').isVisible());
 }
 // Menu/story access and a real walk after returning from a match.
 await page.getByRole('button',{name:'剧情模式',exact:true}).click();await page.locator('#quick-settings').click();await page.locator('#btn-settings-home').click();assert(await page.locator('#menu-main').isVisible());
 await page.goto(url+'?practice=liequan&v=motion2');await page.waitForFunction(()=>game.phase==='fight');await page.keyboard.down('KeyD');await page.waitForFunction(()=>game.p1.animKey==='walk'&&game.p1.animFrame>=3);await page.keyboard.up('KeyD');
 assert((await page.evaluate(()=>game.p1.def.anims.walk.path)).includes('motion-v2'));
 await page.locator('#quick-settings').click();await page.screenshot({path:path.resolve(__dirname,'../assets/chars/motion-v2/settings-preview.png'),fullPage:true});await page.locator('#btn-settings-back').click();await page.waitForFunction(()=>game.phase==='fight');
 assert.deepEqual(errors,[]);console.log('PASS: seven forms with 60FPS breathing and planted feet; ordinary/charged U cooldown; exit in 30 mode/phase combinations plus story; new walk and settings resume; no JS errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
