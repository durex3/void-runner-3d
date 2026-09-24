import {RUINS_WAVES,FURNACE_WAVES,OUTPOST_WAVES} from './levels.js';
import {WIND_LANES} from './wind-field.js';

// Small lifecycle boundary shared by all chapters. The game still owns the
// player, entities and renderer; a level owns pacing, hazards and chapter HUD.
class BaseLevelRuntime{
  constructor(game,id){this.game=game;this.id=id}
  get waves(){return []}
  get finalWave(){return this.waves.length||8}
  getWave(wave){return this.waves[wave-1]||null}
  get difficulty(){return {spawnRadius:20,speedScale:1,runnerScale:1,contactDamage:9,projectileSpeed:5}}
  reset(){}
  beginWave(){this.game.beginWaveDefault()}
  spawnEnemy(...args){return this.game.spawnEnemyBase(...args)}
  step(){}
  stepEnemy(){return false}
  cleanup(){}
  getHudState(){return {status:''}}
}

export class RuinsLevelRuntime extends BaseLevelRuntime{
  constructor(game){super(game,'ruins')}
  get waves(){return RUINS_WAVES}
  get difficulty(){return {spawnRadius:18.2,speedScale:1.14,runnerScale:1.08,contactDamage:10,projectileSpeed:5.8}}
  beginWave(){
    const game=this.game,wave=this.getWave(game.state.wave);
    game.state.remaining=wave.count;game.state.spawn=wave.grace;game.state.waveTime=0;game.furnaceFormationAngle=null;
    if([2,4,6].includes(game.state.wave))this.spawnEnemy(game.state.wave===4?'runner':'brute',true);
    game.view.showToast(`第 ${game.state.wave} 波 · ${wave.label}`);
    if(game.state.wave===this.finalWave)this.spawnEnemy('boss');
  }
  getHudState(){return {status:this.game.state.chapterStatus||''}}
}

export class FurnaceLevelRuntime extends BaseLevelRuntime{
  constructor(game){super(game,'furnace')}
  get waves(){return FURNACE_WAVES}
  get difficulty(){return {spawnRadius:18,speedScale:1.18,runnerScale:1.1,contactDamage:10.5,projectileSpeed:5.8}}
  reset(){this.game.furnaceCycle.reset();this.game.state.furnaceStatus=''}
  beginWave(){
    const game=this.game,wave=this.getWave(game.state.wave);
    game.state.remaining=wave.count;game.state.spawn=wave.grace;game.state.waveTime=0;game.furnaceFormationAngle=null;
    game.furnaceCycle.reset(wave.grace+2);
    if([2,4,6].includes(game.state.wave))this.spawnEnemy(game.state.wave===4?'runner':'brute',true);
    game.view.showToast(`第 ${game.state.wave} 波 · ${wave.label}`);
    if(game.state.wave===this.finalWave)this.spawnEnemy('boss');
  }
  step(dt){
    const game=this.game,boss=game.enemies.find(e=>e.customBoss&&!e.outpostBoss&&!e.dead);
    if(game.state.wave<8||['forge','warning','attack'].includes(boss?.furnaceAction?.phase)&&['forge','charge'].includes(boss?.furnaceAction?.kind))game.furnaceCycle.step(dt,game.state.wave);else if(game.furnaceCycle.phase!=='cool')game.furnaceCycle.suppress();
    game.state.furnaceStatus=game.furnaceCycle.phase==='warning'?'地火预警 · 离开炉栅':game.furnaceCycle.phase==='burn'?'炉栅喷火 · 绕行石板':'';
    if(boss?.furnaceAction?.ground?.visible)game.state.furnaceStatus=game.furnaceCycle.phase==='warning'?'地火预警 · 炉栅与锁定圆圈':'地火燃烧 · 炉栅与锁定圆圈';
    game.furnaceWorld.update(game.furnaceCycle,game.state.time);
    if(game.furnaceCycle.hits(game.hero.position))game.hurt(10,'furnace-vent');
  }
  stepEnemy(enemy,dt){
    const game=this.game;
    if(enemy.customBoss&&!enemy.outpostBoss||enemy.type==='runner'){
      game.furnaceCombat.step(enemy,dt);game.effects.updateEnemyStatus(enemy,game.state.time);return true;
    }
    return false;
  }
  cleanup(){this.game.furnaceCombat.reset();this.game.furnaceCycle.suppress();this.game.furnaceWorld.update(this.game.furnaceCycle,this.game.state.time)}
  getHudState(){return {status:this.game.state.furnaceStatus||''}}
}

export class OutpostLevelRuntime extends BaseLevelRuntime{
  constructor(game){super(game,'outpost')}
  get waves(){return OUTPOST_WAVES}
  get difficulty(){return {spawnRadius:20,speedScale:1,runnerScale:1,contactDamage:9,projectileSpeed:5}}
  reset(){this.game.outpostWorld.wind.reset();this.game.state.chapterStatus='';this.game.outpostWorld.wind.updateVisual(0)}
  beginWave(){
    const game=this.game,wave=this.getWave(game.state.wave);
    game.state.remaining=wave.count;game.state.spawn=wave.grace;game.state.waveTime=0;
    game.outpostWorld.wind.reset(game.state.wave===1?.8:wave.grace);
    game.view.showToast(`第 ${game.state.wave} 波 · ${wave.label}`);
    if(game.state.wave===this.finalWave)this.spawnEnemy('boss');
  }
  step(dt){
    const game=this.game,wave=this.getWave(game.state.wave);
    const previousPhase=game.outpostWorld.wind.phase;
    const boss=game.enemies.find(enemy=>enemy.outpostBoss&&!enemy.dead),baseWindEvery=wave?.windEvery||10;
    const windEvery=boss?.bossPhase>=2?Math.max(4.8,baseWindEvery*.7):baseWindEvery;
    game.outpostWorld.wind.overloaded=boss?.bossPhase>=2;
    game.outpostWorld.wind.step(dt,windEvery,wave?.windLanes);game.outpostWorld.wind.updateVisual(game.state.time);
    if(game.state.wave===1&&previousPhase!=='warning'&&game.outpostWorld.wind.phase==='warning')game.showMechanicOnce('outpost-wind','风道预警 · 金色区域将在 1.5 秒后沿箭头方向起风');
    const pushed=game.outpostWorld.wind.push(game.hero,dt);
    if(pushed&&game.hero.position.length()>19.7)game.hurt(8,'outpost-gust');
    const lane=game.outpostWorld.wind.active[0]==null?null:WIND_LANES[game.outpostWorld.wind.active[0]],label=lane?.label||'风道';
    game.state.chapterStatus=boss?.phaseTransition>0?'核心超载 · 转阶段中':game.outpostWorld.wind.phase==='warning'?`${label}预警 · 离开金色带状区域`:game.outpostWorld.wind.phase==='push'?`${label}推动 · 保持横向移动`:'';
  }
  stepEnemy(enemy,dt){
    const game=this.game;
    if(enemy.outpostBoss){game.outpostCombat.step(enemy,dt);game.effects.updateEnemyStatus(enemy,game.state.time);return true}
    if(enemy.role==='scout'){game.outpostCombat.stepScout(enemy,dt);game.effects.updateEnemyStatus(enemy,game.state.time);return true}
    return false;
  }
  cleanup(){this.game.outpostCombat.reset();this.game.outpostWorld.wind.suppress();this.game.outpostWorld.wind.updateVisual(this.game.state.time)}
  getHudState(){return {status:this.game.state.chapterStatus||''}}
}

export function createLevelRuntimes(game){
  return {ruins:new RuinsLevelRuntime(game),furnace:new FurnaceLevelRuntime(game),outpost:new OutpostLevelRuntime(game)};
}
