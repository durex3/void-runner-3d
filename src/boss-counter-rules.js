import {VENTS,insideVent} from './levels.js';

export const RUINS_COUNTER_PYLONS=Object.freeze([
  {x:0,z:-17},{x:17,z:0},{x:0,z:17},{x:-17,z:0},
]);

export function ruinsCounterPylon(point,radius=2.6){
  return RUINS_COUNTER_PYLONS.find(pylon=>Math.hypot(point.x-pylon.x,point.z-pylon.z)<=radius)||null;
}

export function crossesVent(from,to,index){
  const vent=VENTS[index];if(!vent)return false;
  const steps=Math.max(4,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.5));
  let wasInside=insideVent(from,vent);if(wasInside)return true;
  for(let i=1;i<=steps;i++){
    const t=i/steps,point={x:from.x+(to.x-from.x)*t,z:from.z+(to.z-from.z)*t};
    if(insideVent(point,vent))return true;
  }
  return false;
}

export function crossesVortexCore(from,to,center){
  const start=Math.hypot(from.x-center.x,from.z-center.z),end=Math.hypot(to.x-center.x,to.z-center.z);
  return start>3.55&&end<=3.55&&end>=1.15;
}
