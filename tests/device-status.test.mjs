import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildDeviceStatus} from '../src/device-status.js';
import {PLANTS,COMBOS} from '../src/garden.js';

test('device status separates totals, startup and expiration warnings',()=>{
  const garden={
    plants:[
      {type:0,grow:0,life:30},{type:0,grow:.5,life:40},
      {type:1,grow:0,life:5},{type:2,grow:0,life:20},{type:2,dead:true,grow:0,life:20},
    ],
    buddies:[],combos:new Set(),
  };
  const status=buildDeviceStatus({garden,plants:PLANTS,combos:COMBOS});
  assert.equal(status.total,4);
  assert.deepEqual(status.devices.map(device=>[device.count,device.starting,device.expiring]),[[2,1,0],[1,0,1],[1,0,0]]);
});

test('device status exposes compact companion and combo data',()=>{
  const garden={plants:[],buddies:[{type:'slime',rank:2},{type:'mushroom',rank:1}],combos:new Set(['snare','friendship'])};
  const status=buildDeviceStatus({garden,plants:PLANTS,combos:COMBOS});
  assert.deepEqual(status.companions.map(companion=>`${companion.name} Lv.${companion.rank}`),['采集 Lv.2','治愈 Lv.1']);
  assert.deepEqual(status.combos.map(combo=>combo.id),['snare','friendship']);
});
