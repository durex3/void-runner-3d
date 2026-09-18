# 美术来源与许可

核对日期：2026-09-18。当前采用 KayKit 角色与道具、Kenney 树岩及项目程序化美术。仅复制所需素材，未修改用户原始资源。

## KayKit

| 来源 | 当前使用 |
|---|---|
| [Adventurers 2.0 EXTRA](https://kaylousberg.itch.io/kaykit-adventurers) | Knight、Ranger、Engineer、Druid；弓弩、霰弹、三种法杖/魔杖、单手剑、双手剑、圆盾与道具 |
| [Skeletons 1.1 EXTRA](https://kaylousberg.itch.io/kaykit-skeletons) | Skeleton_Warrior、Skeleton_Rogue、Skeleton_Mage、Necromancer、Skeleton_Golem，敌人装备及玩家 Skeleton_Mace |
| [Character Animations 1.1](https://kaylousberg.itch.io/kaykit-character-animations) | Rig_Medium_CombatMelee：骑士单手斜斩、单手下砸、双手下劈、双手持握、持盾及格挡受击 |

所用文件随附许可均为 **CC0**。EXTRA / FREE 原文件在 `references/purchased/`，Character Animations 源文件在桌面 `美术资源/KayKit_Character_Animations_1.1/` 内。运行副本在 `public/assets/kaykit/`。

- [模型、道具与基础动作来源清单](./public/assets/kaykit/manifest.json)
- [近战动作来源清单](./public/assets/kaykit/combat-animation-manifest.json)
- 原许可：[Adventurers](./public/assets/kaykit/Adventurers-License.txt)、[Skeletons](./public/assets/kaykit/Skeletons-License.txt)、[Character Animations](./public/assets/kaykit/Character-Animations-License.txt)

基础动作来自 Medium / Large 的 General、MovementBasic GLB，使用 Idle_A、Walking_A、Running_A、Hit_A、Death_A。人物 GLB 本身不含这些动画。骑士采用官方近战动作并进行上下半身分层；远程角色及敌人上半身攻击仍由程序辅助。新增包的 CombatRanged 和其他动作未接入。

玩家共 11 套配置、10 个不同武器模型：crossbow_2handed、bow_withString、crossbow_1handed、shotgun、druid_staff、staff、wand、sword_1handed、sword_2handed、Skeleton_Mace，另配 shield_round。共享手弩模型的配置具有不同机制。

装置与掉落使用 turret_base、arrow_crossbow_bundle、potion_large_orange、potion_large_blue、potion_medium_red、spellbook_open、spellbook_closed。弩台由底座和弩组合，炸瓶与法典使用原模型；符文底盘为程序化几何体。

## Kenney 与项目生成内容

- [Nature Kit 2.1](https://kenney.nl/assets/nature-kit)：CC0，当前加载 `tree_oak.glb`、`rock_largeA.glb` 并调整配色。[原始许可](./public/assets/nature/License.txt)。
- [Particle Pack 1.1](https://kenney.nl/assets/particle-pack)：CC0，骑士近战使用精选的斩击、冲击环、尘土和命中贴图，并由 Three.js 控制颜色、范围与生命周期。[原始许可](./public/assets/effects/kenney/LICENSE.txt)。
- [Combat FX 1.1](https://ragnapixel.itch.io/combat-fx)：用户购买的 RagnaPixel 资源包，按随包 `public-license.txt` 使用。当前接入 `combat-sheet.png` 的逐帧 Sprite Sheet，并保留四张透明首帧，用于骑士命中强化和远程武器差异化反馈；原始 ZIP 保留在 `references/purchased/Combat FX 1.1/`，未修改。
- 遗迹柱廊、地砖、构装伙伴、经验晶体、符文底盘及其余基础效果由程序化几何体创建；Canvas 纹理、SVG 图标、CSS 界面和 Web Audio 合成音效由项目生成。骑士三把武器的差异化命中音色不使用外部音频文件。

下一阶段的工程师、游侠和德鲁伊远程反馈优先复用现有模型、Kenney Particle Pack 贴图与程序化几何体；若后续引入新的外部贴图、音频或动作文件，必须先补充本文件及对应许可副本，不能仅在代码中记录路径。

## 保留但不用于当前场景的内容

- [Kenney City Kit Industrial 2.0](https://kenney.nl/assets/city-kit-industrial)：CC0，历史文件在 `public/assets/industrial/`，当前场景不加载。`src/apocalypse.js`、`src/world.js` 未被当前入口使用；当前仍使用 `src/apocalypse.css`。
- 用户提供的 Bilibili 视频仅作风格与玩法参考；`references/` 中封面与关键帧不作为游戏资产展示或打包。
- 未接入 Synty、Quaternius 或 KayKit Dungeon Remastered。库存模型不等于当前已开放玩法，见 [武器素材清单](./武器素材清单.md)。

Vite 会把 `public/` 中保留的历史资产一并复制到构建目录；“当前不加载”不代表已从发行文件中剔除。
