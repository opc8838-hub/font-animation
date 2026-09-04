const assert = require('node:assert/strict');
const path = require('node:path');
require(path.resolve(__dirname, '../../../../site/ribbonink-sequence.js'));
const { evaluate, compile, progress, section } = globalThis.RibbonInkSequence;
for (const shape of ['loop', 'arc']) for (const H of [405, 720, 1280]) {
  const route = compile(shape, 720, H, [710, H / 2 - 8]);
  const frozen = JSON.stringify(route);
  assert.deepEqual(route.parts[0].points[0].x, 710);
  assert.ok(route.parts.at(-1).points.at(-1).x > 1440 + 100, 'head exits beyond right boundary');
  for (let i = 1; i < route.parts.length; i++) {
    const a = route.parts[i - 1].points.at(-1), b = route.parts[i].points[0];
    assert.equal(a.x, b.x); assert.equal(a.y, b.y); assert.equal(a.length, b.length);
    assert.ok(Math.abs(Math.atan2(Math.sin(a.angle - b.angle), Math.cos(a.angle - b.angle))) < .15, 'smooth tangent through joins');
  }
  for (const bridge of [.55, .9, 1.6]) for (const hold of [1, 1.25, 2.5]) {
    let previous = -1, tail = -1;
    for (let i = 0; i <= 400; i++) {
      const state = evaluate(i / 100 * bridge, bridge, .42, route, hold);
      assert.ok(state.head >= previous && state.tail >= tail && state.tail <= state.head);
      previous = state.head; tail = state.tail;
      assert.ok(state.camera >= 0 && state.camera <= 1);
    }
    const contact = evaluate(0, bridge, .42, route, hold).contact;
    const at = evaluate(contact, bridge, .42, route, hold);
    assert.ok(Math.abs(at.head - route.contactDistance) < 1e-7, 'center is reached at text trigger');
    const tip = section(route.parts[0].points, 0, at.head).at(-1);
    assert.ok(Math.abs(tip.x - 1080) < 1e-6 && Math.abs(tip.y - H / 2) < 1e-6);
    assert.equal(at.camera, 1, 'second page is centered before the word pops');
    assert.equal(evaluate(contact - .001, bridge, .42, route, hold).scale, 0);
    assert.ok(evaluate(contact + .25, bridge, .42, route, hold).scale > 1);
    assert.equal(evaluate(contact + .43, bridge, .42, route, hold).scale, 1);
    const end = evaluate(bridge + hold, bridge, .42, route, hold);
    assert.equal(end.head, end.tail, 'tail clears before the loop reset, even at timing extremes');
    assert.deepEqual(evaluate(.73, bridge, .42, route, hold), evaluate(.73, bridge, .42, route, hold));
  }
  assert.equal(JSON.stringify(route), frozen, 'written coordinates never translate or deform with time');
}
for (let x = .001; x < .999; x += .001) assert.ok(progress(x + .0001) > progress(x), 'no mid-stroke pause');
console.log('PASS: stationary world geometry, advancing head/tail, smooth joins, center trigger, glyph-pop overlap, exit and determinism');
