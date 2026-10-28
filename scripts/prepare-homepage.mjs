// Keep editable CSS files as the source; inline homepage styles in the published artifact.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const siteRoot = path.resolve(process.argv[2] || 'site');
const entry = path.join(siteRoot, 'index.html');
let html = await readFile(entry, 'utf8');
const links = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"?]+)(?:\?[^"\s]*)?"\s*\/?>(?:\r?\n)?/g)];
for (const [tag, href] of links) {
  const file = path.resolve(siteRoot, href);
  if (!file.startsWith(siteRoot + path.sep)) throw new Error('Stylesheet must be inside the site: ' + href);
  const css = await readFile(file, 'utf8');
  if (/<\/style/i.test(css)) throw new Error('Unsafe style terminator in ' + href);
  html = html.replace(tag, '<style data-source="' + href + '">\n' + css + '\n</style>\n');
}
const media = JSON.parse(await readFile(path.join(siteRoot, 'assets/cellmotion/home-media.json'), 'utf8'));
html = html.replace(/<script data-home-media>[\s\S]*?<\/script>\s*/, '');
const mediaScript = '<script data-home-media>window.CellMotionMedia=' + JSON.stringify(media).replace(/</g, '\\u003c') + ';</script>\n';
html = html.replace('</head>', mediaScript + '</head>');
await writeFile(entry, html);
console.log('Inlined ' + links.length + ' homepage stylesheets');

// Apply lightweight shared dependencies to every root editor in the published artifact.
for (const name of await readdir(siteRoot)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(siteRoot, name);
  const original = await readFile(file, 'utf8');
  let ready = original
    .replace(/src=(["'])js\/h264-mp4-encoder\.web\.js(?:\?[^"']*)?\1/g, 'src="js/lazy-h264-mp4-encoder.js?v=20261028-ready1"')
    .replace(/assets\/cellmotion\/logo-original-transparent\.png(?:\?[^"'\s<>]*)?/g, 'assets/cellmotion/logo-web.webp?v=20261028-ready1')
    .replace(/assets\/cellmotion\/logo-dark-original\.png(?:\?[^"'\s<>]*)?/g, 'assets/cellmotion/logo-dark-web.webp?v=20261028-ready1')
    .replace(/shared-fonts\.css(?:\?[^"'\s<>]*)?/g, source => source.includes('?') ? source : 'shared-fonts.css?v=20261028-ready1')
    .replace(/shared-font-library\.js(?:\?[^"'\s<>]*)?/g, 'shared-font-library.js?v=20261028-ready1')
    .replace(/href=(["'])([^"'<>\s]+\.css)(\?[^"']*)?\1/g, (tag, quote, css, revision) => `href="${css}${revision || '?v=20261028-ready1'}"`);
  if (!ready.includes('data-https-upgrade')) ready = ready.replace('<head>', '<head>\n<script data-https-upgrade>if(location.protocol==="http:" && /(^|\\.)cellmotion\\.cn$/.test(location.hostname))location.replace("https://"+location.host+location.pathname+location.search+location.hash);</script>');
  if (ready !== original) await writeFile(file, ready);
}

// Legacy CSS aliases must use the same progressive fonts as the shared catalog.
const fontMap = JSON.parse(await readFile(path.join(siteRoot, 'assets/fonts/editor-font-map.json'), 'utf8'));
for (const name of await readdir(siteRoot)) {
  if (!name.endsWith('.css')) continue;
  const file = path.join(siteRoot, name), original = await readFile(file, 'utf8');
  const ready = original.replace(/@font-face\s*\{[^}]+\}/g, face => {
    const source = face.match(/src\s*:\s*url\(["']?([^"')]+)["']?\)/)?.[1];
    const font = fontMap[source];
    if (!font) return face;
    const clean = face.replace(/unicode-range\s*:[^;}]+;?/g, '').replace(/font-display\s*:[^;}]+;?/g, '');
    return [[font.preview,font.previewRange],[font.full,font.fullRange]].map(([url,range]) =>
      clean.replace(/src\s*:[^;}]+/, 'src:url("'+url+'") format("'+(url.endsWith('.woff2')?'woff2':url.endsWith('.ttf')?'truetype':'opentype')+'")')
        .replace(/;?\s*\}$/, ';font-display:swap;unicode-range:'+range+'}')
    ).join('\n');
  });
  if (ready !== original) await writeFile(file, ready);
}
