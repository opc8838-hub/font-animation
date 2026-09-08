// Generate separate website thumbnails without changing any approved gallery asset.
import { readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ffmpeg=process.argv[2];
if(!ffmpeg)throw new Error('Pass the local ffmpeg executable path');
const site=new URL('../site/',import.meta.url);
const {effects}=JSON.parse(await readFile(new URL('cellmotion-catalog.json',site),'utf8'));
for(const effect of effects.filter(effect=>effect.video)) {
  const output=new URL(`assets/cellmotion/poster-${effect.id}.jpg`,site);
  try {await access(output);continue;} catch {}
  const result=spawnSync(ffmpeg,['-hide_banner','-loglevel','error','-n','-ss','2','-i',fileURLToPath(new URL(effect.video,site)),'-frames:v','1','-vf','scale=960:-2,format=yuvj420p','-q:v','3',fileURLToPath(output)],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw new Error(result.stderr);
  console.log(effect.id);
}
