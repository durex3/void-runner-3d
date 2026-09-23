import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
const browser=await launchBrowser({headless:true});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(testUrl('/?test=1'));await page.waitForFunction(()=>window.__game);
 await page.evaluate(()=>__game.setManual(true));await page.click('[data-character="Knight"]');await page.click('#start');
 for(const [slot,id,name] of [[0,'shieldCounter','守卫反击'],[1,'heavySweep','破阵重斩'],[2,'macePursuit','震击追猎']]){
   await page.evaluate(slot=>{__game.equip(slot);__game.levelUp()},slot);
   assert.match(await page.locator('[data-choice="0"]').textContent(),new RegExp(name));
   await page.click('[data-choice="0"]');
   assert.equal(await page.evaluate(id=>__game.state[id],id),true);
   assert.match(await page.locator('#stat-mechanics').textContent(),new RegExp(name));
 }
 await page.evaluate(()=>{const g=__game;g.equip(0);g.state.inv=0;g.hurt(10,'enemy-contact')});
 assert.ok(await page.evaluate(()=>__game.state.shieldCounterUntil>__game.state.time));
 await page.evaluate(()=>__game.finish(true));
 assert.deepEqual(await page.evaluate(()=>__game.runReport.upgrades.map(u=>u.id)),['shieldCounter','heavySweep','macePursuit']);
 await page.click('#restart');
 assert.equal(await page.evaluate(()=>__game.state.shieldCounter||__game.state.heavySweep||__game.state.macePursuit),false);
 assert.deepEqual(errors,[]);console.log('PASS: knight upgrade cards, selection, stats, damage hook, report and restart');
}finally{await browser.close()}
