import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

await mkdir('test-results/beam-directions',{recursive:true});
const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(testUrl('/?test=1'));
  await page.waitForFunction(()=>window.__game&&document.body.dataset.effects==='loaded');
  await page.click('[data-character="Druid"]');await page.click('#start');
  for(let direction=0;direction<8;direction++){
    const result=await page.evaluate(async direction=>{
      const T=await import('/node_modules/three/build/three.module.js');
      const {beam,preloadProjectileAssets,setProjectileCamera}=await import('/src/projectiles.js');
      const g=window.__game;g.state.mode='paused';g.combat.reset();g.effects.clear();g.equip(1);
      if(direction===0)await preloadProjectileAssets();
      setProjectileCamera(g.camera);
      const start=g.hero.position.clone().setY(1.2);
      const angle=direction*Math.PI/4;
      const end=start.clone().add(new T.Vector3(Math.sin(angle)*7,direction%2*.5,Math.cos(angle)*7));
      const effect=beam(start,end);g.scene.add(effect);effect.updateMatrixWorld(true);
      const plane=effect.children[0];
      const distances=[new T.Vector3(0,-.5,0).applyMatrix4(plane.matrixWorld).distanceTo(start),new T.Vector3(0,.5,0).applyMatrix4(plane.matrixWorld).distanceTo(end)];
      g.renderer.render(g.scene,g.camera);
      window.__directionBeam=effect;
      return distances;
    },direction);
    assert.ok(result.every(distance=>distance<1e-6),`direction ${direction}: endpoints ${result}`);
    await page.screenshot({path:`test-results/beam-directions/${direction}.png`});
    await page.evaluate(()=>{const beam=window.__directionBeam;beam.removeFromParent();beam.userData.dispose();});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: lightning endpoints anchored in eight directions, including elevation; screenshots saved');
}finally{await browser.close();}
