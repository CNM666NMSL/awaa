'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {createCanvas,loadImage,GlobalFonts}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),out=path.resolve(__dirname,'../assets/chars/ranged-arts-v1');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:3012/index.html?practice=jianke&v=arts1');await page.waitForFunction(()=>window.game?.phase==='fight'&&!gameAssets.blocked);
 const results=await page.evaluate(()=>{
  game.phase='paused';const results=[];
  for(const [id,form,kind]of [['jianke',null,'frost-wave'],['shouwang','unarmored','arcane-ray'],['shouwang','armored','arcane-shock'],['noble',null,'golden-lance']]){
   game.startNoblePractice(id,'noble',form||'armored');game.phase='paused';const f=game.p1,identity=form||id;
   const loaded=['uCharge','u','uCharged'].every(key=>Array.from({length:12},(_,i)=>SPRITES[id+(form?'_'+form:'')+'_'+key+'_'+i]?.naturalWidth>0).every(Boolean));
   const frames=[];
   for(const [state,t]of [['一段蓄力',20],['二段蓄力',90],['三段蓄力',190],['释放',0]]){
    f.resetForRound(500,1);f.form=form;game.p2.resetForRound(850,-1);game.projectiles=[];game.specialObjects=[];game.cyberObjects=[];game.sparks=[];game.shake=0;window.jiankeFX?.clear();
    if(t){f.setState('rangedCharge');f.rangedChargeFrames=t;f.stateTimer=t;f._updateAnim();}else{f.pendingProj=f.castSkill(true);f.stateTimer=f.pendingProj.startup;f._updateAnim();game.updateSkillCasts(f);game.projectiles[0].x+=75;}
    game.render();const view=game.practiceCamera(),x=f.x*view.scale+view.x,y=f.y*view.scale+view.y;
    const c=document.createElement('canvas');c.width=480;c.height=340;c.getContext('2d').drawImage(game.canvas,Math.max(0,Math.min(720,x-130)),Math.max(0,Math.min(200,y-295)),480,340,0,0,480,340);
    frames.push({state,frame:f.animFrame,image:c.toDataURL()});
   }
   const p=game.projectiles[0];const effect=document.createElement('canvas');effect.width=600;effect.height=320;const ctx=effect.getContext('2d');ctx.translate(300-p.x,160-p.y);rangedArts.projectile(ctx,p);
   const pixels=ctx.getImageData(0,0,600,320).data;let visible=0,green=0,gold=0;for(let i=0;i<pixels.length;i+=4){const [r,g,b,a]=pixels.slice(i,i+4);if(a>80){visible++;if(g>r*1.15&&g>b*1.1)green++;if(r>b*1.3&&g>b*1.1)gold++;}}
   results.push({identity,kind,loaded,frames,visible,green,gold,actualKind:p.kind,damageType:p.damageType,table:document.querySelector('#noble-moves tbody').textContent});
  }
  return results;
 });
 GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','Review Chinese');
 const board=createCanvas(480*4,370*4),ctx=board.getContext('2d'),releaseBoard=createCanvas(960,740),releaseCtx=releaseBoard.getContext('2d'),names={jianke:'江湖剑客',unarmored:'守望者·脱甲',armored:'守望者·铠甲',noble:'贵族决斗者'};ctx.fillStyle='#182021';ctx.fillRect(0,0,board.width,board.height);releaseCtx.fillStyle='#182021';releaseCtx.fillRect(0,0,960,740);
 for(let row=0;row<results.length;row++){
  const r=results[row];assert(r.loaded);assert.equal(r.kind,r.actualKind);assert(r.visible>100);
  if(r.identity==='armored'||r.identity==='unarmored'){assert.equal(r.damageType,'magic');assert(r.green>100,'green energy dominates');}
  if(r.identity==='noble')assert(r.gold>100);assert(r.table.includes('三段蓄力'));assert(r.table.includes('二段蓄力'));
  for(let col=0;col<4;col++){const frame=r.frames[col],im=await loadImage(frame.image);ctx.fillStyle='#edf0d9';ctx.font='17px "Review Chinese"';ctx.fillText(names[r.identity]+' · '+frame.state,col*480+12,row*370+23);ctx.drawImage(im,col*480,row*370+30);fs.writeFileSync(path.join(out,`${r.identity}-${col+1}.png`),Buffer.from(frame.image.split(',')[1],'base64'));if(col===3){const x=row%2*480,y=Math.floor(row/2)*370;releaseCtx.fillStyle='#edf0d9';releaseCtx.font='17px "Review Chinese"';releaseCtx.fillText(names[r.identity],x+12,y+23);releaseCtx.drawImage(im,x,y+30);}}
 }
 fs.writeFileSync(path.join(out,'gameplay-review.png'),board.toBuffer('image/png'));
 fs.writeFileSync(path.join(out,'release-preview.png'),releaseBoard.toBuffer('image/png'));
 await page.evaluate(()=>{game.startNoblePractice('jianke');game.phase='fight';});await page.keyboard.down('u');await page.waitForFunction(()=>game.p1?.state==='rangedCharge'&&game.p1.rangedChargeFrames>=65);await page.keyboard.up('u');await page.waitForFunction(()=>game.p1?.currentCast?.chargeLevel===2);assert.equal(await page.evaluate(()=>game.p1.currentCast.projectileKind),'frost-wave');
 assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);console.log('PASS browser: four identities and 96 frames loaded; all three poses and releases rendered; pure green magic, gold lance and frost projectile; form-aware practice table; real U press/release reaches second level; no asset or JS errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
