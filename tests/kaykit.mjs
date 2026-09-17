import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type())&&!m.text().includes('GPU stall'))errors.push(m.text())});
  await page.goto('http://127.0.0.1:5188/?test=1');await page.waitForFunction(()=>window.__game&&document.body.dataset.nature==='loaded');
  assert.ok(await page.locator('[data-character="Knight"]').isEnabled());
  for(const name of ['Knight','Druid','Engineer','Ranger']){await page.click(`[data-character="${name}"]`);assert.equal(await page.evaluate(()=>__game.hero.userData.rig.name),name)}
  await page.click('#start');
  const report=await page.evaluate(async()=>{
    const A=__game.actors,T=__game.THREE,g=__game;
    g.state.mode='paused';const hero=g.hero,r=hero.userData.rig;
    const textures=[];r.model.traverse(o=>{if(o.isMesh)textures.push(!!o.material.map)});
    const pose=()=>r.legs[0].quaternion.toArray();A.animateActor(hero,.1,0,6);const before=pose();A.animateActor(hero,.2,.2,6);const after=pose();
    const a=A.createCreature('brute'),b=A.createCreature('brute'),initial=b.userData.rig.legs[0].quaternion.toArray();A.animateActor(a,.3,.3,2);
    const independent=JSON.stringify(initial)===JSON.stringify(b.userData.rig.legs[0].quaternion.toArray());
    A.equipActor(hero,0);A.kickActor(hero);A.animateActor(hero,.05,0,0);const attackPose=r.arms[1].quaternion.toArray();A.animateActor(hero,.35,.4,0);const recovered=r.arms[1].quaternion.toArray();
    A.hitActor(a);const hit=!!a.userData.rig.hitAction;A.dieActor(a);A.animateActor(a,.6,1,0);const dead=a.userData.rig.dead;A.disposeActor(a);A.disposeActor(b);
    g.spawnEnemy('brute');const enemy=g.enemies.at(-1);g.damageEnemy(enemy,10000);const corpse=g.corpses.some(c=>c.obj===enemy.obj);
    // Render actual runtime actors in a close-up contact sheet for art/rig inspection.
    const scene=new T.Scene();scene.background=new T.Color(0x263b43);scene.add(new T.HemisphereLight(0xd3edf3,0x445040,2));const sun=new T.DirectionalLight(0xffe8c7,2.2);sun.position.set(3,7,6);scene.add(sun);
    const view=new T.OrthographicCamera(-9,9,5.625,-5.625,.1,100);view.position.set(4,9,17);view.lookAt(0,0,0);
    for(let i=0;i<3;i++){const {hero:h}=A.createHero(scene);A.selectHero(h,['Ranger','Druid','Engineer'][i]);A.equipActor(h,0);h.position.set(-5+i*4,0,2);A.animateActor(h,.25,0,0)}
    for(let i=0;i<5;i++){const e=A.createCreature(['brute','runner','spitter','necromancer','boss'][i]);e.position.set(-7+i*3.3,0,-3);scene.add(e);A.animateActor(e,.25,0,1.8)}
    const relicModels=[];
    for(let type=0;type<3;type++){const p=g.garden.plant(type,new T.Vector3());p.obj.position.set(-4+type*4,0,5);scene.add(p.obj);p.obj.traverse(o=>{if(o.isMesh&&o.material.map)relicModels.push(o.name)});const drop=g.garden.seed(type,new T.Vector3(12+type,0,0))}
    const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.domElement.id='asset-contact-sheet';Object.assign(renderer.domElement.style,{position:'fixed',inset:0,zIndex:9999});document.body.append(renderer.domElement);renderer.render(scene,view);
    return {textures,before,after,independent,attackPose,recovered,hit,dead,corpse,relicModels,slot:r.held.parent.name};
  });
  assert.ok(report.textures.every(Boolean));assert.notDeepEqual(report.before,report.after);assert.ok(report.independent);assert.notDeepEqual(report.attackPose,report.recovered);assert.ok(report.hit&&report.dead&&report.corpse);assert.equal(report.slot,'handslotr');
  assert.ok(report.relicModels.some(n=>n.includes('turret')));assert.ok(report.relicModels.some(n=>n.includes('potion')));assert.ok(report.relicModels.some(n=>n.includes('spellbook')));
  await page.screenshot({path:'test-results/kaykit-lineup.png'});
  await page.evaluate(()=>{document.querySelector('#asset-contact-sheet').remove();__game.start();__game.state.inv=100});assert.equal(await page.evaluate(()=>__game.corpses.length),0);
  await page.waitForTimeout(700);assert.deepEqual(errors,[]);
  await writeFile('test-results/kaykit-report.json',JSON.stringify({passed:true,...report,errors},null,2));console.log('PASS: four characters, textures, skeletal movement, independent rigs, attacks, hit/death, weapon slot, restart cleanup');
}finally{await browser.close()}
