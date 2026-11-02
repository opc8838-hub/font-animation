import * as THREE from './live-portal/vendor/three.module.js';

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
const glyph = document.createElement('canvas');
const body = document.createElement('canvas');
let cacheKey = '';
let bounds = { left: 0, right: 0 };
let geometry = null;
let basePositions = null;
let stripCenters = null;
let edgeOffsets = null;
let renderer = null;
let world = null;
let camera = null;
let mesh = null;
let activeCount = 0;
let renderWidth = 0;
let renderHeight = 0;

function runsAt(pixels, width, height, x) {
  const runs = [];
  let start = -1;
  for (let y = 0; y <= height; y++) {
    const inside = y < height && pixels[(y * width + x) * 4 + 3] > 96;
    if (inside && start < 0) start = y;
    if (!inside && start >= 0) {
      if (y - start > Math.max(2, height * .003)) runs.push({ top: start, bottom: y });
      start = -1;
    }
  }
  return runs;
}

function edgeFor(runs, run, height) {
  const middle = (run.top + run.bottom) / 2;
  let nearest = null;
  let distance = Infinity;
  for (const candidate of runs) {
    const gap = Math.abs((candidate.top + candidate.bottom) / 2 - middle);
    if (gap < distance) { nearest = candidate; distance = gap; }
  }
  return nearest && distance < height * .1 ? nearest : { top: middle, bottom: middle };
}

function makeGeometry(scene, width, height, groupCount) {
  const pixels = glyph.getContext('2d').getImageData(0, 0, width, height).data;
  const positions = [];
  const normals = [];
  const colors = [];
  const centers = [];
  const offsets = [];
  const front = new THREE.Color(scene.textColor);
  const sideStrength = clamp(scene.fringe / 2);
  const blue = front.clone().lerp(new THREE.Color('#06376b'), sideStrength);
  const rim = front.clone().lerp(new THREE.Color('#72d7ff'), sideStrength);
  const amber = front.clone().lerp(new THREE.Color('#8f4d15'), sideStrength * .7);
  const warmRim = front.clone().lerp(new THREE.Color('#e9a959'), sideStrength * .7);
  const topColor = front.clone().lerp(new THREE.Color('#566a75'), sideStrength * .36);
  const back = front.clone().multiplyScalar(.55);
  const depth = Math.min(width, height) * (.012 + scene.spread * .03);
  const count = Math.max(4, Math.round(scene.slices));
  const stripWidth = (bounds.right - bounds.left) / count;
  const point = (x, y, z, lift) => [x - width / 2, height / 2 - y, z, lift];
  const quad = (a, b, c, d, color, center) => {
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ad = new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
    const normal = ab.cross(ad).normalize();
    const paints = Array.isArray(color) ? color : [color, color, color, color];
    for (const [vertex, paint] of [[a, paints[0]], [b, paints[1]], [d, paints[3]],
      [b, paints[1]], [c, paints[2]], [d, paints[3]]]) {
      positions.push(vertex[0], vertex[1], vertex[2]);
      normals.push(normal.x, normal.y, normal.z);
      colors.push(paint.r, paint.g, paint.b);
      centers.push(center);
      offsets.push(vertex[3]);
    }
  };
  for (let i = 0; i < count; i++) {
    const group = Math.floor(i * groupCount / count);
    const groupWidth = (bounds.right - bounds.left) / groupCount;
    const groupCenter = bounds.left + (group + .5) * groupWidth - width / 2;
    const leftBoundary = i === 0 || Math.floor((i - 1) * groupCount / count) !== group;
    const rightBoundary = i === count - 1 || Math.floor((i + 1) * groupCount / count) !== group;
    const x0 = bounds.left + i * stripWidth;
    const x1 = x0 + stripWidth;
    const sample = fraction => clamp(Math.round(x0 + stripWidth * fraction), 0, width - 1);
    const middleRuns = runsAt(pixels, width, height, sample(.5));
    const leftRuns = runsAt(pixels, width, height, sample(.12));
    const rightRuns = runsAt(pixels, width, height, sample(.88));
    for (const run of middleRuns) {
      const left = edgeFor(leftRuns, run, height);
      const right = edgeFor(rightRuns, run, height);
      const center = groupCenter;
      const lift = height * .014 * groupCount / count;
      const lfTop = point(x0, left.top, 0, -lift), rfTop = point(x1, right.top, 0, lift);
      const lfBottom = point(x0, left.bottom, 0, -lift), rfBottom = point(x1, right.bottom, 0, lift);
      const lbTop = point(x0, left.top, -depth, -lift), rbTop = point(x1, right.top, -depth, lift);
      const lbBottom = point(x0, left.bottom, -depth, -lift), rbBottom = point(x1, right.bottom, -depth, lift);
      quad(lfBottom, rfBottom, rfTop, lfTop, front, center);
      quad(rbBottom, lbBottom, lbTop, rbTop, back, center);
      quad(rfBottom, rbBottom, rbTop, rfTop, rightBoundary ? [rim, blue, blue, rim] : front, center);
      quad(lbBottom, lfBottom, lfTop, lbTop, leftBoundary ? [amber, warmRim, warmRim, amber] : front, center);
      quad(lfTop, rfTop, rbTop, lbTop, topColor, center);
      quad(lbBottom, rbBottom, rfBottom, lfBottom, back, center);
    }
  }
  activeCount = groupCount;
  if (mesh) {
    world.remove(mesh);
    mesh.material.dispose();
  }
  geometry?.dispose();
  geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  basePositions = geometry.attributes.position.array.slice();
  stripCenters = new Float32Array(centers);
  edgeOffsets = new Float32Array(offsets);
  mesh = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({
    vertexColors: true, metalness: .22, roughness: .3, clearcoat: 1, clearcoatRoughness: .07,
    side: THREE.DoubleSide
  }));
  mesh.frustumCulled = false;
  world.add(mesh);
}

function makeGlyph(scene, width, height) {
  const key = [width, height, scene.text, scene.font, scene.fontSize, scene.fontHeight, scene.extraBold,
    scene.positionX, scene.positionY, scene.alignment, scene.textColor, scene.slices, scene.spread, scene.fringe].join('|');
  if (key === cacheKey) return;
  cacheKey = key;
  glyph.width = width; glyph.height = height;
  body.width = width; body.height = height;
  const ctx = glyph.getContext('2d');
  const preset = window.STGFontLibrary.preset(scene.font);
  const nominal = height * .9;
  ctx.font = `${preset.style} ${preset.weight} ${nominal}px ${window.STGFontLibrary.family(scene.font)}`;
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(scene.text || ' ');
  const ascent = Math.max(1, metrics.actualBoundingBoxAscent);
  const descent = Math.max(0, metrics.actualBoundingBoxDescent);
  const bodyHeight = (ascent + descent) * scene.fontHeight;
  const scale = Math.min(height * scene.fontSize / bodyHeight, width * .64 / Math.max(1, metrics.width));
  const letterWidth = metrics.width * scale;
  const left = scene.alignment === 'left' ? width * .16 : scene.alignment === 'right' ? width * .84 - letterWidth : (width - letterWidth) / 2;
  const top = (height - bodyHeight * scale) / 2;
  const xOffset = width * (scene.positionX || 0) / 100;
  bounds = { left: left + xOffset, right: left + letterWidth + xOffset };
  ctx.save();
  ctx.translate(left + xOffset, top + ascent * scale * scene.fontHeight + height * (scene.positionY || 0) / 100);
  ctx.scale(scale, scale * scene.fontHeight);
  ctx.fillStyle = scene.textColor;
  ctx.strokeStyle = scene.textColor;
  ctx.lineJoin = 'round';
  ctx.lineWidth = nominal * scene.extraBold * 2;
  ctx.fillText(scene.text, 0, 0);
  if (scene.extraBold) ctx.strokeText(scene.text, 0, 0);
  ctx.restore();
  const bodyContext = body.getContext('2d');
  bodyContext.drawImage(glyph, 0, 0);
  bodyContext.globalCompositeOperation = 'destination-in';
  const gradient = bodyContext.createLinearGradient(bounds.left, 0, bounds.right, 0);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(.3, 'black');
  gradient.addColorStop(.68, 'black');
  gradient.addColorStop(1, 'transparent');
  bodyContext.fillStyle = gradient;
  bodyContext.fillRect(bounds.left, 0, bounds.right - bounds.left, height);
  bodyContext.globalCompositeOperation = 'source-over';
  if (world) makeGeometry(scene, width, height, activeCount || Math.round(scene.slices));
}

function ensureWebGL(width, height, scene) {
  if (!renderer) {
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setClearColor(0xffffff, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      world = new THREE.Scene();
      world.add(new THREE.HemisphereLight(0xffffff, 0x8dafff, 1.9));
      const key = new THREE.DirectionalLight(0xe4f4ff, 2);
      key.position.set(400, 400, 900); world.add(key);
      const warm = new THREE.DirectionalLight(0xffb35e, .65);
      warm.position.set(-500, -150, 350); world.add(warm);
      camera = new THREE.OrthographicCamera();
      makeGeometry(scene, width, height, 3);
    } catch (error) {
      console.warn('Letter Slices WebGL unavailable:', error);
      renderer = null;
      return false;
    }
  }
  if (width !== renderWidth || height !== renderHeight) {
    renderWidth = width; renderHeight = height;
    renderer.setSize(width, height, false);
    camera.left = -width / 2; camera.right = width / 2;
    camera.top = height / 2; camera.bottom = -height / 2;
    camera.near = 1; camera.far = width * 8;
    camera.updateProjectionMatrix();
  }
  return true;
}

function progress(scene, time) {
  const opening = scene.intro;
  const spreadEnd = opening + scene.sweep;
  const holdEnd = spreadEnd + scene.hold;
  const gatherEnd = holdEnd + scene.return;
  if (time <= opening) return 0;
  if (time < spreadEnd) return ease((time - opening) / scene.sweep);
  if (time < holdEnd) return 1;
  if (time < gatherEnd) return 1 - ease((time - holdEnd) / scene.return);
  return 0;
}

function draw(ctx, state, time, width, height) {
  const scene = state.scene;
  if (!scene.text) return;
  makeGlyph(scene, width, height);
  const amount = progress(scene, time);
  if (amount < .002 || !ensureWebGL(width, height, scene) || !basePositions.length) {
    ctx.drawImage(glyph, 0, 0);
    return;
  }
  const count = Math.max(3, Math.round(scene.slices * (amount < .25 ? .12 : amount < .5 ? .28 : amount < .75 ? .55 : 1)));
  if (count !== activeCount) makeGeometry(scene, width, height, count);
  const output = geometry.attributes.position;
  const factor = 1 + scene.spread * amount;
  const center = (bounds.left + bounds.right - width) / 2;
  for (let i = 0; i < basePositions.length; i += 3) {
    const strip = stripCenters[i / 3];
    output.array[i] = center + ((strip - center) + (basePositions[i] - strip) * (1 - .48 * amount)) * factor;
    output.array[i + 1] = basePositions[i + 1] + edgeOffsets[i / 3] * amount;
    output.array[i + 2] = basePositions[i + 2] * amount;
  }
  output.needsUpdate = true;
  camera.position.set(width * (scene.direction === 'reverse' ? -.83 : .83), height * .12, width * 2.65);
  camera.lookAt(0, 0, 0);
  renderer.render(world, camera);
  ctx.globalAlpha = 1 - ease(amount / .5);
  ctx.drawImage(glyph, 0, 0);
  ctx.globalAlpha = ease(amount / .2);
  ctx.drawImage(renderer.domElement, 0, 0, width, height);
  ctx.globalAlpha = amount;
  ctx.drawImage(body, 0, 0);
  ctx.globalAlpha = 1;
}

window.LetterSlicesRenderer = {
  draw,
  invalidate: () => { cacheKey = ''; },
  duration: scene => scene.intro + scene.sweep + scene.hold + scene.return + scene.settle,
  backend: 'three-webgl',
  get webglActive() { return Boolean(renderer); }
};
