const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../site/typepour-audio.js'),'utf8');
function load(){const scope={window:{},Blob};vm.runInNewContext(source,scope);return scope.window.TypePourAudio;}
(async()=>{
 const a=load(),b=load(),x=a.synthesize(),y=b.synthesize();
 assert.equal(x.length,48000*12);
 assert.equal(Buffer.compare(Buffer.from(x.buffer),Buffer.from(y.buffer)),0,'Synthesis must replay deterministically');
 let peak=0,energy=0;
 for(let i=0;i<x.length;i++){assert.ok(Number.isFinite(x[i]));peak=Math.max(peak,Math.abs(x[i]));energy+=x[i]*x[i];}
 assert.ok(peak>.1&&peak<.9,'Audible headroom without clipping');
 assert.ok(x.subarray(0,Math.floor(1.4*48000)).every(v=>v===0),'Quiet before cup contact');
 assert.ok(x.subarray(10*48000).every(v=>v===0),'Quiet final hold');
 const wav=Buffer.from(await a.wav(3,.65).arrayBuffer());
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),48000);assert.equal(wav.readUInt32LE(40),3*48000*2);
 assert.equal(wav.readInt16LE(wav.length-2),0,'Short export fades to zero');
 console.log(JSON.stringify({samples:x.length,peak,rms:Math.sqrt(energy/x.length),deterministic:true}));
})().catch(e=>{console.error(e);process.exitCode=1});
