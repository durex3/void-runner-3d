import {KNIGHT_UPGRADES} from './knight-upgrades.js';

function number(value,digits=2){
  return Number(value.toFixed(digits)).toString();
}

function sequence(base,count,falloff){
  return Array.from({length:count},(_,index)=>number(base*Math.pow(falloff,index))).join(' → ');
}

function describeDamage(profile,damage){
  if(profile.effect==='shotgun')return `${profile.count} × ${number(damage)}（单颗近距）`;
  if(profile.effect==='burst')return `${profile.burst} × ${number(damage)}（每轮）`;
  if(profile.effect==='pierce')return sequence(damage,profile.pierce,profile.falloff);
  if(profile.effect==='chain')return sequence(damage,profile.targets,profile.falloff);
  if(profile.effect==='orb')return `直击 ${number(damage)} / 溅射 ${number(damage*profile.splash)}`;
  if(profile.effect==='nature')return `${number(damage)}（半径 ${number(profile.radius,1)}）`;
  if(profile.effect==='melee')return `${number(damage)}（正面 ${profile.arc}°）`;
  return number(damage);
}

function describeRange(profile){
  if(profile.effect==='melee')return `${number(profile.range,1)} 米 / ${profile.arc}°`;
  if(profile.effect==='nature'||profile.effect==='orb')return `半径 ${number(profile.radius,1)} 米`;
  if(profile.effect==='chain')return `${profile.targets} 目标 / 跳跃 ${number(profile.jumpRange,1)} 米`;
  return profile.range?`${number(profile.range,1)} 米`:'自动索敌 15 米';
}

function describeMechanics(profile,rate){
  const mechanics=[];
  if(profile.damageTaken)mechanics.push(`持盾时受到伤害减少 ${number((1-profile.damageTaken)*100,0)}%`);
  if(profile.moveBonus)mechanics.push(`手持时移动速度增加 ${number((profile.moveBonus-1)*100,0)}%`);
  if(profile.knock)mechanics.push('大范围命中并击退敌人，Boss 仅承受部分击退');
  if(profile.stagger)mechanics.push(`普通敌人硬直 ${number(profile.stagger,2)} 秒，Boss 硬直缩短`);
  if(profile.pierce)mechanics.push(`最多穿透 ${profile.pierce} 名敌人，每次伤害衰减 ${number((1-profile.falloff)*100,0)}%`);
  if(profile.effect==='shotgun')mechanics.push(`${profile.count} 发散射；4 米后逐步衰减，最低保留 55%`);
  if(profile.burst)mechanics.push(`${profile.burst} 连发；轮内间隔 ${number(profile.burstGap/rate,3)} 秒`);
  if(profile.effect==='nature')mechanics.push(`固定区域延迟 ${number(profile.delay,2)} 秒结算，并减速 ${number(profile.slow,1)} 秒`);
  if(profile.effect==='chain')mechanics.push(`最多连锁 ${profile.targets} 名敌人，每跳伤害衰减 ${number((1-profile.falloff)*100,0)}%`);
  if(profile.effect==='orb')mechanics.push(`首个目标承受直击，周围目标受到 ${number(profile.splash*100,0)}% 溅射伤害`);
  if(!mechanics.length)mechanics.push('稳定单发，无额外条件被动');
  return mechanics;
}

export function buildCharacterStats({state,hero,role}){
  const profile=hero.userData.profile;
  const damage=profile.damage*state.damage;
  const interval=profile.interval/state.rate;
  const moveSpeed=state.speed*(profile.moveBonus||1);
  return {
    role:role.label,
    roleDescription:role.description,
    weapon:profile.label,
    health:`${Math.ceil(state.hp)} / ${state.maxHp}`,
    damage:describeDamage(profile,damage),
    interval:`${number(interval,3)} 秒/轮`,
    attacksPerSecond:`${number(1/interval,2)} 次/秒`,
    moveSpeed:`${number(moveSpeed,2)} 米/秒`,
    range:describeRange(profile),
    damageMultiplier:`×${number(state.damage,2)}`,
    rateMultiplier:`×${number(state.rate,2)}`,
    mechanics:[...describeMechanics(profile,state.rate),...KNIGHT_UPGRADES.filter(upgrade=>state[upgrade.id]&&upgrade.model===profile.model).map(upgrade=>`${upgrade.name}：${upgrade.desc}`)],
    note:'显示值包含局内属性升级与当前装备加成，不计未触发的装置联动和条件增伤。',
  };
}
