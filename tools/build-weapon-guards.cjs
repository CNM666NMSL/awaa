const fs=require('node:fs');
const sharp=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out='assets/chars/weapon-guards-v1',names=['noble','jianke','armored','unarmored','motong','liequan'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});if(process.argv[2])fs.copyFileSync(process.argv[2],out+'/source-atlas.png');
 const file=out+'/source-atlas.png',m=await sharp(file).metadata(),keys=[];
 const all=await sharp(file).ensureAlpha().raw().toBuffer(),labels=new Int32Array(m.width*m.height),stack=new Int32Array(labels.length),parts=[];
 for(let s=0;s<labels.length;s++){if(labels[s]||all[s*4+3]<200)continue;const id=parts.length+1;let tail=1,n=0,x0=m.width,y0=m.height,x1=0,y1=0;stack[0]=s;labels[s]=id;while(tail){const p=stack[--tail],x=p%m.width,y=Math.floor(p/m.width);n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*m.width+xx;if(xx<0||xx>=m.width||yy<0||yy>=m.height||labels[q]||all[q*4+3]<200)continue;labels[q]=id;stack[tail++]=q;}}parts.push({id,n,x0,x1,y0,y1});}
 const main=parts.sort((a,b)=>b.n-a.n).slice(0,6).sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1)),ordered=[...main.slice(0,3).sort((a,b)=>a.x0-b.x0),...main.slice(3).sort((a,b)=>a.x0-b.x0)];console.log(ordered.map(p=>[p.n,p.x0,p.y0,p.x1,p.y1]));if(ordered.some(p=>p.n<2000))throw Error('Missing full guard silhouette');
 for(let i=0;i<6;i++){
  const p=ordered[i],width=p.x1-p.x0+1,height=p.y1-p.y0+1,raw=Buffer.alloc(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const q=(p.y0+y)*m.width+p.x0+x;if(labels[q]===p.id)all.copy(raw,(y*width+x)*4,q*4,q*4+4);}const x0=0,y0=0,x1=width-1,y1=height-1;
  // Body heights measured from head/hat crown to sole, excluding an elevated weapon tip.
  const bw=x1-x0+1,bh=y1-y0+1,bodyTop=[0,0,.12,0,0,0][i],scale=Math.min(250/(bh*(1-bodyTop)),570/bw,335/bh),w=Math.round(bw*scale),h=Math.round(bh*scale);
  const sprite=await sharp(raw,{raw:{width,height,channels:4}}).extract({left:x0,top:y0,width:bw,height:bh}).resize(w,h).png().toBuffer();
  const frame=await sharp({create:{width:640,height:384,channels:4,background:'#00000000'}}).composite([{input:sprite,left:Math.round(320-w/2),top:356-h}]).png().toBuffer();
  fs.mkdirSync(out+'/'+names[i],{recursive:true});fs.writeFileSync(out+'/'+names[i]+'/00.png',frame);keys.push(frame);
 }
 fs.mkdirSync('artifacts/weapon-guards',{recursive:true});await sharp({create:{width:960,height:384,channels:4,background:'#25323a'}}).composite(await Promise.all(keys.map(async(input,i)=>({input:await sharp(input).resize(320,192).png().toBuffer(),left:i%3*320,top:Math.floor(i/3)*192})))).png().toFile('artifacts/weapon-guards/poses.png');console.log('Built six steady, weapon-specific guard sprites.');
})().catch(e=>{console.error(e);process.exitCode=1;});
