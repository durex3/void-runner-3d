# 美术来源与许可

2026-09-22 补充：黑骑士召唤姿态为现有 KayKit 双手持握动画之上的程序化骨骼叠加，重斩重新分段采样官方下劈动作。圆形地火与炉栅使用已有 CraftPix 素材包的 `7 Fire wall/Fire-wall.png`，十帧原图未修改，沿用 CraftPix 许可而非 CC0，见 `public/assets/effects/purchased/spells/forge-manifest.json`。第二关小怪沿用 KayKit 圆盾、短刃、法杖与模型，配色为实例材质处理。无新增采购。

核对日期：2026-09-21。当前采用 KayKit 角色与道具、Kenney 树岩、外部特效贴图及项目程序化美术。用户原始资源保持不变，运行副本位于 `public/assets/`。

## KayKit

| 来源 | 当前使用 |
|---|---|
| [Adventurers 2.0 EXTRA](https://kaylousberg.itch.io/kaykit-adventurers) | Knight、Ranger、Engineer、Druid；弓弩、霰弹、三种法杖/魔杖、单手剑、双手剑、圆盾与道具 |
| [Skeletons 1.1 EXTRA](https://kaylousberg.itch.io/kaykit-skeletons) | Skeleton_Warrior、Skeleton_Rogue、Skeleton_Mage、Necromancer、Skeleton_Golem，敌人装备及玩家 Skeleton_Mace |
| [Character Animations 1.1](https://kaylousberg.itch.io/kaykit-character-animations) | Rig_Medium_CombatMelee：骑士单手斜斩、单手下砸、双手下劈、双手持握、持盾及格挡受击 |
| [Dungeon Pack 1.1 EXTRA](https://kaylousberg.itch.io/kaykit-dungeon-pack) | 熔炉要塞地砖、炉栅、墙、拱门、柱、旗帜、脚手架、火把与岩石 |
| Mystery Monthly Series 5（[作者主页](https://kaylousberg.itch.io)） | September 2024 Black Knight：黑骑士角色与双手重剑；共用项目已有 Medium 骨骼动作 |

所用文件随附许可均为 **CC0**。EXTRA / FREE 原文件在 `references/purchased/`，Character Animations 源文件在桌面 `美术资源/KayKit_Character_Animations_1.1/` 内。运行副本在 `public/assets/kaykit/`。

- [模型、道具与基础动作来源清单](./public/assets/kaykit/manifest.json)
- [近战动作来源清单](./public/assets/kaykit/combat-animation-manifest.json)
- 原许可：[Adventurers](./public/assets/kaykit/Adventurers-License.txt)、[Skeletons](./public/assets/kaykit/Skeletons-License.txt)、[Character Animations](./public/assets/kaykit/Character-Animations-License.txt)

基础动作来自 Medium / Large 的 General、MovementBasic GLB，使用 Idle_A、Walking_A、Running_A、Hit_A、Death_A。人物 GLB 本身不含这些动画。骑士采用官方近战动作并进行上下半身分层；远程角色及敌人上半身攻击仍由程序辅助。新增包的 CombatRanged 和其他动作未接入。

玩家共 11 套配置、10 个不同武器模型：crossbow_2handed、bow_withString、crossbow_1handed、shotgun、druid_staff、staff、wand、sword_1handed、sword_2handed、Skeleton_Mace，另配 shield_round。共享手弩模型的配置具有不同机制。

装置与掉落使用 turret_base、arrow_crossbow_bundle、potion_large_orange、potion_large_blue、potion_medium_red、spellbook_open、spellbook_closed。弩台由底座和弩组合，炸瓶与法典使用原模型；符文底盘为程序化几何体。

## Kenney 与项目生成内容

第二关资源由 `tools/import-furnace-assets.mjs` 从购买原包提取，路径、依赖和来源见 [第二关资源清单](./public/assets/furnace/manifest.json)。随包 CC0 许可副本：[Dungeon](./public/assets/furnace/DUNGEON-LICENSE.txt)、[Series 5](./public/assets/furnace/SERIES-5-LICENSE.txt)。仅复制使用的模型、纹理和依赖，不包含整套购买包。炉火与攻击预警为程序化几何体。黑骑士复用官方双手下劈、刺击和持握分层动作；普通骷髅攻击仍由程序辅助。

- [Nature Kit 2.1](https://kenney.nl/assets/nature-kit)：CC0，当前加载 `tree_oak.glb`、`rock_largeA.glb` 并调整配色。[原始许可](./public/assets/nature/License.txt)。
- [Particle Pack 1.1](https://kenney.nl/assets/particle-pack)：CC0，骑士近战使用精选的斩击、冲击环、尘土和命中贴图，并由 Three.js 控制颜色、范围与生命周期。[原始许可](./public/assets/effects/kenney/LICENSE.txt)。
- [Combat FX 1.1](https://ragnapixel.itch.io/combat-fx)：用户购买的 RagnaPixel 资源包，按随包 `public-license.txt` 使用。当前接入 `combat-sheet.png` 的逐帧 Sprite Sheet，并保留四张透明首帧，用于骑士命中强化和远程武器差异化反馈；原始 ZIP 保留在 `references/purchased/Combat FX 1.1/`，未修改。
- 遗迹柱廊、地砖、构装伙伴、经验晶体、符文底盘及其余基础效果由程序化几何体创建；Canvas 纹理、SVG 图标、CSS 界面和 Web Audio 合成音效由项目生成。骑士三把武器的差异化命中音色不使用外部音频文件。

### 补充弹体与法术资源

- KayKit Adventurers 箭矢：`public/assets/effects/projectiles/` 包含 `arrow_bow`、`arrow_crossbow` 的 glTF/bin 及 ranger/rogue 配套贴图；沿用上方 Adventurers CC0 许可。
- [StarsteelGaming Spell Effects](https://opengameart.org/content/spell-effects-by-starsteelgaming)：来源页面标注 CC0。运行目录 `public/assets/effects/purchased/spells/` 中 Fireball、Thundersphere 序列及对应小写首帧、Icespear 来自该包；当前工程师弹体使用 Fireball 与 Thundersphere 序列，Icespear 不替代长弓。
- [CraftPix 10 Magic Sprite Sheet Effects](https://free-game-assets.itch.io/pixel-art-magic-sprite-sheet-effects)：`lightning.png`、`explosion.png`、`spikes.png` 和 `nature/unholy-ground.png` 为运行副本。原包 `references/purchased/10-magic-sprite-sheet-effects-pixel-art/License.txt` 指向 CraftPix 文件许可，不能标成 CC0。Unholy/Spikes 当前保留加载引用，不用于自然法杖主要表现。
- [Frostwindz Warrior FREE](https://frostwindz.itch.io/pixel-art-skill-animations-warrior)：`public/assets/effects/purchased/warrior/warrior-1.png`、`warrior-2.png`；随包协议保留在 `references/purchased/Pixel Art Animations - Warrior (FREE)/`。当前仍被加载，但重剑不使用该序列绘制；其许可独立于 Combat FX 与 Kenney。
- 重剑世界空间拖尾和镜头朝向亮边、命中碎片、自然种子核心与根须由项目代码生成，不是新购买的贴图或模型。

上述来源记录不替代原始许可。公开发行前应复核各包的再分发要求及许可副本；未来新增外部贴图、音频或动作时同步更新本文件。

## 保留但不用于当前场景的内容

- [Kenney City Kit Industrial 2.0](https://kenney.nl/assets/city-kit-industrial)：CC0，历史文件在 `public/assets/industrial/`，当前场景不加载。`src/apocalypse.js`、`src/world.js` 未被当前入口使用；当前仍使用 `src/apocalypse.css`。
- 用户提供的 Bilibili 视频仅作风格与玩法参考；`references/` 中封面与关键帧不作为游戏资产展示或打包。
- 未接入 Synty 或 Quaternius。Dungeon Pack 已用于第二关；Series 5 仅接入黑骑士，其他角色仍为库存。库存模型不等于当前已开放玩法，见 [武器素材清单](./武器素材清单.md)。

Vite 会把 `public/` 中保留的历史资产一并复制到构建目录；“当前不加载”不代表已从发行文件中剔除。

### 自然法杖与游侠效果补充

- Kenney Nature Kit 2.1（CC0）：`Side/grass_leafs.png` 接入为 `public/assets/effects/kenney/nature-leaves.png`，用于自然法术叶簇；原授权见 `references/nature-kit/License.txt`。
- Kenney Particle Pack（CC0）：`magic_01.png` 用于自然符文，`trace_01.png` 用于游侠拖尾。UV 取景与动态缩放由运行时代码完成，原素材不改写。
