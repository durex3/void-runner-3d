import * as T from 'three';

const ROOT='/assets/effects/';
const FILES={leaves:'kenney/nature-leaves.png',rune:'kenney/magic_01.png',spikes:'purchased/spells/spikes.png',lightning:'purchased/spells/lightning.png',explosion:'purchased/spells/explosion.png',atlas:'combatfx/combat-sheet.png',hit:'combatfx/hit.png',heavy:'combatfx/heavy.png',mace:'combatfx/mace.png',circle:'kenney/circle_02.png',dust:'kenney/dirt_01.png',scorch:'kenney/scorch_01.png',fireball:'purchased/spells/fireball.png',icespear:'purchased/spells/icespear.png',thundersphere:'purchased/spells/thundersphere.png',unholy:'purchased/nature/unholy-ground.png'};
const STYLES={
  crossbow_2handed:{fire:0x9defff,fireRow:14,hitRow:15,hitColor:0xb9f7ff,hitSize:3.2},
  bow_withString:{fire:0xffd58a,fireRow:11,hitRow:6,hitColor:0xffe0a8,hitSize:3.8},
  crossbow_1handed:{fire:0x91e8ff,fireRow:4,hitRow:15,hitColor:0xa9efff,hitSize:2.8},
  shotgun:{fire:0xffc26b,fireRow:6,hitRow:6,hitColor:0xffc26b,hitSize:4.5,dust:true,castTexture:'fireball'},
  druid_staff:{fire:0x9eea98,fireRow:28,hitRow:28,hitColor:0x9eea98,hitSize:5,nature:true,castTexture:'unholy'},
  staff:{fire:0xc5a5ff,fireRow:23,hitRow:23,hitColor:0xc5a5ff,hitSize:4,electric:true,castTexture:'thundersphere'},
  wand:{fire:0xe6a6ff,fireRow:26,hitRow:26,hitColor:0xe6a6ff,hitSize:3.8,splash:true,castTexture:'fireball'},
};

export class RemoteVfx{
  constructor({effects,loader=new T.TextureLoader()}){this.effects=effects;this.textures={};this.geometry=new T.PlaneGeometry(1,1);this.ringGeometry=new T.RingGeometry(.34,1,28);this.ready=Promise.all(Object.entries(FILES).map(async([key,file])=>{const texture=await loader.loadAsync(ROOT+file);texture.colorSpace=T.SRGBColorSpace;if(['atlas','fireball','icespear','thundersphere','unholy','spikes','lightning','explosion'].includes(key)){texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;}this.textures[key]=texture;}));}
  fire(profile,position,direction,context){
    const style=STYLES[profile.model];if(!style)return;
    const point=position.clone().setY(1).addScaledVector(direction,.8);
    if(profile.effect==='nature'){this.sprite('rune',point,.95,.18,0xc4ee86,'ranged-cast');if(context?.target)this.natureFlight(point,context.target,profile.delay);return;}
    if(profile.effect==='chain'){this.sprite('thundersphere',point,1.7,.2,0xa4dfff,'ranged-cast');return;}
    if(profile.effect==='orb'){this.sprite('thundersphere',point,1.8,.25,0xdcaaff,'ranged-cast');return;}
    if(['bolt','pierce','mobile'].includes(profile.effect)){this.sprite('dust',point,profile.effect==='pierce'?.8:.45,.12,style.fire,'bow-release');return;}
    this.atlas(style.fireRow,point,1.6,.24,style.fire,'ranged-cast');
  }
  hit(profile,position,kind='projectile'){
    const style=STYLES[profile.model];if(!style)return;
    if(style.nature){if(kind==='nature-area'){this.sprite('circle',position.clone().setY(.45),1.1,.16,0xe3ffd0,'ranged-area');this.natureRoots(position,profile.radius);this.natureBloom(position,profile.radius);}return;}
    if(profile.effect==='pierce'){this.bowImpact(position);return;}
    if(style.electric){this.sheet('lightning',position.clone().setY(1.6),2.1,.22,0xa5d8ff,'ranged-chain');return;}
    if(style.splash){this.atlas(12,position.clone().setY(1),3,.35,0xe0b4ff,'arcane-impact',7);return;}
    if(style.dust){const close=kind==='shotgun-close';this.sheet('explosion',position.clone().setY(1),close?2.45:1.8,close?.42:.34,style.hitColor,'ranged-hit');if(close)this.ground('circle',position.clone().setY(.05),1.15,.3,0xffd28a,'shotgun-blast');return;}
    this.atlas(profile.effect==='pierce'?6:7,position.clone().setY(1),profile.effect==='pierce'?1.65:profile.effect==='mobile'?1.35:2.4,profile.effect==='mobile'?.14:profile.effect==='pierce'?.16:.25,profile.effect==='mobile'?0x92ffc1:style.hitColor,'ranged-hit',profile.effect==='pierce'?6:5);
  }
  bowImpact(position){
    this.atlas(6,position.clone().setY(1),1.2,.12,0xfff1cc,'ranged-hit',6);
    const geometry=new T.OctahedronGeometry(1,0),group=new T.Group(),pieces=[];
    group.position.copy(position).setY(1);group.userData.remoteVfx='bow-splinters';
    for(let i=0;i<6;i++){
      const angle=i*2.39996,velocity=new T.Vector3(Math.cos(angle)*2.2,.6+(i%3)*.5,Math.sin(angle)*2.2);
      const material=new T.MeshBasicMaterial({color:i%2?0xe6bd79:0xfff5d6,transparent:true,depthWrite:false,toneMapped:false});
      const mesh=new T.Mesh(geometry,material);mesh.scale.set(.025,.14,.025);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),velocity.clone().normalize());group.add(mesh);pieces.push({mesh,velocity});
    }
    const cleanup=()=>{geometry.dispose();pieces.forEach(({mesh})=>mesh.material.dispose());};
    if(!this.effects.add(group,.22,{fixed:true,update:({age,progress})=>{for(const {mesh,velocity} of pieces){mesh.position.copy(velocity).multiplyScalar(age);mesh.position.y-=4*age*age;mesh.material.opacity=(1-progress)**1.5;mesh.scale.y=.14*(1-progress)+.02;}},cleanup}))cleanup();
  }

  natureRoots(position,radius){
    const group=new T.Group(),roots=[],materials=[];group.position.copy(position);group.userData.remoteVfx='nature-ring';
    // Curved roots unfold from the impact point, then recede as leaves lift away.
    for(let i=0;i<7;i++){
      const angle=i*Math.PI*2/7,points=[];
      for(let j=0;j<=16;j++){
        const t=j/16,a=angle+Math.sin(t*Math.PI)*.4,r=radius*t*.9;
        points.push(new T.Vector3(Math.cos(a)*r,.1+Math.sin(t*Math.PI)*.12,Math.sin(a)*r));
      }
      const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),24,.026,4,false);
      geometry.setDrawRange(0,0);
      const material=new T.MeshBasicMaterial({color:i%2?0x96cf67:0xd0e99a,transparent:true,opacity:.8,depthWrite:false,toneMapped:false});
      const mesh=new T.Mesh(geometry,material);group.add(mesh);roots.push(mesh);materials.push(material);
    }
    const cleanup=()=>{roots.forEach(mesh=>mesh.geometry.dispose());materials.forEach(material=>material.dispose());};
    if(!this.effects.add(group,.62,{fixed:true,update:({progress})=>{
      const growth=1-(1-Math.min(1,progress/.4))**3,fade=1-Math.max(0,(progress-.35)/.65);
      for(const root of roots){root.geometry.setDrawRange(0,Math.floor(24*growth)*24);root.material.opacity=.8*fade;}
    },cleanup}))cleanup();
  }

  natureFlight(start,end,life){
    const coreGeometry=new T.OctahedronGeometry(.13,0),coreMaterial=new T.MeshBasicMaterial({color:0xe5ffc1,transparent:true,depthWrite:false,toneMapped:false});
    const core=new T.Mesh(coreGeometry,coreMaterial);core.position.copy(start);core.userData.remoteVfx='nature-seed';
    const cleanup=()=>{coreGeometry.dispose();coreMaterial.dispose();};
    if(!this.effects.add(core,life,{fixed:true,update:({progress})=>{
      core.position.copy(start).lerp(end,progress);core.position.y+=Math.sin(progress*Math.PI)*.6;
      core.rotation.set(progress*6,progress*9,0);core.scale.setScalar(.65+Math.sin(progress*Math.PI)*.5);coreMaterial.opacity=1-Math.max(0,(progress-.9)*10);
    },cleanup}))cleanup();
    // Painted leaf clusters carry the cast to the already locked gameplay target.
    for(let i=0;i<4;i++){
      const material=new T.SpriteMaterial({map:this.textures.leaves,transparent:true,depthWrite:false,toneMapped:false,color:0xd9ffb0});
      const sprite=new T.Sprite(material);sprite.scale.set(.46,.32,1);sprite.position.copy(start);sprite.userData.remoteVfx='nature-flight';
      const added=this.effects.add(sprite,life,{fixed:true,update:({progress})=>{
        const t=progress;
        sprite.position.copy(start).lerp(end,t);
        const envelope=Math.sin(t*Math.PI),angle=t*Math.PI*3+i*Math.PI/2;
        sprite.position.y+=envelope*(.6+Math.cos(angle)*.26);
        const dx=end.x-start.x,dz=end.z-start.z,distance=Math.hypot(dx,dz)||1;
        sprite.position.x+=dz/distance*Math.sin(angle)*.36*envelope;
        sprite.position.z-=dx/distance*Math.sin(angle)*.36*envelope;
        material.rotation=angle;material.opacity=1-Math.max(0,(t-.85)/.15);
      },cleanup:()=>material.dispose()});if(!added)material.dispose();
    }
  }
  natureBloom(position,radius){
    for(let i=0;i<7;i++){
      const angle=i*Math.PI*2/7,reach=radius*(i%2?.65:.4);
      const material=new T.SpriteMaterial({map:this.textures.leaves,transparent:true,depthWrite:false,toneMapped:false,color:i%2?0xc8f399:0xffffff});
      const sprite=new T.Sprite(material);sprite.position.copy(position).add(new T.Vector3(Math.cos(angle)*reach,.2,Math.sin(angle)*reach));sprite.scale.set(0,0,1);sprite.userData.remoteVfx='nature-bloom';
      const added=this.effects.add(sprite,.62,{fixed:true,update:({progress})=>{
        const growth=1-(1-Math.min(1,progress/.25))**3,fade=(1-progress)**1.3;
        const spread=reach*(.3+.7*(1-(1-progress)**2));
        sprite.position.set(position.x+Math.cos(angle)*spread,.16+Math.sin(progress*Math.PI)*.65,position.z+Math.sin(angle)*spread);
        sprite.scale.set(.7*growth,.85*growth,1);material.rotation=angle+progress*1.6;material.opacity=fade;
      },cleanup:()=>material.dispose()});if(!added)material.dispose();
    }
  }
  sheet(key,position,size,life,color,kind){
    const map=this.textures[key].clone();map.needsUpdate=true;map.repeat.set(.1,1);
    const material=new T.SpriteMaterial({map,color,transparent:true,depthWrite:false,toneMapped:false});
    const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);sprite.userData.remoteVfx=kind;
    const added=this.effects.add(sprite,life,{fixed:true,update:({progress})=>{map.offset.x=Math.min(9,Math.floor(progress*10))/10;},cleanup:()=>{map.dispose();material.dispose();}});
    if(!added){map.dispose();material.dispose();}
  }
  atlas(row,position,size,life,color,kind,frames=8){const source=this.textures.atlas;if(!source)return;const map=source.clone();map.needsUpdate=true;map.repeat.set(1/10,1/29);map.offset.set(0,(29-row)/29);const material=new T.SpriteMaterial({map,color,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);sprite.renderOrder=5;sprite.userData.remoteVfx=kind;const added=this.effects.add(sprite,life,{fixed:true,update:({object,progress})=>{const frame=Math.min(frames-1,Math.floor(progress*frames));object.material.map.offset.x=frame/10;object.material.opacity=.9*(1-progress)**1.5},cleanup:object=>{object.material.map.dispose();object.material.dispose()}});if(!added){map.dispose();material.dispose()}}
  ground(textureKey,position,size,life,color,kind){const texture=this.textures[textureKey];if(!texture)return;const material=new T.MeshBasicMaterial({map:texture,color,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending,alphaTest:.015});const mesh=new T.Mesh(this.geometry,material);mesh.position.copy(position);mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(size);mesh.renderOrder=4;mesh.userData.remoteVfx=kind;const added=this.effects.add(mesh,life,{fixed:true,update:({object,progress})=>{object.scale.setScalar(size*(.75+progress*.35));object.material.opacity=.7*(1-progress)**1.6},cleanup:object=>object.material.dispose()});if(!added)material.dispose();}
  sprite(textureKey,position,size,life,color,kind){const texture=this.textures[textureKey];if(!texture)return;const material=new T.SpriteMaterial({map:texture,color,transparent:true,opacity:.78,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);sprite.renderOrder=5;sprite.userData.remoteVfx=kind;const added=this.effects.add(sprite,life,{fixed:true,update:({object,progress})=>{object.scale.setScalar(size*(.72+progress*.45));object.material.opacity=.78*(1-progress)**1.8},cleanup:object=>object.material.dispose()});if(!added)material.dispose();}
  dispose(){this.geometry.dispose();this.ringGeometry.dispose();for(const texture of Object.values(this.textures))texture.dispose();}
}
