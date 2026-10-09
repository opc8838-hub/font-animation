const assert = require('node:assert/strict');
const { defaults, timeline, pose, panelPoints, faceScale } = require('../site/curvedgallery-motion.js');
const s = { ...defaults }, line = timeline(s);
assert.ok(Math.abs(line.total - 4.6) < 1e-8);
assert.ok(line.pullStart < s.spin, 'rotation and pullback overlap');
const before = pose(s, line.pullStart - 0.001), after = pose(s, line.pullStart + 0.001);
assert.ok(Math.abs(before.angle - after.angle) < 0.02, 'continuous orientation across pullback');
let previousRadius = Infinity;
for (let t = 0; t <= line.pullEnd; t += 0.005) {
  const p = pose(s, t);
  assert.ok(p.radius <= previousRadius + 1e-9, 'pullback must not rebound'); previousRadius = p.radius;
  assert.ok(Number.isFinite(panelPoints(s, p, 0, 0.5, 0.5).y));
}
const end = pose(s, line.pullEnd);
assert.ok(Math.abs(end.radius - s.finalSize) < 1e-8);
assert.ok(Math.abs(end.angle) < 1e-8, 'rotation settles on stable mark');
assert.equal(pose(s, line.total).alpha, 0);
assert.equal(timeline({ ...s, speed: 2 }).total, line.total / 2);
// Crossing the front/back boundary used to change width and height in one frame.
for (const pull of [0, 0.5, 1]) {
  const at = { ...pose(s, line.pullEnd), pull };
  const q1 = panelPoints(s, { ...at, angle: Math.PI / 2 - 1e-7 }, 0, 0, 0);
  const q2 = panelPoints(s, { ...at, angle: Math.PI / 2 + 1e-7 }, 0, 0, 0);
  assert.ok(Math.hypot(q1.x - q2.x, q1.y - q2.y) < 0.001, 'no front/back geometry jump');
}
assert.ok(line.shiftStart < line.revealStart, 'the whole mark moves left before the word');
const shiftPose = pose(s, line.revealStart - 0.01, 425);
assert.ok(shiftPose.x < 940 && shiftPose.reveal === 0, 'visible left movement with no text yet');
let previousFace = 1;
for (let t = line.pullStart; t <= line.pullEnd; t += 0.005) {
  const fixedFront = { ...pose(s, t), angle: 0 };
  const face = faceScale(s, fixedFront, 0);
  assert.ok(face <= previousFace + 1e-9, 'photo face compresses continuously');
  previousFace = face;
}
assert.equal(faceScale(s, { ...end, angle: 0 }, 0), 0, 'photo contracts to an edge');
assert.equal(faceScale({ ...s, solidMark: false }, { ...pose({ ...s, solidMark: false }, line.pullEnd), angle: 0 }, 0), 1, 'optional preserved photo face');
// Measurements come from the 592px reference crop, offset by its 1.17s recording lead-in.
const reference = [[2.8, 282], [2.9, 254], [3.0, 219], [3.1, 161], [3.2, 113], [3.3, 83.5], [3.4, 67], [3.5, 61], [3.6, 53.5]];
for (const [sourceTime, radius] of reference) assert.ok(Math.abs(pose(s, sourceTime - 1.17).radius * 592 / 1920 - radius) < 10, 'camera follows reference width');
const centers = [[3.7, 293], [3.8, 290.5], [3.9, 286.5], [4.0, 282], [4.1, 268.5], [4.2, 237.5], [4.3, 225.5], [4.4, 221.5], [4.5, 220.5]];
for (const [sourceTime, x] of centers) assert.ok(Math.abs(pose(s, sourceTime - 1.17, 425).x * 592 / 1920 - x) < 5.5, 'group shift follows measured source centers');
const p = pose(s, line.pullEnd), edge = panelPoints(s, p, 1, 0, 0), mid = panelPoints(s, p, 1, 0.5, 0), other = panelPoints(s, p, 1, 1, 0);
assert.ok(Math.abs(mid.y - (edge.y + other.y) / 2) > 0.1, 'panel is curved, not a flat quadrilateral');
console.log('PASS measured camera timing, front/back continuity, geometric photo folding, early left shift and final pose');
