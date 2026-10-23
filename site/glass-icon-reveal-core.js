/* Glass Icon Reveal rendering core, adapted from Zanwei Guo's MIT-licensed project.
   https://github.com/zanwei/glass-icon-reveal
   See glass-icon-reveal.LICENSE. */
(function () {
'use strict';
const PRESETS = {
  note: {
    // offset: where the logo's centre sits (plate units, y up); lensShift: how far it sits from there
    // while the young droplet's ball lens is on, so the droplet first shows the corner of stem and beam.
    // Both solved from the reference capture's stem position and the corner's height.
    label: 'Note', color: false, offset: [-0.032, 0.011], lensShift: [0, -0.3],
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18"><path fill="#fff" d="M13.5563 0.71523C13.5483 0.25323 13.2893 -0.0647698 12.8373 0.0112302C12.8373 0.0112302 5.5073 1.44723 4.6533 1.62523C4.0993 1.74123 3.9143 2.08823 3.9263 2.67023C3.9243 2.71923 3.9263 12.1692 3.9263 12.1692C3.9263 13.1212 3.1193 12.8952 2.0473 13.1652C0.226298 13.6232 0.174299 14.4282 0.0552985 14.6822C-0.130701 15.6972 0.106298 16.8202 1.4823 17.1502C2.0473 17.2852 2.4003 17.2232 2.9613 17.1152C3.8683 16.9412 4.3273 16.4962 4.7253 15.6642C4.9123 15.2732 4.9303 14.6192 4.9303 14.1902C4.9293 11.4882 4.9293 8.91923 4.9293 6.21723C4.9293 5.76623 5.0543 5.62423 5.4983 5.53523C7.6693 5.10523 9.8523 4.65123 12.0223 4.22423C12.5103 4.12723 12.5633 4.38923 12.5633 4.88323C12.5643 6.90623 12.5553 10.2152 12.5553 10.5342C12.5553 11.6742 10.4203 10.9722 9.0523 12.2362C8.5723 12.7062 8.4883 13.5902 8.6383 14.0732C8.8693 14.8092 9.3463 15.2642 10.0743 15.4212C10.5393 15.5222 12.0703 15.6902 12.9743 14.5892C13.5853 13.8442 13.5413 13.3922 13.5413 12.7122L13.5563 0.71523Z"/></svg>'
  },
  spark: {
    label: 'Spark', color: false,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M50 2C53 32 68 47 98 50C68 53 53 68 50 98C47 68 32 53 2 50C32 47 47 32 50 2Z"/></svg>'
  },
  pinwheel: {
    label: 'Pinwheel', color: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<path fill="#ff6a3d" d="M47 47V9A38 38 0 0 0 9 47Z"/>' +
      '<path fill="#ffc83d" d="M53 47H91A38 38 0 0 0 53 9Z"/>' +
      '<path fill="#36d38c" d="M53 53V91A38 38 0 0 0 91 53Z"/>' +
      '<path fill="#3d8bff" d="M47 53H9A38 38 0 0 0 47 91Z"/></svg>'
  },
};

const TEX = 1024;          // logo texture size
const BOX = 0.75;          // fraction of the texture the logo box fills (the rest is room for the SDF)

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This image could not be read.'));
    img.src = src;
  });
}

function svgToUrl(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') throw new Error('This SVG could not be read.');
  let w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { w = vb[2]; h = vb[3]; }
  if (!(w > 0 && h > 0)) { w = h = 100; }
  const s = TEX / Math.max(w, h);
  svg.setAttribute('width', String(Math.round(w * s)));
  svg.setAttribute('height', String(Math.round(h * s)));
  const out = new XMLSerializer().serializeToString(svg).replace(/currentColor/g, '#ffffff');
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out);
}

// Draw a source into a TEX×TEX canvas, cropped to its visible pixels and fitted into the logo box.
function fitToTexture(source, sw, sh) {
  const tmp = document.createElement('canvas');
  tmp.width = TEX; tmp.height = TEX;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  const s0 = Math.min(TEX / sw, TEX / sh);
  const dx0 = (TEX - sw * s0) / 2, dy0 = (TEX - sh * s0) / 2;
  tc.drawImage(source, dx0, dy0, sw * s0, sh * s0);
  const d = tc.getImageData(0, 0, TEX, TEX).data;

  // Opaque images (JPG, flat PNG): key out the corner colour so the mark becomes the shape.
  let opaque = true;
  for (let i = 3; i < d.length; i += 4 * 97) { if (d[i] < 250) { opaque = false; break; } }
  const key = [d[0], d[1], d[2]];
  const keyAlpha = (r, g, b) => Math.min(1, Math.max(0, (Math.hypot(r - key[0], g - key[1], b - key[2]) / 441 - 0.08) / 0.2));

  let x0 = TEX, y0 = TEX, x1 = -1, y1 = -1;
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const i = (y * TEX + x) * 4;
      const a = opaque ? keyAlpha(d[i], d[i + 1], d[i + 2]) * 255 : d[i + 3];
      if (a > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('The image is empty. Use a logo with visible pixels.');
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const s = TEX * BOX / Math.max(bw, bh);

  const out = document.createElement('canvas');
  out.width = TEX; out.height = TEX;
  const oc = out.getContext('2d', { willReadFrequently: true });
  oc.imageSmoothingQuality = 'high';
  const ox = TEX / 2 - (x0 + bw / 2 - dx0) * s;
  const oy = TEX / 2 - (y0 + bh / 2 - dy0) * s;
  oc.drawImage(source, ox, oy, sw * s0 * s, sh * s0 * s);
  if (opaque) {
    const im = oc.getImageData(0, 0, TEX, TEX), e = im.data;
    for (let i = 0; i < e.length; i += 4) e[i + 3] = Math.round(e[i + 3] * keyAlpha(e[i], e[i + 1], e[i + 2]));
    oc.putImageData(im, 0, 0);
  }
  return out;
}

// Signed distance field from alpha (TinySDF method): + outside, − inside, in texture units.
function buildSdf(canvas) {
  const n = TEX * TEX;
  const alpha = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, TEX, TEX).data;
  const INF = 1e20;
  const outer = new Float64Array(n), inner = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = alpha[i * 4 + 3] / 255;
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else {
      const dd = 0.5 - a;
      outer[i] = dd > 0 ? dd * dd : 0;
      inner[i] = dd < 0 ? dd * dd : 0;
    }
  }
  const f = new Float64Array(TEX), z = new Float64Array(TEX + 1), v = new Uint16Array(TEX);
  edt(outer, f, v, z, INF);
  edt(inner, f, v, z, INF);
  const sdf = new Float32Array(n);
  for (let i = 0; i < n; i++) sdf[i] = (Math.sqrt(outer[i]) - Math.sqrt(inner[i])) / TEX;
  return sdf;
}
function edt(grid, f, v, z, INF) {
  for (let x = 0; x < TEX; x++) edt1d(grid, x, TEX, f, v, z, INF);
  for (let y = 0; y < TEX; y++) edt1d(grid, y * TEX, 1, f, v, z, INF);
}
function edt1d(grid, offset, stride, f, v, z, INF) {
  v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
  for (let q = 1, k = 0, s = 0; q < TEX; q++) {
    f[q] = grid[offset + q * stride];
    const q2 = q * q;
    do {
      const r = v[k];
      s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < TEX; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}

async function makeLogo(kind, opts) {
  let canvas;
  if (kind === 'text') {
    const text = (opts.text || '').trim() || 'Aa';
    const c = document.createElement('canvas');
    c.width = TEX * 2; c.height = TEX;
    const cx = c.getContext('2d');
    const face = opts.font || 'BlinkMacSystemFont, -apple-system, "SF Pro Display", "Helvetica Neue", system-ui, sans-serif';
    const fontStyle = opts.style || 'normal', fontWeight = opts.weight || 700;
    let size = 600;
    cx.font = `${fontStyle} ${fontWeight} ${size}px ${face}`;
    const w = cx.measureText(text).width;
    if (w > c.width * 0.9) { size *= c.width * 0.9 / w; cx.font = `${fontStyle} ${fontWeight} ${size}px ${face}`; }
    cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, c.width / 2, c.height / 2);
    canvas = fitToTexture(c, c.width, c.height);
  } else if (kind === 'upload') {
    const img = await loadImage(opts.url);
    canvas = fitToTexture(img, img.naturalWidth || TEX, img.naturalHeight || TEX);
  } else {
    const img = await loadImage(svgToUrl(PRESETS[kind].svg));
    canvas = fitToTexture(img, img.naturalWidth || TEX, img.naturalHeight || TEX);
  }
  return { canvas, sdf: buildSdf(canvas) };
}

/* ------------------------------------------------------------------ *
 * Shader
 * ------------------------------------------------------------------ */
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2 uCenter;      // device px, GL coords
uniform float uTile;       // tile size, device px
uniform sampler2D uSdf;    // signed distance, texture units, + outside
uniform sampler2D uCol;    // premultiplied colour, mipmapped
uniform float uTexSize;
uniform float uBoxFrac;

uniform float uPlateScale; // plate size relative to the tile
uniform float uShapeN;     // superellipse exponent: 2 = circle
uniform float uCornerN;    // final exponent, used by the ghost
uniform float uOptics;     // 1 = full refraction, 0 = flat
uniform float uPlateAlpha; // 1 = glass shown, 0 = bare logo
uniform float uLogoHalf;   // logo half size in plate units (zoom included)
uniform vec2 uLogoOff;     // where the logo's centre sits, plate units (it scales about this point)
uniform float uBold;       // stroke swell, in logo half-size units
uniform float uBlur;       // edge softness, plate units
uniform float uFrost;      // milky lift inside a young bubble
uniform float uDome;       // lens bulge height
uniform float uDrop;       // 1 while the glass is still a round droplet, 0 once it has spread into the tile
uniform float uPinch;      // the tile face's stretch toward its corners (pincushion), at the rim
uniform float uTilt;       // how much more the rising diagonal's corners stretch than the other two (0–1)
uniform float uRim;
uniform float uHalo;
uniform float uShadow;
uniform float uGhost;
uniform float uRipR;       // ripple radius, plate sizes
uniform float uRipA;
uniform float uBare;       // 1 once the logo may show without glass (the ending)
uniform float uReach;      // the rim band's full width, plate units (the pull depth is sized by it)
uniform float uCornerPull; // how much harder the corners pull than the sides
uniform float uStreak;     // how far a corner smears content along the rim, in band widths
uniform float uWiden;      // how much wider the folding band grows toward the corners
uniform float uSlab;       // how far the slab stands above the logo below its rounded edge, plate units
uniform float uEtaSpread;  // index spread across the spectrum (red highest)
uniform float uFocus;      // how far in along the diagonal a corner focuses, plate units
uniform float uFocusK;     // how quickly the view slides back from the focus across the band
uniform float uFocusSplit; // how much further in red meets than violet, plate units
uniform float uRimLine;    // how far across the band the sight line takes to turn in to the focus
uniform float uCornerOn;   // 0 while the glass is a round droplet, 1 once it has spread into the tile
uniform float uDissolve;   // 0 → 1 as the glass lets go of the logo
uniform float uGlow;       // colour bleed in the rim, plate units on screen
uniform float uFaceDisp;   // lateral colour across the face: red/violet scale apart by ±this
uniform float uVivid;      // chroma lift of the dispersed light

uniform float uDepth;
uniform float uDisp;
uniform float uBevelW;
uniform float uSpec;
uniform float uIconPlate;
uniform float uUseColor;
uniform float uLightScene; // 1 = light backdrop, 0 = dark

uniform vec3 uBg;
uniform vec3 uPlateCol;
uniform vec3 uLogoCol;

float px; // one device pixel in plate units

// aa: footprint of one screen pixel at q, plate units (one pixel where nothing bends the view).
vec4 logoAt(vec2 q, float blur, float aa) {
  float L = uLogoHalf;
  float k = 0.5 * uBoxFrac / L;                    // plate units -> texture units
  vec2 uv = vec2(0.5 + (q.x - uLogoOff.x) * k, 0.5 - (q.y - uLogoOff.y) * k);
  float d = texture(uSdf, uv).r / k;               // plate units
  float w = 0.75 * aa + blur;
  float a = 1.0 - smoothstep(-w, w, d - uBold * L);
  vec3 c = uLogoCol;
  if (uUseColor > 0.5) {
    float lod = log2(max(1.0, w * k * uTexSize));
    vec4 c0 = textureLod(uCol, uv, lod);
    vec4 c1 = textureLod(uCol, uv, lod + 3.0);
    vec4 c2 = textureLod(uCol, uv, 7.0);
    c = c2.rgb / max(c2.a, 1e-4);
    c = mix(c, c1.rgb / max(c1.a, 1e-4), smoothstep(0.0, 0.06, c1.a));
    c = mix(c, c0.rgb / max(c0.a, 1e-4), smoothstep(0.02, 0.3, c0.a));
  }
  return vec4(c, a);
}

// Superellipse field. Returns signed distance (plate units, − inside); g = 1 on the rim.
float shape(vec2 p, float scale, float n, out vec2 nOut, out float g, out vec2 dg) {
  vec2 pp = p / scale;
  vec2 a = max(abs(pp), vec2(1e-6));
  g = pow(pow(a.x, n) + pow(a.y, n), 1.0 / n);
  dg = sign(pp) * pow(a, vec2(n - 1.0)) * pow(max(g, 1e-6), 1.0 - n);
  float dgl = max(length(dg), 1e-6);
  nOut = dg / dgl;
  return (g - 1.0) / dgl * scale;
}

// Curvature radius (plate units) of the shape's contour through p.
float contourRadius(vec2 p, float scale, float n) {
  vec2 a = max(abs(p / scale), vec2(1e-4));
  vec2 a1 = pow(a, vec2(n - 1.0));
  vec2 a2 = pow(a, vec2(n - 2.0));
  float k = (n - 1.0) * (a2.x * a1.y * a1.y + a2.y * a1.x * a1.x) / pow(max(dot(a1, a1), 1e-30), 1.5);
  return scale / max(k, 1e-3);
}

// Where the glass at x = s / bwF across its rounded edge looks. The tile is a slab standing uSlab above
// the logo, its edge a quarter-round of radius bwF. A straight-down sight line meets the edge tilted by
// θ (sin θ = 1 − x), bends inward by θ − θr (Snell, index eta) and reaches the logo plane displaced by
// z·tan(θ − θr), z the height of the surface. So the outer rim looks deepest and the view eases back to
// the face across the edge: whatever lies within reach is drawn out to the rim, mirrored and compressed
// near it, and meets itself at the inner edge of the bevel, where a stroke near the rim melts into it.
// Rays from a curved stretch of rim converge on its centre of curvature R; they reach a little past it
// and no further. The young droplet's dome pulls every sample toward the middle.
vec2 refractSample(float x, float bwF, float eta, float R, vec2 dirOut, vec2 p, float dome, float offMul) {
  float u = clamp(1.0 - x, 0.0, 0.995);
  float th = asin(u), thr = asin(u / eta);
  float z = uSlab + bwF * sqrt(1.0 - u * u);
  float off = offMul * z * tan(th - thr);
  off = off / (1.0 + off / (6.0 * R));
  return p - (dirOut * off + p * dome) * uOptics;
}

float gauss(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
float band(float x, float a, float b, float w) { return smoothstep(a - w, a, x) * (1.0 - smoothstep(b, b + w, x)); }

// Visible spectrum, red (0) to violet (1), weighted so a dark edge seen through the glass fringes
// gold → orange → red on one side and cyan → sky → blue → ultramarine on the other (solved over 12
// samples; red reaches into the yellows so warm fringes never read lime).
float bump(float x, float c, float w) { float d = (x - c) / w; return exp(-0.5 * d * d); }
vec3 spectrum(float x) {
  return vec3(bump(x, 0.34, 0.2) + 0.08 * bump(x, 0.93, 0.05), bump(x, 0.58, 0.1), bump(x, 0.8, 0.11));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  px = 2.0 / uTile;
  vec2 p = (gl_FragCoord.xy - uCenter) * px;       // plate units, y up

  vec4 lg = logoAt(p, uBlur, px);
  vec3 plain = mix(uBg, lg.rgb, lg.a * uBare);

  vec2 nOut, dg; float g;
  float sd = shape(p, uPlateScale, uShapeN, nOut, g, dg);
  float s = -sd;
  float bw = max(uBevelW, 0.004) * uPlateScale;
  float x = clamp(s / bw, 0.0, 1.0);
  float R = contourRadius(p, uPlateScale, uShapeN);
  vec2 pq = p * p;
  float diag = 4.0 * pq.x * pq.y / max((pq.x + pq.y) * (pq.x + pq.y), 1e-6);   // 1 on the diagonals, 0 on the axes
  // The tile sits slightly tipped along its rising diagonal, so light crosses more glass at the lower-left
  // and upper-right corners: they stretch and pull harder than the other two (as in the reference).
  float tilt = mix(1.0 - uTilt, 1.0, smoothstep(-0.02, 0.02, p.x * p.y));
  float pinchPart = uPinch * min(g * g, 1.0) * diag * diag * tilt;
  float dome = uDome * (1.0 - min(g * g, 1.0)) + pinchPart;
  // Light through the rim bends mostly straight across it and a little toward the middle, so near a
  // corner the dark of the logo is drawn along both neighbouring edges.
  vec2 dirOut = normalize(mix(nOut, p / max(length(p), 1e-4), 0.2));
  // A rounded corner curves both ways, so it bends light harder than a straight side: the corners draw
  // content in from deep inside (the reference stretches the heads and the beam's end into them) while
  // the middles of the sides stay light. The extra pull fades out gradually along the two edges next to
  // a corner (it follows how diagonal the position is, not just the edge's direction), so what a corner
  // draws in wraps along them, about halfway to the middle of each side.
  float cornerness = max(smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y), smoothstep(0.15, 0.75, diag));
  float offMul = 1.0 + 0.4 * max(uCornerPull - 1.0, 0.0) * tilt * cornerness * uCornerOn;
  // Around a corner the curved edge focuses: every sight line through it, along the arc and along the
  // stretches of edge next to it, meets at one point a little way in along the diagonal. The rim sees
  // that point itself and the view slides back to the face across the band, so whatever lies there (the
  // head, the end of the beam) is spread all round the corner and down both edges.
  vec2 focus = sign(p) * (pow(0.5, 1.0 / uShapeN) - uFocus * 0.70710678) * uPlateScale;
  float focusW = tilt * cornerness * uOptics * uCornerOn;
  // The folding band itself also widens toward those corners, so what the rim draws in from the logo
  // shows as a broad smear hugging the corner rather than a hairline, while along the straight sides it
  // stays as narrow as the bevel. It keeps its width while the glass lets go, so smears fade in place.
  // (Only once the droplet has spread into the tile: a round droplet has no corners.)
  float bwF = max(uReach, 0.004) * (1.0 + uWiden * tilt * cornerness * uCornerOn);
  float xf = clamp(s / bwF, 0.0, 1.0);
  // Footprint of one pixel after refraction (centre wavelength). Measured here, in uniform control flow,
  // so the logo is filtered wherever the glass compresses it instead of breaking into shards.
  vec2 qc = refractSample(xf, bwF, 1.5, R, dirOut, p, dome, offMul);
  float foot = max(max(length(dFdx(qc)), length(dFdy(qc))), 0.25 * px);

  // Backdrop: anticipation ghost, ripple, soft lift shadow and glow.
  vec3 bg = uBg;
  vec3 lift = mix(uBg + vec3(0.06), mix(uBg, vec3(1.0), 0.55), uLightScene);
  if (uGhost > 0.001) {
    vec2 gn, gdg; float gg;
    float gsd = shape(p, 1.0, uCornerN, gn, gg, gdg);
    bg = mix(bg, lift, uGhost * 0.12 * (1.0 - smoothstep(-0.16, 0.14, gsd)));
    bg *= 1.0 - uGhost * 0.03 * uLightScene * exp(-max(gsd, 0.0) / 0.12) * step(0.0, gsd);
  }
  float outside = max(sd, 0.0);
  if (uRipA > 0.001) {
    float d0 = (uRipR - 1.0) * uPlateScale;
    float rx = (sd - d0) / 0.022;
    float ring = exp(-rx * rx);
    bg += uRipA * ring * (0.04 * (0.55 + 0.45 * dot(nOut, normalize(vec2(-0.5, 0.8))))) * mix(0.5, 1.0, uLightScene);
    bg -= uRipA * 0.016 * uLightScene * exp(-(rx - 1.6) * (rx - 1.6));
  }
  // The droplet's soft shadow: about 3 % at its edge and still half that a droplet radius away.
  float shadowFall = max(sd, 0.0) / (0.9 * uPlateScale);
  bg *= 1.0 - uShadow * 0.03 * exp(-shadowFall * shadowFall) * step(0.0, sd);
  vec3 haloCol = mix(vec3(0.62, 0.69, 0.80), vec3(1.0), uLightScene);
  bg = mix(bg, haloCol, clamp(uHalo * (0.30 * exp(-outside / (0.025 * uPlateScale)) + 0.07 * exp(-outside / (0.12 * uPlateScale))), 0.0, 1.0) * step(0.0, sd));

  vec3 col = bg;
  float soft = px + uBlur * 0.8 + 0.06 * uDissolve * uPlateScale;
  if (sd < soft) {
    // Surface for lighting: a superellipse quarter (k = 2.6), flat towards the face and steep at the rim.
    float y1 = 1.0 - x;
    const float K = 2.6;
    float base1 = max(1.0 - pow(y1, K), 1e-4);
    float db = min(pow(y1, K - 1.0) * pow(base1, 1.0 / K - 1.0), 25.0);   // slope of the rim
    // Lens bulge across the whole face (the young bubble); shades the surface.
    vec2 gDome = -uDome * 2.0 * g * dg * step(g, 1.0);
    vec2 grad = -db * nOut + gDome;                // height gradient

    vec3 back = mix(uBg, uPlateCol, uIconPlate);
    // Light bent this far also defocuses: blur grows with the refraction distance. On top of that, in
    // the rim band only, a soft glow of fixed size on screen, so colour bleeds smoothly where the fold
    // compresses the view (foot / px is how much it compresses here). It is capped: right at the edge
    // the compression runs past 20×, and an uncapped glow would reach strokes the rim does not see.
    float rblur = uBlur + 0.05 * length(qc - p) + min(uGlow * uOptics * (1.0 - xf) * foot / px, 0.04);

    // Colour. Each wavelength refracts by its own index, so the displacement, and with it the colour
    // split, grows with how strongly the edge bends the view and vanishes on the flat face: the logo
    // stays crisp while everything the edge draws in fans into colour. Red is made the most strongly bent,
    // which puts the warm line where a smear meets the rim and the broad cyan glow on its inner side, the
    // order in Apple's capture.
    // Around a corner, light also runs along the curved edge, so what the corner draws in is smeared
    // along the rim and wraps the corner. The samples spread along the edge in golden-ratio order, so
    // every colour covers the whole smear.
    float cornerW = smoothstep(0.1, 0.9, 4.0 * nOut.x * nOut.x * nOut.y * nOut.y);
    float streak = 0.35 * uStreak * bw * mix(0.15, 1.0, cornerW) * pow(1.0 - xf, 1.5) * uOptics;
    vec2 tangent = vec2(-nOut.y, nOut.x);
    vec3 acc = vec3(0.0), wsum = vec3(0.0);
    for (int i = 0; i < 20; i++) {
      float lam = (float(i) + 0.5) / 20.0;
      float c = uDisp * (1.0 - 2.0 * lam);   // + red … − violet
      vec2 along = tangent * (streak * 2.0 * (fract(float(i) * 0.618034 + 0.31) - 0.5));
      float cf = uDisp * (1.0 - 2.0 * lam) * (lam > 0.5 ? 1.0 : 0.5);
      vec2 sp = refractSample(xf, bwF, 1.5 + uEtaSpread * c, R, dirOut, p + along,
                              dome + pinchPart * 0.3 * c, offMul);
      // The corner's focus splits by colour too: red meets a little further in, so it stays on the
      // stroke a little longer across the band and the smear's inner side glows cyan. Right at the rim
      // the sight line grazes and first sees the edge itself; blue turns in to the focus sooner than red,
      // so where a smear meets the rim it ends in a thin warm line.
      vec2 focusL = focus - sign(p) * (0.70710678 * uFocusSplit * c * uPlateScale);
      float wFocus = pow(1.0 - xf, uFocusK) * smoothstep(0.0, uRimLine * (1.0 + 0.6 * c), xf);
      sp = mix(sp, mix(p + along, focusL, wFocus), focusW);
      // Across the face the glass is a gentle lens that spreads colour too: edges of the logo facing the
      // rim carry a thin warm line and edges facing the middle a cyan one, as measured on the reference's
      // stem. Red is also a little out of focus, which turns the cyan side into a soft glow.
      // (Only on the flat face: inside the edge band the refraction would magnify this small offset into
      // a broad bar of colour.)
      float faceOnly = smoothstep(0.7, 1.0, xf) * uOptics;
      sp *= 1.0 + uFaceDisp * cf * faceOnly;
      vec4 l = logoAt(sp, rblur + 0.12 * streak + uFaceDisp * 0.5 * max(c, 0.0) * faceOnly, foot);
      vec3 w = spectrum(lam);
      acc += mix(back, l.rgb, l.a) * w;
      wsum += w;
    }
    vec3 trans = acc / wsum;
    // Split light reads as colour, not grey: lift the chroma of whatever the dispersion separated
    // (neutral greys are untouched), so the cyan glow and the gold rim line are as vivid as in the
    // reference, where the cyan is brighter than the backdrop itself.
    float tl = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    trans = clamp(tl + (trans - tl) * (1.0 + uVivid * uOptics), 0.0, 1.0);
    // A young droplet is milky; it clears as it grows. The haze only ever lightens: on a light backdrop
    // it brightens what is light behind it and leaves dark content dark (in the reference the magnified
    // logo stays navy in the milk); on a dark backdrop it lifts the dark and leaves a white logo white.
    float hazeLum = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    float hazeGate = mix(1.0 - smoothstep(0.25, 0.75, hazeLum), smoothstep(0.25, 0.75, hazeLum), uLightScene);
    trans = mix(trans, lift, uFrost * 0.45 * hazeGate);

    // How much glass is left: shading and highlights thin out as the glass lets go, so it never
    // lingers as an empty outline.
    float glassAmt = pow(1.0 - uDissolve, 1.5);
    float lit = uSpec * glassAmt;
    vec3 rimCol = mix(vec3(0.80, 0.87, 0.97), vec3(1.0), uLightScene);

    // Light backdrop, fitted to luminance profiles measured across the reference capture's rim.
    // The thick rounded edge scatters the light of the surroundings, so it glows softly white over a
    // face that stays clear (diffuse light, the frosted look of thick glass):
    //  · the droplet, while round, glows in a broad band about a tenth of its radius wide, some 15
    //    levels above the backdrop, with a crisp bright line at the very edge;
    //  · the tile it spreads into keeps a quieter band, about 7 levels up, from just inside the edge
    //    to a tenth of the tile in;
    //  · at the very edge a hairline catches a soft overhead light: bright along the top and right,
    //    turning to a thin dark silhouette line down the left and along the bottom.
    // The glow lifts only what is light behind it, so dark content drawn into the rim keeps its colour.
    float sc = uPlateScale;
    float tLum = dot(trans, vec3(0.2126, 0.7152, 0.0722));
    float lightOnly = smoothstep(0.35, 0.85, tLum);
    float hw = smoothstep(-0.85, 0.5, dot(nOut, vec2(0.5, 0.866)));
    float tileBand = band(s, 0.016 * sc, 0.075 * sc, 0.022 * sc);
    float dropBand = (1.0 - smoothstep(0.06 * sc, 0.13 * sc, s)) * smoothstep(0.0, 0.004 * sc, s);
    float glow = mix(0.32 * tileBand, 0.75 * dropBand, uDrop) * lightOnly;
    float edgeLine = gauss(s, 0.005 * sc, 0.0045 * sc);
    vec3 lightGlass = mix(trans, vec3(1.0), glow * glassAmt);
    lightGlass += 0.075 * hw * edgeLine * lit;
    lightGlass *= 1.0 - 0.05 * (1.0 - hw) * edgeLine * glassAmt * (1.0 - uDrop);
    lightGlass = mix(lightGlass, vec3(1.0), 0.55 * uDrop * glassAmt * edgeLine);

    // Dark backdrop: a cool rim light that grows toward the steep edge, and a small key highlight.
    vec3 Nl = normalize(vec3(-grad, 1.0));
    float edge = 1.0 - Nl.z;
    vec2 ldir = normalize(vec2(-0.62, 0.78));
    float side = dot(nOut, ldir);
    float fres = pow(edge, 1.5);
    vec3 rim = rimCol * fres * (0.35 + 0.65 * max(side, -side * 0.8)) * uRim * 0.65;
    vec3 Hv = normalize(normalize(vec3(-0.45, 0.6, 0.66)) + vec3(0.0, 0.0, 1.0));
    float sp = pow(max(dot(Nl, Hv), 0.0), 140.0) * 0.8 * smoothstep(0.0, 0.25, y1);
    vec3 darkGlass = trans * (1.0 - 0.25 * fres) + (rim + vec3(sp)) * lit;

    // On the dark backdrop the droplet wears a soft bright rim; it thins away once the tile has formed.
    darkGlass = mix(darkGlass, rimCol, uDrop * 0.4 * uSpec * (1.0 - smoothstep(0.0, 0.1 * uPlateScale, s)));
    vec3 glass = mix(darkGlass, lightGlass, uLightScene);

    // The edge starts soft and sharpens as the bubble condenses, and softens again as the glass
    // dissolves: blur and scale arrive and leave together.
    float cov = clamp(0.5 - sd / soft, 0.0, 1.0);
    col = mix(bg, glass, cov);
  }

  vec3 outc = mix(plain, col, uPlateAlpha);
  outc += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(outc, 1.0);
}`;

/* ------------------------------------------------------------------ *
 * Renderer
 * ------------------------------------------------------------------ */
const FRAME_KEYS = ['uPlateScale', 'uShapeN', 'uCornerN', 'uOptics', 'uPlateAlpha', 'uLogoHalf', 'uBold', 'uBlur', 'uFrost', 'uDome', 'uDrop', 'uPinch', 'uTilt', 'uBare',
  'uReach', 'uCornerPull', 'uStreak', 'uWiden', 'uSlab', 'uEtaSpread', 'uFocus', 'uFocusK', 'uFocusSplit', 'uRimLine', 'uCornerOn', 'uDissolve', 'uGlow', 'uFaceDisp', 'uVivid',
  'uRim', 'uHalo', 'uShadow', 'uGhost', 'uRipR', 'uRipA', 'uDepth', 'uDisp', 'uBevelW', 'uSpec', 'uIconPlate',
  'uUseColor', 'uLightScene'];

function createRenderer(canvas, opts = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: !!opts.preserve });
  if (!gl) return null;
  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) { const info = gl.getActiveUniform(prog, i); U[info.name] = gl.getUniformLocation(prog, info.name); }

  const sdfTex = gl.createTexture();
  const colTex = gl.createTexture();
  gl.uniform1i(U.uSdf, 0);
  gl.uniform1i(U.uCol, 1);
  let hasLogo = false;

  function setLogo(logo) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sdfTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, TEX, TEX, 0, gl.RED, gl.FLOAT, logo.sdf);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, colTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, logo.canvas);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    hasLogo = true;
  }

  function render(fr, w, h, tilePx, cx = w / 2, cy = h / 2) {
    if (!hasLogo) return;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uCenter, cx, cy);
    gl.uniform1f(U.uTile, tilePx);
    gl.uniform1f(U.uTexSize, TEX);
    gl.uniform1f(U.uBoxFrac, BOX);
    for (const k of FRAME_KEYS) if (U[k]) gl.uniform1f(U[k], fr[k]);
    gl.uniform3fv(U.uBg, fr.uBg);
    gl.uniform3fv(U.uPlateCol, fr.uPlateCol);
    gl.uniform3fv(U.uLogoCol, fr.uLogoCol);
    gl.uniform2fv(U.uLogoOff, fr.uLogoOff);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function dispose() { const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); }
  return { gl, setLogo, render, dispose };
}

/* ------------------------------------------------------------------ *
 * Looks, parameters and the spring timeline
 * ------------------------------------------------------------------ */
const BASE = {
  logo: 'note', text: 'Aa', originalColors: false,
  tileSize: 256, logoScale: 0.7, finalScale: 0.69, iconPlate: false,
  opticalDepth: 1.1, dispersion: 1.7, glow: 1.25, bevelWidth: 0.14, corner: 4.8, cornerPull: 2.1, cornerWidth: 2.2, cornerFocus: 0.58, edgeSmear: 2.85, stretch: 0, tilt: 0.35, bulge: 1, specular: 1,
  halo: 0, shadow: 1, ripple: 1,
  bounce: 0, response: 0.34, startSize: 0.2, startZoom: 2.6, present: 1, drift: 0.12, swell: 0.5, focus: 1, hold: 0.8,
  background: '#e9e9eb', plateColor: '#ffffff', logoColor: '#0e1428',
};
const LOOKS = { light: { ...BASE } };

const TAIL = 0.95;    // from the glass letting go to everything at rest, seconds
const endOf = P => P.present + TAIL;

const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const smoother = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
const hexToRgb = h => { const v = parseInt(h.slice(1), 16); return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255]; };
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Step response of a spring released at t = 0, from 0 toward 1.
// Apple's parameters: damping ratio (1 = no overshoot) and response (period of the undamped spring, seconds).
function spring(t, response, damping) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI / response;
  if (damping >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + (damping * w / wd) * Math.sin(wd * t));
}

// When the droplet's growth spring reaches a given fraction of the way (cached per setting).
const reachCache = new Map();
function timeToReach(level, response, damping) {
  const key = level + '/' + response + '/' + damping;
  if (!reachCache.has(key)) {
    let lo = 0, hi = 3;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (spring(mid, response, damping) < level) lo = mid; else hi = mid; }
    reachCache.set(key, hi);
  }
  return reachCache.get(key);
}

// All motion lives here; the shader only sees the resulting numbers. Nothing ever stops and starts:
// every channel is one spring (or two overlapping ones, the second starting while the first is still
// moving), so speed changes smoothly from the first frame to the last. Curves are fitted to sizes
// measured frame by frame off the reference capture:
//   grow      the droplet emerges at 20 % of the tile and swells, still round, to about 90 %
//             (critically damped, 0.34 s; fits the measured sizes within 2 %)
//   morph     as it lands it spreads into the tile, the way a drop wets out on glass: the sides stay
//             where they are and the corners fill out from circle to squircle (it starts while the
//             droplet is still swelling, at 0.22 s as measured, so the two motions hand over without
//             a pause)
//   zoom      the logo eases out of the droplet's magnification in one glide (critically damped,
//             0.7 s): about 2.2× at 0.12 s, 1.4× at 0.3 s, 1× by 0.65 s, as measured; the framing on
//             the stem-and-beam corner glides back with it
//   settle    then keeps sinking a few percent (the measured slow shrink) until the exit takes over
//   release   the glass lets go: the rim narrows to arcs and dissolves; the exit shrink starts just
//             before it, from rest, so the logo's motion carries straight on into it
function frameAt(T, P, outro = 0) {
  const tx = P.present;
  const damping = 1 - P.bounce;
  const grow = spring(T + 0.01, P.response, damping);
  const tl = timeToReach(0.85, P.response, damping) - 0.01;   // the droplet lands: the ripple leaves
  const tm = timeToReach(0.92, P.response, damping) - 0.01;   // and spreads into the tile
  const morph = spring(T - tm, 0.3, 1);
  // The droplet's own look (milky body, bright rim, soft shadow) gives way to clear glass as it spreads.
  const drop = 1 - smooth(0.05, 1, morph);
  const appear = smooth(0, 0.06, T);
  const drift = P.drift * spring(T - 0.25, 1.5, 1);
  const zoomIn = spring(T, 0.7, 1);
  const settle = spring(T - 0.4, 1.6, 1);
  // The exit, as measured: the glass lets go: the rim narrows into corner arcs (1.1–1.25 s) and is gone
  // by 1.3 s, the logo shrinking.
  const exit = spring(T - tx, 0.8, 1);
  const release = spring(T - tx - 0.05, 0.5, 1);
  const dome = 0.15 * P.bulge * (1 - smooth(0.4, 0.95, grow));   // the young droplet's barrel squeeze
  const view = (1 + (P.startZoom - 1) * (1 - zoomIn)) * (1 - 0.045 * settle) * mix(1, P.finalScale, exit)
             * (1 - 0.06 * outro);
  const preset = PRESETS[P.logo] || {};
  const off = preset.offset || [0, 0], ls = preset.lensShift || [0, 0];
  // While the droplet still curves all over, its whole edge is curved glass; the band narrows to the
  // tile's bevel as it spreads.
  const bandW = mix(P.bevelWidth, Math.max(P.bevelWidth, 0.4), drop);
  const plateScale = mix(P.startSize, 1, grow) * (1 + drift) * (1 + 0.14 * release);
  const light = luminance(hexToRgb(P.background)) > 0.5 ? 1 : 0;
  return {
    uPlateScale: plateScale,
    uShapeN: mix(2, P.corner, morph),
    uCornerN: P.corner,
    uOptics: 1 - smooth(0.55, 1, release),
    uPlateAlpha: appear * (1 - smooth(0.45, 1, release)),
    uLogoHalf: P.logoScale * view,
    uLogoOff: [off[0] + ls[0] * (1 - zoomIn), off[1] + ls[1] * (1 - zoomIn)],
    uBold: P.swell * 0.03 * (1 - zoomIn),
    uBlur: P.focus * 0.05 * (1 - smooth(0.3, 0.95, grow)) + 0.03 * outro,
    uFrost: P.focus * (1 - smooth(0.5, 0.95, grow)),
    // Once it is a tile, the thick edge stretches the face toward its corners (more the further out,
    // and along the diagonals only), so the logo's extremities reach into them, as the reference's
    // heads and beam do, while the straight sides stay calm. It builds as the logo settles, so a
    // still-magnified logo is never bent.
    uPinch: 0.38 * P.stretch * smooth(0.1, 0.9, morph) * smooth(0.75, 0.97, zoomIn),
    uTilt: P.tilt,
    uDome: dome,
    uDrop: drop,
    uRim: 1 + 0.8 * drop,
    uHalo: P.halo * (0.5 + 0.5 * drop),
    // A soft shadow spreads around the droplet while it is round (5–7 levels on the light backdrop,
    // reaching well past its edge) and lifts as it spreads into the tile.
    uShadow: P.shadow * smooth(0.45, 0.8, grow) * (1 - smooth(0, 0.6, morph)),
    uGhost: smooth(0, 0.03, T) * (1 - smooth(0.04, 0.08, T)),
    uRipR: 1 + 0.9 * Math.max(0, T - tl),
    uRipA: P.ripple * smooth(tl, tl + 0.06, T) * Math.exp(-Math.max(0, T - tl) / 0.5),
    uBare: smooth(tx - 0.2, tx, T) * (1 - outro),
    // The pull depth stays sized by the full band, so when the band narrows on the way out it thins into arcs.
    uReach: bandW * plateScale,
    uCornerPull: P.cornerPull,
    uStreak: P.edgeSmear,
    uWiden: P.cornerWidth,
    uSlab: 0.3 * P.opticalDepth,
    uEtaSpread: 0.06,
    uFocus: P.cornerFocus,
    uFocusK: 1.0,
    uFocusSplit: 0.056 * P.glow,
    uRimLine: 0.09,
    uCornerOn: smooth(0.35, 1, morph),
    uGlow: 0.012 * P.glow,
    uFaceDisp: 0.012 * P.dispersion,
    uVivid: 0.85,
    uDissolve: release,
    uDepth: P.opticalDepth,
    uDisp: P.dispersion,
    uBevelW: bandW * (1 - release),
    uSpec: P.specular,
    uIconPlate: P.iconPlate ? 1 : 0,
    uUseColor: P.originalColors ? 1 : 0,
    uLightScene: light,
    uBg: hexToRgb(P.background),
    uPlateCol: hexToRgb(P.plateColor),
    uLogoCol: hexToRgb(P.logoColor),
  };
}


window.GlassRevealCore = { PRESETS, BASE, LOOKS, makeLogo, fitToTexture, buildSdf, createRenderer, frameAt, endOf };
})();
