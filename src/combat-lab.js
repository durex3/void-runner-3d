import * as T from 'three';

const SCENARIOS=new Set(['crowd','ranged','boss','stomp','mixed']);
const HEROES=new Set(['Knight','Ranger','Druid','Engineer']);

// Installed only by the explicit test + scenario URL. Rules remain in the game.
export function installCombatLab(game){
  const original={};
  for(const key of ['start','tick','updateWaveSpawning','advanceWaveIfCleared','beginEnemyWindup','fireEnemyProjectiles','hurt','saveBest'])original[key]=game[key].bind(game);
  const originalStomp=game.garden.stomp.bind(game.garden);
  let seed=1,active=false,options;
  const events=[];
  const record=(type,data={})=>{events.push({time:Number(game.state.time.toFixed(4)),type,...data});if(events.length>2000)events.shift();};
  const seeded=fn=>{
    const random=Math.random;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    try{return fn();}finally{Math.random=random;}
  };
  const lab={
    manual:false,
    load({scenario='crowd',hero='Knight',manual=false,seed:nextSeed=20260920}={}){
      if(!SCENARIOS.has(scenario)||!HEROES.has(hero))throw new Error('Unknown combat lab scenario or hero');
      options={scenario,hero,manual,seed:nextSeed};seed=nextSeed>>>0;active=false;lab.manual=manual;
      seeded(()=>{
        game.returnToTitle();game.chooseHero(hero);original.start();
        game.state.remaining=0;game.hero.position.set(0,0,0);
        game.equip(hero==='Knight'||hero==='Ranger'?1:0);
        game.state.shot=0;
        game.garden.stompTimer=['stomp','mixed'].includes(scenario)?1:999;
        const spawn=(type,x,z,attack=1.5,stationary=false)=>{
          game.spawnEnemy(type);const e=game.enemies.at(-1);e.obj.position.set(x,0,z);e.attack=attack;
          if(stationary)e.speed=0;
          return e;
        };
        if(scenario==='ranged')spawn('spitter',0,-7,1,true);
        if(scenario==='boss'||scenario==='stomp')spawn('boss',0,-7,scenario==='stomp'?999:1,true);
        if(scenario==='crowd'||scenario==='mixed'){
          for(let i=0;i<18;i++){
            const angle=i*Math.PI*2/18,radius=4+(i%3)*1.6;
            spawn(i%5===0?'spitter':i%3===0?'runner':'brute',Math.sin(angle)*radius,Math.cos(angle)*radius,.8+(i%4)*.3);
          }
          for(let i=0;i<9;i++){
            const angle=i*Math.PI*2/9;
            game.garden.plant(i%3,new T.Vector3(Math.sin(angle)*3,0,Math.cos(angle)*3));
            game.garden.seed(i%3,new T.Vector3(Math.sin(angle)*6,0,Math.cos(angle)*6));
          }
          if(scenario==='mixed')spawn('boss',0,-7,1,true);
        }
      });
      active=true;events.length=0;record('scenario',{scenario,hero,seed:nextSeed});
      game.camera.position.set(20,27,24);game.camera.lookAt(0,0,0);lab.render();
      return lab.snapshot();
    },
    step(frames=1){
      if(!lab.manual)throw new Error('Manual stepping requires manual mode');
      if(!Number.isInteger(frames)||frames<0||frames>3600)throw new Error('Invalid frame count');
      for(let i=0;i<frames;i++){
        game.tick(1/60);game.effects.update(1/60,game.state.time,game.state.mode);
        game.updateCamera(1/60,game.state.time*1000);
      }
      lab.render();return lab.snapshot();
    },
    render(){game.view.renderHud(game.state,game.garden,game.enemies,game.currentStats(),game.currentDevices());game.renderer.render(game.scene,game.camera);},
    snapshot(){return {options:{...options},time:game.state.time,mode:game.state.mode,hp:game.state.hp,heroPosition:game.hero.position.toArray(),enemies:game.enemies.length,hazards:game.hazards.length,devices:game.garden.plants.length,effects:game.effects.effects.length,warnings:game.garden.effects.filter(e=>e.stomp).length,events:events.map(e=>({...e}))};},
    keys(keys=[]){game.input.clear();for(const key of keys)game.input.keys.add(key);},
    dash(){game.dash();},
    pause(){game.pause();},
    reset(){return lab.load(options);},
  };
  game.start=()=>active?lab.reset():original.start();
  game.saveBest=()=>{if(!active)original.saveBest();};
  game.updateWaveSpawning=dt=>{
    if(!active)return original.updateWaveSpawning(dt);
    if(['crowd','mixed'].includes(options.scenario)&&game.state.shot<=0)game.attack();
  };
  game.advanceWaveIfCleared=()=>{if(!active)original.advanceWaveIfCleared();};
  game.fireEnemyProjectiles=(enemy,direction)=>{
    const before=game.hazards.length;original.fireEnemyProjectiles(enemy,direction);
    if(active)record('projectile-fired',{enemy:enemy.type,count:game.hazards.length-before,origin:enemy.obj.position.toArray(),direction:direction.toArray()});
  };
  game.beginEnemyWindup=(enemy,direction,duration)=>{original.beginEnemyWindup(enemy,direction,duration);if(active)record('projectile-warning',{enemy:enemy.type,duration,pattern:enemy.rangedWindup.pattern,direction:enemy.rangedWindup.direction.toArray()});};
  game.hurt=amount=>{
    const before=game.state.hp;original.hurt(amount);
    if(active&&game.state.hp<before)record('damage',{amount:before-game.state.hp,requested:amount,position:game.hero.position.toArray()});
  };
  game.garden.stomp=(position,source)=>{originalStomp(position,source);if(active)record('stomp-warning',{position:position.toArray(),duration:1.6,radius:4});};
  game.tick=dt=>{
    if(!active)return original.tick(dt);
    const warnings=game.garden.effects.filter(e=>e.stomp);
    seeded(()=>original.tick(dt));
    for(const warning of warnings)if(!game.garden.effects.includes(warning))record(warning.source&&(warning.source.dead||!game.enemies.includes(warning.source))?'stomp-cancelled':'stomp-resolved',{position:warning.obj.position.toArray()});
  };
  const params=new URLSearchParams(location.search);
  lab.load({scenario:params.get('scenario')||'crowd',hero:params.get('hero')||'Knight',manual:params.get('manual')==='1'});
  return lab;
}
