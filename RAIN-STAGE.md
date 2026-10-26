# C 工业街口 · 黄昏雨战

用户已选C。将原lingxia场景替换为“暮雨 · 废弃工业街”，图像为 assets/stages/industrial-rain.png。原场景文件保留。

Three.js雨水模块 js/rain-weather.js，260条动态雨线；雨线经过人物头部范围时触发小水滴，人物使用当前精灵的透明轮廓叠加湿润冷色；脚步与落地触发水花，场地底部持续水面涟漪。此为风格化交互，没有改变角色碰撞、伤害和移动参数。对贵族、剑客和守望者通用，其他关卡不下雨。暂停冻结天气时间，粒子上限180，复用顶点缓冲区。含WebGL不可用时的保护，背景仍可正常显示。

验证：node tools/test-rain.cjs、node tools/test-jianke.cjs、node tools/test-noble-combat.js。