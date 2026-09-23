// Transitional read-only bridge: the existing gallery remains authoritative.
// Run after gallery entries change. Never executes the gallery's browser code.
import { readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const site = new URL('../site/', import.meta.url);
const source = await readFile(new URL('gallery.js', site), 'utf8');
const literal = source.match(/const effects = (\[[\s\S]*?\n\]);/)?.[1];
if (!literal) throw new Error('Gallery catalog declaration not found');
const rows = JSON.parse(literal.replace(/,\s*]/g, ']'));
const pendingLiteral = source.match(/const pendingRelease = (\[[\s\S]*?\n\]);/)?.[1];
if (!pendingLiteral) throw new Error('pendingRelease list not found');
const pendingIds = JSON.parse(pendingLiteral.replace(/,\s*]/g, ']'));
const pendingRelease = new Set(pendingIds);
if (pendingRelease.size !== pendingIds.length) throw new Error('Duplicate id in pendingRelease');
const knownIds = new Set(rows.map((row) => row[0]));
for (const id of pendingRelease) {
  if (!knownIds.has(id)) throw new Error(`Unknown pending effect: ${id}`);
}
const videos = {
  continuation:'continuation-card-centered', 'split-flip':'split-flip-card', iconburst:'iconburst-card', glyphmorph:'glyphmorph-card',
  sproutshift:'sproutshift-wide-card', mistlift:'mistlift-wide-card', typecascade:'typecascade-wide-card',
  dotresolve:'dotresolve-wide-card', glyphreveal:'glyphreveal-wide-card', currentwall:'water-flow-card',
  verticalwall:'vertical-rise-card', beforeafter:'beforeafter-card', shutterafter:'shutterafter-card',
  pathwriter:'pathwriter-card', ribbonink:'ribbon-ink-card', scrapbin:'delete-card',
  colorrecompose:'color-recompose-card', impactbuild:'impactbuild-card'
};
const media = new Set(['mediacascade','beforeafter','shutterafter','phoneframe','laptopframe','orbitgallery','moodboard']);
const featured = ['sproutshift','typecascade','dotresolve','glyphmorph','iconburst','pathwriter'];
async function exists(path) { try { await access(new URL(path, site)); return true; } catch { return false; } }
const effects = [];
for (const [id,name,english,group,description] of rows) {
  const href = `${id === 'flash' ? 'flash-scenes' : id}.html`;
  if (!await exists(href)) throw new Error(`Missing editor: ${href}`);
  let poster = null;
  if (await exists(`assets/cellmotion/poster-${id}.jpg`)) poster=`assets/cellmotion/poster-${id}.jpg`;
  for (const ext of ['svg','png']) if (!poster && await exists(`final_${id}.${ext}`)) { poster=`final_${id}.${ext}`; break; }
  const video = videos[id] ? `assets/previews/${videos[id]}.mp4` : null;
  if (video && !await exists(video)) throw new Error(`Missing preview: ${video}`);
  effects.push({
    id,name,english,description,
    category:media.has(id)?'media':group,
    href,poster,video,
    status:pendingRelease.has(id)?'pending':'ready'
  });
}
const catalog = {schemaVersion:1,source:'gallery.js',featured,effects};
await writeFile(new URL('cellmotion-catalog.json',site),JSON.stringify(catalog,null,2)+'\n');
console.log(`Validated ${effects.length} effects → ${fileURLToPath(new URL('cellmotion-catalog.json',site))}`);
