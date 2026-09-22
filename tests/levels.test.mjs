import test from 'node:test';
import assert from 'node:assert/strict';
import {FurnaceCycle,FURNACE_WAVES,VENTS,insideVent} from '../src/levels.js';
import * as T from 'three';
import {FurnaceCombat,FORGE_TARGET,inSlash,segmentDistance} from '../src/furnace-combat.js';
import {WeaponCombat} from '../src/combat.js';
import {HEROES} from '../src/loadouts.js';

function bossFixture(){
  const game={scene:new T.Scene(),hero:new T.Object3D(),state:{time:0,damage:1,rate:1.6},furnaceCycle:new FurnaceCycle(),hazards:[],clearObjects(){},hurt(){}};
  const enemy={obj:new T.Object3D(),type:'boss',customBoss:true,hp:100000,maxHp:100000,attack:1,slow:0};
  const ai=new FurnaceCombat(game),profile=HEROES.Knight.weapons[2];
  game.hero.userData.profile=profile;
  const weapon=new WeaponCombat({...game,enemies:()=>[enemy],garden:{combos:new Set()},damage:(e,n)=>{e.hp-=n},
    onMeleeImpact:()=>{enemy.hitStop=.05*.55}});
  const strike=()=>{
    game.hero.position.copy(enemy.obj.position).add(new T.Vector3(0,0,2));
    weapon.melee({profile,damage:profile.damage,dir:new T.Vector3(0,0,-1)});
  };
  return {game,enemy,ai,strike};
}

test('black knight control indicators and slow expire after a mace hit',()=>{
  const {enemy,ai,strike}=bossFixture();strike();enemy.slow=.1;
  for(let i=0;i<20;i++)ai.step(enemy,.01);
  assert.equal(enemy.stagger,0);assert.equal(enemy.slow,0);assert.equal(enemy.hitStop,0);
});

test('slash recovery is shorter while charge and forge keep their counterattack window',()=>{
  const {enemy,ai}=bossFixture();
  for(const [kind,duration] of [['slash',1.8],['charge',2.4],['forge',2.4]]){
    ai.begin(enemy,kind);ai.recover(enemy,enemy.furnaceAction);
    assert.equal(enemy.recovery,duration);
  }
  ai.reset();
});

test('ranged players get a longer charge lane without changing melee recovery',()=>{
  const {game,enemy,ai}=bossFixture();
  game.hero.userData.profile=HEROES.Druid.weapons[2];
  ai.begin(enemy,'charge');
  assert.equal(enemy.furnaceAction.length,14);
  ai.recover(enemy,enemy.furnaceAction);
  assert.equal(enemy.recovery,1.9);
  ai.reset();
});

test('two-hit slash snapshots half health and locks a fresh second warning',()=>{
  const {game,enemy,ai}=bossFixture();game.hero.position.set(0,0,4);
  ai.begin(enemy,'slash');assert.equal(enemy.furnaceAction.strikes,1);
  enemy.hp=enemy.maxHp*.5;assert.equal(enemy.furnaceAction.strikes,1);
  ai.begin(enemy,'slash');assert.equal(enemy.furnaceAction.strikes,2);
  enemy.furnaceAction.phase='attack';enemy.furnaceAction.left=.01;
  game.hero.position.set(4,0,0);ai.step(enemy,.02);
  const second=enemy.furnaceAction;
  assert.equal(second.strike,2);assert.equal(second.phase,'warning');assert.equal(second.left,.9);
  assert.equal(enemy.recovery,0);assert.equal(second.direction.x,1);
  game.hero.position.set(-4,0,0);ai.step(enemy,.1);assert.equal(second.direction.x,1);
  second.phase='attack';second.left=.01;ai.step(enemy,.02);
  assert.equal(second.phase,'recovery');assert.equal(enemy.recovery,1.8);
  ai.reset();assert.equal(game.scene.children.length,0);
});

test('forge locks its target, warns fully and damages only once per cast',()=>{
  const {game,enemy,ai}=bossFixture();let damage=0;game.hurt=n=>damage+=n;
  game.hero.position.set(2,0,3);ai.begin(enemy,'forge');const attack=enemy.furnaceAction;
  game.hero.position.set(8,0,3);ai.step(enemy,2.39);
  assert.equal(damage,0);assert.equal(attack.ground.position.x,2);
  ai.step(enemy,.02);assert.equal(damage,0);
  game.hero.position.set(2,0,3);ai.step(enemy,.01);ai.step(enemy,.1);
  assert.equal(damage,FORGE_TARGET.damage);
  ai.recover(enemy,attack);assert.equal(attack.ground.visible,false);
  ai.step(enemy,2.4);assert.equal(enemy.attack,0);assert.equal(enemy.furnaceAction,null);
  assert.equal(game.scene.children.length,0);
});

test('cancelled forge never leaves a target or delayed damage behind',()=>{
  const {game,enemy,ai}=bossFixture();ai.begin(enemy,'forge');
  const ground=enemy.furnaceAction.ground;ai.cancel(enemy);
  assert.equal(ground.parent,null);assert.equal(ai.attacks.size,0);assert.equal(game.scene.children.length,0);
});

test('repeated mace hits cannot stall forge approach or preserve an expired slow',()=>{
  const {game,enemy,ai,strike}=bossFixture();
  ai.begin(enemy,'forge');const start=enemy.obj.position.clone();enemy.slow=.3;
  for(let i=0;i<470;i++){
    strike();game.hero.position.copy(enemy.obj.position).add(new T.Vector3(0,0,8));
    ai.step(enemy,.01);if(enemy.furnaceAction?.phase==='forge')game.furnaceCycle.step(.01,8);
  }
  assert.ok(enemy.obj.position.distanceTo(start)>4);
  assert.equal(enemy.furnaceAction.phase,'recovery');assert.equal(enemy.slow,0);
});

test('mace at the reported attack speed leaves pursuit time between hits',()=>{
  const {game,enemy,ai,strike}=bossFixture();enemy.attack=100;
  for(let i=0;i<300;i++){
    if(i%57===0)strike();
    game.hero.position.copy(enemy.obj.position).add(new T.Vector3(0,0,8));ai.step(enemy,.01);
  }
  assert.ok(enemy.obj.position.z>3.5,`pursuit distance ${enemy.obj.position.z}`);
});

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
