import {launchBrowser,testUrl} from './browser-harness.mjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';

await mkdir('test-results/balance',{recursive:true});
const browser=await launchBrowser({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto(testUrl('/balance-report.html'));await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForSelector('#report-paste');
  const fixture={version:1,chapter:'ruins',hero:{id:'Ranger',label:'游侠'},win:true,duration:100,totalDamage:120,totalDamageTaken:12,weapons:[{id:'bow',label:'猎手长弓',equippedTime:60,attacks:80,projectiles:80,hits:60,damage:100,kills:4}],devices:[{id:'electric',label:'雷鸣法典',hits:10,damage:20,kills:2}],damageTaken:{'enemy-projectile':12},upgrades:[{id:'snare',name:'淬毒弩箭',kind:'combo'}],combos:{snare:3},boss:{duration:20}};
  await page.fill('#report-paste',JSON.stringify(fixture));await page.click('#load-paste');
  assert.equal(await page.locator('#run-count').textContent(),'1 局有效报告 · 总输出 120 · 胜率 100.0%');assert.equal(await page.locator('.dataset-row').count(),1);assert.match(await page.locator('.warning-panel').textContent(),/至少 3 局/);
  await page.fill('#report-paste',JSON.stringify(fixture));await page.click('#load-paste');assert.equal(await page.locator('.dataset-row').count(),1);assert.match(await page.locator('#import-status').textContent(),/忽略 1 份重复报告/);
  await page.fill('[data-report-note]','手机真机：重剑月弧');await page.reload();await page.waitForSelector('.dataset-row');assert.equal(await page.locator('[data-report-note]').inputValue(),'手机真机：重剑月弧');assert.equal(await page.locator('.dataset-row').count(),1);
  assert.equal(await page.locator('.report-panel').count(),6);await page.screenshot({path:'test-results/balance/mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const datasetDownloadPromise=page.waitForEvent('download');await page.click('#export-dataset');const datasetDownload=await datasetDownloadPromise;assert.match(datasetDownload.suggestedFilename(),/^balance-dataset-\d+\.json$/);
  const summaryDownloadPromise=page.waitForEvent('download');await page.click('#export-summary');const summaryDownload=await summaryDownloadPromise;assert.match(summaryDownload.suggestedFilename(),/^balance-summary-\d+\.json$/);
  await page.selectOption('#hero-filter','Ranger');assert.equal(await page.locator('#run-count').textContent(),'1 局有效报告 · 总输出 120 · 胜率 100.0%');
  await page.setViewportSize({width:1440,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'test-results/balance/desktop.png',fullPage:true});
  await page.click('[data-delete-report]');assert.equal(await page.locator('.dataset-row').count(),0);assert.match(await page.locator('#balance-content').textContent(),/等待第一批/);await page.reload();assert.equal(await page.locator('.dataset-row').count(),0);
  await page.fill('#report-paste',JSON.stringify(fixture));await page.click('#load-paste');page.once('dialog',dialog=>dialog.accept());await page.click('#clear-reports');assert.equal(await page.locator('.dataset-row').count(),0);await page.reload();assert.equal(await page.locator('.dataset-row').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS: balance dataset persistence, dedupe, notes, exports, deletion and responsive layout');
}finally{await browser.close()}
