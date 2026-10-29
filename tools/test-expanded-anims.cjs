'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/chars/expanded-v1/manifest.json')));
const c={Image:class{},window:{},console};vm.createContext(c);
for(const file of ['config','jianke-anims','jianke-movement','jianke-walk','shouwang-anims','mobility-anims','combat-v2-config','expanded-anims','fighter'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),c);
vm.runInContext('globalThis.F=Fighter;globalThis.C=CONFIG',c);
let total=0,drawn=0;
for(const [identity,clips]of Object.entries(manifest.identities)){
 const id=['armored','unarmored'].includes(identity)?'shouwang':identity,f=new c.F(id,400,1);if(id==='shouwang')f.form=identity;
 for(const [name,clip]of Object.entries(clips)){
  const a=f.def.anims[name];assert.equal(a.frames,clip.frames,identity+'/'+name);const hashes=new Set(),newCells=new Set();let dims;
  for(let i=0;i<a.frames;i++){
   const file=path.join(root,a.path.replace('{form}',f.form||''),String(i).padStart(2,'0')+'.png'),buffer=fs.readFileSync(file);assert.equal(buffer.readUInt32BE(0),0x89504e47);const size=[buffer.readUInt32BE(16),buffer.readUInt32BE(20)];dims||=size;assert.deepEqual(size,dims,'consistent registration canvas');
   hashes.add(crypto.createHash('sha256').update(buffer).digest('hex'));const p=clip.files[i];if(p.kind==='drawn'){assert(!newCells.has(p.row+':'+p.column),'new poses must not reuse the same generated drawing');newCells.add(p.row+':'+p.column);drawn++;}else assert(buffer.equals(fs.readFileSync(path.join(root,p.source))),'preserve original key drawing');total++;
  }
  assert(hashes.size>=Math.min(clip.frames,clip.newDrawings),'distinct additional drawings');
  if(a.phases){assert(a.phases[0]>0&&a.phases[0]<a.phases[1]&&a.phases[1]<a.frames);}
 }
 // Every ultimate pose must actually appear, at both zero and full attack-speed resources.
 for(const resource of [0,f.resourceMax]){f.resource=resource;f.setState('super');f.currentAttack=f.def.super_;const eff=f.curEff(),duration=eff.startup+eff.active+eff.recovery,seen=new Set();assert(duration>=125);for(let t=0;t<duration;t++){f.stateTimer=t;f._updateAnim();assert(f.animFrame>=0&&f.animFrame<25);seen.add(f.animFrame);}assert.equal(seen.size,25);assert.equal(f.animFrame,24);}
 for(let k=0;k<4;k++){f.resource=f.resourceMax;f.setState('attack');f.currentAttack=f.def.combo[k];const a=f.curEff(),seen=new Set();for(let t=0;t<a.startup+a.active+a.recovery;t++){f.stateTimer=t;f._updateAnim();seen.add(f.animFrame);}assert.equal(seen.size,10,identity+' combo '+(k+1)+' shows all ten poses');}
 f.currentAttack=null;f.setState('dash');const dashSeen=new Set();for(let i=0;i<c.C.physics.dashFrames;i++){f._updateAnim();dashSeen.add(f.animFrame);}assert.equal(dashSeen.size,10,'ten dash poses within unchanged blink duration');
 f.setState('jump');f.jumpsLeft=1;f.vx=0;const jumpSeen=new Set();for(let vy=-15;vy<=15;vy+=.5){f.vy=vy;f._updateAnim();jumpSeen.add(f.animFrame);}assert.equal(jumpSeen.size,10,'expanded jump follows entire physical flight');
 f.setState('super');f.currentAttack=f.def.super_;
 // Network snapshot preserves the higher animation index and the guardian form.
 f.animFrame=24;const peer=new c.F(id,0,-1);peer.applySnapshot(JSON.parse(JSON.stringify(f.toSnapshot())));assert.equal(peer.animFrame,24);assert.equal(peer.form,f.form);
 assert.equal(f.def.anims.u.frames,12);assert.equal(f.def.anims.block.frames,12);assert.equal(f.def.anims.charge.frames,12);assert.equal(f.def.anims.j4.frames,10);if(id==='shouwang')assert.equal(f.def.anims.walk.frames,12);
 const superOriginal=JSON.parse(fs.readFileSync(path.join(root,'assets/chars/expanded-v1/plan.json'))).clips[identity].super_;assert.equal(clips.super_.files[8].source,superOriginal.sourceFiles[superOriginal.original.phases[0]],'ultimate hit pose aligns to first active tick');assert.equal(clips.super_.files[19].source,superOriginal.sourceFiles[superOriginal.original.phases[1]],'ultimate recovery pose aligns to recovery tick');
}
assert.equal(total,manifest.totalFrames);assert.equal(drawn,manifest.newDrawings);
console.log(`PASS: ${total} frame files; ${drawn} distinct selected AI inbetweens; original key-pose preservation; form assets; all 25 ultimate poses at both resource levels; final recovery; network snapshots.`);
