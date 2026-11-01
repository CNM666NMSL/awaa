const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
 fs.mkdirSync('artifacts/pixelfx',{recursive:true});
 const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1400,height:950}}),errors=[],failed=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url());});
 await p.goto('http://127.0.0.1:3012/index.html?practice=select&v=pixelfx1');
 await p.waitForFunction(()=>window.pixelFX&&!gameAssets.blocked,{},{timeout:120000});
 const assets=await p.evaluate(()=>({count:Object.keys(pixelFX.images).length,loaded:Object.values(pixelFX.images).every(i=>i.naturalWidth>0),stats:gameAssets.stats(),oldRenderer:!!window.jiankeFX}));
 assert(assets.loaded);assert.equal(assets.oldRenderer,false);console.log('Loaded',assets);
 const captures=[];
 for(const id of ['noble','jianke','shouwang','motong','liequan','wuxiang'])for(const form of id==='shouwang'?['armored','unarmored']:['armored']){
  for(const mode of ['normal','ranged','ultimate','guard','special']){
   const state=await p.evaluate(({id,form,mode})=>{
    game.returnToMainMenu();game.startNoblePractice(id,'noble',form);game.phase='paused';game.superFreeze=null;
    const f=game.p1,v=game.p2;f.x=400;v.x=640;f.facing=1;v.facing=-1;f.meter=100;f.resource=5;
    if(mode==='guard'){f.block(true);f.stateTimer=90;f._updateAnim();}
    if(mode==='normal'){f.attack();f.stateTimer=f.atkDur(f.currentAttack,'startup')+3;f._updateAnim();}
    if(mode==='ranged'){
     const s=f.castSkill();if(!s)throw Error('cast failed '+id);f.pendingProj=s;f.stateTimer=s.startup;game.updateSkillCasts(f);
     if(id==='motong'){for(let i=0;i<21;i++)game.updateCombatV2();}else for(const q of game.projectiles){q.x=560;}
     f.stateTimer=s.startup+3;f._updateAnim();
    }
    if(mode==='ultimate'){f.castSuper();game.superFreeze=null;for(let i=0;i<50;i++){f.stateTimer++;game.updateCombatV2();}f._updateAnim();if(f.activeUltimate)f.activeUltimate.age=90;}
    if(mode==='special'){f.castSpecial();for(let i=0;i<23;i++)game.updateCombatV2();f.stateTimer=23;f._updateAnim();}
    const before=JSON.stringify([f.health,v.health,f.x,f.y,f.resource,f.meter,game.projectiles.map(x=>[x.x,x.life])]);
    for(let i=0;i<3;i++)game.render();
    const after=JSON.stringify([f.health,v.health,f.x,f.y,f.resource,f.meter,game.projectiles.map(x=>[x.x,x.life])]);
    return{same:before===after,png:game.canvas.toDataURL('image/png').split(',')[1],width:f.width,height:f.height,guardFrame:f.animFrame};
   },{id,form,mode});
   assert(state.same,'render mutated combat '+id+' '+mode);if(mode==='guard')assert.equal(state.guardFrame,0);
   const file='artifacts/pixelfx/'+id+'-'+form+'-'+mode+'.png';fs.writeFileSync(file,Buffer.from(state.png,'base64'));
   captures.push({id,form,mode,file});
  }
 }
 // Render every strike, both facings, including all three tentacle normals and revolver 6A.
 const strikes=await p.evaluate(()=>{
  let count=0;
  for(const id of CONFIG.roster)for(const form of id==='shouwang'?['armored','unarmored']:['armored'])for(const ranged of id==='wuxiang'?[false,true]:[false]){
   game.returnToMainMenu();game.startNoblePractice(id,'noble',form);game.phase='paused';game.superFreeze=null;const f=game.p1;f.rangedNormals=ranged;comboRework.select(f);
   for(const a of f.def.combo)for(const dir of [-1,1]){f._startAttack(a);f.facing=dir;f.stateTimer=f.atkDur(a,'startup')+3;f._updateAnim();game.render();count++;}
  }
  return count;
 });console.log('Rendered normal strike / direction variants',strikes);
 // Every atlas is transparent and nonempty at the declared 40 FPS.
 const manifest=JSON.parse(fs.readFileSync('assets/fx/pixelfx-v1/manifest.json'));
 for(const [key,a]of Object.entries(manifest.effects)){assert.equal(a.fps,40);const {data,info}=await sharp(a.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,a.cols*a.w);assert(data.some((v,i)=>i%4===3&&v>0),key+' empty');}
 // Each combat family in a row, seven variants in total; save a readable visual review sheet.
 for(const mode of ['normal','ranged','ultimate','guard','special']){
  const tiles=await Promise.all(captures.filter(x=>x.mode===mode).map(async(x,i)=>({input:await sharp(x.file).resize(600,270).png().toBuffer(),left:i%2*600,top:Math.floor(i/2)*300+28})));
  const labels=captures.filter(x=>x.mode===mode).map((x,i)=>`<text x="${i%2*600+12}" y="${Math.floor(i/2)*300+20}" fill="#ddd" font-size="16">${x.id} / ${x.form} / ${mode}</text>`).join('');
  await sharp({create:{width:1200,height:1200,channels:4,background:'#111722'}}).composite([...tiles,{input:Buffer.from('<svg width="1200" height="1200">'+labels+'</svg>'),left:0,top:0}]).png().toFile('artifacts/pixelfx/review-'+mode+'.png');
 }
 await p.waitForFunction(()=>!gameAssets.blocked,{},{timeout:120000});
 const guest=await p.evaluate(()=>{game.mode='lan-guest';game.net=null;game.superFreeze=null;game.phase='fight';const start=game._pixelFXTick||0,hp=game.p2.health;game.update();const advanced=game._pixelFXTick===start+1;game.phase='paused';game.update();return{advanced,paused:game._pixelFXTick===start+1,health:game.p2.health===hp};});console.log('Guest clock',guest);
 assert(guest.advanced&&guest.paused&&guest.health,'guest visual clock / pause / no client damage');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('PASS 35 in-game scenarios, LAN visual clock and pause, loaded atlases, stable guard, render preserves gameplay; no browser errors or missing resources.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
