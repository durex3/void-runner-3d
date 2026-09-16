import * as T from 'three';
import {cloneProp} from './actors.js';

const stone=new T.MeshStandardMaterial({color:0x52656c,roughness:.9}),brass=new T.MeshStandardMaterial({color:0xb39459,roughness:.6,metalness:.2});
const baseGeo=new T.CylinderGeometry(.54,.62,.14,8),ringGeo=new T.TorusGeometry(.56,.025,5,32);
const clampGeo=new T.BoxGeometry(.08,.3,.14);
const normalized=new Map();
const accents=[0x7ddac1,0xf0a353,0xb7a0ed].map(color=>new T.MeshBasicMaterial({color}));
export function scaledProp(name,size){const key=`${name}:${size}`;if(!normalized.has(key)){const object=cloneProp(name),bounds=new T.Box3().setFromObject(object),extent=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());const scale=size/Math.max(extent.x,extent.y,extent.z,.001);object.scale.multiplyScalar(scale);object.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);const group=new T.Group();group.add(object);normalized.set(key,group)}return normalized.get(key).clone(true)}
export function createRelic(type,packed=false){
  const root=new T.Group();root.userData.relicType=type;root.userData.packed=packed;
  if(packed){const prop=scaledProp(['arrow_crossbow_bundle','potion_large_orange','spellbook_closed'][type],.6);prop.position.y=.22;root.add(prop);const aura=new T.Mesh(ringGeo,accents[type]);aura.rotation.x=-Math.PI/2;aura.scale.setScalar(.48);aura.position.y=.04;root.add(aura);return root}
  const base=new T.Mesh(baseGeo,stone);base.position.y=.08;base.receiveShadow=true;root.add(base);
  const ring=new T.Mesh(ringGeo,accents[type]);ring.rotation.x=-Math.PI/2;ring.position.y=.16;root.add(ring);
  if(type===0){const stand=scaledProp('turret_base',.8);stand.position.y=.12;root.add(stand);const top=scaledProp('crossbow_2handed',1.15);top.position.y=.64;root.add(top);root.userData.mount=top}
  else if(type===1){const bottle=scaledProp('potion_large_orange',.85);bottle.position.y=.15;root.add(bottle);for(const x of [-.38,.38]){const clamp=new T.Mesh(clampGeo,brass);clamp.position.set(x,.3,0);root.add(clamp)}}
  else{const book=scaledProp('spellbook_open',.9);book.position.set(0,.65,0);book.rotation.x=.35;root.add(book);const charge=scaledProp('potion_large_blue',.38);charge.position.set(0,.16,0);root.add(charge);root.userData.mount=book}
  root.traverse(o=>{if(o.isMesh)o.castShadow=true});return root;
}
