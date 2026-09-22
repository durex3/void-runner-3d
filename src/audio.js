const AUDIO_GROUPS=['sfx','ui','music','ambience','voice'];

export class AudioService{
  constructor(){
    this.context=null;this.master=null;this.buses=new Map();this.muted=false;this.paused=false;
    this.manualPaused=false;this.pageHidden=false;this.voices=new Map();this.cooldowns=new Map();
    this.handleVisibility=()=>{if(document.hidden)this.pause('visibility');else this.resume('visibility')};
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.handleVisibility);
  }
  ensureContext(){
    if(this.context)return this.context;
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return null;
    this.context=new Context();this.master=this.context.createGain();this.master.gain.value=this.muted?0:.8;this.master.connect(this.context.destination);
    for(const name of AUDIO_GROUPS){const bus=this.context.createGain();bus.gain.value=1;bus.connect(this.master);this.buses.set(name,bus)}
    return this.context;
  }
  setGroupVolume(group,value){this.ensureContext();const bus=this.buses.get(group);if(!bus)return false;const gain=Math.max(0,Math.min(1,value));bus.gain.value=gain;return true}
  setMuted(muted){this.muted=Boolean(muted);if(this.master)this.master.gain.value=this.muted?0:.8;return this.muted}
  async resume(reason='manual'){
    if(reason==='visibility')this.pageHidden=false;else this.manualPaused=false;this.paused=this.manualPaused||this.pageHidden;if(this.paused)return;
    const context=this.ensureContext();if(context?.state==='suspended')try{await context.resume()}catch{}
  }
  pause(reason='manual'){if(reason==='visibility')this.pageHidden=true;else this.manualPaused=true;this.paused=true;if(this.context?.state==='running')this.context.suspend().catch(()=>{})}
  toggle(){return this.setMuted(!this.muted)}
  stopOwner(owner){const voices=this.voices.get(owner);if(!voices)return;for(const voice of [...voices]){try{voice.osc.stop()}catch{}try{voice.gain.disconnect()}catch{}voices.delete(voice)}this.voices.delete(owner)}
  stopAll(){for(const owner of [...this.voices.keys()])this.stopOwner(owner)}
  tone({frequency=300,duration=.06,type='sine',volume=.025,start=0,endFrequency=frequency*.5,owner=null,group='sfx',pitch=1}){
    if(this.muted||this.paused)return;const context=this.ensureContext(),bus=this.buses.get(group)||this.buses.get('sfx');if(!context||!this.master||!bus)return;
    try{const now=context.currentTime+Math.max(0,start),osc=context.createOscillator(),gain=context.createGain(),safePitch=Math.max(.5,Math.min(2,pitch));osc.type=type;osc.frequency.setValueAtTime(Math.max(20,frequency*safePitch),now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFrequency*safePitch),now+duration);gain.gain.setValueAtTime(Math.max(.0001,volume),now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(bus);const voice={osc,gain};if(owner){if(!this.voices.has(owner))this.voices.set(owner,new Set());this.voices.get(owner).add(voice)}osc.addEventListener('ended',()=>{this.voices.get(owner)?.delete(voice);if(owner&&!this.voices.get(owner)?.size)this.voices.delete(owner);try{gain.disconnect()}catch{}},{once:true});osc.start(now);osc.stop(now+duration+.02)}catch{}
  }
  play(frequency=300,duration=.06,type='sine',volume=.025,group='sfx'){this.tone({frequency,duration,type,volume,group})}
  sequence(owner,notes){this.stopOwner(owner);for(const note of notes)this.tone({...note,owner,group:note.group||'sfx'})}
  playBossCue(kind,owner,strike=1){const common={type:'sawtooth',volume:.022,group:'sfx'};const cues={slash:[{frequency:120,duration:.42,endFrequency:210,...common},{frequency:250,duration:.18,start:.34,endFrequency:90,type:'triangle',volume:.03,group:'sfx'}],slash2:[{frequency:155,duration:.28,endFrequency:280,...common},{frequency:310,duration:.16,start:.23,endFrequency:120,type:'triangle',volume:.03,group:'sfx'}],charge:[{frequency:70,duration:.55,endFrequency:42,type:'sawtooth',volume:.028,group:'sfx'},{frequency:180,duration:.16,start:.42,endFrequency:70,type:'square',volume:.025,group:'sfx'}],forge:[{frequency:95,duration:.7,endFrequency:45,type:'sawtooth',volume:.026,group:'sfx'},{frequency:420,duration:.12,start:.6,endFrequency:180,type:'triangle',volume:.024,group:'sfx'}]};this.sequence(owner,cues[kind==='slash'&&strike===2?'slash2':kind]||[])}
  playBossImpact(kind,owner){const cues={slash:[{frequency:78,duration:.2,type:'square',volume:.045,endFrequency:42,group:'sfx'},{frequency:330,duration:.09,start:.01,type:'triangle',volume:.025,endFrequency:110,group:'sfx'}],charge:[{frequency:55,duration:.25,type:'square',volume:.05,endFrequency:28,group:'sfx'},{frequency:230,duration:.12,start:.02,type:'sawtooth',volume:.025,endFrequency:80,group:'sfx'}],forge:[{frequency:48,duration:.45,type:'sawtooth',volume:.042,endFrequency:24,group:'sfx'},{frequency:520,duration:.12,start:.03,type:'square',volume:.02,endFrequency:180,group:'sfx'}]};this.sequence(owner,cues[kind]||[])}
  playDevice(kind){const now=this.context?.currentTime||0,last=this.cooldowns.get(kind)||-Infinity;if(now-last<.09)return;this.cooldowns.set(kind,now);const pitch=1+(Math.random()-.5)*.06,cues={thorn:[{frequency:520,duration:.055,type:'triangle',volume:.012,endFrequency:780,pitch}],electric:[{frequency:680,duration:.07,type:'square',volume:.014,endFrequency:240,pitch},{frequency:940,duration:.035,start:.025,type:'triangle',volume:.009,endFrequency:420,pitch}],explosion:[{frequency:90,duration:.18,type:'sawtooth',volume:.035,endFrequency:38,pitch},{frequency:260,duration:.08,start:.01,type:'square',volume:.018,endFrequency:80,pitch}],blast:[{frequency:120,duration:.13,type:'triangle',volume:.022,endFrequency:60,pitch}]};this.sequence(`device-${kind}`,cues[kind]||cues.blast)}
  playMeleeImpact(model,hitCount=1){if(!hitCount)return;const scale=Math.min(1.35,.9+hitCount*.08),pitch=1+(Math.random()-.5)*.035;if(model==='sword_1handed'){this.play(720,.045,'triangle',.018*scale);this.play(1180,.025,'square',.006*scale)}else if(model==='sword_2handed'){this.play(105,.14,'sawtooth',.028*scale);this.play(260,.075,'triangle',.016*scale)}else if(model==='Skeleton_Mace'){this.tone({frequency:72,duration:.17,type:'square',volume:.025*scale,endFrequency:20,pitch,group:'sfx'});this.tone({frequency:380,duration:.07,type:'sine',volume:.02*scale,pitch,group:'sfx'})}}
}
