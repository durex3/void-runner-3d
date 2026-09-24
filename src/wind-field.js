import * as T from 'three';

export const WIND_LANES=[
  {x:0,z:-9,width:4,depth:11.2,dir:new T.Vector3(0,0,1),label:'北风道'},
  {x:9,z:0,width:11.2,depth:4,dir:new T.Vector3(-1,0,0),label:'东风道'},
  {x:0,z:9,width:4,depth:11.2,dir:new T.Vector3(0,0,-1),label:'南风道'},
  {x:-9,z:0,width:11.2,depth:4,dir:new T.Vector3(1,0,0),label:'西风道'},
];

export const SAFE_ZONE_RADIUS=3.4;

export function insideWindLane(point,lane){
  if(Math.hypot(point.x,point.z)<=SAFE_ZONE_RADIUS)return false;
  return Math.abs(point.x-lane.x)<=lane.width/2&&Math.abs(point.z-lane.z)<=lane.depth/2;
}

export class WindField{
  constructor(){this.root=new T.Group();this.root.name='wind-field';this.reset()}
  reset(delay=4){this.phase='cool';this.left=delay;this.active=[];this.turn=0;this.lastPush=0;this.overloaded=false}
  suppress(){this.phase='cool';this.left=3;this.active=[];this.overloaded=false}
  ignite(lanes=WIND_LANES.map((_,index)=>index)){
    const available=lanes.length?lanes:[0],index=available[this.turn++%available.length];
    this.active=[index];this.phase='warning';this.left=1.5;this.lastPush=0;
  }
  step(dt,frequency=10,lanes){
    this.left-=dt;
    while(this.left<=0){
      const extra=-this.left;
      if(this.phase==='cool')this.ignite(lanes);
      else if(this.phase==='warning'){this.phase='push';this.left=1.2}
      else{this.phase='cool';this.left=frequency;this.active=[]}
      this.left-=extra;
    }
  }
  hits(point){return this.phase==='push'&&this.active.some(i=>insideWindLane(point,WIND_LANES[i]))}
  push(hero,dt){
    if(!this.hits(hero.position))return false;
    const lane=WIND_LANES[this.active[0]];
    hero.position.addScaledVector(lane.dir,5*dt);
    if(hero.position.length()>20)hero.position.setLength(20);
    this.lastPush+=dt;
    return true;
  }
  updateVisual(time){
    this.root.children.forEach((entry,index)=>{
      const lane=WIND_LANES[index],active=this.active.includes(index),push=this.phase==='push'&&active;
      const warning=this.phase==='warning'&&active;
      entry.visible=true;
      const {panel,outline,rails,arrows,streaks,gate}=entry.userData;
      if(panel){
        panel.material.color.setHex(push?(this.overloaded?0xb66dff:0x64e9ff):warning?(this.overloaded?0xff7b5e:0xffc85f):0x74a6ad);
        panel.material.opacity=push?.38:warning?.22+.12*(1+Math.sin(time*9)):.035;
      }
      if(outline){
        outline.material.color.setHex(push?(this.overloaded?0xf0d5ff:0xbaf8ff):warning?(this.overloaded?0xffb09c:0xffdc88):0x91b8b8);
        outline.material.opacity=push?1:warning?.75+.2*Math.sin(time*9):.22;
      }
      if(rails){
        rails.color.setHex(push?(this.overloaded?0xd69aff:0x9af4ff):warning?(this.overloaded?0xff8b6d:0xffd06d):0x91b8b8);
        rails.opacity=push?.95:warning?.8:.18;
      }
      if(arrows)arrows.children.forEach((arrow,arrowIndex)=>{
        arrow.material.color.setHex(push?0xe6fdff:warning?0xffe2a1:0xa8c8c7);
        arrow.material.opacity=push?.95:warning?.85:.2;
        const travel=(time*(push?5:warning?1.8:.35)+arrowIndex*3.4)%10-5;
        if(lane.width>lane.depth)arrow.position.x=travel*(lane.dir.x<0?-1:1);
        else arrow.position.z=travel*(lane.dir.z<0?-1:1);
        arrow.scale.setScalar(push?1.35+.16*Math.sin(time*14+arrowIndex):warning?1.18:1);
      });
      if(streaks){
        streaks.material.color.setHex(push?0xe5fcff:warning?0xffe6ae:0x9bc7ca);
        streaks.material.opacity=push?.92:warning?.58:.08;
        const span=(lane.width>lane.depth?lane.width:lane.depth)+2,speed=push?11:warning?4.5:1.1,sign=lane.width>lane.depth?lane.dir.x:lane.dir.z;
        streaks.group.children.forEach((streak,streakIndex)=>{
          const travel=((time*speed+streakIndex*1.73)%span)-span/2;
          if(lane.width>lane.depth)streak.position.x=travel*sign;else streak.position.z=travel*sign;
        });
      }
      if(gate){
        gate.material.color.setHex(push?0xdafcff:warning?0xffcf69:0x779da0);
        gate.material.opacity=push?1:warning?.72+.24*Math.sin(time*10):.2;
        gate.group.scale.y=warning?1+.12*(1+Math.sin(time*10)):1;
      }
    });
  }
}

export function createWindFieldVisual(){
  const field=new WindField();
  for(const lane of WIND_LANES){
    const group=new T.Group();group.position.set(lane.x,.05,lane.z);
    const geometry=new T.PlaneGeometry(lane.width,lane.depth);
    const panel=new T.Mesh(geometry,new T.MeshBasicMaterial({color:0x74a6ad,transparent:true,opacity:.035,depthWrite:false,side:T.DoubleSide}));
    panel.rotation.x=-Math.PI/2;panel.renderOrder=2;group.add(panel);
    const outline=new T.LineSegments(new T.EdgesGeometry(geometry),new T.LineBasicMaterial({color:0x91b8b8,transparent:true,opacity:.22,depthTest:false}));
    outline.rotation.x=-Math.PI/2;outline.position.y=.018;outline.renderOrder=3;group.add(outline);
    const railGeometry=lane.width>lane.depth?new T.PlaneGeometry(lane.width,.16):new T.PlaneGeometry(.16,lane.depth);
    const railMaterial=new T.MeshBasicMaterial({color:0x91b8b8,transparent:true,opacity:.18,depthWrite:false,depthTest:false,side:T.DoubleSide});
    const rails=new T.Group();
    for(const side of [-1,1]){
      const rail=new T.Mesh(railGeometry,railMaterial);rail.rotation.x=-Math.PI/2;rail.position.y=.028;
      if(lane.width>lane.depth)rail.position.z=side*(lane.depth/2-.13);else rail.position.x=side*(lane.width/2-.13);
      rails.add(rail);
    }
    group.add(rails);
    const arrows=new T.Group();
    for(let i=0;i<5;i++){
      const arrow=new T.Mesh(new T.ConeGeometry(.38,1.25,3),new T.MeshBasicMaterial({color:0xa8c8c7,transparent:true,opacity:.2,depthWrite:false,depthTest:false}));
      arrow.rotation.x=-Math.PI/2;
      arrow.position.y=.06;arrow.renderOrder=4;
      if(lane.width>lane.depth){arrow.rotation.z=lane.dir.x<0?Math.PI/2:-Math.PI/2;arrow.position.x=(i-2)*3.4}
      else {arrow.rotation.z=lane.dir.z<0?Math.PI:0;arrow.position.z=(i-2)*3.4}
      arrows.add(arrow);
    }
    group.add(arrows);
    const streakMaterial=new T.MeshBasicMaterial({color:0x9bc7ca,transparent:true,opacity:.08,depthWrite:false,depthTest:false,side:T.DoubleSide});
    const streakGroup=new T.Group();
    for(let i=0;i<9;i++){
      const long=1.1+(i%3)*.45,cross=((i%5)-2)*.55;
      const streak=new T.Mesh(lane.width>lane.depth?new T.PlaneGeometry(long,.07):new T.PlaneGeometry(.07,long),streakMaterial);
      streak.rotation.x=-Math.PI/2;streak.position.y=.075;streak.renderOrder=5;
      if(lane.width>lane.depth)streak.position.z=cross;else streak.position.x=cross;
      streakGroup.add(streak);
    }
    group.add(streakGroup);
    const gateMaterial=new T.MeshBasicMaterial({color:0x779da0,transparent:true,opacity:.2,depthWrite:false});
    const gateGroup=new T.Group(),source=lane.width>lane.depth?lane.width/2:lane.depth/2,sourceSign=lane.width>lane.depth?-lane.dir.x:-lane.dir.z;
    for(const side of [-1,1]){
      const post=new T.Mesh(new T.CylinderGeometry(.1,.16,1.6,8),gateMaterial);post.position.y=.8;
      if(lane.width>lane.depth)post.position.set(source*sourceSign,.8,side*(lane.depth/2-.15));
      else post.position.set(side*(lane.width/2-.15),.8,source*sourceSign);
      gateGroup.add(post);
      const lamp=new T.Mesh(new T.SphereGeometry(.18,10,6),gateMaterial);lamp.position.copy(post.position).setY(1.68);gateGroup.add(lamp);
    }
    group.add(gateGroup);
    group.userData={panel,outline,rails:railMaterial,arrows,streaks:{group:streakGroup,material:streakMaterial},gate:{group:gateGroup,material:gateMaterial}};field.root.add(group);
  }
  return field;
}
