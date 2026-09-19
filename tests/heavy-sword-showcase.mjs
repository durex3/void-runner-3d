import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

await mkdir('test-results/heavy-sword/showcase',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800},recordVideo:{dir:'test-results/heavy-sword/showcase',size:{width:1280,height:800}}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5188/?test=1');
  await page.waitForFunction(()=>window.__game&&document.body.dataset.effects==='loaded');
  await page.click('[data-character="Knight"]');await page.click('#start');
  await page.evaluate(()=>{
    const g=__game;g.state.mode='paused';g.combat.reset();g.effects.clear();g.equip(1);g.hero.position.set(0,0,0);g.heroHitStop=0;
    for(const enemy of g.enemies.splice(0))g.scene.remove(enemy.obj);
    g.spawnEnemy('brute');const enemy=g.enemies.at(-1);enemy.obj.position.set(2.1,0,0);enemy.hp=10000;enemy.speed=0;
    g.attack();g.combat.step(.401);g.renderer.render(g.scene,g.camera);
  });
  const impact=await page.evaluate(()=>{
    const g=__game,object=g.effects.effects.find(effect=>effect.obj.userData.meleeVfx==='heavy-impact').obj;
    const gl=g.renderer.getContext(),read=()=>{const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
    g.effects.update(.045,0,'playing');g.renderer.render(g.scene,g.camera);const before=read();object.visible=false;g.renderer.render(g.scene,g.camera);const after=read();object.visible=true;g.renderer.render(g.scene,g.camera);
    let changed=0;for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>30)changed++;
    return {changed,parts:object.children.length};
  });
  assert.ok(impact.changed>25,JSON.stringify(impact));assert.equal(impact.parts,16);
  await page.screenshot({path:'test-results/heavy-sword/showcase/contact.png'});
  await page.evaluate(()=>{__game.effects.update(.6,0,'playing');});
  assert.equal(await page.evaluate(()=>__game.effects.effects.some(e=>e.obj.userData.meleeVfx==='heavy-impact')),false);
  for(let direction=0;direction<4;direction++){
    await page.evaluate(direction=>{
      const g=__game;g.combat.reset();g.effects.clear();g.equip(1);g.heroHitStop=0;g.state.inv=999;g.state.spawn=999;g.state.shot=0;g.state.mode='playing';
      const enemy=g.enemies[0],angle=direction*Math.PI/2;enemy.obj.position.set(Math.sin(angle)*2.1,0,Math.cos(angle)*2.1);enemy.hp=10000;enemy.attack=999;delete enemy.push;
    },direction);
    await page.waitForTimeout(450);
    await page.screenshot({path:`test-results/heavy-sword/showcase/direction-${direction}.png`});
    await page.waitForTimeout(850);
  }
  await page.evaluate(()=>{__game.state.mode='paused';});
  assert.deepEqual(errors,[]);
  await page.close();await page.video().saveAs('test-results/heavy-sword/showcase/combat.webm');
  console.log('PASS: impact pixels, fragment cleanup, four-direction real-time combat recording',impact);
}finally{await browser.close();}
