from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8');s=s.replace("COMBOS.filter(c=>!garden.combos.has(c.id))", "COMBOS.filter(c=>!garden.combos.has(c.id)&&(c.id!=='watering'||hero.userData.rig.name==='Engineer'))").replace('function start(){garden.reset();','function start(){keys.clear();lastDir.set(0,0,1);garden.reset();');p.write_text(s,encoding='utf-8')
p=Path('tests/role-weapons.mjs');s=p.read_text(encoding='utf-8').replace('slot<3;slot++){const {hero}',"slot<(name==='Engineer'?2:3);slot++){const {hero}").replace('all nine loadouts','all eight loadouts').replace('PASS: nine loadouts','PASS: eight loadouts');p.write_text(s,encoding='utf-8')
p=Path('src/apocalypse.css');s=p.read_text(encoding='utf-8');s+='\n.weapon-detail{display:block;font-size:10px;color:#b7c8b9;margin-top:5px;white-space:nowrap}#characters button:disabled{cursor:default;opacity:.4}#role-description{font-size:12px;line-height:1.8;max-width:440px}#change-hero{margin-left:12px}@media(max-width:700px){.weapon-detail{font-size:8px;white-space:normal}.cover h1{font-size:48px}#characters{gap:5px;margin:10px 0}#characters button{padding:7px 9px}#role-description{font-size:10px}.cover p{line-height:1.7}}\n';p.write_text(s,encoding='utf-8')
p=Path('README.md');s=p.read_text(encoding='utf-8');s=s.replace('开始界面可选游侠、骑士、德鲁伊或工程师外观，当前基础属性相同。','开始界面可选游侠、工程师、德鲁伊；骑士等待近战动画，暂未开放。角色分别有 3 / 2 / 3 种武器，共 8 套配置（7 个不同武器模型）。').replace('按 1 / 2 / 3 或点击武器栏随时切换。','按 1 / 2 / 3 或点击武器栏切换本角色武器，工程师仅 1 / 2 有效。').replace('当前只有弩、霰弹与法杖','当前只有弓弩、霰弹与法杖').replace('四种玩家外观','三种开放玩家角色').replace('10 项','11 项');s+='''
## 角色武器池

- 游侠：复合弩、猎手长弓、轻便手弩。
- 工程师：炼金霰弹、速射手弩。
- 德鲁伊：德鲁伊法杖、雷鸣法杖、聚能魔杖。

各武器有独立伤害、间隔与目标数量，详见玩法文档；切换保留公共攻击冷却，已发出的弹丸保留发射时属性。重开保留角色与所选武器，结算可点击“更换角色”。同一弩模型在不同角色间复用，参数不同。没有额外职业被动加成。

为避免武器池限制让组合无法获得，武器击杀有 60% 掉落本系装置资源，其他两系各 20%；所有角色都能部署三类装置。“火力超载”依赖霰弹，只进入工程师升级池。

`node tests/role-weapons.mjs` 验证八套配置的实际伤害、间隔、目标数、握持点、切换冷却、重开与换角流程，输出 `test-results/role-weapons.png`。
''';p.write_text(s,encoding='utf-8')
p=Path('玩法与属性说明.md');s=p.read_text(encoding='utf-8')
s=s.replace('三种武器开局全部可用。','本角色武器开局全部可用，无法切换其他角色的武器。').replace('切换复合弩 / 炼金霰弹 / 雷鸣法杖','切换本角色第 1 / 2 / 3 把武器（工程师仅两把）').replace('基础属性相同，不代表四种独立职业技能','基础生命、移速相同，武器池不同；骑士暂未开放').replace('重开保留外观','重开保留角色及所选武器')
start=s.index('## 4.');end=s.index('通用规则：',start)
s=s[:start]+'''## 4. 角色武器池与属性

| 角色 | 槽位 | 武器 / 原包模型 | 基础伤害 | 间隔（秒） | 攻击特点 |
|---|---|---|---:|---:|---|
| 游侠 | 1 | 复合弩 / crossbow_2handed | 30 | 0.36 | 单发，弹速 26，寿命 1 秒 |
| 游侠 | 2 | 猎手长弓 / bow_withString | 56 | 0.70 | 单发重箭，弹速 32，寿命 1 秒 |
| 游侠 | 3 | 轻便手弩 / crossbow_1handed | 20 | 0.25 | 单发，弹速 30，寿命 0.8 秒 |
| 工程师 | 1 | 炼金霰弹 / shotgun | 每颗 16 | 0.75 | 5 颗散射，弹速 19，寿命 0.6 秒 |
| 工程师 | 2 | 速射手弩 / crossbow_1handed | 14 | 0.18 | 单发速射，弹速 28，寿命 0.8 秒 |
| 德鲁伊 | 1 | 德鲁伊法杖 / druid_staff | 每目标 42 | 1.05 | 最多 4 目标雷击 |
| 德鲁伊 | 2 | 雷鸣法杖 / staff | 每目标 28 | 0.60 | 最多 2 目标雷击 |
| 德鲁伊 | 3 | 聚能魔杖 / wand | 46 | 0.55 | 单目标咒术 |

三个开放角色共 8 套配置、7 个不同武器模型。角色基础属性相同，没有另加职业被动。长弓自动慢速放箭，不需要玩家按住蓄力；弓弩弹丸不穿透。游戏键位对应角色内槽位，内部伤害/资源家族编号仍为弓弩 0、霰弹 1、法术 2。切换保持公共冷却，不可快速换武器绕过射速。工程师按 3 不执行操作。

''' +s[end:]
s=s.replace('雷鸣法杖先取距离玩家最近的四个可攻击敌人','法术按当前武器的目标上限取距离玩家最近的可攻击敌人')
s=s.replace('每次三选一，至少包含一种尚未解锁的组合','每次三选一，至少包含一种当前角色可用且尚未解锁的组合')
s+='''
## 17. 角色适配版补充规则（当前生效）

本节与第 4 节为最新武器规则，覆盖旧版“三种通用武器”的记录。骑士按钮禁用；结算后可重开或更换角色。开局/重开保留选中武器，换角色回到其第一个槽位。

武器击杀不再必定掉同系资源：60% 为当前武器对应家族，其他两个家族各 20%。弓弩偏向弩台、霰弹偏向炸瓶、法术偏向法典。这样任何角色都能获取三类装置并触发跨装置连锁。装置击杀不额外掉装置资源，避免无限繁殖。

“火力超载”需要使用霰弹，仅向工程师提供该升级；其余五种组合三个角色均可选择。未解锁的可用组合耗尽后，升级只抽取常规属性强化。

姿态：长弓握在左手，右手作简化放箭姿态；双手弩/霰弹双手握持；单手弩持于右手；法杖竖持，魔杖朝前。基础骨骼走跑/受击/死亡来自素材，射击与施法上半身仍为程序辅助，不是原包自带专用战斗动作。
''';p.write_text(s,encoding='utf-8')
for filename in ['ART-CREDITS.md','武器素材清单.md']:
    p=Path(filename);s=p.read_text(encoding='utf-8');s+='\n当前角色武器适配：游侠 3 / 工程师 2 / 德鲁伊 3，共 8 套配置，复用 7 个模型：crossbow_2handed、bow_withString、crossbow_1handed、shotgun、druid_staff、staff、wand。骑士暂未开放。此前通用三武器/长剑记录为历史状态。原购买源文件未修改。\n';p.write_text(s,encoding='utf-8')
