import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('test-results',{recursive:true});
const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(testUrl('/boss-test.html?test=1'));
  await page.waitForFunction(()=>window.__game?.bossTest);
  const combo=await page.evaluate(()=>{
    const g=window.__game;g.setManual(true);g.bossTest.reset();g.state.shot=999;
    const boss=g.enemies[0];boss.hp=boss.maxHp*.49;g.hero.position.copy(boss.obj.position).add(new g.THREE.Vector3(0,0,3));
    g.furnaceCombat.begin(boss,'slash');
    for(let i=0;i<73;i++)g.tick(1/60);
    const firstHp=g.state.hp;
    g.hero.position.copy(boss.obj.position).add(new g.THREE.Vector3(3,0,0));
    while(boss.furnaceAction.strike===1)g.tick(1/60);
    const second=boss.furnaceAction,locked=second.direction.clone(),warning=second.left;
    g.pause();g.tick(1);const frozen=second.left===warning;g.pause();
    for(let i=0;i<53;i++)g.tick(1/60);
    const warningHp=g.state.hp;
    for(let i=0;i<3;i++)g.tick(1/60);
    const secondHp=g.state.hp;
    while(boss.furnaceAction.phase!=='recovery')g.tick(1/60);
    const recovery=boss.recovery;
    g.hero.position.copy(boss.obj.position);g.state.shot=0;
    const before=boss.hp;for(let i=0;i<60;i++)g.tick(1/60);
    return {firstHp,warningHp,secondHp,warning,frozen,recovery,counterDamage:before-boss.hp,safe:g.state.hp===secondHp,locked:second.direction.equals(locked)};
  });
  assert.equal(combo.firstHp,76);assert.equal(combo.warningHp,76);assert.equal(combo.secondHp,52);
  assert.equal(combo.warning,.9);assert.equal(combo.frozen,true);assert.equal(combo.recovery,1.8);
  assert.ok(combo.counterDamage>0);assert.equal(combo.safe,true);assert.equal(combo.locked,true);
  const results=[];
  for(const dodge of [false,true])results.push(await page.evaluate(dodge=>{
    const g=window.__game;g.setManual(true);g.bossTest.reset();g.hero.position.set(0,0,-3);
    const boss=g.enemies[0],keys=new Set();let target=g.hero.position.clone(),lastAction=null;
    const input=next=>{for(const key of ['w','a','s','d']){
      if(next.has(key)!==keys.has(key))window.dispatchEvent(new KeyboardEvent(next.has(key)?'keydown':'keyup',{key}));
    }keys.clear();for(const key of next)keys.add(key)};
    for(let i=0;i<7200&&g.state.mode==='playing';i++){
      if(dodge){
        const action=boss.furnaceAction;
        if(action!==lastAction){
          if(action?.kind==='slash')target=action.origin.clone().addScaledVector(action.direction,-2.2);
          else if(action?.kind==='forge'){
            const away=boss.obj.position.clone().sub(action.ground.position).setY(0).normalize();
            target=boss.obj.position.clone().addScaledVector(away,2.2);
          }
          lastAction=action;
        }
        if(!action||action.phase==='recovery'){
          const away=g.hero.position.clone().sub(boss.obj.position).setY(0).normalize();
          target=boss.obj.position.clone().addScaledVector(away,2.2);
        }
        const delta=target.clone().sub(g.hero.position).applyAxisAngle(new g.THREE.Vector3(0,1,0),-Math.PI/4);
        const next=new Set();if(delta.length()>.2){
          if(Math.abs(delta.x)>.12)next.add(delta.x>0?'d':'a');
          if(Math.abs(delta.z)>.12)next.add(delta.z>0?'s':'w');
        }input(next);
      }
      g.tick(1/60);
    }
    input(new Set());
    return {dodge,mode:g.state.mode,time:g.state.time,hp:g.state.hp,bossHp:boss.hp,hits:g.bossTest.hits};
  },dodge));
  console.log(results);
  assert.equal(results[0].mode,'lost','default mace cannot win standing still');
  assert.equal(results[1].mode,'won','keyboard movement preserves counterplay');
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    await page.evaluate(()=>{
      const g=window.__game;g.bossTest.reset();g.state.shot=999;
      g.hero.position.set(0,0,0);g.furnaceCombat.begin(g.enemies[0],'forge');
      for(let i=0;i<60;i++)g.tick(1/60);g.render();
      document.querySelector('#boss-test-panel details').open=false;
    });
    await page.screenshot({path:`test-results/forge-target-${label}-warning.png`});
    const colors=await page.evaluate(()=>{
      const g=window.__game,T=g.THREE,target=new T.WebGLRenderTarget(128,128),data=new Uint8Array(128*128*4);
      g.renderer.setRenderTarget(target);g.renderer.render(g.scene,g.camera);
      g.renderer.readRenderTargetPixels(target,0,0,128,128,data);g.renderer.setRenderTarget(null);target.dispose();
      const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);return colors.size;
    });assert.ok(colors>35);
    await page.evaluate(()=>{const g=window.__game;for(let i=0;i<90;i++)g.tick(1/60);g.render()});
    await page.screenshot({path:`test-results/forge-target-${label}-burn.png`});
    await page.evaluate(()=>{
      const g=window.__game;g.bossTest.reset();g.state.shot=999;const boss=g.enemies[0];boss.hp=boss.maxHp*.49;
      g.hero.position.copy(boss.obj.position).add(new g.THREE.Vector3(0,0,3));g.furnaceCombat.begin(boss,'slash');
      while(boss.furnaceAction.strike===1)g.tick(1/60);g.render();
    });
    await page.screenshot({path:`test-results/slash-combo-${label}.png`});
  }
  assert.deepEqual(errors,[]);
  await writeFile('test-results/boss-balance-report.json',JSON.stringify(results,null,2));
  console.log('PASS: default mace stationary defeat, keyboard dodge victory, forge warning/burn desktop/mobile');
}finally{await browser.close()}
