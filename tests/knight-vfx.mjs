import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('test-results/knight-vfx',{recursive:true});
const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(['error','warning'].includes(message.type())&&!message.text().includes('GPU stall'))errors.push(message.text())});
  await page.goto(testUrl('/?test=1'));
  await page.waitForFunction(()=>window.__game&&document.body.dataset.nature==='loaded'&&document.body.dataset.effects==='loaded');
  await page.click('[data-character="Knight"]');
  await page.click('#start');
  const textureState=await page.evaluate(()=>Object.fromEntries(Object.entries(__game.meleeVfx.textures).map(([key,texture])=>[key,{width:texture.image?.naturalWidth||texture.image?.width,height:texture.image?.naturalHeight||texture.image?.height}])));
  assert.deepEqual(Object.keys(textureState).sort(),['combatAtlas','combatHeavy','combatHit','combatMace','combatSword','dustHeavy','dustLight','impact','shockwave','slashHeavy','slashShield','warriorOne','warriorTwo']);
  assert.ok(Object.entries(textureState).filter(([key])=>!key.startsWith('combat')&&!key.startsWith('warrior')).every(([,texture])=>texture.width===512&&texture.height===512));
  assert.ok(textureState.combatAtlas.width===640&&textureState.combatAtlas.height===1856);
  assert.ok(textureState.warriorOne.width===256&&textureState.warriorOne.height===640);
  assert.ok(textureState.warriorTwo.width===256&&textureState.warriorTwo.height===640);
  assert.ok(Object.entries(textureState).filter(([key])=>key.startsWith('combat')&&key!=='combatAtlas').every(([,texture])=>texture.width===64&&texture.height===64));

  const captures=[];
  for(let slot=0;slot<3;slot++){
    const state=await page.evaluate(slot=>{
      const g=__game;
      g.state.mode='paused';g.state.remaining=0;g.state.spawn=999;g.state.inv=999;g.effects.clear();
      g.enemies.splice(0).forEach(enemy=>{enemy.dead=true;g.scene.remove(enemy.obj)});
      g.hero.position.set(0,0,0);g.equip(slot);g.spawnEnemy('brute');
      const enemy=g.enemies.at(-1),profile=g.hero.userData.profile;
      enemy.obj.position.set(0,0,Math.min(2,profile.range-.2));enemy.speed=0;enemy.hp=10000;
      g.attack();g.combat.step(Math.max(0,profile.delay-.02));
      const before=g.effects.effects.filter(effect=>effect.obj.userData.meleeVfx).length;
      g.combat.step(.03);g.renderer.render(g.scene,g.camera);
      const visual=g.effects.effects.filter(effect=>effect.obj.userData.meleeVfx);
      const opacity=visual[0]?.obj.material.opacity;
      const slash=visual.find(effect=>effect.obj.userData.meleeVfx==='slash');
      const projected=[g.hero.position,enemy.obj.position].map(position=>position.clone().project(g.camera).toArray());
      return {slot,before,kinds:visual.map(effect=>effect.obj.userData.meleeVfx),slashColor:slash?.obj.material.color.getHex(),opacity,damage:10000-enemy.hp,projected};
    },slot);
    assert.equal(state.before,0);
    assert.ok((slot===1||state.kinds.includes('slash'))&&state.kinds.includes('impact'));
    assert.equal(state.kinds.includes('dust'),slot>0);
    assert.equal(state.kinds.includes('landing'),slot>0);
    assert.equal(state.kinds.includes('shock-core'),slot===2);
    assert.equal(state.kinds.includes('impact-core'),slot===2);
    assert.ok(state.damage>0);
    assert.ok(state.projected.every(([x,y])=>Math.abs(x)<1&&Math.abs(y)<1));
    await page.screenshot({path:`test-results/knight-vfx/slot-${slot+1}.png`});
    state.opacityAfter=await page.evaluate(()=>{const g=__game,visual=g.effects.effects.find(effect=>effect.obj.userData.meleeVfx);g.effects.update(visual.maxLife*.85,0,'playing');g.renderer.render(g.scene,g.camera);return visual?.obj.material.opacity});
    assert.ok(state.opacityAfter<state.opacity);
    captures.push(state);
  }
  assert.notEqual(captures[0].slashColor,captures[2].slashColor);
  const maceColor=captures[2].slashColor;
  assert.ok((maceColor&255)>((maceColor>>16)&255));

  await page.setViewportSize({width:390,height:844});
  const mobile=await page.evaluate(()=>{
    const g=__game,gl=g.renderer.getContext();g.effects.clear();g.equip(2);const enemy=g.enemies.at(-1);enemy.dead=false;enemy.stunned=false;enemy.hp=10000;enemy.obj.position.set(0,0,2);g.attack();g.combat.step(g.hero.userData.profile.delay+.01);g.renderer.render(g.scene,g.camera);
    const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const colors=new Set();for(let index=0;index<pixels.length;index+=160)colors.add(`${pixels[index]>>4},${pixels[index+1]>>4},${pixels[index+2]>>4}`);
    return {width,height,colors:colors.size,vfx:g.effects.effects.filter(effect=>effect.obj.userData.meleeVfx).length};
  });
  assert.ok(mobile.width>=390&&mobile.height>=844&&mobile.colors>12&&mobile.vfx>=4);
  await page.screenshot({path:'test-results/knight-vfx/mobile-mace.png'});
  assert.deepEqual(errors,[]);
  await writeFile('test-results/knight-vfx/report.json',JSON.stringify({passed:true,textureState,captures,mobile,errors},null,2));
  console.log('PASS: three synchronized knight VFX styles, texture rendering, animation, framing and mobile canvas pixels');
}finally{await browser.close()}
