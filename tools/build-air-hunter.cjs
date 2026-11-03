const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/Lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root='assets/chars/air-hunter-v1',src=root+'/sources';
async function sheet(name,cols,rows,threshold=30){
 const file=src+'/'+name+'.png',m=await sharp(file).metadata(),raw=await sharp(file).ensureAlpha().raw().toBuffer(),keys=[];
 if(['motong','hunter','guardian','jianke','noble'].includes(name)){
  const labels=new Int32Array(m.width*m.height),stack=new Int32Array(labels.length),parts=[];
  for(let i=0;i<labels.length;i++){if(labels[i]||raw[i*4+3]<threshold)continue;const id=parts.length+1;let tail=1,n=0,x0=m.width,y0=m.height,x1=0,y1=0;stack[0]=i;labels[i]=id;
   while(tail){const p=stack[--tail],x=p%m.width,y=Math.floor(p/m.width);n++;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*m.width+xx;if(xx<0||xx>=m.width||yy<0||yy>=m.height||labels[q]||raw[q*4+3]<threshold)continue;labels[q]=id;stack[tail++]=q;}}
   parts.push({id,n,x0,y0,x1,y1});}
  const main=parts.sort((a,b)=>b.n-a.n).slice(0,cols*rows).sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1)),ordered=[];for(let r=0;r<rows;r++)ordered.push(...main.slice(r*cols,r*cols+cols).sort((a,b)=>a.x0-b.x0));console.log(name,ordered.map(p=>[p.n,p.x0,p.y0,p.x1,p.y1]));
  for(const p of ordered){const w=p.x1-p.x0+1,h=p.y1-p.y0+1,body=Buffer.alloc(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const q=(y+p.y0)*m.width+x+p.x0;if(labels[q]===p.id)raw.copy(body,(y*w+x)*4,q*4,q*4+4);}const head=name==='hunter'&&keys.length>=12,scale=head?Math.min(590/w,320/h):Math.min(250/(m.height/rows*.9),570/w,330/h),ww=Math.round(w*scale),hh=Math.round(h*scale);keys.push(await sharp({create:{width:640,height:384,channels:4,background:'#00000000'}}).composite([{input:await sharp(body,{raw:{width:w,height:h,channels:4}}).resize(ww,hh).png().toBuffer(),left:Math.round((640-ww)/2),top:head?Math.round((384-hh)/2):356-hh}]).png().toBuffer());}return keys;
 }
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const l=Math.round(col*m.width/cols),t=Math.round(row*m.height/rows),w=Math.round((col+1)*m.width/cols)-l,h=Math.round((row+1)*m.height/rows)-t;
  const labels=new Int32Array(w*h),stack=new Int32Array(w*h),parts=[];
  for(let i=0;i<labels.length;i++){if(labels[i]||raw[((t+Math.floor(i/w))*m.width+l+i%w)*4+3]<threshold)continue;
   const id=parts.length+1;let count=0,tail=1,x0=w,y0=h,x1=0,y1=0;labels[i]=id;stack[0]=i;
   while(tail){const p=stack[--tail],x=p%w,y=Math.floor(p/w);count++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,q=yy*w+xx;if(xx<0||xx>=w||yy<0||yy>=h||labels[q])continue;if(raw[((t+yy)*m.width+l+xx)*4+3]>=threshold){labels[q]=id;stack[tail++]=q;}}
   }parts.push({id,count,x0,x1,y0,y1});
  }
  const part=parts.sort((a,b)=>b.count-a.count)[0];if(!part||part.count<500)throw Error('Missing silhouette '+name+' '+row+','+col);
  const bw=part.x1-part.x0+1,bh=part.y1-part.y0+1,body=Buffer.alloc(bw*bh*4);
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){if(labels[(y+part.y0)*w+x+part.x0]!==part.id)continue;const p=((t+part.y0+y)*m.width+l+part.x0+x)*4;raw.copy(body,(y*bw+x)*4,p,p+4);}
  const head=name==='hunter'&&row===3,scale=head?Math.min(590/bw,320/bh):Math.min(280/(h*.86),570/bw,330/bh),ww=Math.round(bw*scale),hh=Math.round(bh*scale);
  const resized=await sharp(body,{raw:{width:bw,height:bh,channels:4}}).resize(ww,hh).png().toBuffer();
  keys.push(await sharp({create:{width:640,height:384,channels:4,background:'#00000000'}}).composite([{input:resized,left:Math.round((640-ww)/2),top:head?Math.round((384-hh)/2):356-hh}]).png().toBuffer());
 }
 return keys;
}
async function clip(name,keys,poses,n=12){fs.mkdirSync(root+'/'+name,{recursive:true});for(let i=0;i<n;i++)await sharp(keys[poses[Math.min(poses.length-1,Math.floor(i/n*poses.length))]]).png().toFile(root+'/'+name+'/'+String(i).padStart(2,'0')+'.png');}
(async()=>{
 for(const name of ['jianke','noble','motong'])await clip(name+'/rush',await sheet(name,2,2,name==='jianke'?200:30),[0,1,2,3]);
 const guardian=await sheet('guardian',4,2);await clip('armored/rush',guardian,[0,1,2,3]);await clip('unarmored/rush',guardian,[4,5,6,7]);
 const h=await sheet('hunter',4,4);
 for(const [name,poses]of Object.entries({stock1:[0,1,1,2],stock2:[2,3,3,2],stock3:[2,4,4,7],fire:[4,5,5,7],sweep:[2,6,6,7],call:[7,11,11,7],dive:[8,8,9,10],super:[7,11,11,7]}))await clip('liequan/'+name,h,poses,name==='super'?25:12);
 await clip('wolf-head',h,[12,13,14,15]);
 const all=[...guardian,...h];fs.mkdirSync('artifacts/air-hunter',{recursive:true});await sharp({create:{width:1280,height:1152,channels:4,background:'#27313b'}}).composite(await Promise.all(all.map(async(input,i)=>({input:await sharp(input).resize(320,192).png().toBuffer(),left:i%4*320,top:Math.floor(i/4)*192})))).png().toFile('artifacts/air-hunter/poses.png');
 console.log('Built clean aerial and hunter pose clips without body crossfades.');
})().catch(e=>{console.error(e);process.exitCode=1;});
