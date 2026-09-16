import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:5188/?test=1');await page.waitForFunction(()=>window.__game&&document.body.dataset.nature==='loaded');
 await page.click('[data-character="Engineer"]');await page.click('#start');await page.click('[data-weapon="1"]');
 const pending=await page.evaluate(()=>{const g=__game;g.state.mode='paused';g.state.inv=999;g.state.remaining=1;g.state.spawn=999;g.hero.position.set(0,0,0);g.spawnEnemy('brute');g.enemies.at(-1).obj.position.set(0,0,10);g.attack();return g.combat.pending.map(p=>p.delay)});
 assert.equal(pending.length,2);await page.waitForTimeout(250);assert.deepEqual(await page.evaluate(()=>__game.combat.pending.map(p=>p.delay)),pending);
 await page.keyboard.press('3');assert.equal(await page.evaluate(()=>__game.state.loadout),1);
 await page.keyboard.press('1');assert.equal(await page.evaluate(()=>__game.combat.pending.length),0);assert.equal(await page.evaluate(()=>__game.bullets.length),1);assert.equal(await page.evaluate(()=>__game.state.shot),.54);
 await page.evaluate(()=>__game.finish(false));await page.click('#change-hero');await page.click('[data-character="Druid"]');await page.click('#start');
 await page.evaluate(()=>{const g=__game;g.state.mode='paused';g.state.remaining=1;g.state.spawn=999;g.state.inv=999;g.hero.position.set(0,0,0);g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.set(0,0,5);e.speed=0;e.hp=1000;g.attack()});
 await page.keyboard.press('2');assert.equal(await page.evaluate(()=>__game.combat.pending.length),1);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>__game.enemies.at(-1).hp),1000);
 await page.evaluate(()=>{__game.state.mode='playing';__game.tick(.26);__game.state.mode='paused'});assert.equal(await page.evaluate(()=>__game.enemies.at(-1).hp),958);
 await page.evaluate(()=>__game.finish(false));await page.click('#restart');assert.equal(await page.evaluate(()=>__game.combat.pending.length+__game.bullets.length),0);
 await page.evaluate(()=>__game.finish(false));await page.click('#change-hero');await page.click('[data-character="Ranger"]');await page.click('#start');await page.evaluate(()=>{__game.state.mode='paused';__game.state.remaining=1;__game.state.spawn=999});await page.keyboard.down('d');
 const movement=await page.evaluate(()=>{const g=__game;return [0,2,2,0].map(slot=>{g.equip(slot);g.hero.position.set(0,0,0);g.state.mode='playing';g.tick(.1);g.state.mode='paused';return g.hero.position.length()})});await page.keyboard.up('d');
 assert.ok(Math.abs(movement[0]-.6)<1e-8);assert.ok(Math.abs(movement[1]-.672)<1e-8);assert.equal(movement[1],movement[2]);assert.equal(movement[0],movement[3]);
 assert.deepEqual(errors,[]);await writeFile('test-results/mechanics-browser.json',JSON.stringify({passed:true,pending,movement,errors},null,2));console.log('PASS: pause freezes attacks, switch cancels burst only, nature impact survives switching, restart cleanup, mobility bonus never stacks');
}finally{await browser.close()}
