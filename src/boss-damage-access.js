import * as T from 'three';

// Shared Boss damage policy. Access stays open for every weapon; each chapter
// adds a different way to create a better punish window.
export const BOSS_DAMAGE_ACCESS=Object.freeze({
  ruins:{type:'open',label:'骸骨破绽',active:{melee:.8,ranged:.8,device:.8},recovery:{melee:1,ranged:1,device:1}},
  furnace:{type:'pressure',label:'炉脉失衡',active:{melee:.65,ranged:.65,device:.65},recovery:{melee:1,ranged:1,device:1}},
  outpost:{type:'wind-core',label:'风障核心',active:{melee:1,ranged:1,device:1},recovery:{melee:1,ranged:1,device:1},phase2Active:{melee:.5,ranged:.5,device:.5},phase2Recovery:{melee:1,ranged:1,device:1}},
});

const sourceKind=source=>source.effect==='melee'?'melee':source.device?'device':'ranged';
const isCombatSource=source=>source?.weapon!=null||Boolean(source?.device);
export function bossDamageMultiplier(config,enemy,source={}){
  if(enemy?.phaseTransition>0)return 0;
  if(!config||!isCombatSource(source))return 1;
  const phaseTwo=config.type==='wind-core'&&enemy?.bossPhase>=2;
  const table=phaseTwo?(enemy.recovery>0?config.phase2Recovery:config.phase2Active):(enemy?.recovery>0?config.recovery:config.active);
  return table[sourceKind(source)]??1;
}
const mat=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,side:T.DoubleSide,toneMapped:false});

function createVisual(config){
  const root=new T.Group();root.name=`boss-access-${config.type}`;root.renderOrder=4;
  const visual={materials:[],geometries:[],shell:null,core:null,counterShell:null,counterRing:null,arcs:[],sparks:[]};
  const add=(mesh,list)=>{root.add(mesh);visual.materials.push(mesh.material);visual.geometries.push(mesh.geometry);list?.push(mesh);return mesh};
  if(config.type==='wind-core'){
    const shell=add(new T.Mesh(new T.SphereGeometry(2.7,24,16),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.24,depthWrite:false,depthTest:true,side:T.FrontSide,toneMapped:false})));
    shell.position.y=1.5;shell.visible=false;shell.renderOrder=3;visual.shell=shell;
    for(let i=0;i<4;i++){
      const arc=add(new T.Mesh(new T.RingGeometry(2.8,3.15,32,1,0,Math.PI/2-.16),mat(0x71efff,.88)),visual.arcs);
      arc.rotation.x=-Math.PI/2;arc.rotation.z=i*Math.PI/2+.08;arc.position.y=.06;arc.visible=false;arc.renderOrder=6;
    }
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4,spark=add(new T.Mesh(new T.PlaneGeometry(.07,.5),mat(0xd7ffff,.7)),visual.sparks);
      spark.rotation.x=-Math.PI/2;spark.rotation.z=-angle;spark.position.set(Math.cos(angle)*2.15,.08,Math.sin(angle)*2.15);spark.visible=false;spark.renderOrder=7;
    }
    const core=add(new T.Mesh(new T.RingGeometry(.72,1.04,48),mat(0xeaffff,.9)));core.rotation.x=-Math.PI/2;core.position.y=.09;core.visible=false;core.renderOrder=8;visual.core=core;
  }else{
    const shell=add(new T.Mesh(new T.SphereGeometry(2.15,24,16),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.25,wireframe:true,depthWrite:false,depthTest:false,toneMapped:false})));
    shell.position.y=1.15;shell.visible=false;shell.renderOrder=7;visual.counterShell=shell;
    const ring=add(new T.Mesh(new T.RingGeometry(1.45,1.7,40),mat(0xffffff,.9)));ring.rotation.x=-Math.PI/2;ring.position.y=.08;ring.visible=false;ring.renderOrder=8;visual.counterRing=ring;
  }
  root.userData.damageAccessVisual=visual;return root;
}

function disposeVisual(root){
  if(!root)return;root.removeFromParent();const visual=root.userData.damageAccessVisual;
  for(const geometry of new Set(visual?.geometries||[]))geometry.dispose();
  for(const material of new Set(visual?.materials||[]))material.dispose();
}

export class BossDamageAccess{
  constructor(game){this.game=game;this.entries=new Map();this.lastHud=null}
  attach(enemy,chapter){
    const config=BOSS_DAMAGE_ACCESS[chapter];if(!config||!enemy?.obj)return null;
    this.detach(enemy);const visual=createVisual(config);this.game.scene.add(visual);
    const entry={enemy,chapter,config,visual,state:null};
    entry.canDamage=source=>!this.evaluate(enemy,source).blocked;
    entry.getDamageMultiplier=source=>this.evaluate(enemy,source).multiplier;
    entry.update=(dt,time)=>this.updateEntry(entry,dt,time);
    entry.cleanup=()=>this.detach(enemy);
    entry.getHudState=()=>this.hudFor(entry);
    this.entries.set(enemy,entry);enemy.damageAccess=entry;
    if(config.type==='pressure')this.game.showMechanicOnce?.('boss-counter-furnace','引导冲锋穿过燃烧炉栅，让黑骑士失衡');
    if(config.type==='wind-core')this.game.showMechanicOnce?.('boss-counter-outpost','回流风眼期间冲刺穿过金色内圈，再攻击闪光核心可打断爆发');
    return entry;
  }
  detach(enemy){const entry=this.entries.get(enemy);if(!entry)return;disposeVisual(entry.visual);this.entries.delete(enemy);if(enemy.damageAccess===entry)enemy.damageAccess=null}
  reset(){for(const enemy of [...this.entries.keys()])this.detach(enemy);this.lastHud=null}
  hudFor(entry){
    const {enemy,config,state}=entry;
    if(config.type==='open')return {type:'open',label:config.label,status:enemy.stompBaited?'符柱共振 · 破绽扩大':enemy.stompTargetPylon?'符柱被锁定 · 引导践踏后躲开':'引导践踏砸中青色符柱'};
    if(config.type==='pressure')return {type:'pressure',label:config.label,status:enemy.furnaceStaggerWindow>0?'炉脉失衡 · 反击窗口':enemy.furnaceAction?.kind==='charge'?'引导冲锋穿过亮起的炉栅':'观察炉栅 · 等待冲锋'};
    return {type:'wind-core',label:config.label,status:enemy.bossPhase<2?'核心尚未过载 · 正常输出':enemy.counterFlash>0?'破防成功 · 核心暴露':enemy.recovery>0?'风障破裂 · 全力输出':enemy.coreExposed>0?'冲刺穿过金色内圈并攻击核心':enemy.outpostAction?.kind==='vortex'?'冲刺穿过金色内圈并攻击核心':'风障维持 · 寻找反制机会'};
  }
  updateEntry(entry,dt,time=this.game.state.time){
    const {enemy,config}=entry,visual=entry.visual.userData.damageAccessVisual;
    entry.visual.position.set(enemy.obj.position.x,.01,enemy.obj.position.z);
    entry.state={front:false};
    enemy.counterFlash=Math.max(0,(enemy.counterFlash||0)-dt);
    if(config.type!=='wind-core'){
      const flash=enemy.counterFlash>0,pulse=.5+.5*Math.sin(time*20);
      if(visual.counterShell){visual.counterShell.visible=flash;visual.counterShell.material.opacity=flash?.22+.1*pulse:0;visual.counterShell.scale.setScalar(flash?1+.08*pulse:1)}
      if(visual.counterRing){visual.counterRing.visible=flash;visual.counterRing.material.opacity=flash?.65+.25*pulse:0;visual.counterRing.rotation.z=time*3}
    }
    if(config.type==='pressure')entry.state.front=enemy.furnaceAction?.direction?.dot(new T.Vector3(Math.sin(enemy.obj.rotation.y),0,Math.cos(enemy.obj.rotation.y)))>.1;
    if(config.type==='wind-core'){
      const shield=enemy.counterFlash>0;
      if(visual.shell){visual.shell.visible=shield;visual.shell.material.color.setHex(0xffffff);visual.shell.material.opacity=.22+.04*Math.sin(time*12);visual.shell.rotation.y=time*.25}
      visual.arcs.forEach((arc,index)=>{arc.visible=shield;arc.material.color.setHex(0xffffff);arc.rotation.z=index*Math.PI/2+.08+time*(index%2?.45:-.35);arc.material.opacity=.42+.12*Math.sin(time*10+index)});
      visual.sparks.forEach((spark,index)=>{spark.visible=shield;spark.position.y=.08+.06*Math.sin(time*10+index);spark.material.opacity=.5});
      if(visual.core){visual.core.visible=shield;visual.core.material.color.setHex(0xffffff);visual.core.material.opacity=.8;visual.core.scale.setScalar(.9+.1*Math.sin(time*14))}
    }
    return this.hudFor(entry);
  }
  step(dt,time=this.game.state.time){this.lastHud=null;for(const [enemy,entry] of [...this.entries]){if(enemy.dead||!this.game.enemies.includes(enemy)){this.detach(enemy);continue}this.lastHud=entry.update(dt,time)}}
  evaluate(enemy,source={}){
    const entry=this.entries.get(enemy);if(!entry||!isCombatSource(source))return {multiplier:1,blocked:false,reduced:false,reason:null};
    if(enemy.phaseTransition>0)return {multiplier:0,blocked:true,reduced:true,reason:'transition'};
    const kind=sourceKind(source),multiplier=bossDamageMultiplier(entry.config,enemy,source);
    return {multiplier,blocked:false,reduced:multiplier<1,reason:enemy.recovery>0?'recovery':'active',kind};
  }
  getHudState(){return this.lastHud}
}
