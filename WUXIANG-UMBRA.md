# 无相司夜 · 伞术与五响左轮

## 已实现的操作

|按键|动作与机制|
|---|---|
|J 四连|伞柄平推 → 上挑击飞 → 滑铲换位、开伞再次击飞 → 左轮向上射击并强制换弹|
|K|二段跳；第二跳后持续按住约 0.17 秒，开伞滑翔，松手关闭|
|U|可移动射击；5 发弹仓，第 5 发命中爆炸、提高伤害并击退，然后自动换弹|
|空中 U|向前下方射击，后坐力减少下坠速度，配合滑翔延长滞空|
|空中 J|收伞、伞尖向下坠刺并快速落地|
|S|向前撑开雨伞格挡，沿用全角色格挡减伤 90%|
|S+J|伞骨横扫，命中击倒|
|S+U|前方固定雾墙，挡 3 次敌方飞行物后消失，可提前触发接触到的敌方捕兽夹|
|I · 300 气|向前瞬身，命中后开伞顶住敌人，6 次左轮连射后终弹爆炸、击飞；瞬身落空则收招|
|S+I · 200 气|场地雾雨，敌方移速降低、自身移速提高|
|W+I · 100 气|伞尖挑飞，再撑开雨伞弹飞敌人|
|O|保留原镜域特殊技，消耗 3 层，剩余层数保留|

P2 对应方向键与数字键：1 普攻、2 跳跃、4 远攻、5 大招；长按 2 也能滑翔。
手机使用相同方向与动作组合，长按跳跃按钮控制开伞。
原 S+U 的近战 / 远程普攻切换已移除，改为雾墙。

## 初版未指定参数

- 仅司夜气量上限变为 300；P 蓄气每秒 50，6 秒攒满，上限仍为连续 7 秒。
- 普通 U 沿用两秒释放间隔；自动换弹 1.5 秒，可移动、跳跃与格挡。
- 普通子弹基础伤害 68，第五发 150 并击退；正常伤害仍经过资源、格挡与连段计算。
- 300 气招式固定基础伤害总计 600：顶伞 40 + 连射 60×6 + 爆炸 200。初段被格挡或被瞬身无敌躲过时不会强制抓取。
- 100 气招式两段伤害 70 + 130。
- 200 气雾雨持续 8 秒，敌人移速 ×0.70，自身 ×1.25。
- 雾墙最多存在 12 秒、冷却 4 秒；每位司夜同时保留一面。
- 雾雨、弹仓、换弹、捕获、墙体和爆裂子弹方向均进入联机快照；暂停时不扣计时，退出战斗和重开回合会清理效果。

## 动作与生成记录

使用内置 `image_gen`，沿用项目人物参考 `assets/chars/cyber-v1/wuxiang/portrait.png`。
最终素材保存于 `assets/chars/wuxiang-umbra-v2/`；主图为 `source-sheet.png`，平射补充图为 `shoot-sheet.png`。
接入 14 组动作（含稳定防御），普通动作 12–20 帧，大招 25 帧，按 40 FPS 素材配置并与命中帧同步。
按透明轮廓分离人物，不使用人物交叉淡化，避免两个人物影子叠在一起。
移动射击和换弹时保留原步态的腿部动作。

重建：先 `node tools/build-wuxiang-umbra.cjs`，再 `node tools/build-wuxiang-shots.cjs`。第二步补充水平射击与撑伞射击段。
生成脚本需要 Sharp；运行游戏本身只读取本地 PNG。

最终使用的生成提示如下（主图为对初稿的排版修正，保留了全部 16 个动作姿势）：

> Edit this sprite sheet for production extraction. Preserve EXACTLY these sixteen distinct umbrella/revolver masked gentleman poses, costume, colors and facing RIGHT. Rearrange them in the SAME row-major order into a STRICT uniform FOUR COLUMN by FOUR ROW grid on a square canvas. EVERY pose including the complete umbrella, full boots, hat and gun must fit INSIDE its own cell with at LEAST 40 pixels of transparent margin on ALL FOUR SIDES. NO sprites touching. NO overlap between adjacent cells. No stray pieces. Scale every sprite DOWN as necessary to fit the full umbrella inside its cell, with consistent body proportions. The previous sheet had several umbrellas crossing into neighboring cells and feet crossing row edges; this edit must fix those spacing errors. Keep actual TRANSPARENT alpha background, no grid lines, no labels, no shadows, no text. Black top hat silver featureless mask, black coat red tie, cyan magenta Chinese runes on the black umbrella. Full single isolated character per cell, crisp detailed painterly fighting-game art. Especially keep row2col3 upward revolver shot separate from row3col3 airborne downward shot and its open umbrella; and row4col2 low sweep separate from row4col3 overhead open umbrella.

平射补充图：

> Create ONE production sprite key pose sheet, STRICT TWO by TWO grid, 4 clean isolated full-body poses with generous TRANSPARENT alpha margin between cells. Exact reference character: black top hat, featureless silver mask, tailored black long coat, red tie, black gloves and boots, silver revolver with small cyan/magenta Chinese magical engravings, black umbrella. Painterly detailed 2D fighting game sprites, all face RIGHT. Same human height and feet baseline in each cell. NO target, no gunfire effects, no background, no text, no gridlines. Top left: standing upright side view, RIGHT hand extended firing the revolver STRAIGHT HORIZONTALLY RIGHT at chest height, LEFT hand holds CLOSED umbrella down at left side. Top right: same horizontal revolver shot with subtle firing recoil of right wrist, left hand keeps closed umbrella lowered. Bottom left: stable lunging stance, LEFT hand pushes a fully OPEN black umbrella FORWARD RIGHT at stomach height to pin an enemy offscreen; RIGHT hand extends revolver ABOVE the umbrella canopy's top edge and points STRAIGHT HORIZONTALLY RIGHT, barrel level at chest/head height. Both hands and the revolver must be visible; umbrella stays fully OPEN while shooting. Bottom right: same open-umbrella pinning stance, right revolver wrist subtly recoiling after firing, still aims horizontally to the right above canopy. Entire full body including feet, hat, closed/open umbrella and gun inside each cell, minimum 35 transparent pixels margin. Absolutely NO UPWARD-pointing gun: all four revolver barrels are LEVEL horizontal.

## 验证

`tools/check-wuxiang-umbra.cjs` 在真实浏览器中验证弹仓 / 第五发 / 移动换弹 / 滑翔与后坐力 / 坠刺落地 / 滑铲换位 / 击倒 / 三种耗气 / 抓取与瞬身规避 / 雾雨速度 / 挡弹次数 / 捕兽夹触发 / 快照与退出清理。
实战截图在 `artifacts/wuxiang-umbra/`。
