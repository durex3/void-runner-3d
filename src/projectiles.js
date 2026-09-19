import * as T from 'three';
import {TextureLoader} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
const projectileTextures={};
const projectileModels={};
const flightFrames={};
let projectileCamera;
export function setProjectileCamera(camera){projectileCamera=camera;}
export async function preloadProjectileAssets(){const loader=new TextureLoader();for(const [key,file] of Object.entries({core:'/assets/effects/kenney/flare_01.png',boltLine:'/assets/effects/kenney/spark_06.png',trail:'/assets/effects/kenney/trace_01.png',aura:'/assets/effects/kenney/circle_02.png',orb:'/assets/effects/purchased/spells/fireball.png',chain:'/assets/effects/purchased/spells/thundersphere.png',ice:'/assets/effects/purchased/spells/icespear.png',shot:'/assets/effects/purchased/spells/fireball.png',burst:'/assets/effects/purchased/spells/thundersphere.png'})){const texture=await loader.loadAsync(file);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;projectileTextures[key]=texture;}for(const [key,prefix,count] of [['orb','Fireball',9],['burst','Thundersphere',8]]){flightFrames[key]=[];for(let i=1;i<=count;i++){const t=await loader.loadAsync(`/assets/effects/purchased/spells/${prefix}${i}.png`);t.colorSpace=T.SRGBColorSpace;t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;flightFrames[key].push(t);}}
// Reframe the supplied flare around its painted core; retain the original file.
const orbCore=projectileTextures.core.clone();orbCore.repeat.set(.22,.22);orbCore.offset.set(.39,.39);orbCore.needsUpdate=true;projectileTextures.orbCore=orbCore;
// Remove horizontal transparent padding from the painted streak.
projectileTextures.trail.repeat.set(.24,1);projectileTextures.trail.offset.set(.38,0);
projectileTextures.trail.magFilter=T.LinearFilter;projectileTextures.trail.minFilter=T.LinearFilter;
flightFrames.arcane=[projectileTextures.aura];
const lightning=await loader.loadAsync('/assets/effects/purchased/spells/lightning.png');lightning.colorSpace=T.SRGBColorSpace;lightning.repeat.set(.1,1);lightning.offset.x=.4;projectileTextures.chain=lightning;
const gltf=new GLTFLoader();for(const [key,file] of Object.entries({arrow:'/assets/effects/projectiles/arrow_bow.gltf',bolt:'/assets/effects/projectiles/arrow_crossbow.gltf'})){const data=await gltf.loadAsync(file);projectileModels[key]=data.scene;}}
export function projectile(position,velocity,weapon=0,enemy=false,effect='bolt'){const g=new T.Group();g.position.copy(position);g.rotation.y=Math.atan2(velocity.x,velocity.z);const orb=effect==='orb',shotgun=effect==='shotgun',pierce=effect==='pierce',mobile=effect==='mobile',burst=effect==='burst';const asset=projectileTextures[enemy?'orb':orb?'orb':shotgun?'shot':burst?'burst':effect==='chain'?'chain':null];if(asset){const sprite=new T.Sprite(new T.SpriteMaterial({map:asset,color:enemy?0xff654b:orb?0xc58cff:shotgun?0xffc26b:burst?0xffa052:pierce?0xffd58a:0x9eeaff,transparent:true,opacity:.78,depthWrite:false,toneMapped:false,blending:T.NormalBlending}));sprite.scale.set(orb?2.8:shotgun?.85:1.8,orb?1.4:shotgun?.425:.9,1);let core;
if(orb){sprite.material.map=projectileTextures.aura;sprite.scale.set(1.45,1.45,1);core=new T.Sprite(new T.SpriteMaterial({map:projectileTextures.orbCore,color:0xe9bfff,transparent:true,opacity:.88,depthWrite:false,toneMapped:false}));core.scale.setScalar(1.15);g.add(core);}
if(projectileCamera){const a=position.clone().project(projectileCamera),b=position.clone().add(velocity.clone().normalize()).project(projectileCamera);sprite.material.rotation=Math.atan2(b.y-a.y,b.x-a.x)};let age=0;g.userData.update=dt=>{age+=dt;if(core){sprite.material.rotation=age*2;sprite.scale.setScalar(1.4+Math.sin(age*12)*.12);core.scale.setScalar(1+Math.sin(age*12)*.1);}const frames=flightFrames[orb?'arcane':shotgun?'orb':'burst'];sprite.material.map=frames[Math.floor(age*18)%frames.length];};g.userData.dispose=()=>{sprite.material.dispose();core?.material.dispose();};sprite.userData.projectileAsset=true;g.add(sprite);return g}const model=projectileModels[enemy?null:pierce?'arrow':(effect==='bolt'||mobile)?'bolt':null];if(model){
  const arrow=cloneSkeleton(model);
  const bounds=new T.Box3().setFromObject(arrow),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const length=pierce?1.6:mobile?1.25:1.65,scale=length/size.z;
  arrow.scale.set(scale*(pierce?1:mobile?1.1:1.65),scale*(pierce?1:mobile?1.1:1.65),scale);arrow.position.copy(center).multiplyScalar(-scale);
  const materials=[];
  arrow.traverse(node=>{if(node.isMesh){node.material=node.material.clone();node.material.emissive?.set(pierce?0x66502b:mobile?0x24543b:0x315664);node.material.emissiveIntensity=.7;materials.push(node.material);}});
  arrow.userData.projectileAsset=true;g.add(arrow);
  if(pierce){
    const material=new T.SpriteMaterial({map:projectileTextures.orbCore,color:0xfff2ce,transparent:true,opacity:.75,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
    const glint=new T.Sprite(material);glint.position.z=length*.46;glint.scale.setScalar(.23);g.add(glint);materials.push(material);
  }
  const trail=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:projectileTextures.trail,color:pierce?0xffe3a8:mobile?0x85e6ba:0x91d9f7,transparent:true,opacity:pierce?.55:.95,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  const trailLength=pierce?2.25:mobile?1.6:2,trailWidth=pierce?.52:mobile?1.2:2.6;
  const ghosts=[];
  if(mobile)for(let i=0;i<2;i++){
    const ghost=cloneSkeleton(arrow);ghost.position.z-=.65*(i+1);ghost.scale.multiplyScalar(.85-i*.12);
    ghost.traverse(node=>{if(node.isMesh){node.material=node.material.clone();node.material.transparent=true;node.material.opacity=.42-i*.14;node.material.depthWrite=false;materials.push(node.material);}});
    g.add(ghost);ghosts.push(ghost);
  }
  let age=0;
  g.userData.update=dt=>{
    age+=dt;const extent=trailLength*Math.min(1,age/.075);
    trail.position.z=-length*.3-extent*.5;trail.scale.set(trailWidth,extent,1);
    const along=new T.Vector3(0,0,1),normal=projectileCamera?projectileCamera.getWorldDirection(new T.Vector3()).negate().applyQuaternion(g.quaternion.clone().invert()):new T.Vector3(0,1,0);
    const across=new T.Vector3().crossVectors(along,normal);if(across.lengthSq()<1e-8)across.set(1,0,0);across.normalize();normal.crossVectors(across,along).normalize();
    trail.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(across,along,normal));
  };
  g.add(trail);g.userData.update(0);
  g.userData.dispose=()=>{trail.geometry.dispose();trail.material.dispose();materials.forEach(m=>m.dispose());};return g;
}return g}
export function beam(start,end){
  const group=new T.Group(),map=projectileTextures.boltLine;if(!map)return group;
  const delta=end.clone().sub(start),plane=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
  // Local Y is the strip length. Build a camera-facing basis explicitly so
  // both ends remain anchored for every world direction (including elevation).
  const length=delta.length();
  if(length<1e-6){plane.geometry.dispose();plane.material.dispose();return group;}
  const along=delta.clone().divideScalar(length);
  const normal=projectileCamera?projectileCamera.getWorldDirection(new T.Vector3()).negate():new T.Vector3(0,1,0);
  const across=new T.Vector3().crossVectors(along,normal);
  if(across.lengthSq()<1e-8)across.crossVectors(along,Math.abs(along.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0));
  across.normalize();normal.crossVectors(across,along).normalize();
  plane.position.copy(start).lerp(end,.5);
  plane.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(across,along,normal));
  plane.scale.set(1.3,length,1);group.add(plane);
  group.userData.dispose=()=>{plane.geometry.dispose();plane.material.dispose()};return group;
}
