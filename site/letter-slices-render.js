import * as THREE from './live-portal/vendor/three.module.js';

const clamp = value => Math.min(1, Math.max(0, value));
const ease = value => { const x = clamp(value); return x * x * (3 - 2 * x); };
const glyph = document.createElement('canvas');
let cacheKey = '';
let renderer;
let material;
let texture;
let world;
let camera;
let renderWidth = 0;
let renderHeight = 0;

function glyphTexture() {
  const value = new THREE.CanvasTexture(glyph);
  value.minFilter = THREE.LinearFilter;
  value.magFilter = THREE.LinearFilter;
  value.generateMipmaps = false;
  return value;
}

// A cylindrical glass array bends the view of a letter behind it. The letter
// remains one continuous image; only the refracted sampling changes over time.
const fragmentShader = `
precision highp float;
uniform sampler2D uGlyph;
uniform vec3 uInk;
uniform float uAmount;
uniform float uCount;
uniform float uSpread;
uniform float uDispersion;
uniform float uDirection;
varying vec2 vUv;

float coverage(vec2 p) {
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) return 0.0;
  return texture2D(uGlyph, p).a;
}

void main() {
  float a = uAmount;
  float frequency = mix(2.4, uCount, pow(a, 1.8));
  float cell = fract((vUv.x - .5) * frequency + .5);
  // The smoothly varying normal of each convex rib refracts its two sides in
  // opposite directions. Snell's law gives the lateral travel through glass.
  float normalX = sin((cell - .5) * 3.14159265) * .91;
  vec3 normal = normalize(vec3(normalX, 0.0, sqrt(max(.01, 1.0 - normalX * normalX))));
  vec3 ray = refract(vec3(0.0, 0.0, -1.0), normal, 1.0 / 1.48);
  float travel = ray.x / max(.15, -ray.z);
  float depth = uSpread * .58 * a;
  float bend = travel * depth * uDirection;
  vec2 sampleUv = vUv + vec2(bend, 0.0);
  float dispersion = uDispersion * a / 1080.0;
  float spectral = normalX * dispersion * (1.0 + 3.0 * abs(normalX));
  float red = coverage(sampleUv + vec2(spectral, 0.0));
  float green = coverage(sampleUv);
  float blue = coverage(sampleUv - vec2(spectral, 0.0));
  vec3 transmission = 1.0 - vec3(red, green, blue) * (1.0 - uInk);
  float alpha = max(red, max(green, blue));
  if (alpha < .002) discard;
  // White studio reflections stay narrow; the broad front stays charcoal.
  float reflection = pow(abs(normalX), 18.0) * .035 * a;
  transmission += reflection * vec3(.55, .76, 1.0) * alpha;
  vec3 color = (transmission - (1.0 - alpha)) / max(alpha, .001);
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha);
}`;

function buildGlyph(scene, width, height) {
  const key = [width, height, scene.text, scene.font, scene.fontSize, scene.fontHeight,
    scene.extraBold, scene.positionX, scene.positionY, scene.alignment, scene.textColor].join('|');
  if (key === cacheKey) return;
  cacheKey = key;
  const resized = glyph.width !== width || glyph.height !== height;
  glyph.width = width; glyph.height = height;
  const ctx = glyph.getContext('2d');
  const preset = window.STGFontLibrary.preset(scene.font);
  const nominal = height * .9;
  const weight = scene.font === 'stg:inter' ? 700 : preset.weight;
  const family = scene.font === 'stg:inter' ? '"CellMotion Letter Inter"' : window.STGFontLibrary.family(scene.font);
  ctx.font = `${preset.style} ${weight} ${nominal}px ${family}`;
  ctx.textBaseline = 'alphabetic';
  const metrics = ctx.measureText(scene.text || ' ');
  const ascent = Math.max(1, metrics.actualBoundingBoxAscent);
  const descent = Math.max(0, metrics.actualBoundingBoxDescent);
  const bodyHeight = (ascent + descent) * scene.fontHeight;
  const scale = Math.min(height * scene.fontSize / bodyHeight, width * .64 / Math.max(1, metrics.width));
  const letterWidth = metrics.width * scale;
  const left = scene.alignment === 'left' ? width * .16 : scene.alignment === 'right' ? width * .84 - letterWidth : (width - letterWidth) / 2;
  const top = (height - bodyHeight * scale) / 2;
  ctx.save();
  ctx.translate(left + width * (scene.positionX || 0) / 100,
    top + ascent * scale * scene.fontHeight + height * (scene.positionY || 0) / 100);
  ctx.scale(scale, scale * scene.fontHeight);
  ctx.fillStyle = scene.textColor;
  ctx.strokeStyle = scene.textColor;
  ctx.lineJoin = 'round';
  ctx.lineWidth = nominal * scene.extraBold * 2;
  ctx.fillText(scene.text, 0, 0);
  if (scene.extraBold) ctx.strokeText(scene.text, 0, 0);
  ctx.restore();
  if (texture && resized) {
    texture.dispose();
    texture = glyphTexture();
    material.uniforms.uGlyph.value = texture;
  } else if (texture) texture.needsUpdate = true;
}

function ensureWebGL(width, height) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setClearColor(0xffffff, 0);
    texture = glyphTexture();
    material = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uGlyph: { value: texture },
        uInk: { value: new THREE.Vector3() }, uAmount: { value: 0 }, uCount: { value: 26 },
        uSpread: { value: .22 }, uDispersion: { value: 2 }, uDirection: { value: 1 }
      },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader
    });
    world = new THREE.Scene();
    world.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    camera = new THREE.Camera();
  }
  if (width !== renderWidth || height !== renderHeight) {
    renderWidth = width; renderHeight = height;
    renderer.setSize(width, height, false);
  }
}

function progress(scene, time) {
  const spreadEnd = scene.intro + scene.sweep;
  const holdEnd = spreadEnd + scene.hold;
  const gatherEnd = holdEnd + scene.return;
  if (time <= scene.intro) return 0;
  if (time < spreadEnd) return ease((time - scene.intro) / scene.sweep);
  if (time < holdEnd) return 1;
  if (time < gatherEnd) return 1 - ease((time - holdEnd) / scene.return);
  return 0;
}

function draw(ctx, state, time, width, height) {
  const scene = state.scene;
  if (!scene.text) return;
  buildGlyph(scene, width, height);
  const amount = progress(scene, time);
  if (amount < .0001) { ctx.drawImage(glyph, 0, 0); return; }
  ensureWebGL(width, height);
  const uniforms = material.uniforms;
  const rgb = parseInt(scene.textColor.slice(1), 16);
  uniforms.uInk.value.set((rgb >> 16 & 255) / 255, (rgb >> 8 & 255) / 255, (rgb & 255) / 255);
  uniforms.uAmount.value = amount;
  uniforms.uCount.value = scene.slices;
  uniforms.uSpread.value = scene.spread;
  uniforms.uDispersion.value = scene.fringe;
  uniforms.uDirection.value = scene.direction === 'reverse' ? -1 : 1;
  renderer.render(world, camera);
  ctx.drawImage(renderer.domElement, 0, 0, width, height);
}

window.LetterSlicesRenderer = {
  draw,
  invalidate: () => { cacheKey = ''; },
  duration: scene => scene.intro + scene.sweep + scene.hold + scene.return + scene.settle,
  backend: 'three-webgl',
  get webglActive() { return Boolean(renderer); }
};
