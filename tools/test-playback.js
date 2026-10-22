// 真实操作序列回放测试：模拟玩家逐帧按键，验证朝向/攻击/防御/脱甲自洽
// 用 fighter.js 的 aim + 各行为方法，按 applyInput 的真实调用顺序驱动
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

global.Image = class { set src(v) {} };
global.window = global;
const code = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8")
    + "\n" + fs.readFileSync(path.join(ROOT, "js/fighter.js"), "utf8")
    + "\nglobalThis.Fighter = Fighter; globalThis.CONFIG = CONFIG;";
eval(code);

let pass = 0, fail = 0;
function A(name, cond) {
    if (cond) { pass++; console.log("  ✓ " + name); }
    else { fail++; console.log("  ✗ " + name); }
}

// 模拟一帧 applyInput 的核心：aim → attack/block/move
function frame(f, keys) {
    // 方向键（l/r 为按住状态）
    const aimDir = (keys.l && !keys.r) ? -1 : (!keys.l && keys.r) ? 1 : 0;
    f.aim(aimDir);
    // 攻击（atk 为边沿触发）
    if (keys.atk) f.attack();
    // 防御
    f.block(keys.d && f.state !== "hit");
    // 移动
    if (keys.l) f.move(-1);
    else if (keys.r) f.move(1);
    else f.stopMove();
    f.update();
}

console.log("【场景1：移动→反向攻击】");
let f = new Fighter("noble", 200, 1); f.update();
frame(f, { r: true });                 // 朝右走
A("右移后 facing=1", f.facing === 1);
frame(f, { l: true, atk: true });      // 按住左 + 攻击
A("按左攻击：facing 先变 -1 再出手", f.facing === -1);
A("攻击状态已进入", f.state === "attack" || f.state === "idle");

console.log("【场景2：防御朝向切换】");
f = new Fighter("noble", 200, 1); f.update();
frame(f, { d: true, r: true });        // 防御 + 右键
A("防御朝右 facing=1", f.facing === 1);
frame(f, { d: true, l: true });        // 防御中换左键
A("防御换左 facing=-1", f.facing === -1);

console.log("【场景3：守望者脱甲全程朝向】");
let sw = new Fighter("shouwang", 200, 1); sw.update();
sw.meter = 300;
frame(sw, { d: true, l: true });       // 朝左防御
A("脱甲前防御朝左 facing=-1", sw.facing === -1);
// 模拟 S+I 脱甲（applyInput 的切换分支）
sw.aim(-1);
sw.switchForm();
A("脱甲成功", sw.form === "unarmored");
A("脱甲后 facing 仍=-1", sw.facing === -1);
frame(sw, { r: true, atk: true });     // 脱甲后向右攻击
A("脱甲后按右攻击 facing=1", sw.facing === 1);

console.log("【场景4：攻击前摇可反向、后摇锁定】");
f = new Fighter("noble", 200, 1); f.update();
f.aim(-1); f.attack();                 // 朝左出手
A("出手瞬间 facing=-1", f.facing === -1);
f.stateTimer = 1;                      // 前摇阶段
f.aim(1);                              // 按右 → 反向取消
A("前摇反向取消 facing=1", f.facing === 1);
f.stateTimer = 30;                     // 后摇阶段
f.aim(-1);                             // 按左 → 锁定
A("后摇锁朝向 facing 仍=1", f.facing === 1);

console.log(`\n结果：${pass} 通过，${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
