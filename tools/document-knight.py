from pathlib import Path
import json
p=Path('package.json');data=json.loads(p.read_text(encoding='utf-8'));data['scripts']['test:weapons']='node tests/role-weapons.mjs && node tests/mechanics-browser.mjs && node tests/knight-browser.mjs';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=Path('tests/role-weapons.mjs');s=p.read_text(encoding='utf-8').replace('PASS: eight loadouts','PASS: eleven loadouts');p.write_text(s,encoding='utf-8')
p=Path('README.md');p.write_text('''# 遗迹工坊 · Relic Workshop

独立 Three.js 浏览器 3D 肉鸽小游戏。所有运行内容均在当前目录，完整规则和数值见 [玩法与属性说明](./玩法与属性说明.md)。

## 运行

开发服务启动后访问 http://127.0.0.1:5188/ 。双击 `START-GAME.cmd`，或执行 `npm install`、`npm run dev`；需要 Node.js 20.19+。

`npm run build` 生成 `dist/`，通过 HTTP 静态服务器托管，不要直接双击 HTML。

## 角色与操作

WASD / 方向键移动，空格冲刺，自动瞄准攻击，1/2/3 或武器栏切换当前角色装备，Esc 暂停，切出窗口自动暂停。工程师只有两个槽位。触屏提供方向与冲刺按钮。

| 角色 | 武器池 | 玩法 |
|---|---|---|
| 骑士 | 剑盾、双手剑、钉锤 | 持盾减伤、范围击退、短程硬直 |
| 游侠 | 复合弩、长弓、轻便手弩 | 稳定单发、穿透三敌、手持移速 +12% |
| 工程师 | 霰弹枪、速射手弩 | 近距散射击退、三连发 |
| 德鲁伊 | 德鲁伊法杖、雷鸣法杖、魔杖 | 延迟范围减速、逐敌连锁、飞行魔弹溅射 |

共 11 套配置，使用 10 个不同武器模型及圆盾。开局选择角色；重开保留角色和装备，结算可更换角色。基础生命、移速相同，装备机制不同。

换武器不刷新冷却，取消未发出的连射箭和未完成前摇的近战；已经射出的弹丸、已经施放的自然冲击保留。暂停冻结延迟攻击，重开清理旧攻击。

## 战利品与局内成长

- 武器击杀掉落经验与装置资源：60% 同系资源，其他两系各 20%。弓弩/近战偏弩台、霰弹偏炸瓶、法术偏法典。
- 靠近资源自动部署，1.1 秒启动，存在 48 秒，最多 24 件。三类装置分别远程单体、近敌爆炸、范围电击。使用包内实际道具模型，无种植设定。
- 经验升级选择属性或连锁机制。六种组合见游戏图鉴；“火力超载”依赖霰弹，仅进入工程师升级池。
- 第 2/4/6 波精英残血后可收服构装伙伴或换一次升级；伙伴负责采集或治疗/维护。
- 共八波，Boss 有环形弹幕与预警践踏。清空第八波获胜。每波间恢复 12 生命，死亡可重开，最佳击败数保存在当前浏览器。

## 素材与动作

采用用户提供的 KayKit Adventurers 2.0 EXTRA、Skeletons 1.1 EXTRA 与 Character Animations 1.1。基础骨骼走跑、受击、死亡已接入；骑士使用官方单手挥砍、双手下劈、持盾和格挡受击动作。近战上半身动作与下半身走跑分层，避免攻击时双腿停止运动。现有远程角色仍为程序辅助握持与射击姿态，完整远程动作暂未替换。

场景为程序化遗迹，边界实例化绘制，搭配 Kenney CC0 树岩。角色共享几何体/贴图、独立骨骼；死亡实例 1.6 秒清理。像素比上限 1.6，装置 24、战利品 36、玩家弹丸 160、粒子/临时线 180。来源与许可见 `ART-CREDITS.md`。

按当前范围，本期未新增特效、关卡或外购场景包，沿用基础弹道与预告圈展示机制。原素材目录未修改。

## 验证

- `npm test`：11 项装置机制、12 项武器机制，以及浏览器移动、升级、精英选择、死亡重开、八波通关分支、手机布局。
- `npm run test:weapons`：11 套配置的伤害/间隔/握持、暂停/切换/重开、骑士真实动作/盾牌减伤/钉锤打断。
- `node tests/kaykit.mjs`：角色切换、贴图、独立骨骼、基础动作与清理。

浏览器测试使用本机 Edge + Playwright，开发服务需运行在 5188。截图、录像和 JSON 在 `test-results/`。调试接口只在 `?test=1` 存在；通关测试加速清怪验证逻辑，不等于完成整局难度评估。
''',encoding='utf-8')
p=Path('玩法与属性说明.md');s=p.read_text(encoding='utf-8')
s=s.replace('| 自动攻击索敌距离 | 全部八套武器配置均为 15 |','| 自动攻击索敌距离 | 远程武器 15；骑士按装备为 3.2 / 3.8 / 2.6 |')
s=s.replace('| 游侠 | 1 | 复合弩', '''| 骑士 | 1 | 守卫剑盾 / sword_1handed + shield_round | 38 | 0.62 | 120° 正面挥砍，持盾减伤 20% |
| 骑士 | 2 | 骑士双手剑 / sword_2handed | 70 | 1.05 | 160° 范围重斩、击退 |
| 骑士 | 3 | 震击钉锤 / Skeleton_Mace | 52 | 0.90 | 90° 短程打击、硬直 |
| 游侠 | 1 | 复合弩''')
s=s.replace('三个开放角色共 8 套配置、7 个不同武器模型。自动索敌距离 15。','四个开放角色共 11 套配置、10 个不同武器模型及圆盾。远程自动索敌距离 15；近战只在武器范围内发动。')
s=s.replace('切换武器保留公共冷却。三连发未射出的后续箭会取消','切换武器保留公共冷却。近战未完成前摇的攻击、三连发未射出的后续箭会取消')
s=s.replace('- 开放角色：游侠 Ranger、德鲁伊 Druid、工程师 Engineer；骑士 Knight 暂未开放。','- 开放角色：骑士 Knight、游侠 Ranger、德鲁伊 Druid、工程师 Engineer。')
start=s.index('## 16.');end=s.index('## 17.',start)
s=s[:start]+'''## 16. 本期武器范围

当前开放第 4 节的 11 套角色武器配置。骑士剑盾、双手剑与钉锤已使用新提供的官方近战动作。双手斧有兼容动作，但本期未加入骑士，留待后续野蛮人角色评估。完整模型数量见 `武器素材清单.md`。

'''+s[end:]
s=s.replace('骑士按钮禁用；','骑士已开放；')
old='本轮以玩法为主，不新增关卡、不制作新的特效、不开放骑士。已读取用户提供的 KayKit Character Animations 1.1，确认有中型骨架远程/近战和大型骨架近战动作；按“先完善玩法”的后续指示，此轮没有复制或接入新战斗动作，当前仍沿用已接入的基础动作与程序辅助握持。'
s=s.replace(old,'本轮以玩法为主，不新增关卡、不制作新的特效。用户后续确认骑士接入后，已复制 Character Animations 1.1 的中型近战动作并适配骑士；远程角色仍沿用基础动作与程序辅助握持。原始素材保持不动。')
s+='''
## 19. 骑士近战与真实动作

| 装备 | 范围 | 正面角度 | 前摇 | 额外效果 | 官方攻击动作 |
|---|---:|---:|---:|---|---|
| 守卫剑盾 | 3.2 | 120° | 0.18 秒 | 装备期间所有受伤乘 0.8 | Melee_1H_Attack_Slice_Diagonal |
| 骑士双手剑 | 3.8 | 160° | 0.40 秒 | 击退初速 5，衰减系数 12 | Melee_2H_Attack_Chop |
| 震击钉锤 | 2.6 | 90° | 0.25 秒 | 普通敌人硬直 0.45 秒，Boss 0.09 秒 | Melee_1H_Attack_Chop |

近战按最近敌人方向起手，在前摇结束时，以骑士当时位置和起手方向检查扇形内敌人，每人只命中一次；前摇期间敌人离开范围可以躲过。角色可继续移动，攻击期间保持挥砍朝向。前摇和动画时长均随攻速缩短。

剑盾为装备型减伤，挥砍期间仍有效，不需要额外按格挡键；没有盾值、格挡概率或完美格挡机制。切换双手剑/钉锤时盾模型与减伤一同移除。

重剑对普通敌人总击退约 0.42 单位，Boss 承受 20%；击退受场地边界限制。钉锤硬直暂停敌人移动、接触攻击及普通弹幕计时；已经飞出的弹丸、已经出现的 Boss 践踏预告不会取消。

骑士站姿使用 Melee_Blocking / Melee_2H_Idle / Idle_A，持盾受击使用 Melee_Block_Hit。中型近战 GLB 来自用户提供的 Character Animations 1.1，CC0。仅对上半身骨骼应用攻击/格挡，腿部继续播放原有走跑动画。动画本身不直接产生伤害，判定由游戏时钟驱动，不新增刀光特效。
''';p.write_text(s,encoding='utf-8')
p=Path('ART-CREDITS.md');s=p.read_text(encoding='utf-8');s=s.replace('握持、挥剑、弩/霰弹后坐与施法上半身姿态由项目程序补充，不是素材包自带攻击动作。','骑士挥砍与格挡使用 Character Animations 1.1 官方动作；弩/霰弹后坐与施法上半身姿态目前仍由项目程序辅助。').replace('运行素材约 6.8 MiB','运行素材选择性复制')
start=s.index('当前角色武器适配：');s=s[:start]+'''当前角色武器适配：骑士 3 / 游侠 3 / 工程师 2 / 德鲁伊 3，共 11 套配置。骑士使用 Adventurers 的 sword_1handed、sword_2handed、shield_round，以及 Skeletons 的 Skeleton_Mace。原购买素材未修改。

新增 [KayKit Character Animations 1.1](https://kaylousberg.itch.io/kaykit-character-animations)：CC0。源文件来自用户桌面美术资源目录，运行时只复制 `Rig_Medium_CombatMelee.glb` 到 `public/assets/kaykit/animations/`。原许可为 `Character-Animations-License.txt`，来源清单为 `combat-animation-manifest.json`。

实际使用单手斜斩、单手下砸、双手下劈、双手持握、持盾和格挡受击。远程动作包、中大型其他动作仍未接入；不因为源包中存在就声称已使用。
''';p.write_text(s,encoding='utf-8')
p=Path('武器素材清单.md');s=p.read_text(encoding='utf-8');start=s.index('本期玩家可用：');s=s[:start]+'''本期玩家可用：骑士 3（剑盾/双手剑/钉锤）、游侠 3、工程师 2、德鲁伊 3，共 11 套配置，使用 10 个不同武器模型及圆盾。原库 20 款模型不等于已实现 20 种武器。

骑士已接入新提供的 Character Animations 1.1 官方近战与格挡动作。斧类有匹配双手动作，但本期留作后续野蛮人角色的候选，不放入骑士武器池。原始素材未修改。
''';p.write_text(s,encoding='utf-8')
