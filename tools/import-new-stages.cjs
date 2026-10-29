'use strict';
const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../assets/stages/new-scenes');
(async()=>{
 const jobs=JSON.parse(fs.readFileSync(path.join(root,'generation-jobs.json')));
 fs.mkdirSync(path.join(root,'sources'),{recursive:true});
 for(const job of jobs){
  const source=path.join(root,'sources',job.id+'.png');
  if(!fs.existsSync(source))fs.copyFileSync(job.path,source);
  await sharp(source).resize(1600,720,{fit:'cover'}).webp({quality:90}).toFile(path.join(root,job.id+'.webp'));
  const meta=await sharp(path.join(root,job.id+'.webp')).metadata();
  console.log(job.id,meta.width+'x'+meta.height);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
