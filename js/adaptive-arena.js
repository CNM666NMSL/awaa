/* One large arena for keyboard and touch. Portrait phones rotate the arena, not the menus. */
(()=>{
 'use strict';
 const g=window.game,$=id=>document.getElementById(id),body=document.body;
 const viewport=document.createElement('main');viewport.id='arena-viewport';viewport.setAttribute('aria-label','战斗画面');
 $('game-canvas').before(viewport);viewport.append($('game-canvas'),$('hud'),window.touchControls.element,$('quick-settings'),$('arena-command-toggle'),$('arena-command-sheet'));
 const timer=document.createElement('div');timer.className='arena-clock';timer.innerHTML='<span class="arena-round">第 1 回合</span><small>DUEL / AWA</small>';timer.insertBefore($('timer'),timer.lastChild);$('hud').append(timer);
 for(const id of ['p1','p2']){const face=document.createElement('div');face.className='arena-avatar';face.innerHTML='<img alt=""><span>'+id.toUpperCase()+'</span>';$ (id+'-panel').prepend(face);}
 const tools=document.createElement('nav');tools.id='arena-tools';tools.setAttribute('aria-label','画面与操控');tools.innerHTML='<button type="button" id="arena-fullscreen" title="进入全屏">⛶ <span>全屏</span></button><button type="button" id="arena-practice-toggle">练习工具</button>';viewport.append(tools);
 const footer=document.createElement('div');footer.className='arena-keyboard-hint';footer.innerHTML='<b>键盘</b><span>A D 移动</span><span>J 普攻</span><span>K 跳跃</span><span>L 瞬身</span><span>U 远攻</span><span>I 大招</span><span>O 特殊</span><span>S 防御</span><span>P 蓄气</span>';viewport.append(footer);
 const mode=document.createElement('div');mode.id='arena-input-status';mode.setAttribute('aria-live','polite');viewport.append(mode);
 const setting=document.createElement('label');setting.className='arena-input-setting';setting.innerHTML='操控方式 <select id="arena-input-mode"><option value="auto">自动识别设备</option><option value="touch">触屏摇杆与按键</option><option value="keyboard">电脑键盘</option></select><small id="arena-device-hint"></small>';$('menu-settings').querySelector('.settings-box').prepend(setting);
 const ua=navigator.userAgent,android=/Android/i.test(ua),ios=/iPhone|iPad|iPod/i.test(ua)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
 const touchDevice=android||ios||!!navigator.userAgentData?.mobile||navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches;
 body.dataset.platform=android?'android':ios?'ios':'desktop';let preference='auto',recentTouch=false;
 try{preference=localStorage.getItem('awa-input-mode')||'auto';}catch{}if(!['auto','touch','keyboard'].includes(preference))preference='auto';$('arena-input-mode').value=preference;
 let currentMode='keyboard';
 function fit(){
  const old=currentMode;currentMode=preference==='auto'?(touchDevice||recentTouch?'touch':'keyboard'):preference;
  if(old!==currentMode)window.touchControls.releaseAll();body.dataset.input=currentMode;
  const vw=window.visualViewport?.width||innerWidth,vh=window.visualViewport?.height||innerHeight,rotated=currentMode==='touch'&&vh>vw;body.dataset.rotated=String(rotated);
  const w=rotated?vh:vw,h=rotated?vw:vh,arenaW=Math.min(w,h*1200/540),arenaH=arenaW*540/1200;
  viewport.style.setProperty('--arena-w',arenaW+'px');viewport.style.setProperty('--arena-h',arenaH+'px');viewport.style.setProperty('--ui-scale',Math.min(1,Math.max(.64,arenaH/480)));
  mode.textContent=currentMode==='touch'?'触屏操控 · 摇杆方向 + 动作键':'键盘操控';$('arena-device-hint').textContent='当前：'+(currentMode==='touch'?(android?'安卓手机':ios?'手机 / 平板':'触屏设备'):'电脑键盘');
 }
 $('arena-input-mode').onchange=e=>{preference=e.target.value;try{localStorage.setItem('awa-input-mode',preference);}catch{}fit();};
 window.addEventListener('pointerdown',e=>{if(preference==='auto'&&e.pointerType==='touch'&&!recentTouch){recentTouch=true;fit();}},{capture:true,passive:true});
 window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);window.addEventListener('orientationchange',()=>{window.touchControls.releaseAll();fit();});
 $('arena-fullscreen').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen();}else{await $('game-wrapper').requestFullscreen();if(currentMode==='touch'&&screen.orientation?.lock)try{await screen.orientation.lock('landscape');}catch{}}}catch{}fit();};
 document.addEventListener('fullscreenchange',()=>{const b=$('arena-fullscreen');b.title=document.fullscreenElement?'退出全屏':'进入全屏';b.querySelector('span').textContent=document.fullscreenElement?'退出全屏':'全屏';fit();});
 $('arena-practice-toggle').onclick=()=>{body.classList.toggle('arena-practice-open');$('arena-practice-toggle').setAttribute('aria-expanded',String(body.classList.contains('arena-practice-open')));};
 const closePractice=document.createElement('button');closePractice.type='button';closePractice.className='arena-practice-close';closePractice.textContent='关闭练习工具 ×';closePractice.onclick=()=>body.classList.remove('arena-practice-open');$('noble-practice').prepend(closePractice);
 const phaseKey=()=>[g.phase,!!g.p1,!!g.p2,g.mode].join('|');let lastPhase='';
 function state(){const key=phaseKey();if(key===lastPhase)return;lastPhase=key;const active=!!g.p1&&!!g.p2&&!['menu','lobby'].includes(g.phase);body.classList.toggle('in-arena',active);body.dataset.phase=g.phase;$('arena-practice-toggle').hidden=g.mode!=='practice';if(!active||body.classList.contains('menu-visible'))window.touchControls.releaseAll();if(!active)body.classList.remove('arena-practice-open');fit();}
 const hud=Game.prototype.updateHUD;
 Game.prototype.updateHUD=function(...args){hud.apply(this,args);for(const [id,f]of [['p1',this.p1],['p2',this.p2]])if(f){const img=$(id+'-panel').querySelector('.arena-avatar img'),src=f.def.sprites?.[f.form]||f.def.sprite;if(src&&img.dataset.src!==src){img.dataset.src=src;img.src=src;img.alt=f.name;}}
  const round=(this.p1?.roundsWon||0)+(this.p2?.roundsWon||0)+1;viewport.querySelector('.arena-round').textContent='第 '+round+' 回合';
  const f=this.mode==='lan-guest'?this.p2:this.p1;if(f){const s=window.touchControls.heldKeys(),cost=f.charId==='wuxiang'?(s.has(CONFIG.keys.down)?200:s.has(CONFIG.keys.up)?100:300):100;const b=viewport.querySelector('[data-action="super_"]');b.querySelector('small').textContent=cost+'气';b.dataset.ready=String(f.meter>=cost);viewport.querySelector('[data-action="special"]').dataset.ready=String(f.resource>=3);}
  state();
 };
 const show=g.show;g.show=function(...args){const r=show.apply(this,args);state();return r;};
 const update=g.update;g.update=function(...args){const r=update.apply(this,args);state();return r;};
 new MutationObserver(state).observe(body,{attributes:true,attributeFilter:['class']});
 window.adaptiveArena={fit,state,get inputMode(){return currentMode;},get rotated(){return body.dataset.rotated==='true';},viewport};fit();state();
})();
