const assert = require('node:assert/strict');
const path = require('node:path');
require(path.resolve(__dirname, '../../../../site/ribbonink-sequence.js'));
const { evaluate, travel } = globalThis.RibbonInkSequence;
for (const bridge of [.55, .9, 1.6]) {
  let previous = -1;
  for (let i = 0; i <= 1000; i++) {
    const state = evaluate(i / 250 * bridge, bridge, .42);
    assert.ok(state.world >= previous, 'one continuously right-moving world trajectory');
    previous = state.world;
    assert.ok(state.camera >= 0 && state.camera <= 1);
  }
  const contact = evaluate(0, bridge, .42).contact;
  const at = evaluate(contact, bridge, .42);
  assert.ok(Math.abs(at.offset + 1 - .5) < 1e-8, 'tip reaches page center at text trigger');
  assert.equal(evaluate(contact - .001, bridge, .42).scale, 0);
  assert.ok(evaluate(contact + .25, bridge, .42).scale > 1, 'whole word overshoots');
  assert.equal(evaluate(contact + .43, bridge, .42).scale, 1);
  const h = 1e-6;
  const left = (travel(1) - travel(1 - h)) / h;
  const right = (travel(1 + h) - travel(1)) / h;
  assert.ok(Math.abs(left - right) < 1e-4 && right > 1, 'no stop at second-page boundary');
}
assert.deepEqual(evaluate(.73, .9, .42), evaluate(.73, .9, .42));
console.log('PASS: continuous world motion, center-triggered pop, overshoot and deterministic sampling');
