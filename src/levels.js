export const LEVELS={
  ruins:{id:'ruins',name:'遗迹工坊',chapter:1,boss:'骸骨巨像'},
  furnace:{id:'furnace',name:'熔炉要塞',chapter:2,boss:'黑骑士 · 熔炉统领'},
};

// Introduce vents, teach charges, combine threats, then release before the boss.
export const FURNACE_WAVES=[
  {count:9,interval:1.15,pool:['brute'],label:'炉门开启',grace:5},
  {count:12,interval:1.05,pool:['brute','brute','runner'],label:'突击先锋',grace:3},
  {count:15,interval:1,pool:['brute','runner','spitter'],label:'炉火法师',grace:3},
  {count:12,interval:1.1,pool:['brute','brute','spitter'],label:'守备换防',grace:5},
  {count:21,interval:.85,pool:['brute','runner','spitter'],label:'双炉交替',grace:3},
  {count:24,interval:.8,pool:['brute','runner','runner','spitter'],label:'要塞反扑',grace:3},
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
    this.active=wave>=5?[first,(first+2)%4]:[first];
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
