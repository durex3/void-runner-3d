const DEVICE_LABELS={thorn:'自动弩台',electric:'雷鸣法典',blast:'炼金炸瓶'};
const round=(value,digits=2)=>Number((Number(value)||0).toFixed(digits));
const createRunId=()=>globalThis.crypto?.randomUUID?.()||`run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

function weaponIdentity(profile={}){
  return {id:profile.model||profile.weaponLabel||profile.label||'unknown',label:profile.label||profile.weaponLabel||profile.model||'未知武器'};
}

export class RunTelemetry{
  constructor(){this.reset()}

  reset({chapter='ruins',heroId='',heroLabel=''}={}){
    this.runId=createRunId();this.chapter=chapter;this.heroId=heroId;this.heroLabel=heroLabel;this.weapons=new Map();this.devices=new Map();
    this.damageTaken={};this.upgrades=[];this.combos={};this.boss={startedAt:null,endedAt:null,label:'',damage:0};this.duration=0;this.finished=false;this.win=false;
    return this;
  }

  weapon(profile={}){
    const identity=weaponIdentity(profile);
    if(!this.weapons.has(identity.id))this.weapons.set(identity.id,{...identity,equippedTime:0,attacks:0,projectiles:0,hits:0,damage:0,bossDamage:0,kills:0});
    return this.weapons.get(identity.id);
  }

  device(kind){
    if(!this.devices.has(kind))this.devices.set(kind,{id:kind,label:DEVICE_LABELS[kind]||kind,hits:0,damage:0,bossDamage:0,kills:0});
    return this.devices.get(kind);
  }

  advance(dt,profile){
    if(this.finished||!Number.isFinite(dt)||dt<=0)return;
    this.duration+=dt;
    if(profile)this.weapon(profile).equippedTime+=dt;
  }

  recordAttack(profile){
    const entry=this.weapon(profile);entry.attacks++;entry.projectiles+=Math.max(1,Number(profile?.count)||1);
  }

  recordDamage(source={},amount=0,{boss=false}={}){
    const applied=Math.max(0,Number(amount)||0);if(!applied)return;
    const entry=source.device?this.device(source.device):this.weapon(source);
    entry.hits++;entry.damage+=applied;if(boss){entry.bossDamage+=applied;this.boss.damage+=applied}
  }

  recordKill(source={}){
    const entry=source.device?this.device(source.device):this.weapon(source);entry.kills++;
  }

  recordDamageTaken(source='other',amount=0){
    const applied=Math.max(0,Number(amount)||0);if(!applied)return;
    this.damageTaken[source]=(this.damageTaken[source]||0)+applied;
  }

  recordUpgrade(choice,state={}){
    this.upgrades.push({id:choice.id||choice.name,name:choice.name,kind:choice.kind||'upgrade',level:state.level||0,time:round(state.time||this.duration)});
  }

  recordCombo(id){if(id)this.combos[id]=(this.combos[id]||0)+1}

  startBoss(time=0,label='Boss'){
    if(this.boss.startedAt!==null)return;
    this.boss.startedAt=Math.max(0,Number(time)||0);this.boss.label=label;
  }

  endBoss(time=this.duration){if(this.boss.startedAt!==null&&this.boss.endedAt===null)this.boss.endedAt=Math.max(this.boss.startedAt,Number(time)||0)}

  snapshot({state={},garden={},win=this.win}={}){
    const weapons=[...this.weapons.values()].map(entry=>({...entry,equippedTime:round(entry.equippedTime),damage:round(entry.damage),bossDamage:round(entry.bossDamage)})).sort((a,b)=>b.damage-a.damage);
    const devices=[...this.devices.values()].map(entry=>({...entry,damage:round(entry.damage),bossDamage:round(entry.bossDamage)})).sort((a,b)=>b.damage-a.damage);
    const duration=round(state.time??this.duration),bossEnd=this.boss.endedAt??duration,bossDuration=this.boss.startedAt===null?0:round(Math.max(0,bossEnd-this.boss.startedAt));
    const totalDamage=round([...weapons,...devices].reduce((sum,entry)=>sum+entry.damage,0));
    const totalDamageTaken=round(Object.values(this.damageTaken).reduce((sum,value)=>sum+value,0));
    return {version:1,runId:this.runId,chapter:state.chapter||this.chapter,hero:{id:this.heroId,label:this.heroLabel},win:Boolean(win),duration,wave:state.wave||0,kills:state.kills||0,level:state.level||1,
      totalDamage,totalDamageTaken,weapons,devices,damageTaken:Object.fromEntries(Object.entries(this.damageTaken).map(([key,value])=>[key,round(value)])),upgrades:this.upgrades.map(item=>({...item})),combos:{...this.combos},
      boss:{label:this.boss.label,duration:bossDuration,damage:round(this.boss.damage)},deployments:garden.stats?.planted||0,deviceKills:garden.stats?.kills||0,companions:garden.buddies?.length||0};
  }

  finish(context={}){this.finished=true;this.win=Boolean(context.win);return this.snapshot(context)}
}

export {DEVICE_LABELS};
