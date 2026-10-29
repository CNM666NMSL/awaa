'use strict';
const fs=require('node:fs'),path=require('node:path');
const {sharp,spans,metrics,removeAdjacentFragments}=require('./expand-animation-frames.cjs');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'assets/chars/cyber-v1');
async function grid(file,expectedRows,expectedCols){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let i=3;i<data.length;i+=4)if(data[i]<100)data[i]=0;
 const ys=Array(info.height).fill(0);for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>160)ys[y]++;
 let rows=spans(ys,Math.max(...ys)*.13,18,8);
 while(rows.length>expectedRows){let at=0,gap=Infinity;for(let i=0;i<rows.length-1;i++)if(rows[i+1][0]-rows[i][1]<gap){gap=rows[i+1][0]-rows[i][1];at=i;}rows.splice(at,2,[rows[at][0],rows[at+1][1]]);}
 while(rows.length<expectedRows&&rows.length){let at=0;for(let i=1;i<rows.length;i++)if(rows[i][1]-rows[i][0]>rows[at][1]-rows[at][0])at=i;const [top,bottom]=rows[at],middle=(top+bottom)/2,half=(bottom-top)*.21;let split=Math.floor(middle),score=Infinity;for(let y=Math.ceil(middle-half);y<Math.floor(middle+half);y++){const n=ys[y]+ys[y-1]+ys[y+1]+Math.abs(y-middle)*.02;if(n<score){score=n;split=y;}}rows.splice(at,1,[top,split],[split,bottom]);}
 if(rows.length!==expectedRows)throw Error(`${file}: ${rows.length} rows, expected ${expectedRows}`);
 const result=[];
 for(let r=0;r<rows.length;r++){
  const [bodyTop,bodyBottom]=rows[r],top=r?Math.floor((rows[r-1][1]+bodyTop)/2):0,bottom=r===rows.length-1?info.height:Math.floor((bodyBottom+rows[r+1][0])/2);
  const xs=Array(info.width).fill(0);for(let y=bodyTop;y<bodyBottom;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>160)xs[x]++;
  let bands=spans(xs,(bodyBottom-bodyTop)*.15,10,5),widths=bands.map(b=>b[1]-b[0]).sort((a,b)=>a-b),median=widths[Math.floor(widths.length/2)];bands=bands.filter(b=>b[1]-b[0]>=median*.46);
  if(bands.length<expectedCols||bands.length>expectedCols+2)bands=Array.from({length:expectedCols},(_,i)=>[i*info.width/expectedCols,(i+1)*info.width/expectedCols]);
  const cells=[];
  for(let col=0;col<bands.length;col++){
   const left=col?Math.floor((bands[col-1][1]+bands[col][0])/2):0,right=col===bands.length-1?info.width:Math.floor((bands[col][1]+bands[col+1][0])/2);
   const buffer=await sharp(data,{raw:info}).extract({left,top,width:right-left,height:bottom-top}).raw().toBuffer();
   removeAdjacentFragments(buffer,right-left,bottom-top);
   cells.push({data:buffer,width:right-left,height:bottom-top,row:r,column:col,m:metrics(buffer,right-left,bottom-top)});
  }
  result.push(cells);
 }
 console.log(path.basename(file),result.map(r=>r.length).join('/'));
 return result;
}
async function save(cell,file,scale,w=512,h=384,x=210,y=356){
 const m=cell.m,crop={left:m.left,top:m.top,width:m.right-m.left+1,height:m.bottom-m.top+1};
 scale=Math.min(scale,(w-8)/crop.width,(h-8)/crop.height);
 const width=Math.max(1,Math.round(crop.width*scale)),height=Math.max(1,Math.round(crop.height*scale));
 const png=await sharp(cell.data,{raw:{width:cell.width,height:cell.height,channels:4}}).extract(crop).resize(width,height,{kernel:'nearest'}).png().toBuffer();
 const footCenter=m.footX-m.left;
 const left=Math.max(0,Math.min(w-width,Math.round(x-footCenter*scale))),top=Math.max(0,Math.min(h-height,Math.round(y-(m.feet-m.top)*scale)));
 fs.mkdirSync(path.dirname(file),{recursive:true});
 await sharp({create:{width:w,height:h,channels:4,background:'#00000000'}}).composite([{input:png,left,top}]).png().toFile(file);
}
async function main(){
 const jobs=JSON.parse(fs.readFileSync(path.join(OUT,'generation-jobs.json'))),runtime={},manifest={identities:{},generator:'built-in image_gen',reference:'three user-provided design sheets'};
 fs.mkdirSync(path.join(OUT,'sheets'),{recursive:true});fs.mkdirSync(path.join(OUT,'references'),{recursive:true});
 for(const job of jobs){const dest=path.join(OUT,'sheets',job.id+'-'+job.category+'.png');if(!fs.existsSync(dest))fs.copyFileSync(job.path,dest);const ref=path.join(OUT,'references',job.id+'.jpg');if(!fs.existsSync(ref))fs.copyFileSync(job.ref,ref);}
 for(const id of ['motong','liequan','wuxiang']){
  const sheets={};for(const [category,rows,cols]of [['mobility',8,5],['combat',8,5],['skills',6,6],['super',5,5]])sheets[category]=await grid(path.join(OUT,'sheets',id+'-'+category+'.png'),rows,cols);
  const portrait=await sharp(path.join(OUT,'sheets',id+'-portrait.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cell={data:portrait.data,width:portrait.info.width,height:portrait.info.height,m:metrics(portrait.data,portrait.info.width,portrait.info.height)};
  await save(cell,path.join(OUT,id,'idle/00.png'),250/cell.m.height);
  await sharp(portrait.data,{raw:portrait.info}).extract({left:cell.m.left,top:cell.m.top,width:cell.m.right-cell.m.left+1,height:cell.m.bottom-cell.m.top+1}).resize({width:480,height:640,fit:'inside',kernel:'nearest'}).extend({top:10,bottom:10,left:10,right:10,background:'#00000000'}).png().toFile(path.join(OUT,id,'portrait.png'));
  const anims={idle:{frames:1,path:`assets/chars/cyber-v1/${id}/idle`,fps:1,loop:false}},record={};
  const plans=[['walk','mobility',0,10],['run','mobility',2,10],['jump','mobility',4,10],['dash','mobility',6,10],['j1','combat',0,10],['j2','combat',2,10],['j3','combat',4,10],['j4','combat',6,10],['block','skills',0,12],['charge','skills',2,12],['u','skills',4,12],['super_','super',0,25]];
  const scales={};for(const category of ['mobility','combat','skills','super'])scales[category]=250/sheets[category][0][0].m.height;
  for(const [name,category,start,n]of plans){
   const cells=(name==='super_'?sheets[category]:sheets[category].slice(start,start+2)).flat();if(cells.length<n)throw Error(`${id}/${name}: only ${cells.length} distinct drawings for ${n} required poses`);
   const chosen=Array.from({length:n},(_,i)=>cells[Math.round(i*(cells.length-1)/(n-1))]);
   for(let i=0;i<n;i++)await save(chosen[i],path.join(OUT,id,name,String(i).padStart(2,'0')+'.png'),scales[category]);
   anims[name]={frames:n,path:`assets/chars/cyber-v1/${id}/${name}`,fps:name==='walk'?24:name==='run'?32:name==='dash'?50:12,loop:['walk','run'].includes(name),expandedFrom:n};
   if(['j1','j2','j3','j4'].includes(name))anims[name].phases=[3,7];
   if(name==='super_')Object.assign(anims[name],{phases:[8,19],activeLoop:false});
   if(name==='jump')anims[name].physics=true;
   if(name==='u')Object.assign(anims[name],{fitState:true,contact:5});
   if(['walk','run'].includes(name))anims[name].gaitCycle=true;
   record[name]={drawings:n,source:`sheets/${id}-${category}.png`,cells:chosen.map(c=>({row:c.row,column:c.column}))};
  }
  // Reuse semantically matching complete drawings for variants and transition poses.
  for(const [name,from]of Object.entries({walkBack:'walk',doubleJump:'jump',airMove:'jump',launcher:'j3',low:'j2',dashAttack:'j1',airAttack:'j4',parry:'block',parryCounter:'j1',uCharge:'charge',uCharged:'u',special:'u',superLunge:'j1',superWave:'u'}))anims[name]={...anims[from]};
  const back=path.join(OUT,id,'walkBack');fs.mkdirSync(back,{recursive:true});for(let i=0;i<10;i++)fs.copyFileSync(path.join(OUT,id,'walk',String((10-i)%10).padStart(2,'0')+'.png'),path.join(back,String(i).padStart(2,'0')+'.png'));anims.walkBack.path=`assets/chars/cyber-v1/${id}/walkBack`;
  anims.land={...anims.jump,frames:{offset:8,count:2},physics:false,fps:30};
  for(const name of ['hit','fall','knockdown','ko'])anims[name]={...anims.idle};
  anims.getup={...anims.block,frames:{offset:8,count:4},fps:24};
  for(const a of Object.values(anims))Object.assign(a,{referenceHeight:250,canvasHeight:384,originX:210/512,originY:356/384});
  runtime[id]=anims;manifest.identities[id]=record;
 }
 const wolves=(await grid(path.join(OUT,'sheets/liequan-wolf.png'),2,5)).flat();if(wolves.length<10)throw Error('Ten wolf poses required');
 const scale=65/wolves[0].m.height;for(let i=0;i<10;i++)await save(wolves[Math.round(i*(wolves.length-1)/9)],path.join(OUT,'liequan/wolf',String(i).padStart(2,'0')+'.png'),scale,256,160,128,140);
 fs.writeFileSync(path.join(ROOT,'js/cyber-anims.js'),'// Generated by tools/build-cyber-roster.cjs\nconst CYBER_ANIMS='+JSON.stringify(runtime,null,2)+';\n');
 fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2));
 console.log('Installed three full character animation sets and ten wolf poses.');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={grid,save};
