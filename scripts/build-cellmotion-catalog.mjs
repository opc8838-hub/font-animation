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
  curvedgallery:'curvedgallery-card',
  zerogflip:'zerogflip-card', letterpulse:'letterpulse-1920x1080',
  prosvg:'prosvg-card', citystack:'citystack-card',
  continuation:'continuation-card-centered', 'split-flip':'split-flip-card', iconburst:'iconburst-card', glyphmorph:'glyphmorph-card',
  sproutshift:'sproutshift-wide-card', mistlift:'mistlift-wide-card', typecascade:'typecascade-wide-card',
  dotresolve:'dotresolve-wide-card', glyphreveal:'glyphreveal-wide-card', currentwall:'water-flow-card',
  verticalwall:'vertical-rise-card', beforeafter:'beforeafter-card', shutterafter:'shutterafter-card',
  pathwriter:'pathwriter-card', ribbonink:'ribbon-ink-card', scrapbin:'delete-card',
  colorrecompose:'color-recompose-card', impactbuild:'impactbuild-card', typegarden:'typegarden-card'
};
const media = new Set(['curvedgallery','mediacascade','beforeafter','shutterafter','phoneframe','laptopframe','orbitgallery','moodboard']);
// Newest releases first, shown on the homepage as 最近上新. Dates are the public release of each editor.
const recent = [
  ['curvedgallery','2026-10-09'],
  ['zerogflip','2026-10-06'], ['typegarden','2026-10-06'],
  ['citystack','2026-10-06'], ['prosvg','2026-10-06'], ['letterpulse','2026-09-27'],
  ['split-flip','2026-09-07'], ['glyphreveal','2026-09-04'], ['typecascade','2026-09-02'], ['sproutshift','2026-09-02'],
  ['mistlift','2026-09-02'], ['dotresolve','2026-09-02'], ['ribbonink','2026-09-01'], ['glyphmorph','2026-09-01']
];
for (const [id] of recent) if (!knownIds.has(id)) throw new Error(`Unknown recent effect: ${id}`);
const featured = ['prosvg','sproutshift','typecascade','dotresolve','glyphmorph','iconburst','pathwriter','letterpulse'];
// Keep the existing published entry routes and approved preview revisions when rebuilding.
const entryRoutes = { curvedgallery:'curvedgallery.html?from=gallery&v=20261009-8', prosvg:'prosvg.html?from=gallery&v=20261005-1', citystack:'citystack.html?from=gallery&v=20261006-1', typegarden:'typegarden.html?from=gallery&v=20261006-1' };
const previewRevisions = { curvedgallery:'20261009-4', iconburst:'20260926-5', zerogflip:'20261006' };
async function exists(path) { try { await access(new URL(path, site)); return true; } catch { return false; } }
const effects = [];
for (const [id,name,english,group,description] of rows) {
  const href = `${id === 'flash' ? 'flash-scenes' : id}.html`;
  if (!await exists(href)) throw new Error(`Missing editor: ${href}`);
  let poster = null;
  if (await exists(`assets/cellmotion/poster-${id}.jpg`)) poster=`assets/cellmotion/poster-${id}.jpg`;
  for (const ext of ['svg','png']) if (!poster && await exists(`final_${id}.${ext}`)) { poster=`final_${id}.${ext}`; break; }
  let video = videos[id] ? `assets/previews/${videos[id]}.mp4` : null;
  if (video && !await exists(video)) throw new Error(`Missing preview: ${video}`);
  if (previewRevisions[id]) { if (poster) poster += `?v=${previewRevisions[id]}`; if (video) video += `?v=${previewRevisions[id]}`; }
  effects.push({
    id,name,english,description,
    category:media.has(id)?'media':group,
    href:entryRoutes[id] || href,poster,video,
    status:pendingRelease.has(id)?'pending':'ready'
  });
}
const catalog = {schemaVersion:1,source:'gallery.js',featured,recent:recent.map(([id,date])=>({id,date})),effects};
await writeFile(new URL('cellmotion-catalog.json',site),JSON.stringify(catalog,null,2)+'\n');
console.log(`Validated ${effects.length} effects → ${fileURLToPath(new URL('cellmotion-catalog.json',site))}`);
