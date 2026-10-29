'use strict';
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {createCanvas,loadImage,GlobalFonts}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),out=path.resolve(__dirname,'../assets/chars/signature-arts-v1');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto('http://127.0.0.1:3012/index.html?practice=jianke&v=signature1');await page.waitForFunction(()=>window.game?.phase==='fight'&&!gameAssets.blocked);
 const result=await page.evaluate(()=>{
  game.phase='paused';const rows=[];
  for(const [id,form,name]of [['jianke',null,'江湖剑客'],['noble',null,'贵族决斗者'],['shouwang','armored','守望者·铠甲'],['shouwang','unarmored','守望者·脱甲']]){
   const shots=[];
   for(let level=1;level<=4;level++){
    game.startNoblePractice(id,'noble',form||'armored');game.phase='paused';const f=game.p1;f.x=420;game.p2.x=730;game.projectiles=[];game.signatureObjects=[];game.sparks=[];game.shake=0;window.jiankeFX?.clear();
    if(level<=3){if(level===2){f.setState('rangedCharge');f.rangedChargeFrames=60;}f.pendingProj=f.castSkill(level>=2);f.stateTimer=f.pendingProj.startup;f._updateAnim();game.updateSkillCasts(f);
     if(level===3){const o=game.signatureObjects[0];const frames=o.kind==='meteor'?42:o.kind==='heavy-cleave'?22:37;for(let n=0;n<frames;n++)game.updateSignatureArts();}
     else game.projectiles[0].x+=85;
    }else{f.meter=100;f.castSuper();const frames=id==='jianke'?90:id==='noble'?32:form==='armored'?70:68;for(let n=0;n<frames;n++){f.update();game.p2.update();game.updateSignatureArts();}}
    game.shake=0;game.render();const image=game.canvas.toDataURL();shots.push({level,image,projectiles:game.projectiles.length,kinds:game.signatureObjects.map(o=>o.kind),invulnerable:f.isInvulnerable(),ultimate:f.activeUltimate?.name,table:document.querySelector('#noble-moves tbody').textContent});
   }
   rows.push({id,form,name,shots});
  }
  // Exercise the actual outer game.update sound wrapper, including each character's cut-in.
  const tones=[],tone=awaAudio.tone;awaAudio.tone=(...args)=>tones.push(args);
  for(const id of CONFIG.roster){game.startNoblePractice(id);game.phase='fight';game.p2.x=1050;game.update();game.p1.meter=100;game.p1.castSuper();game.update();game.phase='paused';}
  awaAudio.tone=tone;
  const activationSounds=tones.filter(([bus])=>bus==='effects');
  game.signatureObjects=[{kind:'meteor'}];game.p1.activeUltimate={kind:'sword-domain',age:1,life:480};game.returnToMainMenu();
  return{rows,activationSounds,cleanExit:game.signatureObjects.length===0&&game.p1===null&&game.p2===null};
 });
 assert.deepEqual(result.activationSounds,[],'all six ultimates trigger silently');assert(result.cleanExit);
 GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','Review Chinese');
 const board=createCanvas(2400,1200),ctx=board.getContext('2d'),ultimateBoard=createCanvas(1200,600),uc=ultimateBoard.getContext('2d'),thirdBoard=createCanvas(1200,600),tc=thirdBoard.getContext('2d');
 for(const c of [ctx,uc,tc]){c.fillStyle='#152024';c.fillRect(0,0,c.canvas.width,c.canvas.height);c.font='17px "Review Chinese"';}
 for(let row=0;row<result.rows.length;row++){
  const r=result.rows[row];assert.notEqual(r.shots[0].image,r.shots[1].image);assert.notEqual(r.shots[1].image,r.shots[2].image);assert.equal(r.shots[2].projectiles,0);assert(r.shots[2].kinds.includes(r.id==='jianke'?'heavy-cleave':r.id==='noble'?'overhead-stars':'meteor'));
  if(r.id==='noble')assert(r.shots[3].invulnerable);assert(r.shots[3].ultimate);assert(r.shots[2].table.includes('三段蓄力'));
  for(let col=0;col<4;col++){const shot=r.shots[col],im=await loadImage(shot.image),title=r.name+' · '+['一段释放','二段释放','三段释放','大招'][col];ctx.fillStyle='#e9eed7';ctx.fillText(title,col*600+12,row*300+23);ctx.drawImage(im,col*600,row*300+30,600,270);
   const dest=col===3?uc:col===2?tc:null;if(dest){const x=row%2*600,y=Math.floor(row/2)*300;dest.fillStyle='#e9eed7';dest.fillText(title,x+12,y+23);dest.drawImage(im,x,y+30,600,270);}
  }
 }
 fs.writeFileSync(path.join(out,'gameplay-review.png'),board.toBuffer('image/png'));fs.writeFileSync(path.join(out,'ultimate-preview.png'),ultimateBoard.toBuffer('image/png'));fs.writeFileSync(path.join(out,'third-stage-preview.png'),thirdBoard.toBuffer('image/png'));
 assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);console.log('PASS browser: distinct three-stage releases, four sustained ultimate VFX, invulnerability, six silent activation paths, correct practice labels, full exit cleanup, no asset or JS errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
