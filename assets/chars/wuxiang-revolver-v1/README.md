# 无相司夜：左轮远程攻击

参考用户原始人物设定图 `../cyber-v1/references/wuxiang.jpg` 中的银色左轮（圆形弹巢、短枪管、黑色握把），以及游戏立绘和原始远攻第 5 帧。

素材由内置 `image_gen` 生成，未使用 CLI。原始输出保存在 `shooting-sheet.png`（透明底，6 列 × 4 行）。`shoot/` 是 12 帧拔枪、瞄准、后坐力及收枪；`aim/` 是 12 帧单次蓄力瞄准，末帧停留；`charged/` 从瞄准与射击素材组合成 12 帧蓄力释放。帧图已裁切并对齐到统一身高和脚底，原文件保留。

运行 `tools/build-wuxiang-revolver.cjs` 可重新安装帧图并生成 `js/wuxiang-revolver.js`，枪口位置从射击接触帧提取并按实际渲染比例换算。`manifest.json` 保存分帧及对齐信息。

普通、蓄力、空中 U 使用实体弹丸与橙金色火花。开火瞬间的火花持续 6 个逻辑帧，弹丸独立飞行并沿途判定碰撞，联机快照传递弹丸类型。保持 2 秒远攻冷却和 7 秒蓄力上限；其他技能和大招使用原机制。

验证：`tools/test-wuxiang-revolver.cjs`、`tools/check-wuxiang-revolver-browser.cjs`。实机预览为 `gameplay-preview.png`。

## 最终生成提示词

Production transparent 2D fighting game animation sheet: exactly 24 full body sprites, exact evenly spaced 6 columns x 4 rows. Use original silver revolver and character from reference1, preserve identity from portrait reference2, and pixel detailed game sprite style and right-facing side view from reference3. Wuxiang: tall slender adult man, black top hat, blank silver mask, black long tailcoat, black trousers/shoes/gloves, white collar crimson tie. His shooting hand draws a silver SIX SHOT REVOLVER with round cylinder, short silver barrel, exposed hammer, curved black grip matching reference1. Other hand keeps closed black umbrella pointed down behind him. Full body and both props fit each cell, identical scale and feet baseline, no labels, no grid lines, actual transparent background. First 12 sprites (rows1-2) one shooting sequence: reach holster, draw, lift, nearly aim, horizontal steady aim, discharge pose (no baked flash), wrist/shoulder recoil upward, settle, aim restored, lower, holster, relaxed stance. Last12sprites (rows3-4) nonloop charged shot preparation: reach holster, draw, gradually raise through distinct intermediate arm poses, cock hammer, steady rightward aim in final poses. Final muzzle horizontal at around 80 percent bodyheight above feet. Real gradual arm/shoulder motions, feet planted, no rescaling, no white trouser patches, no automatic pistol, no rifle. Keep dark fantasy pixel sprite look. No particles, no magic, no flash, no bullet baked into art; game renders those separately.
