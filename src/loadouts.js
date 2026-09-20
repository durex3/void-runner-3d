// Slots are local to each hero; type is the shared projectile/loot family.
export const HEROES={
  Knight:{label:'骑士',description:'剑盾防守、重剑清场与钉锤打断',weapons:[
    {label:'守卫剑盾',model:'sword_1handed',offhand:'shield_round',type:3,damage:38,interval:.62,range:3.2,arc:120,delay:.18,damageTaken:.8,grip:'melee',effect:'melee',animation:'Melee_1H_Attack_Slice_Diagonal',stance:'Melee_Blocking',detail:'正面挥砍 · 持盾受伤减少 20%'},
    {label:'骑士双手剑',model:'sword_2handed',type:3,damage:70,interval:1.05,range:3.8,arc:160,delay:.4,knock:10,grip:'melee',effect:'melee',animation:'Melee_2H_Attack_Chop',stance:'Melee_2H_Idle',detail:'大范围重斩 · 前摇 0.4 秒 / 明显击退'},
    {label:'震击钉锤',model:'Skeleton_Mace',type:3,damage:52,interval:.9,range:2.6,arc:90,delay:.25,stagger:.45,grip:'melee',effect:'melee',animation:'Melee_1H_Attack_Chop',stance:'Idle_A',detail:'短程震击 · 普通敌人硬直 0.45 秒'}]},
  Ranger:{label:'游侠',description:'弩箭连射与重箭点杀',weapons:[
    {label:'复合弩',model:'crossbow_2handed',type:0,damage:30,interval:.36,speed:26,life:1,count:1,grip:'twoHand',effect:'bolt',detail:'稳定单发 · 30 伤害 / 0.36 秒'},
    {label:'猎手长弓',model:'bow_withString',type:0,damage:56,interval:.7,speed:32,life:1,count:1,pierce:3,falloff:.8,grip:'bow',effect:'pierce',detail:'穿透 3 敌 · 后续伤害递减 20%'},
    {label:'轻便手弩',model:'crossbow_1handed',type:0,damage:20,interval:.25,speed:30,life:.8,count:1,moveBonus:1.12,grip:'oneHand',effect:'mobile',detail:'轻装速射 · 手持时移速 +12%'}]},
  Engineer:{label:'工程师',description:'近身散射与快速压制',weapons:[
    {label:'炼金霰弹',model:'shotgun',type:1,damage:16,interval:.75,speed:19,life:.6,count:5,grip:'twoHand',effect:'shotgun',detail:'5 发散射击退 · 近距离伤害更高'},
    {label:'速射手弩',model:'crossbow_1handed',type:0,damage:14,interval:.54,speed:28,life:.8,count:1,burst:3,burstGap:.075,grip:'oneHand',effect:'burst',detail:'三连发 · 每箭 14 / 每轮 0.54 秒'}]},
  Druid:{label:'德鲁伊',description:'范围控制、连锁雷击与爆裂魔弹',weapons:[
    {label:'德鲁伊法杖',model:'druid_staff',type:2,damage:42,interval:1.05,radius:2.6,delay:.25,slow:1.4,grip:'staff',effect:'nature',detail:'范围冲击 · 延迟 0.25 秒 / 减速'},
    {label:'雷鸣法杖',model:'staff',type:2,damage:30,interval:.8,targets:4,jumpRange:4,falloff:.8,grip:'staff',effect:'chain',detail:'连锁 4 敌 · 每跳伤害递减 20%'},
    {label:'聚能魔杖',model:'wand',type:2,damage:46,interval:.55,speed:18,life:1.1,count:1,radius:1.6,splash:.4,grip:'wand',effect:'orb',detail:'魔弹直击 46 · 周围溅射 40%'}]},
};
