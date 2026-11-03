/* Video reference: side portraits, central roster, scene strip, and keyboard confirmation. */
(() => {
 const g=window.game,$=id=>document.getElementById(id);
 const specs={practice:{id:'menu-practice-select',grids:['practice-grid-player','practice-grid-target'],columns:'.practice-pick-columns',scene:'practice-stage-picker',start:'btn-practice-start'},local:{id:'menu-local',grids:['local-grid-p1','local-grid-p2'],columns:'.lobby-columns',scene:'local-stage-picker',start:'btn-local-start'},lobby:{id:'menu-lobby',grids:['char-grid'],columns:'.lobby-columns',scene:'stage-grid',start:'btn-ready'}};
 const picked=(kind,side)=>kind==='practice'?g.practiceSelection?.[side?'target':'player']:kind==='local'?g.localPick?.[side?'p2':'p1']:g.lobby?.[side?'oppChar':'myChar'];
 function preview(kind,side){
  const s=specs[kind],menu=$(s.id),card=menu.querySelectorAll('.arena-preview')[side],id=picked(kind,side),def=CONFIG.characters[id];
  const form=kind==='practice'?$('practice-'+(side?'target':'player')+'-form')?.value:'armored';
  card.querySelector('.arena-side-title').textContent=side?(kind==='practice'?'陪练角色':g.cpuSelection&&kind==='local'?'CPU / 系统操控':'PLAYER 2'):'PLAYER 1';
  const img=card.querySelector('img');img.hidden=!def;if(def){img.src=((def.sprites?.[form]||def.sprite||def.sprites?.armored)+'?v='+ASSET_VER);img.alt=def.name+'立绘';}
  card.querySelector('.arena-fighter-name').textContent=def?.name||'等待对手';card.querySelector('.arena-fighter-title').textContent=def?.title||'对方加入后选择角色';
  card.querySelector('.arena-ready').textContent=menu._arenaReady?.[side]?'已确认':menu._arenaSide===side?'选择中':'待确认';
  card.classList.toggle('choosing',menu._arenaSide===side);
 }
 function ensure(kind){
  const s=specs[kind],menu=$(s.id);if(menu.classList.contains('arena-selection'))return;
  menu.classList.add('arena-selection');menu.dataset.arenaKind=kind;menu._arenaSide=0;menu._arenaReady=[false,false];
  const heading=document.createElement('header');heading.className='arena-heading';const title=menu.querySelector('h2'),oldHeading=title.closest('.archive-heading');
  heading.innerHTML='<div class="arena-wordmark">AWA <span>残街对决 / FIGHTING ARENA</span></div><strong>SELECT YOUR <em>FIGHTER</em></strong>';heading.append(title);menu.prepend(heading);if(oldHeading)oldHeading.remove();
  const frame=document.createElement('div');frame.className='arena-select-layout';const center=document.createElement('section');center.className='arena-select-center';frame.append(center);heading.after(frame);
  const tabs=document.createElement('div');tabs.className='arena-player-tabs';tabs.setAttribute('aria-label','选择玩家');
  for(let side=0;side<2;side++){const b=document.createElement('button');b.type='button';b.textContent=side?'选择对手 / P2':'选择我方 / P1';b.setAttribute('aria-label',side?'选择玩家2':'选择玩家1');b.disabled=kind==='lobby'&&side===1;b.onclick=()=>{menu._arenaSide=side;render(kind);};tabs.append(b);}
  center.append(tabs,menu.querySelector(s.columns));
  const scene=$(s.scene),sceneSection=scene.closest('.stage-section');if(sceneSection)center.append(sceneSection);else if(kind==='local')center.append(scene); // Lobby scene already lives in its second column.
  const hint=document.createElement('p');hint.className='arena-selection-keys';hint.innerHTML='<kbd>W A S D</kbd> 选择 <kbd>J</kbd> 确认 <kbd>Tab</kbd> 切换玩家 <span>对手：方向键 / 数字 1</span>';center.append(hint);
  for(let side=0;side<2;side++){const card=document.createElement('aside');card.className='arena-preview '+(side?'arena-preview-right':'arena-preview-left');card.innerHTML='<div class="arena-side-title"></div><button type="button" class="arena-preview-switch" aria-label="'+(side?'选择玩家2预览':'选择玩家1预览')+'"><span class="arena-ready"></span><img draggable="false" alt=""><span class="arena-waiting">?</span></button><small>角色预览 / FIGHTER</small><h3 class="arena-fighter-name"></h3><p class="arena-fighter-title"></p><div class="arena-form-slot"></div>';
   card.querySelector('button').onclick=()=>{if(kind==='lobby'&&side===1)return;menu._arenaSide=side;render(kind);};
   card.querySelector('button').disabled=kind==='lobby'&&side===1;
   if(kind==='practice'){const form=$('practice-'+(side?'target':'player')+'-form-label');card.querySelector('.arena-form-slot').append(form);form.querySelector('select').addEventListener('change',()=>preview(kind,side));}
   if(side===0)frame.prepend(card);else frame.append(card);
  }
  const footer=document.createElement('footer');footer.className='arena-selection-footer';
  for(const element of [...menu.children])if(element!==heading&&element!==frame)footer.append(element);menu.append(footer);
 }
 function render(kind){
  ensure(kind);const s=specs[kind],menu=$(s.id),side=menu._arenaSide||0;
  for(let i=0;i<s.grids.length;i++){
   const grid=$(s.grids[i]);grid.parentElement.classList.toggle('arena-inactive-pick',i!==side);grid.dataset.arenaSide=i;
   [...grid.children].forEach((card,index)=>{card.dataset.fighterId=CONFIG.roster[index];card.dataset.fighterNumber=String(index+1).padStart(2,'0');card.setAttribute('tabindex','0');card.setAttribute('role','button');if(!card.getAttribute('aria-label'))card.setAttribute('aria-label',CONFIG.characters[CONFIG.roster[index]].name);card.setAttribute('aria-pressed',String(picked(kind,i)===CONFIG.roster[index]));
    card._arenaOriginalClick||=card.onclick;card.onclick=()=>{menu._arenaReady[i]=false;card._arenaOriginalClick();};card.onkeydown=e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();card.click();}};
   });
  }
  menu.querySelectorAll('.arena-player-tabs button').forEach((b,i)=>{b.classList.toggle('active',side===i);b.setAttribute('aria-pressed',String(side===i));});preview(kind,0);preview(kind,1);
 }
 for(const [kind,method]of [['practice','buildPracticeSelection'],['local','buildLocalGrids'],['lobby','buildCharGrid']]){const base=Game.prototype[method];Game.prototype[method]=function(...args){const result=base.apply(this,args);render(kind);return result;};}
 const netMessage=Game.prototype.onNetMessage;Game.prototype.onNetMessage=function(...args){const result=netMessage.apply(this,args);if(!$('menu-lobby').classList.contains('hidden')&&$('menu-lobby').classList.contains('arena-selection'))render('lobby');return result;};
 const show=g.show;g.show=function(id){const result=show.call(this,id);const s=Object.values(specs).find(s=>s.id===id);if(s&&$(s.id).classList.contains('arena-selection')){$(s.id)._arenaReady=[false,false];$(s.id)._arenaSide=0;}return result;};
 window.addEventListener('keydown',e=>{
  const menu=document.querySelector('.arena-selection:not(.hidden)');if(!menu||e.target.closest('input,select,textarea')||e.altKey||e.ctrlKey||e.metaKey)return;
  const kind=menu.dataset.arenaKind,s=specs[kind],arrows=e.code.startsWith('Arrow'),p2key=e.code==='Digit1'||e.code==='Numpad1';
  const navigation={KeyA:-1,KeyD:1,KeyW:-3,KeyS:3,ArrowLeft:-1,ArrowRight:1,ArrowUp:-3,ArrowDown:3};
  if(!(e.code in navigation)&&!['Tab','KeyJ','Numpad1','Digit1'].includes(e.code))return;
  e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
  if(e.code==='Tab'){if(kind!=='lobby'){menu._arenaSide=1-menu._arenaSide;render(kind);}return;}
  const side=kind==='lobby'?0:arrows||p2key?1:menu._arenaSide;menu._arenaSide=side;
  const id=picked(kind,side)||CONFIG.roster[0],index=Math.max(0,CONFIG.roster.indexOf(id)),cards=[...$(s.grids[side]||s.grids[0]).children];
  if(e.code in navigation){const next=(index+navigation[e.code]+CONFIG.roster.length)%CONFIG.roster.length;render(kind);cards[next].click();return;}
  menu._arenaReady[side]=true;
  if(kind==='lobby'){$(s.start).click();return;}
  if(menu._arenaReady.every(Boolean)){g.keysDown={};g.keysPressed={};$(s.start).click();return;}
  menu._arenaSide=1-side;render(kind);
 },true);
 // Compact reference-style battle command sheet, using the real bindings.
 const commands=document.createElement('button');commands.id='arena-command-toggle';commands.textContent='出招 / 键位';commands.setAttribute('aria-expanded','false');$('quick-settings').after(commands);
 const drawer=document.createElement('aside');drawer.id='arena-command-sheet';drawer.hidden=true;drawer.innerHTML='<button type="button" aria-label="关闭出招表">×</button><h3>出招 / KEY GUIDE</h3><dl>'+[['A / D','移动 · 双击快跑'],['J','角色专属 4–6 段连击'],['S + U','无相司夜：雾墙（抵挡3次远攻）'],['K','跳跃 / 二段跳'],['L','瞬移 · 可配合决斗者锁定大招'],['U','远攻 · 长按分段蓄力'],['I','满气大招 · 可移动施放'],['W + J','上攻 / 挑空'],['S + J','下攻 / 破防'],['S','格挡 / 受身'],['O','消耗3层特殊技'],['P','长按攒气'],['P2','方向键 + 数字 1–7']].map(([k,t])=>'<div><dt>'+k+'</dt><dd>'+t+'</dd></div>').join('')+'</dl>';commands.after(drawer);
 const close=()=>{drawer.hidden=true;commands.setAttribute('aria-expanded','false');};commands.onclick=()=>{drawer.hidden=!drawer.hidden;commands.setAttribute('aria-expanded',String(!drawer.hidden));};drawer.querySelector('button').onclick=close;
 const updateLayout=()=>{const fight=!document.body.classList.contains('menu-visible');commands.hidden=!fight;if(!fight)close();};new MutationObserver(updateLayout).observe(document.body,{attributes:true,attributeFilter:['class']});updateLayout();
})();
