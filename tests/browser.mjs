import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto('http://127.0.0.1:5188/?test=1');
await page.waitForFunction(()=>window.__game);
await page.waitForFunction(()=>document.body.dataset.nature==='loaded');
await page.screenshot({path:'test-results/title.png'});
await page.click('#start');
await page.keyboard.down('d');await page.waitForFunction(()=>window.__game.hero.position.x>1);await page.keyboard.up('d');
assert.ok(await page.evaluate(()=>window.__game.hero.position.x>1));
await page.keyboard.press('Space');assert.ok(await page.evaluate(()=>window.__game.state.dash>0));
await page.keyboard.press('Escape');const before=await page.evaluate(()=>window.__game.state.time);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>window.__game.state.time),before);await page.click('#resume');
for(let w=0;w<3;w++){await page.click(`[data-weapon="${w}"]`);assert.equal(await page.evaluate(()=>window.__game.state.loadout),w);await page.evaluate(()=>{const g=window.__game;g.state.inv=100;g.state.shot=0;g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.copy(g.hero.position).add({x:0,y:0,z:3});e.hp=10;e.speed=0});await page.waitForTimeout(1000)}
assert.ok(await page.evaluate(()=>window.__game.state.kills>=3));
await page.evaluate(()=>window.__game.levelUp());assert.equal(await page.locator('.card').count(),3);await page.locator('.card').first().click();assert.equal(await page.evaluate(()=>window.__game.state.mode),'playing');
await page.evaluate(()=>{window.__game.state.inv=0;window.__game.hero.visible=true});
// Trigger both companion choices through the real elite surrender UI.
for(const type of ['brute','runner']){await page.evaluate(type=>{const g=window.__game;g.state.inv=100;g.spawnEnemy(type,true);g.damageEnemy(g.enemies.at(-1),10000);g.tick(.016)},type);await page.click('#recruit')}
assert.equal(await page.evaluate(()=>window.__game.garden.buddies.length),2);
await page.evaluate(()=>{const g=window.__game;g.spawnEnemy('brute',true);g.damageEnemy(g.enemies.at(-1),10000);g.tick(.016)});await page.click('#harvest');await page.locator('.card').first().click();
await page.click('#guide');assert.equal(await page.locator('.guide-combos>div').count(),6);await page.click('#resume');
await page.evaluate(()=>{const g=window.__game;for(let i=0;i<3;i++){const pos=g.hero.position.clone();pos.x+=i*2-2;pos.z-=3;g.garden.plant(i,pos)}g.state.inv=0;g.hero.visible=true});
await page.screenshot({path:'test-results/gameplay.png'});
await page.evaluate(()=>{const g=window.__game;g.state.inv=0;g.hurt(10000)});assert.equal(await page.evaluate(()=>window.__game.state.mode),'lost');await page.click('#restart');assert.equal(await page.evaluate(()=>window.__game.state.hp),100);
// Accelerate combat through all waves, retaining the actual wave transition code.
for(let i=0;i<24;i++){if(await page.evaluate(()=>window.__game.state.mode)==='won')break;await page.evaluate(()=>{const g=window.__game;g.state.inv=100;g.state.remaining=0;g.enemies.forEach(e=>g.damageEnemy(e,100000));g.tick(.016)});const mode=await page.evaluate(()=>window.__game.state.mode);if(mode==='upgrade')await page.locator('.card').first().click();if(mode==='capture')await page.click('#recruit')}
assert.equal(await page.evaluate(()=>window.__game.state.mode),'won');
await page.screenshot({path:'test-results/victory.png'});
await page.click('#restart');await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:'test-results/mobile.png'});
assert.equal(await page.evaluate(()=>window.__game.garden.plants.length+window.__game.garden.buddies.length+window.__game.garden.combos.size),0);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.ok(await page.locator('#hud').evaluate(el=>el.getBoundingClientRect().height<180));
assert.deepEqual(errors,[]);
await writeFile('test-results/report.json',JSON.stringify({passed:true,checks:['WebGL render','movement','dash','pause','3 weapons kill enemies','random upgrades','death and restart','8 waves and victory','mobile layout'],errors},null,2));
console.log('PASS: browser gameplay, progression, restart, mobile layout; no browser errors');await browser.close();
