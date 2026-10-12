// Keep editable CSS files as the source; inline homepage styles in the published artifact.
import { readFile, writeFile } from 'node:fs/promises';
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
await writeFile(entry, html);
console.log('Inlined ' + links.length + ' homepage stylesheets');
