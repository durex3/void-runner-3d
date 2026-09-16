import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],report=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:5188/?test=1');await page.waitForFunction(()=>window.__game&&document.body.dataset.nature==='loaded');
 for(const name of ['Knight','Ranger','Engineer','Druid']){
   await page.click(`[data-character="${name}"]`);
   const count=name==='Engineer'?2:3;
   assert.equal(await page.locator('[data-weapon]').count(),count);
   for(let slot=0;slot<count;slot++){
     await page.click('#start');await page.click(`[data-weapon="${slot}"]`);
     const result=await page.evaluate(()=>{
       const g=__game,p=g.hero.userData.profile;g.state.mode='paused';g.state.remaining=1;g.state.spawn=999;g.state.inv=999;g.hero.position.set(0,0,0);
       for(const [x,z] of [[0,2],[.6,2.8],[-.6,2.8],[0,3.6]]){g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.set(x,0,z);e.speed=0;e.hp=e.maxHp=1000}
       g.attack();const interval=g.state.shot,bullets=g.bullets.map(b=>b.damage);g.state.shot=999;g.state.mode='playing';for(let i=0;i<45;i++)g.tick(.016);g.state.mode='paused';
       return {role:g.hero.userData.rig.name,slot:g.state.loadout,model:g.hero.userData.weaponModel,profile:p,interval,bullets,damage:g.enemies.map(e=>1000-e.hp),hand:g.hero.userData.rig.held.parent.name};
     });
     assert.equal(result.role,name);assert.equal(result.slot,slot);assert.equal(result.model,result.profile.model);assert.equal(result.interval,result.profile.interval);
     if(result.profile.effect==='melee'){assert.equal(result.bullets.length,0);assert.ok(result.damage.some(d=>d===result.profile.damage));assert.ok(result.damage.every(d=>d===0||d===result.profile.damage))}
     else if(result.profile.effect==='nature'){assert.equal(result.damage.filter(d=>d>0).length,4);assert.ok(result.damage.every(d=>d===result.profile.damage))}
     else if(result.profile.effect==='chain'){assert.equal(result.damage.filter(d=>d>0).length,result.profile.targets);assert.ok(result.damage.some(d=>d===result.profile.damage));assert.ok(result.damage.some(d=>d<result.profile.damage))}
     else if(result.profile.effect==='orb'){assert.ok(result.damage.some(d=>d===result.profile.damage));assert.ok(result.damage.some(d=>d>0&&d<result.profile.damage))}
     else{assert.equal(result.bullets.length,result.profile.count);assert.ok(result.bullets.every(d=>d===result.profile.damage));assert.ok(result.damage.some(d=>d>0))}
     assert.equal(result.hand,result.profile.grip==='bow'?'handslotl':'handslotr');report.push(result);
     await page.evaluate(()=>{__game.state.shot=.42});await page.keyboard.press(String((slot+1)%count+1));assert.equal(await page.evaluate(()=>__game.state.shot),.42);
     await page.evaluate(()=>__game.finish(false));await page.click('#restart');assert.equal(await page.evaluate(()=>__game.state.loadout),(slot+1)%count);
     await page.evaluate(()=>__game.finish(false));await page.click('#change-hero');
   }
 }
 // Close-up view of all eight loadouts uses the actual runtime grip code.
 await page.evaluate(()=>{const g=__game,A=g.actors,T=g.THREE,scene=new T.Scene();scene.background=new T.Color(0x263b43);scene.add(new T.HemisphereLight(0xd3edf3,0x445040,2));const sun=new T.DirectionalLight(0xffe8c7,2);sun.position.set(4,8,6);scene.add(sun);for(const [row,name] of ['Ranger','Engineer','Druid'].entries())for(let slot=0;slot<(name==='Engineer'?2:3);slot++){const {hero}=A.createHero(scene);A.selectHero(hero,name);A.equipActor(hero,slot);hero.position.set((slot-1)*3.5,0,(row-1)*3.4);A.animateActor(hero,.1,0,0)}const camera=new T.OrthographicCamera(-6.5,6.5,4.0625,-4.0625,.1,100);camera.position.set(3,10,18);camera.lookAt(0,1,0);const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;Object.assign(renderer.domElement.style,{position:'fixed',inset:0,zIndex:9999});document.body.append(renderer.domElement);renderer.render(scene,camera)});
 await page.screenshot({path:'test-results/role-weapons.png'});assert.deepEqual(errors,[]);
 await writeFile('test-results/role-weapons.json',JSON.stringify({passed:true,checks:report,errors},null,2));console.log('PASS: eleven loadouts, damage, cadence, target counts, hand slots, switching, restart and role selection');
}finally{await browser.close()}
