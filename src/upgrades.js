import {COMBOS} from './garden.js';

function shuffle(items,random=Math.random){
  for(let index=items.length-1;index>0;index--){
    const target=Math.floor(random()*(index+1));
    [items[index],items[target]]=[items[target],items[index]];
  }
  return items;
}

function baseUpgrades(state){
  return [
    {name:'锋芒祝福',symbol:'✦',desc:'所有武器伤害 +25%',apply:()=>state.damage+=.25},
    {name:'迅捷祝福',symbol:'➶',desc:'所有武器攻速 +20%',apply:()=>state.rate+=.2},
    {name:'急救强化',symbol:'❧',desc:'生命上限 +25，恢复 35 生命',apply:()=>{state.maxHp+=25;state.hp=Math.min(state.maxHp,state.hp+35)}},
    {name:'疾风靴子',symbol:'〰',desc:'移动速度 +12%',apply:()=>state.speed*=1.12},
    {name:'回收磁场',symbol:'◇',desc:'经验拾取范围 +2 米，恢复 15 生命',apply:()=>{state.magnet+=2;state.hp=Math.min(state.maxHp,state.hp+15)}},
  ];
}

export function createUpgradeChoices({state,garden,heroName,random=Math.random}){
  const available=shuffle(COMBOS
    .filter(combo=>!garden.combos.has(combo.id)&&(combo.id!=='watering'||heroName==='Engineer'))
    .map(combo=>({...combo,apply:()=>garden.combos.add(combo.id)})),random);
  const upgrades=baseUpgrades(state);
  if(!available.length)return shuffle(upgrades,random).slice(0,3);
  return [available[0],...shuffle([...upgrades,...available.slice(1)],random).slice(0,2)];
}
