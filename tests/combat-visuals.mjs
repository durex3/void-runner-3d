import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
try{
const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:'test-results/motion',size:{width:1280,height:800}}});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5188/?test=1');await page.waitForFunction(()=>window.__game&&document.body.dataset.nature==='loaded');await page.click('#start');
await page.evaluate(()=>{__game.state.remaining=1;__game.state.spawn=999});
await page.keyboard.down('d');await page.waitForFunction(()=>__game.hero.position.x>1);
const pose=await page.evaluate(()=>({leg:__game.hero.userData.rig.legs[0].quaternion.toArray(),x:__game.hero.position.x}));
await page.waitForTimeout(250);const next=await page.evaluate(()=>({leg:__game.hero.userData.rig.legs[0].quaternion.toArray(),x:__game.hero.position.x}));assert.notDeepEqual(pose.leg,next.leg);assert.ok(next.x>pose.x);await page.screenshot({path:'test-results/walking.png'});await page.keyboard.up('d');
// Ranged targeting respects acquisition distance; melee is intentionally unavailable.
assert.equal(await page.locator('[data-weapon]').count(),3);
const result=await page.evaluate(()=>{const g=__game;g.state.mode='paused';g.state.weapon=0;g.hero.position.set(0,0,0);g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.set(0,0,16);e.hp=1000;e.speed=0;g.attack();const far=g.bullets.length;e.obj.position.z=6;g.attack();return {far,near:g.bullets.length}});assert.deepEqual(result,{far:0,near:1});
await page.evaluate(()=>{for(const b of __game.bullets)b.obj.position.addScaledVector(b.v,.12)});await page.click('[data-weapon="0"]');await page.screenshot({path:'test-results/projectiles.png'});
assert.ok(await page.evaluate(()=>__game.bullets.length>0&&__game.bullets[0].obj.children.length===3));
await page.evaluate(()=>{__game.state.mode='playing';__game.state.inv=100});await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');
const video=page.video();await context.close();await video.saveAs('test-results/movement-and-weapons.webm');assert.deepEqual(errors,[]);await writeFile('test-results/combat-visuals.json',JSON.stringify({passed:true,checks:['walking joints change with movement','three ranged weapons, no player melee entry','ranged acquisition distance','outlined projectile and trail render','no browser exception']},null,2));console.log('PASS: movement animation, ranged targeting and visible projectile rendering');
}finally{await browser.close()}
