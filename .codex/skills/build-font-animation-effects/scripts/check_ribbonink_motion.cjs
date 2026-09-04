const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../../../site/ribbonink.js'), 'utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\n  function ', start + 1);
  return source.slice(start, end < 0 ? source.length : end);
}
const context = vm.createContext({ inputs: { snakeIntensity: { value: 100 }, letterImpact: { value: 100 } } });
for (const name of ['clamp', 'mix', 'smoothstep', 'easeOutQuint', 'snakeEase', 'easeOutBack', 'impactLetterState', 'endLetterState']) {
  vm.runInContext(extract(name), context);
}
for (const phase of ['write', 'erase']) {
  let previous = 0;
  for (let i = 0; i <= 1000; i++) {
    const value = context.snakeEase(i / 1000, phase);
    assert.ok(value >= previous - 1e-9 && value <= 1 + 1e-9, `monotone ${phase}`);
    previous = value;
  }
  for (const knot of phase === 'write' ? [.16, .45, .64] : [.18, .46, .68]) {
    const h = 1e-6, y = context.snakeEase(knot, phase);
    const left = (y - context.snakeEase(knot - h, phase)) / h;
    const right = (context.snakeEase(knot + h, phase) - y) / h;
    assert.ok(left > .1 && Math.abs(left - right) < .001, 'continuous nonzero knot velocity');
  }
}
const visible = (name, progress) => ({ phase: { name, progress } });
assert.equal(context.impactLetterState(visible('flow', .5)).alpha, 0);
assert.equal(context.impactLetterState(visible('hold', .5)).scaleY, 1);
assert.ok(context.impactLetterState(visible('erase', .62)).scaleY > 1, 'I rebound');
assert.ok(context.endLetterState(visible('flow', .5)).scaleY < .8, 'E compresses');
assert.equal(context.endLetterState(visible('hold', .5)).scaleY, 1);
assert.ok(extract('drawSpacedText').includes('centerY + descent'), 'baseline pivot');
assert.ok(!extract('drawSpacedText').includes('motion.y'), 'no below-baseline translation');
const render = extract('renderFrame');
assert.ok(render.indexOf('drawTextLayer(false)') < render.indexOf('drawExactBrush(context'));
assert.ok(render.indexOf('drawTextLayer(true)') > render.indexOf('drawExactBrush(context'));
console.log('PASS: I/E phase states, baseline pivot, layer order, monotone continuous velocity');
