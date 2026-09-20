import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VENTS,insideVent} from './levels.js';

const NAMES=['floor_tile_large','floor_tile_big_grate','wall','wall_arched','pillar','scaffold_frame_large','banner_red','rocks','torch_mounted'];
export async function createFurnaceWorld(scene){
  const loader=new GLTFLoader(),models=new Map();
  for(const name of NAMES){
    const data=await loader.loadAsync(`/assets/furnace/dungeon/${name}.gltf`);
    if(name.startsWith('floor_tile'))data.scene.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(0x9aaeb6)}});
    data.scene.updateMatrixWorld(true);
    models.set(name,data.scene);
  }
  const root=new T.Group();root.name='furnace-world';root.visible=false;
  // Static architecture shares geometry/materials and is drawn in batches.
  function batch(name,placements){
    models.get(name).traverse(source=>{
      if(!source.isMesh)return;
      const mesh=new T.InstancedMesh(source.geometry,source.material,placements.length);
      mesh.castShadow=mesh.receiveShadow=true;
      const dummy=new T.Object3D(),matrix=new T.Matrix4();
      placements.forEach(([x,y,z,rotation=0,sx=1,sy=1,sz=1],i)=>{
        dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
        mesh.setMatrixAt(i,matrix.multiplyMatrices(dummy.matrix,source.matrixWorld));
      });
      root.add(mesh);
    });
  }
  const base=new T.Mesh(new T.CylinderGeometry(23,23.5,1.4,64),new T.MeshStandardMaterial({color:0x343a40,roughness:1}));
  base.position.y=-.82;base.receiveShadow=true;root.add(base);
  const tiles=[],grates=[];
  for(let x=-22;x<=22;x+=4)for(let z=-22;z<=22;z+=4){
    if(Math.hypot(x,z)>22)continue;
    (VENTS.some(v=>insideVent({x,z},v))?grates:tiles).push([x,-.05,z]);
  }
  batch('floor_tile_large',tiles);batch('floor_tile_big_grate',grates);
  const walls=[],pillars=[],banners=[],torches=[];
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2,x=Math.sin(a)*22.6,z=Math.cos(a)*22.6;
    if(z<-21&&Math.abs(x)<5)continue;
    const rear=x+z<0;
    walls.push([x,0,z,a,1,rear?1:.23,1]);
    if(i%4===0){pillars.push([x,0,z,a,1,rear?1.3:.35,1]);if(rear){banners.push([x,1,z,a+Math.PI]);torches.push([x,2.8,z,a+Math.PI])}}
  }
  batch('wall',walls);batch('pillar',pillars);batch('banner_red',banners);batch('torch_mounted',torches);
  for(const [x,y,z] of torches){
    const ember=new T.Mesh(new T.ConeGeometry(.2,.85,5),new T.MeshBasicMaterial({color:0xff9b45}));
    ember.position.set(x*.97,y+.55,z*.97);root.add(ember);
  }
  batch('wall_arched',[[0,0,-23,0,2,1.6,1.5]]);
  batch('scaffold_frame_large',[[-7,0,-25],[7,0,-25]]);
  batch('rocks',Array.from({length:12},(_,i)=>{const a=i*2.399;return [Math.cos(a)*26,-.1,Math.sin(a)*26,a,1.5,1.5,1.5]}));
  const core=new T.Mesh(new T.PlaneGeometry(5,5),new T.MeshBasicMaterial({color:0xf05e35}));
  core.position.set(0,2.5,-24);root.add(core);
  const central=new T.Mesh(new T.RingGeometry(3.9,4.08,64),new T.MeshBasicMaterial({color:0x70b4b1}));
  central.rotation.x=-Math.PI/2;central.position.y=.025;root.add(central);
  const vents=VENTS.map(v=>{
    const group=new T.Group();group.position.set(v.x,.04,v.z);root.add(group);
    const material=new T.MeshBasicMaterial({color:0xffc761,transparent:true,opacity:.18,depthWrite:false,side:T.DoubleSide});
    const panel=new T.Mesh(new T.PlaneGeometry(v.width,v.depth),material);panel.rotation.x=-Math.PI/2;group.add(panel);
    const outline=new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(v.width,v.depth)),new T.LineBasicMaterial({color:0xffd275}));
    outline.rotation.x=-Math.PI/2;outline.position.y=.01;group.add(outline);
    const stripes=new T.Group();
    for(let i=-6;i<=6;i+=2){
      const stripe=new T.Mesh(new T.PlaneGeometry(.14,3.7),new T.MeshBasicMaterial({color:0xffd275,transparent:true,opacity:.8,depthWrite:false}));
      stripe.rotation.x=-Math.PI/2;stripe.position.set(v.width>v.depth?i:0,.02,v.width>v.depth?0:i);
      if(v.width<v.depth)stripe.rotation.z=Math.PI/2;
      stripes.add(stripe);
    }
    group.add(stripes);
    const flames=new T.InstancedMesh(new T.ConeGeometry(.19,.9,5),new T.MeshBasicMaterial({color:0xff7b38}),16);
    group.add(flames);group.visible=false;
    return {group,panel,outline,stripes,flames,vent:v};
  });
  scene.add(root);
  const dummy=new T.Object3D();
  return {root,update(cycle,time){
    vents.forEach((v,index)=>{
      const active=cycle.active.includes(index),burn=cycle.phase==='burn';v.group.visible=active;
      if(!active)return;
      v.panel.material.color.setHex(burn?0xef4e2d:0xffc761);
      v.panel.material.opacity=burn?.32:.12+.1*(1+Math.sin(time*7));
      v.stripes.visible=!burn;v.flames.visible=burn;
      if(burn){
        for(let i=0;i<16;i++){
          const long=-7+(i%8)*2,short=i<8?-.9:.9;
          dummy.position.set(v.vent.width>v.vent.depth?long:short,.35,v.vent.width>v.vent.depth?short:long);
          dummy.scale.set(1,.65+.4*Math.sin(time*9+i*2),1);dummy.updateMatrix();v.flames.setMatrixAt(i,dummy.matrix);
        }
        v.flames.instanceMatrix.needsUpdate=true;
      }
    });
  }};
}
