'use strict';
const fs=require('node:fs'),path=require('node:path');
const {grid,save}=require('./build-cyber-roster.cjs');
const {sharp}=require('./expand-animation-frames.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/chars/wuxiang-revolver-v1');
(async()=>{
 const cells=(await grid(path.join(out,'shooting-sheet.png'),4,6)).flat();
 if(cells.length!==24)throw Error('Expected exactly 24 independent drawings');
 // Register every drawing to the same standing height and foot origin.
 const scales=cells.map(c=>250/c.m.height);
 for(let i=0;i<24;i++)await save(cells[i],path.join(out,i<12?'shoot':'aim',String(i%12).padStart(2,'0')+'.png'),scales[i]);
 fs.mkdirSync(path.join(out,'charged'),{recursive:true});
 for(let i=0;i<12;i++)fs.copyFileSync(path.join(out,i<5?'aim':'shoot',String(i<5?i+7:i).padStart(2,'0')+'.png'),path.join(out,'charged',String(i).padStart(2,'0')+'.png'));
 const {data,info}=await sharp(path.join(out,'shoot/05.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let tipX=0,tipY=0;
 for(let y=115;y<215;y++)for(let x=210;x<info.width;x++)if(data[(y*info.width+x)*4+3]>180&&x>tipX){tipX=x;tipY=y;}
 let sumY=0,weight=0;
 for(let y=115;y<215;y++)for(let x=tipX-2;x<=tipX;x++){const a=data[(y*info.width+x)*4+3];if(a>180){sumY+=y*a;weight+=a;}}
 tipY=sumY/weight;
 const spriteScale=Math.round(116*1.05*384/250)/384;
 const projX=Number(((tipX-210)*spriteScale).toFixed(2)),projY=Number(((356-tipY)*spriteScale/116).toFixed(4));
 const clip={frames:12,fps:24,loop:false,referenceHeight:250,canvasHeight:384,originX:210/512,originY:356/384};
 const source=`/* Silver revolver from the user's original character sheet. Generated poses: built-in image_gen. */\n(()=>{const d=CONFIG.characters.wuxiang;\nObject.assign(d.skill,{name:'左轮·火花弹',projectileKind:'revolver',projectileColor:'#ffc477',projSpeed:18,projSize:8,projX:${projX},projY:${projY}});\nconst clip=${JSON.stringify(clip)};\nd.anims.u={...clip,path:'assets/chars/wuxiang-revolver-v1/shoot',fitState:true,contact:5};\nd.anims.uCharged={...d.anims.u,path:'assets/chars/wuxiang-revolver-v1/charged'};\nd.anims.uCharge={...clip,path:'assets/chars/wuxiang-revolver-v1/aim'};\n})();\n`;
 fs.writeFileSync(path.join(root,'js/wuxiang-revolver.js'),source);
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({generator:'built-in image_gen',reference:'../cyber-v1/references/wuxiang.jpg',sheet:'shooting-sheet.png',shoot:12,aim:12,charged:'aim 07..11 then shoot 05..11',scales,muzzle:{pixel:{x:tipX,y:tipY},projX,projY},cells:cells.map(c=>({row:c.row,column:c.column}))},null,2));
 console.log('Installed 12 shooting + 12 nonlooping aiming poses;', {tipX,tipY,projX,projY});
})().catch(e=>{console.error(e);process.exitCode=1;});
