import * as Actors from './actors.js';
import './boss-test.css';
import './knight-preview.css';

export function installKnightPreview(game){
  document.body.classList.add('boss-test','knight-preview');
  const panel=document.createElement('aside');panel.id='boss-test-panel';
  panel.setAttribute('aria-label','骑士武技预览');
  panel.innerHTML=`<details open><summary>骑士武技 · 一键预览</summary>
    <div style="display:grid;gap:8px"><button data-preview="0">剑盾 · 守卫反击</button><button data-preview="1">重剑 · 破阵重斩</button><button data-preview="2">钉锤 · 震击追猎</button></div>
    <p>三张升级已解锁，目标不会主动攻击。点击按钮可重复播放。</p>
    <label><input id="preview-loop" type="checkbox">循环播放当前效果</label>
    <div class="boss-test-grid"><button id="preview-replay">重播</button><button id="preview-pause">暂停 / 继续</button></div>
    <output id="preview-status" aria-live="polite"></output>
    <p>反击：角色发光与就绪倒计时，再挥剑。破阵：一道金色斩光扫过三人，命中处溅起小火星。追猎：第二锤中心短闪，细碎裂片向外散开。</p>
    <a href="/">返回正式游戏</a></details>`;
  document.body.append(panel);
  let selected=0,age=0,queue=[],damageBefore=0;
  const status=panel.querySelector('output');
  const originalStart=game.start.bind(game);
  game.saveBest=()=>{};
  const play=(slot=selected)=>{
    selected=slot;game.returnToTitle();game.chooseLevel('furnace');game.chooseHero('Knight');originalStart();
    Object.assign(game.state,{shieldCounter:true,heavySweep:true,macePursuit:true,rate:2,remaining:0,spawn:999,shot:999});
    game.equip(slot);game.hero.position.set(0,0,0);game.hero.rotation.y=0;
    for(let i=0;i<(slot===1?3:1);i++){
      const enemy=game.spawnEnemy('brute');enemy.obj.position.set(slot===1?(i-1)*.8:0,0,2.2);enemy.hp=enemy.maxHp=10000;enemy.speed=0;enemy.attack=999;
    }
    age=0;queue=slot===2?[.5,.9]:[slot===0?.9:.5];damageBefore=0;
    game.view.elements.toast.textContent='';
    if(slot===0){game.state.inv=0;game.hurt(1,'preview');}
    status.textContent=['守卫反击：角色发光、倒计时与反击白光','破阵重斩：单道金色斩光与命中火星','震击追猎：第二次命中的青白短闪与飞散裂片'][slot];
    game.audio.resume();document.activeElement?.blur();
  };
  game.start=()=>play();
  // Preview has no AI, waves, hazards or upgrades; attacks still use real combat.
  game.tick=dt=>{
    if(game.state.mode!=='playing')return;
    age+=dt;game.state.time+=dt;
    game.heroHitStop=Math.max(0,game.heroHitStop-dt);
    Actors.animateActor(game.hero,game.heroHitStop>0?0:dt,game.state.time,0);
    for(const e of game.enemies){e.stagger=Math.max(0,(e.stagger||0)-dt);Actors.animateActor(e.obj,dt,game.state.time,0);}
    game.combat.step(dt);
    if(queue.length&&age>=queue[0]){queue.shift();game.attack();}
    const damage=game.enemies.reduce((sum,e)=>sum+e.maxHp-e.hp,0);
    if(damage!==damageBefore){status.textContent+=`\n命中伤害：${(damage-damageBefore).toFixed(1)}`;damageBefore=damage;}
    if(age>3.5&&panel.querySelector('#preview-loop').checked)play();
  };
  game.updateCamera=()=>{
    const mobile=game.camera.aspect<1;
    game.camera.position.set(mobile?8:6,mobile?12:8,mobile?11:9);game.camera.lookAt(0,.8,1);
  };
  panel.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>play(Number(button.dataset.preview)));
  panel.querySelector('#preview-replay').onclick=()=>play();
  panel.querySelector('#preview-pause').onclick=()=>{game.pause();document.activeElement?.blur()};
  for(const event of ['keydown','keyup'])panel.addEventListener(event,e=>e.stopPropagation());
  play();
  if(window.__game)window.__game.knightPreview={play};
}
