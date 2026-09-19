import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('test-results/assets',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],report=[];
try{
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
for(const role of ['Ranger','Engineer','Druid','Knight'])for(let slot=0;slot<(role==='Engineer'?2:3);slot++){
 await page.goto('http://127.0.0.1:5188/?test=1');await page.waitForFunction(()=>window.__game&&document.body.dataset.effects==='loaded'&&document.body.dataset.nature==='loaded');
 await page.click(`[data-character="${role}"]`);await page.click('#start');
 const result=await page.evaluate(({slot,role})=>{const g=__game;g.state.mode='paused';g.state.spawn=999;g.state.inv=999;g.combat.reset();g.effects.clear();g.equip(slot);g.hero.position.set(0,0,0);
 for(const [x,z] of [[0,role==='Knight'?2:7],[1,8],[-1,9]]){g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.set(x,0,z);e.hp=10000;e.speed=0;}
 g.attack();const p=g.hero.userData.profile;g.combat.step(p.effect==='melee'?p.delay+.01:p.effect==='nature'?.26:.12);g.effects.update(.08,0,'playing');g.camera.zoom=1.7;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);
 return {role,slot,model:p.model,bullets:g.combat.bullets.map(b=>({asset:b.obj.children.some(c=>c.userData.projectileAsset),meshes:b.obj.children.map(c=>c.type)})),effects:g.effects.effects.length};},{role,slot});
 if(result.bullets.length)assert.ok(result.bullets.every(b=>b.asset));
 await page.screenshot({path:`test-results/assets/${role}-${slot}.png`});
 const middle=await page.evaluate(()=>{const g=__game;const before=g.effects.effects.filter(e=>e.obj.material?.map).map(e=>e.obj.material.map.offset.toArray());g.combat.step(.12);g.effects.update(.12,0,'playing');g.renderer.render(g.scene,g.camera);return {before,after:g.effects.effects.filter(e=>e.obj.material?.map).map(e=>e.obj.material.map.offset.toArray())};});
 await page.screenshot({path:`test-results/assets/${role}-${slot}-middle.png`});
 await page.evaluate(()=>{const g=__game;g.camera.zoom=1;g.camera.updateProjectionMatrix();g.renderer.render(g.scene,g.camera);});
 await page.screenshot({path:`test-results/assets/${role}-${slot}-normal.png`});
 if(role==='Knight'&&slot===0)assert.notDeepEqual(middle.after,middle.before);
 await page.evaluate(()=>{const g=__game;g.combat.reset();g.effects.update(2,0,'playing');});
 assert.equal(await page.evaluate(()=>__game.combat.bullets.length),0);report.push(result);
}
assert.deepEqual(errors,[]);await writeFile('test-results/assets/report.json',JSON.stringify({report,errors},null,2));console.log('PASS: all 11 loadouts rendered; asset projectiles and no browser errors');
}finally{await browser.close()}
