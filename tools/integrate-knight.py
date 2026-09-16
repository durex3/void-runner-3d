from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8')
s=s.replace('<button data-character="Knight" disabled title="等待近战动画">骑士 · 暂未开放</button>','<button data-character="Knight">骑士</button>')
s=s.replace('kickActor(hero);sound([600,180,850][profile.type]', 'kickActor(hero,state.rate);sound([600,180,850,240][profile.type]')
s=s.replace('if(state.inv>0)return;state.hp=Math.max(0,state.hp-amount);','if(state.inv>0)return;amount*=hero.userData.profile.damageTaken||1;state.hp=Math.max(0,state.hp-amount);')
s=s.replace('animateActor(hero,dt,state.time,move.lengthSq()?moveSpeed:0);', 'if(combat.swing)hero.rotation.y=Math.atan2(combat.swing.dir.x,combat.swing.dir.z);animateActor(hero,dt,state.time,move.lengthSq()?moveSpeed:0);')
s=s.replace('if(e.dead||e.stunned)continue;e.slow=', 'if(e.dead||e.stunned)continue;e.stagger=Math.max(0,(e.stagger||0)-dt);if(e.stagger>0){animateActor(e.obj,dt,state.time,0);continue}e.slow=')
p.write_text(s,encoding='utf-8')
