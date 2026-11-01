const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{fs.mkdirSync('artifacts/adaptive-arena',{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const cfg of [{name:'desktop',viewport:{width:1920,height:1080},touch:false},{name:'android-landscape',viewport:{width:915,height:412},touch:true},{name:'android-portrait',viewport:{width:412,height:915},touch:true}]){
  const context=await browser.newContext({viewport:cfg.viewport,hasTouch:cfg.touch,isMobile:cfg.touch,...cfg.touch?{userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'}:{}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:3012/index.html?v=mobile-arena1');await p.waitForFunction(()=>window.adaptiveArena&&!gameAssets.blocked,{},{timeout:120000});await p.screenshot({path:'artifacts/adaptive-arena/'+cfg.name+'-menu.png'});
  await p.evaluate(()=>{game.startNoblePractice('wuxiang','noble');game.mode='local';game.phase='fight';game.superFreeze=null;game.p1.x=380;game.p2.x=760;game.p2.facing=-1;game.show(null);adaptiveArena.state();});await p.waitForTimeout(100);
  const layout=await p.evaluate(()=>{const r=game.canvas.getBoundingClientRect(),b=document.querySelector('[data-action=attack]').getBoundingClientRect();return{mode:adaptiveArena.inputMode,rotated:adaptiveArena.rotated,canvas:{x:r.x,y:r.y,w:r.width,h:r.height},attack:{x:b.x+b.width/2,y:b.y+b.height/2},coverage:r.width*r.height/(innerWidth*innerHeight),touchVisible:getComputedStyle(touchControls.element).display!=='none'};});
  assert.equal(layout.mode,cfg.touch?'touch':'keyboard');assert.equal(layout.touchVisible,cfg.touch);assert(layout.coverage>.75);assert.equal(layout.rotated,cfg.name==='android-portrait');
  if(!cfg.touch){const x=await p.evaluate(()=>game.p1.x);await p.keyboard.down('d');await p.waitForTimeout(120);await p.keyboard.up('d');assert(await p.evaluate(x=>game.p1.x>x,x));await p.keyboard.press('j');await p.waitForTimeout(40);assert(await p.evaluate(()=>game.p1.state==='attack'));}
  else{
   const client=await context.newCDPSession(p),r=await p.locator('.touch-stick').boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2;
   const move=layout.rotated?{x:cx,y:cy+r.width*.31,id:1}:{x:cx+r.width*.31,y:cy,id:1},start={x:cx,y:cy,id:1};
   const x=await p.evaluate(()=>game.p1.x);await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[move]});await p.waitForTimeout(100);assert(await p.evaluate(x=>game.p1.x>x,x),'joystick moves right in '+cfg.name);
   const atk={...layout.attack,id:2};await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[move,atk]});await p.waitForTimeout(40);assert(await p.evaluate(()=>game.p1.state==='attack'),'multitouch attack while moving');
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(await p.evaluate(()=>touchControls.heldKeys().size===0),'all pointers released');
   await p.evaluate(()=>{document.getElementById('arena-input-mode').value='keyboard';document.getElementById('arena-input-mode').dispatchEvent(new Event('change'));});assert(await p.evaluate(()=>adaptiveArena.inputMode==='keyboard'&&!adaptiveArena.rotated));
   await p.evaluate(()=>{document.getElementById('arena-input-mode').value='auto';document.getElementById('arena-input-mode').dispatchEvent(new Event('change'));});
  }
  await p.evaluate(()=>{game.p1.setState('idle');game.p1.x=430;game.p2.x=700;game.render();});await p.screenshot({path:'artifacts/adaptive-arena/'+cfg.name+'-fight.png'});assert.deepEqual(errors,[]);console.log('PASS',cfg.name,layout);await context.close();
 }
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
