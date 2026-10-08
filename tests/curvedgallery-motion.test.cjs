const assert = require('node:assert/strict');
const { defaults, timeline, pose, panelPoints } = require('../site/curvedgallery-motion.js');
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
const early = pose(s, 0.5);
const rear = Array.from({ length: s.slots }, (_, i) => i).sort((a, b) => Math.cos(a * Math.PI * 2 / s.slots + early.angle) - Math.cos(b * Math.PI * 2 / s.slots + early.angle))[0];
assert.ok(panelPoints(s, early, rear, 0.5, 0).y > 1080, 'rear panels start outside composition');
const p = pose(s, line.pullEnd), edge = panelPoints(s, p, 1, 0, 0), mid = panelPoints(s, p, 1, 0.5, 0), other = panelPoints(s, p, 1, 1, 0);
assert.ok(Math.abs(mid.y - (edge.y + other.y) / 2) > 0.1, 'panel is curved, not a flat quadrilateral');
console.log('PASS cylinder continuity, pullback, overlap, curvature and final pose');
