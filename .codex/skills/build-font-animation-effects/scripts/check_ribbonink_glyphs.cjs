const assert = require('node:assert/strict');
const path = require('node:path');
for (const name of ['sequence', 'freehand', 'writing', 'glyphs']) require(path.resolve(__dirname, `../../../../site/ribbonink-${name}.js`));
const G = globalThis.RibbonInkGlyphs;
let glyphs = G.reconcile([], 'A中あ한e\u0301👩‍🎨');
assert.equal(glyphs.length, 6, 'combining marks and ZWJ emoji stay one selectable unit');
glyphs[1].depth = 'back'; glyphs[1].motion = 'hide'; glyphs[1].amount = .8;
const id = glyphs[1].id;
glyphs = G.reconcile(glyphs, 'XA中あ한é👩‍🎨Z');
assert.equal(glyphs.find(g => g.id === id).text, '中');
assert.equal(glyphs.find(g => g.id === id).motion, 'hide');
glyphs = G.reconcile(glyphs, 'X中한Z');
assert.equal(glyphs.find(g => g.id === id).depth, 'back');
assert.deepEqual(G.reconcile(JSON.parse(JSON.stringify(glyphs)), 'X中한Z'), glyphs);
assert.deepEqual(G.reconcile(glyphs, ''), []);
assert.throws(() => G.reconcile({}, 'X'));
const events = [{ start: .3, release: 1.1, rear: false }];
assert.equal(G.reconcile([], '中文')[0].amount, .4, 'new text starts with gentle pressure');
const pressure = [0, .15, .4, .85].map(amount => G.pose({ ...G.defaults, motion: 'press', amount }, events, .7, 2, 'weave').sy);
assert.equal(pressure[0], 1, 'zero pressure leaves the glyph unchanged');
assert.ok(pressure[0] > pressure[1] && pressure[1] > pressure[2] && pressure[2] > pressure[3], 'pressure increases continuously from shallow to deep');
assert.equal(G.reconcile([{ ...G.defaults, id: 'saved', text: '文', amount: 1.2 }], '文')[0].amount, 1.2, 'existing saved strength is not replaced by the new default');
const annotation = { ...G.defaults, motion: 'hide' };
const neutral = G.pose(annotation, events, 0, 2, 'weave');
assert.equal(G.pose(annotation, [], .7, 2, 'weave').sy, 1, 'no contact means no movement');
assert.equal(G.pose(annotation, events, .7, 2, 'weave').alpha, 0, 'fully hidden while held, no residual bar');
assert.equal(G.pose({ ...annotation, amount: .85 }, events, .7, 2, 'weave').alpha, 0, 'smaller deformation does not leave a ghost glyph');
assert.ok(G.pose(annotation, events, 1.34, 2, 'weave').sy > 1, 'release overshoots');
assert.deepEqual(G.pose(annotation, events, 1.6, 2, 'weave'), neutral);
for (const motion of ['auto', 'none', 'press', 'hide', 'lean', 'turn']) {
  for (const direction of ['down', 'left', 'right']) {
    const a = { ...G.defaults, motion, direction };
    assert.deepEqual(G.pose(a, events, .7, 2, 'weave'), G.pose(a, events, .7, 2, 'weave'));
    assert.deepEqual(G.pose({ ...a, amount: 0 }, events, .7, 2, 'weave'), neutral);
    assert.deepEqual(G.pose(a, events, 2, 2, 'weave'), neutral, 'recovery finishes before page reset');
  }
}
const front = G.pose({ ...G.defaults, depth: 'front' }, events, .7, 2, 'back');
const back = G.pose({ ...G.defaults, depth: 'back' }, events, .7, 2, 'front');
assert.ok(front.sy < back.sy, 'automatic reaction respects explicit per-glyph depth');
const r = globalThis.RibbonInkSequence.compile('loop', 720, 405, [710, 195]);
const emptyGlyph = { left: 100, top: 100, mw: 80, mh: 80, mask: new Uint8ClampedArray(80 * 80 * 4) };
assert.deepEqual(G.contacts([emptyGlyph], r, { W: 720, H: 405, bridge: .9, hold: 1.25, pop: .42, brushWidth: 74 }), [[]], 'transparent glyph bounds do not trigger');
const radius = globalThis.RibbonInkWriting.radius;
for (const width of [25, 74, 150]) {
  const sample = { length: 120, angle: .4 };
  const body = radius(sample, { tail: 0, head: 500 }, width);
  assert.ok(radius(sample, { tail: 120, head: 500 }, width) >= body * .93, 'tail stays plump, not pinched');
  assert.ok(radius(sample, { tail: 0, head: 120 }, width) >= body * .95, 'head keeps a full round cap');
  assert.equal(radius(sample, { tail: 50, head: 200 }, width), body, 'middle pressure and thickness stay unchanged');
}
console.log('PASS: grapheme identity, scoped annotations, migration, alpha contact, hidden hold, release overshoot, deterministic poses and rounded brush ends');
