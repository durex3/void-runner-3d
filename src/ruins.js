import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {scaledProp} from './relics.js';

const stone=new T.MeshStandardMaterial({color:0x526567,roughness:1}),edge=new T.MeshStandardMaterial({color:0x77837a,roughness:1}),gold=new T.MeshStandardMaterial({color:0xbb9460,roughness:.65}),dark=new T.MeshStandardMaterial({color:0x243c40,roughness:1});
const glow=new T.MeshBasicMaterial({color:0x70d1c0});
const box=new T.BoxGeometry(1,1,1),pillar=new T.CylinderGeometry(.55,.7,1,8);
const crystalGeometry=new T.OctahedronGeometry(.22),healing=new T.MeshBasicMaterial({color:0x94d49b}),bronze=new T.MeshStandardMaterial({color:0xb08f55,roughness:.8});
export function createPickup(scene,pos,heal=false){const root=new T.Group();root.position.copy(pos).setY(.5);scene.add(root);if(heal)root.add(scaledProp('potion_medium_red',.52));else part(root,crystalGeometry,glow,0,0,0,1,1.4,1);return root}
export function createCompanion(type){const root=new T.Group();const heal=type==='mushroom';part(root,new T.DodecahedronGeometry(.35),stone,0,.65,0,1,1.1,1);part(root,crystalGeometry,heal?healing:glow,0,.72,.3,.7,1,.5);part(root,pillar,bronze,0,.4,0,.55,.12,.55);for(const side of [-1,1])part(root,new T.OctahedronGeometry(.16),gold,side*.42,.65,0,1,1.5,1);const halo=part(root,new T.TorusGeometry(.43,.035,6,16),gold,0,heal?1.05:.25,0,1,1,1);halo.rotation.x=Math.PI/2;return root}
function part(root,geometry,material,x,y,z,sx,sy,sz){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;root.add(o);return o}
export function createWorld(scene){
  scene.background=new T.Color(0x1b303c);scene.fog=new T.Fog(0x1b303c,48,100);
  scene.children.filter(o=>o.isLight).forEach(o=>{o.intensity=o.isHemisphereLight?1.7:2;o.color.set(o.isHemisphereLight?0xb5d8dd:0xffdfb0)});
  part(scene,new T.CylinderGeometry(23.5,24,1.6,64),dark,0,-.88,0,1,1,1);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#354e52';c.fillRect(0,0,1024,1024);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){const shade=60+((x*17+y*23)%17);c.fillStyle=`rgb(${shade},${shade+17},${shade+19})`;c.fillRect(x*64+2,y*64+2,60,60);c.strokeStyle='#556b65';c.beginPath();c.moveTo(x*64+4,y*64+4);c.lineTo(x*64+60,y*64+4);c.stroke()}
  c.strokeStyle='#948569';c.lineWidth=3;for(const r of [210,225,440]){c.beginPath();c.arc(512,512,r,0,Math.PI*2);c.stroke()}
  for(let i=0;i<12;i++){const a=i*Math.PI/6,x=512+Math.cos(a)*220,y=512+Math.sin(a)*220;c.save();c.translate(x,y);c.rotate(a);c.strokeRect(-8,-8,16,16);c.restore()}
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const floor=part(scene,new T.CircleGeometry(23,64),new T.MeshStandardMaterial({map,roughness:1}),0,-.015,0,1,1,1);floor.rotation.x=-Math.PI/2;
  // Boundary masonry is instanced; ornamental geometry stays outside the combat area.
  const blocks=new T.InstancedMesh(box,stone,48),dummy=new T.Object3D();blocks.castShadow=blocks.receiveShadow=true;
  for(let i=0;i<48;i++){const a=i/48*Math.PI*2;dummy.position.set(Math.sin(a)*22,.32,Math.cos(a)*22);dummy.rotation.y=a;dummy.scale.set(2.5,.64,.65);dummy.updateMatrix();blocks.setMatrixAt(i,dummy.matrix)}scene.add(blocks);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=Math.sin(a)*24,z=Math.cos(a)*24,h=i%3===0?3:5.5;
    part(scene,box,edge,x,.25,z,1.8,.5,1.8);part(scene,pillar,stone,x,h/2+.5,z,1,h,1);part(scene,box,gold,x,h+.6,z,1.5,.28,1.5);
    if(i%3!==0){const roof=part(scene,box,edge,x,h+.95,z,3.8,.5,1.4);roof.rotation.y=a}
    const crystal=part(scene,new T.OctahedronGeometry(.24),glow,x,h+1.5,z,1,1.5,1);crystal.rotation.z=.3;
  }
  for(let i=0;i<18;i++){const a=i*2.3999,r=26+(i%4)*2;part(scene,new T.DodecahedronGeometry(1,0),stone,Math.cos(a)*r,.25,Math.sin(a)*r,1.4,.9,1.1)}
  const flame=new T.Group();scene.add(flame);return {flame};
}
export async function loadNatureAssets(scene){
  const loader=new GLTFLoader();for(const name of ['tree_oak','rock_largeA']){const {scene:model}=await loader.loadAsync(`/assets/nature/${name}.glb`);model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.roughness=1;m.color.multiplyScalar(.65)}}});for(let i=0;i<6;i++){const o=model.clone(true),a=(i+.25)/6*Math.PI*2,r=name==='tree_oak'?30:23.5;o.position.set(Math.cos(a)*r,0,Math.sin(a)*r);o.scale.setScalar(name==='tree_oak'?2:1.4);scene.add(o)}}
}
