from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8').replace('state.speed*(e.slow>0?.55:1)*dt','state.speed*dt');p.write_text(s,encoding='utf-8')
