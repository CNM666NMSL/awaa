// Export selected MIT PixelFX recipes at 40 FPS. No stock/demo characters are baked in.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodePNG} from '../vendor/pixelfx-main/tools/lib/png.mjs';
import {createFrame, clearFrame, createFx, composite} from '../vendor/pixelfx-main/src/core/index.js';
import {loadEffect, edgeFade} from '../vendor/pixelfx-main/tools/lib/fxlib.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'assets/fx/pixelfx-v1');fs.mkdirSync(out,{recursive:true});
const palettes={
 frost:['#142735','#345368','#6595ae','#9dcbdc','#c9ecf4','#ecfbff','#ffffff'],
 gold:['#36200f','#74502a','#b18b40','#e2b857','#ffdb83','#fff2bd','#fffef2'],
 jade:['#102d29','#205342','#3e8062','#63b386','#98e5ac','#d8ffe1','#f5fff1'],
 blood:['#090e13','#152c28','#285241','#63504c','#a24459','#d27783','#f4bec0'],
 hunter:['#281924','#57303b','#95454b','#cf715a','#ecaa72','#fce1b0','#fff8df'],
 night:['#111725','#2c354f','#596c86','#a0bdce','#d0e7ed','#ffe1a3','#fffaf1'],
 curse:['#030207','#08060d','#100d16','#1d1724','#2d2235','#453144','#6c4a61'],
};
const specs=[];
const add=(key,id,palette,extra={})=>specs.push({key,id,palette,...extra});
for(const [key,pal] of Object.entries({jianke:'frost',noble:'gold',armored:'jade',unarmored:'jade',motong:'blood',liequan:'hunter',wuxiang:'night'})){
 const melee={jianke:'sword-slash',noble:'thrust',armored:'heavy-cleave',unarmored:'uppercut',motong:'uppercut',liequan:'claw-swipe',wuxiang:'spear-sweep'}[key];
 add(key+'-normal','melee/'+melee,pal,{duration:.65,sourceStart:melee==='heavy-cleave'?.32:0});
 add(key+'-guard','holy/divine-shield',pal,{duration:2.4});
 add(key+'-charge','arcane/arcane-orb',pal,{duration:1.6});
}
add('frost-shot','ice/ice-lance','frost',{duration:.8});
add('gold-shot','projectiles/laser-bolt','gold',{duration:.8});
add('jade-ray','arcane/arcane-beam','jade',{duration:1.2});
add('jade-shock','projectiles/energy-disc','jade',{duration:1.2});
add('hunter-shot','projectiles/bullet-tracer','hunter',{duration:.6});
add('night-shot','projectiles/bullet-tracer',null,{duration:.6});
add('muzzle','projectiles/muzzle-pistol',null,{duration:.5});
add('shotgun','projectiles/muzzle-shotgun',null,{duration:.65});
add('sword-domain','melee/spin-slash','frost',{duration:1.2});
add('frost-sigil','arcane/rune-circle','frost',{duration:2});
add('gold-sigil','arcane/rune-circle','gold',{duration:2});
add('jade-sigil','arcane/rune-circle','jade',{duration:2});
add('blood-sigil','shadow/hex-sigil','blood',{duration:2});
add('hunter-sigil','arcane/rune-circle','hunter',{duration:2});
add('night-sigil','arcane/rune-circle','night',{duration:2});
add('gold-execution','melee/double-slash','gold',{duration:.65});
add('seven-stars','arcane/star-fall','gold',{duration:1.5});
add('meteor','fire/meteor','jade',{duration:1.7});
add('earth-pillar','nature/earth-spike',null,{duration:1.8,options:{palette:['#142b27','#263f36','#385549','#547260','#799680','#a2b39b','#c3d3b3','#ecf2cf'],glow:palettes.jade}});
add('black-hole','shadow/black-hole','blood',{duration:4});
add('curse','shadow/curse','curse',{duration:1.5});
add('void-impact','shadow/dark-explosion','blood',{duration:1});
add('hunter-ultimate','melee/claw-swipe','hunter',{duration:.7});
add('night-ultimate','projectiles/muzzle-smg',null,{duration:1});
add('drain','shadow/life-steal','blood',{duration:1.8});
add('blessing','holy/blessing','gold',{duration:2});
add('hit','impacts/hit-spark',null,{duration:.4});
add('block-hit','impacts/parry','frost',{duration:.45});
add('frost-heavy','melee/heavy-cleave','frost',{duration:.65,sourceStart:.32});
add('gold-upper','melee/uppercut','gold',{duration:.65});
add('blood-impact','impacts/blunt-hit','blood',{duration:.5});
const manifest={version:1,fps:40,source:'https://github.com/patch-gg/pixelfx',license:'MIT',effects:{}};
for(const s of specs){
 const fx=await loadEffect(s.id);const m=fx.meta;
 const duration=Math.min(s.duration,m.duration),n=Math.round(duration*40),cols=Math.max(1,Math.min(10,Math.floor(2048/m.size[0]))),rows=Math.ceil(n/cols);
 const [w,h]=m.size,frame=createFrame(w,h),rgba=new Uint8ClampedArray(w*h*4),sheet=Buffer.alloc(w*cols*h*rows*4);
 // Empty actor suppresses effect highlights shaped like the library's demo mannequin.
 const actor={x:0,y:0,mask:{w:0,h:0,data:new Uint8Array(0)},pixels:new Uint32Array(0)};
 const inst=createFx(fx.mod,{x:m.origin[0],y:m.origin[1],actor,seed:12,...s.palette?{palette:palettes[s.palette]}:{},...s.options});
 const start=s.sourceStart||0;if(start)inst.update(start);
 for(let i=0;i<n;i++){
  if(i)inst.update(m.loop?m.duration/n:1/40);clearFrame(frame);inst.draw(frame);edgeFade(frame);composite(frame,rgba);
  const dx=(i%cols)*w,dy=Math.floor(i/cols)*h;
  for(let y=0;y<h;y++)sheet.set(rgba.subarray(y*w*4,(y+1)*w*4),((dy+y)*w*cols+dx)*4);
 }
 fs.writeFileSync(path.join(out,s.key+'.png'),encodePNG(w*cols,h*rows,sheet));
 manifest.effects[s.key]={source:s.id,path:'assets/fx/pixelfx-v1/'+s.key+'.png',w,h,ox:m.origin[0],oy:m.origin[1],cols,frames:n,fps:40,duration,loop:!!m.loop,sourceStart:start};
 console.log(s.key,n+' frames');
}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
fs.writeFileSync(path.join(root,'js/pixelfx-assets.js'),'/* Generated by tools/build-pixelfx.mjs; MIT Patch / Hugo Duprez. */\nwindow.pixelFXManifest='+JSON.stringify(manifest)+';\n');
fs.copyFileSync(path.join(root,'vendor/pixelfx-main/LICENSE'),path.join(out,'LICENSE'));
fs.copyFileSync(path.join(root,'vendor/pixelfx-main/NOTICE.md'),path.join(out,'NOTICE.md'));
console.log('Exported '+specs.length+' atlases at 40 FPS');
