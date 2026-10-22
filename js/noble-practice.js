/* Noble practice uses the normal simulation, hit detection and keyboard input. */
Game.prototype.nobleMoveRows = function() {
    const d = CONFIG.characters.noble, tiers = d.superTiers;
    return [
        ['j1','正手直刺 · J',d.combo[0]],['j2','反手横划 · J,J',d.combo[1]],['j3','剑身上挑 · J,J,J',d.combo[2]],
        ['launcher','晨星挑刺 · W+J',d.launcher],['low','低身滑刺 · S+J',d.low],
        ['dashAttack','滑步突刺 · L→J',{...d.dashAttack,cost:CONFIG.resources.dashCost}],['airAttack','空中下劈 · 空中J',d.airAttack],
        ['u','残月剑气 · U',d.skill],['parry','决斗招架 · O',{damage:d.special.counter.damage,cost:0,startup:0,active:d.special.window,recovery:d.special.failRecover}],
        ['superLunge','疾影突 · 100气I',tiers?.lunge],['superWave','裂空波 · 200气I',tiers?.wave],
        ['super_','终焉七重刺 · 300气I',{...d.super_,cost:300}],
    ].filter(row=>row[2]);
};
Game.prototype.startNoblePractice = function() {
    if (this.net) this.net.close();
    this.mode = 'practice'; this.matchOptions = {stage:'lingxia',format:'single'};
    this.p1 = new Fighter('noble',510,1); this.p2 = new Fighter('noble',630,-1);
    this.show(null); this.startMatch(); this.phase='fight'; this.announce('',true);
    document.getElementById('noble-practice').classList.remove('hidden');
    this.resetNoblePractice();
    const d=CONFIG.characters.noble;
    const tbody=document.querySelector('#noble-moves tbody');tbody.replaceChildren();
    for(const [key,label,a] of this.nobleMoveRows()){
        const tr=document.createElement('tr');
        const dmg=a.multiHit?`${a.perHit}×${a.hits-1}+${a.finalDamage}`:a.damage;
        const values=[label,dmg??'—',a.cost??0,a.startup??'—',a.active??'飞行道具',a.recovery??'—',a.range!==undefined?a.range+d.width/2:(a.projSpeed?`速度 ${a.projSpeed}`:'—')];
        for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td);}
        const td=document.createElement('td'),button=document.createElement('button');button.textContent='演示';button.setAttribute('aria-label',`演示${label}`);
        button.onclick=()=>this.demonstrateNobleMove(key);td.append(button);tr.append(td);tbody.append(tr);
    }
};
Game.prototype.resetNoblePractice = function() {
    if(this.mode!=='practice')return;
    this.p1.resetForRound(510,1);this.p2.resetForRound(630,-1);
    this.p1.meter=Number(document.getElementById('practice-meter').value);
    this.projectiles=[];this.sparks=[];this.shake=0;this.slowmoFrames=0;this.practiceHold=0;
    this._edgeStore1={};this.keysDown={};this.keysPressed={};this.phase='fight';this.announce('',true);this.updateHUD(true);
};
Game.prototype.demonstrateNobleMove = function(key) {
    this.resetNoblePractice(); const f=this.p1,d=f.def;
    this.canvas.scrollIntoView({behavior:'instant',block:'center'});
    f.x=540;this.p2.x=610;
    if(key==='parry'){f.castSpecial();this.p2._startAttack(this.p2.def.combo[0]);}
    else if(key==='u'){const s=f.castSkill();if(s)f.pendingProj=s;}
    else if(key==='super_'){f.meter=300;f.castSuperTier();}
    else if(key==='superLunge'){f.meter=100;f.castSuperTier();}
    else if(key==='superWave'){f.meter=200;f.castSuperTier();}
    else if(key==='airAttack'){f.jump();f._startAttack(d.airAttack);}
    else {const a=key==='j1'?d.combo[0]:key==='j2'?d.combo[1]:key==='j3'?d.combo[2]:d[key];if(a)f._startAttack(a);}
};
Game.prototype.updatePracticeTarget = function() {
    const f=this.p1,target=this.p2;
    if(document.getElementById('practice-refill').checked&&f.canAct()&&f.state!=='charge')f.meter=Number(document.getElementById('practice-meter').value);
    if(f.canAct()&&f.health<f.maxHealth)f.health=f.maxHealth;
    if(target.canAct()&&target.health<target.maxHealth)target.health=target.maxHealth;
    target.aim(f.x<target.x?-1:1);
    const mode=document.getElementById('practice-target').value;
    target.block(mode==='block');
    if(mode==='attack'&&this.phaseTimer%90===0&&target.canAct())target.attack();
};
Game.prototype.updatePracticeUI = function() {
    const text=`连段 ${this.p2.comboHits} · 累计伤害 ${this.p2.comboDamage} · 剑契 ${this.p1.resource}/5`;
    const el=document.getElementById('practice-stats');if(el.textContent!==text)el.textContent=text;
};
document.getElementById('btn-noble-main').onclick=()=>game.startNoblePractice();
document.getElementById('btn-noble-practice').onclick=()=>game.startNoblePractice();
document.getElementById('practice-reset').onclick=()=>game.resetNoblePractice();
document.getElementById('practice-contract').onclick=()=>{if(game.mode==='practice'){game.p1.resource=5;game.p1.sinceHit=0;}};
document.getElementById('practice-meter').onchange=()=>{if(game.mode==='practice')game.p1.meter=Number(document.getElementById('practice-meter').value);};
if(new URL(location.href).searchParams.get('practice')==='noble')game.startNoblePractice();
