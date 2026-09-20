import test from 'node:test';
import assert from 'node:assert/strict';
import {FurnaceCycle,FURNACE_WAVES,VENTS,insideVent} from '../src/levels.js';
import * as T from 'three';
import {FurnaceCombat,inSlash,segmentDistance} from '../src/furnace-combat.js';

test('locked slash telegraph matches damage direction in all eight facings',()=>{
  const game={scene:new T.Scene(),hero:new T.Object3D(),furnaceCycle:new FurnaceCycle()};
  const combat=new FurnaceCombat(game),enemy={obj:new T.Object3D(),type:'boss',hp:100,maxHp:100};
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;game.hero.position.set(Math.sin(angle)*4,0,Math.cos(angle)*4);
    combat.begin(enemy,'slash');const attack=enemy.furnaceAction;
    const center=attack.warning.localToWorld(new T.Vector3(0,4,0));
    assert.ok(Math.hypot(center.x-game.hero.position.x,center.z-game.hero.position.z)<1e-6);
    assert.equal(inSlash(game.hero.position,attack.origin,attack.direction),true);
    assert.equal(inSlash(game.hero.position.clone().negate(),attack.origin,attack.direction),false);
    const locked=attack.direction.clone();game.hero.position.set(99,0,99);assert.ok(attack.direction.equals(locked));
    combat.cancel(enemy);assert.equal(game.scene.children.length,0);
  }
});
test('swept charge cannot skip a hero between frames',()=>{
  assert.equal(segmentDistance({x:0,z:3},{x:0,z:0},{x:0,z:8}),0);
  assert.equal(segmentDistance({x:2,z:3},{x:0,z:0},{x:0,z:8}),2);
});

test('furnace has eight paced encounters with a pre-boss breather',()=>{
  assert.equal(FURNACE_WAVES.length,8);
  assert.ok(FURNACE_WAVES[6].count<FURNACE_WAVES[5].count);
  assert.deepEqual(FURNACE_WAVES[0].pool,['brute']);
});
test('fire always warns, then burns, then releases',()=>{
  const cycle=new FurnaceCycle();
  cycle.step(6,1);assert.equal(cycle.phase,'warning');assert.equal(cycle.hits(VENTS[0]),false);
  cycle.step(2.4,1);assert.equal(cycle.phase,'burn');assert.equal(cycle.hits(VENTS[0]),true);
  cycle.step(2.2,1);assert.equal(cycle.phase,'cool');assert.equal(cycle.hits(VENTS[0]),false);
});
test('paired vents never remove the central safe zone or every escape route',()=>{
  const cycle=new FurnaceCycle();
  for(let i=0;i<12;i++){
    cycle.ignite(8);assert.equal(cycle.active.length,2);
    assert.equal(cycle.active.some(index=>insideVent({x:0,z:0},VENTS[index])),false);
    assert.equal((cycle.active[1]-cycle.active[0]+4)%4,2);
  }
});
test('suppression and reset cancel damage and keep a full new warning',()=>{
  const cycle=new FurnaceCycle();cycle.ignite(8);cycle.step(2.4,8);
  cycle.suppress();assert.equal(cycle.hits(VENTS[0]),false);assert.deepEqual(cycle.active,[]);
  cycle.step(3,8);assert.equal(cycle.phase,'warning');assert.equal(cycle.left,2.4);
  cycle.reset();assert.equal(cycle.turn,0);
});
