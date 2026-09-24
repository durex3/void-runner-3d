import './boss-test.css';

export function installOutpostTest(game){
  document.body.classList.add('boss-test');
  const panel=document.createElement('aside');panel.id='boss-test-panel';panel.setAttribute('aria-label','第三关测试设置');
  panel.innerHTML=`<details open><summary>第三关 · 风蚀哨站测试</summary><p>直接体验风道教学、组合遭遇与 Clanker Boss。测试入口不写正式最佳纪录。</p></details>
    <div class="boss-test-grid"><button id="outpost-wave">风道与遭遇</button><button id="outpost-boss">直接 Boss</button></div>
    <div class="boss-test-grid"><button id="outpost-reset">重开</button><button id="outpost-pause">暂停 / 继续</button></div>
    <output id="outpost-status" aria-live="off"></output><p>WASD 移动 · 空格冲刺 · 1/2/3 换武器</p><a href="/">返回正式游戏</a>`;
  document.body.append(panel);
  const originalStart=game.start.bind(game),originalTick=game.tick.bind(game),status=panel.querySelector('output');let bossMode=false;
  const render=()=>{const wind=game.outpostWorld.wind,boss=game.enemies.find(e=>e.outpostBoss&&!e.dead);status.textContent=`${bossMode?'Boss 练习':'完整短流程'} · 第 ${game.state.wave} 波\n风道 ${wind.phase==='warning'?'预警':wind.phase==='push'?'推动中':'冷却'} · ${wind.active.length?'方向 '+(wind.active[0]+1):'安全'}\n生命 ${Math.ceil(game.state.hp)} · 击败 ${game.state.kills}${boss?`\nClanker ${Math.ceil(boss.hp)} / ${boss.maxHp}`:''}`};
  const load=()=>{game.returnToTitle();game.chooseLevel('outpost');game.chooseHero('Knight');originalStart();if(bossMode){game.clearRun();game.state.mode='playing';game.state.wave=4;game.state.remaining=0;game.state.spawn=999;game.spawnEnemy('boss');game.view.hideOverlay();game.view.hideModal()}game.saveBest=()=>{};render();game.input.clear();document.activeElement?.blur()};
  game.start=load;game.tick=dt=>{originalTick(dt);render()};
  panel.querySelector('#outpost-wave').onclick=()=>{bossMode=false;load()};
  panel.querySelector('#outpost-boss').onclick=()=>{bossMode=true;load()};
  panel.querySelector('#outpost-reset').onclick=load;
  panel.querySelector('#outpost-pause').onclick=()=>{game.pause();render();document.activeElement?.blur()};
  load();
  if(window.__game)window.__game.outpostTest={reset:load,setBoss(value){bossMode=Boolean(value);load()},get bossMode(){return bossMode}};
}
