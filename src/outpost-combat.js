import * as T from 'three';
import * as Actors from './actors.js';
import {insideWindLane,WIND_LANES} from './wind-field.js';
import {crossesVortexCore} from './boss-counter-rules.js';
import {BOSS_DAMAGE_ACCESS,bossDamageMultiplier} from './boss-damage-access.js';

export function inOutpostSlash(point,origin,direction,radius=5.8){
  const delta=new T.Vector3().subVectors(point,origin).setY(0),distance=delta.length();
  return distance<=radius&&(distance<.7||delta.normalize().dot(direction)>=Math.cos(1.05));
}

export function outpostRecoveryDuration(kind,profile){
  const melee=profile?.effect==='melee';
  if(kind==='charge')return melee?.65:.45;
  if(kind==='cannon')return melee?1.45:.8;
  if(kind==='rotor')return melee?1.75:1;
  if(kind==='vortex')return melee?1.65:.95;
  if(kind==='overload')return melee?1.9:1.1;
  return melee?(kind==='slash'?1.9:1.7):(kind==='slash'?1.1:1);
}

export function outpostDamageMultiplier(enemy,source={}){
  if(!enemy?.outpostBoss)return 1;
  return bossDamageMultiplier(BOSS_DAMAGE_ACCESS.outpost,enemy,source);
}

export function segmentDistance(point,start,end){
  const line=end.clone().sub(start),lengthSq=line.lengthSq();
  if(lengthSq<1e-6)return point.distanceTo(start);
  const t=T.MathUtils.clamp(point.clone().sub(start).dot(line)/lengthSq,0,1);
  return point.distanceTo(start.clone().addScaledVector(line,t));
}

// Utility-style selection keeps the outpost boss focused on space control:
// cannon teaches lateral escape, rotor controls the orbit, and phase two adds
// vortex/overload instead of recycling the furnace boss's charge/slash loop.
export function chooseOutpostBossSkill(enemy,distance){
  const phase=enemy.bossPhase||1,last=enemy.lastBossSkill,cooldowns=enemy.skillCooldowns||{};
  const score={cannon:distance>4.5?8+Math.min(3,distance-4.5):2,rotor:distance<7?7:3};
  if(phase>=2){score.vortex=distance>2.2&&distance<9?9-Math.abs(distance-5)*.45:1;score.overload=distance>5?8:4}
  let options=Object.keys(score).filter(kind=>(cooldowns[kind]||0)<=0);if(!options.length)options=Object.keys(score);
  options.sort((a,b)=>(score[b]-(b===last?7:0))-(score[a]-(a===last?7:0))||a.localeCompare(b));return options[0];
}

export class OutpostCombat{
  constructor(game){this.game=game;this.attacks=new Map();this.scouts=new Set()}
  reset(){for(const enemy of new Set([...this.attacks.keys(),...this.scouts]))this.cancel(enemy)}
  disposeVisual(node){if(!node)return;node.removeFromParent();node.traverse(child=>{child.geometry?.dispose();for(const material of Array.isArray(child.material)?child.material:[child.material])material?.dispose?.()})}
  cancel(enemy){const attack=this.attacks.get(enemy);if(attack?.warning)this.disposeVisual(attack.warning);if(attack?.indicator)this.disposeVisual(attack.indicator);if(attack?.gust)this.disposeVisual(attack.gust);this.attacks.delete(enemy);this.scouts.delete(enemy);enemy.outpostAction=null;enemy.outpostScout=null;enemy.obj?.userData?.rig&&(enemy.obj.userData.rig.enemyPresentation=null);enemy.recovery=0;enemy.coreExposed=0;enemy.counterFlash=0}
  onDash(from,to){for(const [enemy,attack] of this.attacks){if(attack.kind!=='vortex'||attack.phase!=='attack'||attack.counterWindow>0)continue;if(crossesVortexCore(from,to,enemy.obj.position)){attack.counterWindow=.85;enemy.coreExposed=.85;this.game.view.showToast('穿过内圈风隙 · 趁核心闪光攻击！',.85)}}}
  onBossHit(enemy,source){const attack=this.attacks.get(enemy);if(!attack||attack.kind!=='vortex'||attack.phase!=='attack'||attack.counterWindow<=0||source.weapon==null)return false;attack.countered=true;enemy.counterFlash=.28;this.game.effects.burst(enemy.obj.position,0xe6ffff,18);this.game.cameraKick=Math.max(this.game.cameraKick,.36);this.recover(enemy,attack);return true}
  enterPhaseTwo(enemy){
    if(!enemy?.outpostBoss||enemy.bossPhase>=2)return false;
    this.cancel(enemy);enemy.bossPhase=2;enemy.phaseTransition=1.45;enemy.phase2Pattern=0;enemy.attack=1.05;enemy.recovery=0;enemy.skillCooldowns={cannon:0,rotor:0,vortex:1.8,overload:2.5};
    this.game.outpostWorld.setBossPhase?.(enemy,2);
    this.game.effects.burst(enemy.obj.position,0x71efff,18);
    this.game.cameraKick=Math.max(this.game.cameraKick,.65);this.game.cameraKickDuration=.34;this.game.cameraKickTime=.34;
    this.game.audio.play(110,.2,'sawtooth',.018);
    this.game.view.showToast('Clanker 核心超载 · 回流风眼与风道过载启动',2.4);
    return true;
  }
  stepScout(enemy,dt){
    const game=this.game,hero=game.hero;
    const scout=enemy.outpostScout||(enemy.outpostScout={phase:'chase',left:0,hit:false,direction:new T.Vector3()});this.scouts.add(enemy);
    enemy.slow=Math.max(0,(enemy.slow||0)-dt);enemy.stagger=Math.max(0,(enemy.stagger||0)-dt);
    if(enemy.stagger>0){Actors.animateActor(enemy.obj,dt*.22,game.state.time,0);return true}
    const delta=hero.position.clone().sub(enemy.obj.position).setY(0),distance=delta.length();
    if(scout.phase==='cooldown'){
      scout.left-=dt;if(scout.left<=0)scout.phase='chase';
      enemy.obj.rotation.y=Math.atan2(scout.direction.x,scout.direction.z);Actors.animateActor(enemy.obj,dt,game.state.time,0);return true;
    }
    if(scout.phase==='warning'){
      scout.left-=dt;enemy.obj.rotation.y=Math.atan2(scout.direction.x,scout.direction.z);enemy.obj.userData.rig.enemyPresentation={phase:'warning'};
      Actors.animateActor(enemy.obj,dt,game.state.time,0);
      if(scout.left<=0){scout.phase='charge';scout.left=.42;scout.hit=false;enemy.obj.userData.rig.enemyPresentation=null;Actors.kickActor(enemy.obj,1.35)}
      return true;
    }
    if(scout.phase==='charge'){
      const before=enemy.obj.position.clone();enemy.obj.position.addScaledVector(scout.direction,10.5*dt);if(enemy.obj.position.length()>20)enemy.obj.position.setLength(20);
      const after=enemy.obj.position.clone();if(!scout.hit&&segmentDistance(hero.position,before,after)<enemy.size+.42){scout.hit=true;game.hurt(enemy.contactDamage,'outpost-scout');scout.phase='cooldown';scout.left=.8}
      scout.left-=dt;enemy.obj.rotation.y=Math.atan2(scout.direction.x,scout.direction.z);Actors.animateActor(enemy.obj,dt,game.state.time,10.5);
      if(scout.left<=0&&scout.phase==='charge'){scout.phase='cooldown';scout.left=.8}return true;
    }
    if(distance<8&&distance>2.2&&enemy.attack<=0){scout.direction.copy(delta).normalize();scout.phase='warning';scout.left=.65;enemy.attack=2.5;enemy.obj.userData.rig.enemyPresentation={phase:'warning'};return true}
    if(distance>1.15){delta.normalize();enemy.obj.position.addScaledVector(delta,enemy.speed*(enemy.slow>0?.55:1)*dt)}
    enemy.obj.rotation.y=Math.atan2(delta.x,delta.z);enemy.attack-=dt;enemy.melee=(enemy.melee||0)-dt;
    Actors.animateActor(enemy.obj,dt,game.state.time,distance>1.15?enemy.speed:0);
    if(distance<enemy.size+.45&&enemy.melee<=0){game.hurt(enemy.contactDamage,'outpost-scout-contact');enemy.melee=.8;Actors.kickActor(enemy.obj,1.2)}
    return true;
  }
  createWindSkillVisual(kind,origin,direction){
    const game=this.game,group=new T.Group();group.position.copy(origin).setY(.07);group.renderOrder=8;
    const material=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false,side:T.DoubleSide});
    const ground=mesh=>{mesh.rotation.x=-Math.PI/2;mesh.renderOrder=8;return mesh};
    const ribbons=[],blades=[],rings=[],beacons=[];
    if(kind==='cannon'){
      group.rotation.y=Math.atan2(direction.x,direction.z);group.position.addScaledVector(direction,6.5);
      group.add(ground(new T.Mesh(new T.PlaneGeometry(4.8,13),material(0x80d7df,.2))));
      const edge=new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(4.8,13)),new T.LineBasicMaterial({color:0xc8fbff,transparent:true,opacity:.95,depthTest:false}));edge.rotation.x=-Math.PI/2;edge.renderOrder=9;group.add(edge);
      for(const z of [-4,0,4]){const arrow=new T.Mesh(new T.ConeGeometry(.22,.72,3),material(0xd9ffff,.95));arrow.rotation.x=-Math.PI/2;arrow.position.set(0,.02,z);group.add(arrow);const ribbon=new T.Mesh(new T.PlaneGeometry(.34,2.25),material(0x9ffbff,.65));ribbon.position.set(0,.95,z);ribbon.userData.baseZ=z;ribbon.renderOrder=10;group.add(ribbon);ribbons.push(ribbon)}
    }else if(kind==='rotor'){
      group.add(ground(new T.Mesh(new T.RingGeometry(2.5,6.3,64),material(0xf38f66,.08))));
      group.add(ground(new T.Mesh(new T.PlaneGeometry(1.35,12.4),material(0xff765c,.48))));
      group.add(ground(new T.Mesh(new T.RingGeometry(5.9,6.05,64),material(0xffb089,.9))));
      group.add(ground(new T.Mesh(new T.CircleGeometry(2.2,32),material(0x76ebd2,.1))));
      for(const yaw of [0,Math.PI/2]){const blade=new T.Mesh(new T.BoxGeometry(.28,1.55,11.8),material(0xff9a75,.72));blade.position.y=.82;blade.rotation.y=yaw;blade.userData.baseYaw=yaw;blade.renderOrder=10;group.add(blade);blades.push(blade)}
    }else if(kind==='vortex'){
      group.add(ground(new T.Mesh(new T.CircleGeometry(5.2,64),material(0x63dff4,.13))));
      for(const radius of [2.1,3.55,5.1]){const ring=ground(new T.Mesh(new T.RingGeometry(radius-.08,radius+.08,64),material(radius===3.55?0xffdc7a:0xbaf8ff,radius===3.55?.95:radius===5.1?.95:.55)));group.add(ring);rings.push(ring)}
      for(const y of [.25,.72,1.18]){const torus=new T.Mesh(new T.TorusGeometry(1.25+.18*y,.055,8,32),material(0x9ffbff,.55));torus.rotation.x=Math.PI/2;torus.position.y=y;torus.renderOrder=10;group.add(torus);rings.push(torus)}
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2,arrow=new T.Mesh(new T.ConeGeometry(.22,.72,3),material(0xd6fbff,.95));arrow.position.set(Math.cos(a)*4.35,.02,Math.sin(a)*4.35);arrow.rotation.x=-Math.PI/2;arrow.rotation.z=-a-Math.PI/2;group.add(arrow)}
    }else if(kind==='overload'){
      group.position.set(0,.07,0);
      for(let i=0;i<4;i++){const lane=ground(new T.Mesh(new T.PlaneGeometry(3.2,18),material(i%2?0xffa25c:0x9debf0,.2)));lane.position.x=(i-1.5)*4.2;lane.userData.overloadLane=i;group.add(lane);const dot=new T.Mesh(new T.CircleGeometry(.18,10),material(i%2?0xffdca0:0xc8fbff,.95));dot.rotation.x=-Math.PI/2;dot.position.set((i-1.5)*4.2,.02,.3);dot.userData.overloadLane=i;group.add(dot);const beacon=new T.Mesh(new T.CylinderGeometry(.08,.18,2.1,8),material(i%2?0xffc06d:0x8ff6ff,.72));beacon.position.set((i-1.5)*4.2,1.05,0);beacon.renderOrder=10;beacon.userData.overloadLane=i;group.add(beacon);beacons.push(beacon)}
    }
    group.userData.vfx={kind,ribbons,blades,rings,beacons};game.scene.add(group);return group;
  }
  recover(enemy,attack){const countered=attack.countered===true;attack.phase=countered?'recovery':'resume';attack.left=countered?outpostRecoveryDuration(attack.kind,this.game.hero.userData.profile)+(attack.kind==='vortex'?.8:0):.28;attack.warning.visible=false;enemy.recovery=countered?attack.left:0;enemy.coreExposed=countered?attack.left:0;this.game.view.showToast(countered?(attack.kind==='vortex'?'回流风眼反制成功 · 核心失稳':'反制成功 · Boss 失衡'):`${({cannon:'压缩风炮',rotor:'旋翼扫荡',vortex:'回流风眼',overload:'风道过载',slash:'机械重扫',gust:'压缩阵风',charge:'超载冲锋'})[attack.kind]||attack.kind}已躲开 · 继续压迫`,Math.min(1.35,attack.left))}
  updateWindVfx(attack,time){
    const vfx=attack.warning?.userData?.vfx;if(!vfx)return;
    const active=attack.phase==='attack',pulse=.5+.5*Math.sin(time*(active?16:10));
    for(const ribbon of vfx.ribbons){ribbon.scale.y=.8+.55*pulse;ribbon.position.y=.82+.22*pulse;ribbon.position.z=((time*(active?8:3)+ribbon.userData.baseZ+6.5)%13)-6.5;ribbon.material.opacity=active?.8+.18*pulse:.35+.3*pulse}
    for(const blade of vfx.blades){blade.rotation.y=blade.userData.baseYaw+(active?0:time*.45);blade.scale.y=active?1+.1*pulse:.82+.12*pulse;blade.material.opacity=active?.8+.15*pulse:.36+.22*pulse}
    for(const ring of vfx.rings){ring.rotation.z+=active?.045:.018;ring.scale.setScalar(1+(active?.08:.025)*pulse);ring.material.opacity=active?.78+.18*pulse:.3+.3*pulse}
    for(const beacon of vfx.beacons){const lit=beacon.userData.overloadLane===attack.lane;beacon.scale.y=lit?1.15+.55*pulse:.65+.15*pulse;beacon.material.opacity=lit?.8+.18*pulse:.15+.1*pulse}
  }
  begin(enemy,kind){
    this.cancel(enemy);const game=this.game,origin=enemy.obj.position.clone(),direction=game.hero.position.clone().sub(origin).setY(0).normalize();if(!direction.lengthSq())direction.set(0,0,1);
    if(['cannon','rotor','vortex','overload'].includes(kind)){
      const durations={cannon:1.25,rotor:1.15,vortex:1.35,overload:1.55};
      const attack={kind,phase:'warning',left:durations[kind],direction,origin,warning:this.createWindSkillVisual(kind,origin,direction),hit:false,burst:false,countered:false,counterWindow:0,warningDuration:durations[kind],lane:-1};
      this.attacks.set(enemy,attack);enemy.outpostAction=attack;enemy.direction=direction;enemy.lastBossSkill=kind;enemy.skillCooldowns??={};enemy.skillCooldowns[kind]=({cannon:4.6,rotor:5.2,vortex:7.2,overload:8.5})[kind];
      if(enemy.obj?.userData?.rig)enemy.obj.userData.rig.enemyPresentation=attack;
      game.state.bossStats?.actions&&(game.state.bossStats.actions[kind]=(game.state.bossStats.actions[kind]||0)+1);
      game.audio.play(kind==='vortex'?92:kind==='overload'?76:kind==='cannon'?164:132,.055,'sine',.012);
      if(kind==='vortex')game.showMechanicOnce?.('vortex-counter','回流风眼：冲刺穿过金色内圈，趁核心闪光攻击可打断爆发');
      return;
    }
    // Telegraph geometry stays aligned with the real hit corridor.
    const geometry=kind==='slash'?new T.CircleGeometry(5.8,48,Math.PI/2-1.05,2.1):kind==='gust'?new T.PlaneGeometry(4.8,13):new T.PlaneGeometry(3.2,10);
    const warning=new T.Mesh(geometry,new T.MeshBasicMaterial({color:kind==='slash'?0xf38f66:kind==='charge'?0xff9b3d:0x80d7df,transparent:true,opacity:kind==='charge'?.34:.2,depthWrite:false,side:T.DoubleSide}));
    warning.rotation.x=-Math.PI/2;warning.rotation.z=Math.atan2(direction.x,direction.z)+Math.PI;warning.position.copy(origin).setY(.08);warning.renderOrder=1;
    if(kind!=='slash')warning.position.addScaledVector(direction,kind==='gust'?6.5:5);
    game.scene.add(warning);
    const warningDuration=kind==='slash'?.95:kind==='charge'?.8:1.5;
    const attack={kind,phase:'warning',left:warningDuration,direction,origin,warning,hit:false,warningDuration,chain:kind==='charge'?'slash':null};
    if(kind==='charge'){
      const indicator=new T.Group();indicator.position.copy(origin).setY(.12);indicator.rotation.y=Math.atan2(direction.x,direction.z)+Math.PI;
      const outlineGeo=new T.EdgesGeometry(new T.PlaneGeometry(3.2,10));const outlineMat=new T.LineBasicMaterial({color:0xffb45a,transparent:true,opacity:.95,depthTest:false});const outline=new T.LineSegments(outlineGeo,outlineMat);outline.rotation.x=-Math.PI/2;indicator.add(outline);
      for(const z of [-3.2,0,3.2]){const arrow=new T.Mesh(new T.ConeGeometry(.24,.75,3),new T.MeshBasicMaterial({color:0xffe1a6,transparent:true,opacity:.95,depthTest:false}));arrow.rotation.x=-Math.PI/2;arrow.position.set(0,.03,z);indicator.add(arrow)}
      game.scene.add(indicator);attack.indicator=indicator;attack.indicatorMat=outlineMat;
    }
    if(kind==='gust'){attack.gust=new T.Group();const strip=new T.Mesh(new T.PlaneGeometry(4.8,13),new T.MeshBasicMaterial({color:0x9debf0,transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide}));strip.rotation.x=-Math.PI/2;attack.gust.add(strip);attack.gust.position.copy(origin).setY(.07);attack.gust.rotation.y=Math.atan2(direction.x,direction.z);game.scene.add(attack.gust)}
    this.attacks.set(enemy,attack);enemy.outpostAction=attack;enemy.direction=direction;game.state.bossStats?.actions&&(game.state.bossStats.actions[kind]=(game.state.bossStats.actions[kind]||0)+1);
  }
  step(enemy,dt){
    const game=this.game,attack=this.attacks.get(enemy);enemy.slow=Math.max(0,(enemy.slow||0)-dt);enemy.stagger=Math.max(0,(enemy.stagger||0)-dt);enemy.coreExposed=Math.max(0,(enemy.coreExposed||0)-dt);
    enemy.skillCooldowns??={};for(const kind of ['cannon','rotor','vortex','overload'])enemy.skillCooldowns[kind]=Math.max(0,(enemy.skillCooldowns[kind]||0)-dt);
    if(enemy.bossPhase===1&&enemy.hp<=enemy.maxHp*.5)this.enterPhaseTwo(enemy);
    if(enemy.phaseTransition>0){enemy.phaseTransition=Math.max(0,enemy.phaseTransition-dt);game.outpostWorld.animateBoss(enemy,dt,game.state.time);return}
    if(!attack){const delta=game.hero.position.clone().sub(enemy.obj.position).setY(0),distance=delta.length(),moveSpeed=distance>5.2?1.25:0;if(moveSpeed){delta.normalize();enemy.direction=delta;enemy.obj.position.addScaledVector(delta,moveSpeed*dt)}enemy.obj.rotation.y=Math.atan2(delta.x,delta.z);enemy.attack-=dt;if(enemy.attack<=0){enemy.attack=enemy.bossPhase>=2?1.55:2.15;this.begin(enemy,chooseOutpostBossSkill(enemy,distance))}game.outpostWorld.animateBoss(enemy,dt,game.state.time,moveSpeed);return}
    attack.left-=dt;if(attack.counterWindow>0){attack.counterWindow=Math.max(0,attack.counterWindow-dt);enemy.coreExposed=attack.counterWindow}
    if(attack.phase==='warning'){
      const pulse=.5+.5*Math.sin(game.state.time*(attack.kind==='overload'?12:attack.kind==='cannon'?10:8));
      attack.warning.scale.setScalar(1+.02*pulse);
      attack.warning.traverse(node=>{if(node.material?.opacity!=null&&node.material.transparent)node.material.opacity=Math.min(1,node.material.opacity*(.94+.1*pulse))});
      this.updateWindVfx(attack,game.state.time);
      if(attack.indicator){attack.indicatorMat.opacity=.65+.3*(.5+.5*Math.sin(game.state.time*14));attack.indicator.children.slice(1).forEach((arrow,index)=>{arrow.position.z=((game.state.time*5+index*3.2)%10)-5;arrow.scale.setScalar(1+.25*Math.sin(game.state.time*16+index))})}
      if(attack.left<=0){attack.phase='attack';attack.left=({cannon:1.15,rotor:2.1,vortex:1.2,overload:2.2,slash:.35,charge:.55,gust:1.2})[attack.kind]||1.2;attack.warning.traverse(node=>{if(node.material?.opacity!=null)node.material.opacity=Math.min(1,node.material.opacity*1.7)});Actors.kickActor(enemy.obj,attack.kind==='vortex'?.85:1.15);if(['cannon','rotor','vortex','overload'].includes(attack.kind)){game.effects.burst(enemy.obj.position,attack.kind==='rotor'?0xff8d68:0x83efff,attack.kind==='overload'?18:10);game.cameraKick=Math.max(game.cameraKick,attack.kind==='vortex'?.38:.22);game.cameraKickDuration=.16;game.cameraKickTime=.16}if((attack.kind==='slash'||attack.kind==='charge')&&inOutpostSlash(game.hero.position,attack.origin,attack.direction,attack.kind==='charge'?3.8:5.8)){game.hurt(attack.kind==='charge'?20:24,attack.kind==='charge'?'outpost-charge':'outpost-slash');attack.hit=true}}
    }else if(attack.phase==='attack'){
      this.updateWindVfx(attack,game.state.time);
      if(attack.kind==='cannon'){
        const side=new T.Vector3(-attack.direction.z,0,attack.direction.x),delta=game.hero.position.clone().sub(attack.origin).setY(0),along=delta.dot(attack.direction),lateral=Math.abs(delta.dot(side));
        if(along>0&&along<13&&lateral<2.4){game.hero.position.addScaledVector(attack.direction,3.35*dt);if(game.hero.position.length()>20)game.hero.position.setLength(20);if(!attack.hit){attack.hit=true;game.hurt(10,'outpost-cannon')}}
      }else if(attack.kind==='rotor'){
        const elapsed=2.1-attack.left,radial=game.hero.position.clone().sub(enemy.obj.position).setY(0),distance=radial.length();
        if(distance>2.2&&distance<6.2){const angle=Math.atan2(radial.x,radial.z),phase=angle-elapsed*2.45;if(Math.abs(Math.sin(phase))*distance<.72){if(!attack.hit){attack.hit=true;game.hurt(16,'outpost-rotor')}}}
        attack.warning.rotation.y=elapsed*2.45;
      }else if(attack.kind==='vortex'){
        const delta=enemy.obj.position.clone().sub(game.hero.position).setY(0),distance=delta.length();
        if(distance>1.35&&distance<9.2)game.hero.position.addScaledVector(delta.normalize(),(3.4+2.2*(1-attack.left/1.2))*dt);
        if(!attack.burst&&attack.left<=.16){attack.burst=true;const d=game.hero.position.distanceTo(enemy.obj.position);game.effects.burst(enemy.obj.position,0x8aeeff,22);game.cameraKick=Math.max(game.cameraKick,.5);game.cameraKickDuration=.22;game.cameraKickTime=.22;if(d<5.2){game.hurt(18,'outpost-vortex');const away=game.hero.position.clone().sub(enemy.obj.position).setY(0).normalize();game.hero.position.addScaledVector(away,1.35);if(game.hero.position.length()>20)game.hero.position.setLength(20);attack.hit=true}}
      }else if(attack.kind==='overload'){
        const lane=Math.floor(Math.min(3,(2.2-attack.left)/.48)),x=(lane-1.5)*4.2;attack.lane=lane;if(Math.abs(game.hero.position.x-x)<1.6&&!attack.hit){attack.hit=true;game.hurt(12,'outpost-overload')}
        attack.warning.children.forEach(child=>{if(child.material)child.material.opacity=child.userData.overloadLane===lane?.55+.3*Math.sin(game.state.time*12):.08});
      }else if(attack.kind==='charge'){
        const before=enemy.obj.position.clone();enemy.obj.position.addScaledVector(attack.direction,8.2*dt);if(enemy.obj.position.length()>20)enemy.obj.position.setLength(20);
        if(!attack.hit&&segmentDistance(game.hero.position,before,enemy.obj.position)<1.15){game.hurt(20,'outpost-charge');attack.hit=true}
      }else if(attack.kind==='gust'){
        const delta=game.hero.position.clone().sub(attack.origin).setY(0),along=delta.dot(attack.direction),side=Math.abs(delta.dot(new T.Vector3(-attack.direction.z,0,attack.direction.x)));
        if(along>0&&along<13&&side<2.4){game.hero.position.addScaledVector(attack.direction,3.1*dt);if(game.hero.position.length()>20)game.hero.position.setLength(20);if(!attack.hit){attack.hit=true;game.hurt(10,'outpost-gust')}}
      }
      if(attack.left<=0)this.recover(enemy,attack);
    }else if(attack.phase==='chain'){
      if(attack.left<=0)this.begin(enemy,attack.chain);
    }else if(attack.phase==='recovery'||attack.phase==='resume'){
      enemy.recovery=attack.phase==='recovery'?Math.max(0,attack.left):0;
      if(attack.left<=0){this.cancel(enemy);enemy.attack=.8}
    }
    game.outpostWorld.animateBoss(enemy,dt,game.state.time,attack.kind==='charge'?8.2:0);
  }
}
