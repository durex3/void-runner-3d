export const KNIGHT_UPGRADES=[
  {id:'shieldCounter',model:'sword_1handed',name:'守卫反击',symbol:'◇',desc:'持剑盾受到伤害后，3 秒内下一次命中的剑盾攻击伤害 +50%',hint:'空挥不消耗反击；连续受伤只刷新时间'},
  {id:'heavySweep',model:'sword_2handed',name:'破阵重斩',symbol:'✦',desc:'重剑一次命中至少 2 个目标时，本次伤害 +20%、击退 +35%',hint:'集中敌群再挥剑；不会扩大攻击范围'},
  {id:'macePursuit',model:'Skeleton_Mace',name:'震击追猎',symbol:'◆',desc:'钉锤攻击已处于硬直的目标时，伤害 +35%',hint:'本次攻击新施加的硬直不触发加伤；不会延长控制'},
];

export function armShieldCounter(state,profile,damage){
  if(damage>0&&state.shieldCounter&&profile?.model==='sword_1handed')state.shieldCounterUntil=(state.time||0)+3;
}

export function knightMeleeBonus(state,profile,targets){
  const counter=profile.model==='sword_1handed'&&state.shieldCounter&&state.shieldCounterUntil>(state.time||0)&&targets.length>0;
  const sweep=profile.model==='sword_2handed'&&state.heavySweep&&targets.length>=2;
  if(counter)state.shieldCounterUntil=0;
  return {damage:counter?1.5:sweep?1.2:1,knock:sweep?1.35:1,
    pursuit:profile.model==='Skeleton_Mace'&&state.macePursuit};
}
