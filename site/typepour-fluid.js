/* Deterministic double-density liquid, shared by the worker and Node validation. */
(function (scope) {
  'use strict';
  const STEP = 1 / 120, FPS = 60, DURATION = 12;
  const CUP = Object.freeze({ x: 475, top: 450, bottom: 872, halfTop: 174, halfBottom: 151 });
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  class Liquid {
    constructor(options = {}) {
      this.count = options.count || 1360;
      this.pourEnd = 7.2;
      this.particles = [];
      this.stepIndex = 0;
      this.grid = new Map();
      this.neighbors = [];
    }
    emit(time) {
      const target = Math.floor(Math.max(0, Math.min(1, (time - .45) / (this.pourEnd - .45))) * this.count);
      while (this.particles.length < target) {
        const id = this.particles.length;
        const lane = hash(id + 1) - .5;
        this.particles.push({
          x: 332 + lane * 38 + 8 * Math.sin(time * 2.7), y: 62 + hash(id + 40) * 10,
          px: 0, py: 0, vx: 125 + lane * 20, vy: 75 + hash(id + 30) * 25,
          angle: hash(id + 70) * Math.PI * 2, spin: (hash(id + 20) - .5) * 4,
          blue: hash(id + 300) < .44
        });
      }
    }
    constrain(p) {
      if (p.y < CUP.top) return;
      const depth = Math.max(0, Math.min(1, (p.y - CUP.top) / (CUP.bottom - CUP.top)));
      const half = CUP.halfTop + (CUP.halfBottom - CUP.halfTop) * depth - 5;
      p.x = Math.max(CUP.x - half, Math.min(CUP.x + half, p.x));
      const floor = CUP.bottom - 7 - 8 * Math.pow((p.x - CUP.x) / CUP.halfBottom, 4);
      if (p.y > floor) p.y = floor;
    }
    step() {
      const time = ++this.stepIndex * STEP;
      this.emit(time);
      const ps = this.particles, h = 25, h2 = h * h;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.px = p.x; p.py = p.y;
        p.vy += 1120 * STEP;
        p.vx *= .9993; p.vy *= .9993;
        p.x += p.vx * STEP; p.y += p.vy * STEP;
        this.constrain(p);
      }
      // Symmetric positional pressure: no final target slots or independently animated layers.
      for (let iteration = 0; iteration < 2; iteration++) {
        this.grid.clear();
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i], key = Math.floor(p.x / h) + Math.floor(p.y / h) * 128;
          if (p.y < CUP.top) continue;
          let cell = this.grid.get(key);
          if (!cell) this.grid.set(key, cell = []);
          cell.push(i);
        }
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i], cx = Math.floor(p.x / h), cy = Math.floor(p.y / h);
          if (p.y < CUP.top) continue;
          let rho = 0, near = 0;
          const neighbors = this.neighbors; neighbors.length = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const cell = this.grid.get(cx + dx + (cy + dy) * 128);
            if (!cell) continue;
            for (let k = 0; k < cell.length; k++) {
              const j = cell[k]; if (i === j) continue;
              const q = ps[j], rx = q.x - p.x, ry = q.y - p.y, d2 = rx * rx + ry * ry;
              if (d2 >= h2 || d2 < .000001) continue;
              const distance = Math.sqrt(d2), weight = 1 - distance / h;
              rho += weight * weight; near += weight * weight * weight;
              neighbors.push(j, weight, rx / distance, ry / distance);
            }
          }
          const pressure = Math.max(-.5, rho - 3.4) * .48;
          const nearPressure = near * .9;
          let shiftX = 0, shiftY = 0;
          for (let k = 0; k < neighbors.length; k += 4) {
            const q = ps[neighbors[k]], weight = neighbors[k + 1];
            const amount = (pressure * weight + nearPressure * weight * weight) * .5;
            const dx = neighbors[k + 2] * amount, dy = neighbors[k + 3] * amount;
            q.x += dx; q.y += dy; shiftX -= dx; shiftY -= dy;
          }
          p.x += shiftX; p.y += shiftY;
        }
        for (const p of ps) this.constrain(p);
      }
      for (const p of ps) {
        const vx = (p.x - p.px) / STEP, vy = (p.y - p.py) / STEP;
        // Small viscosity removes granular bounce while preserving inflow momentum.
        const drag = p.y > CUP.top ? .991 : .999;
        p.vx = Math.max(-1100, Math.min(1100, vx)) * drag;
        p.vy = Math.max(-1100, Math.min(1100, vy)) * drag;
        const torque = (p.vx - vx * .8) * .007 - p.vy * .002;
        p.spin += (torque - p.spin) * .025;
        p.angle += (p.spin + (p.y < CUP.top ? .7 : 0)) * STEP;
      }
    }
    snapshot() {
      const frame = new Float32Array(this.particles.length * 3);
      this.particles.forEach((p, i) => { frame[i * 3] = p.x; frame[i * 3 + 1] = p.y; frame[i * 3 + 2] = p.angle; });
      return frame;
    }
  }
  scope.TypePourFluid = { Liquid, CUP, FPS, STEP, DURATION, hash };
  if (typeof module !== 'undefined') module.exports = scope.TypePourFluid;
})(typeof self === 'undefined' ? globalThis : self);
