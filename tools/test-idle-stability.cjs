'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:3012/index.html?practice=noble&v=idle1');
 await page.waitForFunction(()=>window.game?.phase==='fight'&&Object.entries(SPRITES).filter(([k])=>k.includes('_idle_')).every(([,im])=>im.complete&&im.naturalWidth));
 const results=await page.evaluate(()=>{
  const result=[];
  for(const id of CONFIG.roster)for(const form of id==='shouwang'?['armored','unarmored']:[null]){
   const f=new Fighter(id,180,1);f.form=form;
   const canvas=document.createElement('canvas');canvas.width=400;canvas.height=540;const ctx=canvas.getContext('2d'),pixels=new Set(),positions=new Set();
   for(let i=0;i<180;i++){
    f.sinceHit=0;f.resource=0;f.update();ctx.clearRect(0,0,400,540);f._drawSprite(ctx,f._animImg());pixels.add(canvas.toDataURL());positions.add(f.x+':'+f.y);
   }
   const entrance=new RoundEntrance(),introFrames=new Set();for(let t=110;t<180;t++)introFrames.add(entrance.sample(f,t).frame);
   result.push({id,form,pixelVariants:pixels.size,positions:positions.size,introFrames:[...introFrames],frame:f.animFrame});
  }
  return result;
 });
 for(const r of results){assert(r.pixelVariants>20,r.id+' smooth breathing without pose jumps');assert.equal(r.positions,1);assert.deepEqual(r.introFrames,[0]);assert.equal(r.frame,0);}
 await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>game.p1.animFrame),0);assert.deepEqual(errors,[]);
 console.log('PASS browser: continuous breathing and fixed simulation position across the full roster; stable source pose during entrances; live practice stable; no JS errors.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
