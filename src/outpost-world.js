import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import * as Actors from './actors.js';
import {createWindFieldVisual} from './wind-field.js';
import {SAFE_ZONE_RADIUS} from './wind-field.js';

export async function createOutpostWorld(scene){
  const loader=new GLTFLoader();
  const tent=await loader.loadAsync('/assets/outpost/hiker/Tent.gltf');
  const root=new T.Group();root.name='outpost-world';root.visible=false;
  const base=new T.Mesh(new T.CylinderGeometry(23.5,24,1.4,64),new T.MeshStandardMaterial({color:0x45555a,roughness:1}));
  base.position.y=-.82;base.receiveShadow=true;root.add(base);
  const sandMat=new T.MeshStandardMaterial({color:0x8b8970,roughness:1});
  const floor=new T.Mesh(new T.CircleGeometry(23,64),sandMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.08;root.add(floor);
  const ridgeMat=new T.MeshStandardMaterial({color:0x7a7160,roughness:1});
  const ridgeGeo=new T.DodecahedronGeometry(1,0),ridges=new T.InstancedMesh(ridgeGeo,ridgeMat,24),dummy=new T.Object3D();
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,r=24+(i%3)*1.7;dummy.position.set(Math.cos(a)*r,.2,Math.sin(a)*r);dummy.scale.set(1.8+(i%2),.7,1.2);dummy.rotation.y=a;dummy.updateMatrix();ridges.setMatrixAt(i,dummy.matrix)}
  ridges.castShadow=ridges.receiveShadow=true;root.add(ridges);
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,r=16+(i%2)*2,x=Math.cos(a)*r,z=Math.sin(a)*r;
    const tower=new T.Group();tower.position.set(x,0,z);tower.rotation.y=-a;
    const pole=new T.Mesh(new T.CylinderGeometry(.18,.25,4.2,8),new T.MeshStandardMaterial({color:0x4e6262,roughness:.85}));pole.position.y=2.1;tower.add(pole);
    const sail=new T.Mesh(new T.PlaneGeometry(2.4,1.1),new T.MeshStandardMaterial({color:i%2?0xd88954:0xb6c47e,roughness:1,side:T.DoubleSide}));sail.position.set(0,3.7,.08);sail.rotation.y=.3;sail.rotation.z=.1;tower.add(sail);
    const beacon=new T.Mesh(new T.SphereGeometry(.2,10,6),new T.MeshBasicMaterial({color:0xffd079}));beacon.position.y=4.35;tower.add(beacon);root.add(tower);
  }
  const tentTemplate=tent.scene;tentTemplate.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true}});
  for(const [x,z,s] of [[-13,-12,1.6],[13,-10,1.4],[-12,12,1.2]]){const t=tentTemplate.clone(true);t.position.set(x,0,z);t.scale.setScalar(s);root.add(t)}
  const safeZone=new T.Mesh(new T.CircleGeometry(SAFE_ZONE_RADIUS,64),new T.MeshBasicMaterial({color:0x4fb9ad,transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide}));safeZone.rotation.x=-Math.PI/2;safeZone.position.y=.018;safeZone.renderOrder=1;root.add(safeZone);
  const ring=new T.Mesh(new T.RingGeometry(SAFE_ZONE_RADIUS-.12,SAFE_ZONE_RADIUS,64),new T.MeshBasicMaterial({color:0x9bd9d0,transparent:true,opacity:.65,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.025;ring.renderOrder=3;root.add(ring);
  const wind=createWindFieldVisual();root.add(wind.root);
  scene.add(root);
  return {root,wind,createBoss(){const boss=Actors.createCreature('outpostBoss');boss.name='outpost-clanker';boss.userData.outpostBoss=true;boss.position.set(0,0,-15);return boss},setBossPhase(enemy,phase){const obj=enemy.obj,r=obj.userData.rig;if(!r)return;if(!r.phaseVisual){const group=new T.Group();const ringMat=new T.MeshBasicMaterial({color:0x6be9ff,transparent:true,opacity:.85,depthWrite:false});const coreMat=new T.MeshBasicMaterial({color:0xc9fbff,transparent:true,opacity:.9,depthWrite:false});const ring=new T.Mesh(new T.TorusGeometry(1.15,.055,8,32),ringMat);ring.rotation.x=Math.PI/2;ring.position.y=.16;const core=new T.Mesh(new T.SphereGeometry(.16,12,8),coreMat);core.position.y=2.15;group.add(ring,core);obj.add(group);r.phaseVisual={group,ring,core,ringMat,coreMat};r.ownedGeometries.push(ring.geometry,core.geometry);r.ownedMaterials.push(ringMat,coreMat)}r.phaseVisual.group.visible=phase>=2},animateBoss(enemy,dt,time,speed=0){const obj=enemy.obj,r=obj.userData.rig;Actors.animateActor(obj,dt,time,speed);if(r?.phaseVisual?.group.visible){const pulse=1+.12*Math.sin(time*12);r.phaseVisual.ring.scale.setScalar(pulse);r.phaseVisual.core.scale.setScalar(.85+.2*Math.sin(time*10));r.phaseVisual.ringMat.opacity=.62+.25*(.5+.5*Math.sin(time*9));}obj.position.y=.04+Math.sin(time*3.2)*.035;obj.rotation.z=Math.sin(time*2.2)*.025}};
}
