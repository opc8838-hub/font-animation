/* Articulated figures viewed through a scattering glass plane.
 * Visual reference: nusretuzman.com; see docs/analyses/glasswalkers.md.
 * Geometry, sampling and GPU implementation are local to this effect.
 */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const mod = (a, b) => ((a % b) + b) % b;
  const noise = n => mod(Math.sin(n * 72.317 + 19.41) * 43758.5453, 1);
  const add = (a, b, s = 1) => a.map((v, i) => v + b[i] * s);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a.reduce((v, x, i) => v + x * b[i], 0);
  const unit = a => { const length = Math.hypot(...a) || 1; return a.map(v => v / length); };
  const interpolate = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const color = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const MAX_PARTS = 40;
  const vertexSource = `#version 300 es
    in vec2 position;
    out vec2 uv;
    void main() { uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }
  `;
  const shadowSource = `#version 300 es
    precision highp float;
    uniform vec2 resolution;
    uniform int count;
    uniform vec4 start[${MAX_PARTS}];
    uniform vec4 end[${MAX_PARTS}];
    uniform vec2 attenuation[${MAX_PARTS}];
    out vec4 frag;
    // Winitzki's approximation to the Gaussian error function.
    float erf(float x) {
      float q=x*x;
      return sign(x)*sqrt(max(0.,1.-exp(-q*(1.27323954+.147*q)/(1.+.147*q))));
    }
    void main() {
      vec2 p=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
      float opacity=0.;
      for(int i=0;i<${MAX_PARTS};i++) {
        if(i>=count) break;
        vec2 ab=end[i].xy-start[i].xy;
        float t=clamp(dot(p-start[i].xy,ab)/max(dot(ab,ab),.0001),0.,1.);
        float d=length(p-mix(start[i].xy,end[i].xy,t));
        float r=mix(start[i].z,end[i].z,t);
        float s=max(.55,mix(start[i].w,end[i].w,t));
        if(d>r+s*3.) continue;
        float coverage=.5*(erf((r+d)/s*.70710678)-erf((d-r)/s*.70710678));
        opacity=max(opacity,coverage*mix(attenuation[i].x,attenuation[i].y,t));
      }
      frag=vec4(opacity);
    }
  `;
  const glassSource = `#version 300 es
    precision highp float;
    in vec2 uv;
    uniform sampler2D shadow;
    uniform sampler2D grain;
    uniform vec3 paper,ink;
    uniform float pitch,grainScale,textureAmount;
    out vec4 frag;
    void main() {
      float density=pow(clamp(texture(shadow,uv).r,0.,1.),.85);
      vec2 xy=gl_FragCoord.xy;
      vec2 screen=vec2(xy.x+xy.y,xy.y-xy.x)*.70710678;
      float threshold=.5+.16*(cos(screen.x*6.2831853/pitch)+cos(screen.y*6.2831853/pitch));
      float dots=smoothstep(threshold-.18,threshold+.18,density);
      density=mix(density,dots,textureAmount*.4);
      float letters=texture(grain,xy/grainScale).a;
      density*=1.-letters*textureAmount*1.06*(1.-smoothstep(.55,.95,density));
      frag=vec4(mix(paper,ink,clamp(density*.94,0.,1.)),1.);
    }
  `;

  class GlassWalkersRenderer {
    constructor() {
      this.canvas = document.createElement('canvas');
      const gl = this.gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true });
      if (!gl) throw new Error('WebGL 2 is required for Glass Walkers');
      const program = fragment => {
        const result = gl.createProgram();
        for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragment]]) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, source); gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
          gl.attachShader(result, shader); gl.deleteShader(shader);
        }
        gl.linkProgram(result);
        if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
        return result;
      };
      this.shadowProgram = program(shadowSource);
      this.glassProgram = program(glassSource);
      this.locations = new Map();
      const quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      for (const pr of [this.shadowProgram, this.glassProgram]) {
        gl.useProgram(pr);
        const location = gl.getAttribLocation(pr, 'position');
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
        this.locations.set(pr, {});
      }
      this.shadowTexture = gl.createTexture();
      this.framebuffer = gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.grainTexture = this.makeGrain();
      this.starts = new Float32Array(MAX_PARTS * 4);
      this.ends = new Float32Array(MAX_PARTS * 4);
      this.attenuation = new Float32Array(MAX_PARTS * 2);
    }
    uniform(program, name) {
      const cache = this.locations.get(program);
      return cache[name] ?? (cache[name] = this.gl.getUniformLocation(program, name));
    }
    makeGrain() {
      const gl = this.gl, tile = document.createElement('canvas');
      tile.width = tile.height = 128;
      const ctx = tile.getContext('2d');
      ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const glyphs = '.:+=ox*';
      for (let y = 4; y < 128; y += 8) for (let x = 4; x < 128; x += 8) {
        ctx.globalAlpha = .25 + noise(x * 7 + y) * .65;
        ctx.fillText(glyphs[Math.floor(noise(x + y * 9) * glyphs.length)], x, y);
      }
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      return texture;
    }
    resize(width, height) {
      if (this.canvas.width === width && this.canvas.height === height) return;
      this.canvas.width = width; this.canvas.height = height;
      this.shadowWidth = Math.max(2, Math.round(width * .6));
      this.shadowHeight = Math.max(2, Math.round(height * .6));
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.shadowWidth, this.shadowHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.shadowTexture, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    route(index, pet, state, worldWidth, worldHeight) {
      const horizontal = state.direction === 'horizontal' || (state.direction === 'mixed' && (pet || index % 3 !== 2));
      const reverse = index % 2 === 1;
      const span = horizontal ? worldWidth : worldHeight, cross = horizontal ? worldHeight : worldWidth;
      const margin = pet ? .65 : .9;
      const lane = (.13 + noise(index + (pet ? 30 : 3)) * .74) * cross;
      const drift = (noise(index + 51) - .5) * Math.min(1, cross * .3);
      const duration = Math.min(pet ? 9.7 : 11.5, (span + margin * 2) / (pet ? .57 : .78 + noise(index + 19) * .1));
      const at = seconds => {
        const p = seconds / duration;
        const along = reverse ? span + margin - p * (span + margin * 2) : -margin + p * (span + margin * 2);
        const across = lane + drift * p + Math.sin(p * TAU + index) * .055;
        return horizontal ? [along, across, 0] : [across, along, 0];
      };
      const directionAt = seconds => unit(sub(at(seconds + .01), at(seconds - .01)));
      return { duration, at, directionAt };
    }
    human(route, age, index) {
      const parts = [], feet = [], root = route.at(age), forward = route.directionAt(age), sideward = [-forward[1], forward[0], 0];
      const cap = (a, b, ra, rb = ra) => parts.push({ a, b, ra, rb });
      const stature = .94 + noise(index + 12) * .1;
      const period = 1.39 + noise(index + 41) * .13;
      const phase = age / period + noise(index + 7);
      const pelvis = add(root, [0, 0, (.89 + .025 * Math.sin(phase * TAU) ** 2) * stature]);
      const hips = [];
      for (const side of [-1, 1]) {
        const p = mod(phase + (side === 1 ? .5 : 0), 1);
        const strike = age - p * period;
        const footAt = t => add(add(route.at(t), route.directionAt(t), .26 * stature), [-route.directionAt(t)[1], route.directionAt(t)[0], 0], side * .076);
        const old = footAt(strike), next = footAt(strike + period);
        const plantedDirection = route.directionAt(strike);
        let heel, pitch, hinge, heading = plantedDirection;
        if (p < .62) {
          pitch = p < .085 ? -.14 * (1 - smooth(p / .085)) : .59 * smooth((p - .41) / .21);
          heel = add(old, plantedDirection, .17 * (1 - Math.cos(Math.max(0, pitch))));
          heel[2] = .17 * Math.sin(Math.max(0, pitch));
          hinge = p > .41 ? 1 : 0;
        } else {
          const u = (p - .62) / .38;
          heel = interpolate(add(old, plantedDirection, .029), next, smooth(u));
          heel[2] = .095 * (1 - u) + .115 * Math.sin(Math.PI * u);
          pitch = mix(.59, -.14, smooth(u));
          hinge = 1 - smooth(u / .18);
          heading = unit(interpolate(plantedDirection, route.directionAt(strike + period), smooth(u)));
        }
        const yaw = Math.atan2(heading[1], heading[0]) + side * .11;
        const footDirection = [Math.cos(yaw), Math.sin(yaw), 0];
        const fp = (x, z = 0) => {
          const point = add(heel, footDirection, x * Math.cos(pitch));
          point[2] = Math.max(.001, heel[2] - x * Math.sin(pitch)) + z;
          if (hinge > 0 && x > .17) {
            const ball = add(heel, footDirection, .17 * Math.cos(pitch));
            point[0] = mix(point[0], ball[0] + footDirection[0] * (x - .17), hinge);
            point[1] = mix(point[1], ball[1] + footDirection[1] * (x - .17), hinge);
            point[2] = mix(point[2], Math.max(.001, heel[2] - .17 * Math.sin(pitch)) + z, hinge);
          }
          return point;
        };
        cap(fp(.035), fp(.1), .037, .04);
        cap(fp(.1), fp(.175), .04, .05);
        cap(fp(.175), fp(.225), .05, .038);
        cap(fp(.05, .025), fp(.19, .025), .044, .048);
        const ankle = fp(.055, .075);
        const hip = add(pelvis, sideward, side * .085);
        hips.push(hip);
        const axis = sub(ankle, hip), distance = Math.min(.89 * stature, Math.hypot(...axis));
        const axisUnit = unit(axis);
        const bend = unit(add(forward, axisUnit, -dot(forward, axisUnit)));
        const knee = add(add(hip, axisUnit, distance * .5), bend, Math.sqrt(Math.max(.001, (.45 * stature) ** 2 - (distance * .5) ** 2)));
        cap(ankle, knee, .075, .083);
        cap(knee, hip, .083, .098);
        feet.push(fp(.11));
      }
      cap(hips[0], hips[1], .105);
      const chest = add(add(pelvis, forward, .12), [0, 0, .43 * stature]);
      cap(add(pelvis, [0, 0, .07]), chest, .12, .14);
      cap(add(chest, [0, 0, .07]), add(chest, [0, 0, .23]), .058, .09);
      for (const side of [-1, 1]) {
        const shoulder = add(chest, sideward, side * .18);
        const swing = Math.sin(phase * TAU + (side > 0 ? Math.PI : 0)) * .19;
        const elbow = add(add(shoulder, forward, swing), [0, 0, -.26]);
        const hand = add(add(elbow, forward, swing * .55 + .09), [0, 0, -.25]);
        cap(shoulder, elbow, .045, .039); cap(elbow, hand, .039, .031);
      }
      return { parts, label: interpolate(feet[0], feet[1], .5), kind: 'person', index };
    }
    animal(route, age, index, dog) {
      const parts = [], root = route.at(age), f = route.directionAt(age), n = [-f[1], f[0], 0];
      const scale = dog ? 1.45 : 1, period = dog ? .84 : .79;
      const phase = age / period;
      const cap = (a, b, ra, rb = ra) => parts.push({ a, b, ra: ra * scale, rb: rb * scale });
      const at = (x, y, z) => add(add(add(root, f, x * scale), n, y * scale), [0, 0, z * scale]);
      const hip = at(-.15, Math.sin(phase * TAU) * .012, .27);
      const shoulder = at(.15, Math.sin(phase * TAU - 1.5) * .012, .28);
      cap(hip, at(0, 0, .26), .055, .038); cap(at(0, 0, .26), shoulder, .038, .05);
      cap(shoulder, at(.23, 0, .31), .043, .06);
      cap(at(.24, 0, .31), at(.28, 0, .29), .055, .025);
      for (const side of [-1, 1]) cap(at(.22, side * .035, .34), at(.2, side * .04, .405), .021, .004);
      const pawPhases = [0, .5, .25, .75];
      for (let i = 0; i < 4; i++) {
        const p = mod(phase + pawPhases[i], 1), side = i % 2 ? 1 : -1, front = i < 2;
        const station = front ? .14 : -.15, strike = age - p * period;
        const land = t => add(add(route.at(t), route.directionAt(t), (station + .13) * scale), n, side * .045 * scale);
        let paw = land(strike);
        if (p >= .64) { const u = (p - .64) / .36; paw = interpolate(paw, land(strike + period), smooth(u)); paw[2] = Math.sin(u * Math.PI) * .045; }
        const joint = at(station - (front ? .015 : .04), side * .045, .14);
        cap(front ? shoulder : hip, joint, .026, .02);
        cap(joint, add(paw, [0, 0, .02]), .02, .012);
        cap(paw, add(paw, f, .024), .019, .017);
      }
      let last = hip;
      for (let i = 1; i <= 7; i++) {
        const u = i / 7, curl = Math.sin(u * Math.PI * 1.15 + phase * .2) * .07;
        const next = at(-.15 - u * .28, curl, .28 + Math.sin(u * Math.PI * .8) * (dog ? .08 : .16));
        cap(last, next, .018 * (1 - u * .6)); last = next;
      }
      return { parts, label: root, kind: dog ? 'dog' : 'cat', index };
    }
    draw(target, state, seconds) {
      this.resize(target.width, target.height);
      const width = target.width, height = target.height;
      const visualScale = Math.min(width / 1440, height / 900);
      const metres = Math.min(width, height) * .11 / .27 * state.figureSize / 100;
      const worldWidth = width / metres, worldHeight = height / metres;
      const eye = [worldWidth * .5, -worldHeight * .3];
      const depth = Math.hypot(worldWidth * .5, worldHeight * 1.3) / .55;
      const time = mod(seconds * state.speed, 12), actors = [];
      for (let i = 0; i < state.peopleCount; i++) {
        const route = this.route(i, false, state, worldWidth, worldHeight);
        const age = mod(time + (i + .45) * 12 / Math.max(1, state.peopleCount), 12);
        if (age < Math.min(12, route.duration + 1)) actors.push(this.human(route, age, i));
      }
      for (let i = 0; i < state.animalCount; i++) {
        const route = this.route(i + 10, true, state, worldWidth, worldHeight);
        const age = mod(time + i * 3.3, 12) - 2;
        if (age >= 0 && age < route.duration) actors.push(this.animal(route, age, i, state.animalKind === 'dog'));
      }
      const gl = this.gl, pr = this.shadowProgram, sw = this.shadowWidth, sh = this.shadowHeight;
      const px = sw / worldWidth;
      const scattering = Math.tan((6 + state.softness * .1) * Math.PI / 180);
      const project = (point, radius) => {
        const z = Math.max(0, point[2]), perspective = depth / (depth + z);
        const x = eye[0] + (point[0] - eye[0]) * perspective, y = eye[1] + (point[1] - eye[1]) * perspective;
        const oblique = Math.min(1.6, (1 + ((x - eye[0]) ** 2 + (y - eye[1]) ** 2) / depth ** 2) ** .6);
        return [x * px, y * px, radius * perspective * px, (.012 + z * scattering * perspective * .5) * px * oblique];
      };
      const fade = z => (1 - .2 * smooth(z / .05)) * (1 - .88 * smooth((z - .85) / .5));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.viewport(0, 0, sw, sh); gl.disable(gl.SCISSOR_TEST);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(pr); gl.uniform2f(this.uniform(pr, 'resolution'), sw, sh);
      gl.enable(gl.SCISSOR_TEST);
      for (const actor of actors) {
        let minX = sw, minY = sh, maxX = 0, maxY = 0;
        actor.parts.slice(0, MAX_PARTS).forEach((part, i) => {
          const a = project(part.a, part.ra), b = project(part.b, part.rb);
          this.starts.set(a, i * 4); this.ends.set(b, i * 4);
          this.attenuation.set([fade(part.a[2]), fade(part.b[2])], i * 2);
          for (const p of [a, b]) {
            const padding = p[2] + p[3] * 3;
            minX = Math.min(minX, p[0] - padding); maxX = Math.max(maxX, p[0] + padding);
            minY = Math.min(minY, p[1] - padding); maxY = Math.max(maxY, p[1] + padding);
          }
        });
        minX = clamp(Math.floor(minX), 0, sw); maxX = clamp(Math.ceil(maxX), 0, sw);
        minY = clamp(Math.floor(minY), 0, sh); maxY = clamp(Math.ceil(maxY), 0, sh);
        if (maxX <= minX || maxY <= minY) continue;
        gl.scissor(minX, sh - maxY, maxX - minX, maxY - minY);
        gl.uniform1i(this.uniform(pr, 'count'), Math.min(MAX_PARTS, actor.parts.length));
        gl.uniform4fv(this.uniform(pr, 'start[0]'), this.starts);
        gl.uniform4fv(this.uniform(pr, 'end[0]'), this.ends);
        gl.uniform2fv(this.uniform(pr, 'attenuation[0]'), this.attenuation);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.disable(gl.SCISSOR_TEST); gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, width, height);
      const comp = this.glassProgram;
      gl.useProgram(comp);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.shadowTexture);
      gl.uniform1i(this.uniform(comp, 'shadow'), 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.grainTexture);
      gl.uniform1i(this.uniform(comp, 'grain'), 1);
      gl.uniform3fv(this.uniform(comp, 'paper'), color(state.background));
      gl.uniform3fv(this.uniform(comp, 'ink'), color(state.shadow));
      gl.uniform1f(this.uniform(comp, 'pitch'), Math.max(1.5, 4 * visualScale));
      gl.uniform1f(this.uniform(comp, 'grainScale'), 128 * Math.max(.4, visualScale));
      gl.uniform1f(this.uniform(comp, 'textureAmount'), state.halftone / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const ctx = target.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.canvas, 0, 0);
      if (state.markers) this.drawMarkers(ctx, actors, metres, visualScale);
    }
    drawMarkers(ctx, actors, metres, scale) {
      const colors = ['#8067c9', '#2d73b3', '#299d83', '#bb872a', '#2590a0'];
      const s = Math.max(.5, scale);
      ctx.save(); ctx.font = `${9 * s}px monospace`; ctx.lineWidth = Math.max(.5, s * .75);
      for (const actor of actors) {
        const x = actor.label[0] * metres, y = actor.label[1] * metres;
        const w = (actor.kind === 'person' ? 104 : 72) * s, h = 70 * s, arm = 11 * s;
        ctx.strokeStyle = colors[actor.index % colors.length]; ctx.fillStyle = ctx.strokeStyle;
        ctx.globalAlpha = .5;
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const px = x + dx * w / 2, py = y + dy * h / 2;
          ctx.beginPath(); ctx.moveTo(px - dx * arm, py); ctx.lineTo(px, py); ctx.lineTo(px, py - dy * arm); ctx.stroke();
        }
        ctx.globalAlpha = .66;
        ctx.fillText((actor.kind === 'person' ? 'WALKER' : actor.kind.toUpperCase()) + ' ' + String(actor.index + 1).padStart(2, '0'), x - w / 2, y - h / 2 - 5 * s);
        ctx.fillRect(x - 2 * s, y, 4 * s, .6 * s); ctx.fillRect(x, y - 2 * s, .6 * s, 4 * s);
      }
      ctx.restore();
    }
  }
  window.GlassWalkersRenderer = GlassWalkersRenderer;
})();
