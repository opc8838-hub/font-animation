// Scoped static checks for the new website shell, not an effect/export audit.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
const site=new URL('../site/',import.meta.url);
const pages=['cellmotion.html','cellmotion-components.html','cellmotion-editors.html'];
const scripts=new Set();
let checked=0;
for(const page of pages){
  const html=await readFile(new URL(page,site),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`${page}: duplicate IDs`);
  for(const id of ['main','catalog-grid','catalog-error'])assert(ids.includes(id),`${page}: missing ${id}`);
  for(const [,value]of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
    if(/^(?:https?:|data:|#)/.test(value))continue;
    const target=new URL(value,site);target.search='';target.hash='';
    assert((await stat(target)).isFile(),`${page}: missing ${value}`);checked++;
  }
  const sharedScript = html.match(/<script(?:\s+type="module")?\s+defer\s+src="([^"]+)"/);
  assert(sharedScript, `${page}: missing deferred shared script`);
  scripts.add(sharedScript[1]);
  assert(html.includes('assets/cellmotion/logo-original.png'),`${page}: original logo required`);
}
assert.equal(scripts.size,1,'Pages should load the same current shared script');
const home=await readFile(new URL(pages[0],site),'utf8');
assert(home.includes('data-home-preview="true"'),'Homepage must remain a small preview, not full catalog');
assert(home.includes('hero-immersive'),'Full-screen Hero missing');
assert(!home.includes('id="search"'),'Full search belongs in the separate library');
const library=await readFile(new URL(pages[1],site),'utf8');
assert(library.includes('id="web-planned"'),'Do not imply unshipped web components are available');
const catalog=JSON.parse(await readFile(new URL('cellmotion-catalog.json',site),'utf8'));
assert.equal(new Set(catalog.effects.map(effect=>effect.id)).size,catalog.effects.length);
for(const effect of catalog.effects){
  for(const field of ['href','poster','video'])if(effect[field]){
    assert((await stat(new URL(effect[field],site))).isFile(),`${effect.id}: missing ${field}`);checked++;
  }
}
console.log(`PASS: ${pages.length} pages, ${catalog.effects.length} catalog entries, ${checked} file references. Browser and export behavior are separate checks.`);
