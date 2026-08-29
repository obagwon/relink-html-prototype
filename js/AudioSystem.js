export class AudioSystem {
  constructor(){this.context=null;}
  ensure(){if(!this.context)this.context=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume();return this.context;}
  tone(frequency,duration,type='sine',gain=.045,delay=0){const c=this.ensure();const o=c.createOscillator();const g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,c.currentTime+delay);g.gain.setValueAtTime(0,c.currentTime+delay);g.gain.linearRampToValueAtTime(gain,c.currentTime+delay+.015);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);o.connect(g).connect(c.destination);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.03);}
  playAbility(key){if(key==='bloom'){this.tone(330,.32,'sine',.035);this.tone(520,.4,'sine',.028,.08);}if(key==='freeze'){this.tone(980,.18,'triangle',.028);this.tone(1420,.12,'sine',.018,.04);}if(key==='pulse'){this.tone(120,.18,'square',.026);this.tone(360,.22,'sawtooth',.022,.055);}}
  success(){this.tone(392,.5,'sine',.035);this.tone(523,.55,'sine',.035,.12);this.tone(784,.7,'sine',.03,.25);}
}
