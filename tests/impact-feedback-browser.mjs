import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5188/boss-test.html?test=1');
  await page.waitForFunction(()=>window.__game?.bossTest);
  await page.evaluate(()=>window.__game.setManual(true));
  for(const [type,damage,kind] of [[0,17,'thorn'],[1,48,'explosion'],[2,15,'electric']]){
    const result=await page.evaluate(({type,kind})=>{
      const g=window.__game;g.bossTest.reset();const boss=g.enemies[0];boss.obj.position.set(2,0,0);
      const p=g.garden.plant(type,new g.THREE.Vector3());p.grow=0;p.cooldown=0;
      const before=boss.hp;g.garden.step(.01,[],()=>{});
      const effect=g.effects.effects.find(e=>e.obj.userData.feedback===`device-${kind}`);
      const visible=!!effect&&effect.obj.children.length>0;
      g.effects.update(.1,0,'paused');const frozen=effect.life===effect.maxLife;
      g.effects.update(.6,0,'playing');return {damage:before-boss.hp,visible,frozen,expired:!g.effects.effects.includes(effect)&&!effect.obj.parent};
    },{type,kind});
    assert.deepEqual(result,{damage,visible:true,frozen:true,expired:true});
  }
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    const result=await page.evaluate(()=>{
      const g=window.__game;g.bossTest.reset();const boss=g.enemies[0];boss.obj.position.set(0,0,0);g.hero.position.set(0,0,2);
      g.furnaceCombat.begin(boss,'slash');const left=boss.furnaceAction.left;
      g.combat.melee({profile:g.hero.userData.profile,damage:52,dir:new g.THREE.Vector3(0,0,-1)});
      g.effects.updateEnemyStatus(boss,g.state.time);
      const resist=g.effects.effects.find(e=>e.obj.userData.feedback==='stagger-resist');
      for(const [type,x,z] of [[0,-4,1],[1,1,1],[2,3,-2]]){
        const p=g.garden.plant(type,new g.THREE.Vector3(x,0,z));p.grow=0;p.cooldown=0;
      }
      g.garden.step(.01,[],()=>{});g.effects.update(.08,0,'playing');
      document.querySelector('#boss-test-panel details').open=false;g.render();
      return {resist:!!resist,stagger:boss.statusVfx.stagger.visible,unchanged:boss.furnaceAction.left===left&&!(boss.hitStop>0)};
    });assert.deepEqual(result,{resist:true,stagger:false,unchanged:true});
    await page.screenshot({path:`test-results/impact-feedback-${label}.png`});
    const colors=await page.evaluate(()=>{
      const g=window.__game,T=g.THREE,target=new T.WebGLRenderTarget(128,128),data=new Uint8Array(128*128*4);
      g.renderer.setRenderTarget(target);g.renderer.render(g.scene,g.camera);g.renderer.readRenderTargetPixels(target,0,0,128,128,data);g.renderer.setRenderTarget(null);target.dispose();
      const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);return colors.size;
    });assert.ok(colors>35);
    assert.equal(await page.evaluate(()=>{const g=window.__game;g.effects.update(.6,0,'playing');return !g.effects.effects.some(e=>e.obj.userData.feedback)}),true);
  }
  await page.evaluate(()=>{const g=window.__game;g.bossTest.reset();g.spawnEnemy('brute');const e=g.enemies.at(-1);e.obj.position.copy(g.hero.position).add(new g.THREE.Vector3(0,0,2));g.combat.melee({profile:g.hero.userData.profile,damage:1,dir:new g.THREE.Vector3(0,0,1)});g.effects.updateEnemyStatus(e,g.state.time);if(!e.statusVfx.stagger.visible)throw Error('ordinary enemy stun missing');g.bossTest.reset();if(g.effects.effects.length)throw Error('reset leaked effects')});
  assert.deepEqual(errors,[]);console.log('PASS: three device attacks, unchanged damage, resisted mace, ordinary stun, pause, expiry, reset, desktop/mobile render');
}finally{await browser.close()}
