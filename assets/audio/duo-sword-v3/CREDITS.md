# 两名剑系角色的动作同步音效

按本轮要求，旧平A、命中、受击、普通技能声音全部关闭。仅为决斗者与剑客的地面普攻连段重新配音；走路/跑步继续使用前版脚步，大招声音配置不变。其他角色暂不制作。

素材来源：

- `sword.wav`：remaxim《3 Melee sounds》，CC0。https://opengameart.org/content/3-melee-sounds 。原始文件 sword sound.wav，保留 MELEE-LICENSE.txt。
- `magic.ogg`：JaggedStone《Magic Spell SFX》，CC0。https://opengameart.org/content/magic-spell-sfx 。使用此前已下载的 tonal magical_2_1 原采样；作者说明该包由音符序列及滤波制作。决斗者叠加短促、略升调的魔法音，低通削弱脆裂高频，没有玻璃/金属碎裂素材。
- `splash-01.flac`、`splash-02.flac`：qubodup 整理《6 Short water splashes》，Public Domain / CC0。https://opengameart.org/content/6-short-water-splashes 。本次重新下载，原始来源及许可见 WATER-LICENSE.txt。剑客以低音量短水声叠加剑风，表现水墨挥洒。

只在 Fighter 普攻前摇跨到 active 起点时发声：使用实际资源加速和动作时长计算，不使用按键即时播放、固定延迟或命中反馈。渲染侧共用已播放标记，避免联机快照和本机模拟重复触发。保留动作打断时的静音，并修剪采样开头的低幅静音，限制单段尾音。

验证：tools/check-duo-sword-audio.cjs 覆盖5A/6A逐段帧同步、每段只响一次、打断静音、旧战斗声音全禁用以及全角色脚步保留。
