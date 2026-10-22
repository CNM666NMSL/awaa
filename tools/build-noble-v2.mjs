// Reproducible, manually reviewed sprite regions. No OCR labels enter these regions.
// Run build({ PNG: require('pngjs').PNG, jpeg: require('jpeg-js') }).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function build({PNG, jpeg}) {
 const out = path.join(root,'assets/chars/noble/v2');
 await fs.mkdir(out,{recursive:true});
 const read = async name => {
  const b=await fs.readFile(path.join(root,'assets/ref/noble/actions',name));
  if(name.endsWith('.png')){const im=PNG.sync.read(b);im.hasAlpha=true;return im;}
  return jpeg.decode(b,{useTArray:true});
 };
 // Flood only the exterior; dark interior clothing stays opaque.
 function extract(im, box, flip=false) {
  let [x0,y0,x1,y1]=box.map(Math.round); x0=Math.max(0,x0);y0=Math.max(0,y0);x1=Math.min(im.width,x1);y1=Math.min(im.height,y1);
  const w=x1-x0,h=y1-y0, a=new Uint8Array(w*h), seen=new Uint8Array(w*h),q=new Int32Array(w*h);
  const bg=[im.data[0],im.data[1],im.data[2]];let head=0,tail=0;
  const add=i=>{if(!seen[i]){seen[i]=1;q[tail++]=i;}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(head<tail){const i=q[head++],x=i%w,y=(i/w)|0,p=((y+y0)*im.width+x+x0)*4;
   if(im.hasAlpha ? im.data[p+3]>16 : im.data[p+3]>0 && Math.max(...bg.map((c,k)=>Math.abs(im.data[p+k]-c)))>20)continue;
   a[i]=1;if(x)add(i-1);if(x<w-1)add(i+1);if(y)add(i-w);if(y<h-1)add(i+w);
  }
  // Remove isolated arrows, tiny JPEG speckles, and disconnected guide fragments.
  seen.fill(0);const components=[];
  for(let i=0;i<w*h;i++){if(a[i]||seen[i])continue;head=0;tail=0;add(i);const pixels=[];
   while(head<tail){const j=q[head++];pixels.push(j);const x=j%w,y=(j/w)|0;
    for(const k of [x?j-1:-1,x<w-1?j+1:-1,y?j-w:-1,y<h-1?j+w:-1])if(k>=0&&!a[k])add(k);
   }components.push(pixels);
  }
  const max=Math.max(...components.map(c=>c.length),0);
  // A cell contains one fighter. Keep the main connected silhouette only;
  // loose neighboring capes, arrows and captions must never survive extraction.
  for(const c of components)if(c.length<max)for(const i of c)a[i]=1;
  const data=Buffer.alloc(w*h*4);let bounds=[w,h,0,0];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(a[i])continue;const tx=flip?w-1-x:x,p=(y*im.width+im.width*y0+x+x0)*4,d=(y*w+tx)*4;
   data[d]=im.data[p];data[d+1]=im.data[p+1];data[d+2]=im.data[p+2];data[d+3]=im.data[p+3];
   bounds=[Math.min(bounds[0],tx),Math.min(bounds[1],y),Math.max(bounds[2],tx+1),Math.max(bounds[3],y+1)];
  }return {width:w,height:h,data,bounds};
 }
 const actions={};const thumbs=[];
 async function save(name, frames, refHeight, fps=14, loop=false){
  const dir=path.join(out,name);await fs.mkdir(dir,{recursive:true});
  // One scale per action, never fit individual poses independently.
  const scale=228/refHeight;
  for(let n=0;n<frames.length;n++){
   const f=frames[n],p=new PNG({width:448,height:320});
   // Explicit per-pose floor and pelvis anchors prevent sword-length dependent jitter.
   const anchor=f.anchor??(f.bounds[0]+f.bounds[2])/2, floor=f.floor??f.bounds[3];
   for(let y=0;y<320;y++)for(let x=0;x<448;x++){
    const sx=Math.floor((x-208)/scale+anchor),sy=Math.floor((y-304)/scale+floor);
    if(sx<0||sx>=f.width||sy<0||sy>=f.height)continue;
    const s=(sy*f.width+sx)*4,d=(y*448+x)*4;f.data.copy(p.data,d,s,s+4);
   }
   await fs.writeFile(path.join(dir,`${String(n).padStart(2,'0')}.png`),PNG.sync.write(p));
   if(n===0||n===Math.floor(frames.length/2)||n===frames.length-1)thumbs.push(p);
  }
  actions[name]={frames:frames.length,path:`assets/chars/noble/v2/${name}`,fps,loop,referenceHeight:228,canvasHeight:320,originX:208/448};
 }
 async function row(file,name, y0,y1, xs, refHeight, options={}){
  const im=await read(file),sx=im.width/2048,sy=im.height/683;
  const frames=[];
  for(let i=0;i<xs.length-1;i++){
   const f=extract(im,[xs[i]*sx,y0*sy,xs[i+1]*sx,y1*sy],options.flip);
   if(options.anchor)f.anchor=(options.anchor[i]-xs[i])*sx;
   frames.push(f);
  }
  await save(name,frames,refHeight*sy,options.fps??14,!!options.loop);
 }
 const idleFrames=[];
 for(let i=0;i<8;i++){
  const idle=PNG.sync.read(await fs.readFile(path.join(root,'assets/chars/noble/idle',`${String(i).padStart(2,'0')}.png`)));idle.hasAlpha=true;
  const f=extract(idle,[0,0,idle.width,idle.height],true);
  idleFrames.push(f);
 }
 await save('idle',idleFrames,250,10,true);
 await row('02_attack_j.jpg','j1',230,442,[0,126,238,392,521,631,815,944,1090,1248,1320,1440,1550,1745,1842,1932,2048],166,{anchor:[72,181,302,456,583,701,860,991,1144,1253,1389,1505,1625,1780,1880,1994]});
 await row('04_skill_u.jpg','u',200,455,[0,108,240,378,515,676,850,1068,1325,1495,1628,1765,1900,2048],220,{anchor:[65,175,311,447,580,737,943,1180,1418,1555,1694,1850,1980]});
 await row('05_jump_block.jpg','jump',50,314,[0,109,239,370,500,640,772,912,1046,1186,1335,1470,1620,1765,1900,2048],158);
 await row('05_jump_block.jpg','block',441,608,[15,162,302,453,600,752,900,1054,1203,1355,1507,1713,1880,2048],158,{loop:false});
 await row('06_super_300.jpg','super_',120,287,[0,120,223,365,590,765,903,1038,1176,1310,1467,1768,1882,2048],190,{anchor:[75,171,278,470,703,850,989,1128,1260,1420,1597,1820,1970]});
 await row('08_launcher_wj_wu_airu.jpg','launcher',44,237,[0,130,250,365,500,632,775,914,1055,1200,1322,1450,1590,1730,1870,2048],160);
 await row('09_air_attack.jpg','airAttack',195,515,[0,118,234,356,535,708,935,1110,1345,1650,1785,1918,2048],166);
 await row('10_low_sj_su.jpg','low',180,326,[0,144,295,520,752,998,1234,1370,1534,1733,1880,2048],180);
 await row('12_hit_knockdown.jpg','hit',61,175,[17,195,373,535,690,842,1000,1167,1340,1507,1685,1865,2048],175-61,{fps:18});
 await row('12_hit_knockdown.jpg','knockdown',443,498,[0,236,456,699,922,1180,1450,1714,2048],175-61,{fps:12});
 await row('12_hit_knockdown.jpg','getup',531,656,[0,274,480,680,895,1090,1290,1500,1750,2048],175-61,{fps:16});
 // The generated sheet was inspected: it has 5+5 walk poses, then 4+4 poses per attack.
 const gen=await read('noble-inbetweens-v2.png');
 const g=(b)=>extract(gen,b.map((v,i)=>v*(i%2?gen.height/1087:gen.width/1447)));
 const walk=[];
 for(const [y0,y1] of [[0,197],[198,393]])for(const [x0,x1] of [[0,285],[300,590],[615,900],[915,1195],[1210,1447]])walk.push(g([x0,y0,x1,y1]));
 await save('walk',walk,193*gen.height/1087,16,true);
 const slashBoxes=[[0,394,325,567],[365,394,600,567],[640,394,1110,567],[1160,394,1447,567],[0,569,365,728],[375,569,740,728],[780,569,1115,728],[1145,569,1447,728]];
 const upperBoxes=[[0,730,315,904],[365,748,625,904],[725,730,1103,904],[1110,730,1447,904],[0,905,315,1087],[365,905,670,1087],[740,905,1065,1087],[1100,905,1447,1087]];
 const anchored=(boxes,anchors)=>boxes.map((b,i)=>{const f=g(b);f.anchor=(anchors[i]-b[0])*gen.width/1447;return f;});
 const slash=anchored(slashBoxes,[145,490,790,1300,145,510,950,1280]);
 slash[7]=slash[0]; // final guard; reject a neighboring effect at the old cell edge.
 await save('j2',slash,193*gen.height/1087,24);
 await save('j3',anchored(upperBoxes,[145,525,850,1270,140,490,870,1260]),193*gen.height/1087,24);
 // Additional clean, painted anticipation/contact/recovery frames.
 const thrust=await read('noble-thrust-clean-v2.png');
 const thrustBoxes=[
  [45,0,286,258,180],[450,25,700,258,565],[817,20,1180,258,952],[1190,20,1536,258,1334],
  [0,272,503,510,214],[505,272,726,510,596],[839,272,1137,510,994],[1215,258,1485,510,1366],
  [40,520,290,764,175],[391,521,718,764,571],[740,545,1123,764,964],[1130,530,1536,764,1318],
  [8,780,467,1024,200],[470,780,887,1024,609],[840,780,1185,1024,996],[1208,768,1479,1024,1360]
 ];
 const tf=thrustBoxes.map(b=>{const f=extract(thrust,b.slice(0,4).map((v,i)=>v*(i%2?thrust.height/1024:thrust.width/1536)));f.anchor=(b[4]-b[0])*thrust.width/1536;return f;});
 await save('j1',tf.slice(0,8),240*thrust.height/1024,24);
 await save('u',tf.slice(8),240*thrust.height/1024,24);
 const defense=await read('noble-defense-v2.png');
 const df=[];
 const defenseRows=[[[0,235,420,596,767,955,1150,1354,1536],0,334],[[0,400,790,1160,1536],340,672],[[0,390,777,1160,1536],680,1024]];
 for(const [xs,y0,y1] of defenseRows)for(let c=0;c<xs.length-1;c++)df.push(extract(defense,[xs[c]*defense.width/1536,y0*defense.height/1024,xs[c+1]*defense.width/1536,y1*defense.height/1024]));
 const ref=df[0].bounds[3]-df[0].bounds[1];
 await save('jump',df.slice(0,8),ref,20);
 await save('block',df.slice(8,12),ref,20);
 await save('hit',df.slice(12),ref,24);
 const lowAir=await read('noble-low-air-v2.png');
 const lowAirBoxes=[
  [0,0,380,258,165],[420,70,765,258,566],[780,45,1060,258,930],[1125,45,1536,258,1330],
  [40,300,490,512,220],[495,300,790,512,605],[810,275,1150,512,960],[1180,258,1490,512,1345],
  [0,512,365,768,160],[460,512,715,768,580],[785,512,1055,768,947],[1180,512,1536,768,1333],
  [0,768,375,1024,160],[415,768,775,1024,575],[800,768,1115,1024,942],[1170,768,1536,1024,1320]
 ];
 const lf=lowAirBoxes.map(b=>{const f=extract(lowAir,b.slice(0,4).map((v,i)=>v*(i%2?lowAir.height/1024:lowAir.width/1536)));f.anchor=(b[4]-b[0])*lowAir.width/1536;return f;});
 await save('low',lf.slice(0,8),240*lowAir.height/1024,24);
 await save('airAttack',lf.slice(8),240*lowAir.height/1024,24);
 actions.launcher={...actions.j3};actions.super_={...actions.j1,activeLoop:true};
 actions.dash={...actions.u,frames:{offset:2,count:6},fps:32,loop:false};
 actions.dashAttack={...actions.u};actions.parry={...actions.block};actions.parryCounter={...actions.j1};
 actions.charge={...actions.idle};actions.ko={...actions.knockdown};
 for(const name of ['j1','j2','j3','launcher','airAttack','low','dashAttack','parryCounter','super_'])actions[name].phases=[3,5];
 actions.u.fitState=true;
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({character:'noble',actions},null,2));
 // Preview only the final clips, never discarded intermediate extractions.
 thumbs.length=0;
 for(const name of ['idle','walk','j1','j2','j3','u','jump','block','hit','low','airAttack','knockdown','getup']){
  const a=actions[name];for(const i of [0,Math.floor(a.frames/2),a.frames-1])thumbs.push(PNG.sync.read(await fs.readFile(path.join(root,a.path,`${String(i).padStart(2,'0')}.png`))));
 }
 const grid=new PNG({width:448*3,height:320*Math.ceil(thumbs.length/3)});
 thumbs.forEach((t,i)=>{for(let y=0;y<320;y++)t.data.copy(grid.data,((Math.floor(i/3)*320+y)*grid.width+(i%3)*448)*4,y*448*4,(y+1)*448*4);});
 await fs.writeFile(path.join(root,'tools/noble-v2-contact-sheet.png'),PNG.sync.write(grid));
 return actions;
}
