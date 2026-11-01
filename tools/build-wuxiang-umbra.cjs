const fs=require('node:fs'),path=require('node:path');
let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
(async()=>{
 const out='assets/chars/wuxiang-umbra-v2',src=process.argv[2]||out+'/source-sheet.png';fs.mkdirSync(out,{recursive:true});if(path.resolve(src)!==path.resolve(out+'/source-sheet.png'))fs.copyFileSync(src,out+'/source-sheet.png');
 const meta=await sharp(src).metadata(),cw=meta.width/4,ch=meta.height/4,keys=[];
 const rgba=await sharp(src).ensureAlpha().raw().toBuffer(),labels=new Int32Array(meta.width*meta.height),stack=new Int32Array(labels.length),parts=[];
 for(let start=0;start<labels.length;start++){if(labels[start]||rgba[start*4+3]<4)continue;const id=parts.length+1;let tail=1,n=0,x0=meta.width,y0=meta.height,x1=0,y1=0,sx=0,sy=0;stack[0]=start;labels[start]=id;
  while(tail){const p=stack[--tail],x=p%meta.width,y=Math.floor(p/meta.width);n++;sx+=x;sy+=y;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=meta.width||yy<0||yy>=meta.height)continue;const q=yy*meta.width+xx;if(!labels[q]&&rgba[q*4+3]>=4){labels[q]=id;stack[tail++]=q;}}
  }parts.push({id,n,x0,y0,x1,y1,cx:sx/n,cy:sy/n});
 }
 const main=parts.filter(p=>p.n>2000).sort((a,b)=>b.n-a.n).slice(0,16).sort((a,b)=>a.cy-b.cy),ordered=[];
 console.log('Main sprite components',main.map(p=>({id:p.id,n:p.n,box:[p.x0,p.y0,p.x1,p.y1]})));
 if(process.argv.includes('--inspect'))return;
 if(main.length!==16)throw Error('Expected sixteen complete silhouettes');
 for(let r=0;r<4;r++)ordered.push(...main.slice(r*4,r*4+4).sort((a,b)=>a.cx-b.cx));
 const anchors=[[.50,.35,.45,.55],[.34,.34,.51,.52],[.52,.52,.50,.53],[.42,.48,.50,.54]];
 const feet=[[.99,.99,.99,.99],[.82,.82,.99,.99],[.99,.96,.96,.90],[.99,.99,.99,.99]];
 // One shared scale, rather than resizing each silhouette including its weapon to the same height.
 const scale=250/(ch*.78);
 for(let r=0;r<4;r++)for(let c=0;c<4;c++){
  const part=ordered[r*4+c],left=part.x0,top=part.y0,width=part.x1-left+1,height=part.y1-top+1,cell=Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y+top)*meta.width+x+left;if(labels[p]===part.id)rgba.copy(cell,(y*width+x)*4,p*4,p*4+4);}
  const buf=await sharp(cell,{raw:{width,height,channels:4}}).resize(Math.round(width*scale),Math.round(height*scale)).png().toBuffer();
  const anchorX=c*cw+cw*anchors[r][c]-left;
  const x=Math.round(320-anchorX*scale),y=Math.round(356-height*scale);
  keys[r*4+c]=await sharp({create:{width:640,height:384,channels:4,background:'#00000000'}}).composite([{input:buf,left:x,top:y}]).png().toBuffer();
 }
 const clips={handle:[12,[0,0,1,15]],upper:[12,[1,2,3,15]],slide:[16,[4,4,5,15]],'gun-reload':[20,[6,6,7,15]],reload:[12,[7,7,15,15]],guard:[1,[8]],glide:[12,[9,9,9,9]],'air-shot':[12,[10,10,10,9]],dive:[12,[11,11,11,11]],sweep:[12,[13,13,13,15]],execution:[25,[12,12,6,7]],burst:[25,[2,14,14,15]],rain:[12,[8,14,14,15]]};
 for(const [name,[n,poses]]of Object.entries(clips)){fs.mkdirSync(out+'/'+name,{recursive:true});for(let i=0;i<n;i++){
  const idx=Math.min(poses.length-1,Math.floor(i/n*poses.length));let im=sharp(keys[poses[idx]]);
  // No alpha crossfades: one clean body per frame, with small articulated anticipation in the pose sequence.
  if(name==='glide')im=im.rotate(Math.sin(i/n*Math.PI*2)*.7,{background:'#00000000'}).resize(640,384,{fit:'contain',background:'#00000000'});
  await im.png().toFile(out+'/'+name+'/'+String(i).padStart(2,'0')+'.png');
 }}
 const tiles=await Promise.all(keys.map(async(input,i)=>({input:await sharp(input).resize(320,192).png().toBuffer(),left:i%4*320,top:Math.floor(i/4)*192})));
 fs.mkdirSync('artifacts/wuxiang-umbra',{recursive:true});await sharp({create:{width:1280,height:768,channels:4,background:'#26313e'}}).composite(tiles).png().toFile('artifacts/wuxiang-umbra/poses.png');
 console.log('Generated 13 clean pose clips, 40 FPS, no crossfade ghost bodies');
})().catch(e=>{console.error(e);process.exitCode=1});
