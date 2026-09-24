import * as T from 'three';
import {projectile,beam} from './projectiles.js';
import {knightMeleeBonus} from './knight-upgrades.js';

// Combat simulation is independent of input/render timing. No wall-clock timers.
export class WeaponCombat{
  constructor({scene,hero,state,enemies,damage,garden,onFire=()=>{},effect=()=>{},onMeleeImpact=()=>{},onHit=()=>{},onMeleeDiagnostic=()=>{}}){Object.assign(this,{scene,hero,state,enemies,damage,garden,onFire,effect,onMeleeImpact,onHit,onMeleeDiagnostic});this.bullets=[];this.pending=[]}
  reset(){for(const b of this.bullets){this.scene.remove(b.obj);b.obj.userData.dispose?.();}this.bullets.length=0;this.pending.length=0;this.swing=null;for(const e of this.enemies())delete e.push}
  cancelBurst(){this.pending=this.pending.filter(p=>!['burst','melee'].includes(p.kind));this.swing=null}
  targets(){return this.enemies().filter(e=>!e.dead&&!e.stunned)}
  attack(){
    const profile=this.hero.userData.profile;if(!profile)return false;
    const target=this.targets().sort((a,b)=>a.obj.position.distanceToSquared(this.hero.position)-b.obj.position.distanceToSquared(this.hero.position))[0];
    if(!target||target.obj.position.distanceTo(this.hero.position)>(profile.range||15))return false;
    const dir=target.obj.position.clone().sub(this.hero.position).setY(0).normalize();this.hero.rotation.y=Math.atan2(dir.x,dir.z);
    const shot={profile,damage:profile.damage*this.state.damage,dir,origin:this.hero.position.clone(),knocked:new Set()};
    this.state.shot=profile.interval/this.state.rate;this.garden.onShot(profile.type);
    if(profile.effect==='melee'){
      this.onFire(profile);this.swing={dir:dir.clone(),time:profile.interval/this.state.rate};
      shot.target=target;shot.startedAt=this.state.time;shot.startDistance=target.obj.position.distanceTo(this.hero.position);
      shot.startPhase=target.furnaceAction?.phase||'none';
      this.onMeleeDiagnostic({phase:'start',profile,target,time:this.state.time,distance:shot.startDistance,bossPhase:shot.startPhase});
      this.pending.push({kind:'melee',delay:profile.delay/this.state.rate,shot});
    }else if(profile.effect==='nature'){
      const center=target.obj.position.clone();this.onFire(profile,{target:center.clone()});this.garden.pulse(center,0,profile.radius,profile.delay);
      this.pending.push({kind:'impact',delay:profile.delay,center,shot});
    }else if(profile.effect==='chain'){
      this.onFire(profile);const visited=new Set();let next=target,from=this.hero.position.clone().setY(1.2),amount=shot.damage;
      for(let i=0;i<profile.targets&&next;i++){
        const position=next.obj.position.clone(),end=position.clone().setY(1);visited.add(next);
        this.effect(beam(from,end),.16);this.hit(next,amount,profile,true,'electric',shot.origin);this.garden.electrify(position);from=end;amount*=profile.falloff;
        next=this.targets().filter(e=>!visited.has(e)&&e.obj.position.distanceTo(position)<=profile.jumpRange).sort((a,b)=>a.obj.position.distanceToSquared(position)-b.obj.position.distanceToSquared(position))[0];
      }
    }else{
      this.emit(shot);for(let i=1;i<(profile.burst||1);i++)this.pending.push({kind:'burst',delay:i*profile.burstGap/this.state.rate,shot});
    }
    return true;
  }
  emit(shot){
    const p=shot.profile;this.onFire(p,{projectiles:Math.min(p.count,Math.max(0,160-this.bullets.length))});
    for(let i=0;i<p.count&&this.bullets.length<160;i++){
      const dir=shot.dir.clone().applyAxisAngle(new T.Vector3(0,1,0),p.effect==='shotgun'?(i-(p.count-1)/2)*.14:0),v=dir.multiplyScalar(p.speed);
      const obj=projectile(this.hero.position.clone().setY(1),v,p.type,false,p.effect);this.scene.add(obj);
      this.bullets.push({obj,v,life:p.life,weapon:p.type,damage:shot.damage,profile:p,origin:shot.origin.clone(),hit:new Set(),remaining:p.pierce||1,distance:0,knocked:shot.knocked});
    }
  }
  hit(e,amount,profile,electric=false,kind='projectile',origin=this.hero.position){if(e.dead||e.stunned)return;const bonus=electric&&this.garden.combos.has('snare')&&e.slow>0?1.7:1;this.damage(e,amount*bonus,{weapon:profile.type,weaponLabel:profile.label,model:profile.model,effect:profile.effect,origin:origin.clone(),distance:e.obj.position.distanceTo(origin)});this.onHit({profile,enemy:e,position:e.obj.position.clone(),kind:electric?'electric':kind})}
  impact(p){let affected=0;for(const e of this.targets()){if(e.obj.position.distanceTo(p.center)>p.shot.profile.radius)continue;e.slow=Math.max(e.slow||0,p.shot.profile.slow);affected++;this.hit(e,p.shot.damage,p.shot.profile,false,'nature',p.shot.origin)}this.garden.pulse(p.center,0,p.shot.profile.radius,.2);this.onHit({profile:p.shot.profile,position:p.center.clone(),kind:'nature-area',affected})}
  melee(shot){
    const p=shot.profile,hits=[],targets=this.targets().filter(e=>{
      const delta=e.obj.position.clone().sub(this.hero.position).setY(0),distance=delta.length();
      return distance<=p.range&&(distance<=1e-8||delta.normalize().dot(shot.dir)>=Math.cos(p.arc*Math.PI/360));
    });
    const bonus=knightMeleeBonus(this.state,p,targets),upgradeHits=[];
    for(const e of targets){
      hits.push(e.obj.position.clone());
      const pursuit=bonus.pursuit&&e.stagger>0&&!(e.customBoss&&e.furnaceAction)?1.35:1;
      if(pursuit>1)upgradeHits.push(e.obj.position.clone());
      this.hit(e,shot.damage*bonus.damage*pursuit,p,false,'melee',shot.origin);
      if(p.knock)e.push=shot.dir.clone().multiplyScalar(p.knock*bonus.knock*(e.type==='boss'?.15:1));
      if(p.stagger&&!(e.customBoss&&e.furnaceAction))e.stagger=Math.max(e.stagger||0,p.stagger*(e.type==='boss'?.2:1));
    }
    const target=shot.target,delta=target?.obj.position.clone().sub(this.hero.position).setY(0),distance=delta?.length()??Infinity;
    let reason='hit';if(!targets.includes(target)){if(!target||target.dead||target.stunned)reason='target-unavailable';else if(distance>p.range)reason='out-of-range';else if(distance>1e-8&&delta.normalize().dot(shot.dir)<Math.cos(p.arc*Math.PI/360))reason='outside-arc';else reason='target-unavailable'}
    this.onMeleeDiagnostic({phase:'result',profile:p,target,time:this.state.time,distance,startedAt:shot.startedAt,startDistance:shot.startDistance,bossPhase:target?.furnaceAction?.phase||'none',hit:reason==='hit',reason});
    this.onMeleeImpact({profile:p,origin:this.hero.position.clone(),direction:shot.dir.clone(),hits,targets,
      upgrade:bonus.knock>1?'heavySweep':bonus.damage>1?'shieldCounter':upgradeHits.length?'macePursuit':null,upgradeHits});}
  step(dt){
    if(this.swing){this.swing.time-=dt;if(this.swing.time<=0)this.swing=null}
    const ready=[];this.pending=this.pending.filter(p=>{p.delay-=dt;if(p.delay<=0){ready.push(p);return false}return true});
    for(const p of ready){if(p.kind==='impact')this.impact(p);else if(p.kind==='melee')this.melee(p.shot);else this.emit(p.shot)}
    for(const b of this.bullets){
      b.obj.userData.update?.(dt);
      const travel=Math.min(dt,Math.max(0,b.life));b.life-=dt;const prev=b.obj.position.clone();b.obj.position.addScaledVector(b.v,travel);
      const segment=b.obj.position.clone().sub(prev),length=segment.length(),lengthSq=segment.lengthSq(),candidates=[];
      if(!lengthSq)continue;
      for(const e of this.targets()){
        if(b.hit.has(e))continue;const pos=e.obj.position.clone().setY(1),t=T.MathUtils.clamp(pos.clone().sub(prev).dot(segment)/lengthSq,0,1);
        if(prev.clone().addScaledVector(segment,t).distanceTo(pos)<e.size+.15)candidates.push({e,t});
      }
      candidates.sort((a,b)=>a.t-b.t);
      for(const {e,t} of candidates){
        if(b.remaining<=0)break;if(e.dead||e.stunned)continue;b.hit.add(e);
        const distance=b.distance+length*t,p=b.profile,center=e.obj.position.clone();
        const falloff=p.effect==='shotgun'?T.MathUtils.clamp(1-Math.max(0,distance-4)*.075,.55,1):1;
        const hitKind=p.effect==='orb'?'direct':p.effect==='shotgun'?(distance<4?'shotgun-close':'shotgun'):'projectile';
        this.hit(e,b.damage*falloff,p,false,hitKind,b.origin);
        if(p.effect==='shotgun'&&!b.knocked.has(e)){b.knocked.add(e);e.push=b.v.clone().setY(0).normalize().multiplyScalar(e.type==='boss'?1.9:9.5)}
        if(p.effect==='orb'){
          this.garden.pulse(center,2,p.radius,.2);
          for(const other of this.targets())if(other!==e&&other.obj.position.distanceTo(center)<=p.radius)this.hit(other,b.damage*p.splash,p,false,'splash',b.origin);
        }
        b.remaining--;b.damage*=p.falloff||1;if(!b.remaining){b.life=0;break}
      }
      b.distance+=length;
    }
    this.bullets=this.bullets.filter(b=>{if(b.life<=0){this.scene.remove(b.obj);b.obj.userData.dispose?.();return false}return true});
    for(const e of this.targets())if(e.push){
      // A committed furnace attack must stay aligned with its locked ground warning.
      if(e.customBoss&&e.furnaceAction&&e.furnaceAction.phase!=='recovery'){delete e.push;continue}
      e.obj.position.addScaledVector(e.push,(1-Math.exp(-12*dt))/12);e.push.multiplyScalar(Math.exp(-12*dt));if(e.obj.position.length()>20)e.obj.position.setLength(20);if(e.push.lengthSq()<.01)delete e.push;
    }
  }
}
