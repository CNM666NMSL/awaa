'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const el=()=>({value:'0',checked:false,textContent:'',classList:{add(){},remove(){},toggle(){}},querySelector(){return{style:{}};}});
const c={Image:class{},window:{addEventListener(){}},console,performance:{now:()=>10000},document:{getElementById:el},setTimeout(){},matchMedia:()=>({matches:false})};
vm.createContext(c);
const load=name=>vm.runInContext(fs.readFileSync(path.join(root,'js',name+'.js'),'utf8').replace('window.game = new Game();',''),c);
for(const name of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','gait-v2','cyber-anims','cyber-roster','motion-v2'])load(name);
vm.runInContext('globalThis.C=CONFIG',c);
const before=JSON.parse(JSON.stringify(c.C.characters));load('ultimate-ranges');load('fighter');load('game');
vm.runInContext('globalThis.F=Fighter;globalThis.G=Game',c);
const expected={noble:3,jianke:3,shouwang:3,motong:4.5,liequan:4.5,wuxiang:4.5};
const g=Object.create(c.G.prototype);Object.assign(g,{phase:'fight',projectiles:[],spawnHitSpark(){},updateHUD(){},onKO(){},announce(){}});
let checks=0;
for(const [id,bodies] of Object.entries(expected)){
 const def=c.C.characters[id];assert.equal(def.super_.rangeBodies,bodies);assert.equal(def.super_.range,bodies*def.width);
 for(const key of ['combo','skill','special','superTiers','anims'])assert.equal(JSON.stringify(def[key]),JSON.stringify(before[id][key]),id+' unchanged '+key);
 const original={...before[id].super_,rangeBodies:bodies,range:bodies*def.width};assert.equal(JSON.stringify(def.super_),JSON.stringify(original),'only reach changes');
 for(const form of id==='shouwang'?['armored','unarmored']:['armored'])for(const dir of [-1,1])for(const targetId of Object.keys(expected)){
  const f=new c.F(id,600,dir),target=new c.F(targetId,0,-dir);f.form=form;
  for(const offset of [-.1,0,.1]){
   f.resetForRound(600,dir);f.form=form;f.meter=100;assert(f.castSuper());f.stateTimer=f.curEff().startup;
   const reach=def.width/2+def.width*bodies;
   target.resetForRound(600+dir*(reach+target.width/2+offset),-dir);
   const hp=target.health;g.checkHit(f,target);assert.equal(target.health<hp,offset<0,`${id}/${form}/${dir} against ${targetId} boundary ${offset}`);
   const box=f.getAttackBox();assert.equal(box.w,reach);assert.equal(dir===1?box.x+box.w:box.x,600+dir*reach);
   const peer=new c.F(id,0,-dir);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(JSON.stringify(peer.getAttackBox()),JSON.stringify(box),'network snapshot keeps range');
   checks++;
  }
  f.resetForRound(600,dir);f.meter=100;f.castSuper();f.stateTimer=f.curEff().startup-1;target.resetForRound(600+dir*70,-dir);g.checkHit(f,target);assert.equal(target.health,target.maxHealth,'startup cannot hit');
  f.stateTimer=f.curEff().startup;target.resetForRound(600-dir*70,-dir);g.checkHit(f,target);assert.equal(target.health,target.maxHealth,'no hit behind caster');
 }
}
console.log(`PASS: ${checks} inside/edge/outside checks, six roles, both facings, both guardian forms, snapshots, startup, rear safety and unchanged other moves.`);

(async()=>{
 const {chromium}=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:3012/index.html?practice=noble&v=range1');await page.waitForFunction(()=>window.game?.phase==='fight'&&!window.gameAssets.blocked);
  const rows=await page.evaluate(()=>{game.phase='paused';return CONFIG.roster.map(id=>{game.startNoblePractice(id);game.phase='paused';const f=game.p1;f.meter=100;f.castSuper();const row=[...document.querySelectorAll('#noble-moves tbody tr')].find(tr=>tr.textContent.includes('100气 I'));return{id,bodies:f.def.super_.rangeBodies,reach:f.getAttackBox().w,label:row.textContent};});});
  for(const row of rows){assert.equal(row.bodies,expected[row.id]);assert(row.label.includes(`${expected[row.id]}身位（身体前沿起）`));}
  assert.deepEqual(errors,[]);console.log('PASS: live browser loads range rules for every character and displays distances in practice table without errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
