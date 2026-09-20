import * as T from 'three';
import {bossShotAngles} from './boss-combat.js';

export class EffectsSystem{
  constructor({scene,animateActor,disposeActor}){
    this.scene=scene;
    this.animateActor=animateActor;
    this.disposeActor=disposeActor;
    this.effects=[];
    this.corpses=[];
    this.ready=new T.TextureLoader().loadAsync('/assets/effects/kenney/circle_02.png').then(map=>{
      map.colorSpace=T.SRGBColorSpace;
      for(const key of ['glow','hurt','shock'])this.materials[key]=new T.SpriteMaterial({map,color:this.materials[key].color,transparent:true,opacity:.65,depthWrite:false,toneMapped:false});
    });
    this.statusGeometry={
      slow:new T.RingGeometry(.94,1.16,48),
      stagger:new T.OctahedronGeometry(.18,0),
      chargeRing:new T.RingGeometry(.78,.88,40),
      chargeLine:new T.BoxGeometry(.09,.035,1.4),
      chargeArrow:new T.ConeGeometry(.16,.42,3),
      shield:new T.SphereGeometry(1,18,10),
    };
    this.materials={
      glow:new T.MeshBasicMaterial({color:0xfbc47b}),
      hurt:new T.MeshBasicMaterial({color:0xff866c}),
      slow:new T.MeshBasicMaterial({color:0x7ff4ff,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,toneMapped:false}),
      stagger:new T.MeshBasicMaterial({color:0xd9fff7,transparent:true,opacity:.95,depthWrite:false,toneMapped:false}),
      shock:new T.MeshBasicMaterial({color:0x9ff7ee,toneMapped:false}),
      charge:new T.MeshBasicMaterial({color:0xff765d,transparent:true,opacity:.9,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false}),
      chargeTip:new T.MeshBasicMaterial({color:0xffebaf,depthTest:false,depthWrite:false,toneMapped:false}),
      shield:new T.MeshBasicMaterial({color:0x9ff7ee,transparent:true,opacity:.26,wireframe:true,depthWrite:false,toneMapped:false}),
    };
  }

  attachEnemyStatus(enemy){
    const group=new T.Group(),slow=new T.Mesh(this.statusGeometry.slow,this.materials.slow),stagger=new T.Group();
    slow.rotation.x=-Math.PI/2;
    slow.position.y=.08;
    slow.renderOrder=3;
    for(let index=0;index<3;index++){
      const marker=new T.Mesh(this.statusGeometry.stagger,this.materials.stagger),angle=index*Math.PI*2/3;
      marker.position.set(Math.cos(angle)*.72,0,Math.sin(angle)*.72);
      stagger.add(marker);
    }
    stagger.position.y=1.35+Math.min(enemy.size,1.5)*.35;
    slow.visible=stagger.visible=false;
    group.add(slow,stagger);
    enemy.obj.add(group);
    const charge=new T.Group(),ring=new T.Mesh(this.statusGeometry.chargeRing,this.materials.charge);
    ring.rotation.x=-Math.PI/2;ring.position.y=.12;ring.renderOrder=7;charge.add(ring);
    const count=enemy.type==='boss'?10:1;
    for(let i=0;i<count;i++){
      const spoke=new T.Group();spoke.rotation.y=i/count*Math.PI*2;
      const line=new T.Mesh(this.statusGeometry.chargeLine,this.materials.charge);
      line.position.set(0,.12,1.5);line.renderOrder=7;
      const tip=new T.Mesh(this.statusGeometry.chargeArrow,this.materials.chargeTip);
      tip.rotation.x=Math.PI/2;tip.position.set(0,.12,2.3);tip.renderOrder=8;
      spoke.add(line,tip);charge.add(spoke);
    }
    charge.visible=false;group.add(charge);
    const recovery=new T.Mesh(this.statusGeometry.slow,this.materials.stagger);
    recovery.rotation.x=-Math.PI/2;recovery.position.y=.14;recovery.scale.setScalar(enemy.size+.35);recovery.renderOrder=6;recovery.visible=false;group.add(recovery);
    const shield=new T.Mesh(this.statusGeometry.shield,this.materials.shield);
    shield.position.y=.78;shield.scale.setScalar(enemy.size+.55);shield.renderOrder=5;shield.visible=false;group.add(shield);
    enemy.statusVfx={group,slow,stagger,charge,chargeRing:ring,recovery,shield};
  }

  updateEnemyStatus(enemy,time){
    const status=enemy.statusVfx;if(!status)return;
    status.recovery.visible=enemy.recovery>0&&!enemy.dead;
    status.shield.visible=status.recovery.visible;
    if(status.shield.visible){
      status.shield.rotation.y=time*.8;
      status.shield.material.opacity=.2+.07*(.5+.5*Math.sin(time*5));
    }
    status.charge.visible=!!enemy.rangedWindup&&!enemy.dead&&!enemy.stunned;
    if(status.charge.visible){
      const progress=1-Math.max(0,enemy.attack)/enemy.rangedWindup.duration;
      status.chargeRing.scale.setScalar(1.3-.3*progress);
      const fan=enemy.rangedWindup.pattern==='fan';
      status.charge.rotation.y=enemy.type==='boss'&&!fan?-enemy.obj.rotation.y:0;
      if(enemy.type==='boss'){
        const angles=bossShotAngles(enemy.rangedWindup.pattern);
        status.charge.children.slice(1).forEach((spoke,i)=>{spoke.visible=i<angles.length;if(spoke.visible)spoke.rotation.y=angles[i];});
      }
    }
    status.slow.visible=enemy.slow>0;
    status.stagger.visible=enemy.stagger>0;
    if(status.slow.visible){
      const pulse=1+.12*Math.sin(time*8);
      status.slow.scale.setScalar((enemy.size+.45)*pulse);
      status.slow.rotation.z=time*.9;
      status.slow.material.opacity=.68+.22*(.5+.5*Math.sin(time*8));
    }
    if(status.stagger.visible){
      status.stagger.rotation.y=time*5.5;
      status.stagger.position.y=1.35+Math.min(enemy.size,1.5)*.35+Math.sin(time*12)*.06;
      status.stagger.scale.setScalar(.9+Math.min(enemy.size,1.5)*.16);
    }
  }

  add(object,life,{fixed=false,velocity=new T.Vector3(),dispose=false,update=null,cleanup=null}={}){
    if(this.effects.length>=180)return false;
    this.scene.add(object);
    this.effects.push({obj:object,life,maxLife:life,age:0,v:velocity,fixed,dispose,update,cleanup});
    return true;
  }

  burst(position,color=0xfbc47b,count=8){
    for(let index=0;index<count&&this.effects.length<180;index++){
      const material=color===0xfbc47b?this.materials.glow:color===0x9ff7ee?this.materials.shock:this.materials.hurt;
      if(!material.isSpriteMaterial)continue;
      const object=new T.Sprite(material);
      object.position.set(position.x,.7,position.z);
      object.scale.setScalar(.18);
      object.castShadow=object.receiveShadow=true;
      this.add(object,.4+Math.random()*.3,{velocity:new T.Vector3((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6)});
    }
  }

  addCorpse(object,life=1.6){this.corpses.push({obj:object,life})}

  update(dt,time,mode){
    if(['playing','won','lost'].includes(mode)){
      for(const corpse of this.corpses){
        corpse.life-=dt;
        this.animateActor(corpse.obj,dt,time,0);
        if(corpse.life<.35)corpse.obj.position.y-=dt*3;
      }
      this.corpses=this.corpses.filter(corpse=>{
        if(corpse.life>0)return true;
        this.disposeActor(corpse.obj);
        return false;
      });
    }
    if(!['playing','title'].includes(mode))return;
    for(const effect of this.effects){
      effect.life-=dt;
      effect.age+=dt;
      effect.obj.position.addScaledVector(effect.v,dt);
      if(!effect.fixed)effect.v.y-=dt*8;
      effect.update?.({object:effect.obj,dt,age:effect.age,life:effect.life,progress:Math.min(1,effect.age/effect.maxLife)});
    }
    this.effects=this.effects.filter(effect=>{
      if(effect.life>0)return true;
      this.removeEffect(effect);
      return false;
    });
  }

  removeEffect(effect){
    this.scene.remove(effect.obj);
    effect.cleanup?.(effect.obj);
    if(effect.dispose){
      effect.obj.geometry?.dispose();
      effect.obj.material?.dispose();
    }
  }

  clear(){
    for(const effect of this.effects)this.removeEffect(effect);
    for(const corpse of this.corpses)this.disposeActor(corpse.obj);
    this.effects.length=0;
    this.corpses.length=0;
  }
}
