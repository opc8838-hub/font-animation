const tr=(zh,en)=>document.body.dataset.editorLanguage==='en'?en:zh;
const WASM_HASH='9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7';
const JS_HASH='67a48f11645f85439f3fde4f2119042c16b374b910206b7a7a24f342e28dcae3';
let queue=Promise.resolve();
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');

async function asset(file,hash,size,onProgress,cancelled) {
  const own=new URL('./js/vendor/ffmpeg/core/'+file,import.meta.url).href;
  const packageFile=file;
  const endpoints=[own,'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/'+packageFile,'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm/'+packageFile];
  for(const url of endpoints){
    if(cancelled())throw new Error('Cancelled');
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),35000);
    const watch=setInterval(()=>{if(cancelled())abort.abort();},150);
    try{
      const response=await fetch(url,{signal:abort.signal});if(!response.ok)throw new Error('HTTP '+response.status);
      const reader=response.body.getReader(),chunks=[];let length=0;
      for(;;){const {value,done}=await reader.read();if(done)break;chunks.push(value);length+=value.length;onProgress(Math.min(99,Math.floor(length/size*100)));}
      const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      if(await digest(bytes)!==hash)throw new Error('Integrity mismatch');
      return bytes;
    }catch(error){if(cancelled())throw error;}
    finally{clearTimeout(timer);clearInterval(watch);}
  }
  throw new Error(tr('兼容组件加载失败，请重试。','Could not load the compatibility component. Retry.'));
}

export function convertVideo(url,source,onProgress,cancelled=()=>false) {
  const result=queue.then(()=>convert(url,source,onProgress,cancelled));
  queue=result.then(()=>{},()=>{});return result;
}
// Compatibility for callers using the previous helper name.
export const convertHevc=convertVideo;

async function convert(url,source,onProgress,cancelled) {
  const engine=new FFmpeg(),urls=[];let stage='download',stopped=false,lastStage,lastPercent;
  const report=(next,percent)=>{stage=next;if(next===lastStage&&percent===lastPercent)return;lastStage=next;lastPercent=percent;onProgress(next,percent);};
  const stop=()=>{if(stopped)return;stopped=true;engine.terminate();};
  const watch=setInterval(()=>{if(cancelled())stop();},150),deadline=setTimeout(stop,300000);
  const blob=(bytes,type)=>{const url=URL.createObjectURL(new Blob([bytes],{type}));urls.push(url);return url;};
  try{
    report('download',0);
    const [script,wasm]=await Promise.all([asset('ffmpeg-core.js',JS_HASH,112139,()=>{},cancelled),asset('ffmpeg-core.wasm',WASM_HASH,32232419,p=>report('download',p),cancelled)]);
    if(cancelled())throw new Error('Cancelled');
    await engine.load({classWorkerURL:blob(bundledWorker,'text/javascript'),coreURL:blob(script,'text/javascript'),wasmURL:blob(wasm,'application/wasm')});
    await engine.writeFile('input.mp4',new Uint8Array(await (await fetch(url)).arrayBuffer()));
    let audioCodec=source.audioCodec,duration=source.duration||1;
    try{
      if(await engine.ffprobe(['-v','error','-show_entries','stream=codec_type,codec_name:format=duration','-of','json','input.mp4','-o','metadata.json'])===0){
        const metadata=JSON.parse(new TextDecoder().decode(await engine.readFile('metadata.json')));
        if(!metadata.streams?.some(s=>s.codec_type==='video'))throw new Error('No video track');
        audioCodec=metadata.streams.find(s=>s.codec_type==='audio')?.codec_name;duration=Number(metadata.format?.duration)||duration;
      }
    }catch{}
    report('convert',0);engine.on('progress',({time})=>report('convert',Math.min(99,Math.floor(time/1000000/duration*100))));
    const audio=audioCodec==='aac'?['-c:a','copy']:['-c:a','aac','-b:a','192k'];
    const result=await engine.exec(['-i','input.mp4','-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','ultrafast','-crf','20','-pix_fmt','yuv420p','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2',...audio,'-movflags','+faststart','-threads','1','output.mp4'],300000);
    if(result!==0)throw new Error('Conversion failed');
    const bytes=await engine.readFile('output.mp4');if(cancelled())throw new Error('Cancelled');report('convert',100);
    return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(new Blob([bytes],{type:'video/mp4'}));});
  }catch(error){
    if(cancelled())throw new Error(tr('已取消视频转换。','Video conversion cancelled.'));
    if(stage==='download')throw error;
    throw new Error(tr('录屏兼容转换失败，请重试或选择较短片段。','Recording conversion failed. Retry or choose a shorter clip.'));
  }finally{clearInterval(watch);clearTimeout(deadline);stop();urls.forEach(url=>URL.revokeObjectURL(url));}
}
