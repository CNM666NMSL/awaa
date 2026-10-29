'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:3012/index.html?practice=wuxiang&v=gun1');await page.waitForFunction(()=>window.game?.phase==='fight'&&!gameAssets.blocked);
 const result=await page.evaluate(()=>{
  game.phase='paused';game.specialObjects=[];game.cyberObjects=[];game.projectiles=[];game.sparks=[];game.startNoblePractice('wuxiang','noble');game.phase='paused';
  const f=game.p1,ctx=document.createElement('canvas').getContext('2d');ctx.canvas.width=1200;ctx.canvas.height=540;
  const pixels=()=>{const data=ctx.getImageData(0,0,1200,540).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)n++;return n;};
  const captures=[];
  for(const direction of [-1,1])for(const charged of [false,true]){
   f.resetForRound(600,direction);game.p2.resetForRound(600+direction*300,-direction);game.projectiles=[];const s=f.castSkill(charged);f.pendingProj=s;
   f.stateTimer=s.startup-1;ctx.clearRect(0,0,1200,540);game.drawCombatV2(ctx);const before=pixels();
   f.stateTimer=s.startup;f._updateAnim();game.updateSkillCasts(f);game.projectiles=[];ctx.clearRect(0,0,1200,540);game.drawCombatV2(ctx);const flash=pixels();
   f.stateTimer=s.startup+6;ctx.clearRect(0,0,1200,540);game.drawCombatV2(ctx);const after=pixels();
   game.projectiles=[{kind:'revolver',x:600,y:300,size:8,vx:direction*18,charged,owner:f}];ctx.clearRect(0,0,1200,540);game.drawCombatV2(ctx);const bullet=pixels();
   captures.push({direction,charged,before,flash,after,bullet});
  }
  const images=['u','uCharge','uCharged'].map(key=>({key,frames:f.def.anims[key].frames,loaded:Array.from({length:12},(_,i)=>SPRITES['wuxiang_'+key+'_'+i]?.naturalWidth>0).every(Boolean)}));
  f.resetForRound(500,1);game.p2.resetForRound(850,-1);game.projectiles=[];const shot=f.castSkill();f.pendingProj=shot;f.stateTimer=shot.startup;f._updateAnim();game.updateSkillCasts(f);game.projectiles[0].x+=65;game.shake=0;game.render();
  return{captures,images,moveTable:document.querySelector('#noble-moves tbody').textContent};
 });
 for(const x of result.captures){assert.equal(x.before,0,'no premature flash');assert(x.flash>100,'visible firing spark');assert.equal(x.after,0,'flash expires');assert(x.bullet>50,'visible bullet and trail');}
 for(const x of result.images){assert.equal(x.frames,12);assert(x.loaded);}
 assert(result.moveTable.includes('左轮·火花弹'));assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
 await page.locator('canvas').first().screenshot({path:path.resolve(__dirname,'../assets/chars/wuxiang-revolver-v1/gameplay-preview.png')});
 console.log('PASS browser: all 36 animation images loaded, muzzle flash only on release and expires, bullets visible both ways, charged effects, practice table, no missing assets or JS errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
