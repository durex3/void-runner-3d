import * as T from 'three';

const ROOT='/assets/effects/';
const FILES={hit:'combatfx/hit.png',heavy:'combatfx/heavy.png',mace:'combatfx/mace.png',circle:'kenney/circle_02.png',dust:'kenney/dirt_01.png',scorch:'kenney/scorch_01.png'};
const STYLES={
  crossbow_2handed:{fire:0x9defff,hit:'hit',hitColor:0xb9f7ff,hitSize:1.05},
  bow_withString:{fire:0xffd58a,hit:'hit',hitColor:0xffe0a8,hitSize:1.18},
  crossbow_1handed:{fire:0x91e8ff,hit:'hit',hitColor:0xa9efff,hitSize:.8},
  shotgun:{fire:0xffc26b,hit:'heavy',hitColor:0xffc26b,hitSize:1.5,dust:true},
  druid_staff:{fire:0x9eea98,hit:'circle',hitColor:0x9eea98,hitSize:2.2,nature:true},
  staff:{fire:0xc5a5ff,hit:'mace',hitColor:0xc5a5ff,hitSize:1.25,electric:true},
  wand:{fire:0xe6a6ff,hit:'scorch',hitColor:0xe6a6ff,hitSize:1.2,splash:true},
};

export class RemoteVfx{
  constructor({effects,loader=new T.TextureLoader()}){this.effects=effects;this.textures={};this.geometry=new T.PlaneGeometry(1,1);this.ready=Promise.all(Object.entries(FILES).map(async([key,file])=>{const texture=await loader.loadAsync(ROOT+file);texture.colorSpace=T.SRGBColorSpace;this.textures[key]=texture;}));}
  fire(profile,position,direction){const style=STYLES[profile.model];if(!style)return;const point=position.clone().setY(1).addScaledVector(direction,.48);this.sprite('hit',point,profile.effect==='shotgun'?.55:.34,.12,style.fire,'ranged-fire');}
  hit(profile,position,kind='projectile'){const style=STYLES[profile.model];if(!style)return;const point=position.clone().setY(profile.effect==='nature'?.08:1);if(style.nature){this.ground('circle',point,style.hitSize,.28,style.hitColor,'ranged-area');return}this.sprite(style.hit,point,style.hitSize,.18,style.hitColor,'ranged-hit');if(style.dust)this.sprite('dust',point.clone().setY(.12),1.2,.28,0xd7b98c,'ranged-dust');if(style.splash&&kind==='splash')this.ground('circle',point,1.6,.22,style.hitColor,'ranged-splash');if(style.electric)this.sprite('mace',point,1.05,.16,style.hitColor,'ranged-chain');}
  ground(textureKey,position,size,life,color,kind){const texture=this.textures[textureKey];if(!texture)return;const material=new T.MeshBasicMaterial({map:texture,color,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending,alphaTest:.015});const mesh=new T.Mesh(this.geometry,material);mesh.position.copy(position);mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(size);mesh.renderOrder=4;mesh.userData.remoteVfx=kind;const added=this.effects.add(mesh,life,{fixed:true,update:({object,progress})=>{object.scale.setScalar(size*(.75+progress*.35));object.material.opacity=.7*(1-progress)**1.6},cleanup:object=>object.material.dispose()});if(!added)material.dispose();}
  sprite(textureKey,position,size,life,color,kind){const texture=this.textures[textureKey];if(!texture)return;const material=new T.SpriteMaterial({map:texture,color,transparent:true,opacity:.78,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);sprite.renderOrder=5;sprite.userData.remoteVfx=kind;const added=this.effects.add(sprite,life,{fixed:true,update:({object,progress})=>{object.scale.setScalar(size*(.72+progress*.45));object.material.opacity=.78*(1-progress)**1.8},cleanup:object=>object.material.dispose()});if(!added)material.dispose();}
  dispose(){this.geometry.dispose();for(const texture of Object.values(this.textures))texture.dispose();}
}
