/* Run with node scripts/check-typepour.cjs. Checks fluid behavior, not a pixel snapshot. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/typepour-fluid.js'), 'utf8'), context);
const { Liquid, CUP } = context.module.exports;
const liquid = new Liquid(), checkpoints = new Map();
let maxDisplacement = 0;
let previous = liquid.snapshot();
for (let frame = 1; frame <= 720; frame++) {
  liquid.step(); liquid.step();
  const snapshot = liquid.snapshot();
  for (let i = 0; i < snapshot.length; i++) assert.ok(Number.isFinite(snapshot[i]), `non-finite frame ${frame}`);
  for (let i = 0; i < previous.length; i += 3) maxDisplacement = Math.max(maxDisplacement, Math.hypot(snapshot[i] - previous[i], snapshot[i + 1] - previous[i + 1]));
  if ([180, 360, 480, 600, 720].includes(frame)) checkpoints.set(frame, snapshot);
  previous = snapshot;
}
assert.equal(liquid.particles.length, 1360, 'emission should finish exactly once');
assert.ok(maxDisplacement < 35, 'particles must not teleport at fluid phase boundaries');
for (const p of liquid.particles) {
  assert.ok(p.y > CUP.top + 12, 'settled fluid should stay below the rim');
  assert.ok(p.y < CUP.bottom, 'no floor penetration');
  const half = CUP.halfTop + (CUP.halfBottom - CUP.halfTop) * (p.y - CUP.top) / (CUP.bottom - CUP.top);
  assert.ok(Math.abs(p.x - CUP.x) < half, 'no wall penetration');
}
const early = checkpoints.get(180), floorParticles = [];
for (let i = 0; i < early.length; i += 3) if (early[i + 1] > 760) floorParticles.push(early[i]);
assert.ok(Math.max(...floorParticles) - Math.min(...floorParticles) > 220, 'impact must spread across the cup instead of forming a narrow heap');
const tail = checkpoints.get(600), final = checkpoints.get(720);
let tailMovement = 0;
for (let i = 0; i < final.length; i += 3) tailMovement += Math.hypot(tail[i] - final[i], tail[i + 1] - final[i + 1]);
assert.ok(tailMovement / liquid.count > 1, 'the settling phase must retain residual motion');
const replay = new Liquid();
for (let i = 0; i < 360; i++) replay.step();
assert.deepEqual(Array.from(replay.snapshot()), Array.from(early), 'same seed and time must replay identically');
console.log(JSON.stringify({ ok: true, particles: liquid.count, maxFrameDisplacement: maxDisplacement, residualMovement: tailMovement / liquid.count }));
