from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8');s=s.replace('window.__game={THREE:T,state,hero','window.__game={THREE:T,actors:Actors,state,hero');p.write_text(s,encoding='utf-8')
replacements={'末日苗圃':'遗迹花园','破门霰弹':'炼金霰弹','电磁发射器':'雷鸣法杖','电磁武器':'雷鸣法杖','电磁变异花':'雷光花','拾荒机器人':'采集构装体','医疗无人机':'治愈构装体','拾荒机':'采集构装体','医疗机':'治愈构装体','重装变异体':'骸骨巨像','重装体践踏':'巨像践踏','医疗机器人':'治愈构装体','强力弹药':'锋芒祝福','敏捷扳机':'迅捷祝福'}
for filename in ['src/garden.js','玩法与属性说明.md','README.md']:
    p=Path(filename);s=p.read_text(encoding='utf-8-sig')
    for a,b in replacements.items():s=s.replace(a,b)
    s=s.replace('1 / 2 / 3 |','1 / 2 / 3 / 4 |').replace('切换复合弩 / 炼金霰弹 / 雷鸣法杖','切换复合弩 / 炼金霰弹 / 雷鸣法杖 / 守卫长剑').replace('三种武器开局全部可用','四种武器开局全部可用').replace('## 4. 三种武器','## 4. 四种武器').replace('三武器击杀','四武器击杀')
    p.write_text(s,encoding='utf-8')
