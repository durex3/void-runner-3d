import * as T from 'three';

const ASSET_ROOT='/assets/effects/kenney/';
const TEXTURES={
  slashShield:'slash_03.png',
  slashHeavy:'slash_04.png',
  dustLight:'dirt_01.png',
  dustHeavy:'dirt_03.png',
  shockwave:'circle_02.png',
  impact:'scorch_01.png',
  combatSword:'/assets/effects/combatfx/sword.png',
  combatHeavy:'/assets/effects/combatfx/heavy.png',
  combatMace:'/assets/effects/combatfx/mace.png',
  combatHit:'/assets/effects/combatfx/hit.png',
  combatAtlas:'/assets/effects/combatfx/combat-sheet.png',
};

const STYLE={
  sword_1handed:{slash:'slashShield',atlasRow:14,impactTexture:'combatSword',slashSize:6.4,slashAspect:.7,slashLife:.24,slashColor:0xffdda3,reach:1.25,baseAngle:0,impactSize:1.4,impactColor:0xffd08a},
  sword_2handed:{slash:'slashHeavy',atlasRow:20,impactTexture:'combatHeavy',slashSize:8.2,slashAspect:.56,slashLife:.5,slashColor:0xffc36f,reach:2.15,baseAngle:Math.PI/2,dust:'dustHeavy',dustSize:5.6,dustColor:0xb39b78,dustOpacity:.68,dustLife:.65,landing:'impact',landingSize:4.1,landingColor:0xffb45f,landingOpacity:.94,landingLife:.42,impactSize:2.1,impactColor:0xffc477,shards:3},
  Skeleton_Mace:{slash:'shockwave',atlasRow:23,impactTexture:'combatMace',slashSize:6.2,slashLife:.52,slashColor:0x8ff5e9,reach:1.2,dust:'dustLight',dustSize:4,dustColor:0x718f8d,dustOpacity:.56,dustLife:.62,landing:'impact',landingSize:2.8,landingOffset:0,landingColor:0xd8fff7,landingOpacity:.9,landingLife:.34,impactSize:2.2,impactColor:0xd8fff8,coreSize:2.8,coreLife:.28,shards:6,ground:true,echo:true},
};

export class MeleeVfx{
  constructor({effects,camera,loader=new T.TextureLoader()}){
    this.effects=effects;
    this.camera=camera;
    this.textures={};
    this.planeGeometry=new T.PlaneGeometry(1,1);
    this.ready=Promise.all(Object.entries(TEXTURES).map(async([key,file])=>{
    const texture=await loader.loadAsync(file.startsWith('/')?file:`${ASSET_ROOT}${file}`);
      texture.colorSpace=T.SRGBColorSpace;
      this.textures[key]=texture;
    }));
  }

  play({profile,origin,direction,hits=[]}){
    const style=STYLE[profile.model];
    if(!style||!this.textures[style.slash])return false;
    const facing=direction.clone().setY(0).normalize();
    const center=origin.clone().addScaledVector(facing,style.reach);
    if(style.ground)this.ground(style.slash,center,facing,style.slashSize,style.slashLife,style.slashColor,'slash');
    else this.blade(style,origin,center,facing);
    this.atlasSlash(style,center,facing);
    if(style.dust)this.ground(style.dust,center.clone().addScaledVector(facing,.35),facing,style.dustSize,style.dustLife??.44,style.dustColor,'dust',{opacity:style.dustOpacity??.4});
    if(style.landing)this.ground(style.landing,center.clone().addScaledVector(facing,style.landingOffset??.75),facing,style.landingSize,style.landingLife??.28,style.landingColor,'landing',{start:.5,end:1.12,opacity:style.landingOpacity??.72});
    if(style.echo)this.ground(style.slash,center,facing,style.slashSize*.62,style.slashLife*.72,0xe9fffc,'shock-core',{start:.35,end:.92,opacity:.78});
    if(style.coreSize)this.sprite('impact',center.clone().setY(.72),style.coreSize,style.coreLife??.18,style.impactColor,'impact-core');
    for(const position of hits){
      this.sprite(style.impactTexture||'impact',position.clone().setY(1),style.impactSize,.24,style.impactColor);
      if(style.shards)this.effects.burst(position,profile.model==='Skeleton_Mace'?0x9ff7ee:0xfbc47b,style.shards);
    }
    return true;
  }

  blade(style,origin,center,direction){
    const from=origin.clone().setY(1).project(this.camera),to=origin.clone().add(direction).setY(1).project(this.camera);
    const screenAngle=Math.atan2(to.y-from.y,to.x-from.x);
    const material=new T.SpriteMaterial({map:this.textures[style.slash],color:style.slashColor,transparent:true,opacity:.88,depthWrite:false,depthTest:false,toneMapped:false,blending:T.AdditiveBlending,rotation:screenAngle-style.baseAngle});
    const sprite=new T.Sprite(material);
    sprite.position.copy(center).setY(1.05);
    sprite.scale.set(style.slashSize,style.slashSize*style.slashAspect,1);
    sprite.renderOrder=5;
    sprite.userData.meleeVfx='slash';
    const added=this.effects.add(sprite,style.slashLife,{fixed:true,update:({object,progress})=>{
      const scale=T.MathUtils.lerp(.78,1.08,progress);
      object.scale.set(style.slashSize*scale,style.slashSize*style.slashAspect*scale,1);
      object.material.opacity=.88*(1-progress)**1.35;
    },cleanup:object=>object.material.dispose()});
    if(!added)material.dispose();
  }

  atlasSlash(style,position,direction){
    const texture=this.textures.combatAtlas;if(!texture||style.atlasRow===undefined)return;
    const map=texture.clone();map.needsUpdate=true;map.repeat.set(1/10,1/29);map.offset.set(0,(29-style.atlasRow)/29);
    const material=new T.SpriteMaterial({map,color:style.slashColor,transparent:true,opacity:.72,depthWrite:false,depthTest:false,toneMapped:false,blending:T.AdditiveBlending,rotation:-Math.atan2(direction.x,direction.z)});
    const sprite=new T.Sprite(material);sprite.position.copy(position).setY(style.ground?.16:1.05);sprite.scale.setScalar(style.ground?style.slashSize*.58:style.slashSize*.5);sprite.renderOrder=6;sprite.userData.meleeVfx='combat-atlas-slash';
    const added=this.effects.add(sprite,style.slashLife,{fixed:true,update:({object,progress})=>{const frame=Math.min(7,Math.floor(progress*8));object.material.map.offset.x=frame/10;object.scale.setScalar((style.ground?style.slashSize*.58:style.slashSize*.5)*(1+progress*.12));object.material.opacity=.72*(1-progress)**1.4},cleanup:object=>{object.material.map.dispose();object.material.dispose()}});
    if(!added){map.dispose();material.dispose();}
  }

  ground(textureKey,position,direction,size,life,color,kind,{start=.78,end=1.08,opacity=kind==='dust'?.4:.9}={}){
    const material=new T.MeshBasicMaterial({map:this.textures[textureKey],color,transparent:true,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false,alphaTest:.015,blending:kind==='dust'?T.NormalBlending:T.AdditiveBlending});
    const mesh=new T.Mesh(this.planeGeometry,material);
    mesh.position.copy(position).setY(kind==='dust'?.075:.11);
    mesh.rotation.x=-Math.PI/2;
    mesh.rotation.z=-Math.atan2(direction.x,direction.z);
    mesh.scale.setScalar(size*start);
    mesh.renderOrder=4;
    mesh.userData.meleeVfx=kind;
    const added=this.effects.add(mesh,life,{fixed:true,update:({object,progress})=>{
      const scale=size*T.MathUtils.lerp(start,end,progress);
      object.scale.setScalar(scale);
      object.material.opacity=opacity*(1-progress)**1.45;
    },cleanup:object=>object.material.dispose()});
    if(!added)material.dispose();
  }

  sprite(textureKey,position,size,life,color,kind='impact'){
    const material=new T.SpriteMaterial({map:this.textures[textureKey],color,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending,rotation:Math.random()*Math.PI});
    const sprite=new T.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.setScalar(size*.65);
    sprite.renderOrder=5;
    sprite.userData.meleeVfx=kind;
    const added=this.effects.add(sprite,life,{fixed:true,update:({object,progress})=>{
      object.scale.setScalar(size*T.MathUtils.lerp(.65,1.2,progress));
      object.material.opacity=.95*(1-progress)**1.7;
    },cleanup:object=>object.material.dispose()});
    if(!added)material.dispose();
  }

  dispose(){
    this.planeGeometry.dispose();
    for(const texture of Object.values(this.textures))texture.dispose();
  }
}
