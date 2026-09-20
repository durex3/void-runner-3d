import fs from 'node:fs';
import path from 'node:path';

const dungeon='references/purchased/KayKit_Dungeon_Pack_1.1_EXTRA';
const series='references/purchased/KayKit_Mystery_Monthly_Series_5';
const knight=path.join(series,'3 - September 2024 - Black Knight');
const entries=[];
function copy(source,target){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
  entries.push({source:path.relative(process.cwd(),path.resolve(source)).replaceAll('\\','/'),target:path.relative(process.cwd(),path.resolve(target)).replaceAll('\\','/')});
}
function model(source,target){
  copy(source,target);
  const data=JSON.parse(fs.readFileSync(source,'utf8'));
  for(const item of [...(data.buffers||[]),...(data.images||[])]){
    if(!item.uri||item.uri.startsWith('data:'))continue;
    copy(path.resolve(path.dirname(source),decodeURIComponent(item.uri)),path.resolve(path.dirname(target),decodeURIComponent(item.uri)));
  }
}
for(const name of ['floor_tile_large','floor_tile_big_grate','wall','wall_arched','pillar','scaffold_frame_large','banner_red','rocks','torch_mounted']){
  model(`${dungeon}/Assets/gltf/${name}.gltf`,`public/assets/furnace/dungeon/${name}.gltf`);
}
copy(`${knight}/characters/BlackKnight.glb`,'public/assets/kaykit/characters/BlackKnight.glb');
for(const name of ['BlackKnight_Sword_Large'])model(`${knight}/assets/gltf/${name}.gltf`,`public/assets/kaykit/weapons/${name}.gltf`);
copy(`${dungeon}/License.txt`,'public/assets/furnace/DUNGEON-LICENSE.txt');
copy(`${series}/License.txt`,'public/assets/furnace/SERIES-5-LICENSE.txt');
fs.writeFileSync('public/assets/furnace/manifest.json',JSON.stringify({license:'CC0-1.0',sources:['https://kaylousberg.itch.io/kaykit-dungeon-pack','https://kaylousberg.itch.io'],files:[...new Map(entries.map(e=>[e.target,e])).values()]},null,2)+'\n');
console.log(`Imported ${new Set(entries.map(e=>e.target)).size} files`);
