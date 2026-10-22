// 攻击/防御朝向（aim 统一模型）+ 守望者脱甲 无头逻辑测试
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

global.Image = class { set src(v) {} };
global.window = global;
const code = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8")
    + "\n" + fs.readFileSync(path.join(ROOT, "js/fighter.js"), "utf8")
    + "\nglobalThis.Fighter = Fighter; globalThis.CONFIG = CONFIG;";
eval(code);

const A = (name, cond) => { console.log((cond ? "OK  " : "FAIL") + " " + name); if (!cond) process.exitCode = 1; };
const fresh = () => { const f = new Fighter("noble", 200, 1); f.update(); return f; };

console.log("【aim 统一朝向】");
let f = fresh();
f.facing = 1;   // 初始朝右
f.aim(-1);      // 按左键
A("按左键 facing 变 -1", f.facing === -1);
f.attack();     // 攻击（facing 已 -1）
A("攻击朝左（facing=-1 保留）", f.state === "attack" && f.facing === -1);

console.log("【防御朝向跟随 aim】");
f = fresh();
f.facing = 1;
f.aim(1);
f.block(true);
A("防御中按右键 facing=1", f.state === "block" && f.facing === 1);
f.aim(-1);
A("防御中按左键 facing=-1", f.facing === -1);

console.log("【攻击前摇可反向取消、后摇锁朝向】");
f = fresh();
f.aim(-1); f.attack();                 // 朝左出手
A("出手瞬间 facing=-1", f.facing === -1);
// 前摇阶段按右 → 反向取消转向
f.stateTimer = 1;                      // 还在前摇（startup 通常 ≥4）
f.aim(1);
A("前摇阶段反向取消：facing 变 1", f.facing === 1);
// 后摇阶段（stateTimer 超过 startup+active）按左 → 锁定
f.stateTimer = 30;                     // 已在后摇
f.aim(-1);
A("后摇阶段锁朝向：facing 仍为 1", f.facing === 1);

console.log("【守望者 block 状态可脱甲】");
const sw = new Fighter("shouwang", 200, 1); sw.update();
sw.meter = 300;
sw.setState("block");   // 模拟按住 S 触发防御
const ok = sw.switchForm();
A("block 状态下可脱甲", ok && sw.form === "unarmored");

console.log("【脱甲后朝向不变】");
const sw2 = new Fighter("shouwang", 200, 1); sw2.update();
sw2.meter = 300;
sw2.aim(-1);          // 朝左
sw2.switchForm();     // 脱甲
A("脱甲不改变 facing", sw2.form === "unarmored" && sw2.facing === -1);

console.log(process.exitCode ? "\n有失败项 ✗" : "\n全部通过 ✓");
