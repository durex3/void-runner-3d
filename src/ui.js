const SHELL=`<div id="xp"></div><header id="hud"><div class="hud-vitals"><div class="hud-brand"><span class="brand">遗迹工坊</span><small>作者：顾临风</small></div><div class="health-row"><span>生命</span><div class="hp"><i id="health"></i></div><strong id="healthtext">100 / 100</strong></div></div><div class="wave-readout"><small>当前波次</small><div>第 <strong id="wave">01</strong> 波 <span>/ 08</span></div></div><div class="readout"><div class="hud-metrics"><span><small>时间</small><b id="time">00:00</b></span><span><small>击败</small><b id="kills">0</b></span><span><small>等级</small><b>LV <i id="level">1</i></b></span></div><div class="hud-actions"><button id="stats-toggle" aria-label="查看角色属性" aria-controls="stats-panel" aria-expanded="false">属性</button><button id="sound" aria-label="开关音效">音效 开</button><button id="pause" aria-label="暂停">Ⅱ</button></div></div></header><div id="bossbar" class="hidden" aria-live="polite"><div class="bossbar-heading"><span class="boss-name">骸骨巨像</span><span id="boss-state" class="boss-state"><span id="boss-state-icon" aria-hidden="true"></span><b id="boss-state-label"></b></span></div><div class="bossbar-track"><i></i></div></div><div id="toast"></div><aside id="garden-hud" aria-label="战场装置状态"><button id="garden-toggle" aria-controls="garden-details" aria-expanded="false"><span><small>FIELD DEVICES</small><b>战场装置</b></span><strong><span id="device-total">0</span> / 24</strong><i>⌄</i></button><div id="device-summary"></div><div id="garden-details" class="hidden"><div class="garden-section"><span>伙伴</span><div id="buddy-list"></div></div><div class="garden-section"><span>联动</span><div id="combo-list"></div></div><button id="guide">玩法图鉴 ?</button></div></aside><aside id="stats-panel" class="hidden" aria-label="当前角色详细属性"><div class="stats-heading"><div><small>CURRENT LOADOUT</small><b id="stats-title">当前属性</b></div><button id="stats-close" aria-label="关闭属性面板">×</button></div><p id="stats-role"></p><div class="stats-grid"><div><span>生命</span><strong id="stat-health"></strong></div><div><span>移动速度</span><strong id="stat-speed"></strong></div><div><span>伤害</span><strong id="stat-damage"></strong></div><div><span>攻击间隔</span><strong id="stat-interval"></strong></div><div><span>攻击频率</span><strong id="stat-frequency"></strong></div><div><span>范围 / 目标</span><strong id="stat-range"></strong></div></div><div class="stats-multipliers"><span>伤害倍率 <b id="stat-damage-multiplier"></b></span><span>攻速倍率 <b id="stat-rate-multiplier"></b></span></div><div id="stat-mechanics"></div><small id="stat-note"></small></aside><div id="bottom"><div id="weapons"></div><div id="controls"><div id="control-hint"><span><b>WASD</b> 移动　<b>1 / 2 / 3</b> 切换武器</span><span><b>SPACE</b> 冲刺　<b>ESC</b> 暂停</span></div><div id="dash-readout"><div><span id="dashstatus">冲刺就绪</span><kbd>SPACE</kbd></div><div class="dash-track"><i id="dashfill"></i></div></div></div><button id="touchdash" class="primary">冲刺</button></div><div id="touch">${['↑','←','↓','→'].map((label,index)=>`<button data-key="${['w','a','s','d'][index]}">${label}</button>`).join('')}</div><section id="overlay"><div class="cover"><div class="seal">3D SURVIVAL ROGUELITE</div><div class="title-heading"><h1>遗迹<br>工坊<span>RELIC WORKSHOP</span></h1><div class="title-author"><small>作者</small><strong>顾临风</strong></div></div><p>射弩、开火、施法，击退骸骨军团，用战利品构筑防线。<br>自动弩台 × 炼金炸瓶 × 雷鸣法典，组合产生连锁反应。<br>击败亡灵精英，唤醒守护构装体，守住遗迹工坊。</p><div id="characters" aria-label="选择冒险者"><button data-character="Ranger" class="selected">游侠</button><button data-character="Knight">骑士</button><button data-character="Druid">德鲁伊</button><button data-character="Engineer">工程师</button></div><p id="role-description"></p><button id="start" class="primary">进入遗迹　 →</button><footer>轻松开局 · 越战越强 · <span id="best"></span></footer></div></section><section id="modal" class="hidden"></section>`;

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
    const status=document.createElement('div');status.id='battle-status';
    const notice=document.createElement('div');notice.id='battle-notice';
    const danger=document.createElement('div');danger.id='danger-notice';danger.setAttribute('role','status');
    notice.append(danger,this.$('#toast'));
    this.app.append(status);status.append(this.$('#bossbar'),notice,this.$('#garden-hud'));
    const hud=this.$('#hud');
    this.hudObserver=new ResizeObserver(()=>this.app.style.setProperty('--hud-bottom',`${hud.getBoundingClientRect().bottom}px`));
    this.hudObserver.observe(hud);
    this.elements={
      start:this.$('#start'),modal:this.$('#modal'),overlay:this.$('#overlay'),
      toast:this.$('#toast'),weapons:this.$('#weapons'),roleDescription:this.$('#role-description'),
      statsPanel:this.$('#stats-panel'),statsToggle:this.$('#stats-toggle'),
      gardenHud:this.$('#garden-hud'),gardenDetails:this.$('#garden-details'),gardenToggle:this.$('#garden-toggle'),
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
    this.elements.statsToggle.onclick=()=>this.toggleStats();
    this.$('#stats-close').onclick=()=>this.toggleStats(false);
    this.elements.gardenToggle.onclick=()=>this.toggleGarden();
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
  hideOverlay(){
    this.elements.overlay.classList.add('hidden');
    const hint=this.$('#control-hint');
    hint.classList.remove('intro');
    void hint.offsetWidth;
    hint.classList.add('intro');
  }
  showOverlay(){this.elements.overlay.classList.remove('hidden')}
  hideModal(){this.elements.modal.classList.add('hidden')}

  toggleStats(open=this.elements.statsPanel.classList.contains('hidden')){
    if(open)this.toggleGarden(false);
    this.elements.statsPanel.classList.toggle('hidden',!open);
    this.elements.statsToggle.setAttribute('aria-expanded',String(open));
  }

  toggleGarden(open=this.elements.gardenDetails.classList.contains('hidden')){
    if(open)this.toggleStats(false);
    this.elements.gardenDetails.classList.toggle('hidden',!open);
    this.elements.gardenHud.classList.toggle('expanded',open);
    this.elements.gardenToggle.setAttribute('aria-expanded',String(open));
  }

  selectHero(name){
    this.app.querySelectorAll('[data-character]').forEach(button=>button.classList.toggle('selected',button.dataset.character===name));
  }

  renderLoadout(name,slot,onEquip){
    const role=this.heroes[name];
    this.elements.weapons.innerHTML=role.weapons.map((weapon,index)=>{const detail=weapon.damageTaken?'受伤 -20%':weapon.knock?'大范围 · 击退':weapon.stagger?'命中 · 硬直':weapon.effect==='nature'?'范围 · 减速 45%':weapon.effect==='pierce'?'穿透 3 个目标':weapon.effect==='shotgun'?'近距离 · 高伤击退':weapon.effect==='chain'?'连锁 4 个目标':weapon.effect==='orb'?'直击 · 范围溅射':weapon.detail.split(' · ')[0];return `<button class="weapon ${index===slot?'active':''}" data-weapon="${index}" aria-keyshortcuts="${index+1}" title="${weapon.detail}"><span class="weapon-key">${index+1}</span><span class="weapon-copy"><b>${weapon.label}</b><small class="weapon-detail">${detail}</small></span><span class="weapon-status" data-weapon-status="${index}">${index===slot?'可用':'待命'}</span></button>`}).join('');
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
    const typeLabel=choice=>choice.kind==='combo'?'装置联动':choice.kind==='core'?'核心属性':choice.kind==='survival'?'生存强化':choice.kind==='mobility'?'机动强化':choice.kind==='utility'?'战场辅助':'遗迹祝福';
    this.elements.modal.innerHTML=`<div class="eyebrow">FIELD MODIFICATION</div><h2>遗迹祝福</h2><p>等级 ${state.level} · 选择一种力量，继续你的旅程</p><div id="choices">${choices.map((choice,index)=>`<button class="card ${choice.recommended?'recommended':''}" data-choice="${index}"><small>${typeLabel(choice)} / 0${index+1}${choice.recommended?' · 推荐':''}</small><div class="symbol">${choice.symbol}</div><h3>${choice.name}</h3><p>${choice.desc}</p>${choice.hint?`<span class="card-hint">${choice.hint}</span>`:''}</button>`).join('')}</div>`;
    this.elements.modal.classList.remove('hidden');
    this.app.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>onChoose(choices[Number(button.dataset.choice)]));
  }

  showFinish({win,state,garden,best,onRestart,onChangeHero}){
    this.elements.modal.innerHTML=`<div class="eyebrow">${win?'ZONE SECURED':'SIGNAL LOST'}</div><h2>${win?'遗迹已守住':'行动中止'}</h2><p>${win?'你击败了骸骨巨像，遗迹工坊得以保存。':'试试不同的武器和升级组合，再来一局吧！'}</p><p>抵达第 ${state.wave} 波 · 击败 ${state.kills} · 等级 ${state.level}<br>部署 ${garden.stats.planted} 件 · 装置击杀 ${garden.stats.kills} · 伙伴 ${garden.buddies.length}<br>存活 ${Math.floor(state.time)} 秒 · 最佳 ${best} 击败</p><button id="restart" class="primary">再来一局 →</button><button id="change-hero" class="primary">更换角色</button>`;
    this.elements.modal.classList.remove('hidden');
    this.$('#restart').onclick=onRestart;
    this.$('#change-hero').onclick=onChangeHero;
  }

  renderStats(stats){
    this.$('#stats-title').textContent=`${stats.role} · ${stats.weapon}`;
    this.$('#stats-role').textContent=stats.roleDescription;
    this.$('#stat-health').textContent=stats.health;
    this.$('#stat-speed').textContent=stats.moveSpeed;
    this.$('#stat-damage').textContent=stats.damage;
    this.$('#stat-interval').textContent=stats.interval;
    this.$('#stat-frequency').textContent=stats.attacksPerSecond;
    this.$('#stat-range').textContent=stats.range;
    this.$('#stat-damage-multiplier').textContent=stats.damageMultiplier;
    this.$('#stat-rate-multiplier').textContent=stats.rateMultiplier;
    this.$('#stat-mechanics').innerHTML=stats.mechanics.map(mechanic=>`<p>${mechanic}</p>`).join('');
    this.$('#stat-note').textContent=stats.note;
  }

  renderDevices(status){
    this.$('#device-total').textContent=status.total;
    this.$('#device-summary').innerHTML=status.devices.map(device=>{
      const alerts=[];
      if(device.starting)alerts.push(`启动 ${device.starting}`);
      if(device.expiring)alerts.push(`将过期 ${device.expiring}`);
      const status=alerts.join(' · ')||(device.count?'运行稳定':'暂无部署');
      return `<div class="device-row device-${device.type} ${device.expiring?'warning':''}"><span class="device-icon">${device.icon}</span><b>${device.name}</b><small>${status}</small><strong>${device.count}</strong></div>`;
    }).join('');
    this.$('#buddy-list').innerHTML=status.companions.length?status.companions.map(companion=>`<span>${companion.name} Lv.${companion.rank}</span>`).join(''):'<small>第 2 / 4 / 6 波精英可收服</small>';
    this.$('#combo-list').innerHTML=status.combos.length?status.combos.map(combo=>`<span title="${combo.desc}">${combo.symbol} ${combo.name}</span>`).join(''):'<small>升级时可解锁装置联动</small>';
  }

  renderHud(state,garden,enemies,stats,devices){
    const warning=garden.effects.some(effect=>effect.stomp);
    const recovering=enemies.some(enemy=>enemy.type==='boss'&&!enemy.dead&&enemy.recovery>0);
    const message=warning?'巨像践踏 · 危险区域':recovering?'巨像恢复中 · 反击时机':'';
    const danger=this.$('#danger-notice');
    if(danger.textContent!==message)danger.textContent=message;
    this.$('#battle-notice').classList.toggle('danger-active',warning||recovering);
    this.$('#battle-notice').classList.toggle('recovery-active',recovering&&!warning);
    this.renderDevices(devices);
    this.$('#health').style.width=`${state.hp/state.maxHp*100}%`;
    this.$('#healthtext').textContent=`${Math.ceil(state.hp)} / ${state.maxHp}`;
    this.$('#wave').textContent=String(state.wave).padStart(2,'0');
    this.$('#kills').textContent=state.kills;
    this.$('#level').textContent=state.level;
    this.$('#time').textContent=`${String(Math.floor(state.time/60)).padStart(2,'0')}:${String(Math.floor(state.time%60)).padStart(2,'0')}`;
    this.$('#xp').style.width=`${Math.min(100,state.xp/state.need*100)}%`;
    const dashStatus=this.$('#dashstatus');
    dashStatus.textContent=state.dash>0?`冲刺冷却 ${state.dash.toFixed(1)}s`:'冲刺就绪';
    dashStatus.classList.toggle('cooling',state.dash>0);
    const dashReadout=this.$('#dash-readout');
    dashReadout.classList.toggle('cooling',state.dash>0);
    const dashReady=Math.max(0,Math.min(100,(1-state.dash/3)*100));
    this.$('#dashfill').style.width=`${dashReady}%`;
    const touchDash=this.$('#touchdash');
    touchDash.textContent=state.dash>0?state.dash.toFixed(1):'冲刺';
    touchDash.classList.toggle('cooling',state.dash>0);
    touchDash.style.setProperty('--dash-ready',`${dashReady}%`);
    const weaponStatus=this.$(`[data-weapon-status="${state.loadout}"]`);
    if(weaponStatus){
      const cooling=state.shot>0;
      weaponStatus.textContent=cooling?`冷却 ${state.shot.toFixed(1)}s`:'可用';
      weaponStatus.classList.toggle('cooling',cooling);
    }
    const boss=enemies.find(enemy=>enemy.type==='boss'&&!enemy.dead);
    this.$('#bossbar').classList.toggle('hidden',!boss);
    const bossState=this.$('#boss-state');
    const bossStateLabel=this.$('#boss-state-label');
    if(boss){
      this.$('#bossbar i').style.width=`${boss.hp/boss.maxHp*100}%`;
      const recovering=boss.recovery>0;
      const casting=!!boss.rangedWindup&&!recovering;
      bossStateLabel.textContent=recovering?'恢复中 · 接触安全 · 可反击':casting?'施法中 · 注意弹幕':'';
      bossState.classList.toggle('is-recovering',recovering);
      bossState.classList.toggle('is-casting',casting);
    }else{
      bossStateLabel.textContent='';
      bossState.classList.remove('is-recovering','is-casting');
    }
    this.renderStats(stats);
  }
}
