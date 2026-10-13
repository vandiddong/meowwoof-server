export class AudioManager {
  private context:AudioContext|null=null;private engine:OscillatorNode|null=null;private gain:GainNode|null=null;
  enabled=true;
  async unlock(){try{this.context??=new AudioContext();if(this.context.state==='suspended')await this.context.resume();if(!this.engine){this.engine=this.context.createOscillator();this.gain=this.context.createGain();this.engine.type='triangle';this.gain.gain.value=0;this.engine.connect(this.gain).connect(this.context.destination);this.engine.start();}}catch{this.enabled=false;}}
  update(speed:number,flying:boolean){if(!this.context||!this.gain||!this.engine)return;this.engine.frequency.setTargetAtTime(48+speed*1.5,this.context.currentTime,.15);this.gain.gain.setTargetAtTime(this.enabled && flying ? .026 : 0,this.context.currentTime,.1);}
  tone(kind:'drop'|'impact'|'score'){if(!this.context||!this.enabled)return;const ctx=this.context,o=ctx.createOscillator(),g=ctx.createGain();o.type=kind==='impact'?'triangle':'sine';const pitch=kind==='drop'?550:kind==='impact'?130:660;o.frequency.setValueAtTime(pitch,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='score'?990:45,ctx.currentTime+.4);g.gain.setValueAtTime(.09,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.45);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5);}
}
