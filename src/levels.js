export const LEVELS={
  ruins:{id:'ruins',name:'遗迹工坊',chapter:1,boss:'骸骨巨像'},
  furnace:{id:'furnace',name:'熔炉要塞',chapter:2,boss:'黑骑士 · 熔炉统领'},
  outpost:{id:'outpost',name:'风蚀哨站',chapter:3,boss:'哨站守卫 · Clanker'},
};

// Chapter 1 now has an authored pressure curve instead of relying on the
// fallback random pool. It teaches the basic chase, then adds flankers and
// ranged pressure before a short breather ahead of the boss.
export const RUINS_WAVES=[
  {count:9,interval:1.1,label:'废墟清场',pool:['brute'],grace:2.6},
  {count:12,interval:1,label:'侧翼来袭',pool:['brute','runner'],grace:2.4,
    formation:[
      {type:'brute',offset:-.2,delay:.4},{type:'brute',offset:.2,delay:.5},
      {type:'runner',offset:-.7,delay:1},{type:'runner',offset:.7,delay:1},
    ]},
  {count:15,interval:.95,label:'远程压制',pool:['brute','runner','spitter'],grace:2.4},
  {count:18,interval:.9,label:'交叉包围',pool:['brute','runner','spitter'],grace:2.2,
    formation:[
      {type:'brute',offset:-.25,delay:.35},{type:'brute',offset:.25,delay:.45},
      {type:'runner',offset:-.8,delay:1},{type:'runner',offset:.8,delay:1},
      {type:'spitter',offset:0,delay:2.2},
    ]},
  {count:20,interval:.84,label:'遗迹反扑',pool:['brute','runner','spitter'],grace:2.3},
  {count:22,interval:.8,label:'最后防线',pool:['brute','runner','spitter'],grace:2.2,
    formation:[
      {type:'brute',offset:-.2,delay:.3},{type:'brute',offset:.2,delay:.35},
      {type:'runner',offset:-.85,delay:.8},{type:'runner',offset:.85,delay:.8},
      {type:'spitter',offset:-.15,delay:2},{type:'spitter',offset:.15,delay:2},
    ]},
  {count:14,interval:1,label:'王座前庭',pool:['brute','spitter'],grace:3.8},
  {count:6,interval:1.3,label:'骸骨巨像',pool:['brute'],grace:4.5},
];

// Chapter 3 is intentionally a short playable vertical slice first: teach the
// wind lane, combine it with known enemy roles, then release the player for a
// readable boss punish window. The full eight-wave campaign can grow from this.
export const OUTPOST_ENEMY_ROLES={
  brute:{actor:'windGuard',role:'guard'},
  runner:{actor:'windScout',role:'scout'},
  spitter:{actor:'windTech',role:'tech'},
};
export const OUTPOST_WAVES=[
  {count:7,interval:1.15,label:'风蚀守卫 · 风道校准',pool:['brute'],grace:4,windEvery:6.5,windLanes:[0]},
  {count:12,interval:1.02,label:'滑翔斥候 · 锁定冲锋',pool:['brute','runner'],grace:3,windEvery:10,windLanes:[1,3],formation:[
    {type:'brute',offset:-.18,delay:.55},{type:'runner',offset:.42,delay:1.05},{type:'brute',offset:.18,delay:.6},{type:'runner',offset:-.42,delay:1.2},
  ]},
  {count:16,interval:.9,label:'风塔技师 · 逆风合围',pool:['brute','runner','spitter'],grace:3,windEvery:8,windLanes:[0,1,2,3],formation:[
    {type:'brute',offset:-.2,delay:.45},{type:'runner',offset:.5,delay:.9},{type:'spitter',offset:0,delay:1.45},{type:'brute',offset:.2,delay:.5},{type:'runner',offset:-.5,delay:.95},
  ]},
  {count:6,interval:1.5,label:'守卫唤醒',pool:['brute'],grace:5,windEvery:6.5,windLanes:[0,2]},
];

// Introduce vents, teach charges, combine threats, then release before the boss.
export const FURNACE_WAVES=[
  {count:9,interval:1.15,pool:['brute'],label:'炉门开启',grace:5},
  {count:12,interval:1.05,pool:['brute','brute','runner'],label:'突击先锋',grace:3},
  {count:15,interval:1,pool:['brute','runner','spitter'],label:'炉火法师',grace:3},
  {count:12,interval:1.1,pool:['brute','brute','spitter'],label:'守备换防',grace:5},
  {count:21,interval:.85,pool:['brute','runner','spitter'],label:'双炉交替',grace:3,
    // Three readable pushes: clustered infantry, staggered charges, then support.
    formation:[
      {type:'brute',offset:-.12,delay:.4},
      {type:'brute',offset:0,delay:.4},
      {type:'brute',offset:.12,delay:.4},
      {type:'brute',offset:.24,delay:1.3},
      {type:'runner',offset:-.3,delay:1.1},
      {type:'runner',offset:.3,delay:1.2},
      {type:'spitter',offset:0,delay:3.5},
    ]},
  {count:24,interval:.8,pool:['brute','runner','runner','spitter'],label:'要塞反扑',grace:3,
    // Infantry fixes the front; flankers arrive separately, leaving the rear open.
    formation:[
      {type:'brute',offset:-.12,delay:.4},
      {type:'brute',offset:0,delay:.4},
      {type:'brute',offset:.12,delay:1.2},
      {type:'runner',offset:-.85,delay:1.1},
      {type:'runner',offset:.85,delay:1.1},
      {type:'brute',offset:0,delay:.6},
      {type:'runner',offset:-.65,delay:1.2},
      {type:'spitter',offset:.2,delay:3.5},
    ]},
  {count:15,interval:1.1,pool:['brute','spitter'],label:'王座前庭',grace:5},
  {count:6,interval:2,pool:['brute'],label:'熔炉统领',grace:5},
];

export const VENTS=[
  {x:0,z:-10,width:16,depth:4},
  {x:10,z:0,width:4,depth:16},
  {x:0,z:10,width:16,depth:4},
  {x:-10,z:0,width:4,depth:16},
];
export const insideVent=(point,vent)=>Math.abs(point.x-vent.x)<=vent.width/2&&Math.abs(point.z-vent.z)<=vent.depth/2;

export class FurnaceCycle{
  constructor(){this.reset()}
  reset(delay=6){this.phase='cool';this.left=delay;this.active=[];this.turn=0}
  suppress(){this.phase='cool';this.left=3;this.active=[]}
  ignite(wave=1){
    const first=this.turn++%4;
    this.active=wave>=3?[first,(first+2)%4]:[first];
    this.phase='warning';this.left=2.4;
  }
  step(dt,wave){
    this.left-=dt;
    while(this.left<=0){
      const extra=-this.left;
      if(this.phase==='cool')this.ignite(wave);
      else if(this.phase==='warning'){this.phase='burn';this.left=2.2}
      else{this.phase='cool';this.left=5;this.active=[]}
      this.left-=extra;
    }
  }
  hits(point){return this.phase==='burn'&&this.active.some(i=>insideVent(point,VENTS[i]))}
}
