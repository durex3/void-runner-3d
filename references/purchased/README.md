# 用户提供素材目录

核对日期：2026-09-17。现有资源已满足本期玩法需求，无需再次购买或重新下载。

## 已有原文件

- `KayKit_Adventurers_2.0_EXTRA/`、`KayKit_Adventurers_2.0_FREE/`
- `KayKit_Skeletons_1.1_EXTRA/`、`KayKit_Skeletons_1.1_FREE/`

FREE 是对应 EXTRA 的内容子集，库存统计不重复计数。本目录作为原始资源留存区，模型、贴图及随附许可保持原样；项目从中选择文件复制到运行目录。

Character Animations 1.1 单独位于：

```text
C:\Users\liuge\Desktop\美术资源\KayKit_Character_Animations_1.1\
  KayKit_Character_Animations_1.1\
    Animations\gltf\Rig_Medium\Rig_Medium_CombatMelee.glb
    License.txt
```

当前仅从这个新包接入中型近战动作，用于骑士。原包中存在其他动作不代表已接入游戏。

## 运行副本与记录

运行文件位于 `public/assets/kaykit/`。`tools/copy-kaykit.py` 选择角色、武器、道具与基础动作；`tools/import-combat-animations.py` 选择近战动作，不修改原模型。

- [模型与基础动作清单](../../public/assets/kaykit/manifest.json)
- [近战动作来源清单](../../public/assets/kaykit/combat-animation-manifest.json)
- [项目美术许可说明](../../ART-CREDITS.md)
- [素材方案与后续计划](../../素材方案.md)

上述脚本用于资源维护，不是每次运行游戏的必需步骤。Dungeon Remastered 尚未引入，留待后续场景阶段评估。
