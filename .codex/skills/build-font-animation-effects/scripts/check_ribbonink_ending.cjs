const assert = require('node:assert/strict');
const path = require('node:path');
require(path.resolve(__dirname, '../../../../site/ribbonink-sequence.js'));
const S = globalThis.RibbonInkSequence;
for (const shape of ['loop', 'arc']) for (const bridge of [.55, .9, 1.6]) {
  const route = S.compile(shape, 720, 405, [710, 195]);
  for (const rhythm of ['snake', 'smooth', 'linear']) for (const position of [.25, .75]) for (const width of [.1, .5]) {
    const options = { rhythm, position, width, strength: 1, finish: .36 };
    let head = 0, tail = 0;
    for (let i = 0; i <= 1000; i++) {
      const t = i / 1000 * (bridge + options.finish);
      const m = S.evaluate(t, bridge, .42, route, 1.25, options);
      assert.ok(m.head >= head - 1e-8 && m.tail >= tail - 1e-8, 'no reverse or reset');
      assert.ok(m.tail <= m.head + 1e-8, 'tail never overtakes head');
      head = m.head; tail = m.tail;
    }
    assert.ok(Math.abs(tail - route.length) < 1e-7, 'ink completely exits');
    const a = S.distances(bridge - 1e-7, bridge, 1.25, options), b = S.distances(bridge + 1e-7, bridge, 1.25, options);
    assert.ok(Math.abs(a.head - b.head) < 1e-5 && Math.abs(a.tail - b.tail) < 1e-5, 'continuous handoff into ending');
    for (const distance of [.1, .5, .9]) {
      const release = S.releaseAt(distance, bridge, 1.25, options);
      assert.ok(Math.abs(S.distances(release, bridge, 1.25, options).tail - distance) < 1e-8, 'glyph release follows edited tail');
    }
    assert.deepEqual(S.evaluate(.7, bridge, .42, route, 1.25, options), S.evaluate(.7, bridge, .42, route, 1.25, options));
  }
}
const o = {rhythm:'snake',position:.48,width:.3,strength:.9};
const velocity = x => (S.progress(x+.0001,o)-S.progress(x-.0001,o))/.0002;
assert.ok(velocity(.48) < velocity(.15)*.2 && velocity(.48)>0, 'readable moving slow pocket');
assert.equal(S.progress(.37,{...o,rhythm:'linear'}),.37);
console.log('PASS: independent rhythm, nonzero slowdown, continuous round-trip paths, ending exit and synchronized glyph release');
