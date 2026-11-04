(() => {
  'use strict';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = value => { const x = clamp(value, 0, 1); return x * x * (3 - 2 * x); };
  const mask = document.createElement('canvas');
  const surface = document.createElement('canvas');
  const gl = surface.getContext('webgl2', { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL 2 is required for Metallic Text.');
  let maskKey = '', bounds, lineStep = 1, lineCount = 1, glyphCount = 0;
  const revealDuration = scene => scene.revealMode === 'laser' ? (scene.writeDuration ?? 2.4) : 0;

  const vertex = `#version 300 es
  in vec2 position;
  void main() { gl_Position = vec4(position, 0., 1.); }`;
  const fragment = `#version 300 es
  precision highp float;
  uniform sampler2D lettering;
  uniform sampler2D writing;
  uniform vec2 resolution;
  uniform vec4 bounds;
  uniform vec3 background, metal, cool, warm;
  uniform float progress, writeProgress, laser, glyphCount, lineStep, lineCount, shine, bandWidth, bevel, transparentBackground;
  out vec4 color;
  float distanceAt(vec2 uv) {
    vec2 packed = texture(lettering, uv).rg;
    return (packed.r * 65280. + packed.g * 255.) / 65535. * resolution.y * .5;
  }
  float bell(float x, float width) { return exp(-x * x / (width * width)); }
  void main() {
    vec2 pixel = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
    vec2 p = pixel;
    vec2 uv = p / resolution;
    vec2 order = texture(writing, uv).rg;
    float writtenAt = (order.r * 65280. + order.g * 255.) / 65535.;
    float head = (writeProgress - writtenAt) * max(1., glyphCount);
    float reveal = laser > .5 ? smoothstep(0., .012, head) : 1.;
    if (writeProgress >= 1.) reveal = 1.;
    float alpha = texture(lettering, uv).b * reveal;
    if (alpha < .002) { color = transparentBackground > .5 ? vec4(0.) : vec4(background, 1.); return; }
    vec2 texel = 2.5 / resolution;
    float distance = distanceAt(uv);
    vec2 gradient = vec2(distanceAt(uv + vec2(texel.x, 0.)) - distanceAt(uv - vec2(texel.x, 0.)),
                         distanceAt(uv + vec2(0., texel.y)) - distanceAt(uv - vec2(0., texel.y))) / 5.;
    float bevelWidth = max(1., bounds.w * bevel);
    float curved = clamp(1. - distance / bevelWidth, 0., 1.);
    vec3 normal = normalize(vec3(-gradient * curved * 2., sqrt(max(.04, 1. - curved * curved))));
    vec2 local = (p - bounds.xy) / bounds.zw;
    float row = clamp(floor((p.y - bounds.y + (lineStep - bounds.w) * .5) / lineStep), 0., lineCount - 1.);
    float y = (p.y - bounds.y - row * lineStep) / bounds.w;
    float base = mix(.13, .76, smoothstep(-.03, 1.08, y));
    base -= .10 * bell(y - .12, .16);
    base += .08 * bell(y - .92, .16);
    // A broad reflected horizon bends over the bevel and travels across the word.
    float wave = .31 + .12 * sin(local.x * 4.4 - progress * 6.2831853) + normal.x * .10 - normal.y * .11;
    float horizon = y - wave;
    float width = .045 + bandWidth * .20;
    float movingLight = .30 + .70 * bell(local.x - mix(-.05, 1.05, progress), .42);
    vec3 reflection = cool * bell(horizon + width * .9, width * .85) * .54;
    reflection += vec3(1.) * bell(horizon, width * .65) * .48;
    reflection += warm * bell(horizon - width * .65, width * .80) * .43;
    float edge = pow(curved, 2.5);
    float edgeLight = .47 + .32 * dot(normal, normalize(vec3(-.5, -.7, .6)));
    vec3 result = vec3(base) * mix(vec3(1.), metal / max(.01, max(metal.r, max(metal.g, metal.b))), .42);
    result += reflection * shine * movingLight;
    result = mix(result, vec3(edgeLight) + reflection * .40, edge * .78);
    result += vec3(.32) * bell(distance - .65, .65);
    result += vec3(.12) * pow(max(0., -normal.y), 4.);
    // A narrow cold laser head leaves a brief luminous edge behind each letter.
    float writingLight = laser * (1. - step(1., writeProgress)) * bell(head - .012, .022);
    result += (vec3(.65, .85, 1.) + cool * .6) * writingLight * 1.5;
    result = clamp(result, 0., 1.);
    color = transparentBackground > .5 ? vec4(result, alpha) : vec4(mix(background, result, alpha), 1.);
  }`;

  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  const program = gl.createProgram();
  const shaders = [compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment)];
  shaders.forEach(shader => gl.attachShader(program, shader)); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  shaders.forEach(shader => gl.deleteShader(shader));
  gl.useProgram(program);
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const writingTexture = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, writingTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uniforms = Object.fromEntries(['lettering', 'writing', 'resolution', 'bounds', 'background', 'metal', 'cool', 'warm', 'progress', 'writeProgress', 'laser', 'glyphCount', 'lineStep', 'lineCount', 'shine', 'bandWidth', 'bevel', 'transparentBackground'].map(name => [name, gl.getUniformLocation(program, name)]));
  gl.uniform1i(uniforms.lettering, 0); gl.uniform1i(uniforms.writing, 1);

  function contourDistances(pixels, width, height) {
    const distances = new Float32Array(width * height);
    const length = Math.max(width, height);
    const input = new Float64Array(length), output = new Float64Array(length);
    const sites = new Int32Array(length), edges = new Float64Array(length + 1);
    function transform(count) {
      let k = 0; sites[0] = 0; edges[0] = -Infinity; edges[1] = Infinity;
      for (let q = 1; q < count; q++) {
        let intersection;
        do {
          const v = sites[k];
          intersection = ((input[q] + q * q) - (input[v] + v * v)) / (2 * (q - v));
          if (intersection > edges[k]) break;
          k--;
        } while (k >= 0);
        k++; sites[k] = q; edges[k] = intersection; edges[k + 1] = Infinity;
      }
      k = 0;
      for (let q = 0; q < count; q++) { while (edges[k + 1] < q) k++; const delta = q - sites[k]; output[q] = delta * delta + input[sites[k]]; }
    }
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) input[y] = pixels[(y * width + x) * 4 + 3] > 127 ? 1e12 : 0;
      transform(height);
      for (let y = 0; y < height; y++) distances[y * width + x] = output[y];
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) input[x] = distances[y * width + x];
      transform(width);
      for (let x = 0; x < width; x++) distances[y * width + x] = Math.sqrt(output[x]);
    }
    const blurred = new Float32Array(width * height);
    const weights = [1, 4, 6, 4, 1];
    for (let y = 0; y < height; y++) for (let x = 2; x < width - 2; x++) {
      const i = y * width + x;
      for (let offset = -2; offset <= 2; offset++) blurred[i] += distances[i + offset] * weights[offset + 2] / 16;
    }
    for (let y = 2; y < height - 2; y++) for (let x = 0; x < width; x++) {
      const i = y * width + x; distances[i] = 0;
      for (let offset = -2; offset <= 2; offset++) distances[i] += blurred[i + offset * width] * weights[offset + 2] / 16;
    }
    return distances;
  }

  // Recover a stroke centreline from the actual shaped mask, including custom fonts.
  // This runs only when layout changes; playback samples the resulting time field.
  function strokeTimes(source, left, top, width, height) {
    const scale = Math.min(1, 160 / height, 256 / width);
    const w = Math.max(5, Math.ceil(width * scale) + 4), h = Math.max(5, Math.ceil(height * scale) + 4);
    const tile = document.createElement('canvas'); tile.width = w; tile.height = h;
    const ctx = tile.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(source, left, top, width, height, 2, 2, w - 4, h - 4);
    const pixels = ctx.getImageData(0, 0, w, h).data;
    const skeleton = new Uint8Array(w * h);
    for (let i = 0; i < skeleton.length; i++) skeleton[i] = pixels[i * 4 + 3] > 127 ? 1 : 0;
    const offsets = [-w, 1 - w, 1, 1 + w, w, w - 1, -1, -1 - w];
    const ring = new Uint8Array(8), removed = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (let pass = 0; pass < 2; pass++) {
        removed.length = 0;
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const i = y * w + x; if (!skeleton[i]) continue;
          let count = 0, transitions = 0;
          for (let k = 0; k < 8; k++) { ring[k] = skeleton[i + offsets[k]]; count += ring[k]; }
          if (count < 2 || count > 6) continue;
          for (let k = 0; k < 8; k++) if (!ring[k] && ring[(k + 1) % 8]) transitions++;
          if (transitions !== 1) continue;
          if (pass === 0 ? ring[0] * ring[2] * ring[4] || ring[2] * ring[4] * ring[6] : ring[0] * ring[2] * ring[6] || ring[0] * ring[4] * ring[6]) continue;
          removed.push(i);
        }
        if (removed.length) changed = true;
        for (const i of removed) skeleton[i] = 0;
      }
    }
    function neighbors(i) {
      const result = [];
      for (let k = 0; k < 8; k++) {
        if (!skeleton[i + offsets[k]]) continue;
        // Do not cut diagonally across a connected right-angle corner.
        if (k % 2 && (skeleton[i + offsets[k - 1]] || skeleton[i + offsets[(k + 1) % 8]])) continue;
        result.push(i + offsets[k]);
      }
      return result;
    }
    // Flat caps produce short medial-axis spurs; remove those, not real branches.
    const radii = contourDistances(pixels, w, h);
    for (let i = 0; i < skeleton.length; i++) if (skeleton[i] && neighbors(i).length === 1) {
      const branch = [i]; let previous = i, next = neighbors(i)[0], length = 0;
      while (next !== undefined) {
        length += Math.hypot(next % w - previous % w, Math.floor(next / w) - Math.floor(previous / w));
        const adjacent = neighbors(next);
        if (adjacent.length !== 2) {
          if (adjacent.length > 2 && length < Math.max(3, radii[next] * 1.6)) for (const p of branch) skeleton[p] = 0;
          break;
        }
        branch.push(next); const following = adjacent.find(p => p !== previous); previous = next; next = following;
      }
    }
    const nodes = [];
    for (let i = 0; i < skeleton.length; i++) if (skeleton[i]) nodes.push(i);
    const times = new Float32Array(w * h), visited = new Uint8Array(w * h);
    const endpoints = nodes.filter(i => neighbors(i).length <= 1);
    const firstY = nodes.reduce((y, i) => Math.min(y, Math.floor(i / w)), h);
    const upper = i => Math.floor(i / w) <= firstY + h * .18;
    const starts = endpoints.filter(upper);
    const first = (starts.length ? starts : nodes.filter(upper)).sort((a, b) => a % w - b % w || a - b)[0];
    let current = first, dx = 0, dy = 1, length = 0, remaining = nodes.length;
    while (remaining) {
      visited[current] = 1; remaining--; times[current] = length;
      const candidates = neighbors(current).filter(i => !visited[i]);
      let next;
      if (candidates.length) {
        let best = -Infinity;
        for (const i of candidates) {
          const nx = i % w - current % w, ny = Math.floor(i / w) - Math.floor(current / w);
          const score = (nx * dx + ny * dy) / Math.hypot(nx, ny);
          if (score > best) { best = score; next = i; }
        }
      } else if (remaining) {
        let best = Infinity;
        for (const i of nodes) if (!visited[i]) {
          const distance = Math.hypot(i % w - current % w, Math.floor(i / w) - Math.floor(current / w));
          if (distance < best) { best = distance; next = i; }
        }
      }
      if (next !== undefined) {
        dx = next % w - current % w; dy = Math.floor(next / w) - Math.floor(current / w);
        const distance = Math.hypot(dx, dy); dx /= distance; dy /= distance;
        length += candidates.length ? distance : 2; current = next;
      }
    }
    // Extend centreline times across the width of each stroke. Nearest-seed passes
    // keep the advancing front perpendicular to curved and diagonal pen paths.
    const nearest = new Int32Array(w * h).fill(-1);
    for (const i of nodes) nearest[i] = i;
    for (let pass = 0; pass < 4; pass++) {
      const forward = pass % 2 === 0, adjacent = forward ? [-1, -w, -w - 1, -w + 1] : [1, w, w + 1, w - 1];
      for (let step = 0; step < nearest.length; step++) {
        const i = forward ? step : nearest.length - 1 - step, x = i % w, y = Math.floor(i / w);
        let seed = nearest[i], best = seed < 0 ? Infinity : (seed % w - x) ** 2 + (Math.floor(seed / w) - y) ** 2;
        for (const offset of adjacent) {
          const j = i + offset; if (j < 0 || j >= nearest.length || Math.abs(j % w - x) > 1) continue;
          const candidate = nearest[j]; if (candidate < 0) continue;
          const distance = (candidate % w - x) ** 2 + (Math.floor(candidate / w) - y) ** 2;
          if (distance < best) { best = distance; seed = candidate; }
        }
        nearest[i] = seed;
      }
    }
    const field = new Float32Array(w * h);
    for (let i = 0; i < field.length; i++) field[i] = nearest[i] < 0 ? 0 : times[nearest[i]] / Math.max(1, length);
    // A moving round pen covers joins before their later branches are traversed.
    // Without this overlap, nearest-branch ownership leaves holes in a written stem.
    for (const i of nodes) {
      const x = i % w, y = Math.floor(i / w), radius = Math.max(1, radii[i] * 1.15), at = times[i] / Math.max(1, length);
      for (let py = Math.max(0, Math.floor(y - radius)); py <= Math.min(h - 1, Math.ceil(y + radius)); py++) {
        for (let px = Math.max(0, Math.floor(x - radius)); px <= Math.min(w - 1, Math.ceil(x + radius)); px++) {
          if ((px - x) ** 2 + (py - y) ** 2 <= radius * radius) field[py * w + px] = Math.min(field[py * w + px], at);
        }
      }
    }
    return { field, width: w, height: h };
  }

  // Cache contour distances on content/size changes. Frames only shade the texture.
  function buildMask(scene, width, height) {
    const key = [width, height, scene.text, scene.font, scene.fontSize, scene.tracking, scene.fontHeight, scene.extraBold, scene.positionX, scene.positionY, scene.alignment, scene.lineHeight, scene.revealMode].join('|');
    if (key === maskKey) return;
    maskKey = key; mask.width = surface.width = width; mask.height = surface.height = height;
    const ctx = mask.getContext('2d', { willReadFrequently: true });
    const font = window.STGFontLibrary.preset(scene.font);
    const size = height * scene.fontSize;
    ctx.font = `${font.style} ${font.weight} ${size}px ${window.STGFontLibrary.family(scene.font)}`;
    ctx.fontKerning = 'normal';
    ctx.textBaseline = 'alphabetic';
    const gap = size * scene.tracking;
    ctx.letterSpacing = `${gap}px`;
    const lines = scene.text.replace(/\r\n?/g, '\n').split('\n');
    const metrics = lines.map(line => ctx.measureText(line));
    const multiline = lines.length > 1;
    const widths = metrics.map((metric, i) => Math.max(0, multiline ? metric.actualBoundingBoxLeft + metric.actualBoundingBoxRight : metric.width - (lines[i] ? gap : 0)));
    const advances = Math.max(1, ...widths);
    const ascent = Math.max(1, ...metrics.map(metric => metric.actualBoundingBoxAscent));
    const descent = Math.max(0, ...metrics.map(metric => metric.actualBoundingBoxDescent));
    const actualHeight = (ascent + descent) * scene.fontHeight;
    const step = actualHeight * (scene.lineHeight ?? 1.35);
    const blockHeight = actualHeight + step * (lines.length - 1);
    const scale = Math.min(1, width * .82 / advances, height * (lines.length > 1 ? .75 : .55) / blockHeight);
    const offsetX = width * (scene.positionX || 0) / 100;
    const top = (height - blockHeight * scale) / 2 + height * (scene.positionY || 0) / 100;
    const lefts = widths.map(w => (scene.alignment === 'left' ? width * .09 : scene.alignment === 'right' ? width * .91 - w * scale : (width - w * scale) / 2) + offsetX);
    bounds = [Math.min(...lefts), top, advances * scale, actualHeight * scale];
    lineStep = step * scale; lineCount = lines.length; glyphCount = 0;
    const cells = [];
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = size * scene.extraBold * 2; ctx.lineJoin = 'round';
    lines.forEach((line, row) => {
      const origin = lefts[row] + (multiline ? metrics[row].actualBoundingBoxLeft * scale : 0);
      ctx.save(); ctx.translate(origin, top + row * lineStep + ascent * scale * scene.fontHeight); ctx.scale(scale, scale * scene.fontHeight);
      ctx.fillText(line, 0, 0); if (scene.extraBold > 0) ctx.strokeText(line, 0, 0); ctx.restore();
      let prefix = '';
      const rowCells = [];
      for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(line)) {
        prefix += segment;
        const end = ctx.measureText(prefix).width;
        if (!segment.trim()) continue;
        const metric = ctx.measureText(segment), start = end - metric.width;
        rowCells.push({ segment, metric, origin: origin + start * scale, start: origin + start * scale, end: origin + (end - gap) * scale, index: glyphCount++ });
      }
      cells.push(rowCells);
    });
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const distances = contourDistances(pixels, width, height);
    const writing = new Uint8Array(pixels.length);
    if (scene.revealMode === 'laser') cells.forEach((rowCells, row) => {
      rowCells.forEach(cell => {
        const padding = size * scene.extraBold + 2 / scale, baseline = top + row * lineStep + ascent * scale * scene.fontHeight;
        cell.left = Math.floor(cell.origin - (cell.metric.actualBoundingBoxLeft + padding) * scale);
        cell.right = Math.ceil(cell.origin + (cell.metric.actualBoundingBoxRight + padding) * scale);
        cell.top = Math.floor(baseline - (cell.metric.actualBoundingBoxAscent + padding) * scale * scene.fontHeight);
        cell.bottom = Math.ceil(baseline + (cell.metric.actualBoundingBoxDescent + padding) * scale * scene.fontHeight);
        const glyph = document.createElement('canvas'); glyph.width = Math.max(1, cell.right - cell.left); glyph.height = Math.max(1, cell.bottom - cell.top);
        const ink = glyph.getContext('2d', { willReadFrequently: true });
        ink.font = ctx.font; ink.fontKerning = 'normal'; ink.letterSpacing = ctx.letterSpacing;
        ink.fillStyle = ink.strokeStyle = '#fff'; ink.lineWidth = ctx.lineWidth; ink.lineJoin = 'round';
        ink.translate(cell.origin - cell.left, baseline - cell.top); ink.scale(scale, scale * scene.fontHeight);
        ink.fillText(cell.segment, 0, 0); if (scene.extraBold > 0) ink.strokeText(cell.segment, 0, 0);
        cell.stroke = strokeTimes(glyph, 0, 0, glyph.width, glyph.height);
        const alpha = ink.getImageData(0, 0, glyph.width, glyph.height).data;
        for (let y = Math.max(0, cell.top); y < Math.min(height, cell.bottom); y++) for (let x = Math.max(0, cell.left); x < Math.min(width, cell.right); x++) {
          if (!alpha[((y - cell.top) * glyph.width + x - cell.left) * 4 + 3]) continue;
          const i = (y * width + x) * 4, order = writingOrder(cell, x, y);
          if (!writing[i + 3] || order < (writing[i] << 8 | writing[i + 1])) { writing[i] = order >> 8; writing[i + 1] = order & 255; writing[i + 3] = 255; }
        }
      });
    });
    function writingOrder(cell, x, y) {
      const stroke = cell.stroke;
      const sx = clamp(1.5 + (x + .5 - cell.left) / Math.max(1, cell.right - cell.left) * (stroke.width - 4), 0, stroke.width - 1.001);
      const sy = clamp(1.5 + (y + .5 - cell.top) / Math.max(1, cell.bottom - cell.top) * (stroke.height - 4), 0, stroke.height - 1.001);
      const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy, at = iy * stroke.width + ix;
      const within = (stroke.field[at] * (1 - fx) + stroke.field[at + 1] * fx) * (1 - fy) + (stroke.field[at + stroke.width] * (1 - fx) + stroke.field[at + stroke.width + 1] * fx) * fy;
      return Math.round((cell.index + .025 + within * .90) / Math.max(1, glyphCount) * 65535);
    }
    for (let y = 0; y < height; y++) {
      const row = clamp(Math.floor((y + .5 - top + (lineStep - bounds[3]) * .5) / lineStep), 0, lines.length - 1), rowCells = cells[row];
      let cellIndex = 0;
      for (let x = 0; x < width; x++) {
        if (!rowCells.length) continue;
        while (cellIndex < rowCells.length - 1 && x + .5 > (rowCells[cellIndex].end + rowCells[cellIndex + 1].start) / 2) cellIndex++;
        const cell = rowCells[cellIndex];
        const i = (y * width + x) * 4;
        if (!cell.stroke || writing[i + 3] || !pixels[i + 3]) continue;
        const order = writingOrder(cell, x, y);
        writing[i] = order >> 8; writing[i + 1] = order & 255; writing[i + 3] = 255;
      }
    }
    for (let i = 0; i < distances.length; i++) {
      const packed = Math.min(65535, Math.round(distances[i] / (height * .5) * 65535));
      const alpha = pixels[i * 4 + 3];
      pixels[i * 4] = packed >> 8; pixels[i * 4 + 1] = packed & 255; pixels[i * 4 + 2] = alpha; pixels[i * 4 + 3] = 255;
    }
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, writingTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, writing);
  }
  const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
  function draw(ctx, state, time, width, height, transparent = false) {
    const scene = state.scene;
    buildMask(scene, width, height);
    gl.viewport(0, 0, width, height); gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, width, height); gl.uniform4fv(uniforms.bounds, bounds);
    gl.uniform3fv(uniforms.background, rgb(scene.background)); gl.uniform3fv(uniforms.metal, rgb(scene.metalTint));
    gl.uniform3fv(uniforms.cool, rgb(scene.coolTint)); gl.uniform3fv(uniforms.warm, rgb(scene.warmTint));
    const intro = revealDuration(scene);
    const progress = smooth((time - intro) / scene.sweep);
    gl.uniform1f(uniforms.progress, scene.direction === 'reverse' ? 1 - progress : progress);
    gl.uniform1f(uniforms.writeProgress, intro ? clamp(time / intro, 0, 1) : 1);
    gl.uniform1f(uniforms.laser, intro ? 1 : 0); gl.uniform1f(uniforms.glyphCount, glyphCount);
    gl.uniform1f(uniforms.lineStep, lineStep); gl.uniform1f(uniforms.lineCount, lineCount);
    gl.uniform1f(uniforms.shine, scene.shine);
    gl.uniform1f(uniforms.bandWidth, scene.lightWidth); gl.uniform1f(uniforms.bevel, scene.bevel);
    gl.uniform1f(uniforms.transparentBackground, transparent ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    ctx.drawImage(surface, 0, 0, width, height);
  }
  window.MetallicTextRenderer = { draw, revealDuration, invalidate: () => { maskKey = ''; }, duration: scene => revealDuration(scene) + scene.sweep + scene.hold };
})();
