# 剑客移动动作

使用内置imagegen，以现有剑客图为参考，生成16个独立姿势：8帧前进循环、4帧后退、2帧起步、2帧停步。保留斗笠、蓑衣、深色长袍、绑腿和长剑。素材与源图保存在 assets/chars/jianke/movement/，配置 js/jianke-movement.js。

游戏中沿用原有按方向键立即转向规则，左右行走使用镜像；朝向锁定时可选择后退动画。前进14fps，后退10fps，起步/停步各8个逻辑帧。停步立即停止位移，收脚动作只影响画面。移动方向与停步标记纳入联网快照。

构建：配置PNGJS_PATH后运行 node tools/build-jianke-movement.cjs 源图路径。测试：node tools/test-jianke.cjs。原始生成提示包含：严格匹配原形象，8个迈步循环姿势，4个谨慎后退姿势，2个起步和2个停步姿势，保持人体与服装一致、透明背景；按完整人物轮廓切分，统一脚底基准。
## 双脚行走修正

按贵族walk参考重新生成了迈步和双脚经过身体下方的姿势，组成8帧循环，12fps。新素材在 assets/chars/jianke/walk-v3/，由 js/jianke-walk.js 覆盖旧walk。内置imagegen，参考为剑客原图及贵族walk的02/06帧；提示重点是近腿/远腿轮流落地，加入低抬脚、后跟抬起及双脚收拢经过的过渡。

修复动作校对页漏加载jianke-movement.js，增加最终walk覆盖配置。新增贵族走路对照及走路逐帧按钮；浏览器已确认显示walk · 3 / 8。入口 tools/jianke-review.html?view=walk。
