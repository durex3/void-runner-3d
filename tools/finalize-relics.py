from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8');s=s.replace("if(distance<e.size+.45){hurt(e.type==='boss'?22:9);if(e.attack<=0){kickActor(e.obj);e.attack=.8}}", "e.melee=(e.melee||0)-dt;if(distance<e.size+.45){hurt(e.type==='boss'?22:9);if(e.melee<=0){kickActor(e.obj);e.melee=.8}}")
s=s.replace('准备冒险者与动作','准备角色、动作与道具').replace('守住遗迹工坊。','守住遗迹工坊。').replace('战斗阵地','战场装置')
p.write_text(s,encoding='utf-8')
p=Path('tests/browser.mjs');s=p.read_text(encoding='utf-8-sig').replace('3 weapons kill enemies','4 weapons kill enemies');p.write_text(s,encoding='utf-8')
p=Path('素材方案.md');s=p.read_text(encoding='utf-8');s+='''
## 阶段边界（2026-09-17 用户确认）

本期先稳定玩法：角色移动与武器反馈、战利品拾取和装置部署、六种连锁、升级选择、八波推进与 Boss，以及加载/暂停/重开。当前已有素材足够，无需购买或接入 Dungeon Remastered。

后续再完善场景与更多关卡。Dungeon Remastered 可补充模块化墙、地板、门、宝箱、桶箱等环境道具，不能自动提供关卡生成、机关逻辑或奖励系统。届时先核对基础包是否够用，再决定是否购买 EXTRA；本期不以采购阻塞开发。
''';p.write_text(s,encoding='utf-8')
