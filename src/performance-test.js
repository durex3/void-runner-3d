import * as T from 'three';
import './performance-test.css';

const PRESETS={
  standard:{label:'普通战斗',enemies:12,devices:6,resources:6,boss:false,projectileBursts:0},
  devices:{label:'第二关满装置',enemies:20,devices:24,resources:36,boss:false,projectileBursts:0},
  hazards:{label:'敌弹与地火叠加',enemies:26,devices:12,resources:18,boss:false,projectileBursts:5},
  boss:{label:'Boss + 满特效',enemies:20,devices:18,resources:24,boss:true,projectileBursts:3},
  extreme:{label:'极限压力场景',enemies:36,devices:24,resources:36,boss:true,projectileBursts:8},
};

export function installPerformanceTest(game){
  document.body.classList.add('performance-test');
  const panel=document.createElement('details');
  panel.id='performance-panel';
  panel.open=innerWidth>700;
  panel.innerHTML=`<summary><span>移动端性能压测</span><strong id="performance-live">采样准备中</strong></summary><div class="performance-body">
    <label>压力预设<select id="performance-preset">${Object.entries(PRESETS).map(([id,preset])=>`<option value="${id}">${preset.label}</option>`).join('')}</select></label>
    <div class="performance-grid"><button class="performance-primary" id="performance-apply">加载预设</button><button id="performance-run">运行 15 秒</button></div>
    <div class="performance-grid"><button id="performance-pause">暂停</button><button id="performance-reset">重置采样</button></div>
    <p class="performance-status" id="performance-status" aria-live="polite"></p>
    <output id="performance-metrics">等待第一帧数据…</output>
    <p class="performance-note">目标：手机稳定 30 FPS 以上。该页面用于定位瓶颈，不代表正式关卡难度。</p><a href="/">返回正式游戏</a>
  </div>`;
  document.body.append(panel);

  const presetSelect=panel.querySelector('#performance-preset');
  const live=panel.querySelector('#performance-live');
  const metricsOutput=panel.querySelector('#performance-metrics');
  const status=panel.querySelector('#performance-status');
  const pauseButton=panel.querySelector('#performance-pause');
  const originalStart=game.start.bind(game);
  let currentPreset='standard',samples=[],lastFrame=performance.now(),lastUi=0,benchmarkEnd=0,lastResult=null,benchmarkActive=false;

  game.saveBest=()=>{};
  game.levelUp=()=>{};
  game.advanceWaveIfCleared=()=>{};
  game.updateWaveSpawning=()=>{if(game.state.shot<=0)game.attack()};

  function spawnEnemy(type,index,total){
    const enemy=game.spawnEnemy(type);
    const angle=index/Math.max(1,total)*Math.PI*2+(index%3)*.11,radius=6+(index%4)*2.6;
    enemy.obj.position.set(Math.sin(angle)*radius,0,Math.cos(angle)*radius);
    enemy.hp=enemy.maxHp=1e7;
    enemy.attack=.2+(index%5)*.14;
    return enemy;
  }

  function addDevices(count,persistent=false){
    for(let index=0;index<count;index++){
      const angle=index/Math.max(1,count)*Math.PI*2,radius=3.5+(index%4)*2.3;
      const type=persistent?(index%2?0:2):index%3;
      const device=game.garden.plant(type,new T.Vector3(Math.sin(angle)*radius,0,Math.cos(angle)*radius));
      device.grow=0;device.life=999;device.cooldown=(index%6)*.07;
    }
  }

  function addResources(count){
    for(let index=0;index<count;index++){
      const angle=index/Math.max(1,count)*Math.PI*2,radius=5+(index%6)*2.2;
      game.garden.seed(index%3,new T.Vector3(Math.sin(angle)*radius,0,Math.cos(angle)*radius));
      game.garden.seeds.at(-1).life=999;
    }
  }

  function addProjectileBursts(count){
    const shooters=game.enemies.filter(enemy=>enemy.type==='spitter');
    for(let index=0;index<count;index++){
      const enemy=shooters[index%shooters.length];
      if(!enemy)break;
      const direction=game.hero.position.clone().sub(enemy.obj.position).setY(0).normalize();
      game.fireEnemyProjectiles(enemy,direction);
    }
  }

  function resetSamples(){samples=[];lastFrame=performance.now();benchmarkEnd=0;benchmarkActive=false;lastResult=null;status.textContent='采样已重置';return snapshot()}

  function load(id=currentPreset){
    const preset=PRESETS[id];
    if(!preset)throw new Error(`Unknown performance preset: ${id}`);
    currentPreset=id;presetSelect.value=id;
    game.returnToTitle();game.chooseLevel('furnace');game.chooseHero(id==='standard'?'Ranger':'Druid');originalStart();
    game.state.wave=8;game.state.remaining=0;game.state.spawn=999;game.state.inv=999999;game.state.damage=.35;game.state.rate=1.5;game.state.hp=game.state.maxHp;
    game.hero.position.set(0,0,0);game.equip(id==='standard'?1:2);
    const regularCount=preset.enemies;
    for(let index=0;index<regularCount;index++)spawnEnemy(index%5===0?'spitter':index%3===0?'runner':'brute',index,regularCount);
    let boss=null;
    if(preset.boss){boss=game.spawnEnemy('boss');boss.hp=boss.maxHp*.49;boss.obj.position.set(0,0,-11);game.furnaceCombat.begin(boss,'forge')}
    addDevices(preset.devices,id==='devices');addResources(preset.resources);addProjectileBursts(preset.projectileBursts);
    game.furnaceCycle.ignite(8);game.view.hideOverlay();game.view.hideModal();game.state.mode='playing';game.audio.resume();
    resetSamples();status.textContent=`已加载：${preset.label}`;
    return snapshot();
  }

  function frameMetrics(){
    const info=game.renderer.info,gl=game.renderer.getContext(),buffer=new T.Vector2();game.renderer.getDrawingBufferSize(buffer);
    return {calls:info.render.calls,triangles:info.render.triangles,lines:info.render.lines,points:info.render.points,geometries:info.memory.geometries,textures:info.memory.textures,
      dpr:game.renderer.getPixelRatio(),adaptiveDpr:game.quality?{enabled:game.quality.enabled,ratio:game.quality.ratio,frameMs:game.quality.frameMs}:null,buffer:[buffer.x,buffer.y],renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR)};
  }

  function snapshot(){
    const ordered=[...samples].sort((a,b)=>a-b),sum=samples.reduce((total,value)=>total+value,0),average=samples.length?sum/samples.length:0;
    const percentile=value=>ordered.length?ordered[Math.min(ordered.length-1,Math.floor(ordered.length*value))]:0;
    const recent=samples.slice(-30),recentAverage=recent.length?recent.reduce((total,value)=>total+value,0)/recent.length:0;
    const render=frameMetrics();
    return {preset:currentPreset,label:PRESETS[currentPreset].label,sampleCount:samples.length,fps:recentAverage?1000/recentAverage:0,averageFps:average?1000/average:0,frameMs:average,p95Ms:percentile(.95),worstMs:ordered.at(-1)||0,
      render,objects:{enemies:game.enemies.length,devices:game.garden.plants.length,resources:game.garden.seeds.length+game.drops.length,bullets:game.combat.bullets.length,hazards:game.hazards.length,effects:game.effects.effects.length,corpses:game.effects.corpses.length},
      viewport:[innerWidth,innerHeight],heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,mode:game.state.mode};
  }

  function renderMetrics(now){
    const data=lastResult||snapshot(),fps=data.fps.toFixed(1),ms=data.frameMs.toFixed(2),objects=data.objects,render=data.render;
    live.textContent=`${fps} FPS · ${ms} ms`;
    metricsOutput.textContent=`${data.label}\nFPS 当前 ${fps} · 平均 ${data.averageFps.toFixed(1)}\n帧时间 平均 ${ms} ms · P95 ${data.p95Ms.toFixed(2)} · 最差 ${data.worstMs.toFixed(2)}\nDraw calls ${render.calls} · 三角形 ${render.triangles.toLocaleString()}\n几何体 ${render.geometries} · 纹理 ${render.textures}\n敌人 ${objects.enemies} · 装置 ${objects.devices} · 资源 ${objects.resources}\n弹丸 ${objects.bullets} · 敌弹 ${objects.hazards} · 特效 ${objects.effects}\nDPR ${render.dpr.toFixed(2)}${render.adaptiveDpr?.enabled?' · 自适应 DPR '+render.adaptiveDpr.ratio.toFixed(2):''} · 缓冲区 ${render.buffer.join('×')}\n视口 ${data.viewport.join('×')} · 样本 ${data.sampleCount}`;
    if(benchmarkActive){
      const left=Math.max(0,(benchmarkEnd-now)/1000);
      status.textContent=left?`采样中：剩余 ${left.toFixed(1)} 秒`:`采样完成：平均 ${data.averageFps.toFixed(1)} FPS，P95 ${data.p95Ms.toFixed(2)} ms`;
    }else if(lastResult)status.textContent=`采样完成：平均 ${data.averageFps.toFixed(1)} FPS，P95 ${data.p95Ms.toFixed(2)} ms`;
  }

  function sample(now){
    const delta=now-lastFrame;lastFrame=now;
    if(!lastResult&&game.state.mode==='playing'&&!document.hidden&&delta>0&&delta<2000){samples.push(delta);if(samples.length>900)samples.shift()}
    if(benchmarkActive&&now>=benchmarkEnd){benchmarkActive=false;lastResult=snapshot();benchmarkEnd=0}
    if(now-lastUi>500){renderMetrics(now);lastUi=now}
    requestAnimationFrame(sample);
  }

  function togglePause(){
    if(game.state.mode==='paused'){game.state.mode='playing';game.audio.resume();pauseButton.textContent='暂停'}
    else{game.state.mode='paused';game.audio.pause();pauseButton.textContent='继续'}
    game.view.hideModal();return game.state.mode;
  }

  panel.addEventListener('keydown',event=>event.stopPropagation());
  panel.addEventListener('keyup',event=>event.stopPropagation());
  panel.querySelector('#performance-apply').onclick=()=>load(presetSelect.value);
  panel.querySelector('#performance-run').onclick=()=>{if(game.state.mode!=='playing')togglePause();samples=[];lastFrame=performance.now();lastResult=null;benchmarkEnd=performance.now()+15000;benchmarkActive=true;status.textContent='开始 15 秒采样'};
  panel.querySelector('#performance-reset').onclick=resetSamples;
  pauseButton.onclick=togglePause;
  game.pause=togglePause;
  game.start=()=>load(currentPreset);

  const params=new URLSearchParams(location.search),requested=params.get('preset');
  load(PRESETS[requested]?requested:'standard');
  requestAnimationFrame(sample);
  const api={ready:true,presets:Object.keys(PRESETS),load,snapshot,resetSamples,togglePause,get lastResult(){return lastResult}};
  window.__performanceTest=api;
  window.__THREE_GAME_DIAGNOSTICS__={renderer:game.renderer.info,get state(){return snapshot()}};
  return api;
}
