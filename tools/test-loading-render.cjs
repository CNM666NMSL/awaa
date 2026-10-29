'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1360,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));let releaseAsset;
 await page.route('**/motong/idle/00.png*',async route=>{await new Promise(resolve=>{releaseAsset=resolve;});await route.continue();});
 await page.goto('http://127.0.0.1:3012/index.html?practice=noble&v=load1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.gameAssets?.stats().loaded>10);
 assert(await page.locator('#resource-loading').isVisible());assert(await page.evaluate(()=>gameAssets.blocked));assert.equal(await page.evaluate(()=>game.phase),'menu');
 const progress=await page.locator('#loading-progress').getAttribute('aria-valuenow');assert(Number(progress)>0&&Number(progress)<100);
 await page.screenshot({path:path.resolve(__dirname,'../assets/loading-preview.png')});releaseAsset();
 await page.waitForFunction(()=>!gameAssets.blocked&&game.phase==='fight');assert(!(await page.locator('#resource-loading').isVisible()));
 assert.equal(await page.evaluate(()=>gameAssets.stats().failed),0);
 // Frame output must not depend on old pixels, including either map edge and zoom-out.
 const results=await page.evaluate(()=>{
  game.phase='paused';game.matchOptions.stage='arcane';game.shake=0;game.projectiles=[];game.specialObjects=[];game.cyberObjects=[];game.sparks=[];game.superFreeze=null;window.jiankeFX?.clear();
  const result=[];
  for(const [name,x1,x2,y1,y2]of [['left',25,110,460,460],['right',1090,1175,460,460],['wide',25,1175,460,460],['air',80,1100,-400,460]]){
   game.p1.x=x1;game.p2.x=x2;game.p1.y=y1;game.p2.y=y2;
   const outputs=[];
   for(const color of ['#ff00fe','#00ff01']){game.ctx.setTransform(1,0,0,1,0,0);game.ctx.fillStyle=color;game.ctx.fillRect(0,0,1200,540);game.render();outputs.push(game.ctx.getImageData(0,0,1200,540).data);}
   let delta=0,bigDelta=0,minX=1200,maxX=0;for(let i=0;i<outputs[0].length;i+=4){const d=Math.max(...[0,1,2,3].map(j=>Math.abs(outputs[0][i+j]-outputs[1][i+j])));if(d){delta++;minX=Math.min(minX,i/4%1200);maxX=Math.max(maxX,i/4%1200);}if(d>2)bigDelta++;}
   const a=game.ctx.getImageData(0,0,1200,540).data;let transparent=0;for(let i=3;i<a.length;i+=4)if(a[i]!==255)transparent++;
   const view=game.practiceCamera();result.push({name,independent:delta===0,delta,bigDelta,minX,maxX,transparent,x:view.x,scale:view.scale});
  }
  game.p1.x=25;game.p2.x=110;game.p1.y=game.p2.y=460;game.render();
  let rainMatrix;const rain=window.rainWeather;if(rain){const original=rain.render;rain.render=function(g,ctx){const m=ctx.getTransform();rainMatrix=[m.a,m.d,m.e,m.f];return original.call(this,g,ctx);};game.render();rain.render=original;}
  return {frames:result,rainMatrix};
 });
 console.log(JSON.stringify(results.frames));for(const r of results.frames){assert(r.independent,r.name+' contains old pixels');assert.equal(r.transparent,0);if(r.scale>=1)assert(r.x<=0&&r.x>=1200-1200*r.scale);}
 if(results.rainMatrix)assert.deepEqual(results.rainMatrix,[1,1,0,0]);
 await page.locator('#game-canvas').screenshot({path:path.resolve(__dirname,'../assets/render-edge-fixed.png')});
 // A broken critical image keeps the curtain visible; retry restores every sprite alias.
 const failedPage=await context.newPage();failedPage.on('pageerror',e=>errors.push(e.message));let failedOnce=false;
 await failedPage.route('**/wuxiang/walk/03.png*',async route=>{if(!failedOnce){failedOnce=true;await route.fulfill({status:404,body:'test missing image'});}else await route.continue();});
 // Current motion patch uses a new walk path, so fail an unchanged ranged-cast pose.
 await failedPage.route('**/wuxiang/u/03.png*',async route=>{if(!failedOnce){failedOnce=true;await route.fulfill({status:404,body:'test missing image'});}else await route.continue();});
 await failedPage.goto('http://127.0.0.1:3012/index.html?practice=wuxiang&v=load1');
 await failedPage.locator('#loading-retry').waitFor({state:'visible'});assert(await failedPage.evaluate(()=>gameAssets.blocked));assert.equal(await failedPage.evaluate(()=>game.phase),'menu');
 await failedPage.locator('#loading-retry').click();await failedPage.waitForFunction(()=>!gameAssets.blocked&&game.phase==='fight');
 assert(await failedPage.evaluate(()=>SPRITES.wuxiang_u_3?.naturalWidth>0&&SPRITES.wuxiang_uCharged_3?.naturalWidth>0));
 assert.deepEqual(errors,[]);console.log('PASS: real loading progress and simulation gate; decoded resource completion; failed image/retry and aliases; edge/air/zoom-out frames independent of prior pixels; opaque canvas; rain screen-space transform; no JS errors.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
