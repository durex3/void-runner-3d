import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';

const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
await page.goto(testUrl('/?test=mobile-joystick'));
await page.waitForFunction(()=>window.__game&&document.body.dataset.nature==='loaded');
assert.equal(await page.locator('#touch-stick').isVisible(),true);
assert.equal(await page.locator('#touchdash').isVisible(),true);
await page.click('#start');
await page.waitForFunction(()=>window.__game.state.mode==='playing');
const geometry=await page.evaluate(()=>{
  const base=document.querySelector('#touch-stick-base');
  const rect=base.getBoundingClientRect();
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,radius:rect.width/2};
});
const before=await page.evaluate(()=>window.__game.hero.position.toArray());
await page.evaluate(({x,y,radius})=>{
  const base=document.querySelector('#touch-stick-base');
  base.setPointerCapture=()=>{};
  base.onpointerdown({pointerId:7,clientX:x+radius*.25,clientY:y,preventDefault(){}});
},geometry);
await page.evaluate(()=>window.__game.tick(.25));
const held=await page.evaluate(()=>({move:window.__game.input.getMoveVector(),position:window.__game.hero.position.toArray()}));
assert.ok(held.move.x>0.3&&held.move.x<0.7);
assert.notDeepEqual(held.position,before);
await page.evaluate(()=>document.querySelector('#touch-stick-base').onpointerup({pointerId:7}));
await page.waitForTimeout(120);
assert.deepEqual(await page.evaluate(()=>window.__game.input.getMoveVector()),{x:0,y:0});
assert.equal(await page.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
assert.deepEqual(errors,[]);
await page.screenshot({path:'test-results/mobile-joystick.png'});
console.log('PASS: Chrome mobile joystick movement, analog strength, release reset, safe width');
await browser.close();
