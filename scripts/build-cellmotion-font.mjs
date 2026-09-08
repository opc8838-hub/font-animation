// Subset only the website UI font. Never modifies fonts inside effect editors.
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const site=new URL('../site/',import.meta.url);
const sources=['cellmotion.html','cellmotion-components.html','cellmotion-editors.html','cellmotion.js','cellmotion-catalog.json'];
const text=(await Promise.all(sources.map(path=>readFile(new URL(path,site),'utf8')))).join('\n');
const work=await mkdtemp(join(tmpdir(),'cellmotion-font-'));
const input=join(work,'characters.txt');await writeFile(input,text);
const output=fileURLToPath(new URL('assets/cellmotion/ui-han.woff',site));
const result=spawnSync('python',['-m','fontTools.subset',fileURLToPath(new URL('assets/fonts/NotoSansHK-Variable.ttf',site)),`--text-file=${input}`,`--output-file=${output}`,'--flavor=woff','--layout-features=*'],{encoding:'utf8',windowsHide:true});
if(result.status!==0)throw new Error(result.stderr);
console.log(output);
