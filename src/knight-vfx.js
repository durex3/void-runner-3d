import * as T from 'three';

function label(text,color){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const context=canvas.getContext('2d'),map=new T.CanvasTexture(canvas);
  map.colorSpace=T.SRGBColorSpace;
  const material=new T.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
  const sprite=new T.Sprite(material);sprite.scale.set(3.6,.9,1);sprite.renderOrder=12;
  let previous='';
  const draw=value=>{if(value===previous)return;previous=value;context.clearRect(0,0,512,128);
    context.font='bold 64px sans-serif';context.textAlign='center';context.textBaseline='middle';
    context.lineWidth=12;context.strokeStyle='#13282f';context.strokeText(value,256,64);
    context.fillStyle=color;context.fillText(value,256,64);map.needsUpdate=true;};
  draw(text);return {sprite,draw,dispose:()=>{map.dispose();material.dispose()}};
}

// Mesh ribbons have real width in the world; WebGL lines stay roughly one pixel.
function impactMark(kind){
  const positions=[];
  const stroke=(ax,ay,bx,by,width)=>{
    const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy),nx=-dy/length*width,ny=dx/length*width;
    const mx=ax+dx*.35,my=ay+dy*.35;
    positions.push(ax,ay,0,mx+nx,my+ny,0,bx,by,0,ax,ay,0,bx,by,0,mx-nx,my-ny,0);
  };
  if(kind==='heavySweep'){
    stroke(-1.65,-.55,1.65,.55,.055);
  }else{
    stroke(-.16,-.09,.16,.09,.045);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  const material=new T.MeshBasicMaterial({color:kind==='heavySweep'?0xffcf63:0x86ffe6,transparent:true,opacity:.95,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
  const mesh=new T.Mesh(geometry,material);mesh.renderOrder=10;
  mesh.onBeforeRender=(renderer,scene,camera)=>{mesh.quaternion.copy(camera.quaternion);mesh.updateMatrixWorld(true)};
  return mesh;
}

// Confirmed upgrade events own these accents; base attacks never trigger them.
export class KnightVfx{
  constructor(effects){this.effects=effects;this.guard=null}
  ready(actor,state){
    if(this.guard?.actor===actor&&this.guard.shield===actor.userData.rig?.offhand.children[0]&&this.effects.effects.includes(this.guard.effect)){
      this.guard.effect.life=3;return;
    }
    const shield=actor.userData.rig?.offhand.children[0];if(!shield)return;
    if(this.guard&&this.effects.effects.includes(this.guard.effect)){
      this.effects.removeEffect(this.guard.effect);
      this.effects.effects=this.effects.effects.filter(e=>e!==this.guard.effect);
    }
    const group=new T.Group(),edges=[],material=new T.LineBasicMaterial({color:0xd9f4ff,transparent:true,opacity:.7,depthWrite:false,toneMapped:false});
    const glow=[];
    actor.userData.rig.model.traverse(mesh=>{if(!mesh.isMesh)return;
      const original=mesh.material,copies=(Array.isArray(original)?original:[original]).map(m=>m.clone());
      mesh.material=Array.isArray(original)?copies:copies[0];glow.push({mesh,original,copies});
    });
    const caption=label('反击就绪 3.0s','#e5faff');group.add(caption.sprite);
    shield.traverse(mesh=>{if(!mesh.isMesh)return;const edge=new T.LineSegments(new T.EdgesGeometry(mesh.geometry,35),material);edge.matrixAutoUpdate=false;edges.push({mesh,edge});group.add(edge)});
    group.userData.knightVfx='counter-ready';
    const update=()=>{
      const active=['playing','paused'].includes(state.mode)&&actor.userData.profile?.model==='sword_1handed'&&state.shieldCounterUntil>state.time&&actor.userData.rig?.offhand.children[0]===shield;
      for(const {copies} of glow)for(const m of copies)if(m.emissive){m.emissive.setHex(active?0x83cfff:0);m.emissiveIntensity=active?.7:0;}
      group.visible=active;if(!active)return;
      caption.sprite.position.copy(actor.position).add(new T.Vector3(0,2.9,0));
      caption.draw(`反击就绪 ${Math.max(0,state.shieldCounterUntil-state.time).toFixed(1)}s`);
      shield.updateWorldMatrix(true,true);
      for(const {mesh,edge} of edges)edge.matrix.copy(mesh.matrixWorld);
      material.opacity=.6;
    };
    update();
    const cleanup=()=>{edges.forEach(({edge})=>edge.geometry.dispose());material.dispose();caption.dispose();
      for(const {mesh,original,copies} of glow){if(mesh.material===copies[0]||Array.isArray(mesh.material)&&mesh.material[0]===copies[0])mesh.material=original;copies.forEach(m=>m.dispose())}};
    if(this.effects.add(group,3,{fixed:true,update,cleanup}))this.guard={actor,shield,effect:this.effects.effects.at(-1),update};
    else cleanup();
  }
  impact({upgrade,hits,upgradeHits,direction}){
    if(!upgrade||!hits.length)return;
    if(upgrade==='shieldCounter')this.guard?.update();
    const caption=label({shieldCounter:'反击',heavySweep:'破阵',macePursuit:'追猎'}[upgrade],upgrade==='heavySweep'?'#ffe0a0':'#cafff3');
    caption.sprite.position.copy(hits[0]).add(new T.Vector3(0,2.6,0));caption.sprite.userData.knightVfx='upgrade-label';
    if(!this.effects.add(caption.sprite,.65,{fixed:true,update:({dt,progress})=>{caption.sprite.position.y+=dt*.45;caption.sprite.material.opacity=1-Math.max(0,progress-.5)*2},cleanup:caption.dispose}))caption.dispose();
    const points=(upgrade==='macePursuit'?upgradeHits:hits).slice(0,4);
    if(upgrade==='heavySweep'){
      const slash=impactMark(upgrade),center=new T.Vector3();
      for(const position of hits)center.add(position);
      center.divideScalar(hits.length);center.y+=1.05;
      slash.position.copy(center);slash.userData.upgradeMark=true;
      slash.userData.knightVfx='heavy-sweep-slash';
      const cleanup=()=>{slash.geometry.dispose();slash.material.dispose()};
      if(!this.effects.add(slash,.22,{fixed:true,update:({progress})=>{
        const sweep=1-(1-progress)**3;
        slash.position.copy(center).addScaledVector(direction,(sweep-.5)*.7);
        slash.scale.set(.7+.4*sweep,1-.65*progress,1);
        slash.material.opacity=.95*(1-progress)**1.2;
      },cleanup}))cleanup();
    }
    for(const position of points){
      const group=new T.Group(),material=new T.MeshBasicMaterial({color:upgrade==='heavySweep'?0xffdf9b:upgrade==='macePursuit'?0xc7f6eb:0xe9f8ff,transparent:true,opacity:.8,depthWrite:false,toneMapped:false});
      if(upgrade==='macePursuit')material.depthTest=false;
      const geometry=new T.OctahedronGeometry(1),pieces=[];
      const mark=upgrade==='macePursuit'?impactMark(upgrade):null;
      if(mark){mark.userData.upgradeMark=true;group.add(mark);}
      group.position.copy(position);group.position.y+=.95;group.userData.knightVfx=upgrade;
      const count=upgrade==='shieldCounter'?3:upgrade==='heavySweep'?3:8;
      for(let i=0;i<count;i++){
        const angle=i*2.39996+.3,speed=upgrade==='macePursuit'?2.6+(i%3)*.7:1.5;
        const velocity=new T.Vector3(Math.cos(angle)*speed,.5+Math.sin(angle)*speed*.65,Math.sin(angle)*speed).addScaledVector(direction,.6);
        const length=upgrade==='shieldCounter'?.5:upgrade==='heavySweep'?.12:.25+(i%3)*.055;
        const width=upgrade==='macePursuit'?.045:.025;
        const mesh=new T.Mesh(geometry,material);mesh.scale.set(width,length,width);
        if(upgrade==='macePursuit')mesh.userData.upgradeMark=true;
        mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),velocity.clone().normalize());group.add(mesh);pieces.push({mesh,velocity});
        mesh.userData.initialLength=length;
      }
      const cleanup=()=>{geometry.dispose();material.dispose();mark?.geometry.dispose();mark?.material.dispose()};
      if(!this.effects.add(group,mark ? .42 : .32,{fixed:true,update:({age,progress})=>{
        for(const {mesh,velocity} of pieces){
          mesh.position.copy(velocity).multiplyScalar(age*(1-.4*progress));mesh.position.y-=age*age*1.8;
          mesh.scale.y=mesh.userData.initialLength*(1-.7*progress);
        }
        if(mark){mark.scale.setScalar(1+age*3);mark.material.opacity=.95*Math.max(0,1-age/.085)**2;}
        material.opacity=.8*(1-progress)**1.6;
      },cleanup}))cleanup();
    }
  }
}
