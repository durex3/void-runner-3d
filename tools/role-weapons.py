from pathlib import Path
p=Path('src/main.js');s=p.read_text(encoding='utf-8')
s=s.replace("import * as Actors from './actors.js';", "import * as Actors from './actors.js';\nimport {HEROES} from './loadouts.js';")
start=s.index('<div id="weapons">');end=s.index('<div id="controls">',start);s=s[:start]+'<div id="weapons"></div>'+s[end:]
s=s.replace('<button data-character="Knight" class="">骑士</button>','<button data-character="Knight" disabled title="等待近战动画">骑士 · 暂未开放</button>')
s=s.replace('<button id="start" class="primary">','<p id="role-description"></p><button id="start" class="primary">')
start=s.index('function equip(){');end=s.index('\nring(.8',start)
s=s[:start]+'''function equip(slot=state.loadout){
  if(!equipActor(hero,slot))return;
  state.loadout=slot;state.weapon=hero.userData.weapon;
  const role=HEROES[hero.userData.rig.name];
  $('#weapons').innerHTML=role.weapons.map((w,i)=>`<button class="weapon ${i===slot?'active':''}" data-weapon="${i}" title="${w.detail}"><small>${role.label} / 0${i+1}</small><b>${w.label}</b><span class="weapon-detail">${w.detail}</span></button>`).join('');
  $('#role-description').textContent=`${role.label} · ${role.description}。三种武器局内按 1 / 2 / 3 切换。`;
  document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{if(['title','playing','paused'].includes(state.mode))equip(+b.dataset.weapon)});
}
function chooseHero(name){if(state.mode!=='title'||!selectHero(hero,name))return false;state.loadout=0;equip();document.querySelectorAll('[data-character]').forEach(b=>b.classList.toggle('selected',b.dataset.character===name));return true}
function returnToTitle(){garden.reset();pendingElite=null;[enemies,bullets,drops,fx,hazards,corpses].forEach(clearObjects);keys.clear();resetActor(hero);state.mode='title';$('#modal').classList.add('hidden');$('#overlay').classList.remove('hidden');equip()}
''' +s[end:]
s=s.replace("mode:'title',hp:100", "mode:'title',loadout:0,hp:100")
s=s.replace('const target=targets[0],w=state.weapon;', 'const target=targets[0],w=state.weapon,profile=hero.userData.profile;')
s=s.replace('state.shot=[.36,.75,1.05][w]/state.rate','state.shot=profile.interval/state.rate').replace('targets.slice(0,4)','targets.slice(0,profile.targets)').replace('damageEnemy(e,42*state.damage','damageEnemy(e,profile.damage*state.damage')
s=s.replace('(w===1?5:1)','profile.count').replace('w===1?19:26','profile.speed').replace('life:w===1?.6:1','life:profile.life').replace('(w===1?16:30)*state.damage','profile.damage*state.damage')
old="document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{selectHero(hero,b.dataset.character);document.querySelectorAll('[data-character]').forEach(x=>x.classList.toggle('selected',x===b))})"
s=s.replace(old,"document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>chooseHero(b.dataset.character))")
s=s.replace("document.querySelectorAll('[data-weapon]').forEach(b=>b.onclick=()=>{state.weapon=+b.dataset.weapon;equip()});",'')
s=s.replace("if(['1','2','3'].includes(e.key)){state.weapon=+e.key-1;equip()}","if(['1','2','3'].includes(e.key)&&['title','playing','paused'].includes(state.mode))equip(+e.key-1)")
s=s.replace('<button id="restart" class="primary">再来一局 →</button>', '<button id="restart" class="primary">再来一局 →</button><button id="change-hero" class="primary">更换角色</button>')
s=s.replace("$('#restart').onclick=start}","$('#restart').onclick=start;$('#change-hero').onclick=returnToTitle}")
s=s.replace('selectHero,equip,attack,tick','selectHero,chooseHero,returnToTitle,equip,attack,tick')
s=s.replace('① 武器击杀掉落对应战利品','① 武器击杀掉落战利品：60% 同系，其他两系各 20%')
s=s.replace('复合弩 → 自动弩台（远程单体） · 霰弹 → 炼金炸瓶（近敌爆炸） · 雷鸣法杖 → 雷鸣法典（范围电击）','弓弩偏向自动弩台 · 霰弹偏向炼金炸瓶 · 法杖偏向雷鸣法典；每个角色都能获得三类装置')
p.write_text(s,encoding='utf-8')
p=Path('src/garden.js');s=p.read_text(encoding='utf-8');s=s.replace('visualFactory=createRelic})','visualFactory=createRelic,random=Math.random})').replace('burst,visualFactory});','burst,visualFactory,random});')
s=s.replace('if(Number.isInteger(source?.weapon))this.seed(source.weapon===3?0:source.weapon,pos);', 'if(Number.isInteger(source?.weapon)){const primary=source.weapon===3?0:source.weapon,r=this.random();this.seed((primary+(r<.6?0:r<.8?1:2))%3,pos)}')
p.write_text(s,encoding='utf-8')
p=Path('tests/garden.test.mjs');s=p.read_text(encoding='utf-8');s=s.replace('visualFactory:()=>new T.Group(),','visualFactory:()=>new T.Group(),random:()=>0,');p.write_text(s,encoding='utf-8')
