// 守望者双形态 无头逻辑测试
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
const freshShouwang = () => { const f = new Fighter("shouwang", 200, 1); f.update(); return f; };
const freshNoble = () => { const f = new Fighter("noble", 200, 1); f.update(); return f; };

console.log("【形态初始化】");
let f = freshShouwang();
A("守望者默认穿甲形态", f.form === "armored");
A("守望者可切换形态", f.canSwitchForm());
A("其他角色无形态", freshNoble().form === null && !freshNoble().canSwitchForm());

console.log("【形态切换】");
f = freshShouwang();
f.meter = 300;
const cost = f.def.formSwitchCost;
f.switchForm();
A("切换成功且耗气 200", f.form === "unarmored" && f.meter === 300 - cost);
A("切换标记 justSwitchedForm", f.justSwitchedForm === true);
f = freshShouwang();
// 气不足切换失败（穿甲状态）
f = freshShouwang();
f.meter = 100;
const ok = f.switchForm();
A("气不足切换失败", !ok && f.form === "armored");

// 单向：脱甲后不可切回穿甲（即使气足够）
f = freshShouwang();
f.meter = 300;
f.switchForm();   // → unarmored
f.meter = 300;
const back = f.switchForm();
A("单向切换：脱甲后不可切回", !back && f.form === "unarmored" && f.meter === 300);

console.log("【形态数值加成】");
f = freshShouwang();
const armoredSpd = f.curWalkSpeed();
A("穿甲移速降低", armoredSpd < f.def.walkSpeed);
const armoredDef = f.defenseScale();
A("穿甲减伤 20%", Math.abs(armoredDef - 0.8) < 0.01);
A("穿甲攻速无额外加成", f.attackSpeedFactor() === 1);
f.switchForm = null; // 防误触
f2 = freshShouwang();
f2.meter = 300;
f2.switchForm();
A("脱甲攻速 +10%", Math.abs(f2.attackSpeedFactor() - 1.1) < 0.001);
A("脱甲减伤恢复正常", f2.defenseScale() === 1);

console.log("【回合重置回穿甲】");
f2.resetForRound(200, 1);
A("重置后回穿甲形态", f2.form === "armored");

console.log(process.exitCode ? "\n有失败项 ✗" : "\n全部通过 ✓");
