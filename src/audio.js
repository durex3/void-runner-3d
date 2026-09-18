export class AudioService{
  constructor(){this.context=null;this.muted=false}

  toggle(){this.muted=!this.muted;return this.muted}

  play(frequency=300,duration=.06,type='sine',volume=.025){
    if(this.muted)return;
    try{
      this.context??=new AudioContext();
      const oscillator=this.context.createOscillator();
      const gain=this.context.createGain();
      oscillator.type=type;
      oscillator.frequency.setValueAtTime(frequency,this.context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*.5,this.context.currentTime+duration);
      gain.gain.setValueAtTime(volume,this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,this.context.currentTime+duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime+duration);
    }catch{}
  }

  playMeleeImpact(model,hitCount=1){
    if(!hitCount)return;
    const scale=Math.min(1.35,.9+hitCount*.08);
    if(model==='sword_1handed'){
      this.play(720,.045,'triangle',.018*scale);
      this.play(1180,.025,'square',.006*scale);
    }else if(model==='sword_2handed'){
      this.play(105,.14,'sawtooth',.028*scale);
      this.play(260,.075,'triangle',.016*scale);
    }else if(model==='Skeleton_Mace'){
      this.play(72,.17,'square',.025*scale);
      this.play(380,.07,'sine',.02*scale);
    }
  }
}
