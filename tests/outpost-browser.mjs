import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('test-results',{recursive:true});
const browser=await launchBrowser({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
  await page.goto(testUrl('/?test=1'));await page.waitForFunction(()=>window.__game,{timeout:60000});
  await page.evaluate(()=>window.__game.setManual(true));
  await page.check('[name="chapter"][value="outpost"]');await page.click('#start');
  const start=await page.evaluate(()=>{const g=window.__game;return {chapter:g.state.chapter,mode:g.state.mode,visible:g.outpostWorld.root.visible,inScene:g.outpostWorld.root.parent===g.scene,remaining:g.state.remaining,laneCount:g.outpostWorld.wind.root.children.filter(lane=>lane.visible).length}});
  assert.deepEqual(start,{chapter:'outpost',mode:'playing',visible:true,inScene:true,remaining:7,laneCount:4});
  const wind=await page.evaluate(()=>{const g=window.__game;g.state.remaining=1;g.state.spawn=999;g.state.shot=999;g.hero.position.set(0,0,-9);g.outpostWorld.wind.reset(0);g.tick(.01);const warning={phase:g.outpostWorld.wind.phase,active:g.outpostWorld.wind.active.slice(),hero:g.hero.position.toArray(),hp:g.state.hp},pushedBefore=g.hero.position.clone();g.tick(1.5);g.tick(.4);const pushedAfter=g.hero.position.clone();return {warning,pushed:pushedAfter.distanceTo(pushedBefore),phase:g.outpostWorld.wind.phase,bounded:g.hero.position.length()<=20.0001,hp:g.state.hp}});
  assert.equal(wind.warning.phase,'warning');assert.equal(wind.warning.active.length,1);assert.ok(wind.pushed>0);assert.ok(wind.bounded);assert.ok(wind.hp<=100);
  const pause=await page.evaluate(()=>{const g=window.__game;g.outpostWorld.wind.reset(1);const before=g.outpostWorld.wind.left;g.pause();g.tick(3);const frozen=before===g.outpostWorld.wind.left;g.pause();return frozen});assert.equal(pause,true);
  const cleanup=await page.evaluate(()=>{const g=window.__game;g.state.wave=4;g.beginWave();g.state.remaining=0;g.state.spawn=999;const boss=g.enemies.find(e=>e.outpostBoss),attached=g.bossDamageAccess.entries.size;g.outpostCombat.begin(boss,'slash');g.returnToTitle();return {mode:g.state.mode,enemies:g.enemies.length,attacks:g.outpostCombat.attacks.size,active:g.outpostWorld.wind.active.length,attached,domains:g.bossDamageAccess.entries.size}});
  assert.deepEqual(cleanup,{mode:'title',enemies:0,attacks:0,active:0,attached:1,domains:0});
  const recovery=await page.evaluate(()=>{
    const g=window.__game;g.chooseLevel('outpost');g.start();g.state.wave=4;g.beginWave();g.state.remaining=0;g.state.spawn=999;g.state.shot=999;
    const boss=g.enemies.find(e=>e.outpostBoss);boss.obj.position.set(0,0,0);g.hero.position.set(0,0,6);g.state.inv=999;
    g.outpostCombat.begin(boss,'vortex');g.bossDamageAccess.step(0,g.state.time);g.effects.updateEnemyStatus(boss,g.state.time);
    const visual=boss.damageAccess.visual.userData.damageAccessVisual;
    const castingShield=visual.shell.visible||boss.statusVfx.shield.visible;
    const attack=boss.outpostAction;attack.phase='attack';attack.left=1;
    const from=new g.THREE.Vector3(0,0,4),to=new g.THREE.Vector3(0,0,2.2);g.hero.position.copy(from);
    g.outpostCombat.onDash(from,to);g.outpostCombat.onBossHit(boss,{weapon:0,effect:'bolt'});
    g.bossDamageAccess.step(0,g.state.time);g.effects.updateEnemyStatus(boss,g.state.time);
    const flashed=visual.shell.visible&&!boss.statusVfx.shield.visible;
    const domain=g.bossDamageAccess.getHudState();g.render();
    const outside=g.bossDamageAccess.evaluate(boss,{weapon:0,effect:'bolt',origin:new g.THREE.Vector3(12,0,-10)});
    const inside=g.bossDamageAccess.evaluate(boss,{weapon:0,effect:'bolt',origin:new g.THREE.Vector3(0,0,2)});
    g.bossDamageAccess.step(.3,g.state.time+.3);g.effects.updateEnemyStatus(boss,g.state.time+.3);
    return {phase:boss?.outpostAction?.phase||null,recovery:boss?.recovery||0,hp:boss?.hp||0,domain,outside:outside.multiplier,inside:inside.multiplier,castingShield,flashed,recoveryShield:visual.shell.visible||boss.statusVfx.shield.visible};
  });
  assert.equal(recovery.phase,'recovery');assert.ok(recovery.recovery>0);assert.equal(recovery.outside,1);assert.equal(recovery.inside,1);assert.equal(recovery.domain?.label,'风障核心');
  assert.equal(recovery.castingShield,false);assert.equal(recovery.flashed,true);assert.equal(recovery.recoveryShield,false);
  await page.screenshot({path:'test-results/outpost-desktop.png'});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.evaluate(()=>window.__game.render());await page.screenshot({path:'test-results/outpost-mobile.png'});
  assert.deepEqual(errors,[]);
  await writeFile('test-results/outpost-report.json',JSON.stringify({passed:true,start,wind,pause,cleanup,recovery,errors},null,2));
  console.log('PASS: chapter 3 wind lifecycle, cleanup, boss recovery, desktop/mobile render');
}finally{await browser.close()}
