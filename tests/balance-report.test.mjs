import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyzeReports,mergeReports,normalizeReports,reportFingerprint,saveStoredReports,loadStoredReports,DATASET_KIND} from '../src/balance-report.js';

const report=(hero,chapter,weaponDamage,combo=0)=>({version:1,chapter,hero:{id:hero,label:hero},win:hero==='Ranger',duration:100,totalDamage:weaponDamage+20,totalDamageTaken:12,weapons:[{id:'bow',label:'猎手长弓',equippedTime:60,attacks:80,projectiles:80,hits:60,damage:weaponDamage,kills:4}],devices:[{id:'electric',label:'雷鸣法典',hits:10,damage:20,kills:2}],damageTaken:{'enemy-projectile':12},upgrades:[{id:'snare',name:'淬毒弩箭',kind:'combo'}],combos:{snare:combo},boss:{duration:20}});

test('normalizes only version one run reports',()=>{
  assert.equal(normalizeReports([report('Ranger','ruins',100),{version:2},null]).length,1);
});

test('aggregates weapons, devices, heroes, combos and warnings',()=>{
  const result=analyzeReports([report('Ranger','ruins',100,2),report('Knight','furnace',10,0),report('Knight','ruins',20,0)]);
  assert.equal(result.runs,3);assert.equal(result.totalDamage,190);assert.equal(result.weapons[0].damage,130);assert.equal(result.devices[0].kills,6);
  assert.equal(result.combos[0].runs,3);assert.equal(result.combos[0].triggeredRuns,1);assert.equal(result.combos[0].triggers,2);
  assert.equal(result.heroes.length,2);assert.equal(result.winRate,1/3);assert.ok(result.warnings.some(item=>item.includes('猎手长弓')));
});

test('filters by hero and chapter without mutating source reports',()=>{
  const reports=[report('Ranger','ruins',100),report('Knight','furnace',80)];
  const result=analyzeReports(reports,{hero:'Knight',chapter:'furnace'});
  assert.equal(result.runs,1);assert.equal(result.totalDamage,100);assert.equal(reports.length,2);
});

test('uses stable fingerprints and deduplicates repeated reports',()=>{
  const first=report('Ranger','ruins',100),reordered={...first,hero:{label:'Ranger',id:'Ranger'}};
  assert.equal(reportFingerprint(first),reportFingerprint(reordered));
  assert.notEqual(reportFingerprint({...first,runId:'run-a'}),reportFingerprint({...first,runId:'run-b'}));
  const merged=mergeReports([], [first,first],{now:1000});
  assert.equal(merged.length,1);assert.equal(merged[0].importedAt,'1970-01-01T00:00:01.000Z');
});

test('persists dataset metadata and restores notes',()=>{
  const memory=new Map(),storage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
  const entries=mergeReports([], [report('Ranger','ruins',100)],{now:1000});entries[0].note='重剑月弧测试';
  assert.equal(saveStoredReports(entries,storage),true);
  const restored=loadStoredReports(storage);assert.equal(restored.length,1);assert.equal(restored[0].note,'重剑月弧测试');
  const imported=mergeReports([],{kind:DATASET_KIND,version:1,reports:restored});assert.equal(imported[0].note,'重剑月弧测试');assert.equal(imported[0].importedAt,'1970-01-01T00:00:01.000Z');
});

test('suppresses balance conclusions until the current filter has three samples',()=>{
  const result=analyzeReports([report('Ranger','ruins',100),report('Ranger','ruins',100),report('Knight','ruins',10)],{hero:'Ranger'});
  assert.equal(result.sampleReady,false);assert.deepEqual(result.warnings,[]);
});
