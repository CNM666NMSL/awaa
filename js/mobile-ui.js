/* Touch input feeds the same key map and readInput path as keyboard / network play. */
(() => {
'use strict';
const g=window.game,$=id=>document.getElementById(id),touch=new Map();
const controls=document.createElement('section');controls.className='touch-controls';controls.setAttribute('aria-label','手机战斗按键');
const icons={attack:'M6 3l14 14-3 3L3 6zM18 3L4 17m-1-3 7 7m7-7 4 4',skill:'M4 12h16m-6-6 6 6-6 6M4 7v10',special:'M12 2l3 6 7 4-7 4-3 6-3-6-7-4 7-4z',super_:'M12 1l3 7 8-1-6 6 3 9-8-5-8 5 3-9-6-6 8 1z',jump:'M4 15l8-10 8 10M8 21l4-6 4 6',dash:'M3 5l8 7-8 7m9-14 8 7-8 7',down:'M12 2l8 4v8l-8 8-8-8V6zM8 12h8',charge:'M13 2L5 13h6l-1 9 9-13h-6z'};
const button=(action,label,key)=>`<button type="button" data-action="${action}" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[action]}"/></svg><span class="control-label">${label}</span><small>${key}</small></button>`;
controls.innerHTML='<div class="touch-dpad"><button type="button" class="touch-stick" aria-label="方向摇杆：左右移动，上推上攻，下推防御"><span class="stick-ring"></span><span class="stick-axis horizontal"></span><span class="stick-axis vertical"></span><span class="stick-thumb"></span><span class="stick-up">上</span><span class="stick-down">防</span></button><span class="stick-caption">移动 / 方向组合</span>'+button('charge','蓄气','按住')+'</div><div class="touch-actions">'+button('skill','远攻','长按蓄力')+button('special','特殊','3层')+button('super_','大招','满气')+button('attack','普攻','连击')+button('jump','跳跃','二段跳')+button('dash','瞬身','闪避')+button('down','防御','按住')+'</div>';
$('game-canvas').after(controls);
const keysFor=action=>action==='launcher'?[CONFIG.keys.up,CONFIG.keys.attack]:[CONFIG.keys[action]];
const heldKeys=()=>new Set([...touch.values()].flatMap(v=>v.keys||keysFor(v.action)));
const stick=controls.querySelector('.touch-stick');
function resetStick(){stick.style.setProperty('--stick-x','0px');stick.style.setProperty('--stick-y','0px');}
function releaseAll(){touch.clear();controls.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));resetStick();}
function release(e){const old=touch.get(e.pointerId);touch.delete(e.pointerId);if(old&&![...touch.values()].some(v=>v.button===old.button))old.button.classList.remove('held');if(old?.button===stick)resetStick();}
controls.querySelectorAll('button[data-action]').forEach(b=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(g.phase!=='fight')return;const before=heldKeys();b.setPointerCapture(e.pointerId);touch.set(e.pointerId,{action:b.dataset.action,button:b});b.classList.add('held');for(const key of keysFor(b.dataset.action))if(!before.has(key))g.keysPressed[key]=true;audio.unlock();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);
});
function steer(e){const v=touch.get(e.pointerId);if(v?.button!==stick)return;const rect=stick.getBoundingClientRect(),rotated=document.body.dataset.rotated==='true',screenX=e.clientX-(rect.left+rect.width/2),screenY=e.clientY-(rect.top+rect.height/2),dx=rotated?screenY:screenX,dy=rotated?-screenX:screenY,radius=Math.min(rect.width,rect.height)*.32,dist=Math.hypot(dx,dy),k=Math.min(1,radius/Math.max(1,dist)),x=dx*k,y=dy*k,before=heldKeys(),keys=[];
 if(dist>radius*.24){if(x< -radius*.32)keys.push(CONFIG.keys.left);if(x>radius*.32)keys.push(CONFIG.keys.right);if(y< -radius*.32)keys.push(CONFIG.keys.up);if(y>radius*.32)keys.push(CONFIG.keys.down);}
 v.keys=keys;for(const key of keys)if(!before.has(key))g.keysPressed[key]=true;stick.style.setProperty('--stick-x',x+'px');stick.style.setProperty('--stick-y',y+'px');
}
stick.addEventListener('pointerdown',e=>{e.preventDefault();if(g.phase!=='fight')return;if([...touch.values()].some(v=>v.button===stick))return;stick.setPointerCapture(e.pointerId);touch.set(e.pointerId,{button:stick,keys:[]});stick.classList.add('held');steer(e);audio.unlock();});stick.addEventListener('pointermove',steer);for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,release);
window.touchControls={releaseAll,heldKeys,element:controls};
const originalShow=g.show;g.show=function(id){const result=originalShow.call(this,id);if(!id)requestAnimationFrame(()=>window.scrollTo(0,0));return result;};
const read=g.readInput;g.readInput=function(map,edges){if(map!==CONFIG.keys||!touch.size)return read.call(this,map,edges);const physical=this.keysDown;this.keysDown={...physical};for(const key of heldKeys())this.keysDown[key]=true;try{return read.call(this,map,edges);}finally{this.keysDown=physical;}};
window.addEventListener('blur',releaseAll);document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();if(g.phase==='fight'&&!g.net)g.togglePause();}});
function layout(){const visible=[...document.querySelectorAll('.overlay')].some(e=>!e.classList.contains('hidden'));document.body.classList.toggle('menu-visible',visible);controls.classList.toggle('active',!visible&&g.phase==='fight');if(visible)releaseAll();}
new MutationObserver(layout).observe($('game-wrapper'),{subtree:true,attributes:true,attributeFilter:['class']});layout();
let settingsReturn='menu-main',pausedHere=false;
function openSettings(){releaseAll();if(!$('menu-settings').classList.contains('hidden'))return;settingsReturn=document.querySelector('.overlay:not(.hidden)')?.id||null;pausedHere=g.phase==='fight';if(pausedHere)g.togglePause();g.show('menu-settings');$('btn-settings-back').textContent=pausedHere?'保存并继续战斗':'返回';$('voice-volume').focus();}
$('quick-settings').onclick=openSettings;$('btn-ingame-settings').onclick=openSettings;
const mainMenu=g.onMainMenu;g.onMainMenu=function(target){if(target==='settings')return openSettings();return mainMenu.call(this,target);};
$('btn-settings-back').onclick=()=>{if(pausedHere&&g.phase==='paused')g.togglePause();else g.show(settingsReturn);pausedHere=false;};
g.returnToMainMenu=function(){
 releaseAll();pausedHere=false;settingsReturn='menu-main';
 if(this.net){for(const callback of ['onOpen','onCreated','onJoined','onPeerJoined','onPeerLeft','onRelay','onError','onStatus'])this.net[callback]=null;this.net.close();this.net=null;}
 this.phase='menu';this.mode=null;this.keysDown={};this.keysPressed={};this._edgeStore={};this._edgeStore1={};this._edgeStore2={};
 this.projectiles=[];this.specialObjects=[];this.cyberObjects=[];this.signatureObjects=[];this.superFreeze=null;this.cpuBrain=null;this.remoteInput=null;this.practiceReturnToFight=false;this.roundStartMs=null;this.phaseTimer=0;
 this.p1=null;this.p2=null;this.sparks=[];this.shake=0;
 this.isHost=false;this.lobby.myReady=false;this.lobby.oppReady=false;this.lobby.oppChar=null;
 for(const media of document.querySelectorAll('video,audio')){media.pause();if(media.readyState)media.currentTime=0;}
 window.jiankeFX?.clear();$('noble-practice').classList.add('hidden');this.show('menu-main');
};
$('btn-settings-home').onclick=()=>g.returnToMainMenu();
$('btn-quit').onclick=()=>g.returnToMainMenu();
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&!$('menu-settings').classList.contains('hidden')){e.stopImmediatePropagation();$('btn-settings-back').click();}},true);

// Three independent gain buses. No character speech exists yet; videos and future voice assets use the voice bus.
const defaults={voice:.8,effects:.8,music:.35};let saved={};try{saved=JSON.parse(localStorage.getItem('awa-audio')||'{}');}catch{}
const audio=window.awaAudio={values:{...defaults},ctx:null,buses:{},
 unlock(){try{if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;this.ctx=new AC();for(const name of Object.keys(defaults)){const gain=this.ctx.createGain();gain.gain.value=this.values[name];gain.connect(this.ctx.destination);this.buses[name]=gain;}}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{}},
 set(name,value){this.values[name]=value;const gain=this.buses[name];if(gain)gain.gain.setTargetAtTime(value,this.ctx.currentTime,.02);try{localStorage.setItem('awa-audio',JSON.stringify(this.values));}catch{}document.querySelectorAll('video,audio').forEach(el=>{el.volume=this.values[el.dataset.audioBus||'voice']??this.values.voice;});},
 tone(bus,hz,duration=.12,level=.1,type='sine'){if(!this.ctx||this.ctx.state!=='running')return;const c=this.ctx,o=c.createOscillator(),v=c.createGain(),t=c.currentTime;o.type=type;o.frequency.setValueAtTime(hz,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,hz*.55),t+duration);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(level,t+.01);v.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(v);v.connect(this.buses[bus]);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();v.disconnect();};},
 playVoice(url){this.unlock();const el=new Audio(url);el.dataset.audioBus='voice';el.volume=this.values.voice;document.body.append(el);el.onended=()=>el.remove();el.play().catch(()=>el.remove());return el;}
};
for(const name of Object.keys(defaults)){const value=Number(saved[name]);if(Number.isFinite(value)&&saved[name]!==undefined)audio.values[name]=Math.max(0,Math.min(1,value));const input=$(name+'-volume');input.value=Math.round(audio.values[name]*100);$(name+'-value').textContent=input.value+'%';input.oninput=()=>{$(name+'-value').textContent=input.value+'%';audio.set(name,Number(input.value)/100);};audio.set(name,audio.values[name]);}
for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>audio.unlock(),{once:true});
document.querySelectorAll('video').forEach(v=>v.addEventListener('play',()=>v.volume=audio.values.voice));
let note=0;const melody=[146.83,174.61,220,196,146.83,130.81,174.61,164.81];
setInterval(()=>{if(document.hidden||g.phase==='paused'||!$('menu-settings').classList.contains('hidden')||[...document.querySelectorAll('video')].some(v=>!v.paused))return;audio.tone('music',melody[note++%melody.length],1.5,.045);},650);
const previous=new WeakMap(),update=g.update;g.update=function(...args){const result=update.apply(this,args);if(this.phase==='fight')for(const f of [this.p1,this.p2])if(f){const p=previous.get(f);if(p&&p.health>f.health)audio.tone('effects',90,.14,.16,'triangle');if(p&&p.state!==f.state&&['attack','skill','dash'].includes(f.state))audio.tone('effects',300,.12,.06,'triangle');previous.set(f,{state:f.state,health:f.health});}return result;};
})();

