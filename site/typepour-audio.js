/* Original procedural water Foley. No recorded samples or microphone input. */
(() => {
  'use strict';
  const RATE=48000,DURATION=12,TAU=Math.PI*2;
  let cached;
  const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
  function synthesize(){
    if(cached)return cached;
    const data=new Float32Array(RATE*DURATION);
    let seed=0x71b29a3,low=0,body=0,b1=0,b2=0;
    const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;};
    let ca=0,cb=0,cc=0,phase=0;
    for(let i=0;i<data.length;i++){
      const t=i/RATE,fill=smooth((t-1.5)/6.1);
      if(i%128===0){const w=TAU*(470+fill*1120)/RATE,alpha=Math.sin(w)/7;
        ca=alpha/(1+alpha);cb=-2*Math.cos(w)/(1+alpha);cc=(1-alpha)/(1+alpha);}
      const white=random()*2-1;
      low+=.23*(white-low);body+=.025*(white-body);
      const excitation=low-body;
      const resonant=ca*excitation+b1;b1=-cb*resonant+b2;b2=-ca*excitation-cc*resonant;
      phase+=TAU*(7+fill*5)/RATE;
      const flow=smooth((t-1.45)/.30)*(1-smooth((t-7.75)/.48));
      const flutter=.79+.12*Math.sin(phase)+.06*Math.sin(t*TAU*19.7);
      data[i]=flow*flutter*(excitation*.32+resonant*.58+body*.17);
    }
    // Uneven short bubble chirps give the stream discrete, watery detail.
    let when=1.5;
    while(when<8.18){
      const fill=smooth((when-1.5)/6.2),f=520+fill*900+random()*1000;
      const amp=(.04+random()*.10)*(when>7.8?.65:1),decay=30+random()*65;
      const first=Math.round(when*RATE),len=Math.round(RATE*.20);let ph=0;
      for(let j=0;j<len&&first+j<data.length;j++){
        const u=j/RATE;ph+=TAU*f*(1+.38*Math.exp(-u*45))/RATE;
        data[first+j]+=amp*(1-Math.exp(-u*1600))*Math.exp(-u*decay)*Math.sin(ph);
      }
      when+=.014+Math.pow(random(),1.5)*.09;
    }
    // Light glass resonance at first contact and the last few drops.
    for(const [time,amp,freq] of [[1.52,.018,2860],[8.13,.031,1320],[8.38,.023,1780],[8.64,.015,2170]]){
      const start=Math.round(time*RATE);
      for(let j=0;j<RATE*.55&&start+j<data.length;j++){
        const u=j/RATE;
        data[start+j]+=amp*(1-Math.exp(-u*1900))*Math.exp(-u*13)*(Math.sin(TAU*freq*u)+.28*Math.sin(TAU*freq*2.71*u));
      }
    }
    // Small early reflections, then a gentle master fade. No clipping or endless noise.
    const dry=data.slice();
    for(let i=0;i<data.length;i++){
      const echo=(i>1392?dry[i-1392]*.14:0)+(i>3312?dry[i-3312]*.07:0);
      data[i]=Math.tanh((dry[i]+echo)*2.1)*(1-smooth((i/RATE-8.8)/.5));
    }
    cached=data;return data;
  }
  function buffer(seconds=DURATION,volume=1,timeMap=t=>t){
    const n=Math.round(seconds*RATE),out=new AudioBuffer({numberOfChannels:1,length:n,sampleRate:RATE});
    const values=out.getChannelData(0),src=synthesize();
    for(let i=0;i<n;i++)values[i]=(src[Math.floor(timeMap(i/RATE)*RATE)]||0)*volume;
    // Requested short clips also end cleanly.
    for(let i=0;i<Math.min(480,n);i++)values[n-1-i]*=i/480;
    return out;
  }
  function wav(seconds=DURATION,volume=1,timeMap=t=>t){
    const values=synthesize(),count=Math.round(seconds*RATE),bytes=new ArrayBuffer(44+count*2),v=new DataView(bytes);
    const text=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i));};
    text(0,'RIFF');v.setUint32(4,36+count*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,count*2,true);
    for(let i=0;i<count;i++){const fade=Math.min(1,(count-1-i)/480);v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,(values[Math.floor(timeMap(i/RATE)*RATE)]||0)*volume*fade))*32767),true);}
    return new Blob([bytes],{type:'audio/wav'});
  }
  class Player{
    constructor(){this.enabled=false;this.volume=.65;this.context=null;this.source=null;this.starts=0;}
    async enable(){
      this.context ||= new AudioContext();
      if(!this.master){this.master=this.context.createGain();this.master.connect(this.context.destination);this.master.gain.value=this.volume;this.buffer=buffer();}
      await this.context.resume();this.enabled=true;
    }
    setVolume(value){this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.015);}
    stop(){if(!this.source)return;const s=this.source;this.source=null;const now=this.context.currentTime;s.gain.gain.cancelScheduledValues(now);s.gain.gain.setValueAtTime(s.gain.gain.value,now);s.gain.gain.linearRampToValueAtTime(0,now+.012);try{s.node.stop(now+.014);}catch{} }
    sync(time,playing,rate=1){
      time=Math.max(0,Math.min(DURATION,time));
      if(!this.enabled||!playing||!this.context||this.context.state!=='running'||time>=DURATION||document.hidden){this.stop();return;}
      if(this.source){const expected=this.source.offset+(this.context.currentTime-this.source.start)*this.source.rate;if(Math.abs(expected-time)<.12&&this.source.rate===rate)return;this.stop();}
      const node=this.context.createBufferSource(),gain=this.context.createGain(),now=this.context.currentTime;
      node.buffer=this.buffer;node.playbackRate.value=rate;node.connect(gain);gain.connect(this.master);
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.008);
      const current={node,gain,start:now,offset:time,rate};this.source=current;this.starts++;
      node.onended=()=>{node.disconnect();gain.disconnect();if(this.source===current)this.source=null;};node.start(now,time);
    }
  }
  async function encodeVideo(canvas,render,{width,height,seconds,fps,volume,onProgress,timeMap}){
    const M=await import('./js/mediabunny-1.61.4.js');
    if(!await M.canEncodeAudio('aac',{numberOfChannels:1,sampleRate:RATE})||!await M.canEncodeVideo('avc',{width,height}))throw new Error('此浏览器不支持带声 MP4；可关闭“MP4 带声音”后导出，并单独下载音效。');
    const output=new M.Output({format:new M.Mp4OutputFormat(),target:new M.BufferTarget()});
    const video=new M.CanvasSource(canvas,{codec:'avc',quality:new M.Quality({bitrate:Math.max(10000000,width*height*30)}),keyFrameInterval:1});
    const audio=new M.AudioBufferSource({codec:'aac',quality:new M.Quality({bitrate:128000})});
    output.addVideoTrack(video,{frameRate:fps});output.addAudioTrack(audio);
    try{
      await output.start();await audio.add(buffer(seconds,volume,timeMap));audio.close();
      const count=Math.ceil(seconds*fps);
      for(let i=0;i<count;i++){await render(canvas,i/fps);await video.add(i/fps,1/fps);if(i%10===0){onProgress?.(i/count);await new Promise(r=>setTimeout(r,0));}}
      video.close();await output.finalize();return new Blob([output.target.buffer],{type:'video/mp4'});
    }catch(error){await output.cancel();throw error;}
  }
  window.TypePourAudio={synthesize,buffer,wav,Player,encodeVideo,RATE,DURATION};
})();
