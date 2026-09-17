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
}
