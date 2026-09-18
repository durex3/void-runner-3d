import * as T from 'three';

const ROOT='/assets/effects/';
const FILES={atlas:'combatfx/combat-sheet.png',hit:'combatfx/hit.png',heavy:'combatfx/heavy.png',mace:'combatfx/mace.png',circle:'kenney/circle_02.png',dust:'kenney/dirt_01.png',scorch:'kenney/scorch_01.png'};
const STYLES={
  crossbow_2handed:{fire:0x9defff,fireRow:14,hitRow:15,hitColor:0xb9f7ff,hitSize:3.2},
  bow_withString:{fire:0xffd58a,fireRow:11,hitRow:6,hitColor:0xffe0a8,hitSize:3.8},
  crossbow_1handed:{fire:0x91e8ff,fireRow:4,hitRow:15,hitColor:0xa9efff,hitSize:2.8},
  shotgun:{fire:0xffc26b,fireRow:6,hitRow:6,hitColor:0xffc26b,hitSize:4.5,dust:true},
  druid_staff:{fire:0x9eea98,fireRow:28,hitRow:28,hitColor:0x9eea98,hitSize:5,nature:true},
  staff:{fire:0xc5a5ff,fireRow:23,hitRow:23,hitColor:0xc5a5ff,hitSize:4,electric:true},
  wand:{fire:0xe6a6ff,fireRow:26,hitRow:26,hitColor:0xe6a6ff,hitSize:3.8,splash:true},
};

export class RemoteVfx{
  constructor({effects,loader=new T.TextureLoader()}){this.effects=effects;this.textures={};this.geometry=new T.PlaneGeometry(1,1);this.ready=Promise.all(Object.entries(FILES).map(async([key,file])=>{const texture=await loader.loadAsync(ROOT+file);texture.colorSpace=T.SRGBColorSpace;this.textures[key]=texture;}));}
  fire(profile,position,direction){const style=STYLES[profile.model];if(!style)return;const point=position.clone().setY(profile.effect==='nature'?.08:1).addScaledVector(direction,.48);this.atlas(style.fireRow,point,profile.effect==='shotgun'?2.5:2.1,.34,style.fire,'ranged-fire');}
  hit(profile,position,kind='projectile'){const style=STYLES[profile.model];if(!style)return;const point=position.clone().setY(profile.effect==='nature'?.08:1);if(style.nature){this.atlas(style.hitRow,point,style.hitSize,.46,style.hitColor,'ranged-area');return}this.atlas(style.hitRow,point,style.hitSize,.4,style.hitColor,'ranged-hit');if(style.dust)this.sprite('dust',point.clone().setY(.12),1.65,.38,0xd7b98c,'ranged-dust');if(style.splash&&kind==='splash')this.atlas(28,point,2.4,.34,style.hitColor,'ranged-splash');if(style.electric)this.atlas(29,point,1.7,.28,style.hitColor,'ranged-chain');}
  atlas(row,position,size,life,color,kind,frames=8){const source=this.textures.atlas;if(!source)return;const map=source.clone();map.needsUpdate=true;map.repeat.set(1/10,1/29);map.offset.set(0,(29-row)/29);const material=new T.SpriteMaterial({map,color,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);sprite.renderOrder=5;sprite.userData.remoteVfx=kind;const added=this.effects.add(sprite,life,{fixed:true,update:({object,progress})=>{const frame=Math.min(frames-1,Math.floor(progress*frames));object.material.map.offset.x=frame/10;object.material.opacity=.9*(1-progress)**1.5},cleanup:object=>{object.material.map.dispose();object.material.dispose()}});if(!added){map.dispose();material.dispose()}}
  ground(textureKey,position,size,life,color,kind){const texture=this.textures[textureKey];if(!texture)return;const material=new T.MeshBasicMaterial({map:texture,color,transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide,toneMapped:false,blending:T.AdditiveBlending,alphaTest:.015});const mesh=new T.Mesh(this.geometry,material);mesh.position.copy(position);mesh.rotation.x=-Math.PI/2;mesh.scale.setScalar(size);mesh.renderOrder=4;mesh.userData.remoteVfx=kind;const added=this.effects.add(mesh,life,{fixed:true,update:({object,progress})=>{object.scale.setScalar(size*(.75+progress*.35));object.material.opacity=.7*(1-progress)**1.6},cleanup:object=>object.material.dispose()});if(!added)material.dispose();}
  sprite(textureKey,position,size,life,color,kind){const texture=this.textures[textureKey];if(!texture)return;const material=new T.SpriteMaterial({map:texture,color,transparent:true,opacity:.78,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});const sprite=new T.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);sprite.renderOrder=5;sprite.userData.remoteVfx=kind;const added=this.effects.add(sprite,life,{fixed:true,update:({object,progress})=>{object.scale.setScalar(size*(.72+progress*.45));object.material.opacity=.78*(1-progress)**1.8},cleanup:object=>object.material.dispose()});if(!added)material.dispose();}
  dispose(){this.geometry.dispose();for(const texture of Object.values(this.textures))texture.dispose();}
}
