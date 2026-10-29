'use strict';
// Reference preparation and installation of AI-drawn animation inbetweens.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const { createCanvas, loadImage } = require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets/chars/expanded-v1');
const context = {};
vm.createContext(context);
for (const file of ['config', 'jianke-anims', 'jianke-movement', 'jianke-walk', 'shouwang-anims', 'mobility-anims', 'combat-v2-config']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', file + '.js'), 'utf8'), context);
}
vm.runInContext('globalThis.characters = CONFIG.characters', context);
const CONFIG_DASH_FRAMES = vm.runInContext('CONFIG.physics.dashFrames', context);
const IDENTITIES = { noble: ['noble', null], jianke: ['jianke', null], armored: ['shouwang', 'armored'], unarmored: ['shouwang', 'unarmored'] };
const BASIC = ['idle', 'walk', 'run', 'jump', 'dash', 'j1', 'j2', 'j3', 'j4', 'low', 'dashAttack', 'airAttack'];
const SKILLS = ['block', 'charge', 'uCharge', 'u', 'uCharged', 'superLunge', 'superWave'];
const ALIASES = {walkBack:'walk',doubleJump:'jump',airMove:'jump',launcher:'j3',parry:'block',parryCounter:'j1'};
function count(a) { return Array.isArray(a.frames) ? a.frames[1] - a.frames[0] + 1 : typeof a.frames === 'object' ? a.frames.count : a.frames; }
function offset(a) { return Array.isArray(a.frames) ? a.frames[0] : typeof a.frames === 'object' ? a.frames.offset || 0 : 0; }
function files(a, form) { return Array.from({length:count(a)}, (_,i)=>path.join(ROOT,a.path.replace('{form}',form||''),String(i+offset(a)).padStart(2,'0')+'.png')); }
async function reference(identity, category, actions) {
  const [id,form] = IDENTITIES[identity], d = context.characters[id];
  const cw=384,ch=260,columns=3,canvas=createCanvas(cw*columns,ch*actions.length),ctx=canvas.getContext('2d');
  ctx.fillStyle='#29313a';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.font='17px sans-serif';
  for(let row=0;row<actions.length;row++) {
    const name=actions[row],a=d.anims[name]||d.anims[ALIASES[name]]||d.anims.u,ff=files(a,form);
    for(let col=0;col<columns;col++) {
      const ix=Math.round(col*(ff.length-1)/(columns-1)),im=await loadImage(ff[ix]);
      const scale=Math.min((cw-12)/im.width,(ch-32)/im.height);
      ctx.drawImage(im,col*cw+(cw-im.width*scale)/2,row*ch+28,im.width*scale,im.height*scale);
      ctx.fillStyle='#fff';ctx.fillText(`${row+1}: ${name} / ${ix+1} of ${ff.length}`,col*cw+8,row*ch+21);
    }
  }
  const filename=path.join(OUT,'references',`${identity}-${category}.png`);
  fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,canvas.toBuffer('image/png'));
  return filename;
}
async function prepare() {
  fs.mkdirSync(OUT,{recursive:true});
  const plan={identities:{},targets:{basic:10,skill:12,super:25},source:'gitee/main',clips:{}};
  for(const [identity,[id,form]] of Object.entries(IDENTITIES)) {
    const d=context.characters[id];
    plan.identities[identity]={id,form};
    plan.clips[identity]={};
    for(const name of [...BASIC,...SKILLS,...Object.keys(ALIASES),'super_']) {
      const a=d.anims[name];if(!a)continue;
      const target=name==='super_'?25:(SKILLS.includes(name)||name==='parry')?12:10;
      const n=count(a);if(n>=target)continue;
      plan.clips[identity][name]={original:a,sourceFiles:files(a,form).map(p=>path.relative(ROOT,p).replace(/\\/g,'/')),sourceCount:n,target,group:ALIASES[name]||name};
    }
    await reference(identity,'basic',BASIC);
    await reference(identity,'skills',SKILLS);
    await reference(identity,'super',['super_']);
    console.log(identity, Object.entries(plan.clips[identity]).map(([k,a])=>`${k}:${a.sourceCount}->${a.target}`).join(' '));
  }
  fs.writeFileSync(path.join(OUT,'plan.json'),JSON.stringify(plan,null,2));
}
async function importSheets() {
  const jobs=JSON.parse(fs.readFileSync(path.join(OUT,'generation-jobs.json')));
  fs.mkdirSync(path.join(OUT,'sheets'),{recursive:true});
  for(const j of jobs) {
    const dest=path.join(OUT,'sheets',`${j.identity}-${j.category}.png`);
    fs.copyFileSync(j.path,dest);
    const {data,info}=await sharp(dest).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let clear=0;for(let i=3;i<data.length;i+=4)if(data[i]<10)clear++;
    console.log(`${j.identity}-${j.category} ${info.width}x${info.height} transparent:${(100*clear/(info.width*info.height)).toFixed(1)}%`);
  }
}
function spans(values,threshold,minLength=1,gap=4) {
  const result=[];let start=-1,last=-1;
  for(let i=0;i<values.length;i++)if(values[i]>threshold){if(start<0)start=i;last=i;}else if(start>=0&&i-last>gap){if(last-start+1>=minLength)result.push([start,last+1]);start=-1;}
  if(start>=0&&last-start+1>=minLength)result.push([start,last+1]);return result;
}
async function readSheet(filename) {
  const {data,info}=await sharp(filename).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Remove low-alpha matting and bright red/magenta spill, not the dark red costume.
  for(let i=0;i<data.length;i+=4){const red=data[i]>205&&data[i]>data[i+1]*2.5&&data[i]>data[i+2]*1.6;if(data[i+3]<100||red)data[i+3]=0;}
  const ys=new Array(info.height).fill(0);
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>160)ys[y]++;
  const rows=spans(ys,Math.max(...ys)*.18,30,7);
  return {data,info,rows};
}
async function analyzeSheets() {
  const jobs=JSON.parse(fs.readFileSync(path.join(OUT,'generation-jobs.json')));
  for(const j of jobs){const {data,info,rows}=await readSheet(path.join(OUT,'sheets',`${j.identity}-${j.category}.png`));const cols=rows.map(([top,bottom])=>{const xs=new Array(info.width).fill(0);for(let y=top;y<bottom;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>160)xs[x]++;return spans(xs,(bottom-top)*.18,12,4);});console.log(j.identity+'-'+j.category,JSON.stringify(cols.map(c=>c.length)),JSON.stringify(cols[0]));}
}
function metrics(data,width,height) {
  const ys=new Array(height).fill(0);let left=width,right=0,top=height,bottom=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>140){ys[y]++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const solid=ys.map((n,y)=>n>=Math.max(4,width*.012)?y:-1).filter(y=>y>=0);
  if(!solid.length)throw Error('Empty animation frame');
  const head=solid[0],feet=solid.at(-1);let sum=0,weight=0;
  for(let y=Math.max(head,feet-Math.max(5,Math.round((feet-head)*.1)));y<=feet;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>140){sum+=x;weight++;}
  return {left,right,top,bottom,head,feet,height:feet-head+1,footX:sum/Math.max(1,weight)};
}
function removeAdjacentFragments(data,width,height) {
  const seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let largest=[];
  for(let start=0;start<seen.length;start++){
    if(seen[start]||data[start*4+3]<100)continue;
    let head=0,tail=1;queue[0]=start;seen[start]=1;
    while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;const j=ny*width+nx;if(!seen[j]&&data[j*4+3]>=100){seen[j]=1;queue[tail++]=j;}}}
    if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));
  }
  const keep=new Uint8Array(width*height);for(const i of largest)keep[i]=1;
  for(let i=0;i<keep.length;i++)if(!keep[i])data[i*4+3]=0;
}
async function cellsFor(identity,category) {
  const {data,info,rows}=await readSheet(path.join(OUT,'sheets',`${identity}-${category}.png`));
  const grid=[];
  for(let r=0;r<rows.length;r++) {
    const [bodyTop,bodyBottom]=rows[r];
    const top=r===0?0:Math.floor((rows[r-1][1]+bodyTop)/2);
    const bottom=r===rows.length-1?Math.min(info.height,bodyBottom+12):Math.ceil((bodyBottom+rows[r+1][0])/2);
    const xs=new Array(info.width).fill(0);
    for(let y=bodyTop;y<bodyBottom;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>160)xs[x]++;
    let bands=spans(xs,(bodyBottom-bodyTop)*.18,12,4);
    const widths=bands.map(b=>b[1]-b[0]).sort((a,b)=>a-b),median=widths[Math.floor(widths.length/2)];
    bands=bands.filter(b=>b[1]-b[0]>=median*.48);
    if(category==='super')bands=Array.from({length:5},(_,i)=>[i*info.width/5,(i+1)*info.width/5]);
    const centers=bands.map(b=>(b[0]+b[1])/2),cells=[];
    for(let col=0;col<centers.length;col++) {
      const extra=info.width/centers.length*.26;
      const left=col===0?0:Math.max(0,Math.floor((bands[col-1][1]+bands[col][0])/2-extra));
      const right=col===centers.length-1?info.width:Math.min(info.width,Math.ceil((bands[col][1]+bands[col+1][0])/2+extra));
      const raw=await sharp(data,{raw:info}).extract({left,top,width:right-left,height:bottom-top}).raw().toBuffer();
      removeAdjacentFragments(raw,right-left,bottom-top);
      cells.push({data:raw,width:right-left,height:bottom-top,row:r,column:col});
    }
    grid.push(cells);
  }
  return grid;
}
function groupRow(identity,group,grids) {
  if(BASIC.indexOf(group)<6&&BASIC.includes(group))return grids['basic-a'][BASIC.indexOf(group)];
  if(BASIC.includes(group)){
    let row=BASIC.indexOf(group)-6;
    if(grids['basic-b'].length===5){if(group==='dashAttack')return grids['basic-a'][4];row=group==='airAttack'?4:Math.min(row,3);}
    return grids['basic-b'][row];
  }
  if(SKILLS.includes(group)){
    let row=SKILLS.indexOf(group);
    if(identity==='jianke'&&grids.skills.length===6){if(group==='uCharge')return grids.skills[0];if(row>5)row=5;}
    return grids.skills[row];
  }
  if(group==='super_')return grids.super.flat();
  throw Error('Unknown action '+group);
}
async function registered(cell,reference) {
  const src=await sharp(reference).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const anchor=metrics(src.data,src.info.width,src.info.height),m=metrics(cell.data,cell.width,cell.height);
  const crop={left:m.left,top:m.top,width:m.right-m.left+1,height:m.bottom-m.top+1};
  const scale=Math.min(anchor.height/m.height,(src.info.width-4)/crop.width,(src.info.height-4)/crop.height);
  const w=Math.max(1,Math.round(crop.width*scale)),h=Math.max(1,Math.round(crop.height*scale));
  const image=await sharp(cell.data,{raw:{width:cell.width,height:cell.height,channels:4}}).extract(crop).resize(w,h,{kernel:'nearest'}).png().toBuffer();
  const left=Math.max(1,Math.min(src.info.width-w-1,Math.round(anchor.footX-(m.footX-m.left)*scale)));
  const top=Math.max(1,Math.min(src.info.height-h-1,Math.round(anchor.feet-(m.feet-m.top)*scale)));
  return sharp({create:{width:src.info.width,height:src.info.height,channels:4,background:'#00000000'}}).composite([{input:image,left,top}]).png().toBuffer();
}
async function install() {
  const plan=JSON.parse(fs.readFileSync(path.join(OUT,'plan.json'))),runtime={},manifest={version:1,targets:plan.targets,identities:{},generator:'built-in image_gen; original key poses retained with newly drawn inbetweens'};
  let inserted=0,total=0;
  for(const [identity,clips]of Object.entries(plan.clips)) {
    const [id,form]=IDENTITIES[identity],grids={};
    for(const cat of ['basic-a','basic-b','skills','super'])grids[cat]=await cellsFor(identity,cat);
    manifest.identities[identity]={};runtime[id]||={};
    for(const [name,clip]of Object.entries(clips)) {
      const target=clip.target,source=clip.sourceFiles,keys=new Map(),generated=groupRow(identity,clip.group,grids),out=path.join(OUT,identity,name);
      fs.mkdirSync(out,{recursive:true});
      for(let i=0;i<source.length;i++) {
        let slot=source.length===1?0:Math.round(i*(target-1)/(source.length-1));
        // Preserve actual contact/recovery drawings at the new ultimate phase boundaries.
        if(name==='super_'&&clip.original.phases){const [contact,recovery]=clip.original.phases;slot=i<contact?Math.round(i*7/Math.max(1,contact-1)):i<recovery?8+Math.round((i-contact)*10/Math.max(1,recovery-contact-1)):19+Math.round((i-recovery)*5/Math.max(1,source.length-recovery-1));}
        keys.set(slot,i);
      }
      const provenance=[];let previousGenerated=-1,remaining=target-source.length;
      if(generated.length<remaining)throw Error(`${identity}/${name}: not enough distinct new poses`);
      for(let i=0;i<target;i++) {
        const dest=path.join(out,String(i).padStart(2,'0')+'.png');
        if(keys.has(i)){fs.copyFileSync(path.join(ROOT,source[keys.get(i)]),dest);provenance.push({kind:'original',source:source[keys.get(i)]});}
        else{const gi=Math.min(generated.length-remaining,Math.max(previousGenerated+1,Math.round(i*(generated.length-1)/(target-1)))),cell=generated[gi],nearest=Math.round(i*(source.length-1)/(target-1));previousGenerated=gi;remaining--;fs.writeFileSync(dest,await registered(cell,path.join(ROOT,source[nearest])));provenance.push({kind:'drawn',row:cell.row,column:cell.column,group:clip.group});inserted++;}
      }
      const a={...clip.original,frames:target,path:`assets/chars/expanded-v1/${form?'{form}':identity}/${name}`,expandedFrom:clip.sourceCount};
      const remap=i=>Math.max(0,Math.min(target-1,Math.round(i*(target-1)/Math.max(1,clip.sourceCount-1))));
      if(a.phases)a.phases=a.phases.map(remap);
      if(a.contact!==undefined)a.contact=remap(a.contact);
      if(name==='super_'){a.phases=[8,19];a.activeLoop=false;a.fps=12;}
      else if(name==='block'||name==='parry'){a.fps=18;a.loop=false;}
      else if(name==='charge'||name==='uCharge'){a.fps=12;a.loop=false;}
      else if(name==='dash')a.fps=Math.ceil(target*60/CONFIG_DASH_FRAMES);
      else if(a.loop)a.fps=Math.round(clip.original.fps*target/clip.sourceCount);
      if(name==='idle')a.fps=Math.min(a.fps,12);
      runtime[id][name]=a;manifest.identities[identity][name]={frames:target,originalFrames:source.length,newDrawings:target-source.length,files:provenance};total+=target;
    }
    console.log(`${identity}: ${Object.keys(clips).length} expanded clips`);
  }
  const config=`// Generated clip metadata. Source drawings and provenance: assets/chars/expanded-v1/.\n(()=>{\nconst expanded=${JSON.stringify(runtime,null,2)};\nfor(const id of CONFIG.roster){const d=CONFIG.characters[id];Object.assign(d.anims,expanded[id]);Object.assign(d.super_,{startup:40,active:d.super_.multiHit?56:40,recovery:45,...(d.super_.multiHit?{interval:8}:{}),fixedAnimationTiming:true});}\n})();\n`;
  fs.writeFileSync(path.join(ROOT,'js/expanded-anims.js'),config);
  manifest.totalFrames=total;manifest.newDrawings=inserted;fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log(`Installed ${total} frames including ${inserted} newly drawn inbetweens`);
}
if(require.main===module) {
  if(process.argv[2]==='prepare')prepare().catch(e=>{console.error(e);process.exitCode=1;});
  if(process.argv[2]==='import')importSheets().catch(e=>{console.error(e);process.exitCode=1;});
  if(process.argv[2]==='analyze')analyzeSheets().catch(e=>{console.error(e);process.exitCode=1;});
  if(process.argv[2]==='install')install().catch(e=>{console.error(e);process.exitCode=1;});
}
module.exports={ROOT,OUT,IDENTITIES,BASIC,SKILLS,ALIASES,count,offset,files,context,sharp,readSheet,spans,metrics,removeAdjacentFragments};
