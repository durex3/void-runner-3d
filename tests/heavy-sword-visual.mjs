import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results/heavy-sword',{recursive:true});
const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(testUrl('/?test=1'));await page.waitForFunction(()=>window.__game&&document.body.dataset.effects==='loaded');
 await page.click('[data-character="Knight"]');await page.click('#start');
 for(let direction=0;direction<16;direction++){
  if(direction===8)await page.setViewportSize({width:390,height:844});
  await page.evaluate(direction=>{const g=__game;g.state.mode='paused';g.combat.reset();g.effects.clear();g.equip(1);g.hero.position.set(0,0,0);g.heroHitStop=0;
   for(const e of g.enemies.splice(0))g.scene.remove(e.obj);
   g.spawnEnemy('brute');const e=g.enemies.at(-1),angle=direction*Math.PI/4;e.obj.position.set(Math.sin(angle)*2.2,0,Math.cos(angle)*2.2);e.hp=10000;e.speed=0;g.attack();
  },direction);
  let visible=0,peakPixels=0;
  for(let frame=0;frame<70;frame++){
   const result=await page.evaluate(()=>{const g=__game;g.actors.animateActor(g.hero,g.heroHitStop>0?0:.01,0,0);g.heroHitStop=Math.max(0,g.heroHitStop-.01);g.combat.step(.01);g.effects.update(.01,0,'playing');
    const trail=g.effects.effects.find(e=>e.obj.userData.bladeTrail)?.obj,phase=g.hero.userData.rig.attackAction.time/g.hero.userData.rig.attackAction.getClip().duration;
    g.renderer.render(g.scene,g.camera);let pixels=0;
    if(trail?.visible){const gl=g.renderer.getContext(),read=()=>{const a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};const a=read();trail.visible=false;g.renderer.render(g.scene,g.camera);const b=read();trail.visible=true;g.renderer.render(g.scene,g.camera);for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>45)pixels++;}
    return {visible:!!trail?.visible,phase,pixels,damage:10000-g.enemies[0].hp};
   });
   if(frame<28)assert.equal(result.visible,false,'no head ornament during windup');
   if(result.visible){visible++;assert.ok(result.phase>=.4&&result.phase<=.76,'140 ms afterimage remains only around the chop');peakPixels=Math.max(peakPixels,result.pixels);}
   if([20,35,39,48,62].includes(frame))await page.screenshot({path:`test-results/heavy-sword/${direction}-frame-${frame}.png`});
   if(frame===39)assert.ok(result.damage>0&&Math.abs(result.phase-.52)<.03,'impact aligned with chop');
  }
  assert.ok(visible>0&&peakPixels>100,JSON.stringify({direction,visible,peakPixels}));
  assert.equal(await page.evaluate(()=>__game.effects.effects.filter(e=>e.obj.userData.bladeTrail&&e.obj.visible).length),0,'trail fades after recovery');
  await page.evaluate(()=>{const g=__game;g.combat.reset();g.equip(1);g.attack();for(let i=0;i<35;i++){g.actors.animateActor(g.hero,.01,0,0);g.effects.update(.01,0,'playing');}});
  assert.ok(await page.evaluate(()=>__game.effects.effects.some(e=>e.obj.userData.bladeTrail&&e.obj.visible)),'switch test begins during a visible swing');
  await page.evaluate(()=>{const g=__game;g.equip(0);g.effects.update(.016,0,'playing');});
  assert.equal(await page.evaluate(()=>__game.effects.effects.filter(e=>e.obj.userData.bladeTrail&&e.obj.visible).length),0);
  console.log({direction,visible,peakPixels});
 }
 assert.deepEqual(errors,[]);console.log('PASS: windup hidden, real swing window, impact timing, rendered trail pixels, switch cleanup');
}finally{await browser.close();}
