import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const browser=await launchBrowser({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:testUrl('/')});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});

try{
  await page.goto(testUrl('/?test=telemetry'));
  await page.waitForFunction(()=>window.__game&&document.body.dataset.effects==='loaded',{timeout:60000});
  await page.evaluate(()=>window.__game.setManual(true));
  await page.click('#start');

  const outcomes=await page.evaluate(()=>{
    const g=window.__game,T=g.THREE;
    g.state.remaining=999;g.state.spawn=999;g.state.shot=999;

    const weaponEnemy=g.spawnEnemy('runner');
    weaponEnemy.hp=weaponEnemy.maxHp=10;
    weaponEnemy.obj.position.copy(g.hero.position).add(new T.Vector3(0,0,-2));
    g.attack();g.combat.step(.2);

    const deviceEnemy=g.spawnEnemy('runner');
    deviceEnemy.hp=deviceEnemy.maxHp=5;
    deviceEnemy.obj.position.copy(g.hero.position).add(new T.Vector3(2,0,0));
    g.garden.hit(deviceEnemy,17,'thorn',g.hero.position);

    g.state.inv=0;g.hurt(12,'enemy-projectile');
    g.levelUp();
    return {weaponDead:weaponEnemy.dead,deviceDead:deviceEnemy.dead,hp:g.state.hp};
  });
  assert.equal(outcomes.weaponDead,true);
  assert.equal(outcomes.deviceDead,true);
  assert.equal(outcomes.hp,88);

  await page.locator('[data-choice]').first().click();
  await page.evaluate(()=>{
    const g=window.__game;
    g.garden.combos.add('pollen');g.state.dash=0;g.dash();
    g.state.time=10;const boss=g.spawnEnemy('boss');g.state.time=15;g.damageEnemy(boss,9999,{model:'boss-finisher',weaponLabel:'Boss 测试'});g.state.time=18;g.finish(false);
  });

  const report=await page.evaluate(()=>window.__game.runReport);
  const weapon=report.weapons.find(item=>item.id==='crossbow_2handed');
  const device=report.devices.find(item=>item.id==='thorn');
  assert.equal(weapon.damage,10,'overkill must only record actual HP removed');
  assert.equal(weapon.kills,1);
  assert.equal(device.damage,5);
  assert.equal(device.kills,1);
  assert.equal(report.damageTaken['enemy-projectile'],12);
  assert.equal(report.upgrades.length,1);
  assert.equal(report.combos.pollen,1);
  assert.equal(report.boss.label,'骸骨巨像');
  assert.equal(report.boss.duration,5);

  assert.equal(await page.locator('.run-report-details').count(),1);
  assert.equal(await page.locator('#copy-run-report').isVisible(),true);
  assert.equal(await page.locator('#download-run-report').isVisible(),true);
  await page.locator('.run-report-details summary').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);

  await page.click('#copy-run-report');
  const copied=await page.evaluate(()=>navigator.clipboard.readText());
  assert.deepEqual(JSON.parse(copied),report);

  const downloadPromise=page.waitForEvent('download');
  await page.click('#download-run-report');
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/^run-report-ruins-\d+\.json$/);
  const path=await download.path();
  assert.deepEqual(JSON.parse(await readFile(path,'utf8')),report);
  assert.deepEqual(errors,[]);
  console.log('PASS: telemetry aggregates real outcomes and exports the mobile run report in Google Chrome');
}finally{
  await browser.close();
}
