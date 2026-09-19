import * as T from 'three';

const material=(color,opacity=1)=>new T.MeshBasicMaterial({color,opacity,transparent:true,side:T.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
const ink=material(0x29131c),coral=material(0xff5265),ivory=material(0xffefd5);
const sphere=new T.SphereGeometry(1,12,8),tail=new T.ConeGeometry(.12,.7,8);
const border=new T.RingGeometry(.94,1.015,96),edge=new T.RingGeometry(.965,1,96);
const clock=new T.RingGeometry(.975,1,96),tick=new T.PlaneGeometry(.045,.13);

export function enemyProjectile(position,velocity){
  const group=new T.Group();group.position.copy(position);group.rotation.y=Math.atan2(velocity.x,velocity.z);
  const streak=new T.Mesh(tail,coral);streak.rotation.x=-Math.PI/2;streak.position.z=-.42;streak.renderOrder=12;group.add(streak);
  for(const [scale,mat,order] of [[.3,ink,13],[.235,coral,14],[.105,ivory,15]]){
    const mesh=new T.Mesh(sphere,mat);mesh.scale.setScalar(scale);mesh.renderOrder=order;group.add(mesh);
  }
  return group;
}

export function stompWarning(position,radius){
  const group=new T.Group();group.name='stomp-warning';group.position.copy(position).setY(.1);group.rotation.x=-Math.PI/2;group.scale.setScalar(radius);
  for(const [geometry,mat,order] of [[border,ink,9],[edge,coral,10]]){const mesh=new T.Mesh(geometry,mat);mesh.renderOrder=order;group.add(mesh);}
  for(let i=0;i<12;i++){
    const angle=i*Math.PI/6,mesh=new T.Mesh(tick,ivory);
    mesh.position.set(Math.sin(angle)*.9,Math.cos(angle)*.9,.002);mesh.rotation.z=-angle;mesh.renderOrder=11;group.add(mesh);
  }
  const countdown=new T.Mesh(clock,coral);countdown.renderOrder=10;group.add(countdown);
  group.userData.update=progress=>countdown.scale.setScalar(1-.85*Math.min(1,Math.max(0,progress)));
  group.userData.update(0);return group;
}
