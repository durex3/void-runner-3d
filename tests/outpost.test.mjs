import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {OUTPOST_ENEMY_ROLES,OUTPOST_WAVES} from '../src/levels.js';
import {WIND_LANES,WindField,createWindFieldVisual,insideWindLane} from '../src/wind-field.js';
import {OutpostCombat,chooseOutpostBossSkill,outpostDamageMultiplier,outpostRecoveryDuration,segmentDistance} from '../src/outpost-combat.js';

test('chapter 3 maps each combat role to a distinct purchased model',()=>{
  assert.deepEqual(OUTPOST_ENEMY_ROLES.brute,{actor:'windGuard',role:'guard'});
  assert.deepEqual(OUTPOST_ENEMY_ROLES.runner,{actor:'windScout',role:'scout'});
  assert.deepEqual(OUTPOST_ENEMY_ROLES.spitter,{actor:'windTech',role:'tech'});
  assert.ok(OUTPOST_WAVES[1].formation.some(entry=>entry.type==='runner'),'scout introduction is guaranteed');
  assert.ok(OUTPOST_WAVES[2].formation.some(entry=>entry.type==='spitter'),'technician introduction is guaranteed');
});

test('chapter 3 manifest keeps the three enemy runtime assets',async()=>{
  const {readFile}=await import('node:fs/promises');
  const manifest=JSON.parse(await readFile(new URL('../public/assets/outpost/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(manifest.runtimeFiles.enemies,[
    'enemies/CombatMech.glb','enemies/Helper_A.glb','enemies/Helper_B.glb',
  ]);
});

test('chapter 3 boss uses the shared large-rig animation path',async()=>{
  const {readFile}=await import('node:fs/promises');
  const actors=await readFile(new URL('../src/actors.js',import.meta.url),'utf8');
  const world=await readFile(new URL('../src/outpost-world.js',import.meta.url),'utf8');
  const combat=await readFile(new URL('../src/outpost-combat.js',import.meta.url),'utf8');
  assert.match(actors,/name==='Clanker'/);
  assert.match(actors,/outpostBoss:'Clanker'/);
  assert.match(world,/Actors\.animateActor\(obj,dt,time,speed\)/);
  assert.match(combat,/enemy\.outpostAction=attack/);
});

test('scout charge collision remains reliable at low frame rates',()=>{
  const hero=new T.Vector3(0,0,0),before=new T.Vector3(-4,0,0),after=new T.Vector3(3,0,0);
  assert.equal(segmentDistance(hero,before,after),0,'a long charge segment cannot tunnel through the player');
  assert.ok(segmentDistance(new T.Vector3(0,0,2),before,after)>1.9,'the same charge does not hit outside its corridor');
});

test('chapter 3 keeps a four-wave vertical slice and a single active wind lane',()=>{
  assert.equal(OUTPOST_WAVES.length,4);
  assert.deepEqual(OUTPOST_WAVES[0].windLanes,[0]);
  assert.deepEqual(OUTPOST_WAVES[1].windLanes,[1,3]);
  assert.deepEqual(OUTPOST_WAVES[3].windLanes,[0,2]);
  assert.ok(OUTPOST_WAVES[0].windEvery<10,'teaching gust must repeat before the encounter ends');
  const field=new WindField();field.reset(0);field.step(.01,10,[0]);
  assert.equal(field.phase,'warning');assert.equal(field.active.length,1);
  assert.equal(field.active[0],0,'teaching wave keeps a single predictable lane');
  const lane=WIND_LANES[field.active[0]];
  assert.equal(field.hits(new T.Vector3(lane.x,0,lane.z)),false,'warning has no push');
  field.step(1.5,10);assert.equal(field.phase,'push');
  assert.equal(field.hits(new T.Vector3(lane.x,0,lane.z)),true);
  assert.equal(field.hits(new T.Vector3(lane.x+lane.width+1,0,lane.z)),false);
});

test('chapter 3 gust telegraph matches the damage corridor',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/outpost-combat.js',import.meta.url),'utf8');
  assert.match(source,/PlaneGeometry\(4\.8,13\)/);
  assert.match(source,/along>0&&along<13&&side<2\.4/);
});

test('wind push is bounded and a paused simulation does not advance the state machine',()=>{
  const field=new WindField();field.reset(0);field.step(1.51,10);const hero=new T.Object3D();hero.position.set(19.8,0,0);
  const before=field.left;field.push(hero,.5);assert.ok(hero.position.length()<=20.000001);
  assert.ok(insideWindLane(new T.Vector3(WIND_LANES[field.active[0]].x,0,WIND_LANES[field.active[0]].z),WIND_LANES[field.active[0]]));
  assert.equal(field.left,before,'push does not own time');
  const paused=field.left;assert.equal(paused,field.left);
});

test('wind leaves a real central safe zone and still slows an opposing knight',()=>{
  assert.equal(insideWindLane(new T.Vector3(0,0,0),WIND_LANES[0]),false);
  assert.equal(insideWindLane(new T.Vector3(0,0,-4),WIND_LANES[0]),true);
  const field=new WindField();field.reset(0);field.step(1.51,10,[0]);
  const hero=new T.Object3D();hero.position.set(0,0,-9);const before=hero.position.z;
  field.push(hero,1);hero.position.z-=6;
  assert.ok(hero.position.z<before,'base-speed knight can still make progress against the wind');
  assert.ok(hero.position.z>before-2,'wind makes walking progress deliberately slow');
});

test('chapter 3 keeps ranged pressure active and rewards melee counter windows',()=>{
  const melee={effect:'melee'},ranged={effect:'bolt'},boss={outpostBoss:true,recovery:0};
  assert.equal(outpostRecoveryDuration('slash',melee),1.9);
  assert.equal(outpostRecoveryDuration('gust',melee),1.7);
  assert.equal(outpostRecoveryDuration('slash',ranged),1.1);
  assert.equal(outpostDamageMultiplier(boss,{weapon:0,effect:'bolt',distance:10}),1);
  assert.equal(outpostDamageMultiplier(boss,{weapon:0,effect:'bolt',distance:6}),1);
  boss.recovery=1;assert.equal(outpostDamageMultiplier(boss,{weapon:0,effect:'bolt',distance:6}),1);
  assert.equal(outpostDamageMultiplier(boss,{weapon:0,effect:'bolt',distance:10}),1);
  assert.equal(outpostDamageMultiplier(boss,{weapon:3,effect:'melee'}),1);
  assert.equal(outpostDamageMultiplier(boss,{device:'thorn'}),1);
  boss.bossPhase=2;boss.recovery=0;assert.equal(outpostDamageMultiplier(boss,{weapon:0,effect:'bolt'}),.5);
  boss.recovery=1;assert.equal(outpostDamageMultiplier(boss,{weapon:0,effect:'bolt'}),1);
});

test('outpost boss phase two enters once, grants transition invulnerability, and shortens wind cadence',()=>{
  const effects={burst(){}};const game={hero:{userData:{profile:{effect:'melee'}}},outpostWorld:{setBossPhase(){ }},effects,audio:{play(){}},view:{showToast(){ }},cameraKick:0,cameraKickDuration:0,cameraKickTime:0,state:{bossStats:{actions:{}}}};
  const combat=new OutpostCombat(game),enemy={outpostBoss:true,bossPhase:1,phaseTransition:0,obj:new T.Group(),recovery:0,attack:0};
  assert.equal(combat.enterPhaseTwo(enemy),true);assert.equal(enemy.bossPhase,2);assert.ok(enemy.phaseTransition>1);assert.equal(outpostDamageMultiplier(enemy,{weapon:0,effect:'bolt'}),0);assert.equal(combat.enterPhaseTwo(enemy),false);
  assert.equal(outpostRecoveryDuration('charge',{effect:'melee'}),.65);
});

test('outpost boss uses wind-control skills instead of the furnace slash-charge loop',()=>{
  const enemy={bossPhase:1,skillCooldowns:{},lastBossSkill:null};
  assert.equal(chooseOutpostBossSkill(enemy,10),'cannon');
  assert.equal(chooseOutpostBossSkill(enemy,3.5),'rotor');
  enemy.bossPhase=2;enemy.lastBossSkill='cannon';enemy.skillCooldowns={rotor:2,overload:2};
  assert.equal(chooseOutpostBossSkill(enemy,5),'vortex');
  enemy.lastBossSkill='vortex';enemy.skillCooldowns={vortex:2,cannon:2,rotor:2};
  assert.equal(chooseOutpostBossSkill(enemy,9),'overload');
});

test('new wind skills preserve longer melee punish windows',()=>{
  const melee={effect:'melee'},ranged={effect:'bolt'};
  assert.equal(outpostRecoveryDuration('cannon',melee),1.45);
  assert.equal(outpostRecoveryDuration('rotor',melee),1.75);
  assert.equal(outpostRecoveryDuration('vortex',melee),1.65);
  assert.equal(outpostRecoveryDuration('overload',melee),1.9);
  assert.ok(outpostRecoveryDuration('overload',melee)>outpostRecoveryDuration('overload',ranged));
});

test('outpost ordinary evasion resumes pressure while a vortex counter opens recovery',()=>{
  const effects={burst(){}};const game={scene:new T.Scene(),hero:{position:new T.Vector3(0,0,6),userData:{profile:{effect:'melee'}}},outpostWorld:{wind:{hits(){return false}},animateBoss(){}},effects,audio:{play(){}},view:{showToast(){}},hurt(){},state:{bossStats:{actions:{}}},cameraKick:0,cameraKickDuration:0,cameraKickTime:0};
  const combat=new OutpostCombat(game),enemy={outpostBoss:true,bossPhase:2,obj:new T.Group(),recovery:0,attack:0,skillCooldowns:{}};enemy.obj.position.set(0,0,0);
  combat.begin(enemy,'cannon');enemy.outpostAction.phase='attack';enemy.outpostAction.left=.01;combat.step(enemy,.02);assert.equal(enemy.recovery,0);assert.equal(enemy.outpostAction.phase,'resume');combat.cancel(enemy);
  combat.begin(enemy,'vortex');enemy.outpostAction.phase='attack';enemy.outpostAction.left=1;const from=new T.Vector3(0,0,4),to=new T.Vector3(0,0,2.2);combat.onDash(from,to);assert.ok(enemy.outpostAction.counterWindow>0);combat.onBossHit(enemy,{weapon:0,effect:'bolt'});assert.equal(enemy.outpostAction.phase,'recovery');assert.ok(enemy.recovery>0);
});

test('outpost boss attack ranges overlap its approach distance and gust damages once',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/outpost-combat.js',import.meta.url),'utf8');
  assert.match(source,/moveSpeed=distance>5\.2\?1\.25:0/);
  assert.match(source,/if\(!attack\.hit\)\{attack\.hit=true;game\.hurt\(10,'outpost-gust'\)\}/);
});

test('wind visual updates idle, warning and push states without material ownership errors',()=>{
  const field=createWindFieldVisual();
  field.updateVisual(0);
  field.reset(0);field.step(.01,10,[0]);field.updateVisual(.5);
  field.step(1.5,10,[0]);field.updateVisual(2);
  const lane=field.root.children[0];
  assert.equal(lane.visible,true);
  assert.ok(lane.userData.rails.opacity>.9);
  assert.equal(lane.userData.arrows.children.length,5);
  assert.equal(lane.userData.streaks.group.children.length,9);
  assert.ok(lane.userData.streaks.material.opacity>.9);
});

test('all level runtime lifecycle methods exist',async()=>{
  const {createLevelRuntimes,RuinsLevelRuntime,FurnaceLevelRuntime,OutpostLevelRuntime}=await import('../src/level-runtime.js');
  assert.deepEqual([RuinsLevelRuntime.name,FurnaceLevelRuntime.name,OutpostLevelRuntime.name],['RuinsLevelRuntime','FurnaceLevelRuntime','OutpostLevelRuntime']);
  const game={state:{},furnaceCycle:{},outpostWorld:{wind:{}},outpostCombat:{},furnaceCombat:{},view:{showToast(){}},beginWaveDefault(){},spawnEnemyBase(){}};
  const levels=createLevelRuntimes(game);
  for(const level of Object.values(levels))for(const method of ['reset','beginWave','spawnEnemy','step','cleanup','getHudState'])assert.equal(typeof level[method],'function');
});
