import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(testUrl('/boss-test.html?test=1'));await page.waitForFunction(()=>window.__game?.bossTest);
  await page.evaluate(()=>window.__game.setManual(true));
  for(const [stage,age] of [['lift',.65],['impact',1.21],['settle',1.9]]){
    const result=await page.evaluate(async({age})=>{
      const g=window.__game;g.bossTest.reset();const e=g.enemies[0];e.obj.position.set(0,0,0);g.hero.position.set(0,0,4);
      g.furnaceCombat.begin(e,'slash');const hp=g.state.hp;
      for(let t=0;t<age-.001;t+=.01)g.furnaceCombat.step(e,.01);
      const r=e.obj.userData.rig,a=e.furnaceAction;
      document.querySelector('#boss-test-panel details').open=false;g.render();
      return {phase:a.phase,time:r.heavyAction.time/r.heavyAction.getClip().duration,damage:hp-g.state.hp,hand:r.wrists[1].getWorldPosition(new g.THREE.Vector3()).toArray()};
    },{age});
    assert.ok(result.time>0);assert.equal(result.damage,stage==='lift'?0:24);
    assert.equal(result.phase,stage==='lift'?'warning':stage==='impact'?'attack':'recovery');
    console.log(stage,result);await page.screenshot({path:`test-results/heavy-${stage}.png`});
  }
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    const result=await page.evaluate(()=>{
      const g=window.__game;g.bossTest.reset();g.enemies[0].obj.position.set(0,0,-9);g.hero.position.set(0,0,2);
      const rows=[];
      for(const [i,type] of ['brute','runner','spitter'].entries()){
        const e=g.spawnEnemy(type);e.obj.position.set((i-1)*2.3,0,-1);e.obj.rotation.y=Math.PI/3;
        const r=e.obj.userData.rig;rows.push({type,role:r.furnaceRole,offhand:r.offhand.children.length,materials:r.ownedMaterials.length});
      }
      g.render();return rows;
    });
    assert.deepEqual(result.map(r=>r.role),['brute','runner','spitter']);assert.equal(result[0].offhand,1);assert.equal(result[1].offhand,1);assert.ok(result.every(r=>r.materials>0));
    await page.screenshot({path:`test-results/furnace-roles-${label}.png`});
  }
  assert.deepEqual(errors,[]);console.log('PASS: phased heavy sword, unchanged hit timing/damage, furnace role equipment, desktop/mobile');
}finally{await browser.close()}
