/* Unsupported HEVC inputs are converted locally. No source media leaves this device. */
import { FFmpeg } from './js/vendor/ffmpeg/ffmpeg/index.js';

const tr=(zh,en)=>document.body.dataset.editorLanguage==='en'?en:zh;
let queue=Promise.resolve();

export function convertHevc(url,source,onProgress,cancelled=()=>false) {
  const task=()=>convert(url,source,onProgress,cancelled);
  const result=queue.then(task,task);queue=result.catch(()=>{});return result;
}

async function convert(url,source,onProgress,cancelled) {
  const engine=new FFmpeg(),abort=new AbortController();let wasmUrl='',stopped=false;
  let lastStage,lastProgress;
  const report=(stage,progress)=>{if(stage===lastStage&&progress===lastProgress)return;lastStage=stage;lastProgress=progress;onProgress(stage,progress);};
  const stop=()=>{if(stopped)return;stopped=true;abort.abort();engine.terminate();};
  const watchdog=setInterval(()=>{if(cancelled())stop();},150);
  const deadline=setTimeout(stop,300000);
  try {
    if(cancelled())throw new Error('Cancelled');
    report('download',0);
    const wasm=new URL('./js/vendor/ffmpeg/core/ffmpeg-core.wasm',import.meta.url);
    const response=await fetch(wasm,{signal:abort.signal});if(!response.ok)throw new Error('Converter download failed');
    // Fetch exposes decompressed bytes; GitHub Pages Content-Length is gzip size.
    const total=32232419;
    const reader=response.body.getReader(),chunks=[];let loaded=0;
    for(;;){const {value,done}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;report('download',Math.min(99,Math.round(loaded/total*100)));}
    wasmUrl=URL.createObjectURL(new Blob(chunks,{type:'application/wasm'}));
    report('convert',0);
    await engine.load({coreURL:new URL('./js/vendor/ffmpeg/core/ffmpeg-core.js',import.meta.url).href,wasmURL:wasmUrl});
    engine.on('progress',({time})=>report('convert',Math.min(99,Math.round(time/1000000/source.duration*100))));
    await engine.writeFile('input.mp4',new Uint8Array(await (await fetch(url)).arrayBuffer()));
    const audio=source.audioCodec==='aac'?['-c:a','copy']:['-c:a','aac','-b:a','192k'];
    const result=await engine.exec(['-i','input.mp4','-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','ultrafast','-crf','20','-pix_fmt','yuv420p','-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2',...audio,'-movflags','+faststart','-threads','1','output.mp4'],300000);
    if(result!==0)throw new Error('Conversion failed');
    const bytes=await engine.readFile('output.mp4');if(cancelled())throw new Error('Cancelled');
    report('convert',100);
    return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(new Blob([bytes],{type:'video/mp4'}));});
  }catch(error){
    if(cancelled())throw new Error(tr('已取消视频转换。','Video conversion cancelled.'));
    throw new Error(tr('HEVC 转换未完成，请重试或先转为 H.264 MP4。','HEVC conversion could not finish. Retry or convert to H.264 MP4.'));
  }finally{clearInterval(watchdog);clearTimeout(deadline);stop();if(wasmUrl)URL.revokeObjectURL(wasmUrl);}
}
