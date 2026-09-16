from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8')
s=s.replace("import {projectile,beam} from './projectiles.js';", "import {projectile} from './projectiles.js';\nimport {WeaponCombat} from './combat.js';")
s=s.replace('  if(!equipActor(hero,slot))return;', '  const previous=state.loadout;if(!equipActor(hero,slot))return;if(previous!==slot)combat.cancelBurst();')
s=s.replace('let enemies=[],bullets=[],drops=[]','let enemies=[],drops=[]').replace('[enemies,bullets,drops,fx,hazards,corpses]','[enemies,drops,fx,hazards,corpses]')
s=s.replace('function returnToTitle(){garden.reset();','function returnToTitle(){combat.reset();garden.reset();').replace('function start(){keys.clear();','function start(){combat.reset();keys.clear();')
anchor='const garden=new Garden({scene,hero,state,enemies:()=>enemies,damage:damageEnemy,toast,burst});'
s=s.replace(anchor,anchor+"\nconst combat=new WeaponCombat({scene,hero,state,enemies:()=>enemies,damage:damageEnemy,garden,onFire:profile=>{kickActor(hero);sound([600,180,850][profile.type],.07,profile.type===1?'sawtooth':'triangle',.018)},effect:(obj,life)=>{if(fx.length>=180)return;scene.add(obj);fx.push({obj,life,v:new T.Vector3(),fixed:true})}});")
start=s.index('function attack(){');end=s.index('\nfunction hurt(',start);s=s[:start]+'function attack(){return combat.attack()}'+s[end:]
start=s.index('enemies=enemies.filter(e=>!e.dead);for(const b of bullets)');end=s.index('\nfor(const h of hazards)',start)
s=s[:start]+'enemies=enemies.filter(e=>!e.dead);combat.step(dt);'+s[end:]
s=s.replace('const move=new T.Vector3(', 'const moveSpeed=state.speed*(hero.userData.profile.moveBonus||1),move=new T.Vector3(').replace('hero.position.addScaledVector(move,state.speed*dt)','hero.position.addScaledVector(move,moveSpeed*dt)').replace('move.lengthSq()?state.speed:0','move.lengthSq()?moveSpeed:0')
s=s.replace('get bullets(){return bullets}', 'get bullets(){return combat.bullets},combat')
p.write_text(s,encoding='utf-8')
