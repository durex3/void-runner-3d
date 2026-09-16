from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8')
s=s.replace("import './style.css';", "import './style.css';\nimport './apocalypse.css';\nimport {projectile,beam,slash} from './projectiles.js';")
s=s.replace("createPickup,loadNatureAssets} from './world.js'", "createPickup,loadNatureAssets,animateActor,kickActor} from './apocalypse.js'")
s=s.replace('renderer.toneMappingExposure=1.15','renderer.toneMappingExposure=.92')
s=s.replace("'雷花法杖'].map", "'雷花法杖','锯齿长刀'].map")
s=s.replace("['CROSSBOW','SCATTER','ARCANE'][i]", "['CROSSBOW','SHOTGUN','ARC','BLADE'][i]")
s=s.replace('${icons[i]}', '${icons[i]||icons[0]}')
s=s.replace('1 / 2 / 3', '1 / 2 / 3 / 4').replace("['1','2','3'].includes", "['1','2','3','4'].includes")
s=s.replace("hero.position.set(0,0,4);", "hero.position.set(0,0,4);hero.userData.rig.phase=0;hero.userData.rig.kick=0;")
start=s.index('function equip()');end=s.index('ring(.8',start)
s=s[:start]+'''function equip(){held.clear();if(state.weapon===3){mesh(geo.box,mats.dark,0,0,0,.14,.35,.14,held);const blade=mesh(geo.box,mats.skin,0,.58,0,.2,.95,.055,held);blade.rotation.z=-.12;mesh(geo.box,mats.gold,0,.17,0,.4,.08,.1,held)}else{mesh(geo.box,mats.dark,0,0,.25,.18,.2,.85,held);if(state.weapon===0)mesh(geo.box,mats.gold,0,0,.4,.8,.1,.13,held);if(state.weapon===1){mesh(geo.cyl,mats.dark,0,0,.48,.13,.85,.13,held).rotation.x=Math.PI/2}if(state.weapon===2)mesh(geo.orb,mats.glow,0,.04,.63,.16,.12,.2,held)}document.querySelectorAll('.weapon').forEach((b,i)=>b.classList.toggle('active',i===state.weapon))}
''' +s[end:]
start=s.index('function attack()');end=s.index('function hurt(',start)
s=s[:start]+'''function attack(){const targets=enemies.filter(e=>!e.dead&&!e.stunned).sort((a,b)=>a.obj.position.distanceToSquared(hero.position)-b.obj.position.distanceToSquared(hero.position));if(!targets.length)return;const target=targets[0],w=state.weapon;if(target.obj.position.distanceTo(hero.position)>(w===3?3.2:15))return;const dir=target.obj.position.clone().sub(hero.position).setY(0).normalize();hero.rotation.y=Math.atan2(dir.x,dir.z);garden.onShot(w);state.shot=[.36,.75,1.05,.55][w]/state.rate;kickActor(hero);sound([600,180,850,240][w],.07,w===1?'sawtooth':'triangle',.018);
if(w===3){const obj=slash(hero.position,dir);scene.add(obj);fx.push({obj,life:.18,v:new T.Vector3(),fixed:true});for(const e of targets){const delta=e.obj.position.clone().sub(hero.position).setY(0);if(delta.length()<=3.2&&delta.normalize().dot(dir)>=.5)damageEnemy(e,38*state.damage,{weapon:3})}return}
if(w===2){for(const e of targets.slice(0,4)){if(e.obj.position.distanceTo(target.obj.position)<6){const obj=beam(hero.position.clone().setY(1.2),e.obj.position.clone().setY(1));scene.add(obj);fx.push({obj,life:.16,v:new T.Vector3(),fixed:true});damageEnemy(e,42*state.damage*(garden.combos.has('snare')&&e.slow>0?1.7:1),{weapon:2});garden.electrify(e.obj.position)}}return}
for(let i=0;i<(w===1?5:1);i++){const v=dir.clone().applyAxisAngle(new T.Vector3(0,1,0),w===1?(i-2)*.14:0).multiplyScalar(w===1?19:26);const obj=projectile(hero.position.clone().setY(1),v,w);scene.add(obj);bullets.push({obj,v,life:w===1?.6:1,weapon:w,damage:(w===1?16:30)*state.damage})}}
''' +s[end:]
s=s.replace('legs[0].rotation.x=Math.sin(state.time*16)*.5;legs[1].rotation.x=-legs[0].rotation.x}else legs.forEach(l=>l.rotation.x=0);','}animateActor(hero,dt,state.time,move.lengthSq()?state.speed:0);if(state.weapon===3)held.rotation.z=-.35+hero.userData.rig.kick*1.6;else held.rotation.z=0;')
s=s.replace('e.obj.position.y=Math.sin(state.time*5+e.obj.id)*.06;', "animateActor(e.obj,dt,state.time,(e.type!=='spitter'||distance>8)?e.speed*(e.slow>0?.55:1):0);")
s=s.replace("const obj=mesh(geo.orb,mats.red,e.obj.position.x,.7,e.obj.position.z,.18);hazards.push({obj,v:dir.multiplyScalar(5),life:6})", "const v=dir.multiplyScalar(5),obj=projectile(e.obj.position.clone().setY(.7),v,0,true);scene.add(obj);kickActor(e.obj);hazards.push({obj,v,life:6})")
s=s.replace('f.v.y-=dt*8','if(!f.fixed)f.v.y-=dt*8')
s=s.replace('camera.position.set(31,34,39)', 'camera.position.set(30,31,37)').replace('new T.Vector3(target.x+24,32,target.z+29)','new T.Vector3(target.x+20,27,target.z+24)')
s=s.replace("hero.rotation.y=now*.0003;", "hero.rotation.y=now*.0003;animateActor(hero,dt,now/1000,0);")
s=s.replace('get drops(){return drops}', 'get drops(){return drops},get bullets(){return bullets},get hazards(){return hazards},attack')
s=s.replace('const type=e.type===\'runner\'?\'mushroom\':\'slime\'', 'const type=e.type===\'runner\'?\'mushroom\':\'slime\'')
p.write_text(s,encoding='utf-8')
g=Path('src/garden.js');s=g.read_text(encoding='utf-8').replace("import {createCreature} from './world.js'", "import {createCompanion} from './apocalypse.js'")
s=s.replace("createCreature(type==='slime'?'brute':'runner')", 'createCompanion(type)').replace('obj.scale.setScalar(.7)','obj.scale.setScalar(1)')
s=s.replace('this.seed(source.weapon,pos)','this.seed(source.weapon===3?0:source.weapon,pos)').replace('this.plant(this.state.weapon,','this.plant(this.state.weapon===3?0:this.state.weapon,')
s=s.replace("b.obj.position.y=Math.abs(Math.sin(this.state.time*5))*.18;", "b.obj.position.y=b.type==='mushroom'?Math.sin(this.state.time*4)*.1:0;b.obj.traverse(o=>{if(o.name==='rotor')o.rotation.y+=dt*35});")
s=s.replace('0x478e48','0x4f8062').replace('0x916749','0x4d5a51').replace('0x72b542,0xee9636,0x9c80df','0x77bc86,0xcc795a,0x8475bd')
g.write_text(s,encoding='utf-8')
mapping={'晴风岛：战斗花园':'末日苗圃','晴风岛 · 战斗花园':'末日苗圃','晴风岛<br>战斗花园':'末日<br>苗圃','晴风岛':'隔离区','BATTLE GARDEN':'DEADLAND NURSERY','蜜蜂连弩':'复合弩','南瓜霰弹':'破门霰弹','雷花法杖':'电磁发射器','荆棘射手':'荆棘炮台','爆炸南瓜':'孢子炸弹','导电花':'电磁变异花','南瓜种子':'孢子种子','雷瓜裂变':'孢子裂变','雷瓜':'孢子','南瓜':'孢子囊','法杖':'电磁武器','收集史莱姆':'拾荒机器人','浇灌蘑菇':'医疗无人机','史莱姆':'拾荒机','蘑菇':'医疗机','森林石巨人':'重装变异体','石巨人':'重装体','精英投降了！':'发现救援设备','收服 ·':'修复 ·','收服成为伙伴，或击败它立刻获得一次升级。':'精英失去战斗能力：修复携带的救援设备，或回收材料强化武器。','收服精英当伙伴，守住八波进攻！':'击破感染精英，修复救援设备，守住最后的苗圃。','射击击败怪物，拾取种子，种出你的战斗花园。':'用刀、弩或枪清除感染者，收集种子，在废墟重建防线。','开始冒险':'进入隔离区','小岛保卫成功':'隔离区已肃清','你击败了重装变异体，小岛又恢复了平静。':'你击败了重装变异体，最后的苗圃得以保存。','怪物来啦':'感染潮来袭','DAWN RETURNS':'ZONE SECURED','THE EMBER REMAINS':'SIGNAL LOST','下次一定更强':'行动中止','A NEW FRIEND?':'SALVAGE PROTOCOL','CHOOSE YOUR POWER':'FIELD MODIFICATION','冒险升级':'战地改装','生命果实':'急救强化','恢复果实':'急救包','星星磁铁':'回收磁场','古树':'变异','金色星星':'数据晶体','橙色果实':'急救包'}
for path in ['src/main.js','src/garden.js','README.md','玩法与属性说明.md','index.html']:
 p=Path(path);s=p.read_text(encoding='utf-8')
 for a,b in mapping.items():s=s.replace(a,b)
 p.write_text(s,encoding='utf-8')
