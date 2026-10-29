# Three cyber / Chinese-inspired fighters

The roster now has six playable fighters. These three preserve the identities of the supplied design sheets:

| Fighter | Reference identity | U ranged attack | Full-resource O special | 100-meter ultimate |
| --- | --- | --- | --- | --- |
| 墨瞳 / motong | Green-black hair, tentacle eyes, black lace dress and eye-headed cane | 瞳符脉冲 | 玄瞳锁域: places a seal within 320 units; one hit applies a 36-tick root. Block or blink counters the root through the existing input logic. | 万象归瞳 |
| 猎犬旅者 / liequan | Red cap, bandaged face, red cloak, shotgun, knife and grey wolf | 赤符猎弹 | 狼影追猎: a ground-travelling wolf strike, one hit per cast | 百狩·赤月围猎 |
| 无相司夜 / wuxiang | Top hat, faceless mask, black formal coat, umbrella and revolver | 纸伞雷符 | 八卦镜域: a stationary 150-tick mirror ward, active after 18 ticks; reflects opposing projectiles once and can strike a nearby opponent once | 无相·霓城敕令 |

J gives a four-hit chain, W+J launches, S+J attacks low, K jumps twice, L blinks, U holds/releases ranged charge, I uses meter tiers, P charges meter. O requires five resource stacks and consumes them. Charge introductions play once then hold; the seven-second cap and release-before-restart lock apply. Idle uses one stable drawing. Existing stages and all six fighters are available in local, CPU, LAN and practice menus; the new fighters also have dossier pages and practice move tables.

## Art and animation

Assets were generated using the built-in image_gen tool from the user's three design references. Exact prompts are in `prompts.json`; `generation-jobs.json` includes all final selected image jobs, including the separate wolf prompt. Original references are saved in `references/`, generated sheets in `sheets/`, runtime PNGs in the three character folders. The source sheets are inspected and sliced into registered transparent sprites using `tools/build-cyber-roster.cjs`.

Each fighter has one static idle, ten drawn poses each for walk/run/jump/dash and each of four normal attacks, twelve for guard/charge/ranged casting, and twenty-five for the ultimate. Backward walking reverses the walk cycle. Low attacks, launchers, aerial attacks, short specials and recovery transitions reuse the appropriate complete action drawings; injury/knockdown/KO additionally use code transforms of the stable pose. Ten separate wolf poses support the hunter companion and wolf special. Walk plays at 24 FPS and run at 32 FPS. Portraits are separately cropped for readable selection cards. The manifest records selected source cells rather than claiming duplicated or interpolated frames as new drawings.

Neon talismans, eyes, circuit traces, trigram seals, mirror wards and wolf trails are native canvas effects in `js/cyber-combat.js`, separate from character PNGs. Hit detection runs through the existing Fighter.takeHit path. Custom world objects are serialized into the existing world-object snapshot with a cyber marker and restored with the correct owner on guests. Live two-device networking has not been exercised; serialization/restoration is covered locally.

## Verification

- `tools/test-cyber-roster.cjs`: PNG existence and distinct poses, stable idle, melee chain, both seven-second caps, all 25 ultimate poses, resource gates, special hits, projectile reflection, and guest world-object restoration.
- `tools/check-cyber-browser.cjs`: all new selections, loaded animation images, keyboard melee/ranged/special/ultimate, cinematics and recovery, dossier pages and mobile selection; collects browser/HTTP errors.
- Existing combat, charge/gait and scene selection checks remain applicable.
