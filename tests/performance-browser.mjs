import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

await mkdir('test-results/performance',{recursive:true});
const browser=await launchBrowser({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto(testUrl('/performance-test.html?test=1&preset=standard'));
  await page.waitForFunction(()=>window.__performanceTest?.ready&&window.__THREE_GAME_DIAGNOSTICS__);
  const reports=[];
  for(const preset of ['standard','devices','hazards','boss','extreme']){
    const loaded=await page.evaluate(preset=>window.__performanceTest.load(preset),preset);
    assert.equal(loaded.preset,preset);
    assert.equal(loaded.viewport[0],390);
    assert.ok(loaded.objects.enemies>=12);
    if(preset==='devices'||preset==='extreme')assert.equal(loaded.objects.devices,24);
    if(preset==='devices'||preset==='extreme')assert.equal(loaded.objects.resources,36);
    if(preset==='boss'||preset==='extreme')assert.ok(loaded.objects.enemies>=21);
    await page.waitForTimeout(700);
    reports.push(await page.evaluate(()=>window.__performanceTest.snapshot()));
  }
  await page.waitForFunction(()=>window.__performanceTest.snapshot().sampleCount>=5,{timeout:15000});
  const final=await page.evaluate(()=>window.__performanceTest.snapshot());
  assert.ok(final.fps>0&&final.frameMs>0);
  assert.ok(final.render.calls>0&&final.render.triangles>0&&final.render.geometries>0&&final.render.textures>0);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'test-results/performance/mobile-extreme.png'});
  await writeFile('test-results/performance/report.json',JSON.stringify({reports,final,errors},null,2));
  console.log('PASS: five repeatable performance presets, mobile metrics and Three.js diagnostics');
}finally{await browser.close()}
