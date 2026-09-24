import * as T from 'three';
import * as Actors from './actors.js';
import {HEROES} from './loadouts.js';
import {preloadProjectileAssets,setProjectileCamera} from './projectiles.js';
import {enemyProjectile} from './danger-vfx.js';
import {bossShotAngles} from './boss-combat.js';
import {WeaponCombat} from './combat.js';
import {Garden,COMBOS,PLANTS,preloadGardenEffects} from './garden.js';
import {createWorld,loadNatureAssets,createPickup} from './ruins.js';
import {AudioService} from './audio.js';
import {buildCharacterStats} from './character-stats.js';
import {buildDeviceStatus} from './device-status.js';
import {EffectsSystem} from './effects.js';
import {MeleeVfx} from './melee-vfx.js';
import {RemoteVfx} from './remote-vfx.js';
import {createGameState,resetRunState} from './game-state.js';
import {InputController} from './input-controller.js';
import {createSceneRuntime,createRing} from './scene-runtime.js';
import {GameView} from './ui.js';
import {createUpgradeChoices} from './upgrades.js';
import {LEVELS,FURNACE_WAVES,OUTPOST_WAVES,OUTPOST_ENEMY_ROLES,FurnaceCycle} from './levels.js';
import {createFurnaceWorld} from './furnace-world.js';
import {FurnaceCombat} from './furnace-combat.js';
import {createOutpostWorld} from './outpost-world.js';
import {OutpostCombat} from './outpost-combat.js';
import {BossDamageAccess} from './boss-damage-access.js';
import {createLevelRuntimes} from './level-runtime.js';
import {RunTelemetry} from './run-telemetry.js';
import {armShieldCounter} from './knight-upgrades.js';
import {KnightVfx} from './knight-vfx.js';

const MELEE_FEEDBACK={
  sword_1handed:{freeze:.025,shake:.035,reaction:.68},
  sword_2handed:{freeze:.075,shake:.42,reaction:1},
  Skeleton_Mace:{freeze:.05,shake:.23,reaction:.92},
};

export class RelicWorkshopGame{
  constructor(app){
    this.app=app;
    this.view=new GameView({app,heroes:HEROES,combos:COMBOS,plants:PLANTS});
    this.view.mount();
    this.audio=new AudioService();
    this.state=createGameState();
    this.state.chapter='ruins';
    this.enemies=[];
    this.drops=[];
    this.hazards=[];
    this.pendingElite=null;
    this.lastDirection=new T.Vector3(0,0,1);
    this.heroHitStop=0;
    this.cameraKick=0;
    this.cameraKickTime=0;
    this.cameraKickDuration=0;
    this.mechanicsSeen=new Set();
    this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    this.best=this.readBest();
    this.telemetry=new RunTelemetry();
    this.lastRunReport=null;
  }

  async initialize(){
    await this.loadActors();
    document.body.dataset.actors='loaded';
    this.view.setBest(this.best);
    this.setupRuntime();
    for(;;){try{this.furnaceWorld=await createFurnaceWorld(this.scene);this.outpostWorld=await createOutpostWorld(this.scene);this.levels=createLevelRuntimes(this);break}catch(error){console.error(error);this.view.setLoadError();await this.view.waitForRetry()}}
    await Promise.all([this.meleeVfx.ready,this.remoteVfx.ready,preloadProjectileAssets(),this.effects.ready,preloadGardenEffects()]);
    document.body.dataset.effects='loaded';
    this.bindControls();
    this.view.setReady();
    this.chooseLevel('ruins');
    this.equip();
    await this.exposeTestApi();
    this.loadNature();
    requestAnimationFrame(time=>this.frame(time));
    return this;
  }

  async loadActors(){
    for(;;){
      try{
        await Actors.preloadActors((done,total)=>this.view.setLoading(done,total));
        this.view.setReady();
        return;
      }catch(error){
        console.error(error);
        this.view.setLoadError();
        await this.view.waitForRetry();
      }
    }
  }

  setupRuntime(){
    const runtime=createSceneRuntime(this.app);
    this.scene=runtime.scene;
    this.renderer=runtime.renderer;
    this.quality=runtime.quality;
    this.camera=runtime.camera;setProjectileCamera(this.camera);
    const existing=new Set(this.scene.children);
    this.world=createWorld(this.scene);
    this.ruinsRoot=new T.Group();
    for(const object of [...this.scene.children])if(!existing.has(object)&&!object.isLight)this.ruinsRoot.add(object);
    this.scene.add(this.ruinsRoot);
    this.furnaceCycle=new FurnaceCycle();
    this.furnaceCombat=new FurnaceCombat(this);
    this.outpostCombat=new OutpostCombat(this);
    this.hero=Actors.createHero(this.scene).hero;
    this.hero.add(createRing(.8,.05,0xffffff));
    this.bossDamageAccess=new BossDamageAccess(this);
    this.effects=new EffectsSystem({scene:this.scene,animateActor:Actors.animateActor,disposeActor:Actors.disposeActor});
    this.meleeVfx=new MeleeVfx({effects:this.effects,camera:this.camera});
    this.knightVfx=new KnightVfx(this.effects);
    this.remoteVfx=new RemoteVfx({effects:this.effects});
    this.garden=new Garden({scene:this.scene,hero:this.hero,state:this.state,enemies:()=>this.enemies,damage:(...args)=>this.damageEnemy(...args),toast:message=>this.view.showToast(message),burst:(...args)=>this.effects.burst(...args),onAttack:event=>{this.effects.deviceAttack(event);this.audio.playDevice(event.kind)},onCombo:id=>this.telemetry.recordCombo(id),onBossRecovery:boss=>{
      this.hazards=this.hazards.filter(h=>{if(h.source!==boss)return true;this.scene.remove(h.obj);h.obj.userData.dispose?.();return false});
      this.effects.updateEnemyStatus(boss,this.state.time);
    }});
    this.combat=new WeaponCombat({
      scene:this.scene,hero:this.hero,state:this.state,enemies:()=>this.enemies,damage:(...args)=>this.damageEnemy(...args),garden:this.garden,
      onFire:(profile,context)=>{this.telemetry.recordAttack(profile,{rate:this.state.rate,projectiles:context?.projectiles});Actors.kickActor(this.hero,this.state.rate);this.meleeVfx.beginSwing(this.hero);const direction=new T.Vector3(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y));this.remoteVfx.fire(profile,this.hero.position,direction,context);this.audio.play([600,180,850,240][profile.type],.07,profile.type===1?'sawtooth':'triangle',.018)},
      effect:(object,life)=>this.effects.add(object,life,{fixed:true,cleanup:o=>o.userData.dispose?.()}),
      onHit:event=>{this.remoteVfx.hit(event.profile,event.position,event.kind);if(event.kind==='nature-area'&&event.profile.slow&&event.affected){const percent=Math.round((1-.55)*100);this.showMechanicOnce('druid-slow',`德鲁伊法杖 · 范围内目标减速 ${percent}% · 持续 ${event.profile.slow.toFixed(1)} 秒`) }if(event.profile.effect==='pierce')this.showMechanicOnce('ranger-pierce','猎手长弓 · 穿透最多 3 个目标');if(event.kind==='shotgun-close')this.showMechanicOnce('shotgun-close','炼金霰弹 · 近距离命中伤害更高');if(event.profile.effect==='chain')this.showMechanicOnce('druid-chain','雷鸣法杖 · 命中后连锁附近敌人');if(event.kind==='splash')this.showMechanicOnce('druid-splash','聚能魔杖 · 命中后产生范围溅射')},
      onMeleeImpact:event=>{this.knightVfx.impact(event);this.meleeVfx.play({...event,actor:this.hero});this.applyMeleeFeedback(event);if(event.profile.knock&&event.targets.length)this.showMechanicOnce('knight-knock',`双手剑 · 命中并击退 ${event.targets.length} 个目标`);if(event.profile.stagger&&event.targets.length)this.showMechanicOnce('knight-stagger','震击钉锤 · 命中后使普通敌人硬直')},
      onMeleeDiagnostic:event=>{const stats=this.state.bossStats;if(!stats||!event.target?.customBoss)return; if(event.phase==='start'){stats.meleeDiagnostics.push({time:event.time,startedAt:event.time,startDistance:event.distance,startPhase:event.bossPhase,weapon:event.profile.label,hit:null})}else{const item=stats.meleeDiagnostics.at(-1);if(item){Object.assign(item,{time:event.time,distance:event.distance,hit:event.hit,reason:event.reason,bossPhase:event.bossPhase,impactDelay:event.time-item.startedAt})}}},
    });
    this.lastFrame=performance.now();
    this.uiElapsed=0;
  }

  bindControls(){
    this.view.bindLevels(id=>this.chooseLevel(id));
    this.view.bind({onStart:()=>this.start(),onCharacter:name=>this.chooseHero(name),onPause:()=>this.pause(),onSound:()=>this.view.setSoundMuted(this.audio.toggle()),onDash:()=>this.dash(),onGuide:()=>this.openGuide()});
    this.input=new InputController({root:this.app,onDash:()=>this.dash(),onPause:fromBlur=>{if(!fromBlur||this.state.mode==='playing')this.pause()},onWeapon:slot=>{if(['title','playing','paused'].includes(this.state.mode))this.equip(slot)}});
  }

  bestKey(){return ({ruins:'ember-best',furnace:'ember-best-furnace',outpost:'ember-best-outpost'})[this.state.chapter]||'ember-best'}
  readBest(){try{return Number(localStorage.getItem(this.bestKey()))||0}catch{return 0}}
  saveBest(){try{localStorage.setItem(this.bestKey(),this.best)}catch{}}

  chooseLevel(id){
    if(this.state.mode!=='title'||!LEVELS[id])return false;
    this.state.chapter=id;this.level=this.levels?.[id]||this.levels?.ruins;this.ruinsRoot.visible=id==='ruins';this.furnaceWorld.root.visible=id==='furnace';this.outpostWorld.root.visible=id==='outpost';
    this.best=this.readBest();this.view.setBest(this.best);this.view.selectLevel(id);return true;
  }

  equip(slot=this.state.loadout){
    const previous=this.state.loadout;
    if(!Actors.equipActor(this.hero,slot))return false;
    if(previous!==slot)this.combat.cancelBurst();
    this.state.loadout=slot;
    this.state.weapon=this.hero.userData.weapon;
    this.view.renderLoadout(this.hero.userData.rig.name,slot,next=>{if(['title','playing','paused'].includes(this.state.mode))this.equip(next)});
    this.view.renderStats(this.currentStats());
    this.view.renderDevices(this.currentDevices());
    return true;
  }

  currentStats(){
    const role=HEROES[this.hero.userData.rig.name];
    return buildCharacterStats({state:this.state,hero:this.hero,role});
  }

  currentDevices(){return buildDeviceStatus({garden:this.garden,plants:PLANTS,combos:COMBOS})}

  chooseHero(name){
    if(this.state.mode!=='title'||!Actors.selectHero(this.hero,name))return false;
    this.state.loadout=0;
    this.equip();
    this.view.selectHero(name);
    return true;
  }

  start(){
    this.clearRun();
    resetRunState(this.state);
    this.level?.reset();
    this.quality?.reset();
    this.telemetry.reset({chapter:this.state.chapter,heroId:this.hero.userData.rig.name,heroLabel:HEROES[this.hero.userData.rig.name]?.label||this.hero.userData.rig.name});
    this.lastRunReport=null;
    this.audio.resume();
    this.lastDirection.set(0,0,1);
    this.hero.position.set(0,0,4);
    Actors.resetActor(this.hero);
    this.view.hideOverlay();
    this.view.hideModal();
    this.equip();
    this.beginWave();
    this.audio.play(500,.2);
  }

  returnToTitle(){
    this.clearRun();
    Actors.resetActor(this.hero);
    this.state.mode='title';
    this.view.hideModal();
    this.view.showOverlay();
    this.equip();
  }

  clearRun(){
    this.audio.stopAll();
    this.level?.cleanup();this.furnaceCombat.reset();this.furnaceCycle.reset();this.outpostCombat.reset();this.outpostWorld.wind.reset();this.state.furnaceStatus='';this.state.chapterStatus='';this.state.levelHud=null;
    this.bossDamageAccess.reset();
    this.furnaceWorld.update(this.furnaceCycle,0);
    this.outpostWorld.wind.updateVisual(0);
    this.combat.reset();
    this.garden.reset();
    this.pendingElite=null;
    this.heroHitStop=0;
    this.cameraKick=this.cameraKickTime=0;
    this.input?.clear();
    const corpses=new Set(this.effects.corpses.map(corpse=>corpse.obj));
    this.clearObjects(this.enemies,corpses);
    this.clearObjects(this.drops);
    this.clearObjects(this.hazards);
    this.effects.clear();
    this.mechanicsSeen.clear();
  }

  showMechanicOnce(key,message){if(this.mechanicsSeen.has(key))return false;this.mechanicsSeen.add(key);this.view.showToast(message,1.8);return true}

  clearObjects(list,skip=new Set()){
    for(const item of list){
      if(skip.has(item.obj))continue;
      if(item.obj.userData.rig)Actors.disposeActor(item.obj);else this.scene.remove(item.obj);
      item.obj.userData.dispose?.();
      if(item.dispose){item.obj.geometry?.dispose();item.obj.material?.dispose()}
    }
    list.length=0;
  }

  beginWave(){
    if(this.level){this.level.beginWave();return}
    this.beginWaveDefault();
  }

  beginWaveDefault(){
    this.state.remaining=this.state.wave===8?8:6+this.state.wave*3;
    this.state.spawn=.6;
    this.state.waveTime=0;
    if([2,4,6].includes(this.state.wave))this.spawnEnemy(this.state.wave===4?'runner':'brute',true);
    this.view.showToast(this.state.wave===8?'最后的挑战 · 骸骨巨像':`第 ${this.state.wave} 波 · 骸骨军团来袭`);
    if(this.state.wave===8)this.spawnEnemy('boss');
  }

  spawnEnemy(...args){return this.level?.spawnEnemy(...args)??this.spawnEnemyBase(...args)}

  spawnEnemyBase(force,elite=false,spawnAngle){
    const furnace=this.state.chapter==='furnace',outpost=this.state.chapter==='outpost';
    const wave=this.level?.getWave(this.state.wave);
    const pool=wave?.pool||(furnace?FURNACE_WAVES[this.state.wave-1].pool:outpost?OUTPOST_WAVES[this.state.wave-1].pool:null);
    const type=force||(pool?pool[Math.floor(Math.random()*pool.length)]:(this.state.wave>2&&Math.random()<.27?'spitter':Math.random()<.3?'runner':'brute'));
    const angle=spawnAngle??Math.random()*Math.PI*2;
    const difficulty=this.level?.difficulty||{};
    const outpostConfig=outpost?OUTPOST_ENEMY_ROLES[type]:null,outpostActor=outpostConfig?.actor;
    const object=outpost&&type==='boss'?this.outpostWorld.createBoss():Actors.createCreature(furnace&&type==='boss'?'blackknight':elite&&type==='brute'?'necromancer':outpostActor||type);
    if(outpostConfig)Actors.styleOutpostCreature(object,outpostConfig.role);
    if(furnace&&type!=='boss')Actors.styleFurnaceCreature(object,type);
    if(!(outpost&&type==='boss'))object.position.set(Math.cos(angle)*(difficulty.spawnRadius||20),0,Math.sin(angle)*(difficulty.spawnRadius||20));
    this.scene.add(object);
    const size=type==='boss'?2.1:outpost&&type==='runner'?.68:outpost&&type==='spitter'?.82:type==='runner'?.6:.85;
    if(elite)this.addEliteCrown(object,type);
    const hp=elite?150+this.state.wave*15:type==='boss'?(outpost?1800:1500):outpost&&type==='brute'?82+this.state.wave*7:outpost&&type==='runner'?34:outpost&&type==='spitter'?58:type==='runner'?25:45+this.state.wave*5;
    const baseSpeed=outpost&&type==='brute'?1.38:outpost&&type==='runner'?4.15:type==='runner'?3.5:outpost&&type==='spitter'?1.25:1.6+this.state.wave*.06;
    const enemy={obj:object,type,elite,stunned:false,slow:0,hp,maxHp:hp,size,speed:type==='boss'?1.1:baseSpeed*(type==='runner'?(difficulty.runnerScale||difficulty.speedScale||1):(difficulty.speedScale||1)),attack:1.5,contactDamage:type==='boss'?22:(outpost&&type==='runner'?13:difficulty.contactDamage||9),projectileSpeed:difficulty.projectileSpeed||5};
    if(outpostConfig)enemy.role=outpostConfig.role;
    enemy.customBoss=(furnace||outpost)&&type==='boss';enemy.outpostBoss=outpost&&type==='boss';
    if(type==='boss'&&!furnace&&!outpost)enemy.bossPhase=1;
    if(enemy.outpostBoss)enemy.bossPhase=1;
    if(furnace&&enemy.customBoss){enemy.size=1.3;enemy.hp=enemy.maxHp=2000;object.position.set(0,0,-16);this.state.bossStats={startedAt:this.state.time,damageByWeapon:{},damageByDevice:{},damageTaken:0,damageSources:{},actions:{},meleeDiagnostics:[]};this.telemetry.startBoss(this.state.time,'黑骑士')}
    if(enemy.outpostBoss){enemy.size=1.55;enemy.hp=enemy.maxHp=1800;object.position.set(0,0,-15);this.state.bossStats={startedAt:this.state.time,damageByWeapon:{},damageByDevice:{},damageTaken:0,damageSources:{},actions:{},meleeDiagnostics:[]};this.telemetry.startBoss(this.state.time,'哨站守卫 · Clanker')}
    else if(type==='boss')this.telemetry.startBoss(this.state.time,'骸骨巨像');
    this.effects.attachEnemyStatus(enemy);
    this.enemies.push(enemy);
    if(type==='boss')this.bossDamageAccess.attach(enemy,this.state.chapter);
    return enemy;
  }

  addEliteCrown(object,type){
    object.scale.multiplyScalar(1.35);
    const crown=new T.Mesh(new T.ConeGeometry(1,1,7),new T.MeshStandardMaterial({color:0xd7ae66,metalness:.5,roughness:.4}));
    crown.position.set(0,type==='runner'?1.6:1.8,0);
    crown.scale.set(.35,.45,.35);
    crown.rotation.z=.15;
    crown.castShadow=crown.receiveShadow=true;
    object.add(crown);
  }

  damageEnemy(enemy,damage,source={}){
    if(enemy.dead||enemy.stunned)return;
    if(enemy.outpostBoss&&enemy.phaseTransition<=0)this.outpostCombat.onBossHit(enemy,source);
    const access=this.bossDamageAccess.evaluate(enemy,source),damageMultiplier=access.multiplier;
    if(access.blocked&&this.state.time>=(enemy.damageAccessFeedback||0)){enemy.damageAccessFeedback=this.state.time+.18;this.effects.resistImpact(enemy)}
    damage*=damageMultiplier;
    const applied=Math.min(enemy.hp,damage);
    this.telemetry.recordDamage(source,applied,{boss:enemy.type==='boss'||enemy.customBoss});
    if(enemy.customBoss&&this.state.bossStats&&applied>0){
      if(Number.isInteger(source.weapon)){const key=source.weaponLabel||String(source.weapon);this.state.bossStats.damageByWeapon[key]=(this.state.bossStats.damageByWeapon[key]||0)+applied}
      if(source.device){const labels={thorn:'自动弩台',electric:'雷鸣法典',blast:'炼金炸瓶'};const key=labels[source.device]||source.device;this.state.bossStats.damageByDevice[key]=(this.state.bossStats.damageByDevice[key]||0)+applied}
    }
    enemy.hp-=damage;
    if(enemy.type==='boss'&&!enemy.customBoss&&enemy.bossPhase===1&&enemy.hp>0&&enemy.hp<=enemy.maxHp*.5){
      enemy.bossPhase=2;enemy.attack=.35;enemy.volley=0;this.view.showToast('骸骨巨像进入狂骨阶段 · 弹幕与践踏加速',2.2);this.cameraKick=Math.max(this.cameraKick,.42);this.cameraKickDuration=.22;this.cameraKickTime=.22;
    }
    if(enemy.customBoss&&!enemy.outpostBoss&&enemy.bossPhase!==2&&enemy.hp>0&&enemy.hp<=enemy.maxHp*.5){
      enemy.bossPhase=2;enemy.attack=.4;this.view.showToast('黑骑士进入双炉阶段 · 地火封位与连斩强化',2.2);this.cameraKick=Math.max(this.cameraKick,.45);this.cameraKickDuration=.24;this.cameraKickTime=.24;
    }
    if(enemy.outpostBoss&&enemy.bossPhase===1&&enemy.hp>0&&enemy.hp<=enemy.maxHp*.5)this.outpostCombat.enterPhaseTwo(enemy);
    const reaction=MELEE_FEEDBACK[source.model]?.reaction??.55;
    if(!(enemy.customBoss&&enemy.furnaceAction))Actors.hitActor(enemy.obj,reaction);
    this.effects.burst(enemy.obj.position,0xfbc47b,3);
    if(enemy.elite&&enemy.hp<=enemy.maxHp*.3){this.cancelSpecialEnemy(enemy);enemy.hp=Math.max(1,enemy.hp);enemy.stunned=true;enemy.rangedWindup=null;this.effects.updateEnemyStatus(enemy,this.state.time);this.pendingElite=enemy;return}
    if(enemy.hp>0)return;
    enemy.dead=true;
    if(enemy.type==='boss'||enemy.customBoss)this.telemetry.endBoss(this.state.time);
    this.cancelSpecialEnemy(enemy);
    enemy.rangedWindup=null;
    this.effects.updateEnemyStatus(enemy,this.state.time);
    this.garden.cancelStomps(enemy);
    this.state.kills++;
    this.telemetry.recordKill(source);
    this.garden.onKill(enemy.obj.position,source);
    this.audio.play(140,.07,'triangle',.012);
    const pickup=createPickup(this.scene,enemy.obj.position);
    this.drops.push({obj:pickup,value:enemy.type==='boss'?15:enemy.type==='brute'?2:1});
    if(Math.random()<.09){const healing=createPickup(this.scene,enemy.obj.position,true);this.drops.push({obj:healing,value:0,heal:true})}
    Actors.dieActor(enemy.obj);
    this.effects.addCorpse(enemy.obj);
    this.effects.burst(enemy.obj.position);
  }

  cancelSpecialEnemy(enemy){this.furnaceCombat.cancel(enemy);this.outpostCombat.cancel(enemy)}

  captureChoice(){
    const enemy=this.pendingElite;if(!enemy)return;
    this.state.mode='capture';
    this.input.clear();
    const type=enemy.type==='runner'?'mushroom':'slime';
    const resolve=()=>{enemy.dead=true;Actors.disposeActor(enemy.obj);this.pendingElite=null;this.state.mode='playing';this.view.hideModal()};
    this.view.showCapture({type,onRecruit:()=>{resolve();this.garden.recruit(type)},onHarvest:()=>{resolve();this.state.kills++;this.state.xp+=this.state.need;this.levelUp()}});
  }

  attack(){return this.combat.attack()}

  applyMeleeFeedback({profile,targets=[]}){
    const feedback=MELEE_FEEDBACK[profile.model];
    if(!feedback||!targets.length)return false;
    this.heroHitStop=Math.max(this.heroHitStop,feedback.freeze);
    if(profile.stagger)for(const enemy of targets)if(!enemy.dead&&enemy.customBoss&&enemy.furnaceAction)this.effects.resistImpact(enemy);
    for(const enemy of targets)if(!(enemy.customBoss&&enemy.furnaceAction))enemy.hitStop=Math.max(enemy.hitStop||0,feedback.freeze*(enemy.type==='boss'?.55:1));
    const shake=this.reducedMotion?0:feedback.shake*Math.min(1.35,.9+targets.length*.08);
    this.cameraKick=Math.max(this.cameraKick,shake);
    this.cameraKickDuration=.14+feedback.freeze;
    this.cameraKickTime=this.cameraKickDuration;
    this.audio.playMeleeImpact(profile.model,targets.length);
    this.lastMeleeFeedback={model:profile.model,hits:targets.length,freeze:feedback.freeze,shake};
    return true;
  }

  hurt(amount,source='other'){
    if(['won','lost','title'].includes(this.state.mode))return;
    if(this.state.inv>0)return;
    const reduction=this.hero.userData.profile.damageTaken||1;
    if(reduction<1){this.showMechanicOnce('knight-shield','守卫剑盾 · 受到伤害减少 20%');const facing=new T.Vector3(Math.sin(this.hero.rotation.y),0,Math.cos(this.hero.rotation.y));this.effects.guardFlash(this.hero.position,facing)}
    amount*=reduction;
    const actual=Math.min(this.state.hp,amount);
    armShieldCounter(this.state,this.hero.userData.profile,actual);
    if(this.state.shieldCounterUntil>this.state.time)this.knightVfx.ready(this.hero,this.state);
    this.telemetry.recordDamageTaken(source,actual);
    if(this.state.bossStats&&actual>0){this.state.bossStats.damageTaken+=actual;this.state.bossStats.damageSources[source]=(this.state.bossStats.damageSources[source]||0)+actual}
    this.state.hp=Math.max(0,this.state.hp-amount);
    Actors.hitActor(this.hero);
    this.state.inv=.65;
    this.effects.burst(this.hero.position,0xff866c);
    this.audio.play(90,.16,'sawtooth');
    if(this.state.hp<=0)this.finish(false);
  }

  levelUp(){
    this.state.xp=Math.max(0,this.state.xp-this.state.need);
    this.state.level++;
    this.state.need+=4;
    this.state.mode='upgrade';
    this.input.clear();
    const choices=createUpgradeChoices({state:this.state,garden:this.garden,heroName:this.hero.userData.rig.name});
    this.view.showUpgrade(this.state,choices,choice=>{choice.apply();this.telemetry.recordUpgrade(choice,this.state);this.state.mode='playing';this.view.hideModal();this.view.renderStats(this.currentStats());this.audio.play(700,.2)});
  }

  finish(win){
    this.state.mode=win?'won':'lost';
    this.audio.stopAll();this.level?.cleanup();this.furnaceCombat.reset();this.furnaceCycle.suppress();this.furnaceWorld.update(this.furnaceCycle,this.state.time);this.outpostCombat.reset();this.outpostWorld.wind.suppress();this.outpostWorld.wind.updateVisual(this.state.time);
    this.bossDamageAccess.reset();
    if(!win)Actors.dieActor(this.hero);
    this.input.clear();
    this.best=Math.max(this.best,this.state.kills);
    this.saveBest();
    this.lastRunReport=this.telemetry.finish({win,state:this.state,garden:this.garden});
    this.view.showFinish({win,state:this.state,garden:this.garden,best:this.best,bossStats:this.state.bossStats,runReport:this.lastRunReport,onRestart:()=>this.start(),onChangeHero:()=>this.returnToTitle(),onNext:()=>{this.returnToTitle();const next=this.state.chapter==='ruins'?'furnace':this.state.chapter==='furnace'?'outpost':null;if(next){this.chooseLevel(next);this.start()}}});
  }

  pause(){
    if(!['playing','paused'].includes(this.state.mode))return;
    if(this.state.mode==='paused'){this.state.mode='playing';this.audio.resume();this.view.hideModal();return}
    this.state.mode='paused';
    this.audio.pause();
    this.input.clear();
    this.view.showPause(()=>this.pause());
  }

  openGuide(){if(this.state.mode==='playing'){this.pause();this.view.showGuide(()=>this.pause())}}

  dash(){
    if(this.state.mode!=='playing'||this.state.dash>0)return;
    this.state.dash=3;
    this.state.inv=this.state.chapter==='outpost'?.45:.4;
    const from=this.hero.position.clone();
    this.hero.position.addScaledVector(this.lastDirection,this.state.chapter==='outpost'?3.8:3.4);
    if(this.hero.position.length()>20)this.hero.position.setLength(20);
    this.garden.onDash(from,this.hero.position);
    if(this.state.chapter==='outpost')this.outpostCombat.onDash(from,this.hero.position);
    this.effects.burst(this.hero.position);
    this.audio.play(320,.15);
  }

  tick(dt){
    if(this.state.mode!=='playing')return;
    this.telemetry.advance(dt,this.hero?.userData?.profile);
    this.updatePlayer(dt);
    this.updateWaveSpawning(dt);
    this.updateEnemies(dt);
    if(this.state.mode!=='playing')return;
    this.combat.step(dt);
    this.updateHazards(dt);
    this.updateDrops(dt);
    if(this.state.mode!=='playing')return;
    this.garden.step(dt,this.drops,amount=>this.hurt(amount));
    if(this.state.mode==='playing'){
      this.level?.step(dt);this.bossDamageAccess.step(dt,this.state.time);
      const levelHud=this.level?.getHudState()||{},damageAccess=this.bossDamageAccess.getHudState();
      this.state.levelHud={...levelHud,damageAccess,status:levelHud.status||damageAccess?.status||''};
    }
    if(this.state.mode!=='playing')return;
    if(this.pendingElite){this.captureChoice();return}
    this.advanceWaveIfCleared();
    if(this.state.mode==='playing'&&this.state.xp>=this.state.need)this.levelUp();
  }

  updatePlayer(dt){
    const previousPosition=this.hero.position.clone();
    this.state.time+=dt;this.state.waveTime+=dt;this.state.dash=Math.max(0,this.state.dash-dt);this.state.inv=Math.max(0,this.state.inv-dt);this.state.shot-=dt;
    const heroFrozen=this.heroHitStop>0;
    this.heroHitStop=Math.max(0,this.heroHitStop-dt);
    const moveSpeed=this.state.speed*(this.hero.userData.profile.moveBonus||1);
    const moveInput=this.input.getMoveVector();
    const move=new T.Vector3(moveInput.x,0,moveInput.y);
    move.applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4);
    if(move.lengthSq()){
      if(move.lengthSq()>1)move.normalize();
      this.lastDirection.copy(move).normalize();
      if(!heroFrozen)this.hero.position.addScaledVector(move,moveSpeed*dt);
      this.hero.rotation.y=Math.atan2(move.x,move.z);
    }
    if(this.combat.swing)this.hero.rotation.y=Math.atan2(this.combat.swing.dir.x,this.combat.swing.dir.z);
    Actors.animateActor(this.hero,heroFrozen?0:dt,this.state.time,move.lengthSq()?moveSpeed*Math.min(1,move.length()):0);
    if(this.hero.position.length()>20)this.hero.position.setLength(20);
    this.hero.userData.movementVelocity=this.hero.position.clone().sub(previousPosition).divideScalar(Math.max(dt,.0001));
    this.hero.visible=this.state.inv<=0||Math.floor(this.state.inv*20)%2===0;
  }

  updateWaveSpawning(dt){
    this.state.spawn-=dt;
    if(this.state.remaining>0&&this.state.spawn<=0){
      const wave=this.level?.getWave(this.state.wave)||null;
      const index=wave?wave.count-this.state.remaining:0;
      const formation=wave?.formation,slot=formation&&index%formation.length,entry=formation?.[slot];
      if(entry){
        // Each group approaches from one side, away from the hero's current edge.
        // Lock that direction for the entire group so movement cannot scatter it.
        if(slot===0||this.furnaceFormationAngle==null)this.furnaceFormationAngle=
          this.hero.position.lengthSq()>1?Math.atan2(this.hero.position.z,this.hero.position.x)+Math.PI:Math.random()*Math.PI*2;
        this.spawnEnemy(entry.type,false,this.furnaceFormationAngle+entry.offset);
      }else this.spawnEnemy();
      this.state.remaining--;
      this.state.spawn=entry?.delay??wave?.interval??Math.max(.4,1.1-this.state.wave*.06);
    }
    if(this.state.shot<=0)this.attack();
  }

  updateEnemies(dt){
    for(const enemy of this.enemies){
      if(enemy.dead||enemy.stunned)continue;
      if(this.state.mode!=='playing')break;
      if(this.level?.stepEnemy(enemy,dt))continue;
      if(enemy.type==='boss'&&(enemy.recovery>0||this.garden.effects.some(f=>f.stomp&&f.source===enemy))){
        enemy.recovery=Math.max(0,(enemy.recovery||0)-dt);
        this.effects.updateEnemyStatus(enemy,this.state.time);
        Actors.animateActor(enemy.obj,dt,this.state.time,0);
        continue;
      }
      if(enemy.stagger>0&&enemy.rangedWindup){
        enemy.rangedWindup=null;
        enemy.attack=Math.max(enemy.attack,enemy.type==='boss'?.6:.45);
      }
      const hitStopped=enemy.hitStop>0;
      enemy.hitStop=Math.max(0,(enemy.hitStop||0)-dt);
      if(hitStopped){this.effects.updateEnemyStatus(enemy,this.state.time);Actors.animateActor(enemy.obj,0,this.state.time,0);continue}
      enemy.stagger=Math.max(0,(enemy.stagger||0)-dt);
      this.effects.updateEnemyStatus(enemy,this.state.time);
      if(enemy.stagger>0){Actors.animateActor(enemy.obj,dt*.22,this.state.time,0);continue}
      enemy.slow=Math.max(0,(enemy.slow||0)-dt);
      this.effects.updateEnemyStatus(enemy,this.state.time);
      const delta=this.hero.position.clone().sub(enemy.obj.position),distance=delta.length();delta.normalize();
      const beingPushed=!!enemy.push;
      const speed=beingPushed?0:enemy.speed*(enemy.slow>0?.55:1);
      if(!beingPushed&&!enemy.rangedWindup&&(enemy.type!=='spitter'||distance>8))enemy.obj.position.addScaledVector(delta,speed*dt);
      const facing=enemy.rangedWindup?.direction||delta;
      enemy.obj.rotation.y=Math.atan2(facing.x,facing.z);
      Actors.animateActor(enemy.obj,dt,this.state.time,!enemy.rangedWindup&&(enemy.type!=='spitter'||distance>8)?speed:0);
      enemy.attack-=dt;enemy.melee=(enemy.melee||0)-dt;
      if(distance<enemy.size+.45){this.hurt(enemy.contactDamage??(enemy.type==='boss'?22:9),enemy.customBoss?'boss-contact':'enemy-contact');if(enemy.melee<=0){Actors.kickActor(enemy.obj);enemy.melee=.8}}
      if(enemy.type==='spitter'||enemy.type==='boss'){
        const duration=enemy.type==='boss'?.6:.45;
        if(!enemy.rangedWindup&&enemy.attack<=duration){
          enemy.attack=Math.max(enemy.attack,duration);
          this.beginEnemyWindup(enemy,delta,duration);
        }
        if(enemy.rangedWindup&&enemy.attack<=0){
          this.fireEnemyProjectiles(enemy,enemy.rangedWindup.direction);
          enemy.rangedWindup=null;
        }
        this.effects.updateEnemyStatus(enemy,this.state.time);
      }
    }
    this.enemies=this.enemies.filter(enemy=>!enemy.dead);
  }

  beginEnemyWindup(enemy,direction,duration){
    const pattern=enemy.type==='boss'&&(enemy.volley||0)%2?'fan':'ring';
    const aim=direction.clone();
    if(enemy.type==='spitter'){
      const velocity=this.hero.userData.movementVelocity?.clone().setY(0)||new T.Vector3();
      if(velocity.lengthSq()>1e-6){velocity.setLength(Math.min(velocity.length()*.42,3));}
      aim.copy(this.hero.position).add(velocity).sub(enemy.obj.position).setY(0).normalize();
      enemy.obj.rotation.y=Math.atan2(aim.x,aim.z);
    }
    if(enemy.type==='boss'&&pattern==='fan'){
      aim.copy(this.hero.position).addScaledVector(this.hero.userData.movementVelocity||new T.Vector3(),.7).sub(enemy.obj.position).setY(0).normalize();
      enemy.obj.rotation.y=Math.atan2(aim.x,aim.z);
    }
    enemy.rangedWindup={direction:aim,duration,pattern};
  }

  fireEnemyProjectiles(enemy,direction){
    if(this.enemies.some(e=>e.customBoss&&!e.dead&&e.recovery>0)){enemy.attack=1;return}
    enemy.attack=enemy.type==='boss'?(enemy.bossPhase>=2?1.55:2):3;
    const boss=enemy.type==='boss',pattern=enemy.rangedWindup?.pattern||'ring';
    const angles=boss?bossShotAngles(pattern):[0];
    for(const angle of angles){
      const shotDirection=boss&&pattern==='ring'?new T.Vector3(Math.sin(angle),0,Math.cos(angle)):direction.clone().applyAxisAngle(new T.Vector3(0,1,0),angle);
      const velocity=shotDirection.multiplyScalar(boss?(pattern==='fan'?(enemy.bossPhase>=2?8.2:7.5):(enemy.bossPhase>=2?5.6:5)):(enemy.projectileSpeed||5)),object=enemyProjectile(enemy.obj.position.clone().setY(.7),velocity);
      this.scene.add(object);Actors.kickActor(enemy.obj);this.hazards.push({obj:object,v:velocity,life:6,source:enemy,push:enemy.role==='tech'?1.8:0,hit:false});
    }
    if(boss)enemy.volley=(enemy.volley||0)+1;
  }

  updateHazards(dt){
    const heroCenter=this.hero.position.clone().setY(.7);
    for(const hazard of this.hazards){hazard.life-=dt;hazard.obj.position.addScaledVector(hazard.v,dt);if(hazard.obj.position.distanceTo(heroCenter)<.65){if(!hazard.hit&&hazard.push){const pushDir=hazard.v.clone().setY(0).normalize();this.hero.position.addScaledVector(pushDir,hazard.push);if(this.hero.position.length()>20)this.hero.position.setLength(20);hazard.hit=true}this.hurt(hazard.push?8:12,hazard.source?.customBoss?'boss-projectile':hazard.push?'outpost-windbolt':'enemy-projectile');hazard.life=0}}
    this.hazards=this.hazards.filter(hazard=>{if(hazard.life>0)return true;this.scene.remove(hazard.obj);hazard.obj.userData.dispose?.();return false});
  }

  updateDrops(dt){
    for(const drop of this.drops){
      drop.obj.rotation.y+=dt*2;
      const delta=this.hero.position.clone().sub(drop.obj.position).setY(0),distance=delta.length();
      if(distance<this.state.magnet)drop.obj.position.addScaledVector(delta.normalize(),dt*9);
      if(distance>=.65)continue;
      if(drop.heal)this.state.hp=Math.min(this.state.maxHp,this.state.hp+18);else this.state.xp+=drop.value;
      drop.dead=true;this.scene.remove(drop.obj);this.audio.play(900,.035,'sine',.008);
    }
    this.drops=this.drops.filter(drop=>!drop.dead);
  }

  advanceWaveIfCleared(){
    if(this.state.remaining!==0||!this.enemies.every(enemy=>enemy.dead))return;
    const finalWave=this.level?.finalWave||8;
    if(this.state.wave===finalWave){this.finish(true);return}
    this.state.wave++;this.state.hp=Math.min(this.state.maxHp,this.state.hp+12);this.beginWave();
  }

  frame(now){
    requestAnimationFrame(time=>this.frame(time));
    if(this.testLab?.manual){this.lastFrame=now;return;}
    const frameMs=Math.min(200,Math.max(0,now-this.lastFrame));
    const dt=Math.min(.04,frameMs/1000);this.lastFrame=now;this.quality?.update(frameMs);
    if(this.state.mode==='playing')this.tick(dt);
    if(this.state.mode==='lost')Actors.animateActor(this.hero,dt,now/1000,0);
    this.effects.update(dt,now/1000,this.state.mode);
    this.view.updateToast(dt,this.state.mode==='playing'||this.state.mode==='title');
    this.updateCamera(dt,now);
    this.uiElapsed+=dt;
    if(this.uiElapsed>.1){this.view.renderHud(this.state,this.garden,this.enemies,this.currentStats(),this.currentDevices());this.uiElapsed=0}
    this.renderer.render(this.scene,this.camera);
  }

  updateCamera(dt,now){
    if(this.world.flame){this.world.flame.scale.y=.7+Math.sin(now*.006)*.15;this.world.flame.rotation.y=now*.001}
    if(this.state.mode==='title'){
      this.hero.position.set(4,0,2);this.hero.rotation.y=now*.0003;Actors.animateActor(this.hero,dt,now/1000,0);this.camera.position.set(30,31,37);this.camera.lookAt(0,0,0);return;
    }
    const follow=this.state.chapter!=='ruins'&&this.camera.aspect<.85?1:.35;
    const target=this.hero.position.clone().multiplyScalar(follow);
    this.camera.position.lerp(new T.Vector3(target.x+20,27,target.z+24),1-Math.exp(-dt*4));
    this.cameraKickTime=Math.max(0,this.cameraKickTime-dt);
    if(this.cameraKickTime>0){
      const decay=(this.cameraKickTime/this.cameraKickDuration)**2,amount=this.cameraKick*decay;
      this.camera.position.x+=Math.sin(now*.071)*amount;
      this.camera.position.y+=Math.sin(now*.113)*amount*.3;
      this.camera.position.z+=Math.cos(now*.089)*amount;
    }
    this.camera.lookAt(target.x,0,target.z);
  }

  loadNature(){loadNatureAssets(this.ruinsRoot).then(()=>{document.body.dataset.nature='loaded'}).catch(()=>{document.body.dataset.nature='fallback'})}

  async exposeTestApi(){
    if(!new URLSearchParams(location.search).has('test'))return;
    const game=this;
    window.__game={
      chooseLevel:id=>game.chooseLevel(id),furnaceCycle:this.furnaceCycle,furnaceCombat:this.furnaceCombat,furnaceWorld:this.furnaceWorld,outpostWorld:this.outpostWorld,outpostCombat:this.outpostCombat,bossDamageAccess:this.bossDamageAccess,beginWave:()=>game.beginWave(),pause:()=>game.pause(),dash:()=>game.dash(),setManual:value=>{game.testLab={manual:value}},render:()=>{game.updateCamera(1,performance.now());game.view.renderHud(game.state,game.garden,game.enemies,game.currentStats(),game.currentDevices());game.renderer.render(game.scene,game.camera)},
      THREE:T,actors:Actors,state:this.state,hero:this.hero,input:this.input,garden:this.garden,combat:this.combat,effects:this.effects,meleeVfx:this.meleeVfx,remoteVfx:this.remoteVfx,audio:this.audio,quality:this.quality,
      get enemies(){return game.enemies},get drops(){return game.drops},get bullets(){return game.combat.bullets},get hazards(){return game.hazards},get corpses(){return game.effects.corpses},
      selectHero:Actors.selectHero,chooseHero:name=>game.chooseHero(name),returnToTitle:()=>game.returnToTitle(),equip:slot=>game.equip(slot),attack:()=>game.attack(),tick:dt=>game.tick(dt),damageEnemy:(...args)=>game.damageEnemy(...args),hurt:(...args)=>game.hurt(...args),levelUp:()=>game.levelUp(),finish:win=>game.finish(win),start:()=>game.start(),spawnEnemy:(...args)=>game.spawnEnemy(...args),renderer:this.renderer,scene:this.scene,camera:this.camera,get lastMeleeFeedback(){return game.lastMeleeFeedback},get bossStats(){return game.state.bossStats},get telemetry(){return game.telemetry},get runReport(){return game.lastRunReport},
    };
    if(new URLSearchParams(location.search).has('scenario')){
      const {installCombatLab}=await import('./combat-lab.js');
      this.testLab=installCombatLab(this);
      window.__game.lab=this.testLab;
    }
  }
}
