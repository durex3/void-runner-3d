from pathlib import Path
p=Path('src/main.js')
s=p.read_text(encoding='utf-8')
s=s.replace("import './style.css';", "import './style.css';\nimport {createWorld,createHero,createCreature,loadNatureAssets} from './world.js';")
start=s.index('// Original procedural art:')
end=s.index('const state=',start)
s=s[:start]+'''const {flame}=createWorld(scene);
const {hero,legs,held}=createHero(scene);
function equip(){held.clear();mesh(geo.box,mats.gold,0,0,.25,.14,.16,.8,held);if(state.weapon===0)mesh(geo.box,mats.dark,0,0,.4,.65,.12,.15,held);if(state.weapon===1)mesh(geo.cyl,mats.dark,0,0,.35,.25,.7,.25,held).rotation.x=Math.PI/2;if(state.weapon===2){mesh(geo.box,mats.gold,0,.1,0,.09,1.3,.09,held);mesh(geo.orb,mats.glow,0,.8,0,.25,.35,.25,held)}document.querySelectorAll('.weapon').forEach((b,i)=>b.classList.toggle('active',i===state.weapon))}
ring(.8,.05,0xffffff,hero);
'''+s[end:]
start=s.index('const g=new T.Group();g.position.set(Math.cos(a)*20',s.index('function spawnEnemy'))
end=s.index('const hp=type===',start)
s=s[:start]+"const g=createCreature(type);g.position.set(Math.cos(a)*20,0,Math.sin(a)*20);scene.add(g);let size=type==='boss'?2.1:type==='runner'?.6:.85;"+s[end:]
s=s.replace("scene.background=new T.Color('#091b24');scene.fog=new T.FogExp2('#091b24',.018);", "scene.background=new T.Color('#a5dcf0');")
s=s.replace('renderer.toneMappingExposure=1.3','renderer.toneMappingExposure=1.15')
s=s.replace('camera.position.set(24,23,28);camera.lookAt(1,0,0)', 'camera.position.set(31,34,39);camera.lookAt(0,0,0)')
s=s.replace('new T.Vector3(target.x+18,23,target.z+22)', 'new T.Vector3(target.x+24,32,target.z+29)')
replacements={'EMBER WATCH':'BREEZE ISLAND','余烬守望':'晴风岛冒险','长夜将至<br>余烬不熄':'晴风岛<br>大冒险','成为最后的守火人，踏入被遗忘的环形遗迹。<br>切换三种秘银武器，收集灵火，重铸你的力量。<br>在八波暗潮之后，击败遗迹吞噬者。':'带上武器，降落在云端的小小世界。<br>躲开蹦跳的史莱姆，收集星星，搭配专属技能。<br>守住八波怪物，挑战森林石巨人！','点燃余烬':'开始冒险','每一次重生，都有不同的可能':'轻松开局 · 越战越强','遗迹吞噬者':'森林石巨人','最终暗潮':'最后的挑战','守住余烬':'怪物来啦','余烬赐福':'冒险升级','BLESSING OF THE EMBER':'CHOOSE YOUR POWER','火光仍在':'休息一下','继续守望':'继续冒险','长夜已尽':'小岛保卫成功','余烬未熄':'下次一定更强','你击败了森林石巨人，黎明重回这片土地。':'你击败了森林石巨人，小岛又恢复了平静。','火种会记得你的勇气。再试一次，重铸你的力量。':'试试不同的武器和升级组合，再来一局吧！','重新点燃':'再来一局','炽烈火种':'强力弹药','轻羽弦机':'敏捷扳机','古树之心':'生命果实','逐风步履':'疾风靴子','灵火共鸣':'星星磁铁','灵火拾取范围':'经验拾取范围','逐火弩':'蜜蜂连弩','碎星铳':'南瓜霰弹','雷鸣杖':'泡泡法杖','SECTOR':'ISLAND'}
for a,b in replacements.items():s=s.replace(a,b)
p.write_text(s,encoding='utf-8')
html=Path('index.html');html.write_text(html.read_text(encoding='utf-8').replace('余烬守望 · EMBER WATCH','晴风岛大冒险 · Breeze Island'),encoding='utf-8')
