import {COMBOS} from './garden.js';
import {KNIGHT_UPGRADES} from './knight-upgrades.js';

function shuffle(items,random=Math.random){
  for(let index=items.length-1;index>0;index--){
    const target=Math.floor(random()*(index+1));
    [items[index],items[target]]=[items[target],items[index]];
  }
  return items;
}

function baseUpgrades(state){
  return [
    {name:'锋芒祝福',symbol:'✦',desc:'所有武器伤害 +25%',kind:'core',hint:'稳定提升所有武器输出',apply:()=>state.damage+=.25},
    {name:'迅捷祝福',symbol:'➶',desc:'所有武器攻速 +20%',kind:'core',hint:'稳定提升攻击频率',apply:()=>state.rate+=.2},
    {name:'急救强化',symbol:'❧',desc:'生命上限 +25，恢复 35 生命',kind:'survival',hint:'近战或低生命时更有价值',apply:()=>{state.maxHp+=25;state.hp=Math.min(state.maxHp,state.hp+35)}},
    {name:'疾风靴子',symbol:'〰',desc:'移动速度 +12%',kind:'mobility',hint:'更容易拉开距离和躲避弹幕',apply:()=>state.speed*=1.12},
    {name:'回收磁场',symbol:'◇',desc:'经验拾取范围 +2 米，恢复 15 生命',kind:'utility',hint:'更安全地收集经验与战利品',apply:()=>{state.magnet+=2;state.hp=Math.min(state.maxHp,state.hp+15)}},
  ];
}

const COMBO_HINTS={
  voltage:{Engineer:'炸瓶与雷电形成连锁爆炸',Druid:'雷鸣法杖更容易触发追踪雷种',default:'雷电命中炸瓶时触发追踪雷种'},
  snare:{Ranger:'弩箭减速后，电击伤害提高',Druid:'减速与雷击形成控制联动',default:'减速目标受到电击额外伤害'},
  compost:{default:'装置击杀可恢复生命并延长寿命'},
  watering:{Engineer:'霰弹可立即启动并强化附近装置',default:'仅工程师的霰弹可触发'},
  pollen:{Knight:'近战冲刺后补充前线装置',default:'冲刺沿途部署当前武器装置'},
  friendship:{default:'伙伴附近的装置伤害提升'},
};
const COMBO_PRIORITY={
  Knight:['pollen','compost','friendship','snare','voltage'],
  Ranger:['snare','pollen','voltage','compost','friendship'],
  Druid:['snare','voltage','friendship','compost','pollen'],
  Engineer:['watering','voltage','compost','friendship','pollen'],
};

export function createUpgradeChoices({state,garden,heroName,random=Math.random}){
  const available=shuffle(COMBOS
    .filter(combo=>!garden.combos.has(combo.id)&&(combo.id!=='watering'||heroName==='Engineer'))
    .map(combo=>({...combo,kind:'combo',hint:COMBO_HINTS[combo.id]?.[heroName]||COMBO_HINTS[combo.id]?.default,apply:()=>garden.combos.add(combo.id)})),random);
  const upgrades=baseUpgrades(state);
  if(heroName==='Knight'){
    const knight=KNIGHT_UPGRADES.filter(upgrade=>!state[upgrade.id]).map(upgrade=>({...upgrade,kind:'weapon',apply:()=>{state[upgrade.id]=true}}));
    if(knight.length){
      const featured=knight.find(upgrade=>upgrade.id===KNIGHT_UPGRADES[state.loadout]?.id)||knight[0];
      featured.recommended=true;
      return [featured,...shuffle([...upgrades,...available,...knight.filter(upgrade=>upgrade!==featured)],random).slice(0,2)];
    }
  }
  if(!available.length)return shuffle(upgrades,random).slice(0,3);
  const priority=COMBO_PRIORITY[heroName]||[];
  available.sort((a,b)=>(priority.indexOf(a.id)+1||99)-(priority.indexOf(b.id)+1||99));
  const featured=available[0];
  featured.recommended=true;
  featured.hint=`推荐：${featured.hint}`;
  return [featured,...shuffle([...upgrades,...available.slice(1)],random).slice(0,2)];
}
