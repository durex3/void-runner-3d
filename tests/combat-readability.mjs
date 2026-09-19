import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const root='test-results/combat-readability';
await mkdir(root,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={checks:[],scenes:[],observations:[],errors:[]};
try{
  for(const [name,viewport] of Object.entries({desktop:{width:1280,height:800},mobile:{width:390,height:844}})){
    const context=await browser.newContext({viewport,recordVideo:{dir:`${root}/videos`,size:viewport}});
    const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await page.goto('http://127.0.0.1:5188/?test=1&scenario=crowd&manual=1');
    await page.waitForFunction(()=>window.__game?.lab&&document.body.dataset.nature);
    const load=options=>page.evaluate(options=>__game.lab.load({manual:true,...options}),options);
    const step=frames=>page.evaluate(frames=>__game.lab.step(frames),frames);
    for(const hero of ['Knight','Ranger','Druid','Engineer']){
      await load({scenario:'mixed',hero});
      const state=await step(90);
      const pixels=await page.evaluate(()=>{
        const g=__game;g.lab.render();const gl=g.renderer.getContext();
        const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
        gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);
        const colors=new Set();for(let i=0;i<data.length;i+=64)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
        return colors.size;
      });
      assert.ok(pixels>100,'canvas has rendered scene detail');
      assert.ok(state.events.some(e=>e.type==='projectile-fired'));
      assert.ok(state.warnings>0,'mixed scene includes active stomp warning');
      await page.screenshot({path:`${root}/${name}-${hero}-mixed.png`});
      report.scenes.push({viewport:name,hero,pixels,...state});
    }
    await load({scenario:'mixed',hero:'Knight'});
    const repeat=await step(90);
    const first=report.scenes.find(s=>s.viewport===name&&s.hero==='Knight');
    assert.deepEqual(repeat.events,first.events,'seeded scene produces the same event timeline');
    for(const scenario of ['ranged','boss']){
      await load({scenario,hero:'Ranger'});await step(45);
      const cue=await page.evaluate(()=>{const e=__game.enemies[0];return {visible:e.statusVfx.charge.visible,attack:e.attack,direction:e.rangedWindup.direction.toArray(),snapshot:__game.lab.snapshot()};});
      assert.equal(cue.visible,true);assert.equal(cue.snapshot.hazards,0);
      const changedPixels=await page.evaluate(()=>{
        const g=__game,charge=g.enemies[0].statusVfx.charge,gl=g.renderer.getContext();
        const capture=()=>{g.lab.render();const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
        const visible=capture();charge.visible=false;const hidden=capture();charge.visible=true;g.lab.render();
        let changed=0;for(let i=0;i<visible.length;i+=4)if(Math.abs(visible[i]-hidden[i])+Math.abs(visible[i+1]-hidden[i+1])+Math.abs(visible[i+2]-hidden[i+2])>30)changed++;return changed;
      });
      assert.ok(changedPixels>30,'advance warning contributes visible canvas pixels');
      await page.screenshot({path:`${root}/${name}-${scenario}-charge.png`});
      await page.evaluate(()=>__game.lab.pause());await step(60);
      assert.equal(await page.evaluate(()=>__game.enemies[0].attack),cue.attack);
      await page.evaluate(()=>{__game.lab.pause();__game.hero.position.x=3;});
      await step(1);
      assert.deepEqual(await page.evaluate(()=>__game.enemies[0].rangedWindup.direction.toArray()),cue.direction);
      const fired=await step(20),warning=fired.events.find(e=>e.type==='projectile-warning'),shot=fired.events.find(e=>e.type==='projectile-fired');
      assert.ok(Math.abs(shot.time-warning.time-(scenario==='boss'?.6:.45))<.035);
      report.checks.push({viewport:name,test:`${scenario}-advance-warning`,...fired});
    }
    await load({scenario:'boss',hero:'Ranger'});
    const barrage=await step(65);
    assert.equal(barrage.events.find(e=>e.type==='projectile-fired').count,10);
    assert.equal(barrage.hazards,10);
    await page.screenshot({path:`${root}/${name}-boss-barrage.png`});
    report.checks.push({viewport:name,test:'boss-ten-projectiles',...barrage});
    await load({scenario:'ranged',hero:'Ranger'});
    const standing=await step(160);
    assert.ok(standing.hp<100,'stationary player is hit');
    report.checks.push({viewport:name,test:'ranged-standing',...standing});
    await load({scenario:'ranged',hero:'Ranger'});await step(30);
    await page.evaluate(()=>__game.damageEnemy(__game.enemies[0],100000));
    const cancelled=await step(90);
    assert.equal(cancelled.events.some(e=>e.type==='projectile-fired'),false,'dead enemy does not fire');
    await load({scenario:'ranged',hero:'Ranger'});await step(55);
    await page.evaluate(()=>{__game.enemies[0].stagger=1;});
    const staggered=await step(30);
    assert.equal(staggered.events.some(e=>e.type==='projectile-fired'),false,'stagger postpones enemy firing');
    const resumed=await step(65);assert.ok(resumed.events.some(e=>e.type==='projectile-fired'));
    await load({scenario:'ranged',hero:'Ranger'});await step(65);
    await page.evaluate(()=>__game.lab.keys(['d']));
    const strafe=await step(80);assert.equal(strafe.hp,100,'strafe avoids aimed shot');
    await load({scenario:'ranged',hero:'Ranger'});await step(120);
    await page.evaluate(()=>{__game.lab.keys(['d']);__game.lab.step(1);__game.lab.dash();});
    const dash=await step(35);assert.equal(dash.hp,100,'dash avoids shot');
    report.checks.push({viewport:name,test:'ranged-strafe-and-dash',strafe,dash});
    await load({scenario:'stomp',hero:'Ranger'});await step(90);
    await page.screenshot({path:`${root}/${name}-stomp-warning.png`});
    const before=await page.evaluate(()=>{__game.lab.pause();return __game.lab.snapshot();});
    const paused=await step(120);assert.equal(paused.time,before.time);assert.equal(paused.warnings,1);
    await page.evaluate(()=>__game.lab.pause());
    const stomp=await step(80);
    const warning=stomp.events.find(e=>e.type==='stomp-warning'),resolved=stomp.events.find(e=>e.type==='stomp-resolved');
    assert.ok(Math.abs(resolved.time-warning.time-1.6)<.035);
    assert.equal(stomp.hp,72,'stomp applies existing 28 damage');
    report.checks.push({viewport:name,test:'stomp-timing-pause',...stomp});
    await load({scenario:'stomp',hero:'Ranger'});await step(65);
    await page.evaluate(()=>__game.lab.keys(['d']));
    const escape=await step(95);assert.equal(escape.hp,100,'walking escapes stomp');
    for(const distance of [3.9,4.1]){
      await load({scenario:'stomp',hero:'Ranger'});await step(65);
      await page.evaluate(distance=>__game.hero.position.x=distance,distance);
      const boundary=await step(95);
      assert.equal(boundary.hp,distance<4?72:100,'stomp uses the existing radius-four boundary');
      report.checks.push({viewport:name,test:'stomp-boundary',distance,...boundary});
    }
    await load({scenario:'stomp',hero:'Ranger'});await step(90);
    await page.evaluate(()=>{const g=__game;g.spawnEnemy('brute');const add=g.enemies.at(-1);add.obj.position.set(15,0,0);add.speed=0;g.damageEnemy(g.enemies[0],100000);});
    const deadBoss=await step(80);
    assert.equal(deadBoss.hp,100,'dead boss cannot resolve pending stomp');assert.equal(deadBoss.warnings,0);
    report.checks.push({viewport:name,test:'boss-death-cancels-warning',...deadBoss});
    if(name==='mobile'){
      await load({scenario:'mixed',hero:'Knight'});await step(90);
      for(const width of [320,390,700]){
        await page.setViewportSize({width,height:844});
        for(const expanded of [false,true]){
          await page.evaluate(expanded=>{if((document.querySelector('#garden-toggle').getAttribute('aria-expanded')==='true')!==expanded)document.querySelector('#garden-toggle').click();},expanded);
          await page.waitForTimeout(100);
          const boxes=await page.evaluate(()=>Object.fromEntries(['hud','bossbar','garden-hud'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{top:r.top,bottom:r.bottom,left:r.left,right:r.right}]})));
          assert.ok(boxes.bossbar.top>=boxes.hud.bottom,'boss bar below main HUD');
          assert.ok(boxes['garden-hud'].top>=boxes.bossbar.bottom,'devices below boss bar');
          assert.ok(boxes['garden-hud'].left>=0&&boxes['garden-hud'].right<=width);
        }
      }
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);await page.evaluate(()=>__game.lab.render());
      await page.screenshot({path:`${root}/${name}-expanded-hud.png`});
    }
    await load({scenario:'stomp',hero:'Ranger'});await step(90);
    await page.evaluate(()=>__game.hurt(10000));
    const lost=await step(120);assert.equal(lost.mode,'lost');assert.equal(lost.warnings,1,'warning remains frozen at death');
    const reset=await page.evaluate(()=>__game.lab.reset());
    assert.equal(reset.warnings,0);assert.equal(reset.hazards,0);assert.equal(reset.hp,100);
    await load({scenario:'ranged',hero:'Ranger'});await step(65);
    const projectileReset=await page.evaluate(()=>__game.lab.reset());assert.equal(projectileReset.hazards,0);
    // A short live capture complements deterministic stepping; it is not a performance benchmark.
    await load({scenario:'mixed',hero:'Knight',manual:false});
    await page.waitForTimeout(3500);
    await context.close();
    console.log(`PASS: ${name} mixed scenes, movement, dash, stomp timing, pause and reset`);
  }
  assert.deepEqual(report.errors,[]);
  const page=await browser.newPage();await page.goto('http://127.0.0.1:5188/');
  await page.waitForFunction(()=>document.body.dataset.effects==='loaded');
  assert.equal(await page.evaluate(()=>!!window.__game),false,'normal game has no test API');
  report.passed=true;
}finally{
  await writeFile(`${root}/report.json`,JSON.stringify(report,null,2));
  await browser.close();
}
