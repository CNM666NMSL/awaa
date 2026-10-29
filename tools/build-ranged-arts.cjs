'use strict';
const fs=require('node:fs'),path=require('node:path'),{grid,save}=require('./build-cyber-roster.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/chars/ranged-arts-v1');
(async()=>{
 const jobs=JSON.parse(fs.readFileSync(path.join(out,'generation-jobs.json'))),manifest={generator:'built-in image_gen',identities:{}};
 for(const j of jobs){
  const folder=path.join(out,j.id);fs.mkdirSync(folder,{recursive:true});const sheet=path.join(folder,'source-sheet.png');if(!fs.existsSync(sheet))fs.copyFileSync(j.path,sheet);
  const cells=(await grid(sheet,4,6)).flat();if(cells.length!==24)throw Error(j.id+': 24 cells required');
  const charge=['armored','unarmored'].includes(j.id)?[0,1,2,3,6,7,8,9,12,13,14,15]:Array.from({length:12},(_,i)=>i);
  const release=j.id==='jianke'?[10,11,12,13,14,15,16,17,18,19,20,23]:Array.from({length:12},(_,i)=>12+i);
  const scale=250/cells[0].m.height;
  for(const [key,indices] of Object.entries({charge,release}))for(let i=0;i<12;i++)await save(cells[indices[i]],path.join(folder,key,String(i).padStart(2,'0')+'.png'),scale);
  manifest.identities[j.id]={reference:j.ref,source:`${j.id}/source-sheet.png`,scale,charge,release,contact:5,bodyHeight:250,canvas:[512,384],origin:[210,356]};
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));console.log('Installed 96 frames for four ranged identities, with three charge stages and synced release.');
})().catch(e=>{console.error(e);process.exitCode=1;});
