const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),els=new Map();const el=id=>{if(!els.has(id))els.set(id,{style:{},textContent:'',classList:{toggle(){}}});return els.get(id)};
const c={Image:class{},window:{},console,document:{getElementById:el},setTimeout:fn=>fn()};vm.createContext(c);
for(const file of ['config.js','jianke-anims.js','jianke-movement.js','jianke-walk.js','fighter.js','game.js'])vm.runInContext(fs.readFileSync(path.join(root,'js',file),'utf8').replace('window.game = new Game();',''),c);
vm.runInContext('globalThis.F=Fighter;globalThis.G=Game;globalThis.C=CONFIG',c);
for(const mode of ['local','online','practice'])for(const id of Object.keys(c.C.characters)){
 const f=new c.F(id,200,1),peer=new c.F(id,600,-1);assert.equal(f.maxHealth,2000);assert.equal(peer.health,f.health);
 f.health=740;peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer.health,740);
 const g=Object.create(c.G.prototype);Object.assign(g,{mode,p1:f,p2:peer,_lastHp:[],updateNameplates(){}});g.updateHUD(true);assert.equal(el('p1-health').style.width,'37%');assert.equal(el('p2-health').style.width,'37%');
}
const f=new c.F('jianke',200,1);
for(const [name,a] of Object.entries(f.def.anims))for(let i=0;i<a.frames;i++)assert(fs.existsSync(path.join(root,a.path,String(i).padStart(2,'0')+'.png')),name);
for(const attack of [...f.def.combo,f.def.launcher,f.def.low,f.def.dashAttack,f.def.airAttack,f.def.super_,f.def.superTiers.lunge]){
 f._startAttack(attack);f.stateTimer=f.curEff().startup;f._updateAnim();const clip=f.def.anims[f.animKey];assert.equal(f.animFrame,clip.phases[0]);
 const peer=new c.F('jianke',600,-1);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer.animKey,f.animKey);assert.equal(peer.animFrame,f.animFrame);
}
console.log('PASS: all character health, shared HUD in local/online/practice, snapshot health, 24 animation assets, attack contact and network animation frames');const g2=Object.create(c.G.prototype);g2.phase='fight';const input={};
for(const down of [false,true]){const actor=new c.F('jianke',200,1);g2.applyInput(actor,{chgHeld:true,d:down});assert.equal(actor.state,'charge');for(let n=0;n<60;n++)actor.update();assert(actor.meter>26&&actor.meter<27);g2.applyInput(actor,{chgHeld:false});assert.notEqual(actor.state,'charge');}
const actor=new c.F('jianke',200,1);g2.applyInput(actor,{chgHeld:true});actor.setState('hit');g2.applyInput(actor,{chgHeld:true});actor.setState('idle');g2.applyInput(actor,{chgHeld:true});assert.notEqual(actor.state,'charge');g2.applyInput(actor,{chgHeld:false});g2.applyInput(actor,{chgHeld:true});assert.equal(actor.state,'charge');
const dasher=new c.F('jianke',200,1);dasher.meter=100;g2.applyInput(dasher,{dsh:true,atk:true});assert.strictEqual(dasher.currentAttack,dasher.def.dashAttack);
const launcher=new c.F('jianke',200,1);g2.applyInput(launcher,{u:true,jmp:false,atk:true});assert.strictEqual(launcher.currentAttack,launcher.def.launcher);assert.equal(launcher.onGround,true);
console.log('PASS: P and S+P charge, release stops charge, hurt requires release/repress, simultaneous dash+attack, up+attack');

const walker=new c.F('jianke',400,1);walker.move(1);assert.equal(walker._animForState(),'walkStart');for(let i=0;i<10;i++){walker.move(1);walker.update();}assert.equal(walker._animForState(),'walk');const seen=new Set();for(let i=0;i<40;i++){walker.move(1);walker.update();seen.add(walker.animFrame);}assert.equal(seen.size,8);walker.stopMove();assert.equal(walker._animForState(),'walkStop');const remote=new c.F('jianke',400,1);remote.applySnapshot(JSON.parse(JSON.stringify(walker.toSnapshot())));assert.equal(remote._animForState(),'walkStop');for(let i=0;i<10;i++)walker.update();assert.equal(walker._animForState(),'idle');walker.move(-1);for(let i=0;i<10;i++){walker.move(-1);walker.update();}assert.equal(walker._animForState(),'walkBack');console.log('PASS: start, uninterrupted 8-frame walk loop, stop, idle, retreat, network stop transition');
const reviewHtml=fs.readFileSync(path.join(root,'tools/jianke-review.html'),'utf8');assert(reviewHtml.indexOf('js/jianke-movement.js')>reviewHtml.indexOf('js/jianke-anims.js'));assert(reviewHtml.indexOf('js/jianke-walk.js')>reviewHtml.indexOf('js/jianke-movement.js'));console.log('PASS: review page loads final walk overrides in correct order');
for(const pure of [false,true]){const n=new c.F('noble',300,1);if(pure)n.resource=5;n.meter=100;n.castSuperTier();const a=n.curEff();for(let t=0;t<a.startup+a.active+a.recovery+2;t++)n.update();assert.equal(n.state,'idle');assert.equal(n.vx,0);const endX=n.x;for(let t=0;t<90;t++)n.update();assert.equal(n.x,endX,'ultimate must not drift after recovery');}
console.log('PASS: normal and full-contract noble super stop after recovery with no idle drift');
