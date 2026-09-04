// Deterministic regression checks; no browser or external dependencies required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('site/morphports-reviewed.js', 'utf8');
const slugs = ['sproutshift', 'mistlift', 'typecascade', 'dotresolve', 'glyphreveal', 'glyphmorph'];
const gifDelays = Array.from({length:291},(_,i)=>(Math.round((i+1)*100/30)-Math.round(i*100/30))*10);
assert.equal(gifDelays.reduce((sum,delay)=>sum+delay,0),9700,'GIF centisecond rounding preserves full duration');
function load(slug) {
  const ctx = { font: '', measureText(text) { return { width: parseFloat(this.font.match(/([\d.]+)px/)[1]) * (text === ' ' ? .3 : .6) }; } };
  const node = { dataset: {}, addEventListener() {}, getContext() { return ctx; } };
  const sandbox = {
    console, Intl, performance: { now: () => 0 }, matchMedia: () => ({ matches: false }),
    document: { body: { dataset: { morphPort: slug } }, getElementById: () => node, createElement: () => node, querySelector: () => node, querySelectorAll: () => [], addEventListener() {} },
    window: {}, HTMLSelectElement: class {}, MutationObserver: class { observe() {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('site/shared-font-library.js','utf8'), sandbox);
  vm.runInContext(fs.readFileSync('site/row-font-editor.js','utf8'), sandbox);
  const effectSource = slug === 'glyphmorph' ? fs.readFileSync('site/glyphmorph.js','utf8') : source;
  vm.runInContext(effectSource.replace(/  initialize\(\);\s*\}\)\(\);\s*$/, '  globalThis.test = { state, dotTokenColor: typeof dotTokenColor === "function" ? dotTokenColor : null, rowTokens, glyphLayout, timelineSegments, resolveTimeline, cycleDurationMs, rowStartElapsed, cascadeTiming: typeof cascadeTiming === "function" ? cascadeTiming : null, cascadePose: typeof cascadePose === "function" ? cascadePose : null };\n})();'), sandbox);
  const library = sandbox.window.STGFontLibrary;
  const rowFonts = sandbox.window.MERowFonts;
  assert.equal((rowFonts.options('').match(/<option /g) || []).length,library.fonts.length + 1,'complete catalog plus inherit');
  assert.equal(rowFonts.normalize('stg:unknown'),'');
  return { ...sandbox.test, ctx };
}
for (const slug of slugs) {
  const t = load(slug);
  if (slug === 'dotresolve') {
    const row = t.state.scheme.rows[0];
    Object.assign(row,{text:'A中🙂B', initialColor:'#111111',colorMode:'multi',effectColors:['#ff0000','#00ff00','#0000ff','#ffff00'],sweepEnabled:true});
    const tokens = t.rowTokens(row);
    assert.equal(tokens.length,4,'emoji is one grapheme color slot');
    assert.equal(t.dotTokenColor(row,tokens[0],-1),'#111111','hold is initial color');
    assert.equal(t.dotTokenColor(row,tokens[0],0),'#ff0000','scan begins left');
    assert.equal(t.dotTokenColor(row,tokens[3],0),'#111111','right is initially unpainted');
    tokens.forEach((token,i)=>assert.equal(t.dotTokenColor(row,token,1),row.effectColors[i],'no color restoration at end'));
    row.sweepEnabled=false;
    tokens.forEach((token,i)=>assert.equal(t.dotTokenColor(row,token,0),row.effectColors[i],'scan off switches simultaneously'));
    row.colorMode='single'; row.effectColor='#123456';
    tokens.forEach(token=>assert.equal(t.dotTokenColor(row,token,.5),'#123456'));
    row.colorMode='off';
    assert.equal(t.dotTokenColor(row,tokens[0],.5),'#111111','legacy mode unchanged');
  }
  assert.equal(t.state.scheme.motion.loop, true, slug + ' defaults to loop');
  t.state.scheme.rows[0].fontFamily = 'stg:lora';
  assert.equal(t.glyphLayout(t.ctx,t.state.scheme.rows[0],1080,1080).family.startsWith('"STG Lora"'),true);
  assert.equal(t.glyphLayout(t.ctx,t.state.scheme.rows[1],1080,1080).family.startsWith('"STG Inter"'),true,'row override cannot change other rows');
  for (const [w, h] of [[1080,1080],[1080,1920],[1920,1080],[1080,1350],[1080,1440]]) {
    const layouts = t.state.scheme.rows.map(row => t.glyphLayout(t.ctx, row, w, h));
    if (slug !== 'glyphmorph') assert.ok(layouts.every(l => Math.abs(l.fontSize - layouts[0].fontSize) < 1e-7), slug + ' stable sequence size');
    for (const l of layouts) for (const slot of l.slots) {
      assert.ok(slot.x - slot.width / 2 >= w * .06 - 1e-6);
      assert.ok(slot.x + slot.width / 2 <= w * .94 + 1e-6);
    }
    const half = t.glyphLayout(t.ctx, t.state.scheme.rows[0], w / 2, h / 2);
    assert.ok(Math.abs(half.fontSize * 2 - layouts[0].fontSize) < 1e-7, 'preview/export scale parity');
  }
  const cycle = t.cycleDurationMs();
  assert.equal(t.resolveTimeline(cycle + 1).index, 0, slug + ' loops to first row');
  t.state.scheme.rows.forEach((row, i) => {
    const at = t.resolveTimeline(t.rowStartElapsed(i) + .001);
    assert.equal(at.index, i);
    assert.equal(at.inHold, true, 'pause at complete readable row');
  });
  t.state.scheme.rows[0].text = '中文排版测试 日本語の文字 한글 애니메이션';
  t.state.scheme.rows[0].icons = [{libraryId:'test',boundary:2,size:220,gap:80}];
  const composed = t.glyphLayout(t.ctx,t.state.scheme.rows[0],1080,1920);
  assert.ok(composed.slots.every(s => s.x - s.width/2 >= 64.79 && s.x + s.width/2 <= 1015.21));
  if (slug === 'typecascade') {
    const row = t.state.scheme.rows[0];
    const before = t.cycleDurationMs();
    row.hangDuration = 620;
    assert.equal(t.cycleDurationMs() - before, 500);
    row.fallDuration = 950;
    assert.equal(t.cycleDurationMs() - before, 1000);
    for (const [w,h] of [[1080,1080],[1080,1920],[1920,1080]]) {
      const l = t.glyphLayout(t.ctx,row,w,h);
      const timing = t.cascadeTiming(row);
      const hang = t.cascadePose(row,0,timing.tilt + timing.hang/2,l.slots[0],l,h);
      assert.equal(hang.offsetY,0);
      const elapsed = timing.tilt + timing.hang + timing.drop;
      const fallen = t.cascadePose(row,0,elapsed,l.slots[0],l,h);
      assert.ok(fallen.complete);
      assert.ok(l.slots[0].y + fallen.offsetY - l.fontSize * 3 > h, 'full rotated envelope exits bottom');
      for (let i=0;i<l.slots.length;i++) {
        const atEnd = t.timelineSegments()[0].transitionMs;
        assert.ok(t.cascadePose(row,i,atEnd,l.slots[i],l,h).complete,'last glyph completes before next hold');
      }
    }
  }
  console.log('PASS', slug);
}
