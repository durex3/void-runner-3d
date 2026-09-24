const RUN_DEFAULTS={
  mode:'playing',hp:100,maxHp:100,wave:1,kills:0,level:1,xp:0,need:7,
  time:0,weapon:0,damage:1,rate:1,speed:6,magnet:3,dash:0,inv:0,shot:0,
  waveTime:0,spawn:0,remaining:0,
  chapterStatus:'',
  levelHud:null,
  shieldCounter:false,heavySweep:false,macePursuit:false,shieldCounterUntil:0,
};

export function createGameState(){
  return {...RUN_DEFAULTS,mode:'title',loadout:0};
}

export function resetRunState(state){
  Object.assign(state,RUN_DEFAULTS);
  state.bossStats=null;
  return state;
}
