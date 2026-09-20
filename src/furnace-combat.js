import * as T from 'three';
import * as Actors from './actors.js';

export function segmentDistance(point,start,end){
  const x=end.x-start.x,z=end.z-start.z,length=x*x+z*z;
  const t=length?T.MathUtils.clamp(((point.x-start.x)*x+(point.z-start.z)*z)/length,0,1):0;
  return Math.hypot(point.x-start.x-t*x,point.z-start.z-t*z);
}
export function inSlash(point,origin,direction,radius=5.8){
  const delta=new T.Vector3().subVectors(point,origin).setY(0),distance=delta.length();
  return distance<=radius&&(distance<.7||delta.normalize().dot(direction)>=Math.cos(1.05));
}

// Each attacker owns a locked warning, attack and recovery. No homing during a charge.
export class FurnaceCombat{
  constructor(game){this.game=game;this.attacks=new Map()}
  reset(){for(const enemy of this.attacks.keys())this.cancel(enemy)}
  cancel(enemy){
    const attack=this.attacks.get(enemy);
    if(attack?.warning){attack.warning.removeFromParent();attack.warning.geometry.dispose();attack.warning.material.dispose()}
    this.attacks.delete(enemy);enemy.furnaceAction=null;enemy.recovery=0;
  }
  recover(enemy,attack){
    attack.phase='recovery';attack.left=enemy.type==='boss'?2.4:1.3;
    enemy.recovery=attack.left;attack.warning.visible=false;
    if(enemy.type==='boss'){
      this.game.furnaceCycle.suppress();
      this.game.clearObjects(this.game.hazards);
    }
  }
  begin(enemy,kind){
    this.cancel(enemy);
    const origin=enemy.obj.position.clone(),direction=this.game.hero.position.clone().sub(origin).setY(0).normalize();
    if(!direction.lengthSq())direction.set(0,0,1);
    const boss=enemy.type==='boss',length=boss?12:8;
    const geometry=kind==='slash'?new T.CircleGeometry(5.8,48,Math.PI/2-1.05,2.1):kind==='forge'?new T.RingGeometry(1.8,2.1,48):new T.PlaneGeometry(boss?3:2,length+(boss?3:2));
    const warning=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0xffb953,transparent:true,opacity:.35,depthWrite:false,side:T.DoubleSide}));
    warning.rotation.x=-Math.PI/2;
    warning.rotation.z=Math.atan2(direction.x,direction.z)+Math.PI;
    warning.position.copy(origin).setY(.075);
    if(kind==='charge')warning.position.addScaledVector(direction,length/2);
    this.game.scene.add(warning);
    const attack={kind,phase:kind==='forge'?'forge':'warning',left:kind==='forge'?.9:boss?1.2:.95,direction,origin,length,warning,hit:false};
    this.attacks.set(enemy,attack);enemy.furnaceAction=attack;
    enemy.obj.rotation.y=Math.atan2(direction.x,direction.z);
    if(boss){
      this.game.furnaceCycle.suppress();
      if(kind==='forge')this.game.furnaceCycle.ignite(enemy.hp<=enemy.maxHp*.5?8:1);
    }
  }
  step(enemy,dt){
    const game=this.game,boss=enemy.type==='boss';
    let attack=this.attacks.get(enemy);
    if(enemy.hitStop>0){enemy.hitStop=Math.max(0,enemy.hitStop-dt);return}
    if(attack&&attack.phase!=='recovery'&&enemy.push){
      if(boss)enemy.push=null;
      else{this.cancel(enemy);enemy.attack=1.2;return}
    }
    if(enemy.stagger>0&&!boss){
      this.cancel(enemy);enemy.stagger=Math.max(0,enemy.stagger-dt);enemy.attack=1.2;
      Actors.animateActor(enemy.obj,dt,game.state.time,0);return;
    }
    if(!attack){
      const delta=game.hero.position.clone().sub(enemy.obj.position).setY(0),distance=delta.length();delta.normalize();
      enemy.attack-=dt;enemy.slow=Math.max(0,enemy.slow-dt);
      if(enemy.attack<=0&&distance<(boss?17:13)){
        const turn=enemy.furnaceTurn||0;enemy.furnaceTurn=turn+1;
        this.begin(enemy,boss&&turn%3===2?'forge':boss&&distance<6?'slash':'charge');
      }else{
        const speed=(boss?1.6:2.6)*(enemy.slow>0?.55:1);
        if(!enemy.push&&distance>2)enemy.obj.position.addScaledVector(delta,speed*dt);
        enemy.obj.rotation.y=Math.atan2(delta.x,delta.z);
        Actors.animateActor(enemy.obj,dt,game.state.time,distance>2?speed:0);
      }
      return;
    }
    attack.left-=dt;
    let forgeSpeed=0;
    if(attack.phase==='warning'){
      attack.warning.material.opacity=.25+.15*(1+Math.sin(game.state.time*9));
      if(attack.left<=0){
        attack.phase='attack';attack.left=attack.kind==='slash'?.35:.6;
        attack.warning.material.color.setHex(0xff553d);attack.warning.material.opacity=.6;
        if(boss)Actors.playEnemyAttack(enemy.obj,attack.kind==='slash'?'Melee_2H_Attack_Chop':'Melee_2H_Attack_Stab',attack.left);
        else Actors.kickActor(enemy.obj);
        if(attack.kind==='slash'&&inSlash(game.hero.position,attack.origin,attack.direction)){game.hurt(24);attack.hit=true}
      }
    }else if(attack.phase==='attack'){
      if(attack.kind==='charge'){
        const from=enemy.obj.position.clone();
        enemy.obj.position.addScaledVector(attack.direction,attack.length/.6*Math.min(dt,Math.max(0,attack.left+dt)));
        if(enemy.obj.position.length()>20)enemy.obj.position.setLength(20);
        if(!attack.hit&&segmentDistance(game.hero.position,from,enemy.obj.position)<(boss?1.5:1)){game.hurt(boss?22:12);attack.hit=true}
      }
      if(attack.left<=0)this.recover(enemy,attack);
    }else if(attack.phase==='forge'){
      attack.warning.rotation.z+=dt;
      // The vent cycle owns the end time, including while hit-stop pauses the boss.
      if(game.furnaceCycle.phase==='cool')this.recover(enemy,attack);
      else if(attack.left<=0){
        attack.warning.visible=false;
        enemy.slow=Math.max(0,enemy.slow-dt);
        const delta=game.hero.position.clone().sub(enemy.obj.position).setY(0),distance=delta.length();
        if(distance>2.5){
          forgeSpeed=1.2*(enemy.slow>0?.55:1);
          delta.normalize();
          enemy.obj.position.addScaledVector(delta,Math.min(distance-2.5,forgeSpeed*Math.min(dt,-attack.left)));
          enemy.obj.rotation.y=Math.atan2(delta.x,delta.z);
        }
      }
    }else if(attack.phase==='recovery'){
      enemy.recovery=Math.max(0,attack.left);
      if(attack.left<=0){this.cancel(enemy);enemy.attack=boss?1.8:2}
    }
    Actors.animateActor(enemy.obj,dt,game.state.time,attack.phase==='attack'&&attack.kind==='charge'?8:forgeSpeed);
  }
}
