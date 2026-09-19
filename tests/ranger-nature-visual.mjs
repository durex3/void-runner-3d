import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results/ranger-nature',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  for(const [role,slot,mobile] of [['Ranger',0,false],['Ranger',1,false],['Ranger',2,false],['Druid',0,false],['Ranger',1,true],['Druid',0,true]]){
    await page.setViewportSize(mobile?{width:390,height:844}:{width:1280,height:800});
    const label=`${role}-${slot}${mobile?'-mobile':''}`;
    await page.goto('http://127.0.0.1:5188/?test=1');
    await page.waitForFunction(()=>window.__game&&document.body.dataset.effects==='loaded'&&document.body.dataset.nature==='loaded');
    await page.click(`[data-character="${role}"]`);await page.click('#start');
    await page.evaluate(slot=>{
      const g=__game;g.state.mode='paused';g.state.spawn=999;g.state.inv=999;g.combat.reset();g.effects.clear();g.equip(slot);g.hero.position.set(0,0,0);
      for(const e of g.enemies.splice(0))g.scene.remove(e.obj);
      g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.set(7,0,5);e.hp=10000;e.speed=0;
      g.attack();g.combat.step(.12);g.effects.update(.12,0,'playing');g.renderer.render(g.scene,g.camera);
    },slot);
    const visible=await page.evaluate(()=>({arrows:__game.combat.bullets.length,leaves:__game.effects.effects.filter(e=>e.obj.userData.remoteVfx==='nature-flight').length}));
    assert.ok(role==='Ranger'?visible.arrows>0:visible.leaves===4);
    const pixels=await page.evaluate(()=>{
      const g=__game,gl=g.renderer.getContext();
      const objects=[...g.combat.bullets.map(b=>b.obj),...g.effects.effects.filter(e=>['nature-flight','nature-seed'].includes(e.obj.userData.remoteVfx)).map(e=>e.obj)];
      const read=()=>{const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
      g.renderer.render(g.scene,g.camera);const before=read();objects.forEach(o=>o.visible=false);g.renderer.render(g.scene,g.camera);const after=read();objects.forEach(o=>o.visible=true);g.renderer.render(g.scene,g.camera);
      let changed=0;for(let i=0;i<before.length;i+=4)if(Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>30)changed++;
      return changed;
    });
    assert.ok(pixels>10,`${label}: flight should remain readable (${pixels} pixels)`);
    await page.screenshot({path:`test-results/ranger-nature/${label}-flight.png`});
    await page.evaluate(()=>{const g=__game;for(let i=0;i<12;i++){g.combat.step(.016);g.effects.update(.016,0,'playing');}g.renderer.render(g.scene,g.camera);});
    await page.screenshot({path:`test-results/ranger-nature/${label}-impact.png`});
    if(role==='Druid')assert.equal(await page.evaluate(()=>__game.effects.effects.filter(e=>e.obj.userData.remoteVfx==='nature-bloom').length),7);
    if(role==='Druid')assert.ok(await page.evaluate(()=>__game.effects.effects.find(e=>e.obj.userData.remoteVfx==='nature-ring')?.obj.children.every(root=>root.geometry.drawRange.count>0)),'roots unfold after impact');
    if(role==='Ranger'&&slot===1)assert.ok(await page.evaluate(()=>__game.effects.effects.some(e=>e.obj.userData.remoteVfx==='bow-splinters')),'piercing arrow triggers contact fragments');
    await page.evaluate(()=>{__game.combat.reset();__game.effects.update(2,0,'playing');});
    assert.equal(await page.evaluate(()=>__game.effects.effects.length),0);
  }
  assert.deepEqual(errors,[]);console.log('PASS: three ranger flight silhouettes, nature travel/bloom, cleanup, no browser errors');
}finally{await browser.close();}
