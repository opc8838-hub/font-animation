/* Local prototype only; serves this worktree, with no write endpoints. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const site = path.resolve(__dirname, '../site');
const output = path.resolve(__dirname, '../output/playwright/typepour');
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.gif':'image/gif', '.mp4':'video/mp4', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.wasm':'application/wasm' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const exported = pathname.startsWith('/__output/');
    const root = exported ? output : site;
    const relative = exported ? pathname.slice(9) : pathname === '/' ? '/typepour-prototype.html' : pathname;
    const file = path.resolve(root, '.' + relative);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(file);
    const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store', 'Accept-Ranges':'bytes' };
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) { res.writeHead(416).end(); return; }
      const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) { res.writeHead(416).end(); return; }
      res.writeHead(206, { ...headers, 'Content-Range':`bytes ${start}-${end}/${data.length}`, 'Content-Length':end-start+1 });
      res.end(data.subarray(start, end+1));
    } else { res.writeHead(200, { ...headers, 'Content-Length': data.length }); res.end(data); }
  } catch { res.writeHead(404).end('Not found'); }
}).listen(4179, '127.0.0.1', () => console.log('http://127.0.0.1:4179/typepour-prototype.html'));
