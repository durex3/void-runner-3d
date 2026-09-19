import * as T from 'three';

const ASSET_ROOT='/assets/effects/kenney/';
const TEXTURES={
  slashShield:'slash_03.png',
  slashHeavy:'trace_01.png',
  dustLight:'dirt_01.png',
  dustHeavy:'dirt_03.png',
  shockwave:'circle_02.png',
  impact:'scorch_01.png',
  combatSword:'/assets/effects/combatfx/sword.png',
  combatHeavy:'/assets/effects/combatfx/heavy.png',
  combatMace:'/assets/effects/combatfx/mace.png',
  combatHit:'/assets/effects/combatfx/hit.png',
  combatAtlas:'/assets/effects/combatfx/combat-sheet.png',
  warriorOne:'/assets/effects/purchased/warrior/warrior-1.png',
  warriorTwo:'/assets/effects/purchased/warrior/warrior-2.png',
};

const STYLE={
  sword_1handed:{slash:'slashShield',atlasRow:2,warriorTexture:null,warriorRow:1,impactTexture:'combatSword',slashSize:6.4,slashAspect:.7,slashLife:.32,slashColor:0xe5faff,reach:1.25,baseAngle:0,impactSize:1.4,impactColor:0xffd08a},
  sword_2handed:{slash:'slashHeavy',impactTexture:'combatHeavy',slashSize:4.6,slashLife:.22,slashColor:0xfff4df,reach:1.45,impactSize:2.4,impactColor:0xffdea3},
  Skeleton_Mace:{slash:'shockwave',atlasRow:6,warriorTexture:null,warriorRow:5,impactTexture:'combatMace',slashSize:6.2,slashLife:.52,slashColor:0x8ff5e9,reach:1.2,dust:'dustLight',dustSize:4,dustColor:0x718f8d,dustOpacity:.56,dustLife:.62,landing:'impact',landingSize:2.8,landingOffset:0,landingColor:0xd8fff7,landingOpacity:.9,landingLife:.34,impactSize:2.2,impactColor:0xd8fff8,coreSize:2.8,coreLife:.28,shards:6,ground:true,echo:true},
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
      if(key==='combatAtlas'||key.startsWith('warrior')){texture.magFilter=T.NearestFilter;texture.minFilter=T.NearestFilter;texture.generateMipmaps=false;}
      this.textures[key]=texture;
    }));
  }

  play({profile,origin,direction,hits=[],actor}){
    const style=STYLE[profile.model];
    if(!style||!this.textures[style.slash])return false;
    const facing=direction.clone().setY(0).normalize();
    const center=origin.clone().addScaledVector(facing,style.reach);
    if(style.ground)this.ground(style.slash,center,facing,style.slashSize,style.slashLife,style.slashColor,'slash');

    if(profile.model==='sword_2handed'){

      if(hits.length){
        const contact=hits.reduce((closest,p)=>p.distanceToSquared(origin)<closest.distanceToSquared(origin)?p:closest,hits[0]);
        this.ground('dustHeavy',contact,facing,3.1,.38,0xb7a58d,'dust',{opacity:.42,start:.5,end:1.05});
        this.ground('impact',contact,facing,1.8,.16,0xe0c29a,'landing',{opacity:.55,start:.55,end:1});
        this.heavyImpact(contact,facing);
      }
    }else if(!style.ground)this.atlasSlash(style,center,facing);
    // A clean painted edge keeps the short sword readable between atlas frames.
    if(profile.model==='sword_1handed')this.blade({...style,slashSize:4.2,slashAspect:.85,slashLife:.24,slashColor:0xe5faff},origin,center,facing);
    if(style.dust)this.ground(style.dust,center.clone().addScaledVector(facing,.35),facing,style.dustSize,style.dustLife??.44,style.dustColor,'dust',{opacity:style.dustOpacity??.4});
    if(style.landing)this.ground(style.landing,center.clone().addScaledVector(facing,style.landingOffset??.75),facing,style.landingSize,style.landingLife??.28,style.landingColor,'landing',{start:.5,end:1.12,opacity:style.landingOpacity??.72});
    if(style.echo)this.ground(style.slash,center,facing,style.slashSize*.62,style.slashLife*.72,0xe9fffc,'shock-core',{start:.35,end:.92,opacity:.78});
    if(style.coreSize)this.sprite('impact',center.clone().setY(.72),style.coreSize,style.coreLife??.18,style.impactColor,'impact-core');
    for(const position of hits){
      this.sprite(style.impactTexture||'impact',position.clone().setY(1),profile.model==='sword_2handed'?1.38:style.impactSize,profile.model==='sword_2handed'?.1:.24,style.impactColor);

    }
    return true;
  }

  heavyImpact(position,direction){
    const group=new T.Group(),side=new T.Vector3(direction.z,0,-direction.x),fragments=[];
    group.position.copy(position).addScaledVector(direction,-.45);group.userData.meleeVfx='heavy-impact';
    group.scale.setScalar(1.2);
    const geometry=new T.OctahedronGeometry(1,0),materials=[];
    // A compact contact flash disappears before the slower debris and dust settle.
    for(let i=0;i<2;i++){
      const material=new T.SpriteMaterial({map:this.textures.slashHeavy,color:0xfff5dc,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending,rotation:i?1.05:-.5});
      const flash=new T.Sprite(material);flash.position.y=.95;flash.scale.set(i?.24:.18,i?1.7:2.3,1);
      group.add(flash);materials.push(material);fragments.push({object:flash,flash:true});
    }
    for(let i=0;i<12;i++){
      const spark=i<8,angle=i*2.39996;
      const material=new T.MeshBasicMaterial({color:spark?(i%3?0xffd58a:0xfffae4):0x858b80,transparent:true,depthWrite:false,toneMapped:false});
      const object=new T.Mesh(geometry,material),width=spark?.055:.085;
      object.position.set(0,spark?.9:.15,0);object.scale.set(width,spark?.24:.12,width);
      const velocity=direction.clone().multiplyScalar(1.3+(i%3)*.7).addScaledVector(side,Math.cos(angle)*(spark?3.2:2));
      velocity.y=spark?1.1+(i%4)*.6:1.3+(i%3)*.35;
      group.add(object);materials.push(material);fragments.push({object,velocity,start:object.position.clone(),spark,width});
    }
    for(const sign of [-1,1]){
      const material=new T.SpriteMaterial({map:this.textures.dustHeavy,color:0xa7a99a,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
      const object=new T.Sprite(material);object.position.y=.13;object.scale.set(0,0,1);
      group.add(object);materials.push(material);fragments.push({object,dust:true,sign});
    }
    const cleanup=()=>{geometry.dispose();materials.forEach(material=>material.dispose());};
    const added=this.effects.add(group,.5,{fixed:true,update:({age,progress})=>{
      for(const fragment of fragments){
        const {object}=fragment;
        if(fragment.flash){object.visible=age<.085;object.material.opacity=.95*Math.max(0,1-age/.085)**2;continue;}
        if(fragment.dust){
          const spread=1-Math.exp(-age*7);
          object.position.copy(side).multiplyScalar(fragment.sign*spread*.95).addScaledVector(direction,spread*.3);object.position.y=.16+age*.2;
          object.scale.set(.4+spread*1.7,.2+spread*.65,1);object.material.opacity=.38*Math.min(1,age/.055)*(1-progress)**1.5;continue;
        }
        object.position.copy(fragment.start).addScaledVector(fragment.velocity,age);object.position.y=Math.max(.06,object.position.y-6*age*age);
        if(fragment.spark){const tangent=fragment.velocity.clone();tangent.y-=12*age;object.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),tangent.normalize());object.scale.y=.24*(1-progress)+.025;}
        else{object.rotation.x=age*8;object.rotation.z=age*5;}
        object.material.opacity=(1-progress)**(fragment.spark?1.5:.6);
      }
    },cleanup});
    if(!added)cleanup();
  }

  beginSwing(actor){
    if(actor.userData.profile?.model!=='sword_2handed')return;
    const rig=actor.userData.rig,weapon=rig.held.children[0],action=rig.attackAction;
    if(!weapon||!action||!this.textures.slashHeavy)return;
    weapon.updateWorldMatrix(true,true);
    const inverse=weapon.matrixWorld.clone().invert(),bounds=new T.Box3();
    weapon.traverse(node=>{if(node.isMesh){node.geometry.computeBoundingBox();bounds.union(node.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,node.matrixWorld)));}});
    const size=bounds.getSize(new T.Vector3()),axis=['x','y','z'].sort((a,b)=>size[b]-size[a])[0],tip=bounds.getCenter(new T.Vector3());
    tip[axis]=Math.abs(bounds.max[axis])>Math.abs(bounds.min[axis])?bounds.max[axis]:bounds.min[axis];
    const root=tip.clone();root[axis]*=.38;
    const trailTip=tip.clone();trailTip[axis]*=1.13;
    const capacity=32,linger=.075,samples=[];
    const geometry=new T.BufferGeometry(),positions=new Float32Array(capacity*6),uvs=new Float32Array(capacity*4),strengths=new Float32Array(capacity*2),indices=[];
    for(let i=0;i<capacity-1;i++){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
    geometry.setIndex(indices);
    geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute('uv',new T.BufferAttribute(uvs,2).setUsage(T.DynamicDrawUsage));
    geometry.setAttribute('strength',new T.BufferAttribute(strengths,1).setUsage(T.DynamicDrawUsage));
    geometry.setDrawRange(0,0);
    const material=new T.ShaderMaterial({
      transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
      vertexShader:`attribute float strength; varying vec2 vUv; varying float vStrength;
        void main(){vUv=uv;vStrength=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec2 vUv; varying float vStrength;
        void main(){float taper=smoothstep(0.0,.65,vUv.x);
          float rim=exp(-pow((vUv.y-.86)/mix(.03,.13,taper),2.0));
          float veil=smoothstep(.3,.8,vUv.y)*(1.0-smoothstep(.86,1.0,vUv.y))*.11;
          vec3 color=mix(vec3(1.0,.68,.32),vec3(1.0,.96,.84),rim);
          gl_FragColor=vec4(color,(rim*.88+veil)*vStrength*taper);}`,
    });
    const trail=new T.Mesh(geometry,material);trail.visible=false;trail.frustumCulled=false;
    // The physical ribbon can become edge-on. A narrow camera-facing rim keeps
    // the tip trajectory legible without drawing the entire slash over the actor.
    const rimGeometry=geometry.clone(),rimPositions=new Float32Array(capacity*6);
    rimGeometry.setAttribute('position',new T.BufferAttribute(rimPositions,3).setUsage(T.DynamicDrawUsage));
    rimGeometry.setAttribute('uv',geometry.attributes.uv);
    rimGeometry.setAttribute('strength',geometry.attributes.strength);
    const rimMaterial=new T.ShaderMaterial({
      transparent:true,depthTest:false,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
      vertexShader:material.vertexShader,
      fragmentShader:`varying vec2 vUv; varying float vStrength;
        void main(){float edge=1.0-smoothstep(.08,.5,abs(vUv.y-.5));
          float tail=smoothstep(0.0,.5,vUv.x);
          gl_FragColor=vec4(1.0,.94,.78,edge*tail*vStrength*.85);}`,
    });
    const rim=new T.Mesh(rimGeometry,rimMaterial);rim.frustumCulled=false;rim.renderOrder=6;trail.add(rim);
    trail.userData.meleeVfx='swing-trail';trail.userData.bladeTrail=true;
    let previous=weapon.localToWorld(tip.clone()),previousPhase=0;
    // Store blade edges in world space so the ribbon follows the chop, not the camera.
    const added=this.effects.add(trail,rig.attackLeft+.12,{fixed:true,update:({dt,age})=>{
      if(actor.userData.rig!==rig||rig.held.children[0]!==weapon||rig.attackAction!==action||rig.dead){samples.length=0;trail.visible=false;return;}
      weapon.updateWorldMatrix(true,true);
      const edge=weapon.localToWorld(tip.clone()),phase=action.time/action.getClip().duration;
      if(phase<previousPhase)samples.length=0;
      while(samples.length&&age-samples[0].age>=linger)samples.shift();
      if(phase>=.4&&phase<=.59&&edge.distanceToSquared(previous)>.000025&&dt>0){
        samples.push({tip:weapon.localToWorld(trailTip.clone()),root:weapon.localToWorld(root.clone()),age});
        if(samples.length>capacity)samples.shift();
      }
      for(let i=0;i<samples.length;i++){
        const sample=samples[i],fade=(1-(age-sample.age)/linger)**1.5;
        sample.root.toArray(positions,i*6);sample.tip.toArray(positions,i*6+3);
        const before=samples[Math.max(0,i-1)].tip,after=samples[Math.min(samples.length-1,i+1)].tip;
        const tangent=after.clone().sub(before),view=this.camera.getWorldDirection(new T.Vector3());
        const across=new T.Vector3().crossVectors(tangent,view);
        if(across.lengthSq()<1e-8)across.set(1,0,0).applyQuaternion(this.camera.quaternion);
        across.normalize().multiplyScalar(.12);
        sample.tip.clone().add(across).toArray(rimPositions,i*6);
        sample.tip.clone().sub(across).toArray(rimPositions,i*6+3);
        uvs.set([i/(samples.length-1||1),0,i/(samples.length-1||1),1],i*4);
        strengths[i*2]=strengths[i*2+1]=fade*(i===0?0:1);
      }
      geometry.setDrawRange(0,Math.max(0,samples.length-1)*6);
      rimGeometry.setDrawRange(0,geometry.drawRange.count);rimGeometry.attributes.position.needsUpdate=true;
      for(const attribute of Object.values(geometry.attributes))attribute.needsUpdate=true;
      trail.visible=samples.length>1;trail.userData.tip=edge.toArray();
      previous.copy(edge);previousPhase=phase;
    },cleanup:()=>{geometry.dispose();material.dispose();rimGeometry.dispose();rimMaterial.dispose();}});
    if(!added){geometry.dispose();material.dispose();rimGeometry.dispose();rimMaterial.dispose();}
  }

  blade(style,origin,center,direction){
    const from=origin.clone().setY(1).project(this.camera),to=origin.clone().add(direction).setY(1).project(this.camera);
    const aspect=this.camera.isPerspectiveCamera?this.camera.aspect:Math.abs((this.camera.right-this.camera.left)/(this.camera.top-this.camera.bottom));
    const screenAngle=Math.atan2(to.y-from.y,(to.x-from.x)*aspect);
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
    const texture=this.textures[style.warriorTexture||'combatAtlas'];if(!texture||style.atlasRow===undefined)return;
    const map=texture.clone();map.needsUpdate=true;const warrior=Boolean(style.warriorTexture);map.repeat.set(warrior?1/2:1/10,warrior?1/5:1/29);map.offset.set(0,warrior?4/5:(29-style.atlasRow)/29);
    const screenFrom=position.clone().project(this.camera),screenTo=position.clone().add(direction).project(this.camera);
    const screenAspect=this.camera.isPerspectiveCamera?this.camera.aspect:Math.abs((this.camera.right-this.camera.left)/(this.camera.top-this.camera.bottom));
    const material=new T.SpriteMaterial({map,color:style.slashColor,transparent:true,opacity:.95,depthWrite:false,depthTest:false,toneMapped:false,blending:T.NormalBlending,rotation:Math.atan2(screenTo.y-screenFrom.y,(screenTo.x-screenFrom.x)*screenAspect)});
    const sprite=new T.Sprite(material);sprite.position.copy(position).setY(style.ground?.16:1.05);sprite.scale.setScalar(style.ground?style.slashSize*.65:style.slashSize*.65);sprite.renderOrder=6;sprite.userData.meleeVfx='slash';
    const added=this.effects.add(sprite,style.slashLife,{fixed:true,update:({object,progress})=>{const frame=Math.min(warrior?9:style.atlasRow===2?4:8,Math.floor(progress*(warrior?10:style.atlasRow===2?5:9)));object.material.map.offset.x=warrior?(frame%2)/2:frame/10;if(warrior)object.material.map.offset.y=(4-Math.floor(frame/2))/5;object.scale.setScalar((style.ground?style.slashSize*.65:style.slashSize*.65)*(1+progress*.12));object.material.opacity=.95*(1-Math.max(0,progress-.7)/.3)},cleanup:object=>{object.material.map.dispose();object.material.dispose()}});
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
