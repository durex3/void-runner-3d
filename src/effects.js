import * as T from 'three';

export class EffectsSystem{
  constructor({scene,animateActor,disposeActor}){
    this.scene=scene;
    this.animateActor=animateActor;
    this.disposeActor=disposeActor;
    this.effects=[];
    this.corpses=[];
    this.geometry=new T.IcosahedronGeometry(1,0);
    this.materials={
      glow:new T.MeshBasicMaterial({color:0xfbc47b}),
      hurt:new T.MeshBasicMaterial({color:0xff866c}),
    };
  }

  add(object,life,{fixed=false,velocity=new T.Vector3(),dispose=false}={}){
    if(this.effects.length>=180)return false;
    this.scene.add(object);
    this.effects.push({obj:object,life,v:velocity,fixed,dispose});
    return true;
  }

  burst(position,color=0xfbc47b,count=8){
    for(let index=0;index<count&&this.effects.length<180;index++){
      const object=new T.Mesh(this.geometry,color===0xfbc47b?this.materials.glow:this.materials.hurt);
      object.position.set(position.x,.7,position.z);
      object.scale.setScalar(.07);
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
      effect.obj.position.addScaledVector(effect.v,dt);
      if(!effect.fixed)effect.v.y-=dt*8;
    }
    this.effects=this.effects.filter(effect=>{
      if(effect.life>0)return true;
      this.scene.remove(effect.obj);
      if(effect.dispose){
        effect.obj.geometry?.dispose();
        effect.obj.material?.dispose();
      }
      return false;
    });
  }

  clear(){
    for(const effect of this.effects)this.scene.remove(effect.obj);
    for(const corpse of this.corpses)this.disposeActor(corpse.obj);
    this.effects.length=0;
    this.corpses.length=0;
  }
}
