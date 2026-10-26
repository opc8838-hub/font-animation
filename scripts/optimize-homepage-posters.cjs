// Generate webpage thumbnails without changing approved source artwork.
// Usage: node scripts/optimize-homepage-posters.cjs [path-to-node_modules]
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(require.resolve('sharp', { paths: [process.argv[2] || process.cwd()] }));
const site = path.resolve(__dirname, '../site');
(async () => {
  const catalog = JSON.parse(await fs.readFile(path.join(site, 'cellmotion-catalog.json'), 'utf8'));
  const posters = {};
  let originalBytes = 0, previewBytes = 0;
  await fs.mkdir(path.join(site, 'assets/cellmotion/thumbnails'), { recursive: true });
  for (const effect of catalog.effects) {
    const source = effect.poster?.split('?')[0];
    if (!source || posters[effect.poster] || !/\.(png|jpe?g)$/i.test(source)) continue;
    const file = path.resolve(site, source);
    if (!file.startsWith(site + path.sep)) throw new Error('Poster outside site');
    const data = await fs.readFile(file);
    if (data.length < 65536) continue;
    const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
    const output = 'assets/cellmotion/thumbnails/' + effect.id + '-' + hash + '.webp';
    await sharp(data).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(site, output));
    posters[effect.poster] = output;
    originalBytes += data.length;
    previewBytes += (await fs.stat(path.join(site, output))).size;
  }
  await fs.writeFile(path.join(site, 'assets/cellmotion/home-media.json'), JSON.stringify({ posters }, null, 2) + '\n');
  console.log(JSON.stringify({ count: Object.keys(posters).length, originalBytes, previewBytes }));
})().catch(error => { console.error(error); process.exitCode = 1; });
