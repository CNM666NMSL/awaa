const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class El{constructor(){this.handlers={};this.dataset={};this.value=80;this.classList={add(){},remove(){},toggle(){},contains:()=>true};}addEventListener(n,f){this.handlers[n]=f;}setAttribute(){}setPointerCapture(){}after(){}focus(){}}
const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new El());return nodes.get(id);};
const buttons=['up','left','down','right','skill','special','super_','charge','attack','jump','dash','launcher'].map(action=>{const b=new El();b.dataset.action=action;return b;});
const control=new El();control.querySelectorAll=selector=>selector==='button'?buttons:[];
const config={keys:{up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',skill:'KeyU',special:'KeyO',super_:'KeyI',charge:'KeyP',attack:'KeyJ',jump:'KeyK',dash:'KeyL'}};
const game={phase:'fight',keysDown:{KeyD:true},keysPressed:{},show(){},onMainMenu(){},update(){},readInput(){return {...this.keysDown};},togglePause(){this.phase=this.phase==='fight'?'paused':'fight';}};
const document={getElementById:get,createElement:()=>control,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},body:{classList:{toggle(){}}}};
const window={game,addEventListener(){},scrollTo(){}};
vm.runInNewContext(fs.readFileSync('js/mobile-ui.js','utf8'),{window,document,CONFIG:config,localStorage:{getItem:()=>null,setItem(){}},MutationObserver:class{observe(){}},setInterval(){},requestAnimationFrame:f=>f(),Audio:class{}});
const press=(action,id)=>buttons.find(b=>b.dataset.action===action).handlers.pointerdown({pointerId:id,preventDefault(){}});
const lift=(action,id)=>buttons.find(b=>b.dataset.action===action).handlers.pointerup({pointerId:id});
press('left',1);press('jump',2);let i=game.readInput(config.keys,{});assert(i.KeyA&&i.KeyK&&i.KeyD);assert.deepEqual(game.keysDown,{KeyD:true});assert(game.keysPressed.KeyK);lift('jump',2);i=game.readInput(config.keys,{});assert(i.KeyA&&!i.KeyK);lift('left',1);assert(!game.readInput(config.keys,{}).KeyA);
press('launcher',3);i=game.readInput(config.keys,{});assert(i.KeyW&&i.KeyJ);buttons.find(b=>b.dataset.action==='launcher').handlers.pointercancel({pointerId:3});assert(!game.readInput(config.keys,{}).KeyW);
press('charge',4);assert(game.readInput(config.keys,{}).KeyP);get('quick-settings').onclick();assert.equal(game.phase,'paused');assert(!game.readInput(config.keys,{}).KeyP);get('btn-settings-back').onclick();assert.equal(game.phase,'fight');
get('music-volume').value=0;get('music-volume').oninput();assert.equal(window.awaAudio.values.music,0);assert.equal(window.awaAudio.values.effects,.8);
console.log('PASS: multi-pointer direction+jump, physical key preservation, pointer cancellation, W+J shortcut, charge release on settings, pause/resume and independent audio levels.');
