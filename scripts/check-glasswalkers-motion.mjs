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
for (const index of [0, 1, 2, 3, 4, 5, 6, 7]) {
  let previous, previousParts, still = [0, 0], longest = [0, 0], maxJump = 0, lifted = false;
  let swingPeak = { angle: 0, phase: 0 }, landingMax = 0, stanceMax = 0, loadingPeak = 0;
  const shoeParts = index % 3 === 1 ? 5 : 4;
  for (let frame = 0; frame <= 720; frame++) {
    const human = renderer.human(route, frame / 120, index);
    assert(human.parts.length <= 40, 'GPU must receive every body part');
    const heels = [human.parts[0].a, human.parts[shoeParts].a];
    const legs = human.parts.slice(shoeParts * 2, shoeParts * 2 + 4);
    const lengths = legs.map(part => distance(part.a, part.b));
    assert(Math.max(...lengths) - Math.min(...lengths) < 1e-8, 'Leg bones must retain equal lengths instead of stretching at toe-off');
    const reach = [0, 2].map(i => distance(legs[i].a, legs[i + 1].b) / (lengths[i] + lengths[i + 1]));
    for (let foot = 0; foot < 2; foot++) {
      const phase = human.footprints[foot].phase;
      const flexion = 2 * Math.acos(Math.min(1, reach[foot])) * 180 / Math.PI;
      if (phase >= .2 && phase <= .38) stanceMax = Math.max(stanceMax, flexion);
      if (phase >= .05 && phase <= .15) loadingPeak = Math.max(loadingPeak, flexion);
      if (phase >= .97 || phase <= .025) landingMax = Math.max(landingMax, flexion);
      if (phase >= .62 && flexion > swingPeak.angle) swingPeak = { angle: flexion, phase };
    }
    assert(Math.max(...reach) > .93, 'At least one supporting leg must extend instead of both knees crouching');
    if (previousParts) human.parts.forEach((part, i) => {
      for (const end of ['a', 'b']) assert(distance(part[end], previousParts[i][end]) < .045, 'Body and shoe joints must move continuously');
    });
    previousParts = human.parts;
    const hip = human.parts[shoeParts * 2 + 4], torso = human.parts[shoeParts * 2 + 5];
    const pelvis = hip.a.map((v, i) => (v + hip.b[i]) / 2);
    assert(Math.hypot(torso.b[0] - pelvis[0], torso.b[1] - pelvis[1]) < .03, 'Torso must stay upright over the pelvis');
    if (shoeParts === 5 && heels[0][2] < .005) {
      assert(human.parts[2].a[2] > heels[0][2] + .06, 'High-heel arch must remain above its heel contact');
      assert(human.parts[0].ra < .02, 'High heels must retain a small heel contact');
    }
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
  assert(stanceMax < 10, `Support knee remains bent at midstance: ${stanceMax.toFixed(1)} degrees`);
  assert(loadingPeak > 10 && loadingPeak < 23, `Loading knee must absorb contact without staying crouched: ${loadingPeak.toFixed(1)} degrees`);
  assert(landingMax < 18, `Leading knee must extend before landing: ${landingMax.toFixed(1)} degrees`);
  assert(swingPeak.phase < .82, `Swing knee flexion peaks too late: ${(swingPeak.phase * 100).toFixed(1)}%`);
  console.log(`PASS profile ${index}: midstance ${stanceMax.toFixed(1)}°, landing ${landingMax.toFixed(1)}°, swing peak at ${(swingPeak.phase * 100).toFixed(1)}%; planted ${longest.map(n => (n / 120).toFixed(2)).join('/')} s; largest foot displacement ${maxJump.toFixed(4)} m.`);
}
for (const dog of [false, true]) {
  const pet = renderer.animal(route, 3, 0, dog);
  assert(pet.parts.length <= 40, 'GPU must receive the complete animal including its tail');
}
