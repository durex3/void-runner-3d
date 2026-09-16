from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8')
s=s.replace("['复合弩','炼金霰弹','雷鸣法杖','守卫长剑']", "['复合弩','炼金霰弹','雷鸣法杖']").replace("['CROSSBOW','SHOTGUN','ARC','BLADE']", "['CROSSBOW','SHOTGUN','ARC']").replace('1 / 2 / 3 / 4','1 / 2 / 3').replace("['1','2','3','4']", "['1','2','3']")
s=s.replace('挥剑、射弩、施法','射弩、开火、施法').replace('复合弩 / 长剑 →','复合弩 →')
s=s.replace('(w===3?3.2:15)','15').replace('[.36,.75,1.05,.55]','[.36,.75,1.05]').replace('[600,180,850,240]','[600,180,850]')
start=s.index('if(w===3){const obj=slash');end=s.index('\nif(w===2)',start);s=s[:start]+s[end:]
s=s.replace('projectile,beam,slash','projectile,beam')
p.write_text(s,encoding='utf-8')
p=Path('tests/browser.mjs');s=p.read_text(encoding='utf-8').replace('w<4','w<3').replace('kills>=4','kills>=3').replace('4 weapons kill enemies','3 weapons kill enemies');p.write_text(s,encoding='utf-8')
p=Path('tests/kaykit.mjs');s=p.read_text(encoding='utf-8').replace('A.equipActor(hero,3)','A.equipActor(hero,0)').replace('A.equipActor(h,i)','A.equipActor(h,i%3)');p.write_text(s,encoding='utf-8')
p=Path('README.md');s=p.read_text(encoding='utf-8').replace('1 / 2 / 3 / 4','1 / 2 / 3').replace('四武器击杀','三武器击杀').replace('、近战扇形与弹道','与弹道');s='\n'.join(line for line in s.split('\n') if not line.startswith('- 守卫长剑：'));s+='\n玩家近战暂缓：本地素材未提供专门挥剑动作，按用户要求移除长剑入口。当前只有弩、霰弹与法杖；射击握持/后坐为程序辅助姿态，不是原包自带射击动画。\n';p.write_text(s,encoding='utf-8')
p=Path('玩法与属性说明.md');s=p.read_text(encoding='utf-8').replace('1 / 2 / 3 / 4','1 / 2 / 3').replace(' / 守卫长剑','').replace('四种武器','三种武器').replace('远程武器 15；长剑 3.2','三种武器均为 15').replace('复合弩 / 长剑','复合弩').replace('弩弹道','弩弹道')
start=s.index('| 属性 | 复合弩');end=s.index('\n通用规则：',start);block=s[start:end];lines=[]
for line in block.splitlines():
    if line.startswith('|'):line='|'.join(line.split('|')[:-2])+'|'
    if line.startswith('长剑朝最近目标'):continue
    lines.append(line)
s=s[:start]+'\n'.join(lines)+'\n'+s[end:]
s=s.replace('握持、抬臂、挥剑和后坐','握持、抬臂和后坐')
s+='\n## 16. 本期武器范围\n\n按用户要求，玩家长剑已下线，不补做挥剑动作。当前开放复合弩、炼金霰弹、雷鸣法杖三种武器。素材里有剑、斧等模型不代表已有对应战斗动画；近战等待后续合适动画再评估。原包目前仅有 General / MovementBasic，射击握持与后坐为程序辅助姿态。完整武器模型数量见 `武器素材清单.md`。\n'
p.write_text(s,encoding='utf-8')
