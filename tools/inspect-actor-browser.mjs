import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader']});
try{
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('console',m=>{if(['error','warning'].includes(m.type()))console.log(m.type(),m.text())});page.on('pageerror',e=>console.log('ERROR',e.message));
await page.goto('http://127.0.0.1:5188/?test=1');await page.waitForFunction(()=>window.__game);
console.log(await page.evaluate(()=>{const r=__game.hero.userData.rig;return {name:r.name,bones:r.arms.map(b=>({name:b.name,rot:b.rotation.toArray()})),slot:r.held.parent.name,legs:r.legs.map(b=>b.name)}}));
// Isolate each package file to identify texture decode failures.
console.log(await page.evaluate(async()=>{const {GLTFLoader}=await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js');const loader=new GLTFLoader();const rows=[];for(const n of ['Ranger','Knight','Druid','Engineer','Skeleton_Warrior','Skeleton_Rogue','Skeleton_Mage','Skeleton_Golem','Necromancer']){const {scene}=await loader.loadAsync(`/assets/kaykit/characters/${n}.glb`);const materials=[];scene.traverse(o=>{if(o.isMesh)materials.push({name:o.material.name,texture:!!o.material.map})});rows.push({n,materials})}return rows}));
await page.click('#start');await page.evaluate(()=>{__game.state.remaining=1;__game.state.spawn=999;__game.state.mode='paused';__game.hero.position.set(0,0,0);__game.hero.rotation.y=.4});
await page.screenshot({path:'test-results/actor-inspect.png'});
}finally{await browser.close()}
