const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cellmotion-publish-cache-'));
try {
  const write = (name, text) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  write('index.html', '<head><link rel="stylesheet" href="home.css"></head>');
  write('home.css', 'body{margin:0}');
  write('assets/cellmotion/home-media.json', '{}');
  write('assets/fonts/editor-font-map.json', '{}');
  write('metallic-text.html', '<head><link rel="stylesheet" href="shared-fonts.css?v=spacing-fix"><link rel="stylesheet" href="metallic-text.css?v=approved"><link rel="stylesheet" href="unversioned.css"></head>');
  execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/prepare-homepage.mjs'), root]);
  const published = fs.readFileSync(path.join(root, 'metallic-text.html'), 'utf8');
  assert.ok(published.includes('shared-fonts.css?v=spacing-fix'), 'Publishing must preserve an explicit font cache revision');
  assert.ok(published.includes('metallic-text.css?v=approved'), 'Publishing must preserve an explicit editor CSS revision');
  assert.ok(published.includes('unversioned.css?v=20261028-ready1'), 'Unversioned CSS retains the publication fallback');
  console.log('PASS: publication retains explicit font/editor cache revisions and versions unversioned CSS');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
