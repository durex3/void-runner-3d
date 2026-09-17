import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEROES} from '../src/loadouts.js';
import {buildCharacterStats} from '../src/character-stats.js';

function stats(heroName,slot,state={}){
  const role=HEROES[heroName],profile=role.weapons[slot];
  return buildCharacterStats({
    role,
    hero:{userData:{profile}},
    state:{hp:100,maxHp:100,damage:1,rate:1,speed:6,...state},
  });
}

test('shotgun and burst damage are described per projectile without inventing constant total damage',()=>{
  assert.equal(stats('Engineer',0).damage,'5 × 16（单颗近距）');
  assert.equal(stats('Engineer',1,{damage:1.25,rate:1.2}).damage,'3 × 17.5（每轮）');
  assert.ok(stats('Engineer',1,{rate:1.2}).mechanics.some(text=>text.includes('0.063 秒')));
});

test('piercing and chain weapons expose their real diminishing damage sequence',()=>{
  assert.equal(stats('Ranger',1).damage,'56 → 44.8 → 35.84');
  assert.equal(stats('Druid',1).damage,'30 → 24 → 19.2 → 15.36');
});

test('equipment passives and upgrades affect displayed values',()=>{
  const shield=stats('Knight',0,{hp:92,maxHp:125,damage:1.5,rate:1.4});
  assert.equal(shield.health,'92 / 125');
  assert.equal(shield.damage,'57（正面 120°）');
  assert.equal(shield.interval,'0.443 秒/轮');
  assert.ok(shield.mechanics.some(text=>text.includes('减少 20%')));
  const mobile=stats('Ranger',2,{speed:6.72});
  assert.equal(mobile.moveSpeed,'7.53 米/秒');
  assert.ok(mobile.mechanics.some(text=>text.includes('12%')));
});
