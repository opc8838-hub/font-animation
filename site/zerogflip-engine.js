/* 无重力翻转 Zero-G Flip — 渲染引擎
 * 全部在浏览器本地完成，不依赖模型：
 *  - 素材处理：抠掉连通的纯色底、去地面影子、清半透明残边、距离场 → 圆鼓厚度、法线、背面铜锈纹理
 *  - 爆炸图：按空白缝自动切出零件
 *  - WebGL2 渲染：带体积的主体按切线拆成壳体零件在 3D 里炸开/合拢，翻转、余晃、仰角、广角→长焦
 *  - 2D 合成：全景背景横移 + 景深、关灯、地面倒影、硬切换、片名
 * 预览、PNG、GIF、MP4 共用 render(t)。
 */
(() => {
  'use strict';

  const ART_H = 1100;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => (b <= a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));
  const smooth = t => t * t * (3 - 2 * t);
  const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const rad = d => d * Math.PI / 180;

  // ───────────── 图像工具 ─────────────
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片读取失败'));
      img.src = src;
    });
  }

  function readPixels(img, maxDim = 1600) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.min(1, maxDim / Math.max(iw, ih));
    const w = Math.max(2, Math.round(iw * s));
    const h = Math.max(2, Math.round(ih * s));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, w, h);
    return { w, h, data: g.getImageData(0, 0, w, h).data };
  }

  function hasTransparency(data) {
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 250 && ++n > data.length / 400) return true;
    return false;
  }

  // 从四周往里抠掉连通的浅色/纯色底（白底产品图、爆炸图）
  function removeFlatBackground(data, w, h) {
    const lum = i => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const sat = i => {
      const mx = Math.max(data[i], data[i + 1], data[i + 2]);
      const mn = Math.min(data[i], data[i + 1], data[i + 2]);
      return mx ? (mx - mn) / mx : 0;
    };
    let bl = 0, n = 0;
    const bc = [0, 0, 0];
    for (let x = 0; x < w; x += 4) {
      for (const i of [x * 4, ((h - 1) * w + x) * 4]) { bl += lum(i); for (let ch = 0; ch < 3; ch++) bc[ch] += data[i + ch]; n++; }
    }
    bl /= n;
    for (let ch = 0; ch < 3; ch++) bc[ch] /= n;
    const isBg = p => { const i = p * 4; return sat(i) < 0.12 && lum(i) > bl - 62; };
    const seen = new Uint8Array(w * h);
    const q = new Int32Array(w * h);
    let head = 0, tail = 0;
    const push = p => { if (!seen[p] && isBg(p)) { seen[p] = 1; q[tail++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (head < tail) {
      const p = q[head++], x = p % w, y = (p / w) | 0;
      if (x > 0) push(p - 1); if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w); if (y < h - 1) push(p + w);
    }
    // 镂空处透出的成片纯白也去掉（小块金属高光保留）
    const white = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (!seen[p] && sat(i) < 0.06 && lum(i) > 236) white[p] = 1;
    }
    const wl = labelComponents(white, w, h);
    for (let p = 0; p < w * h; p++) {
      if (seen[p] || (wl.labels[p] > 0 && wl.areas[wl.labels[p]] > 260)) data[p * 4 + 3] = 0;
    }
    // 去白边：按白底反推真实颜色
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (!data[i + 3]) continue;
      let near = false;
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && !data[(yy * w + xx) * 4 + 3]) { near = true; break; }
      }
      if (near) {
        const k = 0.55;
        for (let ch = 0; ch < 3; ch++) data[i + ch] = clamp((data[i + ch] - (1 - k) * bc[ch]) / k, 0, 255);
        data[i + 3] = 255 * k;
      }
    }
  }

  function labelComponents(mask, w, h) {
    const labels = new Int32Array(w * h);
    const areas = [0], boxes = [null];
    const q = new Int32Array(w * h);
    let id = 0;
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || labels[s]) continue;
      id++;
      let head = 0, tail = 0, area = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      labels[s] = id; q[tail++] = s;
      while (head < tail) {
        const p = q[head++], x = p % w, y = (p / w) | 0;
        area++;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const n = yy * w + xx;
          if (mask[n] && !labels[n]) { labels[n] = id; q[tail++] = n; }
        }
      }
      areas.push(area); boxes.push({ x0, y0, x1, y1 });
    }
    return { labels, areas, boxes, count: id };
  }

  // 高斯模糊：三次盒式模糊近似
  function boxesForGauss(sigma) {
    const wIdeal = Math.sqrt(12 * sigma * sigma / 3 + 1);
    let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    const wu = wl + 2;
    const m = Math.round((12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4));
    return [0, 1, 2].map(i => ((i < m ? wl : wu) - 1) / 2);
  }
  function boxH(src, dst, w, h, r) {
    const k = 1 / (r + r + 1);
    for (let y = 0; y < h; y++) {
      const o = y * w;
      let acc = src[o] * (r + 1);
      for (let j = 0; j < r; j++) acc += src[o + Math.min(j, w - 1)];
      for (let x = 0; x < w; x++) {
        acc += src[o + Math.min(x + r, w - 1)] - src[o + Math.max(x - r - 1, 0)];
        dst[o + x] = acc * k;
      }
    }
  }
  function boxV(src, dst, w, h, r) {
    const k = 1 / (r + r + 1);
    for (let x = 0; x < w; x++) {
      let acc = src[x] * (r + 1);
      for (let j = 0; j < r; j++) acc += src[Math.min(j, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        acc += src[Math.min(y + r, h - 1) * w + x] - src[Math.max(y - r - 1, 0) * w + x];
        dst[y * w + x] = acc * k;
      }
    }
  }
  function blur(src, w, h, sigma) {
    if (sigma < 0.5) return Float32Array.from(src);
    const a = Float32Array.from(src), b = new Float32Array(src.length);
    for (const r of boxesForGauss(sigma)) {
      if (r < 1) continue;
      boxH(a, b, w, h, r); boxV(b, a, w, h, r);
    }
    return a;
  }

  // 精确欧氏距离场（Felzenszwalb）：每个实心像素到最近透明像素的距离
  function edt(mask, w, h) {
    const INF = 1e20;
    const f = new Float64Array(Math.max(w, h));
    const d = new Float64Array(Math.max(w, h));
    const v = new Int32Array(Math.max(w, h));
    const z = new Float64Array(Math.max(w, h) + 1);
    const grid = new Float64Array(w * h);
    for (let p = 0; p < w * h; p++) grid[p] = mask[p] ? INF : 0;
    const pass = n => {
      let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
      for (let q = 1; q < n; q++) {
        let s;
        do {
          const r = v[k];
          s = ((f[q] + q * q) - (f[r] + r * r)) / (2 * q - 2 * r);
        } while (s <= z[k] && --k >= 0);
        k++; v[k] = q; z[k] = s; z[k + 1] = INF;
      }
      k = 0;
      for (let q = 0; q < n; q++) {
        while (z[k + 1] < q) k++;
        const r = v[k];
        d[q] = (q - r) * (q - r) + f[r];
      }
    };
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
      pass(h);
      for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
      pass(w);
      for (let x = 0; x < w; x++) grid[y * w + x] = d[x];
    }
    const out = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) out[p] = Math.sqrt(grid[p]);
    return out;
  }

  // 高度场（像素单位，y 向下）→ 物体空间法线（y 向上），RGBA 编码
  function normalsFromHeight(hf, w, h) {
    const out = new Uint8Array(w * h * 4);
    const at = (x, y) => hf[clamp(y, 0, h - 1) * w + clamp(x, 0, w - 1)];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)) / 8;
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out[i] = (-dx / l * 0.5 + 0.5) * 255;
      out[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      out[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
    return out;
  }

  function thumbFrom(rgba, w, h, size = 96) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer.slice(0)), w, h), 0, 0);
    const s = size / Math.max(w, h);
    const t = document.createElement('canvas');
    t.width = Math.max(1, Math.round(w * s)); t.height = Math.max(1, Math.round(h * s));
    const g = t.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, t.width, t.height);
    return t.toDataURL('image/png');
  }

  const nextFrame = () => new Promise(r => setTimeout(r, 0));

  // ───────────── 主体 / 切换素材：生成体积 ─────────────
  async function processArtifact(src, opts = {}) {
    const img = typeof src === 'string' ? await loadImage(src) : src;
    let { w, h, data } = readPixels(img, 1600);
    if (!hasTransparency(data)) removeFlatBackground(data, w, h);
    // 主体 + 够大的小块（挂件），去掉整块位于主体下方的地面影子
    const solidMask = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) solidMask[p] = data[p * 4 + 3] > 128 ? 1 : 0;
    const comps = labelComponents(solidMask, w, h);
    if (comps.count > 0) {
      let main = 1;
      for (let i = 2; i <= comps.count; i++) if (comps.areas[i] > comps.areas[main]) main = i;
      const bottom = comps.boxes[main].y1;
      const keepId = new Uint8Array(comps.count + 1);
      for (let i = 1; i <= comps.count; i++) {
        if (comps.areas[i] >= comps.areas[main] * 0.0015 && comps.boxes[i].y0 < bottom - 4) keepId[i] = 1;
      }
      const keep = new Float32Array(w * h);
      for (let p = 0; p < w * h; p++) keep[p] = keepId[comps.labels[p]];
      const grown = blur(keep, w, h, 1.5);
      for (let p = 0; p < w * h; p++) if (grown[p] < 0.02) data[p * 4 + 3] = 0;
    }
    // 裁边 → 统一高度
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 <= x0 || y1 <= y0) throw new Error('图片里没有找到主体');
    const pad = 12;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const src2 = document.createElement('canvas');
    src2.width = w; src2.height = h;
    src2.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0);
    const H = ART_H;
    const W = Math.max(2, Math.round((x1 - x0 + 1) * H / (y1 - y0 + 1)));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(src2, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, W, H);
    const px = g.getImageData(0, 0, W, H).data;
    const N = W * H;
    await nextFrame();

    // 半透明边缘里的抠图残色（红/黄边）：换成旁边实心部分的颜色
    const alpha = new Float32Array(N);
    const rgb = [new Float32Array(N), new Float32Array(N), new Float32Array(N)];
    for (let p = 0; p < N; p++) {
      alpha[p] = px[p * 4 + 3] / 255;
      for (let ch = 0; ch < 3; ch++) rgb[ch][p] = px[p * 4 + ch];
    }
    let solid = new Float32Array(N);
    for (let p = 0; p < N; p++) solid[p] = px[p * 4 + 3] > 200 ? 1 : 0;
    for (const sigma of [2, 5, 12]) {
      const ws = blur(solid, W, H, sigma);
      const cs = rgb.map(ch => { const t = new Float32Array(N); for (let p = 0; p < N; p++) t[p] = ch[p] * solid[p]; return blur(t, W, H, sigma); });
      const next = Float32Array.from(solid);
      for (let p = 0; p < N; p++) {
        if (px[p * 4 + 3] <= 200 && solid[p] < 1 && ws[p] > 0.02) {
          for (let ch = 0; ch < 3; ch++) rgb[ch][p] = cs[ch][p] / ws[p];
          next[p] = 1;
        }
      }
      solid = next;
    }
    const color = new Uint8Array(N * 4);
    for (let p = 0; p < N; p++) {
      color[p * 4] = rgb[0][p]; color[p * 4 + 1] = rgb[1][p]; color[p * 4 + 2] = rgb[2][p]; color[p * 4 + 3] = px[p * 4 + 3];
    }
    await nextFrame();

    // 体积：距离场 → 圆顶（侧面看是鼓起来的，不是一张纸）
    const mask = new Uint8Array(N);
    for (let p = 0; p < N; p++) mask[p] = alpha[p] > 0.5 ? 1 : 0;
    const dt = edt(mask, W, H);
    let maxdt = 1;
    for (let p = 0; p < N; p++) if (dt[p] > maxdt) maxdt = dt[p];
    let dome = new Float32Array(N);
    for (let p = 0; p < N; p++) { const k = 1 - Math.min(dt[p] / (maxdt * 0.95), 1); dome[p] = Math.sqrt(1 - k * k); }
    dome = blur(dome, W, H, maxdt * 0.12);
    for (let p = 0; p < N; p++) dome[p] *= Math.min(dt[p] / 3, 1);
    const depth = new Uint8Array(N);
    for (let p = 0; p < N; p++) depth[p] = clamp(dome[p] * 255, 0, 255);
    await nextFrame();

    // 表面细节：亮度高通 → 法线微起伏，高光扫过时看得到铜锈颗粒
    const gray = new Float32Array(N);
    for (let p = 0; p < N; p++) gray[p] = 0.299 * rgb[0][p] + 0.587 * rgb[1][p] + 0.114 * rgb[2][p];
    const g6 = blur(gray, W, H, 6), g22 = blur(gray, W, H, 22);
    const scale = maxdt * 0.62;
    const hf = new Float32Array(N);
    for (let p = 0; p < N; p++) hf[p] = dome[p] * scale + (gray[p] - g6[p]) * 0.07 + (gray[p] - g22[p]) * 0.22;
    const normal = normalsFromHeight(hf, W, H);
    await nextFrame();

    let back = color, nback = normal;
    if (opts.back !== false) {
      // 背面：去掉五官，只留铜锈 —— 低频颜色 × 主体上一块最"满"区域的铜锈纹理
      const ab = blur(alpha, W, H, 20);
      const low = rgb.map(ch => { const t = new Float32Array(N); for (let p = 0; p < N; p++) t[p] = ch[p] * alpha[p]; const b = blur(t, W, H, 20); for (let p = 0; p < N; p++) b[p] /= ab[p] + 1e-4; return b; });
      const pw = Math.max(8, Math.round(W * 0.4)), ph = Math.max(8, Math.round(H * 0.13));
      const pxs = Math.round(W * 0.3);
      let best = Math.round(H * 0.05), bestFill = -1;
      for (let py = Math.round(H * 0.05); py + ph < H; py += Math.round(H * 0.04)) {
        let fill = 0;
        for (let y = py; y < py + ph; y += 4) for (let x = pxs; x < pxs + pw; x += 4) fill += alpha[y * W + x] > 0.8 ? 1 : 0;
        if (fill > bestFill) { bestFill = fill; best = py; }
      }
      const tile = rgb.map(() => new Float32Array(N));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = Math.floor(x / pw), j = Math.floor(y / ph);
        let tx = x % pw, ty = y % ph;
        if ((i + j) % 2) { tx = pw - 1 - tx; ty = ph - 1 - ty; }
        const s = (best + ty) * W + pxs + tx;
        for (let ch = 0; ch < 3; ch++) tile[ch][y * W + x] = rgb[ch][s];
      }
      back = new Uint8Array(N * 4);
      const bgray = new Float32Array(N);
      for (let ch = 0; ch < 3; ch++) {
        const tb = blur(tile[ch], W, H, 14);
        for (let p = 0; p < N; p++) {
          const v = clamp(low[ch][p] * (tile[ch][p] / (tb[p] + 1)) * 0.92, 0, 255);
          back[p * 4 + ch] = v;
          bgray[p] += v * [0.299, 0.587, 0.114][ch];
        }
      }
      for (let p = 0; p < N; p++) back[p * 4 + 3] = color[p * 4 + 3];
      const b6 = blur(bgray, W, H, 6);
      const hb = new Float32Array(N);
      for (let p = 0; p < N; p++) hb[p] = dome[p] * scale + (bgray[p] - b6[p]) * 0.07;
      nback = normalsFromHeight(hb, W, H);
    }
    return { w: W, h: H, color, normal, back, nback, depth, depthRatio: maxdt / H, thumb: thumbFrom(color, W, H, 120) };
  }

  // ───────────── 爆炸图：按空白缝切零件 ─────────────
  async function processExploded(src) {
    const img = typeof src === 'string' ? await loadImage(src) : src;
    const { w, h, data } = readPixels(img, 1400);
    if (!hasTransparency(data)) removeFlatBackground(data, w, h);
    const mask = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) mask[p] = data[p * 4 + 3] > 100 ? 1 : 0;
    const comps = labelComponents(mask, w, h);
    const minArea = w * h * 0.001;
    const regions = [];
    for (let i = 1; i <= comps.count; i++) {
      if (comps.areas[i] < minArea) continue;
      const b = comps.boxes[i];
      const bw = b.x1 - b.x0 + 1;
      if (bw > w * 0.4) {
        // 粘连的大块：沿竖向覆盖最少的缝再切开
        const cov = new Float32Array(bw);
        for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) if (comps.labels[y * w + x] === i) cov[x - b.x0]++;
        const sm = new Float32Array(bw);
        for (let x = 0; x < bw; x++) { let s = 0, n = 0; for (let k = -4; k <= 4; k++) { const xx = x + k; if (xx >= 0 && xx < bw) { s += cov[xx]; n++; } } sm[x] = s / n; }
        const sorted = Array.from(sm).sort((a, b2) => a - b2);
        const median = sorted[sorted.length >> 1];
        const minW = Math.round(w * 0.035);
        const cuts = [];
        // 切在"附近最细"的地方：比两侧零件主体明显细，且是左右一段范围内的最低点
        for (let x = minW; x < bw - minW; x++) {
          if (sm[x] >= median * 0.62) continue;
          let isMin = true;
          for (let k = x - minW; k <= x + minW && isMin; k++) if (k !== x && (sm[k] < sm[x] || (sm[k] === sm[x] && k < x))) isMin = false;
          if (isMin && (!cuts.length || x - cuts[cuts.length - 1] >= minW)) cuts.push(x);
        }
        const edges = [0, ...cuts, bw];
        for (let k = 0; k < edges.length - 1; k++) regions.push({ id: i, xa: b.x0 + edges[k], xb: b.x0 + edges[k + 1] });
      } else {
        regions.push({ id: i, xa: b.x0, xb: b.x1 + 1 });
      }
    }
    const parts = [];
    let uy0 = h, uy1 = 0;
    for (const r of regions) {
      let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
      for (let y = 0; y < h; y++) for (let x = r.xa; x < r.xb; x++) {
        if (comps.labels[y * w + x] !== r.id) continue;
        n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (n < minArea * 0.5) continue;
      const pw = x1 - x0 + 1, ph = y1 - y0 + 1;
      const rgba = new Uint8Array(pw * ph * 4);
      for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
        const sp = (y + y0) * w + x + x0, dp = (y * pw + x) * 4;
        if (comps.labels[sp] !== r.id) continue;
        rgba[dp] = data[sp * 4]; rgba[dp + 1] = data[sp * 4 + 1]; rgba[dp + 2] = data[sp * 4 + 2]; rgba[dp + 3] = data[sp * 4 + 3];
      }
      parts.push({ x: x0, y: y0, w: pw, h: ph, area: n, rgba });
      uy0 = Math.min(uy0, y0); uy1 = Math.max(uy1, y1);
    }
    parts.sort((a, b) => a.x - b.x);
    const unitH = Math.max(1, uy1 - uy0 + 1);
    const cy = (uy0 + uy1) / 2;
    const total = parts.reduce((s, p) => s + p.area, 0) || 1;
    return {
      w, h,
      parts: parts.map((p, index) => ({
        index, w: p.w, h: p.h, rgba: p.rgba,
        hw: p.w / unitH / 2, hh: p.h / unitH / 2,
        y: (cy - (p.y + p.h / 2)) / unitH,
        cx: (p.x + p.w / 2) / w, share: p.area / total,
        thumb: thumbFrom(p.rgba, p.w, p.h, 72),
      })),
    };
  }

  // 默认挑哪些零件当"内部结构"：靠中间、大小适中的零件
  function suggestCoreParts(parts) {
    return parts.filter(p => p.cx > 0.45 && p.cx < 0.88 && p.y > -0.15 && p.share > 0.015 && p.share < 0.2 && p.hh > p.hw).map(p => p.index).slice(0, 4);
  }

  // ───────────── 时间轴 ─────────────
  function buildTimeline(p, seqCount) {
    const T = {};
    if (p.explodeOn) {
      T.explodeHold = p.explodeHold;
      T.converge = p.explodeHold + p.converge;
      T.spinStart = Math.max(0, T.converge - 0.04);
    } else {
      T.explodeHold = 0; T.converge = 0; T.spinStart = 0;
    }
    T.spinEnd = T.spinStart + p.spinSec;
    T.dimStart = T.spinEnd - 0.1;
    T.dimEnd = T.spinEnd + 0.6;
    T.switches = [];
    let t = T.spinEnd + p.firstHold;
    for (let k = 0; k < seqCount; k++) {
      T.switches.push(t);
      t += k < seqCount - 1 ? p.interval * p.accel ** k : p.lastHold;
    }
    T.endCard = seqCount ? t : T.spinEnd + p.firstHold;
    T.total = T.endCard + (p.titleOn ? p.titleHold : 0);
    return T;
  }

  // ───────────── WebGL 着色器 ─────────────
  const VS = `#version 300 es
  in vec2 aUV;
  uniform sampler2D uDepth;
  uniform float uSide, uThick;
  uniform vec2 uSize;
  uniform vec3 uOff;
  uniform mat4 uModel, uVP;
  uniform vec2 uShift;
  out vec2 vUV; out vec3 vPos;
  void main() {
    float d = texture(uDepth, aUV).r;
    vec3 p = vec3((aUV.x - 0.5) * uSize.x, (0.5 - aUV.y) * uSize.y, uSide * d * uThick) + uOff;
    vec4 wp = uModel * vec4(p, 1.0);
    vPos = wp.xyz; vUV = aUV;
    vec4 c = uVP * wp;
    c.xy += uShift * c.w;
    gl_Position = c;
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 vUV; in vec3 vPos;
  uniform sampler2D uColor, uNormal;
  uniform float uSide;
  uniform mat3 uNM;
  uniform vec3 uCam;
  uniform float uRim;
  uniform int uRegion;
  uniform vec4 uCut;     // 左切线 u, 右切线 u, 侧翼上沿 v, 侧翼下沿 v
  uniform float uBottomV;
  out vec4 o;
  int regionOf(vec2 uv) {
    if (uv.y > uBottomV) return 4;
    if (uv.y > uCut.z && uv.y < uCut.w) {
      if (uv.x < uCut.x) return 2;
      if (uv.x > uCut.y) return 3;
    }
    return 1;
  }
  void main() {
    if (uRegion > 0 && regionOf(vUV) != uRegion) discard;
    vec4 c = texture(uColor, vUV);
    if (c.a < 0.02) discard;
    float a = clamp((c.a - 0.5) / max(fwidth(c.a), 1e-4) + 0.5, 0.0, 1.0);
    // 空心铸件：拆开时看到的内壁偏暗、没有外表面高光
    bool outside = gl_FrontFacing == (uSide > 0.0);
    vec3 n = texture(uNormal, vUV).xyz * 2.0 - 1.0;
    n.z *= uSide;
    n = normalize(uNM * n);
    vec3 V = normalize(uCam - vPos);
    if (dot(n, V) < 0.0) n = -n;
    vec3 L1 = normalize(vec3(-0.55, 0.65, 0.75));
    vec3 L2 = normalize(vec3(0.95, 0.25, -0.35));
    vec3 L3 = normalize(vec3(-0.9, 0.05, -0.45));
    vec3 warm = vec3(1.0, 0.84, 0.58);
    float d1 = max(dot(n, L1), 0.0);
    vec3 col = c.rgb * (0.56 + 0.62 * d1);
    float s1 = pow(max(dot(n, normalize(L1 + V)), 0.0), 36.0);
    float s2 = pow(max(dot(n, normalize(L2 + V)), 0.0), 20.0);
    float s3 = pow(max(dot(n, normalize(L3 + V)), 0.0), 20.0);
    float fr = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    if (outside) col += warm * (s1 * 0.20 + (s2 + s3) * 0.38 * uRim + fr * 0.14 * uRim);
    else col = col * 0.55 + warm * (s2 + s3) * 0.12;
    o = vec4(col, a);
  }`;
  const VS_CORE = `#version 300 es
  in vec2 aUV;
  uniform vec3 uCenter;
  uniform vec2 uHalf;
  uniform mat4 uModel, uVP;
  uniform vec2 uShift;
  out vec2 vUV;
  void main() {
    vec4 wc = uModel * vec4(uCenter, 1.0);
    vec3 wp = wc.xyz + vec3((aUV.x - 0.5) * 2.0 * uHalf.x, (0.5 - aUV.y) * 2.0 * uHalf.y, 0.0);
    vUV = aUV;
    vec4 c = uVP * vec4(wp, 1.0);
    c.xy += uShift * c.w;
    gl_Position = c;
  }`;
  const FS_CORE = `#version 300 es
  precision highp float;
  in vec2 vUV;
  uniform sampler2D uColor;
  uniform float uAlpha;
  out vec4 o;
  void main() {
    vec4 c = texture(uColor, vUV);
    float a = clamp((c.a - 0.5) / max(fwidth(c.a), 1e-4) + 0.5, 0.0, 1.0) * uAlpha;
    if (a < 0.01) discard;
    o = vec4(c.rgb * vec3(0.92, 0.9, 0.86), a);
  }`;

  // 4×4 矩阵（列主序）
  const M4 = {
    mul(a, b) {
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s;
      }
      return o;
    },
    persp(fovy, asp, n, f) {
      const t = 1 / Math.tan(fovy / 2);
      return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]);
    },
    trans(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); },
    scale(s) { return new Float32Array([s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]); },
    rx(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); },
    ry(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); },
    rz(a) { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
  };

  // 壳体零件的飞散方向（物体坐标，头高 = 1；按 3/4 侧面 + 仰角排成横向一行）
  const SHELL = [
    { region: 1, side: 1, off: [-0.60, -0.34, 1.00] },   // 前壳 → 左
    { region: 1, side: -1, off: [0.50, 0.36, -1.00] },   // 后壳 → 右
    { region: 2, side: 0, off: [0.40, 0.62, -0.40] },    // 左翼 → 右上
    { region: 3, side: 0, off: [1.15, -0.98, 0.10] },    // 右翼 → 右下
    { region: 4, side: 0, off: [-0.20, -0.50, 0.0] },    // 底部 → 下
  ];

  // ───────────── 渲染器 ─────────────
  function createRenderer() {
    const glc = document.createElement('canvas');
    const gl = glc.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
    if (!gl) return null;
    const out = document.createElement('canvas');
    const g = out.getContext('2d');
    const acc = document.createElement('canvas');
    const ga = acc.getContext('2d');
    const refl = document.createElement('canvas');
    const gr = refl.getContext('2d');
    let W = 0, H = 0;

    function shader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    function program(vs, fs, names) {
      const p = gl.createProgram();
      gl.attachShader(p, shader(gl.VERTEX_SHADER, vs));
      gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, 'aUV');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      names.forEach(k => { u[k] = gl.getUniformLocation(p, k); });
      return { p, u };
    }
    const ART = program(VS, FS, ['uDepth', 'uSide', 'uThick', 'uSize', 'uOff', 'uModel', 'uVP', 'uShift', 'uColor', 'uNormal', 'uNM', 'uCam', 'uRim', 'uRegion', 'uCut', 'uBottomV']);
    const CORE = program(VS_CORE, FS_CORE, ['uCenter', 'uHalf', 'uModel', 'uVP', 'uShift', 'uColor', 'uAlpha']);

    function texture(bytes, w, h, format = 'rgba', mip = true) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      if (format === 'r') gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, bytes);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      if (mip) gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }
    const meshes = new Map();
    function grid(nx, ny) {
      const key = `${nx}x${ny}`;
      if (meshes.has(key)) return meshes.get(key);
      const uv = new Float32Array((nx + 1) * (ny + 1) * 2);
      let k = 0;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { uv[k++] = i / nx; uv[k++] = j / ny; }
      const idx = new Uint32Array(nx * ny * 6);
      k = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
        idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = d;
      }
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      const m = { vao, count: idx.length };
      meshes.set(key, m);
      return m;
    }
    const quad = grid(1, 1);

    // GPU 资源按素材缓存
    const gpuArts = new WeakMap();
    function gpuArt(art) {
      let r = gpuArts.get(art);
      if (r) return r;
      const color = texture(art.color, art.w, art.h);
      const normal = texture(art.normal, art.w, art.h);
      r = {
        color, normal,
        back: art.back === art.color ? color : texture(art.back, art.w, art.h),
        nback: art.nback === art.normal ? normal : texture(art.nback, art.w, art.h),
        depth: texture(art.depth, art.w, art.h, 'r', false),
        mesh: grid(Math.max(2, Math.round(300 * art.w / art.h)), 300),
      };
      gpuArts.set(art, r);
      return r;
    }
    const gpuParts = new WeakMap();
    function gpuPart(part) {
      let t = gpuParts.get(part);
      if (!t) { t = texture(part.rgba, part.w, part.h); gpuParts.set(part, t); }
      return t;
    }

    function setSize(w, h) {
      if (w === W && h === H) return;
      W = w; H = h;
      [glc, out, acc, refl].forEach(c => { c.width = w; c.height = h; });
    }

    // 画面构图：主体大小随画布比例自适应，炸开时整组收进画面
    function layout(scene) {
      const p = scene.params;
      const objPx = Math.min(H * p.objSize, W * 0.75);
      const fit = objPx / (H * p.objSize);
      const explodeZoom = Math.min(0.74, (W * 0.96) / (2.5 * objPx));
      return { objPx, fit, explodeZoom };
    }

    function motion(scene, t) {
      const p = scene.params, T = scene.timeline;
      const L = layout(scene);
      const pre = 1 + 0.06 * (1 - smooth(seg(t, 0, T.explodeHold)));
      const cu = seg(t, T.explodeHold, T.converge);
      const explode = p.explodeOn ? pre * (1 - (0.45 * smooth(cu) + 0.55 * cu * cu)) : 0;
      const u = seg(t, T.spinStart, T.spinEnd);
      const spin = 1 - (1 - u) ** 1.6;
      const tau = Math.max(0, t - T.spinEnd);
      const damp = Math.exp(-tau * 3.2) * p.wobble;
      const after = t > T.spinEnd ? 1 : 0;
      const yaw0 = p.yaw;
      let yaw = lerp(yaw0 - (p.explodeOn ? 12 : 0), yaw0, smooth(seg(t, 0, T.converge))) + (360 * p.turns - yaw0) * spin + after * 3.2 * damp * Math.sin(tau * 5.4);
      const level = easeInOut(seg(t, T.explodeHold * 0.83, T.spinEnd + 0.1));
      let pitch = lerp(-p.elevation, 0, level) + after * 1.6 * damp * Math.sin(tau * 4.1 + 0.6);
      const roll = lerp(-6 * Math.min(1, p.elevation / 22), 0, smooth(seg(t, 0.1, T.spinEnd))) + after * 1.2 * damp * Math.sin(tau * 3.3 + 1.1);
      const idle = smooth(seg(t, T.spinEnd + 0.4, T.spinEnd + 1.4));
      yaw += idle * 2.2 * Math.sin((t - T.spinEnd) * 1.25);
      pitch += idle * 0.8 * Math.sin((t - T.spinEnd) * 0.9 + 1.4);
      const bob = Math.sin(t * 1.6) * 0.006;
      const click = p.explodeOn ? Math.exp(-(((t - T.converge - 0.02) / 0.07) ** 2)) : 0;
      const zStart = p.explodeOn ? L.explodeZoom : 0.92;
      const zoom = L.fit * lerp(zStart, 1, easeInOut(seg(t, 0.05, T.spinStart + 1.29))) * lerp(1, 1.03, seg(t, T.spinEnd + 0.42, T.endCard)) * (1 + 0.014 * click);
      const fov = lerp(p.fovStart, 18, easeInOut(seg(t, 0.4, T.spinStart + 1.29)));
      return { yaw, pitch, roll, bob, zoom, explode, fov, level, shiftX: 0.07 * clamp(explode, 0, 1), rim: 1 + 1.8 * click };
    }

    // 当前是哪件（主体翻转后按序列硬切）
    function itemAt(scene, t) {
      const T = scene.timeline;
      let i = -1;
      T.switches.forEach((s, k) => { if (t >= s) i = k; });
      const item = i < 0 ? scene.main : scene.sequence[i];
      return item && item.art ? item : scene.main;  // 还没处理完的素材先显示主体
    }

    function drawArt(scene, item, m) {
      const art = item.art;
      const r = gpuArt(art);
      const p = scene.params;
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      gl.disable(gl.CULL_FACE);
      const fov = rad(m.fov);
      const camD = 1 / (p.objSize * 2 * Math.tan(fov / 2));
      const VP = M4.mul(M4.persp(fov, W / H, 0.05, 50), M4.trans(0, 0, -camD));
      const R = M4.mul(M4.rz(rad(m.roll)), M4.mul(M4.rx(rad(m.pitch)), M4.ry(rad(m.yaw))));
      const sc = m.zoom * (item.scale || 1);
      const model = M4.mul(M4.trans(0, m.bob, 0), M4.mul(M4.scale(sc), R));
      const nm = new Float32Array([R[0], R[1], R[2], R[4], R[5], R[6], R[8], R[9], R[10]]);
      const shift = [m.shiftX + (item.x || 0) * 2 * H / W, -((p.objY - (item.y || 0)) * 2 - 1)];
      const isMain = item === scene.main;
      const ex = isMain ? Math.max(0, m.explode) : 0;
      const cuts = scene.cuts;

      gl.useProgram(ART.p);
      const U = ART.u;
      gl.uniformMatrix4fv(U.uModel, false, model);
      gl.uniformMatrix4fv(U.uVP, false, VP);
      gl.uniformMatrix3fv(U.uNM, false, nm);
      gl.uniform3f(U.uCam, 0, 0, camD);
      gl.uniform2f(U.uShift, shift[0], shift[1]);
      gl.uniform2f(U.uSize, art.w / art.h, 1);
      gl.uniform1f(U.uThick, art.depthRatio * p.thickness);
      gl.uniform1f(U.uRim, m.rim * p.rim);
      gl.uniform4f(U.uCut, cuts.wings ? cuts.left : -1, cuts.wings ? cuts.right : 2, cuts.top, cuts.bottom);
      gl.uniform1f(U.uBottomV, cuts.base ? cuts.baseV : 2);
      gl.bindVertexArray(r.mesh.vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, r.depth); gl.uniform1i(U.uDepth, 0);
      const spread = p.spread;
      const drawSide = (side, region, off) => {
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, side > 0 ? r.color : r.back); gl.uniform1i(U.uColor, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, side > 0 ? r.normal : r.nback); gl.uniform1i(U.uNormal, 2);
        gl.uniform1f(U.uSide, side);
        gl.uniform1i(U.uRegion, region);
        gl.uniform3f(U.uOff, off[0] * ex * spread, off[1] * ex * spread, off[2] * ex * spread);
        gl.drawElements(gl.TRIANGLES, r.mesh.count, gl.UNSIGNED_INT, 0);
      };
      if (ex < 1e-4) {
        drawSide(1, 0, [0, 0, 0]);
        drawSide(-1, 0, [0, 0, 0]);
      } else {
        for (const s of SHELL) {
          if (s.region === 2 && !cuts.wings) continue;
          if (s.region === 3 && !cuts.wings) continue;
          if (s.region === 4 && !cuts.base) continue;
          if (s.side) drawSide(s.side, s.region, s.off);
          else { drawSide(1, s.region, s.off); drawSide(-1, s.region, s.off); }
        }
      }
      gl.bindVertexArray(null);

      // 内部结构（爆炸图零件）：合拢时往中心收、缩小，被外壳吞进去
      const core = scene.core;
      if (isMain && ex > 0.02 && core.length) {
        gl.useProgram(CORE.p);
        gl.uniformMatrix4fv(CORE.u.uModel, false, model);
        gl.uniformMatrix4fv(CORE.u.uVP, false, VP);
        gl.uniform2f(CORE.u.uShift, shift[0], shift[1]);
        gl.bindVertexArray(quad.vao);
        const k = lerp(0.55, 1, smooth(clamp(ex, 0, 1)));
        gl.uniform1f(CORE.u.uAlpha, smooth(seg(ex, 0.05, 0.3)));
        core.forEach((part, i) => {
          const z = (core.length === 1 ? 0.1 : lerp(0.8, -0.6, i / (core.length - 1))) * spread;
          gl.uniform3f(CORE.u.uCenter, 0, part.y * k - 0.36 * z * ex, z * ex);
          gl.uniform2f(CORE.u.uHalf, part.hw * k * sc, part.hh * k * sc);
          gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, gpuPart(part)); gl.uniform1i(CORE.u.uColor, 1);
          gl.drawElements(gl.TRIANGLES, quad.count, gl.UNSIGNED_INT, 0);
        });
        gl.bindVertexArray(null);
      }
    }

    // 运动模糊：快门时间内多次采样取平均，只在快速运动时开
    function renderObject(scene, t, samples) {
      const shutter = 1 / 60;
      const item = itemAt(scene, t);
      const m0 = motion(scene, t), m1 = motion(scene, t - shutter);
      const fast = samples > 1 && item === scene.main && (Math.abs(m0.yaw - m1.yaw) > 1.2 || Math.abs(m0.explode - m1.explode) > 0.012);
      if (!fast) { drawArt(scene, item, m0); return glc; }
      ga.setTransform(1, 0, 0, 1, 0, 0);
      ga.globalCompositeOperation = 'source-over';
      ga.clearRect(0, 0, W, H);
      ga.globalCompositeOperation = 'lighter';
      ga.globalAlpha = 1 / samples;
      for (let i = 0; i < samples; i++) {
        drawArt(scene, item, motion(scene, t - shutter * i / samples));
        ga.drawImage(glc, 0, 0);
      }
      ga.globalAlpha = 1;
      ga.globalCompositeOperation = 'source-over';
      return acc;
    }

    // 背景：景深虚化后的全景图缓存
    let bgCache = { key: '', canvas: null };
    function blurredBackground(scene) {
      const img = scene.background;
      if (!img) return null;
      const key = `${scene.backgroundId}|${W}x${H}|${scene.params.blur}`;
      if (bgCache.key === key) return bgCache.canvas;
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const s = Math.max((H * 1.16) / ih, (W * 1.04) / iw);
      const c = document.createElement('canvas');
      c.width = Math.round(iw * s); c.height = Math.round(ih * s);
      const bg = c.getContext('2d');
      const px = Math.round(H * scene.params.blur / 100);
      if (px > 0) bg.filter = `blur(${px}px)`;
      bg.drawImage(img, -8, -8, c.width + 16, c.height + 16);
      bgCache = { key, canvas: c };
      return c;
    }

    function drawRoom(scene, t, m) {
      const p = scene.params, T = scene.timeline;
      g.fillStyle = scene.baseColor;
      g.fillRect(0, 0, W, H);
      const bg = blurredBackground(scene);
      if (bg) {
        // 镜头横移：翻转的同时推着整个展厅走
        const f = (0.5 - 0.5 * Math.cos(Math.PI * seg(t, 0, T.spinEnd + 0.3))) * p.pan;
        const range = Math.max(0, bg.width - W);
        const panPx = range * (p.panDir === 'rtl' ? 1 - f : f);
        const z = lerp(1.0, 1.06, easeInOut(seg(t, 0, T.endCard)));
        const tiltY = H * 0.05 * (1 - m.level) * Math.min(1, p.elevation / 22);
        g.save();
        g.translate(W / 2, H * 0.52);
        g.scale(z, z);
        g.translate(-W / 2, -H * 0.52);
        g.drawImage(bg, -panPx, H - bg.height + H * 0.06 + tiltY);
        g.restore();
      }
      // 关灯：只留主体
      const dim = smooth(seg(t, T.dimStart, T.dimEnd));
      g.fillStyle = `rgba(4,4,6,${0.24 + dim * p.dim})`;
      g.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H * p.objY;
      const rg = g.createRadialGradient(cx, cy, 0, cx, cy, H * 0.55);
      rg.addColorStop(0, `rgba(255,196,120,${0.05 + dim * 0.06})`);
      rg.addColorStop(1, 'rgba(255,196,120,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
      const vg = g.createRadialGradient(cx, H * 0.5, Math.min(W, H) * 0.35, cx, H * 0.5, Math.max(W, H) * 0.62);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, `rgba(0,0,0,${0.55 + dim * 0.25})`);
      g.fillStyle = vg;
      g.fillRect(0, 0, W, H);
    }

    // 地面倒影：离地越远越淡
    function drawReflection(scene, src, m, alpha) {
      const p = scene.params;
      const floorY = H * p.objY + layout(scene).objPx * 0.5 * (m.zoom / layout(scene).fit) + H * 0.055;
      if (floorY >= H || alpha <= 0.001) return;
      gr.setTransform(1, 0, 0, 1, 0, 0);
      gr.globalCompositeOperation = 'source-over';
      gr.clearRect(0, 0, W, H);
      gr.save();
      gr.translate(0, floorY * 2);
      gr.scale(1, -1);
      gr.filter = `blur(${Math.max(1, Math.round(H * 0.005))}px)`;
      gr.drawImage(src, 0, 0);
      gr.restore();
      gr.globalCompositeOperation = 'destination-in';
      const fg = gr.createLinearGradient(0, floorY, 0, floorY + H * 0.2);
      fg.addColorStop(0, 'rgba(0,0,0,1)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      gr.fillStyle = fg;
      gr.fillRect(0, 0, W, H);
      gr.globalCompositeOperation = 'source-over';
      g.globalAlpha = alpha;
      g.drawImage(refl, 0, 0);
      g.globalAlpha = 1;
    }

    function drawEndCard(scene, t) {
      const T = scene.timeline;
      const a = smooth(seg(t, T.endCard + 0.12, T.endCard + 0.45));
      g.fillStyle = scene.endColor;
      g.fillRect(0, 0, W, H);
      const unit = Math.min(H, W * 0.75);
      g.globalAlpha = a;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const f = scene.titleFont;
      g.fillStyle = scene.textColor;
      g.font = `${f.style === 'italic' ? 'italic ' : ''}${f.weight} ${Math.round(unit * 0.034)}px ${f.family}`;
      if ('letterSpacing' in g) g.letterSpacing = `${Math.round(unit * 0.012)}px`;
      const sub = (scene.subtitle || '').trim();
      g.fillText(scene.title || '', W / 2 + unit * 0.006, H * (sub ? 0.485 : 0.5));
      if (sub) {
        g.font = `400 ${Math.round(unit * 0.0125)}px "Helvetica Neue",Arial,${f.family}`;
        if ('letterSpacing' in g) g.letterSpacing = `${Math.round(unit * 0.006)}px`;
        g.globalAlpha = a * 0.62;
        g.fillText(sub, W / 2 + unit * 0.003, H * 0.535);
      }
      if ('letterSpacing' in g) g.letterSpacing = '0px';
      g.globalAlpha = 1;
    }

    function render(scene, t, opts = {}) {
      setSize(opts.width || W, opts.height || H);
      const T = scene.timeline;
      if (scene.params.titleOn && t >= T.endCard) { drawEndCard(scene, t); return out; }
      const m = motion(scene, t);
      drawRoom(scene, t, m);
      if (scene.main) {
        const src = renderObject(scene, t, opts.samples || 1);
        drawReflection(scene, src, m, scene.params.reflection * (1 - clamp(m.explode * 4, 0, 1)));
        g.drawImage(src, 0, 0);
      }
      return out;
    }

    return { render, setSize, canvas: out, motion, itemAt };
  }

  window.ZeroGEngine = { processArtifact, processExploded, suggestCoreParts, buildTimeline, createRenderer, loadImage, ART_H };
})();
