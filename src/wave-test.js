import {HEROES} from './loadouts.js';
import {FURNACE_WAVES} from './levels.js';
import './boss-test.css';

export function installWaveTest(game){
  const panel=document.createElement('aside');panel.id='boss-test-panel';
  panel.setAttribute('aria-label','波次测试设置');
  panel.innerHTML=`<details open><summary>熔炉波次测试</summary>
    <form><label>测试波次<select name="wave"><option value="5">第五波 · 双炉交替</option><option value="6">第六波 · 要塞反扑</option><option value="7">第七波 · 王座前庭</option><option value="5-7">第五至第七波 · 连续测试</option></select></label>
    <label>起始武器<select name="weapon">${HEROES.Knight.weapons.map((w,i)=>`<option value="${i}">${w.label}</option>`).join('')}</select></label>
    <label>攻速倍率<select name="rate"><option>1</option><option selected>1.6</option><option>2</option></select></label>
    <label class="boss-test-check"><input type="checkbox" name="invincible">无敌练习</label>
    <button type="submit">应用并重开</button></form>
    <p id="wave-description"></p>
    <p>固定伤害倍率 1；无升级和自动部署。WASD 移动，空格冲刺，1 / 2 / 3 换武器。</p></details>
    <div class="boss-test-grid"><button id="wave-reset">原配置重开</button><button id="wave-pause">暂停 / 继续</button></div>
    <output id="wave-status" aria-live="off"></output><a href="/">返回正式游戏</a>`;
  document.body.append(panel);
  const form=panel.querySelector('form'),field=name=>form.elements.namedItem(name),status=panel.querySelector('output');
  field('weapon').value='1';
  for(const event of ['keydown','keyup'])panel.addEventListener(event,e=>e.stopPropagation());
  panel.addEventListener('focusin',()=>game.input.clear());
  const originalStart=game.start.bind(game),tick=game.tick.bind(game),hurt=game.hurt.bind(game),finish=game.finish.bind(game);
  const requested=new URLSearchParams(location.search).get('wave');
  const selection=['5','6','7','5-7'].includes(requested)?requested:'5';
  let config={wave:selection==='5-7'?5:Number(selection),endWave:selection==='5-7'?7:Number(selection),weapon:1,rate:1.6,invincible:false};
  field('wave').value=selection;
  const render=()=>{const count=FURNACE_WAVES[game.state.wave-1].count;status.textContent=`${config.invincible?'无敌练习':'正常受伤'} · 第 ${game.state.wave} 波${config.endWave!==config.wave?' / 连续 5–7 波':''}\n常规敌人已出场 ${count-game.state.remaining} / ${count} · 场上 ${game.enemies.filter(e=>!e.dead).length}\n击败 ${game.state.kills} · ${game.state.time.toFixed(1)} 秒`};
  const load=()=>{
    panel.hidden=false;
    game.returnToTitle();game.chooseLevel('furnace');game.chooseHero('Knight');originalStart();
    game.state.wave=config.wave;game.state.rate=config.rate;game.equip(config.weapon);game.beginWave();
    game.telemetry.testContext={mode:'wave-test',startWave:config.wave,endWave:config.endWave,invincible:config.invincible};
    panel.querySelector('#wave-description').textContent=config.wave===6?'三轮正面近战与错峰侧翼突进，共 24 个常规敌人，另有原关卡精英。轮间停止出怪 3.5 秒，地火正常运作。':'三轮：4 近战 → 2 突进 → 1 远程。轮间停止出怪 3.5 秒，地火正常运作。';
    if(config.endWave!==config.wave)panel.querySelector('#wave-description').textContent='连续体验分组进攻 → 侧翼反扑 → 王座前庭。清波后恢复 12 点生命；第七波清完结算，不进入 Boss 战。地火和第六波精英保留。';
    else if(config.wave===7)panel.querySelector('#wave-description').textContent='Boss 前的喘息波：开场缓冲 5 秒，15 个近战与远程敌人，无突进和精英，地火正常运作。';
    game.input.clear();document.activeElement?.blur();render();
  };
  game.start=load;game.saveBest=()=>{};
  game.levelUp=()=>{};
  // Keep this encounter focused on weapon comparisons, without passive devices.
  game.garden.step=()=>{};
  game.hurt=(amount,source)=>{if(!config.invincible)hurt(amount,source)};
  game.advanceWaveIfCleared=()=>{
    if(game.state.remaining!==0||!game.enemies.every(e=>e.dead))return;
    if(game.state.wave>=config.endWave){game.finish(true);return}
    game.state.wave++;game.state.hp=Math.min(game.state.maxHp,game.state.hp+12);game.beginWave();
  };
  game.tick=dt=>{tick(dt);render()};
  game.finish=win=>{
    finish(win);
    panel.hidden=true;
    const modal=game.view.elements.modal;
    modal.querySelector('h2').textContent=win?(config.endWave!==config.wave?'第五至第七波测试完成':`第 ${config.wave} 波测试完成`):'测试结束 · 玩家倒下';
    modal.querySelector('#next-level')?.remove();
    const change=modal.querySelector('#change-hero');change.textContent='调整测试配置';
    change.onclick=()=>{game.view.hideModal();panel.hidden=false;panel.querySelector('details').open=true;field('weapon').focus()};
  };
  form.onsubmit=e=>{e.preventDefault();const continuous=field('wave').value==='5-7';config={wave:continuous?5:Number(field('wave').value),endWave:continuous?7:Number(field('wave').value),weapon:Number(field('weapon').value),rate:Number(field('rate').value),invincible:field('invincible').checked};load()};
  panel.querySelector('#wave-reset').onclick=load;
  panel.querySelector('#wave-pause').onclick=()=>{game.pause();document.activeElement?.blur()};
  load();
  if(window.__game)window.__game.waveTest={reset:load,get config(){return {...config}}};
}
