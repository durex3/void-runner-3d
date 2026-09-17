const SHELL=`<div id="xp"></div><header id="hud"><div><div class="eyebrow">RELIC WORKSHOP</div><div class="brand">遗迹工坊</div><div class="hp"><i id="health"></i></div><small id="healthtext">100 / 100</small></div><div class="readout"><div>第 <strong id="wave">01</strong> 波 / 08</div><div><span id="time">00:00</span> · 击败 <span id="kills">0</span> · LV <span id="level">1</span></div><button id="sound" aria-label="开关音效">音效 开</button><button id="pause" aria-label="暂停">Ⅱ</button></div></header><div id="bossbar" class="hidden">骸骨巨像<div><i></i></div></div><div id="toast"></div><aside id="garden-hud"><b>我的战场装置</b><div id="garden-counts"></div><div id="buddy-list">伙伴：第 2 波起，精英残血可收服</div><div id="combo-list">击杀掉战利品 · 靠近收集后自动部署</div><button id="guide">玩法图鉴 ?</button></aside><div id="bottom"><div id="weapons"></div><div id="controls">W A S D / 方向键 移动 · SPACE 冲刺<br>自动瞄准攻击 · 1 / 2 / 3 切换武器 · ESC 暂停<br><span id="dashstatus">冲刺就绪</span></div><button id="touchdash" class="primary">冲刺</button></div><div id="touch">${['↑','←','↓','→'].map((label,index)=>`<button data-key="${['w','a','s','d'][index]}">${label}</button>`).join('')}</div><section id="overlay"><div class="cover"><div class="seal">3D SURVIVAL ROGUELITE</div><h1>遗迹<br>工坊<span>RELIC WORKSHOP</span></h1><p>射弩、开火、施法，击退骸骨军团，用战利品构筑防线。<br>自动弩台 × 炼金炸瓶 × 雷鸣法典，组合产生连锁反应。<br>击败亡灵精英，唤醒守护构装体，守住遗迹工坊。</p><div id="characters" aria-label="选择冒险者"><button data-character="Ranger" class="selected">游侠</button><button data-character="Knight">骑士</button><button data-character="Druid">德鲁伊</button><button data-character="Engineer">工程师</button></div><p id="role-description"></p><button id="start" class="primary">进入遗迹　 →</button><footer>轻松开局 · 越战越强 · <span id="best"></span></footer></div></section><section id="modal" class="hidden"></section>`;

export class GameView{
  constructor({app,heroes,combos,plants}){
    this.app=app;
    this.heroes=heroes;
    this.combos=combos;
    this.plants=plants;
    this.toastTime=0;
  }

  mount(){
    this.app.innerHTML=SHELL;
    this.elements={
      start:this.$('#start'),modal:this.$('#modal'),overlay:this.$('#overlay'),
      toast:this.$('#toast'),weapons:this.$('#weapons'),roleDescription:this.$('#role-description'),
    };
  }

  $(selector){return this.app.querySelector(selector)}

  bind({onStart,onCharacter,onPause,onSound,onDash,onGuide}){
    this.elements.start.onclick=onStart;
    this.app.querySelectorAll('[data-character]').forEach(button=>button.onclick=()=>onCharacter(button.dataset.character));
    this.$('#pause').onclick=onPause;
    this.$('#sound').onclick=onSound;
    this.$('#touchdash').onclick=onDash;
    this.$('#guide').onclick=onGuide;
  }

  setLoading(done,total){
    this.elements.start.disabled=true;
    this.elements.start.textContent=`准备角色、动作与道具 ${done} / ${total}`;
  }

  setLoadError(){
    this.elements.start.disabled=false;
    this.elements.start.textContent='素材加载失败 · 点击重试';
  }

  waitForRetry(){return new Promise(resolve=>this.elements.start.onclick=resolve)}

  setReady(){
    this.elements.start.disabled=false;
    this.elements.start.textContent='进入遗迹　 →';
  }

  setBest(best){this.$('#best').textContent=`最佳 ${best} 击败`}
  setSoundMuted(muted){this.$('#sound').textContent=`音效 ${muted?'关':'开'}`}
  hideOverlay(){this.elements.overlay.classList.add('hidden')}
  showOverlay(){this.elements.overlay.classList.remove('hidden')}
  hideModal(){this.elements.modal.classList.add('hidden')}

  selectHero(name){
    this.app.querySelectorAll('[data-character]').forEach(button=>button.classList.toggle('selected',button.dataset.character===name));
  }

  renderLoadout(name,slot,onEquip){
    const role=this.heroes[name];
    this.elements.weapons.innerHTML=role.weapons.map((weapon,index)=>`<button class="weapon ${index===slot?'active':''}" data-weapon="${index}" title="${weapon.detail}"><small>${role.label} / 0${index+1}</small><b>${weapon.label}</b><span class="weapon-detail">${weapon.detail}</span></button>`).join('');
    this.elements.roleDescription.textContent=`${role.label} · ${role.description}。${role.weapons.map(weapon=>weapon.label).join(' / ')}，局内按 ${role.weapons.map((_,index)=>index+1).join(' / ')} 切换。`;
    this.app.querySelectorAll('[data-weapon]').forEach(button=>button.onclick=()=>onEquip(Number(button.dataset.weapon)));
  }

  showToast(message,duration=3){
    this.elements.toast.textContent=message;
    this.toastTime=duration;
  }

  updateToast(dt,active){
    if(!active)return;
    this.toastTime-=dt;
    if(this.toastTime<=0)this.elements.toast.textContent='';
  }

  showPause(onResume){
    this.elements.modal.innerHTML='<div class="eyebrow">TAKE A BREATH</div><h2>休息一下</h2><p>游戏已暂停 · WASD 移动 · 空格冲刺 · 1 / 2 / 3 切换武器</p><button id="resume" class="primary">继续冒险 →</button>';
    this.elements.modal.classList.remove('hidden');
    this.$('#resume').onclick=onResume;
  }

  showGuide(onResume){
    this.elements.modal.innerHTML=`<div class="eyebrow">RELIC WORKSHOP FIELD GUIDE</div><h2>把战场建成你的工坊</h2><p>① 武器击杀掉落战利品：60% 同系，其他两系各 20%　② 靠近战利品，在脚边自动部署<br>③ 装置约 1 秒启动，可存活 48 秒，最多 24 件<br>弓弩偏向自动弩台 · 霰弹偏向炼金炸瓶 · 法杖偏向雷鸣法典；每个角色都能获得三类装置<br>第 2 / 4 / 6 波的皇冠精英残血后，可选择收服或升级。<br>采集构装体收集，治愈构装体治疗充能维护；Boss 红圈践踏会破坏装置。</p><div class="guide-combos">${this.combos.map(combo=>`<div><b>${combo.symbol} ${combo.name}</b><p>${combo.desc}</p></div>`).join('')}</div><button id="resume" class="primary">懂了，继续战斗！</button>`;
    this.elements.modal.classList.remove('hidden');
    this.$('#resume').onclick=onResume;
  }

  showCapture({type,onRecruit,onHarvest}){
    const name=type==='slime'?'采集构装体':'治愈构装体';
    const description=type==='slime'?'帮助收集经验和战利品。已有同类时提升伙伴等级。':'每 4 秒治疗并充能维护附近装置。已有同类时提升伙伴等级。';
    this.elements.modal.innerHTML=`<div class="eyebrow">SALVAGE PROTOCOL</div><h2>唤醒遗迹守卫</h2><p>精英失去战斗能力：唤醒封印中的构装体，或回收材料强化武器。战斗已暂停。</p><div id="choices"><button class="card" id="recruit"><div class="symbol">♥</div><h3>唤醒 · ${name}</h3><p>${description}</p></button><button class="card" id="harvest"><div class="symbol">✦</div><h3>获取成长</h3><p>击败精英，立即获得一次三选一升级。</p></button></div>`;
    this.elements.modal.classList.remove('hidden');
    this.$('#recruit').onclick=onRecruit;
    this.$('#harvest').onclick=onHarvest;
  }

  showUpgrade(state,choices,onChoose){
    this.elements.modal.innerHTML=`<div class="eyebrow">FIELD MODIFICATION</div><h2>遗迹祝福</h2><p>等级 ${state.level} · 选择一种力量，继续你的旅程</p><div id="choices">${choices.map((choice,index)=>`<button class="card" data-choice="${index}"><small>BLESSING / 0${index+1}</small><div class="symbol">${choice.symbol}</div><h3>${choice.name}</h3><p>${choice.desc}</p></button>`).join('')}</div>`;
    this.elements.modal.classList.remove('hidden');
    this.app.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>onChoose(choices[Number(button.dataset.choice)]));
  }

  showFinish({win,state,garden,best,onRestart,onChangeHero}){
    this.elements.modal.innerHTML=`<div class="eyebrow">${win?'ZONE SECURED':'SIGNAL LOST'}</div><h2>${win?'遗迹已守住':'行动中止'}</h2><p>${win?'你击败了骸骨巨像，遗迹工坊得以保存。':'试试不同的武器和升级组合，再来一局吧！'}</p><p>抵达第 ${state.wave} 波 · 击败 ${state.kills} · 等级 ${state.level}<br>部署 ${garden.stats.planted} 件 · 装置击杀 ${garden.stats.kills} · 伙伴 ${garden.buddies.length}<br>存活 ${Math.floor(state.time)} 秒 · 最佳 ${best} 击败</p><button id="restart" class="primary">再来一局 →</button><button id="change-hero" class="primary">更换角色</button>`;
    this.elements.modal.classList.remove('hidden');
    this.$('#restart').onclick=onRestart;
    this.$('#change-hero').onclick=onChangeHero;
  }

  renderHud(state,garden,enemies){
    this.$('#garden-counts').textContent=this.plants.map((name,index)=>`${name} ${garden.plants.filter(plant=>plant.type===index&&!plant.dead).length}`).join(' · ');
    this.$('#buddy-list').textContent=garden.buddies.length?'伙伴：'+garden.buddies.map(buddy=>`${buddy.type==='slime'?'采集构装体':'治愈构装体'} Lv.${buddy.rank}`).join(' / '):'伙伴：第 2 / 4 / 6 波精英可收服';
    this.$('#combo-list').textContent=garden.combos.size?'组合：'+this.combos.filter(combo=>garden.combos.has(combo.id)).map(combo=>combo.name).join(' · '):'拾取战利品自动部署 · 升级解锁组合';
    this.$('#health').style.width=`${state.hp/state.maxHp*100}%`;
    this.$('#healthtext').textContent=`${Math.ceil(state.hp)} / ${state.maxHp}`;
    this.$('#wave').textContent=String(state.wave).padStart(2,'0');
    this.$('#kills').textContent=state.kills;
    this.$('#level').textContent=state.level;
    this.$('#time').textContent=`${String(Math.floor(state.time/60)).padStart(2,'0')}:${String(Math.floor(state.time%60)).padStart(2,'0')}`;
    this.$('#xp').style.width=`${Math.min(100,state.xp/state.need*100)}%`;
    this.$('#dashstatus').textContent=state.dash>0?`冲刺冷却 ${state.dash.toFixed(1)}s`:'冲刺就绪';
    const boss=enemies.find(enemy=>enemy.type==='boss'&&!enemy.dead);
    this.$('#bossbar').classList.toggle('hidden',!boss);
    if(boss)this.$('#bossbar i').style.width=`${boss.hp/boss.maxHp*100}%`;
  }
}
