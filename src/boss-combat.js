import * as T from 'three';
import {ruinsCounterPylon} from './boss-counter-rules.js';

export const BOSS_RECOVERY=2.2;
export const bossShotAngles=pattern=>pattern==='fan'?[-.32,-.16,0,.16,.32]:Array.from({length:10},(_,i)=>i*Math.PI/5);
export function bossGroundTarget(hero,boss){
  const target=hero.position.clone();
  const pylon=target.length()<17.5?ruinsCounterPylon(target,1.4):null;
  if(pylon){target.set(pylon.x,0,pylon.z);return target}
  if(target.distanceTo(boss.obj.position)>5){
    const lead=(hero.userData.movementVelocity||new T.Vector3()).clone().multiplyScalar(1.3).clampLength(0,10);
    target.add(lead);
  }
  target.y=0;if(target.length()>19)target.setLength(19);
  return target;
}
