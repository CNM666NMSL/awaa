const fs=require('fs');let p='index.html',s=fs.readFileSync(p,'utf8');
s=s.replace('aria-label="贵族练习场"','aria-label="全角色练习场"').replace('<strong>贵族练习场</strong>','<strong id="practice-title">自由练习场</strong>').replace('<button id="practice-contract">叠满剑契</button>','<button id="practice-change-character">重新选人</button><button id="practice-contract">叠满资源</button>');
s=s.replace('贵族练习场 / 出招表','全角色练习场 / 出招表').replace('<summary>贵族出招表与参数</summary>','<summary id="practice-move-title">出招表与参数</summary>');s=s.replace('帧数以 60 FPS、0 层剑契计；射程从角色中心计算，单位为游戏像素。每层剑契增加 3% 攻速、5% 伤害，最多 5 层。招架成功叠满剑契并回 20 气，反击实际造成 88 点伤害。七重刺实际伤害随剑契及连段衰减变化。练习靶桩会自动恢复。','帧数以 60 FPS、0 层资源计；射程从角色中心计算，单位为游戏像素。实际伤害受资源、形态和连段影响。练习靶桩会自动恢复。');
s=s.replace('A / D 移动 · J 三段连击 · W + J 上挑 · S + J 低刺 · K 跳跃 · 空中 J 下劈 · L → J 突刺 · U 剑气 · O 招架 · I 必杀 · S + P 蓄气。','A / D 移动 · J 三段连击 · W + J 上攻 · S + J 下攻 · K 二段跳 · 空中 J 空中攻击 · L → J 冲刺攻击 · U 远攻 · O 特殊技 · I 必杀 · P / S + P 攒气。');
const chooser=`    <div id="menu-practice-select" class="overlay archive-menu hidden" aria-label="练习场选人">
        <div class="archive-heading"><span>AWA / TRAINING</span><h2>练习场 · 选择角色</h2><p>选择操控角色与陪练角色，自由熟悉动作和技能</p></div>
        <div class="practice-pick-columns">
            <section><h3>操控角色 · P1</h3><div class="char-grid" id="practice-grid-player"></div><label id="practice-player-form-label" class="practice-form-label hidden">守望者形态 <select id="practice-player-form"><option value="armored">穿甲 · 银铠守望</option><option value="unarmored">脱甲 · 符文重剑</option></select></label></section>
            <section><h3>陪练角色</h3><div class="char-grid" id="practice-grid-target"></div><label id="practice-target-form-label" class="practice-form-label hidden">守望者形态 <select id="practice-target-form"><option value="armored">穿甲 · 银铠守望</option><option value="unarmored">脱甲 · 符文重剑</option></select></label></section>
        </div>
        <div class="practice-pick-footer"><p id="practice-pick-summary" aria-live="polite"></p><button id="btn-practice-start" class="menu-btn">进入练习</button><button id="btn-practice-select-back" class="menu-btn back">返回</button></div>
    </div>
`;
s=s.replace('    <!-- ================= 本地对战选人 ================= -->',chooser+'\n    <!-- ================= 本地对战选人 ================= -->');
s=s.replace('practice.css?v=20261023-rain1','practice.css?v=practice-all1').replace('js/noble-practice.js?v=20261023-rain1','js/noble-practice.js?v=practice-all1').replace('js/rain-weather.js?v=rain2','js/rain-weather.js?v=rain3');fs.writeFileSync(p,s);
p='js/noble-practice.js';s=fs.readFileSync(p,'utf8');s=s.replace('const d = CONFIG.characters.noble, tiers = d.superTiers;',`const id=this.p1?.charId||'noble',d=CONFIG.characters[id],tiers=d.superTiers;
    if(id!=='noble')return [
        ['j1','第一段普攻 · J',d.combo[0]],['j2','第二段普攻 · J,J',d.combo[1]],['j3','第三段普攻 · J,J,J',d.combo[2]],
        ['launcher','上攻 · W+J',d.launcher],['low','下攻 · S+J',d.low],
        ['dashAttack',(d.dashAttack?.name||'冲刺攻击')+' · L→J',d.dashAttack?{...d.dashAttack,cost:CONFIG.resources.dashCost}:null],
        ['airAttack',(d.airAttack?.name||'空中攻击')+' · 空中J',d.airAttack],['u','远攻 · U',d.skill],
        d.special?.type==='parry'?['parry',(d.special.name||'招架')+' · O',{damage:d.special.counter.damage,cost:0,startup:0,active:d.special.window,recovery:d.special.failRecover}]:['special',d.resource.name+' · O',{cost:0,startup:0,active:20,recovery:0}],
        ['super_','超必杀 · 100气I',{...d.super_,cost:100}]
    ].filter(row=>row[2]);`);
s=s.replace('Game.prototype.startNoblePractice = function() {',`Game.prototype.startNoblePractice = function(charId='noble',targetId='noble',form='armored',targetForm='armored') {
    if(!CONFIG.roster.includes(charId)||!CONFIG.roster.includes(targetId))return;
    this.practiceSelection={player:charId,target:targetId};this.practiceForm=form==='unarmored'?'unarmored':'armored';this.practiceTargetForm=targetForm==='unarmored'?'unarmored':'armored';`);
s=s.replace("new Fighter('noble',510,1); this.p2 = new Fighter('noble',630,-1)","new Fighter(charId,510,1); this.p2 = new Fighter(targetId,630,-1)");s=s.replace('const d=CONFIG.characters.noble;',`const d=CONFIG.characters[charId];
    document.getElementById('practice-title').textContent=d.name+' · 练习场';
    document.getElementById('practice-move-title').textContent=d.name+' · 出招表与参数';
    document.getElementById('practice-contract').textContent='叠满'+d.resource.name;`);
s=s.replace('this.p1.resetForRound(510,1);this.p2.resetForRound(630,-1);',`this.p1.resetForRound(510,1);this.p2.resetForRound(630,-1);
    if(this.p1.canSwitchForm())this.p1.form=this.practiceForm||'armored';
    if(this.p2.canSwitchForm())this.p2.form=this.practiceTargetForm||'armored';`);
s=s.replace("else if(key==='u')", "else if(key==='special'){f.castSpecial();}\n    else if(key==='u')");s=s.replace('· 剑契 ${this.p1.resource}/5','· ${this.p1.def.resource.name} ${this.p1.resource}/${this.p1.resourceMax}');
let at=s.indexOf("document.getElementById('btn-noble-main')");s=s.slice(0,at)+`Game.prototype.openPracticeSelect=function(){
    this.practiceReturnToFight=this.mode==='practice'&&!!this.p1&&['fight','paused'].includes(this.phase);
    this.practiceSelection ||= {player:'noble',target:'noble'};
    this.phase='menu';this.show('menu-practice-select');
    document.getElementById('noble-practice').classList.add('hidden');
    this.buildPracticeSelection();
};
Game.prototype.buildPracticeSelection=function(){
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
if(practiceQuery==='select')game.openPracticeSelect();else if(CONFIG.roster.includes(practiceQuery))game.startNoblePractice(practiceQuery);
`;fs.writeFileSync(p,s);
