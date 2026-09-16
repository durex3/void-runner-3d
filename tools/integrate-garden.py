from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8')
s=s.replace('createCreature,loadNatureAssets','createCreature,createPickup,loadNatureAssets')
s=s.replace("import './style.css';", "import './style.css';\nimport {Garden,COMBOS,PLANTS} from './garden.js';")
s=s.replace('晴风岛冒险','晴风岛 · 战斗花园').replace('晴风岛<br>大冒险','晴风岛<br>战斗花园').replace('BREEZE ISLAND','BATTLE GARDEN')
s=s.replace('带上武器，降落在云端的小小世界。<br>躲开蹦跳的史莱姆，收集星星，搭配专属技能。<br>守住八波怪物，挑战森林石巨人！','射击击败怪物，拾取种子，种出你的战斗花园。<br>荆棘射手 × 爆炸南瓜 × 导电花，组合产生连锁反应。<br>收服精英当伙伴，守住八波进攻！')
s=s.replace('泡泡法杖','雷花法杖')
s=s.replace('<div id="bottom">','<aside id="garden-hud"><b>我的战斗花园</b><div id="garden-counts"></div><div id="buddy-list">伙伴：第 2 波起，精英残血可收服</div><div id="combo-list">击杀掉种子 · 靠近收集后自动播种</div><button id="guide">玩法图鉴 ?</button></aside><div id="bottom">')
s=s.replace("let best=0;", "let best=0;")
s=s.replace("function start(){[enemies", "function start(){garden.reset();pendingElite=null;[enemies")
s=s.replace("state.waveTime=0;toast", "state.waveTime=0;if([2,4,6].includes(state.wave))spawnEnemy(state.wave===4?'runner':'brute',true);toast")
s=s.replace('function spawnEnemy(force){','function spawnEnemy(force,elite=false){')
s=s.replace("const hp=type==='boss'?1100:type==='runner'?25:45+state.wave*5;enemies.push({obj:g,type,hp,maxHp:hp,size,speed:", "if(elite){g.scale.multiplyScalar(1.35);const crown=mesh(geo.cone,mats.gold,0,type==='runner'?1.6:1.8,0,.35,.45,.35,g);crown.rotation.z=.15}const hp=elite?150+state.wave*15:type==='boss'?1500:type==='runner'?25:45+state.wave*5;enemies.push({obj:g,type,elite,stunned:false,slow:0,hp,maxHp:hp,size,speed:")
start=s.index('function damageEnemy(');end=s.index('function attack()',start)
s=s[:start]+'''function damageEnemy(e,d,source={}){if(e.dead||e.stunned)return;e.hp-=d;burst(e.obj.position,0xfbc47b,3);if(e.elite&&e.hp<=e.maxHp*.3){e.hp=Math.max(1,e.hp);e.stunned=true;pendingElite=e;return}if(e.hp<=0){e.dead=true;state.kills++;garden.onKill(e.obj.position,source);sound(140,.07,'triangle',.012);const obj=createPickup(scene,e.obj.position);drops.push({obj,value:e.type==='boss'?15:e.type==='brute'?2:1});if(Math.random()<.09){const obj=createPickup(scene,e.obj.position,true);drops.push({obj,value:0,heal:true})}scene.remove(e.obj);burst(e.obj.position);}}
let pendingElite=null;
const garden=new Garden({scene,hero,state,enemies:()=>enemies,damage:damageEnemy,toast,burst});
function captureChoice(){const e=pendingElite;if(!e)return;state.mode='capture';keys.clear();const type=e.type==='runner'?'mushroom':'slime',name=type==='slime'?'收集史莱姆':'浇灌蘑菇';$('#modal').innerHTML=`<div class="eyebrow">A NEW FRIEND?</div><h2>精英投降了！</h2><p>收服成为伙伴，或击败它立刻获得一次升级。战斗已暂停。</p><div id="choices"><button class="card" id="recruit"><div class="symbol">♥</div><h3>收服 · ${name}</h3><p>${type==='slime'?'帮助收集经验和种子。已有同类时提升伙伴等级。':'每 4 秒治疗并浇灌附近植物。已有同类时提升伙伴等级。'}</p></button><button class="card" id="harvest"><div class="symbol">✦</div><h3>获取成长</h3><p>击败精英，立即获得一次三选一升级。</p></button></div>`;$('#modal').classList.remove('hidden');function resolve(){e.dead=true;scene.remove(e.obj);pendingElite=null;state.mode='playing';$('#modal').classList.add('hidden')}$('#recruit').onclick=()=>{resolve();garden.recruit(type)};$('#harvest').onclick=()=>{resolve();state.kills++;state.xp+=state.need;levelUp()}}
''' +s[end:]
s=s.replace('enemies.filter(e=>!e.dead).sort','enemies.filter(e=>!e.dead&&!e.stunned).sort')
s=s.replace('const w=state.weapon;state.shot=', 'const w=state.weapon;garden.onShot(w);state.shot=')
s=s.replace('damageEnemy(e,42*state.damage)', "damageEnemy(e,42*state.damage*(garden.combos.has('snare')&&e.slow>0?1.7:1),{weapon:2});garden.electrify(e.obj.position)")
s=s.replace('damage:(w===1?16:30)*state.damage','weapon:w,damage:(w===1?16:30)*state.damage')
s=s.replace('damageEnemy(e,b.damage)','damageEnemy(e,b.damage,{weapon:b.weapon})')
s=s.replace('function levelUp(){state.xp-=state.need;', 'function levelUp(){state.xp=Math.max(0,state.xp-state.need);')
s=s.replace("const choices=[...upgrades].sort(()=>Math.random()-.5).slice(0,3);", "const available=COMBOS.filter(c=>!garden.combos.has(c.id)).map(c=>({...c,apply:()=>garden.combos.add(c.id)}));const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};const choices=available.length?[shuffle(available)[0],...shuffle([...upgrades,...available.slice(1)]).slice(0,2)]:shuffle([...upgrades]).slice(0,3);")
s=s.replace('存活 ${Math.floor(state.time)} 秒 · 最佳 ${best} 击败', '播种 ${garden.stats.planted} 株 · 植物击杀 ${garden.stats.kills} · 伙伴 ${garden.buddies.length}<br>存活 ${Math.floor(state.time)} 秒 · 最佳 ${best} 击败')
s=s.replace('state.inv=.4;hero.position.addScaledVector','state.inv=.4;const from=hero.position.clone();hero.position.addScaledVector')
s=s.replace('burst(hero.position);sound(320,.15)', 'garden.onDash(from,hero.position);burst(hero.position);sound(320,.15)')
s=s.replace('function tick(dt){state.time+=dt;', "function tick(dt){if(state.mode!=='playing')return;state.time+=dt;")
s=s.replace('for(const e of enemies){if(e.dead)continue;const delta=', 'for(const e of enemies){if(e.dead||e.stunned)continue;e.slow=Math.max(0,(e.slow||0)-dt);const delta=')
s=s.replace('e.speed*dt)', 'e.speed*(e.slow>0?.55:1)*dt)')
s=s.replace('if(e.dead||b.life<=0)continue','if(e.dead||e.stunned||b.life<=0)continue')
s=s.replace("if(state.mode!=='playing')return;if(state.remaining===0", "if(state.mode!=='playing')return;garden.step(dt,drops,hurt);if(state.mode!=='playing')return;if(pendingElite){captureChoice();return}if(state.remaining===0")
s=s.replace("function ui(){ ", "function ui(){ $('#garden-counts').textContent=PLANTS.map((n,i)=>`${n} ${garden.plants.filter(p=>p.type===i&&!p.dead).length}`).join(' · ');$('#buddy-list').textContent=garden.buddies.length?'伙伴：'+garden.buddies.map(b=>`${b.type==='slime'?'史莱姆':'蘑菇'} Lv.${b.rank}`).join(' / '):'伙伴：第 2 / 4 / 6 波精英可收服';$('#combo-list').textContent=garden.combos.size?'组合：'+COMBOS.filter(c=>garden.combos.has(c.id)).map(c=>c.name).join(' · '):'拾取种子自动播种 · 升级解锁组合'; ")
s=s.replace('state,hero,get enemies()', 'state,hero,garden,get enemies()')
s=s.replace('start,spawnEnemy,renderer};','start,spawnEnemy,renderer,scene};')
s += '''
const guide=$('#guide');guide.onclick=()=>{if(state.mode==='playing'){pause();$('#modal').innerHTML=`<div class="eyebrow">BATTLE GARDEN FIELD GUIDE</div><h2>把战场种成花园</h2><p>① 武器击杀掉落对应种子　② 靠近种子，在脚边自动播种<br>③ 植物约 1 秒长成，可存活 48 秒，最多 24 株<br>连弩 → 荆棘射手（远程单体） · 霰弹 → 南瓜（近敌爆炸） · 法杖 → 导电花（范围电击）<br>第 2 / 4 / 6 波的皇冠精英残血后，可选择收服或升级。<br>史莱姆收集，蘑菇治疗浇灌；Boss 红圈践踏会破坏植物。</p><div class="guide-combos">${COMBOS.map(c=>`<div><b>${c.symbol} ${c.name}</b><p>${c.desc}</p></div>`).join('')}</div><button id="resume" class="primary">懂了，继续种！</button>`;$('#resume').onclick=pause}};
loadNatureAssets(scene).then(()=>{document.body.dataset.nature='loaded'}).catch(()=>{document.body.dataset.nature='fallback'});
'''
p.write_text(s,encoding='utf-8')
w=Path('src/world.js');s=w.read_text(encoding='utf-8').replace('new T.MeshStandardMaterial({color:0xe36c4e})','materials.mushroom').replace("new T.MeshStandardMaterial({color:type==='spitter'?0xa485d9:0x7dcc4f,roughness:.35})","(type==='spitter'?materials.purple:materials.slime)")
s=s.replace("['tree_oak','rock_largeA','plant_bush']","['tree_oak','rock_largeA','crop_pumpkin']").replace('i<8;i++','i<4;i++').replace('/8*Math.PI*2','/4*Math.PI*2')
w.write_text(s,encoding='utf-8')
html=Path('index.html');html.write_text(html.read_text(encoding='utf-8').replace('晴风岛大冒险 · Breeze Island','晴风岛：战斗花园 · Battle Garden'),encoding='utf-8')
