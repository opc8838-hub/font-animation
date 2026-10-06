(() => {
  "use strict";

  // Type Garden engine. Drawing and motion are ported line for line from
  // Type Garden by Akshat Agarwal (type-garden.vercel.app, published source).
  // CellMotion changes: any canvas size (square 1080 stays identical), forced
  // line breaks per editor row, per-letter font/color, inline icons that grow
  // like letters, and a host-supplied canvas instead of a React component.
  // Coordinates are logical pixels: the short side of the composition is 1080.

  const PRESETS = [
    { id: "breathe", label: "呼吸", english: "Breathe", sub: "缓慢摇曳", T: 3000 },
    { id: "grow", label: "生长与凋谢", english: "Grow & wither", sub: "盛开后收回", T: 6000 },
    { id: "typed", label: "打字", english: "Typed", sub: "输入、剪断、重来", T: 5000 },
    { id: "wind", label: "阵风", english: "Gust", sub: "一阵风扫过", T: 4000 },
    { id: "reach", label: "追光", english: "Reach", sub: "花茎追随光点", T: 6000 },
    { id: "scatter", label: "散开", english: "Scatter", sub: "随机绽放后淡去", T: 6000 },
    { id: "visit", label: "访客", english: "Visitor", sub: "蝴蝶来访", T: 7000 }
  ];
  // name, background, flower, stem & leaf, flower line, type
  const PALETTES = [
    ["Rose noir", "玫瑰黑", "#000000", "#FF1400", "#3257FF", "#FFB4A8", "#FFFFFF"],
    ["Paper", "纸本", "#F3EEE4", "#FF3B1F", "#1C2B8F", "#FFD2C4", "#111111"],
    ["Midnight", "午夜", "#0D1B4C", "#FF5A4E", "#9FB4FF", "#FFD6CF", "#FFFFFF"],
    ["Citrus", "柑橘", "#0E1A12", "#FF8A00", "#1FA463", "#FFE2B8", "#FFF6E8"],
    ["Orchid", "兰紫", "#140A1F", "#E63CFF", "#2FB8A6", "#F9D1FF", "#FFFFFF"],
    ["Moss", "苔绿", "#133A2A", "#FFB7C5", "#7FD18B", "#FFFFFF", "#F6F1E7"],
    ["Tomato", "番茄", "#FF1400", "#FFF1E0", "#0B0B0B", "#FF1400", "#000000"],
    ["Butter", "奶油", "#FFE9A8", "#E4002B", "#0F5132", "#FFC2C2", "#1A1A1A"],
    ["Blush", "腮红", "#FAD4D8", "#C8102E", "#274690", "#FFE3E6", "#1A1A1A"],
    ["Mono", "黑白", "#000000", "#F2F2F2", "#6E6E6E", "#000000", "#FFFFFF"],
    ["Snow", "雪白", "#FFFFFF", "#FF1400", "#3257FF", "#FFB4A8", "#111111"],
    ["Mono light", "白黑", "#FFFFFF", "#1A1A1A", "#8A8A8A", "#FFFFFF", "#111111"]
  ].map(([name, zh, bg, flower, stem, line, text]) => ({ name, zh, bg, flower, stem, line, text }));

  const CJK = /[⺀-鿿가-힯豈-﫿＀-￯]/u;
  const DEFAULT_FACE = { family: '"STG Playfair Display",Georgia,serif', weight: 700, style: "normal" };
  const faceCss = (face, size) => `${face.style || "normal"} ${face.weight || 700} ${size}px ${face.family}`;

  class Garden {
    constructor(options = {}) {
      this.measure = document.createElement("canvas").getContext("2d");
      this.drawIcon = options.drawIcon || null;
      this.letters = []; this.uid = 1; this.cache = {}; this.Sd = 0; this.St = 0; this.wrapped = false;
      this.t0 = performance.now(); this.lastKey = 0; this.rand = Math.random;
      this.fa = {}; this.mx = null; this.my = null; this.flies = []; this.perch = [];
      this.density = 1; this.flowers = 1; this.tracking = 0; this.face = DEFAULT_FACE;
      this.W = 1080; this.H = 1080;
    }

    // ---------- math ----------
    h(n) { const x = Math.sin(n) * 43758.5453; return x - Math.floor(x); }
    spr(t, k = 7, w = 16) { if (t <= 0) return 0; return 1 - Math.exp(-t * k) * Math.cos(t * w); }
    eo(t) { if (t <= 0) return 0; if (t >= 1) return 1; return 1 - Math.pow(1 - t, 3); }
    eb(t) { if (t <= 0) return 0; if (t >= 1) return 1; const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
    rng(seed) {
      let s = seed | 0;
      return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }
    bez(a, b, c, d, n) {
      const P = [];
      for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t;
        P.push([u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c[0] + t*t*t*d[0], u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c[1] + t*t*t*d[1]]); }
      return P;
    }
    at(P, u) {
      const n = P.length; const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
      return [P[i], Math.atan2(P[i+1][1] - P[i-1][1], P[i+1][0] - P[i-1][0])];
    }
    jit(id, f, amp) {
      if (!amp) return [0, 0, 0];
      return [(this.h(id*1.37 + f*7.13)*2 - 1)*amp, (this.h(id*2.71 + f*3.11)*2 - 1)*amp, (this.h(id*5.3 + f*1.7)*2 - 1)*0.035];
    }
    path(c, p, closed) {
      const n = p.length; if (n < 2) return;
      const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (closed) {
        const s = m(p[n-1], p[0]); c.moveTo(s[0], s[1]);
        for (let i = 0; i < n; i++) { const q = m(p[i], p[(i+1) % n]); c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
        c.closePath();
      } else {
        c.moveTo(p[0][0], p[0][1]);
        for (let i = 1; i < n - 1; i++) { const q = m(p[i], p[i+1]); c.quadraticCurveTo(p[i][0], p[i][1], q[0], q[1]); }
        c.lineTo(p[n-1][0], p[n-1][1]);
      }
    }
    backend(g, timeSeconds = 0) {
      return {
        fill: (p, col) => { g.beginPath(); this.path(g, p, true); g.fillStyle = col; g.fill(); },
        stroke: (p, col, w) => { g.beginPath(); this.path(g, p, false); g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); },
        rect: (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); },
        text: (l, x, y, S, col) => {
          if (l.icon) { if (this.drawIcon) this.drawIcon(g, l.icon, x + (l.icon.x || 0) / 100 * S, y - 0.36 * S + (l.icon.y || 0) / 100 * S, S * (l.icon.size || 80) / 100, col, timeSeconds); return; }
          g.font = faceCss(l.face || this.face, S); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = l.color || col; g.fillText(l.ch, x, y);
        }
      };
    }
    vine(base, dir, len, amp, waves, ph, bend, n) {
      n = n || 40; const P = [[base[0], base[1]]], step = len / n; let x = base[0], y = base[1];
      for (let i = 1; i <= n; i++) {
        const u = i / n, a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
        x += Math.cos(a) * step; y += Math.sin(a) * step; P.push([x, y]);
      }
      return P;
    }
    curl(P, sign, rad) {
      const n = P.length, e = P[n - 1], a = Math.atan2(e[1] - P[n - 2][1], e[0] - P[n - 2][0]);
      const c = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
      const a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
      for (let i = 1; i <= 14; i++) { const u = i / 14, t = a0 + sign * u * Math.PI * 1.6, rr = rad * (1 - 0.5 * u); P.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]); }
      return P;
    }
    weave(r, startLayer) {
      const cuts = []; const nc = 1 + Math.floor(r() * 3);
      for (let i = 0; i < nc; i++) cuts.push(0.15 + r() * 0.7);
      cuts.sort((a, b) => a - b);
      const segs = []; let u0 = 0, layer = startLayer;
      for (const c of cuts) {
        if (c <= u0) continue;
        segs.push({ u0, u1: c, layer });
        if (r() < 0.3) { const g = 0.02 + r() * 0.03; u0 = Math.min(0.98, c + g); } else u0 = c;
        layer = 1 - layer;
      }
      segs.push({ u0, u1: 1, layer });
      return segs;
    }
    layerAt(segs, u) { for (const s of segs) if (u >= s.u0 && u <= s.u1) return s.layer; return segs[segs.length - 1].layer; }

    // ---------- measuring ----------
    mw(ch, face = this.face) {
      const key = faceCss(face, 100) + "|" + ch;
      if (this.cache[key] != null) return this.cache[key];
      this.measure.font = faceCss(face, 100);
      let w = this.measure.measureText(ch).width / 100;
      if (ch === " ") w *= 1.4;
      return (this.cache[key] = w);
    }
    // letter advance in units of the type size; icons grow like letters
    lw(l) {
      if (l.icon) return Math.max(0.1, (l.icon.size || 80) / 100 + 2 * (l.icon.gap || 0) / 100);
      return this.mw(l.ch, l.face || this.face) + (l.track ?? this.tracking ?? 0);
    }
    clearCache() { this.cache = {}; }

    // ---------- layout ----------
    // sets tx/ty/tw on letters; keeps headroom for the garden above and below the type.
    // Letters with .br start a new forced line (one per editor row); CJK characters and
    // icons are their own words so long Chinese lines can still wrap.
    layoutCore(A, W, H, prevWrapped) {
      const maxW = W * 0.8, S0 = H * 0.28, LH = 2.1;
      const ws = A.map(l => this.lw(l));
      const rows = [[]];
      A.forEach((l, i) => { if (l.br && rows[rows.length - 1].length) rows.push([]); rows[rows.length - 1].push(i); });
      const rowWords = rows.map(ri => {
        const words = []; let cur = null;
        ri.forEach(i => {
          const l = A[i];
          if (l.ch === " ") { if (cur) { words.push(cur); cur = null; } words.push({ sp: true, idx: [i] }); }
          else if (l.icon || CJK.test(l.ch)) { if (cur) { words.push(cur); cur = null; } words.push({ idx: [i] }); }
          else { if (!cur) cur = { idx: [] }; cur.idx.push(i); }
        });
        if (cur) words.push(cur);
        return words;
      });
      const lineW = (li, S) => { let e = li.length; while (e > 0 && A[li[e-1]].ch === " ") e--; let w = 0; for (let k = 0; k < e; k++) w += ws[li[k]]; return w * S; };
      const wrapRow = (words, S) => {
        const lines = [[]]; let lw = 0;
        for (const w of words) {
          const ww = w.idx.reduce((s, i) => s + ws[i], 0) * S;
          if (!w.sp && lw > 0 && lw + ww > maxW) { lines.push([]); lw = 0; }
          lines[lines.length - 1].push(...w.idx); lw += ww;
        }
        return lines;
      };
      const wrap = S => rowWords.flatMap(words => wrapRow(words, S));
      let lines = rows.map(ri => ri.slice());
      const unit = Math.max(0, ...lines.map(li => lineW(li, 1)));
      let S = unit > 0 ? Math.min(S0, maxW / unit) : S0;
      S = Math.min(S, H * 0.82 / (lines.length * LH));
      const multi = rowWords.some(words => words.filter(w => !w.sp).length > 1);
      let wrapped = multi && (S < H * 0.1 || (prevWrapped && S < H * 0.14));
      if (wrapped) {
        let lo = H * 0.03, hi = H * 0.15;
        for (let k = 0; k < 22; k++) {
          const mid = (lo + hi) / 2, ls = wrap(mid);
          const ok = ls.every(li => lineW(li, mid) <= maxW) && ls.length * LH * mid <= H * 0.82;
          if (ok) lo = mid; else hi = mid;
        }
        S = lo; lines = wrap(S);
        if (lines.length <= rows.length) wrapped = false;
      }
      const n = lines.length, lh = LH * S;
      lines.forEach((li, k) => {
        let x = W / 2 - lineW(li, S) / 2;
        const y = H / 2 + (k - (n - 1) / 2) * lh + 0.33 * S;
        li.forEach(i => { const l = A[i], w = ws[i] * S; l.tx = x + w / 2; l.ty = y; l.tw = w; l.line = k; x += w; });
      });
      return { S, wrapped, n };
    }
    layout(snap) {
      if (!this.W) return;
      const A = this.letters.filter(l => !l.dead);
      const res = this.layoutCore(A, this.W, this.H, this.wrapped);
      this.wrapped = res.wrapped;
      A.forEach(l => { if (l.x == null) { l.x = l.tx; l.y = l.ty; } });
      const S = res.S, last = A[A.length - 1];
      this.St = S;
      this.ctx_ = last ? last.tx + last.tw / 2 + 0.07 * S : this.W / 2;
      this.cty = last ? last.ty - 0.33 * S : this.H / 2;
      if (snap || !this.Sd) { this.Sd = S; this.cx = this.ctx_; this.cy = this.cty; A.forEach(l => { l.x = l.tx; l.y = l.ty; }); }
    }

    // ---------- live typing ----------
    setSize(W, H) { this.W = W; this.H = H; this.layout(true); }
    liveText() { return this.letters.filter(l => !l.dead).map(l => l.ch).join("").trim(); }
    wither(now) {
      const A = this.letters.filter(l => !l.dead), last = A[A.length - 1];
      if (!last) return;
      last.dead = now;
      const pv = A[A.length - 2];
      if (pv && pv.ch !== " ") { pv.cut = null; pv.endEls = null; pv.tb = now; }
      this.layout();
    }
    clear() { this.letters = []; this.layout(); }
    add(ch, now) {
      const A = this.letters.filter(l => !l.dead), last = A[A.length - 1];
      if (ch === " ") {
        if (last && last.ch !== " ") { last.cut = now; this.genEnd(last, now - last.birth); }
        this.letters.push({ ch: " ", id: this.uid++, birth: now, els: [] });
        this.layout(); return;
      }
      const same = last && last.ch !== " ";
      const l = { ch, id: this.uid++, birth: now, tb: now, ws: same ? last.ws : Math.floor(this.rand() * 1e9), wi: same ? last.wi + 1 : 0, prev: same ? last : null };
      this.gen(l);
      this.letters.push(l);
      this.layout();
    }
    spawnFly(cx, cy) {
      if (this.flies.length >= 6) { const o = this.flies.find(f => f.st !== "leave"); if (o) this.flyOff(o); }
      const taken = new Set(this.flies.filter(f => f.st !== "leave").map(f => f.pid));
      let best = null, bd = 1e9;
      for (const p of this.perch) { if (taken.has(p.id)) continue; const d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = p; } }
      const left = cx < this.W / 2, sz = Math.max(9, this.Sd * 0.09);
      this.flies.push({ x: left ? -40 : this.W + 40, y: cy + (Math.random() - 0.5) * this.H * 0.4, vx: 0, vy: 0,
        st: best ? "fly" : "wander", pid: best ? best.id : null, hx: cx, hy: cy, t0: performance.now(), ph: Math.random() * 6, sz, seed: Math.random() * 100, ang: 0 });
    }
    flyOff(f) { f.st = "leave"; f.pid = null; f.ex = f.x < this.W / 2 ? -80 : this.W + 80; f.ey = f.y - this.H * 0.3; }
    drawFlies(B, now, C) {
      const dt = Math.min(48, now - (this._fl || now)); this._fl = now;
      const byId = {}; for (const p of this.perch) byId[p.id] = p;
      this.flies = this.flies.filter(f => {
        const t = (now - f.t0) / 1000;
        let tx, ty;
        if (f.st === "sit" || f.st === "fly") {
          const p = byId[f.pid];
          if (!p) { this.flyOff(f); }
          else { tx = p.x + p.R * 0.05; ty = p.y - p.R * 0.55; }
        }
        if (f.st === "wander") {
          tx = f.hx + Math.sin(t * 1.3 + f.seed) * 70; ty = f.hy + Math.sin(t * 2.1 + f.seed) * 40;
          if (t > 3.5) this.flyOff(f);
        }
        if (f.st === "leave") { tx = f.ex; ty = f.ey; }
        if (f.st === "sit") {
          f.x += (tx - f.x) * 0.35; f.y += (ty - f.y) * 0.35; f.ang *= 0.85;
          f.ph += dt * 0.004;
          const burst = Math.sin(now / 1000 * 0.9 + f.seed) > 0.75;
          f.open = burst ? 0.2 + 0.8 * Math.abs(Math.cos(now / 1000 * 9 + f.seed)) : 0.25 + 0.15 * Math.sin(f.ph);
        } else {
          const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1, sp = f.st === "leave" ? 0.42 : Math.min(0.34, 0.06 + d * 0.0016);
          const flut = Math.sin(t * 7 + f.seed) * 0.12, wob = Math.cos(t * 4.3 + f.seed) * 0.1;
          const ax = (dx / d * sp + wob) - f.vx, ay = (dy / d * sp + flut) - f.vy;
          f.vx += ax * 0.06 * dt / 16; f.vy += ay * 0.06 * dt / 16;
          f.x += f.vx * dt; f.y += f.vy * dt + Math.sin(t * 13 + f.seed) * 0.6;
          f.ang += (Math.max(-0.5, Math.min(0.5, f.vx * 1.4)) - f.ang) * 0.1;
          f.open = Math.abs(Math.cos(t * 17 + f.seed));
          if (f.st === "fly" && d < 5) { f.st = "sit"; f.ph = 0; }
          if (f.st === "leave" && (f.x < -60 || f.x > this.W + 60 || f.y < -60)) return false;
        }
        this.butterfly(B, f.x, f.y, f.sz, f.ang, f.open, C);
        return true;
      });
    }
    butterfly(B, x, y, s, ang, o, C) {
      const ca = Math.cos(ang), sa = Math.sin(ang), T = (px, py) => [x + (px * ca - py * sa) * s, y + (px * sa + py * ca) * s];
      const wing = (cx, cy, rx, ry, a, side) => {
        const pts = [], c = Math.cos(a), sn = Math.sin(a);
        for (let k = 0; k < 22; k++) { const th = k / 22 * Math.PI * 2, r = 1 + 0.08 * Math.sin(th * 3), lx = Math.cos(th) * rx * r, ly = Math.sin(th) * ry * r; pts.push(T(side * (cx + lx * c - ly * sn) * (0.12 + 0.88 * o), cy + lx * sn + ly * c)); }
        return pts;
      };
      for (const sd of [-1, 1]) {
        B.fill(wing(0.46, 0.28, 0.36, 0.3, 0.5 * sd * sd, sd), C.text);
        B.fill(wing(0.55, -0.32, 0.55, 0.36, -0.55, sd), C.text);
        if (o > 0.35) B.fill(wing(0.66, -0.4, 0.13, 0.11, 0, sd), C.red);
      }
      const body = []; for (let k = 0; k < 18; k++) { const th = k / 18 * Math.PI * 2; body.push(T(Math.cos(th) * 0.08, Math.sin(th) * 0.48)); }
      B.fill(body, C.blue);
      const lw = Math.max(0.8, s * 0.05);
      B.stroke([T(0, -0.42), T(-0.14, -0.72), T(-0.24, -0.86)], C.blue, lw);
      B.stroke([T(0, -0.42), T(0.14, -0.72), T(0.24, -0.86)], C.blue, lw);
    }
    faceTurn(e, x, y) {
      let wx = 0, wy = 0;
      if (this.mx != null) {
        const dx = this.mx - x, dy = this.my - y, d = Math.hypot(dx, dy), reach = 300;
        if (d < reach && d > 0.001) {
          const w = 1 - d / reach, s = w * w * (3 - 2 * w) * Math.min(1, d / 40);
          wx = dx / d * s; wy = dy / d * s;
        }
      }
      const c = this.fa[e.id] || [0, 0];
      c[0] += (wx - c[0]) * 0.09; c[1] += (wy - c[1]) * 0.09;
      this.fa[e.id] = c;
      return c;
    }
    // one live frame: ease towards the layout, drop withered letters, paint
    liveFrame(g, now, C, opts = {}) {
      const dt = Math.min(64, now - (this.lt || now)); this.lt = now;
      const k = 1 - Math.exp(-dt / 80);
      this.Sd += (this.St - this.Sd) * k;
      this.cx += (this.ctx_ - this.cx) * k; this.cy += (this.cty - this.cy) * k;
      for (const l of this.letters) if (!l.dead && l.tx != null) { l.x += (l.tx - l.x) * k; l.y += (l.ty - l.y) * k; }
      this.letters = this.letters.filter(l => !(l.dead && now - l.dead > 300));
      this.livePaint(g, now, C, opts);
    }
    livePaint(g, now, C, opts = {}) {
      const B = opts.backend || this.backend(g, now / 1000), st = { letters: this.letters, S: this.Sd, C, boil: opts.boil ?? true, recoil: opts.recoil ?? 20, textFront: !!opts.textFront, speed: 1, wither: 260, face: true };
      const count = (v, max) => Math.max(1, Math.min(max, v | 0 || 1));
      let lights = null;
      if (opts.lightOn) {
        lights = this.lightsAt(now % 6000, 6000, this.W, this.H, count(opts.lights, 4));
        st.warp = this.lightWarp(lights, this.Sd, Math.min(this.W, this.H) / 1080);
        st.rotw = this.lightRot(lights);
      }
      this.render(B, now, st);
      if (lights) this.drawLights(B, lights, this.Sd, C);
      if (opts.flyOn) {
        const ps = this.perch.slice().sort((a, b) => a.x - b.x), n = count(opts.butterflies, 6);
        for (let k = 0; k < n; k++) this.flyAt(B, now % 7000, 7000, ps, this.W, this.H, this.Sd, C, k, n);
      }
      this.drawFlies(B, now, C);
      if (opts.caret) {
        const S = this.Sd, on = now - this.lastKey < 500 || Math.floor(now / 530) % 2 === 0, hf = this.eo((now - this.t0) / 600);
        if (on && hf > 0) { const h = 0.8 * S * hf, w = Math.max(2, S * 0.03); B.rect(this.cx - w / 2, this.cy - h / 2, w, h, C.text); }
      }
    }

    // ---------- growth ----------
    wordParams(ws) {
      const r = this.rng(ws * 7 + 13), dens = this.density ?? 1;
      return { roseP: 0.3 + r() * 0.3, leafy: (0.6 + r() * 0.8) * dens, dens, lean: (r() - 0.5) * 0.6, big: 0.85 + r() * 0.45, curvy: 0.8 + r() * 0.6, bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * dens), w: 0.5 };
    }
    grow(r, E, nid, p, o) {
      const tip = o.tip || (r() < p.roseP ? "rose" : r() < 0.45 ? "fan" : r() < 0.6 ? "leaf" : "curl");
      let P = o.pts || this.vine(o.base, o.dir, o.len, (0.35 + r() * 0.45) * p.curvy, 1 + r() * 1.6, r() * 6.28, (r() - 0.5) * 1.2, 40);
      if (tip === "curl") P = this.curl(P, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);
      const segs = this.weave(r, o.layer0 != null ? o.layer0 : (r() < 0.5 ? 0 : 1));
      const dur = Math.max(320, (o.len || 0.8) * 620);
      const thorns = []; const nt = Math.floor(r() * 2.5);
      for (let i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });
      E.push({ t: "stem", id: nid(), pts: P, segs, d0: o.d0, dur, w: o.depth ? 0.82 : 1, thorns });
      const nl = Math.floor(r() * 2.8 * p.leafy);
      let sd = r() < 0.5 ? -1 : 1;
      for (let i = 0; i < nl; i++) {
        const u = 0.25 + r() * 0.6, [q, a] = this.at(P, u); sd = -sd;
        E.push({ t: "leaf", id: nid(), x: q[0], y: q[1], a: a + sd * (0.55 + r() * 0.5), L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1), bend: (r() - 0.5) * 1.2, layer: this.layerAt(segs, u), d0: o.d0 + dur * u });
      }
      const [tp, ta] = this.at(P, 1), td = o.d0 + dur * 0.8, tl = this.layerAt(segs, 1);
      if (tip === "rose") {
        const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
        // legibility: a rose sitting over the letter body mostly goes behind it
        const over = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
        const layer = over ? (r() < 0.22 ? 1 : 0) : (r() < 0.6 ? 1 : tl);
        E.push({ t: "rose", id: nid(), x: tp[0], y: tp[1], R, rot: (r() - 0.5) * 1.0, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r() * 1, layer, d0: td });
        if (r() < 0.2) { const oo = ta + (r() < 0.5 ? 1 : -1) * 1.3; E.push({ t: "rose", id: nid(), x: tp[0] + Math.cos(oo) * R * 1.4, y: tp[1] + Math.sin(oo) * R * 1.4, R: R * (0.6 + r() * 0.3), rot: (r() - 0.5) * 1.2, ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r(), layer, d0: td + 120 }); }
      } else if (tip === "fan") {
        const spread = 0.6 + r() * 0.3;
        for (let j = 0; j < 2; j++) E.push({ t: "leaf", id: nid(), x: tp[0], y: tp[1], a: ta + (j - 0.5) * spread, L: 0.2 + r() * 0.2, bend: (j - 0.5) * 0.8, layer: tl, d0: td + j * 60 });
      } else if (tip === "leaf") {
        E.push({ t: "leaf", id: nid(), x: tp[0], y: tp[1], a: ta + (r() - 0.5) * 0.3, L: 0.16 + r() * 0.16, bend: (r() - 0.5), layer: tl, d0: td });
      }
      if (!o.depth && r() < 0.3) {
        const u = 0.35 + r() * 0.35, [q, a] = this.at(P, u);
        this.grow(r, E, nid, p, { base: q, dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4), len: (o.len || 0.8) * (0.35 + r() * 0.2), d0: o.d0 + dur * u, depth: 1, layer0: this.layerAt(segs, u) });
      }
      return P;
    }
    // Fewer flowers: a hashed share of roses becomes a small leaf. At 1 nothing changes,
    // so the random sequence (and the original garden) stays identical.
    thin(E) {
      const keep = this.flowers ?? 1;
      if (keep >= 1) return E;
      return E.map(e => e.t !== "rose" || this.h(e.id * 3.17 + 0.5) < keep ? e
        : { t: "leaf", id: e.id, x: e.x, y: e.y, a: -Math.PI / 2 + (this.h(e.id * 1.9) - 0.5) * 1.2, L: 0.13 + this.h(e.id * 2.3) * 0.08, bend: this.h(e.id * 4.1) - 0.5, layer: e.layer, d0: e.d0 });
    }
    gen(l) {
      const r = this.rng((l.ws ^ Math.imul(l.wi + 1, 2654435761)) + Math.floor(this.rand() * 1e6));
      const p = this.wordParams(l.ws), E = []; let k0 = 0; const nid = () => l.id * 100 + (k0++);
      const w = this.lw(l), inX = () => (r() - 0.5) * w * 0.7; p.w = w;
      const nUp = 1 + (r() < 0.45 * p.dens ? 1 : 0);
      for (let i = 0; i < nUp; i++) {
        this.grow(r, E, nid, p, { base: [inX(), -r() * 0.3], dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7, len: 0.6 + r() * 0.5, d0: 40 + i * 130, tip: l.wi === 0 && i === 0 ? "rose" : null });
      }
      if (r() < 0.4 * p.dens) this.grow(r, E, nid, p, { base: [inX(), -0.1 - r() * 0.35], dir: Math.PI / 2 + (r() - 0.5) * 0.8, len: 0.35 + r() * 0.35, d0: 160 });
      if (l.prev && r() < p.bridgeP) {
        const px = -(this.lw(l.prev) + w) / 2;
        const a = [inX(), -0.05 - r() * 0.55], b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
        const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4), dx = b[0] - a[0];
        let P = this.bez(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b, 40);
        if (r() < 0.45) P = P.slice(0, Math.floor(P.length * (0.7 + r() * 0.2)));
        this.grow(r, E, nid, p, { pts: P, len: Math.abs(dx) + Math.abs(bulge), d0: 90, tip: r() < 0.5 ? "curl" : r() < 0.5 ? "leaf" : "rose" });
      }
      if (l.wi === 0) this.grow(r, E, nid, p, { base: [-w * 0.3, -0.15 - r() * 0.4], dir: Math.PI + (r() - 0.5) * 1.2, len: 0.45 + r() * 0.3, d0: 120, tip: "curl" });
      l.els = this.thin(E);
      l.endEls = null;
      const T = [], tr = this.rng(l.id * 977 + Math.floor(this.rand() * 1e6));
      this.grow(tr, T, () => l.id * 100 + 90 + T.length, p, { base: [w * 0.25, -0.1 - tr() * 0.45], dir: (tr() - 0.5) * 1.4, len: 0.45 + tr() * 0.25, d0: 0, tip: "curl", depth: 1 });
      l.tend = T.filter(e => e.t === "stem").slice(0, 1);
    }
    genEnd(l, rel) {
      const r = this.rng(l.ws + l.wi * 31 + Math.floor(this.rand() * 1e6)), p = this.wordParams(l.ws), E = [];
      let k0 = 50; const nid = () => l.id * 100 + (k0++);
      const w = this.lw(l), n = 1 + Math.floor(r() * 2.5); p.w = w;
      for (let i = 0; i < n; i++) {
        const dir = -Math.PI / 2 + 0.6 + (i - (n - 1) / 2) * 0.9 + (r() - 0.5) * 0.4;
        this.grow(r, E, nid, p, { base: [(r() - 0.2) * w * 0.6, -r() * 0.5], dir, len: 0.4 + r() * 0.45, d0: rel + 40 + i * 90, depth: 1, tip: i === 0 || r() < 0.5 ? "rose" : "fan" });
      }
      l.endEls = this.thin(E);
    }

    strokeRange(B, P, a, b, col, w) {
      const n = P.length - 1, ia = a * n, ib = b * n;
      const lerp = t => { const i = Math.min(n - 1, Math.floor(t)), f = t - i; return [P[i][0] + (P[i+1][0] - P[i][0]) * f, P[i][1] + (P[i+1][1] - P[i][1]) * f]; };
      const pts = [lerp(ia)];
      for (let i = Math.floor(ia) + 1; i < ib; i++) pts.push(P[i]);
      pts.push(lerp(ib));
      if (pts.length >= 2) B.stroke(pts, col, w);
    }
    thorn(B, P, u, s, S) {
      const [p, a] = this.at(P, u), d = a + s * 2.3, L = S * 0.045;
      B.stroke([p, [p[0] + Math.cos(d) * L, p[1] + Math.sin(d) * L]], this.cc.blue, S * 0.022);
    }
    leaf(B, bx, by, a, L, bend) {
      if (L < 0.5) return;
      const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
      const ax = u => { const b = Math.sin(Math.PI * u) * bend * 0.15 * L; return [bx + ca * u * L + px * b, by + sa * u * L + py * b]; };
      const hw = u => L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));
      const N = 12, s1 = [], s2 = [];
      for (let i = 0; i <= N; i++) { const u = i / N, c = ax(u), w = hw(u); s1.push([c[0] + px * w, c[1] + py * w]); s2.push([c[0] - px * w, c[1] - py * w]); }
      const tip = ax(1), base = ax(0);
      B.fill([base, ...s1.slice(1, N), tip, tip, ...s2.slice(1, N).reverse(), base], this.cc.blue);
      if (L > 6) { const v = []; for (let i = 0; i <= 8; i++) v.push(ax(0.08 + 0.72 * i / 8)); B.stroke(v, this.cc.vein, Math.max(0.8, L * 0.03)); }
    }
    rose(B, cx, cy, R, rot, e, a, tl) {
      const cr = Math.cos(rot), sr = Math.sin(rot);
      const tm = tl ? Math.hypot(tl[0], tl[1]) : 0, ux = tm ? tl[0] / tm : 0, uy = tm ? tl[1] / tm : 0, sq = -0.28 * tm;
      const T = (x, y, z = 0) => {
        let dx = x * cr - y * sr, dy = x * sr + y * cr;
        if (tm) { const k = (dx * ux + dy * uy) * sq; dx += k * ux + tl[0] * R * z; dy += k * uy + tl[1] * R * z; }
        return [cx + dx, cy + dy];
      };
      // petals, back to front: [cx, cy, rx, ry, angle, depth, edge]
      const P = [
        [0, -0.36, 0.56, 0.54, 0, 0, 0],
        [-0.5, -0.06, 0.6, 0.6, -0.35, 0, 0],
        [0.52, -0.06, 0.6, 0.6, 0.35, 0, 0],
        [-0.42, 0.3, 0.62, 0.48, 0.2, 0.12, 1],
        [0.47, 0.3, 0.62, 0.48, -0.2, 0.12, 1],
        [0.05, 0.42, 0.56, 0.38, 0, 0.14, 0]
      ];
      const ax0 = 0, ay0 = 0.5, lw = Math.max(0.8, R * 0.045), st = 85;
      P.forEach((q, i) => {
        const s = this.spr((a - i * st) / 1000, 8, 14); if (s <= 0.001) return;
        const open = (1 - Math.min(1, s)) * (q[0] < 0 ? 0.5 : -0.5), ang = q[4] + open, ca = Math.cos(ang), sa = Math.sin(ang);
        const pt = (th, j) => {
          const rr = 1 + 0.08 * Math.sin(3 * th + e.ph1 + i) + 0.04 * Math.sin(5 * th + e.ph2);
          const lx = Math.cos(th) * q[2] * rr, ly = Math.sin(th) * q[3] * rr;
          const px = q[0] + lx * ca - ly * sa, py = q[1] + lx * sa + ly * ca;
          return T((ax0 + (px - ax0) * s) * R, (ay0 + (py - ay0) * s) * R, q[5]);
        };
        const pts = []; for (let k = 0; k < 26; k++) pts.push(pt(k / 26 * Math.PI * 2));
        B.fill(pts, this.cc.red);
        if (q[6] && R >= 12 && s > 0.4) {
          const arc = []; for (let k = 0; k <= 14; k++) arc.push(pt(Math.PI * (1.18 + 0.64 * k / 14)));
          this.strokeRange(B, arc, 0, Math.min(1, (s - 0.4) / 0.5), this.cc.line, lw * 0.8);
        }
      });
      const fr = this.eo((a - P.length * st - 80) / 520);
      if (fr > 0 && R > 3) {
        const sp = [], scl = [];
        const turns = R < 20 ? Math.min(e.turns, 1.3) : R < 32 ? e.turns * 0.8 : e.turns;
        for (let i = 0; i <= 70; i++) { const u = i / 70, th = e.ph1 + u * turns * Math.PI * 2, rr = R * (0.08 + 0.57 * u); sp.push(T(Math.cos(th) * rr * 1.05, Math.sin(th) * rr * 0.72 - 0.12 * R, 0.34 - 0.24 * u)); }
        this.strokeRange(B, sp, 0, fr, this.cc.line, lw);
        if (R >= 14) {
          for (let i = 0; i <= 36; i++) { const u = i / 36; scl.push(T((-0.72 + 1.5 * u) * R, 0.36 * R + 0.16 * R * Math.abs(Math.sin(u * Math.PI * 3)), 0.18)); }
          this.strokeRange(B, scl, 0, fr, this.cc.line, lw);
        }
      }
    }

    // ---------- render (shared by live typing + poster) ----------
    render(B, now, st) {
      const S = st.S, L = st.letters, act = L.filter(l => !l.dead), sp = st.speed || 1;
      this.cc = st.C; this._now = now; if (st.face) this.perch = [];
      if (st.face) for (const l of L) {
        let tx = 0, ty = 0;
        if (this.mx != null && !l.dead && l.ch !== " ") {
          const dx = this.mx - l.x, dy = this.my - (l.y - S * 0.6), d = Math.hypot(dx, dy), reach = Math.max(260, S * 3.2);
          if (d < reach && d > 1) { const w = 1 - d / reach, s = w * w * (3 - 2 * w); tx = dx / d * s; ty = dy / d * s; }
        }
        const c = l.lean || (l.lean = [0, 0]);
        c[0] += (tx - c[0]) * 0.07; c[1] += (ty - c[1]) * 0.07;
      }
      const f = st.boil ? Math.floor(now / 120) : 0, amp = st.boil ? Math.max(0.8, S * 0.01) : 0;
      const kd = l => l.dead ? 1 - this.eo((now - l.dead) / st.wither) : 1;
      const draw = layer => {
        for (const l of L) {
          if (l.ch === " " || !l.els) continue;
          const age = (now - l.birth) * sp, kk = kd(l);
          const each = e => { if (e.t === "stem") this.drawStem(B, e, l, age, kk, st, f, amp, layer); else if ((st.textFront ? 0 : e.layer) === layer) this.drawEl(B, e, l, age, kk, st, f, amp); };
          l.els.forEach(each);
          if (l.endEls) l.endEls.forEach(each);
          const i = act.indexOf(l), nx = i >= 0 ? act[i + 1] : null;
          if (l.tend && (l.dead || !nx || nx.ch === " " || nx.br)) {
            let fr = this.eo(((now - l.tb) * sp - 150) / 450);
            if (l.cut != null) fr *= 1 - this.eo((now - l.cut) * sp / 150) * Math.min(0.85, st.recoil / (0.6 * S));
            for (const e of l.tend) this.drawStem(B, e, l, age, kk, st, f, amp, layer, fr * kk);
          }
        }
      };
      draw(0);
      for (const l of L) if (l.ch !== " " && (st.textAll || !l.dead)) B.text(l, l.x, l.y, S, st.C.text);
      draw(1);
    }
    wpt(st, l, x, y) {
      if (l.birth != null && this._now != null) {
        const t = (this._now - l.birth) * (st.speed || 1) / 1000;
        if (t > 0 && t < 2.5) {
          const hh = Math.max(0, (l.y - y) / st.S), dmp = Math.exp(-t * 3.2), dir = (l.id % 2 ? 1 : -1);
          x += st.S * 0.07 * hh * dmp * Math.sin(t * 11) * dir;
          y += st.S * 0.035 * hh * dmp * Math.sin(t * 11 + 1.2);
        }
      }
      if (st.face && l.lean) {
        const hh = Math.min(2.5, Math.max(0, (l.y - y) / st.S)), f = hh * hh * 0.5 + hh * 0.5;
        x += l.lean[0] * st.S * 0.1 * f;
        y += l.lean[1] * st.S * 0.05 * f;
      }
      return st.warp ? st.warp(x, y, l) : [x, y];
    }
    drawStem(B, e, l, age, kk, st, f, amp, layer, frO) {
      const S = st.S, fr = frO != null ? frO : this.eo((age - e.d0) / e.dur) * kk; if (fr <= 0) return;
      const j = this.jit(e.id, f, amp);
      const P = e.pts.map(p => this.wpt(st, l, l.x + p[0] * S + j[0], l.y + p[1] * S + j[1]));
      for (const sg of e.segs) {
        if ((st.textFront ? 0 : sg.layer) !== layer) continue;
        const b = Math.min(sg.u1, fr); if (b <= sg.u0) continue;
        this.strokeRange(B, P, sg.u0, b, st.C.blue, S * 0.022 * (e.w || 1));
      }
      for (const th of e.thorns) if (fr > th.u && (st.textFront ? 0 : this.layerAt(e.segs, th.u)) === layer) this.thorn(B, P, th.u, th.s, S);
    }
    drawEl(B, e, l, age, kk, st, f, amp) {
      const S = st.S, j = this.jit(e.id, f, amp), wx = (x, y) => this.wpt(st, l, l.x + x * S + j[0], l.y + y * S + j[1]);
      const rw = st.rotw ? st.rotw(e) : 0;
      if (e.t === "leaf") {
        const sc = this.spr((age - e.d0) / 1000, 7, 15) * kk; if (sc <= 0) return;
        const p = wx(e.x, e.y); this.leaf(B, p[0], p[1], e.a + j[2] + rw, e.L * S * sc, e.bend);
      } else if (e.t === "rose") {
        const a = age - e.d0; if (a < 0) return;
        if (kk <= 0.001) return;
        const p = wx(e.x, e.y), tl = st.face ? this.faceTurn(e, p[0], p[1]) : null;
        if ((st.face || st.perchOn) && !l.dead && a > 700) this.perch.push({ id: e.id, x: p[0], y: p[1], R: e.R * S * kk }); this.rose(B, p[0], p[1], e.R * S * kk, e.rot + j[2] + rw + (tl ? tl[0] * 0.22 : 0), e, a, tl);
      }
    }

    // ---------- poster ----------
    // spec: { letters: [{ ch, face?, color?, icon?, br? }], preset, seed, W, H, scale, offsetX, offsetY }
    buildPoster(spec) {
      const pr = PRESETS.find(p => p.id === spec.preset) || PRESETS[0];
      const W = spec.W || 1080, H = spec.H || 1080;
      this.rand = this.rng((spec.seed | 0) * 7919 + 1);
      const L = []; let prev = null, uid = 1;
      const src = (spec.letters || []).slice(0, 160);
      for (const item of src) {
        if (item.ch === " ") { const sp = { ch: " ", id: 9000 + uid++, els: [], br: item.br, track: item.track }; L.push(sp); prev = sp; continue; }
        const same = prev && prev.ch !== " " && !item.br;
        const l = { ch: item.ch, face: item.face, color: item.color, icon: item.icon, br: item.br, track: item.track, id: 9000 + uid++, ws: same ? prev.ws : Math.floor(this.rand() * 1e9), wi: same ? prev.wi + 1 : 0, prev: same ? prev : null };
        this.gen(l); L.push(l); prev = l;
      }
      const n = Math.max(1, L.length);
      const step = pr.id === "grow" ? Math.min(110, 3000 / n) : pr.id === "typed" ? Math.min(85, 3600 / n) : 0;
      const off = pr.id === "grow" ? 200 : pr.id === "typed" ? 300 : 0;
      L.forEach((l, i) => { l.b = off + i * step; });
      if (pr.id === "scatter") { const r = this.rng((spec.seed | 0) * 31 + 5); L.forEach(l => { l.b = 150 + r() * 2400; }); }
      const wd = Math.min(60, 900 / n);
      L.forEach((l, i) => {
        l.d = pr.id === "scatter" ? 4700 + i * 8 : 4200 + (n - 1 - i) * wd;
        const nx = L[i + 1];
        l.cutRel = null;
        if (pr.id !== "scatter" && l.ch !== " " && nx && (nx.ch === " " || nx.br)) { l.cutRel = Math.max(30, nx.b - l.b); this.genEnd(l, l.cutRel); }
      });
      this.rand = Math.random;
      const res = this.layoutCore(L, W, H, false);
      // fit the whole garden (not just the type) inside a 6% margin
      let S = res.S, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const addP = (l, x, y, r) => { const X = l.tx + x * S, Y = l.ty + y * S, R = (r || 0) * S; x0 = Math.min(x0, X - R); x1 = Math.max(x1, X + R); y0 = Math.min(y0, Y - R); y1 = Math.max(y1, Y + R); };
      for (const l of L) {
        if (l.ch === " ") continue;
        addP(l, -l.tw / S / 2, -0.75); addP(l, l.tw / S / 2, 0.1);
        const all = [...l.els, ...(l.endEls || [])];
        for (const e of all) {
          if (e.t === "stem") e.pts.forEach(q => addP(l, q[0], q[1], 0.02));
          else if (e.t === "leaf") addP(l, e.x, e.y, e.L);
          else addP(l, e.x, e.y, e.R * 1.15);
        }
      }
      // centre on the type itself; shrink just enough for the garden to clear the margins on every side
      let tx0 = 1e9, tx1 = -1e9, ty0 = 1e9, ty1 = -1e9;
      for (const l of L) if (l.ch !== " ") { tx0 = Math.min(tx0, l.tx - l.tw / 2); tx1 = Math.max(tx1, l.tx + l.tw / 2); ty0 = Math.min(ty0, l.ty - 0.72 * S); ty1 = Math.max(ty1, l.ty); }
      if (tx0 > tx1) { tx0 = tx1 = W / 2; ty0 = ty1 = H / 2; }
      const halfX = W * 0.44, halfY = H * 0.44, bcx = (tx0 + tx1) / 2, bcy = (ty0 + ty1) / 2;
      const k = Math.min(1.25, halfX / Math.max(1, bcx - x0, x1 - bcx), halfY / Math.max(1, bcy - y0, y1 - bcy)) * (spec.scale || 1);
      const ox = W / 2 + (spec.offsetX || 0) * W, oy = H / 2 + (spec.offsetY || 0) * H;
      L.forEach(l => { if (l.tx == null) return; l.tx = ox + (l.tx - bcx) * k; l.ty = oy + (l.ty - bcy) * k; l.tw *= k; l.x = l.tx; l.y = l.ty; });
      this.P = { letters: L, S: S * k, T: pr.T, preset: pr.id, W, H };
      return this.P;
    }
    // Rose perches at full bloom, fixed for the whole loop (butterflies as an add-on).
    staticPerches(P) {
      if (P.perches) return P.perches;
      const out = [];
      for (const l of P.letters) {
        if (l.ch === " " || l.tx == null) continue;
        for (const e of [...l.els, ...(l.endEls || [])]) if (e.t === "rose") out.push({ id: e.id, x: l.tx + e.x * P.S, y: l.ty + e.y * P.S, R: e.R * P.S });
      }
      if (!out.length) for (const l of P.letters) if (l.ch !== " " && l.tx != null) out.push({ id: l.id, x: l.tx, y: l.ty - 0.78 * P.S, R: P.S * 0.25 });
      return (P.perches = out.sort((a, b) => a.x - b.x));
    }
    posterFly(B, tt, P, C, k = 0, n = 1) {
      this.flyAt(B, tt, P.T, this.perch.slice().sort((a, b) => a.x - b.x), P.W, P.H, P.S, C, k, n);
    }
    // One visitor: in, perch, hop to a second flower, perch, out — stretched over a loop of T ms.
    // k = 0 with T = 7000 is the original Visitor butterfly; others are offset by k/n of the loop.
    flyAt(B, tt, T, ps, W, H, S, C, k = 0, n = 1) {
      if (!ps.length) return;
      const pick = f => ps[Math.min(ps.length - 1, Math.floor(ps.length * f))];
      const p1 = pick(k ? (0.25 + k * 0.618) % 1 : 0.25);
      let p2 = pick(k ? (0.75 + k * 0.382) % 1 : 0.75);
      if (k && p2 === p1 && ps.length > 1) p2 = ps[(ps.indexOf(p1) + 1) % ps.length];
      const zx = W / 1080, zy = H / 1080, flip = k % 2 === 1, dy = k ? ((k * 137) % 240 - 120) * zy : 0;
      const A = [(flip ? 1160 : -80) * zx, 300 * zy + dy], s1 = [p1.x, p1.y - p1.R * 0.55], s2 = [p2.x, p2.y - p2.R * 0.55], E = [(flip ? -80 : 1160) * zx, 260 * zy - dy];
      const sz = Math.max(12, S * 0.09) * (k ? 1 - 0.1 * (k % 3) : 1), eo = v => this.eo(Math.max(0, Math.min(1, v)));
      const local = (((tt + k * T / n) % T) + T) % T, t = T === 7000 ? local / 1000 : local / T * 7;
      const leg = (a, b, u, lift) => { const e = eo(u); return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e - Math.sin(e * Math.PI) * lift]; };
      const dir = (a, b) => b[0] >= a[0] ? 1 : -1;
      let p, flying = true, vx = 0;
      if (t < 1.8) { p = leg(A, s1, t / 1.8, 160); vx = dir(A, s1); }
      else if (t < 3.4) { p = s1; flying = false; }
      else if (t < 4.6) { p = leg(s1, s2, (t - 3.4) / 1.2, 140); vx = s2[0] > s1[0] ? 1 : -1; }
      else if (t < 5.8) { p = s2; flying = false; }
      else { p = leg(s2, E, (t - 5.8) / 1.2, 60); vx = dir(s2, E); }
      let o, ang;
      if (flying) { o = Math.abs(Math.cos(t * 17)); p = [p[0] + Math.sin(t * 7) * 6, p[1] + Math.sin(t * 13) * 4]; ang = vx * 0.3; }
      else { const burst = (t > 2.4 && t < 2.8) || (t > 5 && t < 5.3); o = burst ? 0.2 + 0.8 * Math.abs(Math.cos(t * 9)) : 0.3 + 0.1 * Math.sin(t * 3); ang = 0; }
      this.butterfly(B, p[0], p[1], sz, ang, o, C);
    }
    // Lights travel a figure-eight once per loop. Extra lights are offset by the golden angle:
    // even splits would meet at the figure-eight's crossing and hide each other.
    lightsAt(tt, T, W, H, n) {
      const ph = tt / T * Math.PI * 2;
      return Array.from({ length: n }, (_, k) => { const p = ph + k * 2.399963; return [W / 2 + Math.sin(p) * 430 * W / 1080, H / 2 + Math.sin(p * 2) * 260 * H / 1080]; });
    }
    lightWarp(lights, S, Z) {
      return (x, y, l) => {
        const hh = Math.min(2.5, Math.max(0, (l.y - y) / S)), f = hh * hh * 0.5 + hh * 0.5;
        let ox = 0, oy = 0;
        for (const [lx, ly] of lights) {
          const dx = lx - l.x, dy = ly - (l.y - S * 0.6), d = Math.hypot(dx, dy) || 1, w = Math.max(0, 1 - d / (560 * Z)), s = w * w * (3 - 2 * w);
          ox += dx / d * s * S * 0.12 * f; oy += dy / d * s * S * 0.06 * f;
        }
        return [x + ox, y + oy];
      };
    }
    lightRot(lights) { return e => lights.reduce((sum, [lx, ly]) => sum + Math.sin(Math.atan2(ly - e.y, lx - e.x)) * 0.15, 0) / lights.length; }
    drawLights(B, lights, S, C) {
      const r = S * 0.09;
      for (const [lx, ly] of lights) {
        const pts = [];
        for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2; pts.push([lx + Math.cos(a) * r, ly + Math.sin(a) * r]); }
        B.fill(pts, C.line);
      }
    }
    // t: poster milliseconds (wraps at the preset length). The caller paints the background.
    posterRender(B, t, C, opts = {}) {
      const P = this.P; if (!P) return;
      const W = P.W, H = P.H, cxm = W / 2, cym = H / 2, Z = Math.min(W, H) / 1080;
      const tt = ((t % P.T) + P.T) % P.T, L = P.letters;
      const st = { letters: L, S: P.S, C, boil: opts.boil ?? true, recoil: opts.recoil ?? 20, textFront: !!opts.textFront, speed: 1, wither: 600, textAll: true };
      const count = (v, max) => Math.max(1, Math.min(max, v | 0 || 1));
      const flyN = opts.flyOn ? count(opts.butterflies, 6) : 0, lightN = opts.lightOn ? count(opts.lights, 4) : 0;
      let blank = false;
      L.forEach(l => { l.x = l.tx; l.y = l.ty; l.dead = null; });
      const set = base => L.forEach(l => { l.birth = base + l.b; l.tb = l.birth; l.cut = l.cutRel != null ? l.birth + l.cutRel : null; });
      if (P.preset === "breathe") {
        set(-1e5);
        const ph = tt / P.T * Math.PI * 2, S = P.S;
        st.warp = (x, y, l) => { const h = Math.max(0, (l.y - y) / S); return [x + Math.sin(ph + l.x * 0.004 + h * 1.1) * S * 0.03 * h, y + Math.cos(ph + x * 0.003) * S * 0.008 * h]; };
        st.rotw = e => Math.sin(ph + e.id * 0.7) * 0.12;
      } else if (P.preset === "grow" || P.preset === "scatter") {
        set(0);
        L.forEach(l => { if (tt >= l.d) l.dead = l.d; });
      } else if (P.preset === "wind") {
        set(-1e5);
        const S = P.S, u = tt / P.T, front = -0.35 + u * 1.9;
        st.warp = (x, y, l) => {
          const hh = Math.max(0, (l.y - y) / S), d = l.x / W - front;
          const g = d < 0 ? Math.exp(d * 2.2) * Math.cos(-d * 9) : Math.exp(-d * d * 30);
          const idle = Math.sin(tt / 1000 * 1.6 + l.x / Z * 0.01) * 0.012;
          return [x + (g * 0.13 + idle) * S * hh * hh * 0.6 + (g * 0.13 + idle) * S * hh * 0.4, y + Math.abs(g) * 0.02 * S * hh];
        };
        st.rotw = e => { const d = e.x / W - front; return (d < 0 ? Math.exp(d * 2.2) * Math.cos(-d * 9) : Math.exp(-d * d * 30)) * 0.35; };
      } else if (P.preset === "reach") {
        set(-1e5);
        this._lights = this.lightsAt(tt, P.T, W, H, count(opts.lights, 4));
        st.warp = this.lightWarp(this._lights, P.S, Z);
        st.rotw = this.lightRot(this._lights);
      } else if (P.preset === "visit") {
        set(-1e5);
        st.perchOn = true; this.perch = [];
        const ph = tt / P.T * Math.PI * 2;
        st.warp = (x, y, l) => { const hh = Math.max(0, (l.y - y) / P.S); return [x + Math.sin(ph + l.x / Z * 0.004 + hh) * P.S * 0.015 * hh, y]; };
      } else {
        blank = tt >= 4400;
        if (blank && !flyN && !lightN) return;
        set(0);
        st.letters = L.filter(l => tt >= l.birth);
        st.textAll = false;
      }
      // Add-on lights bend the stems on top of whatever the base motion does.
      let lights = P.preset === "reach" ? this._lights : null;
      if (lightN && !lights) {
        lights = this.lightsAt(tt, P.T, W, H, lightN);
        const base = st.warp, baseRot = st.rotw, warp = this.lightWarp(lights, P.S, Z), rot = this.lightRot(lights);
        st.warp = (x, y, l) => { const q = base ? base(x, y, l) : [x, y]; return warp(q[0], q[1], l); };
        st.rotw = e => (baseRot ? baseRot(e) : 0) + rot(e);
      }
      if (!blank) this.render(B, tt, st);
      if (lights) this.drawLights(B, lights, P.S, st.C);
      if (P.preset === "visit") { const n = count(opts.butterflies, 6); for (let k = 0; k < n; k++) this.posterFly(B, tt, P, st.C, k, n); }
      else if (flyN) { const ps = this.staticPerches(P); for (let k = 0; k < flyN; k++) this.flyAt(B, tt, P.T, ps, W, H, P.S, st.C, k, flyN); }
      if (P.preset === "typed" && !blank) {
        const born = st.letters, last = born[born.length - 1], S = P.S;
        if (Math.floor(tt / 400) % 2 === 0 || (last && tt - last.birth < 300)) {
          const x = last ? last.tx + last.tw / 2 + 0.07 * S : cxm, y = last ? last.ty - 0.33 * S : cym, w = Math.max(2, S * 0.03), h = 0.8 * S;
          B.rect(x - w / 2, y - h / 2, w, h, st.C.text);
        }
      }
    }
  }

  window.TypeGarden = { Garden, PRESETS, PALETTES, DEFAULT_FACE, faceCss };
})();
