/* Audio editing for Video Compare. Local pinned dependency; no real-time export capture. */
import { Input, BlobSource, ALL_FORMATS, AudioBufferSink, EncodedPacketSink, Output, BufferTarget, Mp4OutputFormat, EncodedVideoPacketSource, AudioBufferSource, Quality, canEncodeAudio } from './js/vendor/mediabunny/mediabunny-1.61.3.min.js';
const RATE = 48000;
const tr=(zh,en)=>document.body.dataset.editorLanguage==='en'?en:zh;
const open = async url => new Input({source:new BlobSource(await (await fetch(url)).blob()),formats:ALL_FORMATS});
export async function inspectAudio(url) {
  const input=await open(url);
  try { return !!(await input.getPrimaryAudioTrack()); } finally { input.dispose(); }
}
function check(cancelled) { if(cancelled())throw new Error(tr('已取消导出。','Export cancelled.')); }
// Decode only the selected source interval and retain packet timestamps, including gaps.
async function trimmedAudio(row,seconds,cancelled) {
  const input=await open(row.media.url);
  try {
    const track=await input.getPrimaryAudioTrack();
    if(!track)return null;
    if(!await track.canDecode())throw new Error(row.id+tr(' 的声音无法解码，请转换为 AAC 音轨的 MP4。',' audio cannot be decoded. Use MP4 with an AAC audio track.'));
    const start=row.media.trimStart,end=Math.min(row.media.trimEnd,start+seconds),length=end-start;
    const offline=new OfflineAudioContext(2,Math.max(1,Math.round(length*RATE)),RATE);
    for await (const {buffer,timestamp} of new AudioBufferSink(track).buffers(start,end)) {
      check(cancelled);
      const from=Math.max(start,timestamp),to=Math.min(end,timestamp+buffer.duration);
      if(to<=from)continue;
      const node=offline.createBufferSource();node.buffer=buffer;node.connect(offline.destination);
      node.start(from-start,from-timestamp,to-from);
    }
    check(cancelled);return await offline.startRendering();
  } finally { input.dispose(); }
}
export async function mixAudio(rows,seconds,shortClip,cancelled) {
  const buffers=[];
  for(const row of rows.filter(r=>r.audioEnabled&&r.media)) {
    check(cancelled);
    const buffer=await trimmedAudio(row,seconds,cancelled);
    if(buffer)buffers.push(buffer);
  }
  if(!buffers.length)return null;
  if(!await canEncodeAudio('aac',{numberOfChannels:2,sampleRate:RATE}))throw new Error(tr('当前浏览器不支持 AAC 声音导出，请使用最新版 Edge 或 Chrome。','AAC audio export is unavailable in this browser. Please use a current Edge or Chrome browser.'));
  const offline=new OfflineAudioContext(2,Math.max(1,Math.round(seconds*RATE)),RATE);
  for(const buffer of buffers) {
    const node=offline.createBufferSource(),gain=offline.createGain();
    node.buffer=buffer;node.loop=shortClip==='loop';node.loopStart=0;node.loopEnd=buffer.duration;
    gain.gain.value=1/buffers.length;node.connect(gain);gain.connect(offline.destination);node.start(0);node.stop(seconds);
  }
  check(cancelled);const result=await offline.startRendering();check(cancelled);return result;
}
// Copy the existing deterministic H.264 packets unchanged, then add the edited AAC track.
export async function muxAudio(videoBlob,audio,fps,cancelled) {
  if(!audio)return videoBlob;
  const input=new Input({source:new BlobSource(videoBlob),formats:ALL_FORMATS});
  const target=new BufferTarget(),output=new Output({target,format:new Mp4OutputFormat({fastStart:'in-memory'})});
  try {
    const track=await input.getPrimaryVideoTrack(),source=new EncodedVideoPacketSource('avc');
    const sound=new AudioBufferSource({codec:'aac',quality:new Quality({bitrate:192000})});
    output.addVideoTrack(source,{frameRate:fps});output.addAudioTrack(sound);
    await output.start();const decoderConfig=await track.getDecoderConfig();
    for await(const packet of new EncodedPacketSink(track).packets()) {check(cancelled);await source.add(packet,{decoderConfig});}
    source.close();check(cancelled);await sound.add(audio);sound.close();check(cancelled);
    await output.finalize();check(cancelled);return new Blob([target.buffer],{type:'video/mp4'});
  } catch(error) { await output.cancel().catch(()=>{});throw error; }
  finally { input.dispose(); }
}
