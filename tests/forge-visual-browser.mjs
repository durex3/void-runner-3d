import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5188/boss-test.html?test=1');
  await page.waitForFunction(()=>window.__game?.bossTest);
  await page.evaluate(()=>window.__game.setManual(true));
  for(const [label,width,height] of [['desktop',1440,900],['mobile',390,844]]){
    await page.setViewportSize({width,height});
    for(const [stage,age] of [['summon',.45],['burn',2.65]]){
      const result=await page.evaluate(({age})=>{
        const g=window.__game;g.bossTest.reset();const e=g.enemies[0];
        e.obj.position.set(0,0,0);g.hero.position.set(0,0,5);
        g.furnaceCombat.begin(e,'forge');
        for(let t=0;t<age-.001;t+=.01){g.furnaceCycle.step(.01,8);g.furnaceCombat.step(e,.01)}
        const a=e.furnaceAction,r=e.obj.userData.rig;
        document.querySelector('#boss-test-panel details').open=false;g.render();
        const T=g.THREE,target=new T.WebGLRenderTarget(128,128),data=new Uint8Array(128*128*4);
        g.renderer.setRenderTarget(target);g.renderer.render(g.scene,g.camera);g.renderer.readRenderTargetPixels(target,0,0,128,128,data);g.renderer.setRenderTarget(null);target.dispose();
        const colors=new Set();for(let i=0;i<data.length;i+=4)colors.add(`${data[i]>>4},${data[i+1]>>4},${data[i+2]>>4}`);
        return {pose:r.overlay.length,visible:a.groundFlames.visible,meshes:a.groundFlames.children.length,colors:colors.size,age:r.forgeAge};
      },{age});
      assert.ok(result.pose>=5);assert.equal(result.visible,stage==='burn');assert.equal(result.meshes,13);assert.ok(result.colors>35);assert.ok(Math.abs(result.age-age)<.02);
      await page.screenshot({path:`test-results/forge-${label}-${stage}.png`});
      await page.evaluate(()=>{
        const g=window.__game,e=g.enemies[0],a=e.furnaceAction;
        const sprite=a.groundFlames.children[0],map=sprite.material.map;g.render();g.render();
        if(map!==sprite.material.map||!map?.image?.width)throw Error('flame texture missing or render advanced simulation');
        a.groundFlames.userData.update(.41);const firstFrame=sprite.material.map;
        a.groundFlames.userData.update(.51);if(sprite.material.map===firstFrame)throw Error('flame sequence did not advance');
        g.furnaceCombat.recover(e,a);if(a.ground.visible||e.obj.userData.rig.forgeAge!=null)throw Error('recovery leak');
        g.bossTest.reset();if(a.ground.parent)throw Error('reset leak');
      });
    }
  }
  assert.deepEqual(errors,[]);console.log('PASS: forge pose, layered flames, frozen render, recovery/reset, desktop/mobile pixels and screenshots');
}finally{await browser.close()}
