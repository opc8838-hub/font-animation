// Scoped static checks for the new website shell, not an effect/export audit.
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const site=new URL('../site/',import.meta.url);
const pages=['cellmotion.html','cellmotion-components.html','cellmotion-editors.html'];
let checked=0;
for(const page of pages){
  const html=await readFile(new URL(page,site),'utf8');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,`${page}: duplicate IDs`);
  for(const id of ['main','catalog-grid','catalog-error'])assert(ids.includes(id),`${page}: missing ${id}`);
  for(const [,value]of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
    if(/^(?:https?:|data:|#)/.test(value))continue;
    const target=new URL(value,site);target.search='';target.hash='';
    assert((await stat(fileURLToPath(target))).isFile(),`${page}: missing ${value}`);checked++;
  }
  assert(html.includes('site-preferences.js'),`${page}: missing global language/theme controls`);
  assert(html.includes('cellmotion.js'),`${page}: missing shared website script`);
  assert(html.includes('assets/cellmotion/logo-original-transparent.png'),`${page}: transparent logo required`);
}
const home=await readFile(new URL(pages[0],site),'utf8');
assert(home.includes('data-home-preview="true"'),'Homepage must remain a small preview, not full catalog');
assert(home.includes('hero-immersive'),'Full-screen Hero missing');
assert(!home.includes('id="search"'),'Full search belongs in the separate library');
const library=await readFile(new URL(pages[1],site),'utf8');
assert(library.includes('id="web-planned"'),'Do not imply unshipped web components are available');
const catalog=JSON.parse(await readFile(new URL('cellmotion-catalog.json',site),'utf8'));
assert.equal(new Set(catalog.effects.map(effect=>effect.id)).size,catalog.effects.length);
const gallerySource=await readFile(new URL('gallery.js',site),'utf8');
const pendingLiteral=gallerySource.match(/const pendingRelease = (\[[\s\S]*?\n\]);/)?.[1];
assert(pendingLiteral,'gallery.js is missing pendingRelease');
const pendingIds=JSON.parse(pendingLiteral.replace(/,\s*]/g,']'));
const categories=new Set(['type','graphic','media','flow','space','physics']);
for(const effect of catalog.effects){
  assert(categories.has(effect.category),`${effect.id}: category must stay a real content category`);
  assert(effect.status==='pending'||effect.status==='ready',`${effect.id}: missing release status`);
}
assert.deepEqual(catalog.effects.filter(effect=>effect.status==='pending').map(effect=>effect.id).sort(),[...pendingIds].sort(),'Catalog pending set must match gallery.js pendingRelease');
for(const id of catalog.featured||[]){
  assert.equal(catalog.effects.find(effect=>effect.id===id)?.status,'ready',`${id} is featured while still pending`);
}
for(const effect of catalog.effects){
  for(const field of ['href','poster','video'])if(effect[field]){
    const target=new URL(effect[field],site);target.search='';target.hash='';
    assert((await stat(fileURLToPath(target))).isFile(),`${effect.id}: missing ${field}`);checked++;
  }
}
console.log(`PASS: ${pages.length} pages, ${catalog.effects.length} catalog entries, ${checked} file references. Browser and export behavior are separate checks.`);
