import * as T from 'three';
import * as Actors from './actors.js';
import {HEROES} from './loadouts.js';
import {projectile} from './projectiles.js';
import {WeaponCombat} from './combat.js';
import {Garden,COMBOS,PLANTS} from './garden.js';
import {createWorld,loadNatureAssets,createPickup} from './ruins.js';
import {AudioService} from './audio.js';
import {buildCharacterStats} from './character-stats.js';
import {buildDeviceStatus} from './device-status.js';
import {EffectsSystem} from './effects.js';
import {MeleeVfx} from './melee-vfx.js';
import {createGameState,resetRunState} from './game-state.js';
import {InputController} from './input-controller.js';
import {createSceneRuntime,createRing} from './scene-runtime.js';
import {GameView} from './ui.js';
import {createUpgradeChoices} from './upgrades.js';

const MELEE_FEEDBACK={
  sword_1handed:{freeze:.025,shake:.035,reaction:.68},
  sword_2handed:{freeze:.06,shake:.3,reaction:1},
  Skeleton_Mace:{freeze:.05,shake:.23,reaction:.92},
};

export class RelicWorkshopGame{
  constructor(app){
    this.app=app;
    this.view=new GameView({app,heroes:HEROES,combos:COMBOS,plants:PLANTS});
    this.view.mount();
    this.audio=new AudioService();
    this.state=createGameState();
    this.enemies=[];
    this.drops=[];
    this.hazards=[];
    this.pendingElite=null;
    this.lastDirection=new T.Vector3(0,0,1);
    this.heroHitStop=0;
    this.cameraKick=0;
    this.cameraKickTime=0;
    this.cameraKickDuration=0;
    this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    this.best=this.readBest();
  }

  async initialize(){
    await this.loadActors();
    document.body.dataset.actors='loaded';
    this.view.setBest(this.best);
    this.setupRuntime();
    await this.meleeVfx.ready;
    document.body.dataset.effects='loaded';
    this.bindControls();
    this.equip();
    this.exposeTestApi();
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
    this.camera=runtime.camera;
    this.world=createWorld(this.scene);
    this.hero=Actors.createHero(this.scene).hero;
    this.hero.add(createRing(.8,.05,0xffffff));
    this.effects=new EffectsSystem({scene:this.scene,animateActor:Actors.animateActor,disposeActor:Actors.disposeActor});
    this.meleeVfx=new MeleeVfx({effects:this.effects,camera:this.camera});
    this.garden=new Garden({scene:this.scene,hero:this.hero,state:this.state,enemies:()=>this.enemies,damage:(...args)=>this.damageEnemy(...args),toast:message=>this.view.showToast(message),burst:(...args)=>this.effects.burst(...args)});
    this.combat=new WeaponCombat({
      scene:this.scene,hero:this.hero,state:this.state,enemies:()=>this.enemies,damage:(...args)=>this.damageEnemy(...args),garden:this.garden,
      onFire:profile=>{Actors.kickActor(this.hero,this.state.rate);this.audio.play([600,180,850,240][profile.type],.07,profile.type===1?'sawtooth':'triangle',.018)},
      effect:(object,life)=>this.effects.add(object,life,{fixed:true}),
      onMeleeImpact:event=>{this.meleeVfx.play(event);this.applyMeleeFeedback(event)},
    });
    this.lastFrame=performance.now();
    this.uiElapsed=0;
  }

  bindControls(){
    this.view.bind({onStart:()=>this.start(),onCharacter:name=>this.chooseHero(name),onPause:()=>this.pause(),onSound:()=>this.view.setSoundMuted(this.audio.toggle()),onDash:()=>this.dash(),onGuide:()=>this.openGuide()});
    this.input=new InputController({root:this.app,onDash:()=>this.dash(),onPause:fromBlur=>{if(!fromBlur||this.state.mode==='playing')this.pause()},onWeapon:slot=>{if(['title','playing','paused'].includes(this.state.mode))this.equip(slot)}});
  }

  readBest(){try{return Number(localStorage.getItem('ember-best'))||0}catch{return 0}}
  saveBest(){try{localStorage.setItem('ember-best',this.best)}catch{}}

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
  }

  clearObjects(list,skip=new Set()){
    for(const item of list){
      if(skip.has(item.obj))continue;
      if(item.obj.userData.rig)Actors.disposeActor(item.obj);else this.scene.remove(item.obj);
      if(item.dispose){item.obj.geometry?.dispose();item.obj.material?.dispose()}
    }
    list.length=0;
  }

  beginWave(){
    this.state.remaining=this.state.wave===8?8:6+this.state.wave*3;
    this.state.spawn=.6;
    this.state.waveTime=0;
    if([2,4,6].includes(this.state.wave))this.spawnEnemy(this.state.wave===4?'runner':'brute',true);
    this.view.showToast(this.state.wave===8?'最后的挑战 · 骸骨巨像':`第 ${this.state.wave} 波 · 骸骨军团来袭`);
    if(this.state.wave===8)this.spawnEnemy('boss');
  }

  spawnEnemy(force,elite=false){
    const type=force||(this.state.wave>2&&Math.random()<.23?'spitter':Math.random()<.3?'runner':'brute');
    const angle=Math.random()*Math.PI*2;
    const object=Actors.createCreature(elite&&type==='brute'?'necromancer':type);
    object.position.set(Math.cos(angle)*20,0,Math.sin(angle)*20);
    this.scene.add(object);
    const size=type==='boss'?2.1:type==='runner'?.6:.85;
    if(elite)this.addEliteCrown(object,type);
    const hp=elite?150+this.state.wave*15:type==='boss'?1500:type==='runner'?25:45+this.state.wave*5;
    const enemy={obj:object,type,elite,stunned:false,slow:0,hp,maxHp:hp,size,speed:type==='boss'?1.1:type==='runner'?3.5:1.6+this.state.wave*.06,attack:1.5};
    this.effects.attachEnemyStatus(enemy);
    this.enemies.push(enemy);
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
    enemy.hp-=damage;
    const reaction=MELEE_FEEDBACK[source.model]?.reaction??.55;
    Actors.hitActor(enemy.obj,reaction);
    this.effects.burst(enemy.obj.position,0xfbc47b,3);
    if(enemy.elite&&enemy.hp<=enemy.maxHp*.3){enemy.hp=Math.max(1,enemy.hp);enemy.stunned=true;this.pendingElite=enemy;return}
    if(enemy.hp>0)return;
    enemy.dead=true;
    this.state.kills++;
    this.garden.onKill(enemy.obj.position,source);
    this.audio.play(140,.07,'triangle',.012);
    const pickup=createPickup(this.scene,enemy.obj.position);
    this.drops.push({obj:pickup,value:enemy.type==='boss'?15:enemy.type==='brute'?2:1});
    if(Math.random()<.09){const healing=createPickup(this.scene,enemy.obj.position,true);this.drops.push({obj:healing,value:0,heal:true})}
    Actors.dieActor(enemy.obj);
    this.effects.addCorpse(enemy.obj);
    this.effects.burst(enemy.obj.position);
  }

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
    for(const enemy of targets)enemy.hitStop=Math.max(enemy.hitStop||0,feedback.freeze*(enemy.type==='boss'?.55:1));
    const shake=this.reducedMotion?0:feedback.shake*Math.min(1.35,.9+targets.length*.08);
    this.cameraKick=Math.max(this.cameraKick,shake);
    this.cameraKickDuration=.14+feedback.freeze;
    this.cameraKickTime=this.cameraKickDuration;
    this.audio.playMeleeImpact(profile.model,targets.length);
    this.lastMeleeFeedback={model:profile.model,hits:targets.length,freeze:feedback.freeze,shake};
    return true;
  }

  hurt(amount){
    if(this.state.inv>0)return;
    amount*=this.hero.userData.profile.damageTaken||1;
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
    this.view.showUpgrade(this.state,choices,choice=>{choice.apply();this.state.mode='playing';this.view.hideModal();this.view.renderStats(this.currentStats());this.audio.play(700,.2)});
  }

  finish(win){
    this.state.mode=win?'won':'lost';
    if(!win)Actors.dieActor(this.hero);
    this.input.clear();
    this.best=Math.max(this.best,this.state.kills);
    this.saveBest();
    this.view.showFinish({win,state:this.state,garden:this.garden,best:this.best,onRestart:()=>this.start(),onChangeHero:()=>this.returnToTitle()});
  }

  pause(){
    if(!['playing','paused'].includes(this.state.mode))return;
    if(this.state.mode==='paused'){this.state.mode='playing';this.view.hideModal();return}
    this.state.mode='paused';
    this.input.clear();
    this.view.showPause(()=>this.pause());
  }

  openGuide(){if(this.state.mode==='playing'){this.pause();this.view.showGuide(()=>this.pause())}}

  dash(){
    if(this.state.mode!=='playing'||this.state.dash>0)return;
    this.state.dash=3;
    this.state.inv=.4;
    const from=this.hero.position.clone();
    this.hero.position.addScaledVector(this.lastDirection,3.4);
    if(this.hero.position.length()>20)this.hero.position.setLength(20);
    this.garden.onDash(from,this.hero.position);
    this.effects.burst(this.hero.position);
    this.audio.play(320,.15);
  }

  tick(dt){
    if(this.state.mode!=='playing')return;
    this.updatePlayer(dt);
    this.updateWaveSpawning(dt);
    this.updateEnemies(dt);
    this.combat.step(dt);
    this.updateHazards(dt);
    this.updateDrops(dt);
    if(this.state.mode!=='playing')return;
    this.garden.step(dt,this.drops,amount=>this.hurt(amount));
    if(this.state.mode!=='playing')return;
    if(this.pendingElite){this.captureChoice();return}
    this.advanceWaveIfCleared();
    if(this.state.mode==='playing'&&this.state.xp>=this.state.need)this.levelUp();
  }

  updatePlayer(dt){
    this.state.time+=dt;this.state.waveTime+=dt;this.state.dash=Math.max(0,this.state.dash-dt);this.state.inv=Math.max(0,this.state.inv-dt);this.state.shot-=dt;
    const heroFrozen=this.heroHitStop>0;
    this.heroHitStop=Math.max(0,this.heroHitStop-dt);
    const moveSpeed=this.state.speed*(this.hero.userData.profile.moveBonus||1);
    const move=new T.Vector3(Number(this.input.isDown('d','arrowright'))-Number(this.input.isDown('a','arrowleft')),0,Number(this.input.isDown('s','arrowdown'))-Number(this.input.isDown('w','arrowup')));
    move.applyAxisAngle(new T.Vector3(0,1,0),Math.PI/4);
    if(move.lengthSq()){move.normalize();this.lastDirection.copy(move);if(!heroFrozen)this.hero.position.addScaledVector(move,moveSpeed*dt);this.hero.rotation.y=Math.atan2(move.x,move.z)}
    if(this.combat.swing)this.hero.rotation.y=Math.atan2(this.combat.swing.dir.x,this.combat.swing.dir.z);
    Actors.animateActor(this.hero,heroFrozen?0:dt,this.state.time,move.lengthSq()?moveSpeed:0);
    if(this.hero.position.length()>20)this.hero.position.setLength(20);
    this.hero.visible=this.state.inv<=0||Math.floor(this.state.inv*20)%2===0;
  }

  updateWaveSpawning(dt){
    this.state.spawn-=dt;
    if(this.state.remaining>0&&this.state.spawn<=0){this.spawnEnemy();this.state.remaining--;this.state.spawn=Math.max(.4,1.1-this.state.wave*.06)}
    if(this.state.shot<=0)this.attack();
  }

  updateEnemies(dt){
    for(const enemy of this.enemies){
      if(enemy.dead||enemy.stunned)continue;
      const hitStopped=enemy.hitStop>0;
      enemy.hitStop=Math.max(0,(enemy.hitStop||0)-dt);
      if(hitStopped){this.effects.updateEnemyStatus(enemy,this.state.time);Actors.animateActor(enemy.obj,0,this.state.time,0);continue}
      enemy.stagger=Math.max(0,(enemy.stagger||0)-dt);
      this.effects.updateEnemyStatus(enemy,this.state.time);
      if(enemy.stagger>0){Actors.animateActor(enemy.obj,dt*.22,this.state.time,0);continue}
      enemy.slow=Math.max(0,(enemy.slow||0)-dt);
      this.effects.updateEnemyStatus(enemy,this.state.time);
      const delta=this.hero.position.clone().sub(enemy.obj.position),distance=delta.length();delta.normalize();
      const speed=enemy.speed*(enemy.slow>0?.55:1);
      if(enemy.type!=='spitter'||distance>8)enemy.obj.position.addScaledVector(delta,speed*dt);
      enemy.obj.rotation.y=Math.atan2(delta.x,delta.z);
      Actors.animateActor(enemy.obj,dt,this.state.time,(enemy.type!=='spitter'||distance>8)?speed:0);
      enemy.attack-=dt;enemy.melee=(enemy.melee||0)-dt;
      if(distance<enemy.size+.45){this.hurt(enemy.type==='boss'?22:9);if(enemy.melee<=0){Actors.kickActor(enemy.obj);enemy.melee=.8}}
      if((enemy.type==='spitter'||enemy.type==='boss')&&enemy.attack<=0)this.fireEnemyProjectiles(enemy,delta);
    }
    this.enemies=this.enemies.filter(enemy=>!enemy.dead);
  }

  fireEnemyProjectiles(enemy,direction){
    enemy.attack=enemy.type==='boss'?2:3;
    const count=enemy.type==='boss'?10:1;
    for(let index=0;index<count;index++){
      const shotDirection=count===1?direction.clone():new T.Vector3(Math.sin(index/count*Math.PI*2),0,Math.cos(index/count*Math.PI*2));
      const velocity=shotDirection.multiplyScalar(5),object=projectile(enemy.obj.position.clone().setY(.7),velocity,0,true);
      this.scene.add(object);Actors.kickActor(enemy.obj);this.hazards.push({obj:object,v:velocity,life:6});
    }
  }

  updateHazards(dt){
    const heroCenter=this.hero.position.clone().setY(.7);
    for(const hazard of this.hazards){hazard.life-=dt;hazard.obj.position.addScaledVector(hazard.v,dt);if(hazard.obj.position.distanceTo(heroCenter)<.65){this.hurt(12);hazard.life=0}}
    this.hazards=this.hazards.filter(hazard=>{if(hazard.life>0)return true;this.scene.remove(hazard.obj);return false});
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
    if(this.state.wave===8){this.finish(true);return}
    this.state.wave++;this.state.hp=Math.min(this.state.maxHp,this.state.hp+12);this.beginWave();
  }

  frame(now){
    requestAnimationFrame(time=>this.frame(time));
    const dt=Math.min(.04,(now-this.lastFrame)/1000);this.lastFrame=now;
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
    this.world.flame.scale.y=.7+Math.sin(now*.006)*.15;this.world.flame.rotation.y=now*.001;
    if(this.state.mode==='title'){
      this.hero.position.set(4,0,2);this.hero.rotation.y=now*.0003;Actors.animateActor(this.hero,dt,now/1000,0);this.camera.position.set(30,31,37);this.camera.lookAt(0,0,0);return;
    }
    const target=this.hero.position.clone().multiplyScalar(.35);
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

  loadNature(){loadNatureAssets(this.scene).then(()=>{document.body.dataset.nature='loaded'}).catch(()=>{document.body.dataset.nature='fallback'})}

  exposeTestApi(){
    if(!new URLSearchParams(location.search).has('test'))return;
    const game=this;
    window.__game={
      THREE:T,actors:Actors,state:this.state,hero:this.hero,garden:this.garden,combat:this.combat,effects:this.effects,meleeVfx:this.meleeVfx,audio:this.audio,
      get enemies(){return game.enemies},get drops(){return game.drops},get bullets(){return game.combat.bullets},get hazards(){return game.hazards},get corpses(){return game.effects.corpses},
      selectHero:Actors.selectHero,chooseHero:name=>game.chooseHero(name),returnToTitle:()=>game.returnToTitle(),equip:slot=>game.equip(slot),attack:()=>game.attack(),tick:dt=>game.tick(dt),damageEnemy:(...args)=>game.damageEnemy(...args),hurt:amount=>game.hurt(amount),levelUp:()=>game.levelUp(),finish:win=>game.finish(win),start:()=>game.start(),spawnEnemy:(...args)=>game.spawnEnemy(...args),renderer:this.renderer,scene:this.scene,camera:this.camera,get lastMeleeFeedback(){return game.lastMeleeFeedback},
    };
  }
}
