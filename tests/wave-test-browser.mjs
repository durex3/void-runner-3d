import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
const browser=await launchBrowser({headless:true});
try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(testUrl('/wave-test.html?test=1'));
  await page.waitForFunction(()=>window.__game?.waveTest);
  await page.evaluate(()=>__game.setManual(true));
  const stored=await page.evaluate(()=>JSON.stringify(localStorage));
  assert.deepEqual(await page.evaluate(()=>[__game.state.wave,__game.state.remaining,__game.hero.userData.weaponModel]),[5,21,'sword_2handed']);
  await page.selectOption('[name=weapon]','2');await page.selectOption('[name=rate]','2');await page.check('[name=invincible]');await page.click('[type=submit]');
  assert.equal(await page.evaluate(()=>__game.state.rate),2);
  await page.evaluate(()=>__game.hurt(24,'boss-slash'));
  assert.equal(await page.evaluate(()=>__game.state.hp),100);
  await page.click('#wave-pause');
  assert.equal(await page.evaluate(()=>__game.state.mode),'paused');
  await page.click('#wave-reset');
  await page.evaluate(()=>{const g=__game;g.state.shot=999;for(let i=0;i<600;i++)g.tick(.05)});
  assert.equal(await page.evaluate(()=>__game.garden.plants.length),0);
  await page.evaluate(()=>{const g=__game;g.state.remaining=0;for(const e of [...g.enemies])g.damageEnemy(e,99999);g.tick(.01)});
  assert.equal(await page.evaluate(()=>__game.state.mode),'won');
  assert.equal(await page.evaluate(()=>__game.runReport.wave),5);
  assert.equal(await page.locator('#copy-run-report').count(),1);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),stored);
  await page.click('#restart');
  assert.equal(await page.evaluate(()=>__game.state.remaining),21);
  await page.uncheck('[name=invincible]');await page.click('[type=submit]');
  await page.evaluate(()=>__game.hurt(24,'boss-slash'));
  assert.equal(await page.evaluate(()=>__game.state.hp),76);
  await page.selectOption('[name=wave]','6');await page.check('[name=invincible]');await page.click('[type=submit]');
  assert.deepEqual(await page.evaluate(()=>[__game.state.wave,__game.state.remaining,__game.enemies.filter(e=>e.elite).length]),[6,24,1]);
  const sixth=await page.evaluate(()=>{
    const g=__game,events=[];let time=0,last=0;
    g.state.shot=999;
    for(const e of g.enemies.splice(0)){g.scene.remove(e.obj)}
    for(let i=0;i<900&&g.state.remaining>0;i++){
      const remaining=g.state.remaining;g.tick(.05);time+=.05;
      if(g.state.remaining<remaining){
        const e=g.enemies.at(-1);events.push({type:e.type,gap:time-last});last=time;
        for(const enemy of g.enemies.splice(0))g.scene.remove(enemy.obj);
      }
    }
    g.tick(.01);return {events,mode:g.state.mode,report:g.runReport};
  });
  assert.equal(sixth.events.length,24);
  for(let group=0;group<3;group++){
    assert.deepEqual(sixth.events.slice(group*8,group*8+8).map(e=>e.type),['brute','brute','brute','runner','runner','brute','runner','spitter']);
    if(group>0)assert.ok(sixth.events[group*8].gap>=3.49);
  }
  assert.equal(sixth.mode,'won');assert.equal(sixth.report.wave,6);
  await page.click('#restart');
  assert.equal(await page.evaluate(()=>__game.state.remaining),24);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.selectOption('[name=wave]','5-7');await page.click('[type=submit]');
  const sequence=await page.evaluate(()=>{
    const g=__game,stages=[];
    // Complete the queues without simulating player skill; exercise the real
    // transition hook, heal, wave initialization and final report.
    for(let i=0;i<3;i++){
      g.state.hp=50;g.state.shot=999;g.state.remaining=0;
      for(const e of g.enemies.splice(0)){g.furnaceCombat.cancel(e);g.scene.remove(e.obj)}
      g.tick(.01);
      stages.push({wave:g.state.wave,hp:g.state.hp,mode:g.state.mode,remaining:g.state.remaining,elite:g.enemies.filter(e=>e.elite).length});
    }
    return {stages,report:g.runReport};
  });
  assert.deepEqual(sequence.stages,[
    {wave:6,hp:62,mode:'playing',remaining:24,elite:1},
    {wave:7,hp:62,mode:'playing',remaining:15,elite:0},
    {wave:7,hp:50,mode:'won',remaining:0,elite:0},
  ]);
  assert.deepEqual(sequence.report.testContext,{mode:'wave-test',startWave:5,endWave:7,invincible:true});
  assert.equal(sequence.report.boss.damage,0);
  await page.click('#restart');
  assert.deepEqual(await page.evaluate(()=>[__game.state.wave,__game.state.remaining]),[5,21]);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),stored);
  await page.goto(testUrl('/wave-test.html?test=1&wave=5-7'));
  await page.waitForFunction(()=>window.__game?.waveTest);
  assert.equal(await page.locator('[name=wave]').inputValue(),'5-7');
  assert.deepEqual(errors,[]);
  console.log('PASS: wave test setup, controls, spawn, no devices, results/export, reset, save isolation and mobile layout');
}finally{await browser.close()}
