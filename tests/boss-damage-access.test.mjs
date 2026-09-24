import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BOSS_DAMAGE_ACCESS,BossDamageAccess} from '../src/boss-damage-access.js';
import {WeaponCombat} from '../src/combat.js';
import {HEROES} from '../src/loadouts.js';
import {EffectsSystem} from '../src/effects.js';

function fixture(chapter='ruins'){
  const scene=new T.Scene(),hero=new T.Group(),enemy={obj:new T.Group(),type:'boss',bossPhase:1,recovery:0,phaseTransition:0};
  const game={scene,hero,enemies:[enemy],state:{time:0},showMechanicOnce(){}};
  scene.add(enemy.obj);const access=new BossDamageAccess(game),entry=access.attach(enemy,chapter);
  return {scene,hero,enemy,game,access,entry};
}

test('three chapters use distinct data-driven boss counter strategies',()=>{
  assert.deepEqual(Object.keys(BOSS_DAMAGE_ACCESS),['ruins','furnace','outpost']);
  assert.deepEqual(Object.values(BOSS_DAMAGE_ACCESS).map(item=>item.type),['open','pressure','wind-core']);
  assert.deepEqual(Object.values(BOSS_DAMAGE_ACCESS).map(item=>item.label),['骸骨破绽','炉脉失衡','风障核心']);
  assert.deepEqual(BOSS_DAMAGE_ACCESS.ruins.active,{melee:.8,ranged:.8,device:.8});
  assert.deepEqual(BOSS_DAMAGE_ACCESS.furnace.active,{melee:.65,ranged:.65,device:.65});
  assert.deepEqual(BOSS_DAMAGE_ACCESS.outpost.active,{melee:1,ranged:1,device:1});
  for(const config of Object.values(BOSS_DAMAGE_ACCESS))assert.deepEqual(config.recovery,{melee:1,ranged:1,device:1});
});

test('bosses remain attackable in active state and reward counter windows',()=>{
  const {enemy,access}=fixture('outpost');
  let result=access.evaluate(enemy,{weapon:0,effect:'bolt',origin:new T.Vector3(10,0,0)});
  assert.equal(result.blocked,false);assert.equal(result.multiplier,1);
  result=access.evaluate(enemy,{weapon:0,effect:'bolt',origin:new T.Vector3(8,0,0)});
  assert.equal(result.multiplier,1);
  assert.equal(access.evaluate(enemy,{device:'thorn',origin:new T.Vector3(2,0,0)}).multiplier,1);
  assert.equal(access.evaluate(enemy,{weapon:3,effect:'melee',origin:new T.Vector3(2,0,0)}).multiplier,1);
  enemy.recovery=1;
  assert.equal(access.evaluate(enemy,{weapon:3,effect:'melee',origin:new T.Vector3(2,0,0)}).multiplier,1);
  assert.equal(access.evaluate(enemy,{weapon:0,effect:'bolt',origin:new T.Vector3(2,0,0)}).multiplier,1);
  assert.equal(access.evaluate(enemy,{device:'thorn',origin:new T.Vector3(2,0,0)}).multiplier,1);
  enemy.phaseTransition=1;assert.equal(access.evaluate(enemy,{weapon:0,effect:'bolt'}).multiplier,0);
});

test('wind counter visual appears only during the confirmed counter flash',()=>{
  const {enemy,access,entry}=fixture('outpost');
  enemy.bossPhase=2;
  access.step(1/60,1);
  const visual=entry.visual.userData.damageAccessVisual;
  assert.equal(visual.arcs.some(arc=>arc.visible),false);
  enemy.recovery=1;access.step(1/60,2);
  assert.equal(visual.arcs.every(arc=>arc.visible),false);
  assert.equal(access.getHudState().status,'风障破裂 · 全力输出');
  enemy.recovery=0;enemy.coreExposed=1;access.step(1/60,3);
  assert.equal(access.getHudState().status,'冲刺穿过金色内圈并攻击核心');
  assert.equal(visual.core.visible,false);
  enemy.coreExposed=0;enemy.counterFlash=1;access.step(1/60,4);
  assert.equal(access.getHudState().status,'破防成功 · 核心暴露');
  assert.equal(visual.core.visible,true);
  access.step(1,5);assert.equal(visual.core.visible,false);assert.equal(visual.shell.visible,false);
});

test('generic boss status keeps the recovery marker but never creates a white shell',()=>{
  const status={recovery:{visible:false},shield:{visible:false},charge:{visible:false},slow:{visible:false},stagger:{visible:false}};
  const enemy={type:'boss',recovery:1,dead:false,slow:0,stagger:0,statusVfx:status};
  EffectsSystem.prototype.updateEnemyStatus.call({},enemy,1);
  assert.equal(status.recovery.visible,true);assert.equal(status.shield.visible,false);
  enemy.recovery=0;EffectsSystem.prototype.updateEnemyStatus.call({},enemy,2);
  assert.equal(status.recovery.visible,false);assert.equal(status.shield.visible,false);
});

test('ruins and furnace counter flashes stay hidden during ordinary attacks',()=>{
  for(const chapter of ['ruins','furnace']){
    const {enemy,access,entry}=fixture(chapter);enemy.counterFlash=0;access.step(1/60,1);
    const visual=entry.visual.userData.damageAccessVisual;assert.equal(visual.counterShell?.visible,false);assert.equal(visual.counterRing?.visible,false);
    enemy.counterFlash=1;access.step(1/60,2);assert.equal(visual.counterShell?.visible,true);assert.equal(visual.counterRing?.visible,true);
    enemy.recovery=1;enemy.counterFlash=0;access.step(1/60,3);assert.equal(visual.counterShell?.visible,false);
  }
});

test('outpost phase two halves damage until the counter is confirmed',()=>{
  const {enemy,access}=fixture('outpost');enemy.bossPhase=2;
  assert.equal(access.evaluate(enemy,{weapon:0,effect:'bolt'}).multiplier,.5);
  assert.equal(access.evaluate(enemy,{weapon:3,effect:'melee'}).multiplier,.5);
  assert.equal(access.evaluate(enemy,{device:'thorn'}).multiplier,.5);
  enemy.recovery=1;
  assert.equal(access.evaluate(enemy,{weapon:0,effect:'bolt'}).multiplier,1);
  assert.equal(access.evaluate(enemy,{weapon:3,effect:'melee'}).multiplier,1);
});

test('counter recovery restores full damage in the first two chapters',()=>{
  for(const [chapter,active] of [['ruins',.8],['furnace',.65]]){
    const {enemy,access}=fixture(chapter);
    assert.equal(access.evaluate(enemy,{weapon:0,effect:'bolt'}).multiplier,active);
    enemy.recovery=1;assert.equal(access.evaluate(enemy,{weapon:0,effect:'bolt'}).multiplier,1);
  }
});

test('transition, death and reset cleanly close damage and visual state',()=>{
  const {scene,enemy,access,entry,game}=fixture('furnace');enemy.phaseTransition=1;
  assert.equal(access.evaluate(enemy,{weapon:0,origin:new T.Vector3()}).multiplier,0);
  assert.equal(typeof enemy.damageAccess.canDamage,'function');assert.equal(typeof enemy.damageAccess.cleanup,'function');
  enemy.dead=true;access.step(.016,1);assert.equal(entry.visual.parent,null);assert.equal(enemy.damageAccess,null);
  const another={obj:new T.Group(),type:'boss',bossPhase:1,recovery:0};game.enemies=[another];scene.add(another.obj);access.attach(another,'furnace');
  access.reset();assert.equal(access.entries.size,0);assert.equal(another.damageAccess,null);assert.equal(access.getHudState(),null);
});

test('projectiles retain their firing origin for delayed domain checks',()=>{
  const scene=new T.Scene(),hero=new T.Group(),enemy={obj:new T.Group(),size:.4,hp:1000,type:'boss',slow:0},hits=[];
  hero.userData.profile=HEROES.Ranger.weapons[0];enemy.obj.position.set(0,0,5);
  const combat=new WeaponCombat({scene,hero,state:{damage:1,rate:1,shot:0},enemies:()=>[enemy],garden:{combos:new Set(),onShot(){}},damage:(target,damage,source)=>hits.push(source)});
  combat.attack();hero.position.set(10,0,0);for(let i=0;i<30;i++)combat.step(1/60);
  assert.equal(hits.length,1);assert.deepEqual(hits[0].origin.toArray(),[0,0,0]);assert.equal(hits[0].distance,5);
});
