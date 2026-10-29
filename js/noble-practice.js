/* Noble practice uses the normal simulation, hit detection and keyboard input. */
Game.prototype.nobleMoveRows=function(){
 const d=this.p1?.def||CONFIG.characters.noble,s={...d.skill,...d.skill.forms?.[this.p1?.form]},staged=!!s.chargeThresholds,ult={...d.super_,...d.super_.forms?.[this.p1?.form]};
 if(ult.signatureArt)ult.damage=ult.signatureArt==='sword-domain'?`${ult.pulseDamage}/秒 × 8秒`:`${ult.pulseDamage} × ${ult.pulses}`;
 return [...d.combo.map((a,i)=>['j'+(i+1),(a.name||'第'+(i+1)+'段普攻')+' · '+Array(i+1).fill('J').join(','),a]),['launcher','上攻 · W+J',d.launcher],['low','下攻 · S+J',d.low],['dashAttack','瞬身攻击 · L→J',d.dashAttack],['airAttack','空中攻击 · 空中J',d.airAttack],
 ['u',(s.name||'短按远攻')+' · U',s],...(staged?[['uStage2','二段蓄力 · 按住U 1秒后松开',{...s,damage:Math.round(s.damage*1.4),startup:s.startup+5,recovery:s.recovery+7}]]:[]),
 ['uCharged',staged?`三段蓄力 · ${s.thirdStageName||'强化远攻'} · 按住U 2.5秒（最多7秒）`:'蓄力远攻 · 按住U 0.5秒后松开',{...s,damage:Math.round(s.damage*1.8),startup:s.startup+5,recovery:s.recovery+7}],['airRanged','空中远攻 · 跳跃后U',s],['special',d.special.name+' · 满'+d.resource.name+' O',{damage:d.special.damage??(this.p1?.charId==='jianke'?145:65),cost:0,startup:18,active:30,recovery:12}],['super_',(ult.name||'大招')+' · 100气 I'+(ult.duration?' · '+ult.duration/60+'秒':''),{...ult,cost:100}]].filter(row=>row[2]);
};

Game.prototype.startNoblePractice = function(charId='noble',targetId='noble',form='armored',targetForm='armored') {
    if(!CONFIG.roster.includes(charId)||!CONFIG.roster.includes(targetId))return;
    this.practiceSelection={player:charId,target:targetId};this.practiceForm=form==='unarmored'?'unarmored':'armored';this.practiceTargetForm=targetForm==='unarmored'?'unarmored':'armored';
    if (this.net) this.net.close();
    this.mode = 'practice'; this.matchOptions = {stage:this.selectedStage||'lingxia',format:'single'};
    this.p1 = new Fighter(charId,510,1); this.p2 = new Fighter(targetId,630,-1);
    this.show(null); this.startMatch(); this.phase='fight'; this.announce('',true);
    document.getElementById('noble-practice').classList.remove('hidden');
    this.resetNoblePractice();
    const d=CONFIG.characters[charId];
    document.getElementById('practice-title').textContent=d.name+' · 练习场';
    document.getElementById('practice-move-title').textContent=d.name+' · 出招表与参数';
    document.getElementById('practice-contract').textContent='叠满'+d.resource.name;
    const tbody=document.querySelector('#noble-moves tbody');tbody.replaceChildren();
    for(const [key,label,a] of this.nobleMoveRows()){
        const tr=document.createElement('tr');
        const dmg=a.multiHit?`${a.perHit}×${a.hits-1}+${a.finalDamage}`:a.damage;
        const values=[label,dmg??'—',a.cost??0,a.startup??'—',a.active??'飞行道具',a.recovery??'—',a.rangeBodies!==undefined?`${a.rangeBodies}身位（身体前沿起）`:a.range!==undefined?a.range+d.width/2:(a.projSpeed?`速度 ${a.projSpeed}`:'—')];
        for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
        const td=document.createElement('td'),button=document.createElement('button');button.textContent='演示';button.setAttribute('aria-label',`演示${label}`);
        button.onclick=()=>this.demonstrateNobleMove(key);td.append(button);tr.append(td);tbody.append(tr);
    }
};
Game.prototype.resetNoblePractice = function() {
    if(this.mode!=='practice')return;
    this.p1.resetForRound(510,1);this.p2.resetForRound(630,-1);
    if(this.p1.canSwitchForm())this.p1.form=this.practiceForm||'armored';
    if(this.p2.canSwitchForm())this.p2.form=this.practiceTargetForm||'armored';
    this.p1.meter=Number(document.getElementById('practice-meter').value);
    this.projectiles=[];this.sparks=[];this.shake=0;this.slowmoFrames=0;this.practiceHold=0;
    this._edgeStore1={};this.keysDown={};this.keysPressed={};this.phase='fight';this.announce('',true);this.updateHUD(true);
};
Game.prototype.demonstrateNobleMove=function(key){this.resetNoblePractice();const f=this.p1;window.comboRework?.select(f);const d=f.def;f.x=500;this.p2.x=585;this.canvas.scrollIntoView({behavior:'instant',block:'start'});if(key==='u'||key==='uStage2'||key==='uCharged'||key==='airRanged'){if(key==='airRanged')f.jump();if(key==='uStage2'){f.setState('rangedCharge');f.rangedChargeFrames=60;}const s=f.castSkill(key==='uCharged'||key==='uStage2');if(s)f.pendingProj=s;}else if(key==='special'){f.resource=f.resourceMax;f.castSpecial();}else if(key==='super_'){f.meter=100;f.castSuperTier();}else if(key==='airAttack'){f.jump();f._startAttack(d.airAttack);}else{const a=/^j[1-6]$/.test(key)?d.combo[Number(key[1])-1]:d[key];if(a)f._startAttack(a);}};
Game.prototype.updatePracticeTarget = function() {
    const f=this.p1,target=this.p2;
    if(document.getElementById('practice-refill').checked&&f.canAct()&&f.state!=='charge')f.meter=Math.max(f.meter,Number(document.getElementById('practice-meter').value));
    if(f.canAct()&&f.health<f.maxHealth)f.health=f.maxHealth;
    if(target.canAct()&&target.health<target.maxHealth)target.health=target.maxHealth;
    target.aim(f.x<target.x?-1:1);
    const mode=document.getElementById('practice-target').value;
    target.block(mode==='block');
    if(mode==='attack'&&this.phaseTimer%90===0&&target.canAct())target.attack();
};
Game.prototype.updatePracticeUI = function() {
    const text=`连段 ${this.p2.comboHits} · 累计伤害 ${this.p2.comboDamage} · ${this.p1.def.resource.name} ${this.p1.resource}/${this.p1.resourceMax}`;
    const el=document.getElementById('practice-stats');if(el.textContent!==text)el.textContent=text;
};
Game.prototype.openPracticeSelect=function(){
    this.practiceReturnToFight=this.mode==='practice'&&!!this.p1&&['fight','paused'].includes(this.phase);
    this.practiceSelection ||= {player:'noble',target:'noble'};
    this.phase='menu';this.show('menu-practice-select');
    document.getElementById('noble-practice').classList.add('hidden');
    this.buildPracticeSelection();
};
Game.prototype.buildPracticeSelection=function(){
    this.buildStagePicker?.('practice-stage-picker',this.selectedStage||'lingxia',id=>this.selectStage(id,'practice-stage-picker'));
    for(const side of ['player','target']){
        const grid=document.getElementById('practice-grid-'+side);grid.replaceChildren();
        for(const id of CONFIG.roster){const c=CONFIG.characters[id],button=document.createElement('button');button.className='char-card'+(this.practiceSelection[side]===id?' selected':'');button.setAttribute('aria-label',(side==='player'?'操控':'陪练')+'：'+c.name);button.setAttribute('aria-pressed',String(this.practiceSelection[side]===id));button.innerHTML=this.charCardHtml(c);button.onclick=()=>{this.practiceSelection[side]=id;this.buildPracticeSelection();};grid.append(button);}
        document.getElementById('practice-'+side+'-form-label').classList.toggle('hidden',!CONFIG.characters[this.practiceSelection[side]].sprites);
    }
    document.getElementById('practice-pick-summary').textContent=CONFIG.characters[this.practiceSelection.player].name+' VS '+CONFIG.characters[this.practiceSelection.target].name;
};
document.getElementById('btn-noble-main').onclick=()=>game.openPracticeSelect();
document.getElementById('btn-noble-practice').onclick=()=>game.openPracticeSelect();
document.getElementById('practice-change-character').onclick=()=>game.openPracticeSelect();
document.getElementById('btn-practice-start').onclick=()=>game.startNoblePractice(game.practiceSelection.player,game.practiceSelection.target,document.getElementById('practice-player-form').value,document.getElementById('practice-target-form').value);
document.getElementById('btn-practice-select-back').onclick=()=>{if(game.practiceReturnToFight){game.show(null);game.phase='fight';document.getElementById('noble-practice').classList.remove('hidden');}else{game.show('menu-main');game.phase='menu';}};
document.getElementById('practice-reset').onclick=()=>game.resetNoblePractice();
document.getElementById('practice-contract').onclick=()=>{if(game.mode==='practice'){game.p1.resource=game.p1.resourceMax;game.p1.sinceHit=0;}};
document.getElementById('practice-meter').onchange=()=>{if(game.mode==='practice')game.p1.meter=Number(document.getElementById('practice-meter').value);};
const practiceQuery=new URL(location.href).searchParams.get('practice');
window.addEventListener('DOMContentLoaded',async()=>{if(window.gameAssets)await window.gameAssets.ready;if(practiceQuery==='select')game.openPracticeSelect();else if(CONFIG.roster.includes(practiceQuery))game.startNoblePractice(practiceQuery);});
