from pathlib import Path
p=Path('src/garden.js');s=p.read_text(encoding='utf-8')
start=s.index('const sphere=');end=s.index('const discGeo=',start);s=s[:start]+s[end:]
start=s.index('function part(');end=s.index('export class Garden',start);s=s[:start]+s[end:]
s=s.replace('enemies,damage,toast,burst})','enemies,damage,toast,burst,visualFactory=createRelic})').replace('enemies,damage,toast,burst});','enemies,damage,toast,burst,visualFactory});').replace('plantMesh(type,true)','this.visualFactory(type,true)').replace('plantMesh(type)','this.visualFactory(type)')
s=s.replace('if(!targets.length)continue;p.cooldown=', "if(!targets.length)continue;if(p.type===0){const delta=targets[0].obj.position.clone().sub(p.obj.position);p.obj.rotation.y=Math.atan2(delta.x,delta.z)}p.cooldown=")
p.write_text(s,encoding='utf-8')
p=Path('tests/garden.test.mjs');s=p.read_text(encoding='utf-8-sig');s=s.replace('new Garden({scene,hero,state,','new Garden({scene,hero,state,visualFactory:()=>new T.Group(),');p.write_text(s,encoding='utf-8')
mapping={
'遗迹花园':'遗迹工坊','遗迹<br>花园':'遗迹<br>工坊','RELIC GARDEN':'RELIC WORKSHOP','Relic Garden':'Relic Workshop',
'把战场种成花园':'把战场建成你的工坊','我的战斗花园':'我的战场装置','挥剑、射弩、施法，击退骸骨军团，在遗迹种下防线。':'挥剑、射弩、施法，击退骸骨军团，用战利品构筑防线。',
'荆棘炮台':'自动弩台','孢子炸弹':'炼金炸瓶','孢子囊':'炼金炸瓶','雷光花':'雷鸣法典',
'荆棘种子':'弩箭零件','孢子种子':'炼金药剂','雷鸣法典种子':'充能法典',
'孢子裂变':'炼金共振','荆棘电网':'淬毒弩箭','生命堆肥':'灵魂回收','散弹浇灌':'火力超载','冲刺播种':'战术空投','共生花园':'协同协议',
'附近植物立即生长':'附近装置立即启动','立即生长':'立即启动','浇灌':'充能维护','植物击杀':'装置击杀','植物伤害':'装置伤害',
'种子':'战利品','植物':'装置','播种':'部署','种出':'部署','长成':'启动','生长':'启动','补种':'补充装置','种下':'部署','花园':'阵地','荆棘命中':'弩箭命中','孢子追加':'共振追加','孢子囊':'炼金炸瓶',
'懂了，继续种！':'懂了，继续战斗！','连弩 →':'复合弩 / 长剑 →','最后的苗圃':'遗迹工坊','约 6.5 MiB':'约 6.8 MiB',
}
for name in ['src/main.js','src/garden.js','index.html','README.md','玩法与属性说明.md','ART-CREDITS.md','素材方案.md']:
    p=Path(name);s=p.read_text(encoding='utf-8-sig')
    for a,b in mapping.items():s=s.replace(a,b)
    s=s.replace('电磁变异花','雷鸣法典').replace('孢子','炼金').replace('继续种！','继续战斗！').replace('株','件')
    p.write_text(s,encoding='utf-8')
p=Path('玩法与属性说明.md');s=p.read_text(encoding='utf-8');s+='''
## 15. 道具构筑版（2026-09-17）

不再使用种子、植物模型或种植设定。沿用原有自动部署与连锁数值，视觉全部换成用户提供包内的实际道具：

| 武器击杀 | 拾取物模型 | 部署装置 | 实际素材 |
|---|---|---|---|
| 复合弩 / 长剑 | 弩箭束 | 自动弩台 | arrow_crossbow_bundle、turret_base、crossbow_2handed |
| 炼金霰弹 | 橙色药剂瓶 | 炼金炸瓶 | potion_large_orange |
| 雷鸣法杖 | 闭合法典 | 雷鸣法典 | spellbook_closed、spellbook_open、potion_large_blue |

红色治疗掉落改用 potion_medium_red；经验仍为便于辨认的青色晶体。战利品靠近拾取后自动部署，启动 1.1 秒、存在 48 秒、最多 24 件；资源存在 35 秒、最多 36 件。该轮调整不新增背包、手动放置或随机装备属性。内部 Garden / plants / seeds 命名为兼容原逻辑保留，游戏界面使用装置与战利品。

六种组合改名为炼金共振、淬毒弩箭、灵魂回收、火力超载、战术空投、协同协议；原有数值不变。构装伙伴维护装置，巨像践踏摧毁装置。
''';p.write_text(s,encoding='utf-8')
p=Path('ART-CREDITS.md');s=p.read_text(encoding='utf-8');s+='''
道具构筑版另接入 Adventurers 的 turret_base、arrow_crossbow_bundle、potion_large_orange、potion_large_blue、potion_medium_red、spellbook_open、spellbook_closed。位于 `public/assets/kaykit/props/`，许可同上。弩台由原包底座和弩组合，炸瓶与法典使用原包模型，符文底盘为程序化几何体；不再使用旧程序化植物模型。
''';p.write_text(s,encoding='utf-8')
