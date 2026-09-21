import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:5188/?test=1');
  await page.waitForFunction(()=>window.__game, {timeout:60000});
  await page.evaluate(()=>window.__game.setManual(true));
  await page.check('[name="chapter"][value="furnace"]');
  await page.click('#start');
  assert.equal(await page.evaluate(()=>window.__game.state.chapter),'furnace');
  const pixels=await page.evaluate(()=>{
    const g=window.__game,T=g.THREE,target=new T.WebGLRenderTarget(256,256),data=new Uint8Array(256*256*4);
    g.camera.position.set(25,29,31);g.camera.lookAt(0,0,0);g.renderer.setRenderTarget(target);g.renderer.render(g.scene,g.camera);
    g.renderer.readRenderTargetPixels(target,0,0,256,256,data);g.renderer.setRenderTarget(null);target.dispose();g.render();
    const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);return colors.size;
  });
  assert.ok(pixels>35,`nonblank canvas colors: ${pixels}`);
  await page.screenshot({path:'test-results/furnace-desktop.png'});
  const fire=await page.evaluate(()=>{
    const g=window.__game;g.state.remaining=999;g.state.spawn=999;g.state.shot=999;
    g.hero.position.set(0,0,-10);g.furnaceCycle.ignite(1);
    g.tick(.1);const warningHp=g.state.hp;
    g.pause();const left=g.furnaceCycle.left;g.tick(2);const frozen=left===g.furnaceCycle.left;g.pause();
    for(let i=0;i<24;i++)g.tick(.1);const burnHp=g.state.hp;
    g.state.inv=1;g.tick(.1);const protectedHp=g.state.hp;
    g.hero.position.set(0,0,0);g.state.inv=0;g.tick(.1);const safeHp=g.state.hp;
    return {warningHp,burnHp,protectedHp,safeHp,frozen};
  });
  assert.equal(fire.warningHp,100);assert.equal(fire.burnHp,90);assert.equal(fire.protectedHp,90);assert.equal(fire.safeHp,90);assert.equal(fire.frozen,true);
  const modalFreeze=await page.evaluate(()=>{
    const g=window.__game,result=[];
    for(const mode of ['upgrade','capture']){g.state.mode=mode;const left=g.furnaceCycle.left;g.tick(5);result.push(left===g.furnaceCycle.left)}
    g.state.mode='playing';return result;
  });assert.deepEqual(modalFreeze,[true,true]);
  const dashSafe=await page.evaluate(()=>{
    const g=window.__game;g.hero.position.set(0,0,-10);g.furnaceCycle.reset();g.furnaceCycle.ignite(1);g.furnaceCycle.step(2.4,1);
    g.state.dash=0;g.state.inv=0;g.dash();g.hero.position.set(0,0,-10);const hp=g.state.hp;g.tick(.1);return g.state.hp===hp;
  });assert.equal(dashSafe,true);
  const boss=await page.evaluate(()=>{
    const g=window.__game;g.start();g.state.wave=8;g.beginWave();g.state.remaining=999;g.state.spawn=999;g.state.shot=999;
    const e=g.enemies.find(e=>e.customBoss);e.obj.position.set(0,0,-3);g.hero.position.set(0,0,1);
    g.furnaceCombat.begin(e,'slash');g.render();
    let textured=0;e.obj.traverse(o=>{if(o.isMesh&&o.material.map)textured++});
    return {rig:e.obj.userData.rig.name,textured,phase:e.furnaceAction.phase,hp:e.maxHp};
  });
  assert.equal(boss.rig,'BlackKnight');assert.ok(boss.textured>0);assert.equal(boss.phase,'warning');
  assert.equal(boss.hp,2000);
  assert.ok(await page.evaluate(()=>{
    const g=window.__game,e=g.enemies.find(e=>e.customBoss),position=e.obj.position.clone();
    e.push=new g.THREE.Vector3(3,0,0);g.combat.step(.04);return e.obj.position.equals(position);
  }));
  await page.screenshot({path:'test-results/furnace-boss-warning.png'});
  const recovery=await page.evaluate(()=>{
    const g=window.__game,e=g.enemies.find(e=>e.customBoss);g.hero.position.set(0,0,-7);
    const hp=g.state.hp;for(let i=0;i<41;i++)g.tick(.04);
    const phase=e.furnaceAction.phase,left=e.recovery;
    g.hero.position.copy(e.obj.position);for(let i=0;i<20;i++)g.tick(.04);
    return {phase,left,hpAfter:g.state.hp,hp,stomps:g.garden.effects.filter(f=>f.stomp).length,fire:g.furnaceCycle.phase};
  });
  assert.equal(recovery.phase,'recovery');assert.ok(recovery.left>1.6&&recovery.left<=1.8);assert.equal(recovery.hpAfter,recovery.hp);assert.equal(recovery.stomps,0);assert.equal(recovery.fire,'cool');
  const charge=await page.evaluate(()=>{
    const g=window.__game,e=g.enemies.find(e=>e.customBoss);g.furnaceCombat.cancel(e);e.obj.position.set(-6,0,-6);g.hero.position.set(6,0,6);
    g.furnaceCombat.begin(e,'charge');const dir=e.furnaceAction.direction.clone();g.hero.position.set(-9,0,8);
    const bone=e.obj.userData.rig.chest,before=bone.quaternion.clone();
    for(let i=0;i<34;i++)g.tick(.04);
    const animated=bone.quaternion.angleTo(before)>.001;
    for(let i=0;i<16;i++)g.tick(.04);
    const expected=new g.THREE.Vector3(-6,0,-6).addScaledVector(dir,12);
    return {error:e.obj.position.distanceTo(expected),phase:e.furnaceAction.phase,animated};
  });assert.ok(charge.error<.01);assert.equal(charge.phase,'recovery');assert.equal(charge.animated,true);
  const forge=await page.evaluate(()=>{
    const g=window.__game,e=g.enemies.find(e=>e.customBoss);
    e.obj.position.set(0,0,-4);g.hero.position.set(0,0,3);e.hitStop=0;e.slow=0;
    g.furnaceCombat.begin(e,'forge');const origin=e.obj.position.clone(),hp=g.state.hp;
    for(let i=0;i<8;i++)g.tick(.1);
    const stationary=e.obj.position.equals(origin),warning=g.furnaceCycle.phase;
    for(let i=0;i<7;i++)g.tick(.1);
    const approach=e.obj.position.distanceTo(origin),ringHidden=!e.furnaceAction.warning.visible;
    g.pause();const paused=e.obj.position.clone(),left=g.furnaceCycle.left;g.tick(1);g.pause();
    const frozen=e.obj.position.equals(paused)&&left===g.furnaceCycle.left;
    e.slow=2;const before=e.obj.position.clone();g.tick(.1);
    const slowed=e.obj.position.distanceTo(before);
    g.hero.position.copy(e.obj.position).add(new g.THREE.Vector3(0,0,2.51));
    for(let i=0;i<15;i++)g.tick(.1);
    const stoppedDistance=e.obj.position.distanceTo(g.hero.position),burn=g.furnaceCycle.phase;
    let exclusive=true;
    while(g.furnaceCycle.phase!=='cool'){
      exclusive&&=e.furnaceAction.kind==='forge'&&e.furnaceAction.phase==='forge';g.tick(.1);
    }
    g.tick(.01);const recovery=e.recovery,phase=e.furnaceAction.phase,rest=e.obj.position.clone();
    for(let i=0;i<20;i++)g.tick(.1);
    return {stationary,warning,approach,ringHidden,frozen,slowed,stoppedDistance,burn,exclusive,recovery,phase,
      safe:g.state.hp===hp,resting:e.obj.position.equals(rest)&&e.furnaceAction.phase==='recovery'};
  });
  assert.equal(forge.stationary,true);assert.equal(forge.warning,'warning');
  assert.ok(Math.abs(forge.approach-.72)<.001);assert.equal(forge.ringHidden,true);assert.equal(forge.frozen,true);
  assert.ok(Math.abs(forge.slowed-.066)<.001);assert.ok(Math.abs(forge.stoppedDistance-2.5)<.001);
  assert.equal(forge.burn,'burn');assert.equal(forge.exclusive,true);assert.equal(forge.recovery,2.4);
  assert.equal(forge.phase,'recovery');assert.equal(forge.safe,true);assert.equal(forge.resting,true);
  const phase2=await page.evaluate(()=>{
    const g=window.__game,e=g.enemies.find(e=>e.customBoss);g.furnaceCombat.cancel(e);e.hp=e.maxHp*.49;g.furnaceCombat.begin(e,'forge');
    const active=g.furnaceCycle.active.length;for(let i=0;i<15;i++)g.tick(.1);g.render();return active;
  });assert.equal(phase2,2);
  await page.screenshot({path:'test-results/furnace-phase2.png'});
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>window.__game.camera.aspect===innerWidth/innerHeight);
  await page.evaluate(()=>window.__game.render());
  assert.ok(await page.evaluate(()=>{
    const g=window.__game,T=g.THREE,target=new T.WebGLRenderTarget(128,256),data=new Uint8Array(128*256*4);
    g.renderer.setRenderTarget(target);g.renderer.render(g.scene,g.camera);g.renderer.readRenderTargetPixels(target,0,0,128,256,data);
    g.renderer.setRenderTarget(null);target.dispose();g.render();const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);return colors.size;
  })>35);
  await page.screenshot({path:'test-results/furnace-mobile.png'});
  assert.ok(await page.evaluate(()=>{
    const g=window.__game,original=g.hero.position.clone();let visible=true;
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;g.hero.position.set(Math.sin(angle)*20,0,Math.cos(angle)*20);g.render();
      const p=g.hero.position.clone().setY(1).project(g.camera);visible&&=Math.abs(p.x)<.8&&Math.abs(p.y)<.6;
    }
    g.hero.position.copy(original);g.render();return visible;
  }),'hero stays framed at all eight mobile arena edges');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const maceControl=await page.evaluate(()=>{
    const g=window.__game,e=g.enemies.find(e=>e.customBoss),profile=g.actors.HEROES.Knight.weapons[2];
    g.furnaceCombat.cancel(e);e.obj.position.set(0,0,0);g.hero.position.set(0,0,10);
    e.hp=e.maxHp=100000;g.state.inv=100;g.state.shot=999;g.state.remaining=999;g.state.spawn=999;
    const strike=()=>{
      g.hero.position.copy(e.obj.position).add(new g.THREE.Vector3(0,0,2));
      g.combat.melee({profile,damage:profile.damage,dir:new g.THREE.Vector3(0,0,-1)});
    };
    e.attack=99;e.slow=0;e.hitStop=0;strike();
    for(let i=0;i<20;i++)g.tick(.01);
    const cleared=e.stagger===0&&!e.statusVfx.stagger.visible;
    e.obj.position.set(0,0,0);g.hero.position.set(0,0,10);g.furnaceCombat.begin(e,'charge');
    // Stress with a hit every frame, above real attack speed: action clock must still finish.
    let hidden=true;
    for(let i=0;i<190;i++){strike();g.tick(.01);hidden&&=!e.statusVfx.stagger.visible}
    const distance=e.obj.position.z,phase=e.furnaceAction.phase;
    for(let i=0;i<245;i++){strike();g.tick(.01)}
    const recovered=e.furnaceAction?.phase!=='recovery';
    g.hero.position.copy(e.obj.position).add(new g.THREE.Vector3(0,0,2));
    g.furnaceCombat.begin(e,'slash');
    for(let i=0;i<160;i++){strike();g.tick(.01)}
    return {cleared,hidden,distance,phase,recovered,slash:e.furnaceAction.phase};
  });
  assert.equal(maceControl.cleared,true);assert.equal(maceControl.hidden,true);
  assert.ok(Math.abs(maceControl.distance-12)<.001);assert.equal(maceControl.phase,'recovery');
  assert.equal(maceControl.recovered,true);assert.equal(maceControl.slash,'recovery');
  const runs=[];
  for(const hero of ['Ranger','Druid','Engineer','Knight']){
    await page.evaluate(hero=>{const g=window.__game;g.returnToTitle();g.chooseHero(hero);g.chooseLevel('furnace');g.start()},hero);
    for(let i=0;i<32;i++){
      const mode=await page.evaluate(()=>{
        const g=window.__game;if(g.state.mode==='won')return 'won';
        g.state.inv=100;g.state.remaining=0;g.enemies.forEach(e=>g.damageEnemy(e,100000));g.tick(.016);return g.state.mode;
      });
      if(mode==='won')break;
      if(mode==='capture')await page.click('#recruit');
      if(mode==='upgrade')await page.locator('[data-choice]').first().click();
    }
    assert.equal(await page.evaluate(()=>window.__game.state.mode),'won');runs.push(hero);
    assert.equal(await page.evaluate(()=>window.__game.furnaceCombat.attacks.size),0);
    assert.match(await page.locator('#modal h2').textContent(),/熔炉/);
  }
  await page.evaluate(()=>{const g=window.__game;g.returnToTitle();g.chooseLevel('ruins');g.start();g.state.damage=4;g.finish(true)});
  await page.click('#next-level');
  assert.deepEqual(await page.evaluate(()=>{const g=window.__game;return [g.state.chapter,g.state.wave,g.state.damage,g.state.hp,g.furnaceCombat.attacks.size]}),['furnace',1,1,100,0]);
  await page.evaluate(()=>{const g=window.__game;g.spawnEnemy('boss');const e=g.enemies.at(-1);g.furnaceCombat.begin(e,'forge');g.hurt(10000)});
  assert.equal(await page.evaluate(()=>window.__game.state.mode),'lost');
  assert.equal(await page.evaluate(()=>window.__game.furnaceCombat.attacks.size),0);
  assert.equal(await page.evaluate(()=>window.__game.furnaceCycle.phase),'cool');
  await page.click('#restart');
  assert.equal(await page.evaluate(()=>window.__game.state.hp),100);
  await page.evaluate(()=>{const g=window.__game;g.returnToTitle();g.render()});
  await page.screenshot({path:'test-results/furnace-title-mobile.png'});
  assert.equal(await page.locator('#level-select').evaluate(e=>e.getBoundingClientRect().width<=innerWidth),true);
  assert.deepEqual(errors,[]);
  await writeFile('test-results/furnace-report.json',JSON.stringify({passed:true,pixels,runs,checks:['fire warning/damage/safe zone/invulnerability','pause freeze','textured animated boss','recovery safety','phase 2 paired vents','four-class accelerated progression (not balance playtest)','next-level reset','death/restart cleanup','desktop/mobile screenshots'],errors},null,2));
  console.log('PASS: furnace gameplay integration, four-class accelerated progression, desktop/mobile render');
}finally{await browser.close()}
