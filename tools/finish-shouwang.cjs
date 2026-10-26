const fs=require('fs');let p='js/game.js',s=fs.readFileSync(p,'utf8');s=s.replace('    drawProjectiles() {\n        for (const p of this.projectiles) {','    drawProjectiles() {\n        for (const p of this.projectiles) {\n            if (window.jiankeFX && ((p.owner?.charId || p.fxChar) === "jianke" || ((p.owner?.charId || p.fxChar) === "shouwang" && window.shouwangFX))) continue;');fs.writeFileSync(p,s);
// Idle is a stable rest pose; readiness belongs to attack anticipation.
p='js/shouwang-anims.js';s=fs.readFileSync(p,'utf8').replace('"frames": 4,','"frames": 1,');fs.writeFileSync(p,s);
