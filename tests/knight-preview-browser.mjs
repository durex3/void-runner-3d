import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await launchBrowser({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(testUrl('/knight-preview.html?test=1'));await page.waitForFunction(()=>window.__game?.knightPreview);
 await page.evaluate(()=>__game.setManual(true));
 const stored=await page.evaluate(()=>JSON.stringify(localStorage));
 await mkdir('test-results/knight-preview',{recursive:true});
 await page.click('[data-preview="0"]');
 const ready=await page.evaluate(()=>{
   const g=__game;g.effects.update(.1,0,'playing');g.render();
   let glowing=0;g.hero.userData.rig.model.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.emissiveIntensity>.5)glowing++});
   return {glowing,caption:g.effects.effects.find(e=>e.obj.userData.knightVfx==='counter-ready').obj.children.some(o=>o.isSprite)};
 });
 assert.ok(ready.glowing>0&&ready.caption);
 await page.screenshot({path:'test-results/knight-preview/counter-ready.png'});
 const cleanup=await page.evaluate(()=>{
   const g=__game,meshes=[];g.hero.userData.rig.model.traverse(o=>{if(o.isMesh)meshes.push(o)});
   const glowing=meshes.map(o=>o.material);
   g.state.shieldCounterUntil=0;g.effects.update(.01,0,'playing');
   const hidden=!g.effects.effects.find(e=>e.obj.userData.knightVfx==='counter-ready').obj.visible;
   g.effects.clear();return {hidden,restored:meshes.every((o,i)=>o.material!==glowing[i])};
 });
 assert.deepEqual(cleanup,{hidden:true,restored:true});
 for(const [slot,kind,damage] of [[0,'shieldCounter',57],[1,'heavySweep',252],[2,'macePursuit',122.2]]){
   await page.click(`[data-preview="${slot}"]`);
   const result=await page.evaluate(kind=>{
     const g=__game;let found=false;
     for(let i=0;i<160;i++){
       g.tick(.01);g.effects.update(.01,g.state.time,'playing');
       if(g.effects.effects.some(e=>e.obj.userData.knightVfx===kind)){found=true;break}
     }
     g.render();return {found,label:g.effects.effects.some(e=>e.obj.userData.knightVfx==='upgrade-label'),damage:g.enemies.reduce((sum,e)=>sum+e.maxHp-e.hp,0)};
   },kind);
   assert.ok(result.found,kind);assert.ok(Math.abs(result.damage-damage)<.01,JSON.stringify(result));
   assert.ok(result.label);
   await page.screenshot({path:`test-results/knight-preview/${kind}.png`});
   await page.evaluate(()=>{const g=__game;g.camera.position.set(20,27,24);g.camera.lookAt(0,0,0);g.renderer.render(g.scene,g.camera)});
   await page.screenshot({path:`test-results/knight-preview/${kind}-normal.png`});
   if(slot>0){
     const pixels=await page.evaluate(()=>{
       const g=__game;g.effects.update(.05,g.state.time,'playing');
       for(const e of g.effects.effects)if(e.obj.userData.knightVfx==='upgrade-label')e.obj.visible=false;
       const marks=[];g.scene.traverse(o=>{if(o.userData.upgradeMark)marks.push(o)});
       const gl=g.renderer.getContext(),read=()=>{g.renderer.render(g.scene,g.camera);const a=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,a);return a};
       const before=read();marks.forEach(m=>m.visible=false);const after=read();marks.forEach(m=>m.visible=true);read();
       let count=0;for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>60)count++;
       return count;
     });
     assert.ok(pixels>35,`${kind}: visible mark pixels without text ${pixels}`);
     await page.screenshot({path:`test-results/knight-preview/${kind}-no-text.png`});
   }
 }
 await page.click('[data-preview="1"]');
 const recovery=await page.evaluate(()=>{
   const g=__game;let started=false;
   for(let i=0;i<300;i++){
     g.tick(.01);const r=g.hero.userData.rig;
     if(r.attackAction)started=true;
     if(started&&!r.attackAction){
       g.hero.updateWorldMatrix(true,true);
       const before=r.held.matrixWorld.clone();r.mixer.update(0);g.hero.updateWorldMatrix(true,true);
       return {found:true,error:Math.max(...before.elements.map((v,j)=>Math.abs(v-r.held.matrixWorld.elements[j])))};
     }
   }
   return {found:false};
 });
 assert.ok(recovery.found&&recovery.error<1e-6,`recovery pose must be applied before render: ${JSON.stringify(recovery)}`);
 await page.click('#preview-pause');const time=await page.evaluate(()=>__game.state.time);
 await page.evaluate(()=>__game.tick(1));assert.equal(await page.evaluate(()=>__game.state.time),time);
 await page.click('#resume');await page.check('#preview-loop');await page.evaluate(()=>{for(let i=0;i<400;i++)__game.tick(.01)});
 assert.ok(await page.evaluate(()=>__game.state.time<3.5));
 await page.setViewportSize({width:390,height:844});
 await page.click('[data-preview="1"]');await page.evaluate(()=>__game.render());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'test-results/knight-preview/mobile.png'});
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),stored);assert.deepEqual(errors,[]);
 console.log('PASS: three real upgrade triggers, expected damage, pause, loop, save isolation and mobile');
}finally{await browser.close()}
