import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RunTelemetry} from '../src/run-telemetry.js';

test('attack rates and actual projectile counts distinguish melee and spells',()=>{
  const telemetry=new RunTelemetry();
  for(const effect of ['melee','nature','chain']){
    telemetry.recordAttack({model:effect,effect},{rate:2});
    telemetry.recordAttack({model:effect,effect},{rate:3});
  }
  telemetry.recordAttack({model:'shotgun',count:6},{rate:1,projectiles:2});
  telemetry.recordAttack({model:'shotgun',count:6},{rate:1,projectiles:0});
  const report=telemetry.snapshot({state:{rate:3,damage:1.5}});
  for(const id of ['melee','nature','chain']){
    const weapon=report.weapons.find(w=>w.id===id);
    assert.equal(weapon.attacks,2);assert.equal(weapon.projectiles,0);
    assert.equal(weapon.attackRateMin,2);assert.equal(weapon.attackRateMax,3);
  }
  assert.equal(report.weapons.find(w=>w.id==='shotgun').projectiles,2);
  assert.deepEqual(report.finalMultipliers,{attackRate:3,damage:1.5});
});

test('run telemetry aggregates actual weapon and device outcomes',()=>{
  const telemetry=new RunTelemetry().reset({chapter:'furnace',heroId:'Druid',heroLabel:'德鲁伊'});
  const weapon={model:'wand',label:'聚能魔杖',count:1};
  telemetry.advance(1.25,weapon);telemetry.recordAttack(weapon);telemetry.recordDamage({model:'wand',weaponLabel:'聚能魔杖'},10,{boss:false});telemetry.recordKill({model:'wand',weaponLabel:'聚能魔杖'});
  telemetry.recordDamage({device:'electric'},7,{boss:true});telemetry.recordKill({device:'electric'});
  const report=telemetry.finish({win:true,state:{chapter:'furnace',time:2,wave:8,kills:2,level:3},garden:{stats:{planted:4,kills:1},buddies:[{}]}});
  assert.equal(report.totalDamage,17);
  assert.deepEqual(report.weapons[0],{id:'wand',label:'聚能魔杖',equippedTime:1.25,attacks:1,projectiles:1,hits:1,damage:10,bossDamage:0,kills:1});
  assert.equal(report.devices[0].label,'雷鸣法典');
  assert.equal(report.devices[0].bossDamage,7);
  assert.equal(report.deployments,4);assert.equal(report.deviceKills,1);assert.equal(report.companions,1);
});

test('run telemetry records damage sources, upgrades, combos and boss duration',()=>{
  const telemetry=new RunTelemetry().reset({heroId:'Knight',heroLabel:'骑士'});
  telemetry.recordDamageTaken('boss-charge',22);telemetry.recordDamageTaken('boss-charge',10);telemetry.recordDamageTaken('enemy-projectile',12);
  telemetry.recordUpgrade({id:'pollen',name:'战术空投',kind:'combo'},{level:4,time:15.25});
  telemetry.recordCombo('pollen');telemetry.recordCombo('pollen');telemetry.startBoss(20,'黑骑士');telemetry.endBoss(38);
  const report=telemetry.finish({win:false,state:{chapter:'furnace',time:41.5,wave:8,kills:20,level:4},garden:{stats:{},buddies:[]}});
  assert.deepEqual(report.damageTaken,{'boss-charge':32,'enemy-projectile':12});
  assert.equal(report.totalDamageTaken,44);assert.equal(report.upgrades[0].name,'战术空投');assert.equal(report.combos.pollen,2);assert.equal(report.boss.duration,18);
});

test('run reset and finished state prevent telemetry leakage',()=>{
  const telemetry=new RunTelemetry(),weapon={model:'bow',label:'长弓'};
  telemetry.advance(1,weapon);telemetry.finish({state:{time:1},garden:{stats:{},buddies:[]}});telemetry.advance(2,weapon);
  assert.equal(telemetry.snapshot({state:{time:1},garden:{stats:{},buddies:[]}}).weapons[0].equippedTime,1);
  telemetry.reset({heroId:'Ranger',heroLabel:'游侠'});
  const report=telemetry.snapshot({state:{time:0},garden:{stats:{},buddies:[]}});
  assert.equal(report.weapons.length,0);assert.equal(report.totalDamage,0);assert.deepEqual(report.damageTaken,{});
});
