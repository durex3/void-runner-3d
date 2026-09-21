import {HEROES} from './loadouts.js';
import './boss-test.css';

// Explicit standalone entry only. Movement, weapons and boss AI are the real game systems.
export function installBossTest(game){
  document.body.classList.add('boss-test');
  const panel=document.createElement('aside');panel.id='boss-test-panel';panel.setAttribute('aria-label','Boss 测试设置');
  panel.innerHTML=`<details open><summary>Boss 测试场 · 设置</summary>
    <form id="boss-test-form">
      <label>Boss<select name="boss"><option value="furnace">第二关 · 黑骑士</option><option value="ruins">第一关 · 骸骨巨像</option></select></label>
      <label>职业<select name="hero">${Object.entries(HEROES).map(([id,h])=>`<option value="${id}">${h.label}</option>`).join('')}</select></label>
      <label>武器<select name="weapon"></select></label>
      <div class="boss-test-grid"><label>伤害倍率<select name="damage">${[1,1.25,1.5,1.75,2].map(n=>`<option>${n}</option>`).join('')}</select></label>
      <label>攻速倍率<select name="rate">${[1,1.2,1.4,1.6,2,3].map(n=>`<option>${n}</option>`).join('')}</select></label></div>
      <label>Boss 起始生命<select name="phase"><option value="1">满血</option><option value="0.49">49% · 测半血阶段</option></select></label>
      <label class="boss-test-check"><input name="invincible" type="checkbox">玩家无敌（仍记录命中）</label>
      <button type="submit">应用设置并重开</button>
    </form><p>设置在重开后生效。无小怪、装置和升级；不会写入正式纪录。</p></details>
    <div class="boss-test-grid"><button id="boss-test-reset">原配置重开</button><button id="boss-test-pause">暂停 / 继续</button></div>
    <output id="boss-test-status" aria-live="off"></output>
    <p>WASD 移动 · 空格冲刺 · 1/2/3 换武器</p><a href="/">返回正式游戏</a>`;
  document.body.append(panel);
  const form=panel.querySelector('form'),field=name=>form.elements.namedItem(name),status=panel.querySelector('output');
  const weapons=()=>{field('weapon').innerHTML=HEROES[field('hero').value].weapons.map((w,i)=>`<option value="${i}">${w.label}</option>`).join('')};
  field('hero').value='Knight';weapons();field('weapon').value='2';field('rate').value='1.6';
  field('hero').addEventListener('change',weapons);
  // Keep form navigation from moving the hero or switching weapons.
  panel.addEventListener('keydown',e=>e.stopPropagation());
  panel.addEventListener('keyup',e=>e.stopPropagation());
  panel.addEventListener('focusin',()=>game.input.clear());
  const originalStart=game.start.bind(game),originalTick=game.tick.bind(game),originalHurt=game.hurt.bind(game);
  let config,boss,hits=0,damageTaken=0,lastText='';
  const render=()=>{
    const action=boss?.furnaceAction;
    const phase=game.state.mode==='won'?'Boss 已击败':game.state.mode==='lost'?'玩家已倒下':game.state.mode==='paused'?'暂停':
      action?({warning:'攻击预警',attack:'攻击中',forge:'召唤地火',recovery:'收招'})[action.phase]:boss?.recovery>0?'收招':'追击 / 等待出招';
    const text=`${config.invincible?'无敌测试':'正常受伤'} · ${game.hero.userData.profile.label}\n${phase} · ${game.state.time.toFixed(1)} 秒\nBoss ${Math.ceil(Math.max(0,boss?.hp||0))} / ${boss?.maxHp||0}\n命中 ${hits} 次 · 实际掉血 ${damageTaken.toFixed(0)}`;
    if(text!==lastText){status.textContent=text;lastText=text}
  };
  const load=()=>{
    game.returnToTitle();game.chooseLevel(config.boss);game.chooseHero(config.hero);originalStart();
    game.state.wave=8;game.state.remaining=0;game.state.damage=config.damage;game.state.rate=config.rate;
    game.equip(config.weapon);game.hero.position.set(0,0,4);game.spawnEnemy('boss');boss=game.enemies.at(-1);
    boss.obj.position.set(0,0,-5);boss.hp=boss.maxHp*config.phase;
    game.garden.stompTimer=3;hits=0;damageTaken=0;render();
    game.view.showToast('Boss 测试 · 已重开');game.input.clear();document.activeElement?.blur();
  };
  // Only the test harness changes encounter setup and recording, never boss decision rules.
  game.start=load;game.saveBest=()=>{};
  game.updateWaveSpawning=()=>{if(game.state.shot<=0)game.attack()};
  game.advanceWaveIfCleared=()=>{if(boss?.dead&&game.state.mode==='playing')game.finish(true)};
  game.levelUp=()=>{};
  game.hurt=amount=>{
    if(game.state.mode!=='playing')return;
    if(config.invincible){if(game.state.inv<=0){hits++;game.state.inv=.65}return}
    const before=game.state.hp;originalHurt(amount);
    if(game.state.hp<before){hits++;damageTaken+=before-game.state.hp}
  };
  game.tick=dt=>{originalTick(dt);render()};
  form.addEventListener('submit',event=>{
    event.preventDefault();config={boss:field('boss').value,hero:field('hero').value,weapon:Number(field('weapon').value),
      damage:Number(field('damage').value),rate:Number(field('rate').value),phase:Number(field('phase').value),invincible:field('invincible').checked};load();
  });
  panel.querySelector('#boss-test-reset').onclick=load;
  panel.querySelector('#boss-test-pause').onclick=()=>{game.pause();render();document.activeElement?.blur()};
  // Result modal returns to this test setup rather than the ordinary title screen.
  const finish=game.finish.bind(game);
  game.finish=win=>{
    finish(win);
    const modal=game.view.elements.modal;
    modal.querySelector('h2').textContent=win?'测试完成 · Boss 已击败':'测试结束 · 玩家倒下';
    modal.querySelector('#change-hero').textContent='调整测试配置';
    modal.querySelector('#change-hero').onclick=()=>{game.view.hideModal();panel.querySelector('details').open=true;field('hero').focus()};
    modal.querySelector('#next-level')?.remove();
    render();
  };
  form.requestSubmit();
  if(window.__game)window.__game.bossTest={reset:load,get config(){return {...config}},get hits(){return hits}};
}
