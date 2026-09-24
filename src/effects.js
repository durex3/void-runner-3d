import * as T from 'three';
import {bossShotAngles} from './boss-combat.js';

export class EffectsSystem{
  constructor({scene,animateActor,disposeActor}){
    this.scene=scene;
    this.animateActor=animateActor;
    this.disposeActor=disposeActor;
    this.effects=[];
    this.corpses=[];
    this.mobileEffects=globalThis.matchMedia?.('(pointer: coarse)').matches??false;
    this.maxEffects=this.mobileEffects?160:180;
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
    this.deviceGeometry={
      beam:new T.CylinderGeometry(.055,.055,1,5),
      muzzle:new T.OctahedronGeometry(.23),
      ring:new T.RingGeometry(.78,1,48),
      flash:new T.OctahedronGeometry(1),
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
    // Only the shared boss counter effect shows a spherical break flash.
    // Ordinary recovery keeps its floor marker without implying a shield.
    status.shield.visible=false;
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
    if(this.effects.length>=this.maxEffects)return false;
    this.scene.add(object);
    this.effects.push({obj:object,life,maxLife:life,age:0,v:velocity,fixed,dispose,update,cleanup});
    return true;
  }

  burst(position,color=0xfbc47b,count=8){
    const density=this.effects.length;
    const limited=this.mobileEffects?(density>=130?Math.min(1,count):density>=90?Math.ceil(count*.5):count):count;
    for(let index=0;index<limited&&this.effects.length<this.maxEffects;index++){
      const material=color===0xfbc47b?this.materials.glow:color===0x9ff7ee?this.materials.shock:this.materials.hurt;
      if(!material.isSpriteMaterial)continue;
      const object=new T.Sprite(material);
      object.position.set(position.x,.7,position.z);
      object.scale.setScalar(.18);
      object.castShadow=object.receiveShadow=true;
      this.add(object,.4+Math.random()*.3,{velocity:new T.Vector3((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6)});
    }
  }

  guardFlash(position,direction=new T.Vector3(0,0,1)){
    const floorGeometry=new T.RingGeometry(.58,.9,40),shieldGeometry=new T.CircleGeometry(.62,28),floorMaterial=new T.MeshBasicMaterial({color:0xb9f7ff,transparent:true,opacity:.95,side:T.DoubleSide,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}),shieldMaterial=new T.MeshBasicMaterial({color:0xb9f7ff,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});
    const group=new T.Group(),floor=new T.Mesh(floorGeometry,floorMaterial),shield=new T.Mesh(shieldGeometry,shieldMaterial),facing=direction.clone().setY(0).normalize();
    floor.rotation.x=-Math.PI/2;floor.position.y=-.82;shield.position.set(0,0,.38);group.add(floor,shield);group.position.copy(position).setY(.86);group.rotation.y=Math.atan2(facing.x,facing.z);group.userData.remoteVfx='guard-flash';
    const added=this.add(group,.34,{fixed:true,update:({progress})=>{const eased=1-(1-progress)**2;group.scale.setScalar(.72+eased*.52);floorMaterial.opacity=.95*(1-progress)**1.8;shieldMaterial.opacity=.82*(1-progress)**1.5;shield.rotation.z=progress*.35},cleanup:()=>{floorGeometry.dispose();shieldGeometry.dispose();floorMaterial.dispose();shieldMaterial.dispose()}});
    if(!added){floorGeometry.dispose();shieldGeometry.dispose();floorMaterial.dispose();shieldMaterial.dispose()}
  }

  addCorpse(object,life=1.6){this.corpses.push({obj:object,life})}

  resistImpact(enemy){
    // A hit confirmation, never a simulated stun or an animation interrupt.
    if(!this.resistMap){
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;
      const context=canvas.getContext('2d');context.font='bold 56px sans-serif';context.textAlign='center';context.textBaseline='middle';
      context.lineWidth=8;context.strokeStyle='#182329';context.strokeText('抵抗',128,48);
      context.fillStyle='#ffe6a3';context.fillText('抵抗',128,48);
      this.resistMap=new T.CanvasTexture(canvas);this.resistMap.colorSpace=T.SRGBColorSpace;
    }
    const material=new T.SpriteMaterial({map:this.resistMap,transparent:true,depthWrite:false,depthTest:false,toneMapped:false});
    const label=new T.Sprite(material);label.scale.set(2.1,.79,1);label.renderOrder=9;
    const height=new T.Box3().setFromObject(enemy.obj).max.y+.45;
    label.position.copy(enemy.obj.position).setY(height);label.userData.feedback='stagger-resist';
    const cleanup=()=>material.dispose();
    if(!this.add(label,.42,{fixed:true,update:({progress})=>{
      label.position.x=enemy.obj.position.x;label.position.z=enemy.obj.position.z;label.position.y=height+progress*.35;
      material.opacity=(1-progress)**.5;label.visible=!enemy.dead;
    },cleanup}))cleanup();
    this.deviceAttack({kind:'resist',origin:enemy.obj.position.clone(),target:enemy.obj.position.clone()});
  }

  deviceAttack({kind,origin,target}){
    if(this.effects.length>=this.maxEffects)return;
    const electric=kind==='electric',explosion=kind==='explosion',color=electric?0x91ddff:kind==='thorn'?0xc9ff9c:kind==='resist'?0xffe6a3:0xffb456;
    const group=new T.Group(),material=new T.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    let lineGeometry=null,lineMaterial=null;
    group.userData.feedback=`device-${kind}`;
    const from=origin.clone().setY(.85),to=(target||origin).clone().setY(1.1);
    if(kind==='thorn'||electric){
      // Damage is hitscan. These short-lived traces show the same resolved shot.
      const points=[from];
      if(electric){
        const side=new T.Vector3().subVectors(to,from).cross(new T.Vector3(0,1,0)).normalize();
        for(let i=1;i<6;i++)points.push(from.clone().lerp(to,i/6).addScaledVector(side,(i%2?1:-1)*.22));
      }
      points.push(to);
      if(electric){
        lineGeometry=new T.BufferGeometry().setFromPoints(points);
        lineMaterial=new T.LineBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false,toneMapped:false});
        const beam=new T.Line(lineGeometry,lineMaterial);beam.renderOrder=5;group.add(beam);
      }else for(let i=1;i<points.length;i++){
        const delta=points[i].clone().sub(points[i-1]),length=delta.length();if(length<.001)continue;
        const beam=new T.Mesh(this.deviceGeometry.beam,material);
        beam.position.copy(points[i-1]).lerp(points[i],.5);beam.scale.y=length;beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());group.add(beam);
      }
      const muzzle=new T.Mesh(this.deviceGeometry.muzzle,material);muzzle.position.copy(from);group.add(muzzle);
    }
    const ring=new T.Mesh(this.deviceGeometry.ring,material);ring.rotation.x=-Math.PI/2;
    ring.position.copy(explosion?origin:to).setY(.16);group.add(ring);
    const flashSize=explosion?.6:.28,flash=new T.Mesh(this.deviceGeometry.flash,material);flash.scale.setScalar(flashSize);flash.position.copy(explosion?from:to);group.add(flash);
    const cleanup=()=>{lineGeometry?.dispose();lineMaterial?.dispose();material.dispose()};
    if(!this.add(group,explosion?.45:.26,{fixed:true,update:({progress})=>{
      const ease=1-(1-progress)**2;ring.scale.setScalar(explosion?.4+2.8*ease:.3+.65*ease);
      flash.scale.setScalar(flashSize*(1-progress));material.opacity=.95*(1-progress)**.7;if(lineMaterial)lineMaterial.opacity=material.opacity;
    },cleanup}))cleanup();
  }

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
