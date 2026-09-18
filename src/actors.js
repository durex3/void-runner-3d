import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {HEROES} from './loadouts.js';
export {HEROES} from './loadouts.js';

const loader=new GLTFLoader(), models=new Map(), weapons=new Map(), clips=new Map(),props=new Map();
const propNames=['turret_base','arrow_crossbow_bundle','potion_large_orange','potion_large_blue','potion_medium_red','spellbook_open','spellbook_closed'];
export function cloneProp(name){const source=props.get(name)||weapons.get(name);if(!source)throw new Error(`Prop not loaded: ${name}`);return source.clone(true)}
const characterNames=['Ranger','Knight','Druid','Engineer','Skeleton_Warrior','Skeleton_Rogue','Skeleton_Mage','Skeleton_Golem','Necromancer'];
const weaponNames=[...new Set(Object.values(HEROES).flatMap(h=>h.weapons.flatMap(w=>[w.model,...(w.offhand?[w.offhand]:[])]))),'Skeleton_Blade','Skeleton_Dagger','Skeleton_Staff','Skeleton_Golem_Axe'];
export async function preloadActors(progress=()=>{}){
  let done=0;
  const jobs=[...characterNames.map(name=>({name,kind:'characters',ext:'glb',map:models})),...weaponNames.map(name=>({name,kind:'weapons',ext:'gltf',map:weapons})),...['Medium','Large'].flatMap(rig=>['General','MovementBasic'].map(action=>({name:`Rig_${rig}_${action}`,kind:'animations',ext:'glb',rig})))];
  jobs.push(...propNames.map(name=>({name,kind:'props',ext:'gltf',map:props})));
  jobs.push({name:'Rig_Medium_CombatMelee',kind:'animations',ext:'glb',rig:'Medium'});
  // A small queue avoids simultaneous image decoding spikes on mobile devices.
  let index=0;
  const results=await Promise.allSettled(Array.from({length:3},async()=>{
    while(index<jobs.length){
      const job=jobs[index++],data=await loader.loadAsync(`/assets/kaykit/${job.kind}/${job.name}.${job.ext}`);
      if(job.map){data.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material]){const definition=data.parser.json.materials?.find(item=>item.name===m.name);if(definition?.pbrMetallicRoughness?.baseColorTexture&&!m.map)throw new Error(`Texture missing: ${job.name}/${m.name}`);m.roughness=.85;m.metalness=0}}});job.map.set(job.name,data.scene)}
      else{const list=clips.get(job.rig)||new Map();for(const clip of data.animations)list.set(clip.name,clip);clips.set(job.rig,list)}
      progress(++done,jobs.length);
    }
  }));
  const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;
}

const normalize=name=>name.toLowerCase().replace(/[^a-z]/g,'');
function bone(model,name){let result;model.traverse(o=>{if(normalize(o.name)===normalize(name))result=o});return result}
const layers=new Map();
function layeredClip(r,name,layer){const rig=r.large?'Large':'Medium',original=clips.get(rig).get(name);if(!original||layer==='full')return original;const key=`${rig}:${name}:${layer}`;if(!layers.has(key)){const upper=track=>/^(spine|chest|neck|head|upperarm|lowerarm|wrist|hand|thumb|index|middle|ring|pinky)/i.test(track.name);layers.set(key,new T.AnimationClip(`${name}:${layer}`,original.duration,original.tracks.filter(t=>upper(t)===(layer==='upper'))))}return layers.get(key)}
function action(r,name,once=false,layer='full'){
  const clip=layeredClip(r,name,layer);
  if(!clip)return null;
  const a=r.mixer.clipAction(clip);a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
  a.setLoop(once?T.LoopOnce:T.LoopRepeat,once?1:Infinity);a.clampWhenFinished=once;a.play();return a;
}
function locomotion(r,name){
  if(r.current===name)return;
  const old=r.base;r.current=name;r.base=action(r,name,false,r.layered?'lower':'full');
  if(old&&old!==r.base){old.fadeOut(.15);r.base.fadeIn(.15)}
}
function mountWeapon(actor,name){
  const r=actor.userData.rig;r.held.clear();const template=weapons.get(name);
  if(template){const w=template.clone(true);r.held.add(w)}
}
function install(actor,name){
  const previous=actor.userData.rig;
  if(previous){disposeRig(previous);previous.model.removeFromParent()}
  const model=clone(models.get(name));actor.add(model);
  const large=name==='Skeleton_Golem';
  const bounds=new T.Box3().setFromObject(model),height=bounds.getSize(new T.Vector3()).y;
  model.scale.setScalar((large?3.65:2.05)/height);
  const held=new T.Group();const slot=bone(model,'handslot.r');(slot||model).add(held);
  const offhand=new T.Group();bone(model,'handslot.l').add(offhand);
  const r={model,name,large,held,offhand,layered:name==='Knight',mixer:new T.AnimationMixer(model),phase:0,kick:0,current:null,base:null,dead:false,hit:0,attackLeft:0,
    legs:[bone(model,'upperleg.l'),bone(model,'upperleg.r')],arms:[bone(model,'upperarm.l'),bone(model,'upperarm.r')],forearms:[bone(model,'lowerarm.l'),bone(model,'lowerarm.r')],wrists:[bone(model,'wrist.l'),bone(model,'wrist.r')],chest:bone(model,'chest'),overlay:[]};
  actor.userData.rig=r;locomotion(r,'Idle_A');r.mixer.update(0);
}
export function createHero(scene){const hero=new T.Group();hero.userData.isHero=true;install(hero,'Ranger');scene.add(hero);equipActor(hero,0);return {hero}}
export function selectHero(hero,name){if(!HEROES[name])return false;install(hero,name);equipActor(hero,0);return true}
export function equipActor(actor,slot=0){const profile=HEROES[actor.userData.rig.name]?.weapons[slot];if(!profile)return false;actor.userData.weapon=profile.type;actor.userData.weaponModel=profile.model;actor.userData.loadout=slot;actor.userData.profile=profile;const r=actor.userData.rig;bone(r.model,profile.grip==='bow'?'handslot.l':'handslot.r').add(r.held);mountWeapon(actor,profile.model);r.offhand.clear();if(profile.offhand)r.offhand.add(weapons.get(profile.offhand).clone(true));if(r.layered){r.attackAction?.stop();r.upperIdle?.stop();r.attackLeft=0;r.held.quaternion.identity();r.upperIdle=action(r,profile.stance,false,'upper')}return true}
export function createCreature(type){
  const root=new T.Group();root.userData.type=type;
  install(root,({brute:'Skeleton_Warrior',runner:'Skeleton_Rogue',spitter:'Skeleton_Mage',boss:'Skeleton_Golem',necromancer:'Necromancer'})[type]||'Skeleton_Warrior');
  mountWeapon(root,({brute:'Skeleton_Blade',runner:'Skeleton_Dagger',spitter:'Skeleton_Staff',boss:'Skeleton_Golem_Axe',necromancer:'Skeleton_Staff'})[type]);return root;
}
export function kickActor(actor,rate=1){const r=actor.userData.rig;if(!r||r.dead)return;r.kick=1;if(r.layered){const p=actor.userData.profile;r.attackAction?.stop();r.upperIdle?.stop();r.attackAction=action(r,p.animation,true,'upper');r.attackLeft=p.interval/rate;r.attackAction.timeScale=r.attackAction.getClip().duration/r.attackLeft;r.attackAction.fadeIn(.045);r.attackClip=p.animation}}
export function hitActor(actor,strength=.55){const r=actor.userData.rig;if(!r||r.dead||r.hit>0)return;const duration=.16+strength*.14;r.hit=duration;r.hitAction=action(r,r.layered&&actor.userData.profile?.offhand?'Melee_Block_Hit':'Hit_A',true,r.layered?'upper':'full');if(r.hitAction){r.hitAction.time=Math.min(.08,r.hitAction.getClip().duration*.22);r.hitAction.setEffectiveWeight(strength);r.hitAction.fadeOut(duration)}}
export function dieActor(actor){const r=actor.userData.rig;if(!r||r.dead)return;r.dead=true;r.mixer.stopAllAction();action(r,'Death_A',true)}
export function resetActor(actor){const r=actor.userData.rig;restore(r);r.dead=false;r.kick=r.hit=r.attackLeft=0;r.mixer.stopAllAction();r.current=null;locomotion(r,'Idle_A');actor.visible=true}
function disposeRig(r){r.mixer.stopAllAction();r.mixer.uncacheRoot(r.model);const skeletons=new Set();r.model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton)});for(const skeleton of skeletons)skeleton.dispose()}
export function disposeActor(actor){disposeRig(actor.userData.rig);actor.removeFromParent()}
function restore(r){for(const [b,q] of r.overlay)b.quaternion.copy(q);r.overlay.length=0}
function pose(r,b,x,y=0,z=0){if(!b)return;r.overlay.push([b,b.quaternion.clone()]);b.rotateX(x);b.rotateY(y);b.rotateZ(z)}
function pointBone(actor,r,b,child,target){
  if(!b||!child)return;
  actor.updateMatrixWorld(true);
  const origin=b.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(origin).normalize();
  const to=actor.localToWorld(target.clone()).sub(origin).normalize();
  const world=new T.Quaternion().setFromUnitVectors(from,to).multiply(b.getWorldQuaternion(new T.Quaternion()));
  r.overlay.push([b,b.quaternion.clone()]);b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));
}
export function animateActor(actor,dt,time,speed=0){
  const r=actor.userData.rig;if(!r)return;restore(r);
  if(!r.dead){locomotion(r,speed>.05?(speed>2.5?'Running_A':'Walking_A'):'Idle_A');r.base.timeScale=speed>.05?T.MathUtils.clamp(speed/(speed>2.5?5:1.8),.5,2):1}
  r.mixer.update(dt);r.phase+=dt;r.hit=Math.max(0,r.hit-dt);
  if(r.dead)return;
  if(r.layered){r.attackLeft=Math.max(0,r.attackLeft-dt);if(!r.attackLeft&&r.attackAction){r.attackAction.stop();r.attackAction=null;r.upperIdle=action(r,actor.userData.profile.stance,false,'upper')}return}
  r.kick=Math.max(0,r.kick-dt*4.5);
  // Only the upper body is layered procedurally; the supplied rig drives the feet.
  const armed=actor.userData.isHero,melee=armed?actor.userData.weapon===3:['brute','runner','boss'].includes(actor.userData.type);
  const swing=Math.sin((1-r.kick)*Math.PI)*Number(r.kick>0);
  const grip=actor.userData.profile?.grip;
  if(armed&&!melee&&actor.userData.weapon!==2){
    for(let i=0;i<2;i++){if(grip==='oneHand'&&i===0)continue;const shoulder=actor.worldToLocal(r.arms[i].getWorldPosition(new T.Vector3()));
      pointBone(actor,r,r.arms[i],r.forearms[i],new T.Vector3(shoulder.x,shoulder.y-.04,.26-r.kick*.06));
      pointBone(actor,r,r.forearms[i],r.wrists[i],new T.Vector3(i===1?-.12:.12,shoulder.y+.02,grip==='bow'?(i===0?.65:.28+r.kick*.15):.65-r.kick*.12));
    }
  }
  if(armed&&actor.userData.weapon===2){
    const shoulder=actor.worldToLocal(r.arms[1].getWorldPosition(new T.Vector3()));
    pointBone(actor,r,r.arms[1],r.forearms[1],new T.Vector3(-.36,shoulder.y-.13,.12));
    pointBone(actor,r,r.forearms[1],r.wrists[1],new T.Vector3(-.4,shoulder.y-.08,.45));
    if(r.kick>0)pose(r,r.arms[0],-.45*swing);
  }
  if(melee&&r.kick>0){
    pose(r,r.chest,0,-.25+.6*swing);
    const shoulder=actor.worldToLocal(r.arms[1].getWorldPosition(new T.Vector3()));
    pointBone(actor,r,r.arms[1],r.forearms[1],new T.Vector3(-.25+.65*swing,shoulder.y+.1,.3));
    pointBone(actor,r,r.forearms[1],r.wrists[1],new T.Vector3(-.4+.9*swing,shoulder.y+.12,.75));
  }
  if(!armed&&!melee&&r.kick>0)pose(r,r.arms[1],-.6*swing);
  // KayKit's hand-slot axes differ from weapon mesh axes; keep the muzzle forward.
  actor.updateMatrixWorld(true);
  const facing=actor.getWorldQuaternion(new T.Quaternion());
  if(grip==='bow')facing.multiply(new T.Quaternion(-.5,-.5,-.5,.5));
  if(grip==='wand')facing.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
  if(melee)facing.multiply(new T.Quaternion().setFromEuler(new T.Euler(r.kick>0?.2+swing*1.9:.15,0,r.kick>0?-.5+swing: .35)));
  r.held.quaternion.copy(r.held.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(facing));
}
