import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sandbox = { window: {} };
vm.runInNewContext(await readFile(new URL('../site/glasswalkers-renderer.js', import.meta.url), 'utf8'), sandbox);
const renderer = Object.create(sandbox.window.GlassWalkersRenderer.prototype);
const route = {
  at: time => [time * .82, 1.5 + .025 * Math.sin(time * .4), 0],
  directionAt: time => {
    const dy = .01 * Math.cos(time * .4), length = Math.hypot(.82, dy);
    return [.82 / length, dy / length, 0];
  }
};
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let previous, still = [0, 0], longest = [0, 0], maxJump = 0, lifted = false;
for (let frame = 0; frame <= 720; frame++) {
  const human = renderer.human(route, frame / 120, 0);
  assert(human.parts.length <= 40, 'GPU must receive every body part');
  const heels = [human.parts[0].a, human.parts[6].a];
  for (let foot = 0; foot < 2; foot++) {
    lifted ||= heels[foot][2] > .09;
    if (!previous) continue;
    const movement = distance(heels[foot], previous[foot]);
    maxJump = Math.max(maxJump, movement);
    still[foot] = movement < 1e-7 && heels[foot][2] < .005 ? still[foot] + 1 : 0;
    longest[foot] = Math.max(longest[foot], still[foot]);
  }
  previous = heels;
}
assert(longest.every(frames => frames >= 30), 'Each foot must stay planted for at least 0.25 seconds');
assert(lifted, 'Swinging feet must leave the glass');
assert(maxJump < .045, `Foot teleport at stance/swing boundary: ${maxJump} m`);
for (const dog of [false, true]) {
  const pet = renderer.animal(route, 3, 0, dog);
  assert(pet.parts.length <= 40, 'GPU must receive the complete animal including its tail');
}
console.log(`PASS: planted intervals ${longest.map(n => (n / 120).toFixed(2)).join('/')} s; largest 120 fps foot displacement ${maxJump.toFixed(4)} m.`);
