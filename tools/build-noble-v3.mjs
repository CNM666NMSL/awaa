import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE=path.join(ROOT,'assets/ref/noble/v3');
const OUT=path.join(ROOT,'assets/chars/noble/v3');
const W=640,H=448,AX=272,FLOOR=416,BODY=288;
export async function build({PNG}) {
    await fs.mkdir(OUT,{recursive:true});
    const read=async file=>PNG.sync.read(await fs.readFile(path.join(SOURCE,file+'.png')));
    function cropActor(im,box){
        const [bx0,by0,bx1,by1]=box;
        const x0=Math.max(0,Math.round(bx0-100)),y0=Math.max(0,Math.round(by0));
        const x1=Math.min(im.width,Math.round(bx1+100)),y1=Math.min(im.height,Math.round(by1));
        const w=x1-x0,h=y1-y0,seen=new Uint8Array(w*h),queue=new Int32Array(w*h),components=[];
        const opaque=i=>{const x=i%w,y=(i/w)|0;return im.data[((y+y0)*im.width+x+x0)*4+3]>80;};
        for(let i=0;i<w*h;i++){
            if(seen[i]||!opaque(i))continue;
            let start=0,end=1;queue[0]=i;seen[i]=1;const pixels=[];
            while(start<end){const k=queue[start++];pixels.push(k);const x=k%w,y=(k/w)|0;
                for(const n of [x?k-1:-1,x<w-1?k+1:-1,y?k-w:-1,y<h-1?k+w:-1,x&&y?k-w-1:-1,x<w-1&&y?k-w+1:-1,x&&y<h-1?k+w-1:-1,x<w-1&&y<h-1?k+w+1:-1]){
                    if(n>=0&&!seen[n]&&opaque(n)){seen[n]=1;queue[end++]=n;}
                }
            }
            const xs=pixels.map(k=>k%w),ys=pixels.map(k=>(k/w)|0);
            components.push({pixels,x:xs.reduce((s,x)=>s+x,0)/xs.length,box:[Math.min(...xs),Math.min(...ys),Math.max(...xs)+1,Math.max(...ys)+1]});
        }
        // A single actor, chosen by torso location; never keep the neighboring cape.
        const center=(bx0+bx1)/2-x0;
        components.sort((a,b)=>(b.pixels.length/(1+Math.abs(b.x-center)/w*4))-(a.pixels.length/(1+Math.abs(a.x-center)/w*4)));
        const main=components[0];if(!main)throw Error('Empty actor cell');
        const keep=new Uint8Array(w*h),bounds=[w,h,0,0];
        for(const c of components){
            if(c!==main)continue;
            for(const i of c.pixels)keep[i]=1;
        }
        const rows=new Uint16Array(h),data=Buffer.alloc(w*h*4);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            const k=y*w+x;if(!keep[k])continue;rows[y]++;
            const p=((y+y0)*im.width+x+x0)*4,d=(y*w+(w-1-x))*4;
            im.data.copy(data,d,p,p+4);
            bounds[0]=Math.min(bounds[0],w-1-x);bounds[1]=Math.min(bounds[1],y);bounds[2]=Math.max(bounds[2],w-x);bounds[3]=Math.max(bounds[3],y+1);
        }
        // Ignore the one-pixel sword tip below the feet when finding ground contact.
        let floor=h-1;while(floor>0&&rows[floor]<6)floor--;
        let sum=0,n=0;
        for(let y=Math.max(bounds[1],Math.round(floor-(floor-bounds[1])*.55));y<floor;y++)for(let x=0;x<w;x++){
            const p=(y*w+x)*4,r=data[p],g=data[p+1],b=data[p+2];
            if(data[p+3]>160&&r<85&&g<85&&b<95&&Math.max(r,g,b)-Math.min(r,g,b)<25){sum+=x;n++;}
        }
        const anchor=n?sum/n:(bounds[0]+bounds[2])/2;
        return {width:w,height:h,data,bounds,floor:floor+1,anchor};
    }
    async function grid(file){const im=await read(file),frames=[];
        for(let y=0;y<3;y++)for(let x=0;x<3;x++)frames.push(cropActor(im,[x*im.width/3,y*im.height/3,(x+1)*im.width/3,(y+1)*im.height/3]));
        return frames;
    }
    const actions={},qa={};
    async function save(name,frames,reference,settings={}){
        const dir=path.join(OUT,name);await fs.mkdir(dir,{recursive:true});
        const scale=BODY/reference;const sizes=[];
        for(let n=0;n<frames.length;n++){
            const f=frames[n],p=new PNG({width:W,height:H});
            for(let y=0;y<H;y++)for(let x=0;x<W;x++){
                const sx=Math.floor((x-AX)/scale+f.anchor),sy=Math.floor((y-FLOOR)/scale+f.floor);
                if(sx<0||sx>=f.width||sy<0||sy>=f.height)continue;
                const s=(sy*f.width+sx)*4,d=(y*W+x)*4;f.data.copy(p.data,d,s,s+4);
            }
            await fs.writeFile(path.join(dir,`${String(n).padStart(2,'0')}.png`),PNG.sync.write(p));
            sizes.push({height:f.floor-f.bounds[1],width:f.bounds[2]-f.bounds[0]});
        }
        actions[name]={frames:frames.length,path:`assets/chars/noble/v3/${name}`,fps:18,loop:false,referenceHeight:BODY,canvasHeight:H,originX:AX/W,originY:FLOOR/H,...settings};
        qa[name]={sourceStandingHeight:reference,scale,frames:sizes};
    }
    const height=f=>f.floor-f.bounds[1];
    const locomotion=await read('locomotion'),idle=[];
    for(let i=0;i<8;i++){const x=i%4,y=Math.floor(i/4);idle.push(cropActor(locomotion,[x*384,y*306,(x+1)*384,(y+1)*306]));}
    await save('idle',idle,height(idle[0]),{fps:8,loop:true});
    const walk=await grid('walk');await save('walk',walk.slice(0,8),height(walk[0]),{fps:14,loop:true});
    for(const name of ['j1','j2','j3','low','u','jump','airAttack','super_']){
        const frames=await grid(name);
        const reference=name==='airAttack'?height(frames[0])*1.22:height(frames[0]);
        const settings=name==='jump'?{physics:true}:name==='u'?{fitState:true,contact:4}:{phases:[4,6]};
        if(name==='super_')settings.activeLoop=true;
        await save(name,frames,reference,settings);
    }
    const block=await grid('block');await save('block',block.slice(0,6),height(block[0]),{fps:24});
    const hurt=await grid('hurt'),hurtRef=height(hurt[2]);
    await save('hit',hurt.slice(0,3),hurtRef,{fitHurt:true});
    await save('fall',hurt.slice(3,6),hurtRef,{fps:16});
    await save('knockdown',hurt.slice(6,9),hurtRef,{fps:18});
    const getup=await grid('getup');await save('getup',getup,height(getup[8]),{fps:30});
    actions.land={...actions.jump,frames:{offset:7,count:2},physics:false,fps:30};
    actions.launcher={...actions.j3};actions.parry={...actions.block,frames:{offset:1,count:5}};
    actions.parryCounter={...actions.j1};actions.dashAttack={...actions.u,fitState:false,phases:[4,6]};
    actions.dash={...actions.u,frames:{offset:2,count:4},fitState:false,fps:24};
    actions.charge={...actions.block,frames:{offset:3,count:3},loop:true,fps:5};
    actions.superLunge={...actions.dashAttack};actions.superWave={...actions.u};
    actions.ko={...actions.knockdown};
    // Portrait uses this exact model and keeps menu portraits free of sheet labels.
    const f=idle[0],b=f.bounds,portrait=new PNG({width:b[2]-b[0],height:b[3]-b[1]});
    for(let y=0;y<portrait.height;y++)f.data.copy(portrait.data,y*portrait.width*4,((y+b[1])*f.width+b[0])*4,((y+b[1])*f.width+b[2])*4);
    await fs.writeFile(path.join(OUT,'portrait.png'),PNG.sync.write(portrait));
    await fs.writeFile(path.join(OUT,'manifest.json'),JSON.stringify({character:'noble',version:3,actions},null,2));
    await fs.writeFile(path.join(OUT,'qa.json'),JSON.stringify(qa,null,2));
    return actions;
}
