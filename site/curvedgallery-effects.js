/* Parallax shader adapted from xianxie6/xian-horizontal-parallax-gallery and
 * opc8838-hub/xiaoguo-. MIT, Copyright (c) 2009-2025 Codrops; 2026 Xian.
 * License: ../docs/licenses/curvedgallery-parallax-MIT.txt.
 * The seven photo looks below are new procedural interpretations, not recovered PSD filters. */
(function (root) {
  'use strict';
  const effects = ['噪声扰动', 'RGB 色散', '波纹', '柔和扭曲', '胶片颗粒', '马赛克', '放大镜'];
  const effectNames = ['Noise distortion', 'RGB dispersion', 'Ripple', 'Soft distortion', 'Film grain', 'Mosaic', 'Magnifier'];
  const looks = ['none', 'fog', 'neon', 'trail', 'reed', 'frost', 'crystal', 'pink'];
  const lookNames = ['原图', '01 · 淡雾颗粒', '02 · 霓虹柔光', '03 · 流动拖影', '04 · 竖纹玻璃', '05 · 磨砂裂缝', '06 · 棱镜玻璃', '07 · 粉色柔雾'];
  const lookEnglish = ['Original', '01 · Mist & grain', '02 · Neon glow', '03 · Motion trails', '04 · Reeded glass', '05 · Frosted split', '06 · Prism glass', '07 · Pink haze'];
  const colors = ['#eeeeed', '#dedfd5', '#ff590b', '#ddd6c9', '#e5e0d2', '#597898', '#e0efff', '#dba4bc'];
  const defaults = { effect: -1, activation: 'always', strength: 1, uvScale: 1, parallaxIntensity: 0, shaderMultiplier: 1, hoverDistortionStrength: .06, grainStrength: .08, effectRadius: .45, hoverTransitionSpeed: .08, focusX: .5, focusY: .5, speed: 1, look: 'none', lookStrength: 1, lookScale: 1, lookColor: '#eeeeed', lookBaked: false };
  const ranges = { effect: [-1, 6], strength: [0, 1], uvScale: [.7, 1], parallaxIntensity: [0, 1], shaderMultiplier: [0, 2], hoverDistortionStrength: [0, .2], grainStrength: [0, .3], effectRadius: [.1, 1], hoverTransitionSpeed: [.02, .3], focusX: [0, 1], focusY: [0, 1], speed: [0, 3], lookStrength: [0, 1], lookScale: [.5, 3] };
  function normalize(value = {}) {
    const out = { ...defaults };
    for (const key of Object.keys(defaults)) {
      if (value[key] === undefined) continue;
      const v = value[key];
      if (typeof v !== typeof defaults[key] || (ranges[key] && (!Number.isFinite(v) || v < ranges[key][0] || v > ranges[key][1]))) throw new Error('无效图片效果 / Invalid image effect: ' + key);
      out[key] = v;
    }
    if (!Number.isInteger(out.effect) || !looks.includes(out.look) || !['always', 'hover'].includes(out.activation) || !/^#[0-9a-f]{6}$/i.test(out.lookColor)) throw new Error('无效图片效果 / Invalid image effect');
    return out;
  }
  const fragment = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uParallax;
  uniform float uUvScale;
  uniform float uShaderMultiplier;
  uniform float uTime;
  uniform float uHoverProgress;
  uniform vec2 uMousePosition;
  uniform float uHoverDistortionStrength;
  uniform float uGrainStrength;
  uniform float uEffectRadius;
  uniform float uEffectType;

  vec2 coverUv(vec2 uv, vec2 resolution, vec2 imageResolution) {
    vec2 ratio = vec2(
      min((resolution.x / resolution.y) / (imageResolution.x / imageResolution.y), 1.0),
      min((resolution.y / resolution.x) / (imageResolution.y / imageResolution.x), 1.0)
    );
    return vec2(
      uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
      uv.y * ratio.y + (1.0 - ratio.y) * 0.5
    );
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }


  uniform float uLook;
  uniform float uLookStrength;
  uniform float uLookScale;
  uniform vec3 uLookColor;
  vec3 softPhoto(vec2 uv, float radius) {
    vec3 c = texture2D(uTexture, uv).rgb * 0.28;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398163;
      c += texture2D(uTexture, uv + vec2(cos(a), sin(a)) * radius).rgb * 0.09;
    }
    return c;
  }
  vec3 material(vec3 original, vec2 uv) {
    float s = uLookStrength, scale = uLookScale;
    vec3 c = original;
    if (uLook < 0.5 || s <= 0.0) return c;
    if (uLook < 1.5) {
      c = mix(softPhoto(uv, 0.008 * scale), uLookColor, 0.32);
      c += (hash(vUv * 1500.0) - 0.5) * 0.045;
    } else if (uLook < 2.5) {
      vec3 b = softPhoto(uv, 0.009 * scale);
      float l = dot(b, vec3(0.299, 0.587, 0.114));
      c = mix(uLookColor, vec3(0.55, 0.80, 0.66), smoothstep(0.05, 0.19, l));
      float skin = smoothstep(0.08, 0.20, b.r - b.g) * smoothstep(0.34, 0.58, b.r);
      c = mix(c, vec3(1.0, 0.72, 0.75), skin);
      c = mix(c, vec3(1.0, 0.80, 0.83), smoothstep(0.70, 0.90, l));
      c = mix(c, b, 0.15);
    } else if (uLook < 3.5) {
      c = original * 0.4;
      for (int i = 1; i <= 4; i++) c += texture2D(uTexture, uv + vec2(float(i) * 0.012 * scale, float(i) * 0.002)).rgb * 0.15;
    } else if (uLook < 4.5) {
      float stripe = fract(vUv.x * 95.0 * scale);
      vec2 r = uv + vec2((stripe - 0.5) * 0.018, 0.0);
      c = texture2D(uTexture, r).rgb * (0.82 + 0.18 * sin(stripe * 3.14159265));
      c += pow(max(0.0, 1.0 - stripe), 18.0) * 0.20;
    } else if (uLook < 5.5) {
      float edge = 0.5 + (noise(vec2(vUv.y * 20.0, 4.0)) - 0.5) * 0.02;
      float glass = smoothstep(0.045 / scale, 0.06 / scale, abs(vUv.x - edge));
      vec2 r = uv + (vec2(noise(vUv * 190.0), noise(vUv * 190.0 + 51.0)) - 0.5) * 0.018;
      vec3 frosted = mix(softPhoto(r, 0.012 * scale), uLookColor, 0.42);
      frosted += (hash(vUv * 1400.0) - 0.5) * 0.16;
      c = mix(original, frosted, glass);
    } else if (uLook < 6.5) {
      float field = noise(vUv * vec2(7.0, 11.0) * scale) * 10.0 + noise(vUv * 23.0 * scale) * 0.7;
      float crease = abs(fract(field) - 0.5);
      float edge = smoothstep(0.45, 1.20, length((vUv - vec2(0.5, 0.55)) / vec2(0.32, 0.35)));
      float glass = edge * (0.35 + 0.65 * noise(vUv * 8.0 + 12.0));
      vec2 r = uv + vec2(sin(field * 6.28), cos(field * 4.0)) * 0.008 * glass;
      c = vec3(texture2D(uTexture, r + vec2(0.0015, 0.0) * glass).r, texture2D(uTexture, r).g, texture2D(uTexture, r - vec2(0.0015, 0.0) * glass).b);
      float shine = pow(max(0.0, 1.0 - crease * 16.0), 3.0) * glass;
      vec3 prism = 0.8 + 0.2 * cos(vec3(0.0, 2.1, 4.2) + field);
      c += shine * prism * 0.85;
      c -= pow(max(0.0, 1.0 - abs(crease - 0.09) * 22.0), 3.0) * glass * 0.10;
      c += pow(hash(floor(vUv * 220.0)), 40.0) * shine * 1.4;
    } else {
      vec3 b = softPhoto(uv, 0.006 * scale);
      c = mix(b, uLookColor, 0.30 + 0.22 * (1.0 - dot(b, vec3(0.299, 0.587, 0.114))));
      c += vec3(0.06, 0.015, 0.025) * (1.0 - vUv.y);
    }
    return mix(original, c, s);
  }

  void main() {
    // Soft circular mask around the mouse position (aspect-corrected so it stays round)
    vec2 maskUv = vUv - uMousePosition;
    maskUv.x *= uResolution.x / uResolution.y;
    float mask = (1.0 - smoothstep(uEffectRadius * 0.3, uEffectRadius, length(maskUv))) * uHoverProgress;

    vec2 uv = coverUv(vUv, uResolution, uImageResolution);
    uv.x += uParallax * uShaderMultiplier;
    uv -= 0.5;
    uv *= uUvScale;
    uv += 0.5;

    int effectType = int(floor(uEffectType + 0.5));
    float grainAmount = effectType < 0 ? 0.0 : uGrainStrength;
    vec3 col;

    if (effectType < 0) {
      col = texture2D(uTexture, uv).rgb;
    } else if (effectType == 1) {
      // Chromatic aberration radiating from the cursor
      vec2 dir = vUv - uMousePosition;
      float amt = uHoverDistortionStrength * mask * 0.6;
      col.r = texture2D(uTexture, uv + dir * amt).r;
      col.g = texture2D(uTexture, uv).g;
      col.b = texture2D(uTexture, uv - dir * amt).b;
    } else if (effectType == 2) {
      // Sine wave ripple
      uv.x += sin(vUv.y * 30.0 + uTime * 1.6) * uHoverDistortionStrength * 0.35 * mask;
      uv.y += sin(vUv.x * 24.0 - uTime * 1.2) * uHoverDistortionStrength * 0.25 * mask;
      col = texture2D(uTexture, uv).rgb;
    } else if (effectType == 3) {
      // Large soft noise blobs
      vec2 blob = vec2(
        noise(vUv * 2.5 + uTime * 0.15),
        noise(vUv * 2.5 + 50.0 - uTime * 0.12)
      ) - 0.5;
      uv += blob * uHoverDistortionStrength * 2.4 * mask;
      col = texture2D(uTexture, uv).rgb;
    } else if (effectType == 4) {
      // Film grain dominant, barely any distortion
      vec2 distortion = vec2(
        noise(vUv * 6.0 + uTime * 0.4),
        noise(vUv * 6.0 + 100.0 - uTime * 0.3)
      ) - 0.5;
      uv += distortion * uHoverDistortionStrength * 0.3 * mask;
      col = texture2D(uTexture, uv).rgb;
      grainAmount *= 2.6;
    } else if (effectType == 5) {
      // Mosaic pixelation around the cursor
      vec2 px = 14.0 / uResolution;
      vec2 mosaic = (floor(uv / px) + 0.5) * px;
      col = texture2D(uTexture, mix(uv, mosaic, mask)).rgb;
    } else if (effectType == 6) {
      // Magnifying lens centered on the cursor
      vec2 muv = coverUv(uMousePosition, uResolution, uImageResolution);
      muv.x += uParallax * uShaderMultiplier;
      muv -= 0.5;
      muv *= uUvScale;
      muv += 0.5;
      uv = mix(uv, muv + (uv - muv) * 0.65, mask);
      col = texture2D(uTexture, uv).rgb;
    } else {
      // Fine noise ripple distortion (default)
      vec2 distortion = vec2(
        noise(vUv * 6.0 + uTime * 0.4),
        noise(vUv * 6.0 + 100.0 - uTime * 0.3)
      ) - 0.5;
      uv += distortion * uHoverDistortionStrength * mask;
      col = texture2D(uTexture, uv).rgb;
    }

    // Fine animated grain, only where the hover mask is active
    float grain = hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5;
    col += grain * grainAmount * mask;

    col = material(col, uv);
    gl_FragColor = vec4(col, texture2D(uTexture, uv).a);
  }
`;
  let gpu;
  function context() {
    if (gpu) return gpu;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error('此浏览器无法启用 WebGL 图片特效 / WebGL image effects are unavailable');
    const compile = (type, code) => {
      const shader = gl.createShader(type); gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, 'attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}');
    const pixel = compile(gl.FRAGMENT_SHADER, fragment), program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, pixel); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex); gl.deleteShader(pixel); gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {};
    for (const [,name] of fragment.matchAll(/uniform\s+\w+\s+(\w+);/g)) uniforms[name] = gl.getUniformLocation(program, name);
    gl.uniform1i(uniforms.uTexture, 0);
    gpu = { canvas, gl, uniforms }; return gpu;
  }
  function texture(source, resource, value, time, parallax = 0, pointer = null) {
    const e = value || defaults, look = e.lookBaked ? 0 : looks.indexOf(e.look);
    let amount = e.strength;
    if (e.activation === 'hover' && pointer) {
      const now = performance.now(), states = resource.hoverStates || (resource.hoverStates = new Map());
      const hover = states.get(pointer.panel) || { progress: 0, stamp: now }, dt = Math.min(100, now - hover.stamp), target = pointer.inside ? 1 : 0;
      hover.stamp = now; hover.progress += (target - hover.progress) * (1 - Math.pow(1 - e.hoverTransitionSpeed, dt / (1000 / 60)));
      if (Math.abs(hover.progress - target) < .002) hover.progress = target;
      states.set(pointer.panel, hover); resource.hoverProgress = Math.max(...[...states.values()].map(v => v.progress));
      amount *= hover.progress;
    }
    if ((e.effect < 0 || amount === 0) && (!look || e.lookStrength === 0) && e.uvScale === 1 && e.parallaxIntensity === 0) return source;
    const focus = e.activation === 'hover' && pointer?.inside ? pointer : { x: e.focusX, y: e.focusY };
    const shaderTime = time * e.speed;
    const key = JSON.stringify([e, resource.animated || source === resource.canvas ? time : e.effect >= 0 && amount > 0 ? shaderTime : 0, e.parallaxIntensity ? parallax : 0, focus.x, focus.y, amount]);
    if (resource.filteredKey === key && resource.filteredSource === source) return resource.filteredCanvas;
    const { canvas, gl, uniforms: u } = context();
    const iw = source.naturalWidth || source.width, ih = source.naturalHeight || source.height, ratio = Math.min(1, 1024 / Math.max(iw, ih));
    const width = Math.max(1, Math.round(iw * ratio)), height = Math.max(1, Math.round(ih * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (!resource.filterTexture) resource.filterTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, resource.filterTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (resource.filterSource !== source || source === resource.canvas || resource.animated) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); resource.filterSource = source;
    }
    const scalar = (name, n) => gl.uniform1f(u[name], n);
    gl.uniform2f(u.uResolution, canvas.width, canvas.height); gl.uniform2f(u.uImageResolution, iw, ih);
    scalar('uParallax', parallax * e.parallaxIntensity); scalar('uUvScale', e.uvScale); scalar('uShaderMultiplier', e.shaderMultiplier);
    scalar('uTime', shaderTime); scalar('uHoverProgress', amount); gl.uniform2f(u.uMousePosition, focus.x, 1 - focus.y);
    scalar('uHoverDistortionStrength', e.hoverDistortionStrength); scalar('uGrainStrength', e.grainStrength); scalar('uEffectRadius', e.effectRadius); scalar('uEffectType', e.effect);
    scalar('uLook', look); scalar('uLookStrength', e.lookStrength); scalar('uLookScale', e.lookScale);
    const rgb = e.lookColor.match(/[0-9a-f]{2}/ig).map(n => parseInt(n,16)/255); gl.uniform3f(u.uLookColor, ...rgb);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const output = resource.filteredCanvas || (resource.filteredCanvas = document.createElement('canvas'));
    if (output.width !== canvas.width) output.width = canvas.width;
    if (output.height !== canvas.height) output.height = canvas.height;
    const ctx = output.getContext('2d'); ctx.clearRect(0, 0, output.width, output.height); ctx.drawImage(canvas, 0, 0);
    resource.filteredKey = key; resource.filteredSource = source; return output;
  }
  function dispose(resource) { if (resource?.filterTexture && gpu) gpu.gl.deleteTexture(resource.filterTexture); }
  root.CurvedGalleryEffects = Object.freeze({ effects, effectNames, looks, lookNames, lookEnglish, colors, defaults, ranges, normalize, texture, dispose, ensureAvailable: context });
  if (typeof module !== 'undefined') module.exports = root.CurvedGalleryEffects;
})(typeof window === 'undefined' ? globalThis : window);
