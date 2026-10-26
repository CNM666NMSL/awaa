const fs=require('fs'),path=require('path'),{PNG}=require(process.env.PNGJS_PATH);const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/chars/jianke/movement');fs.mkdirSync(out,{recursive:true});const source=process.argv[2];fs.copyFileSync(source,path.join(out,'source.png'));const im=PNG.sync.read(fs.readFileSync(source));const seen=new Uint8Array(im.width*im.height),components=[];
for(let i=0;i<seen.length;i++){
 if(seen[i]||im.data[i*4+3]<80)continue;
 const q=[i];seen[i]=1;let minX=im.width,minY=im.height,maxX=0,maxY=0;
 for(let h=0;h<q.length;h++){
  const k=q[h],x=k%im.width,y=Math.floor(k/im.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
   const xx=x+dx,yy=y+dy,n=yy*im.width+xx;if(xx<0||xx>=im.width||yy<0||yy>=im.height||seen[n]||im.data[n*4+3]<80)continue;seen[n]=1;q.push(n);
  }
 }
 if(q.length>1000)components.push({minX,minY,maxX,maxY,w:maxX-minX+1,h:maxY-minY+1,pixels:q});
}
if(components.length!==16)throw Error('Expected 16 connected actors; got '+components.length);
components.sort((a,b)=>a.maxY-b.maxY);const rawCells=[];
for(let row=0;row<4;row++)rawCells.push(...components.slice(row*4,row*4+4).sort((a,b)=>a.minX-b.minX));

const cells=rawCells.map(c=>({pixels:c.pixels,x0:c.minX,x1:c.maxX,y0:c.minY,y1:c.maxY}));
const scale=240/(cells[0].y1-cells[0].y0+1),frames=cells.map(c=>{const p=new PNG({width:512,height:320}),keep=new Set(c.pixels);let sum=0,n=0;for(const k of c.pixels){const x=k%im.width,y=Math.floor(k/im.width),i=k*4;if(y>c.y0+(c.y1-c.y0)*.35&&y<c.y0+(c.y1-c.y0)*.8&&Math.max(...im.data.subarray(i,i+3))<95){sum+=x;n++;}}const anchor=n?sum/n:(c.x0+c.x1)/2;for(let y=0;y<320;y++)for(let x=0;x<512;x++){const xx=Math.floor((x-220)/scale+anchor),yy=Math.floor((y-296)/scale+c.y1+1),k=yy*im.width+xx;if(xx>=0&&xx<im.width&&keep.has(k))im.data.copy(p.data,(y*512+x)*4,k*4,k*4+4);}return PNG.sync.write(p)});
const actions={walk:{seq:[0,1,2,3,4,5,6,7],fps:14,loop:true},walkBack:{seq:[8,9,10,11],fps:10,loop:true},walkStart:{seq:[12,13],fps:15,loop:false},walkStop:{seq:[14,15],fps:15,loop:false}};const anims={};for(const [name,{seq,...props}]of Object.entries(actions)){const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});seq.forEach((k,i)=>fs.writeFileSync(path.join(dir,String(i).padStart(2,'0')+'.png'),frames[k]));anims[name]={path:'assets/chars/jianke/movement/'+name,frames:seq.length,canvasHeight:320,referenceHeight:240,originX:220/512,originY:296/320,...props};}fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(anims,null,2));fs.writeFileSync(path.join(root,'js/jianke-movement.js'),'Object.assign(CONFIG.characters.jianke.anims,'+JSON.stringify(anims,null,2)+');');console.log('Built 8 walk, 4 retreat, 2 start and 2 stop frames');