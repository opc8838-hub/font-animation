/* The exact Bot Voice flowing-block strip, with editable cards and scene controls. */
window.ArchiveMotionFactories ||= {};
window.ArchiveMotionFactories.blockflow = (cv, helpers) => {
const W=1080,H=1920,ctx=cv.getContext('2d');
let state,resources,HAND;
function bezier(x1, y1, x2, y2) {
  const cx = 3*x1, bx = 3*(x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3*y1, by = 3*(y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax*t + bx)*t + cx)*t, Y = t => ((ay*t + by)*t + cy)*t;
  return x => { let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; } return Y(t); };
}
const E = {
  inOut: bezier(0.65, 0, 0.35, 1), out: bezier(0.2, 0.7, 0.2, 1), soft: bezier(0.4, 0, 0.2, 1),
  zoom: bezier(0.45, 0, 0.12, 1),      // 镜头拉远：柔柔起步，再轻轻落定
  pop: bezier(0.3, 1.6, 0.5, 1),       // 弹一下
};
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, m) => a + (b - a) * m;
const seg = (f, t, a, b) => f(clamp((t - a) / (b - a)));
// 关键帧轨道（单调三次插值，速度连续）
function pchip(xs, ys, t) {
  const n = xs.length;
  if (t <= xs[0]) return ys[0];
  if (t >= xs[n - 1]) return ys[n - 1];
  let i = 0; while (t > xs[i + 1]) i++;
  const h = k => xs[k + 1] - xs[k], d = k => (ys[k + 1] - ys[k]) / h(k);
  const slope = k => {
    if (k === 0) return d(0);
    if (k === n - 1) return d(n - 2);
    const a = d(k - 1), b = d(k); if (a * b <= 0) return 0;
    const w1 = 2 * h(k) + h(k - 1), w2 = h(k) + 2 * h(k - 1); return (w1 + w2) / (w1 / a + w2 / b);
  };
  const hk = h(i), u = (t - xs[i]) / hk, m0 = slope(i) * hk, m1 = slope(i + 1) * hk, u2 = u * u, u3 = u2 * u;
  return (2*u3 - 3*u2 + 1) * ys[i] + (u3 - 2*u2 + u) * m0 + (-2*u3 + 3*u2) * ys[i + 1] + (u3 - u2) * m1;
}

const CIRCLE_REF=6.05;
function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.closePath();}
function offset(hex,r,g,b){const n=parseInt(hex.slice(1),16);return '#'+[[n>>16&255,r],[n>>8&255,g],[n&255,b]].map(([v,d])=>Math.min(255,Math.max(0,v+d)).toString(16).padStart(2,'0')).join('');}
const S4 = 2.1;   // 第三段原片像素 → 9:16 画面
const B_SW = bezier(0.10, 0.80, 0.70, 1.00), B_SH1 = bezier(0.00, 0.20, 0.00, 0.70), B_SH2 = bezier(0.35, 0.00, 1.00, 0.80), B_COL = bezier(0.45, 0.00, 0.55, 0.60);
const stripW = r => r < 5.5 ? 49 + 416 * seg(B_SW, r, 2.85, 4.2) : r < 5.9 ? 465 - 324 * seg(B_COL, r, 5.5, 5.9) : lerp(141, 58, seg(E.soft, r, 5.9, CIRCLE_REF));
const stripH = r => r < 4.4 ? 49 + 92 * seg(B_SH1, r, 2.85, 4.4) : r < 5.9 ? 141 - 92 * seg(B_SH2, r, 4.4, 5.9) : lerp(49, 58, seg(E.soft, r, 5.9, CIRCLE_REF));
const BLOCKS = () => Math.max(1,state.cards.length);
const PROFILE = [
  [2.85, [1, 1, 1, 1, 1, 1, 1, 1]], [2.93, [0.55, 0.8, 0.95, 1, 1, 0.95, 0.72, 0.5]], [3.13, [1, 0.85, 0.55, 0.35, 0.3, 0.55, 0.95, 0.9]],
  [3.33, [0.5, 0.3, 0.2, 0.2, 0.45, 0.75, 1, 1]], [3.6, [0.25, 0.3, 0.55, 0.85, 1, 0.95, 0.85, 0.6]], [3.93, [0.18, 0.4, 0.72, 0.92, 1, 0.93, 0.68, 0.4]],
  [4.2, [0.25, 0.5, 0.82, 1, 1, 0.88, 0.5, 0.15]], [4.53, [0.6, 0.95, 1, 1, 0.85, 0.45, 0.18, 0.12]], [4.8, [0.9, 1, 1, 0.8, 0.55, 0.35, 0.2, 0.4]],
  [5.13, [1, 0.85, 0.6, 0.42, 0.3, 0.32, 0.65, 0.85]], [5.4, [0.75, 0.55, 0.4, 0.35, 0.5, 0.75, 1, 1]], [5.6, [0.3, 0.35, 0.5, 0.7, 0.95, 1, 0.75, 0.5]],
  [5.9, [0.4, 0.8, 1, 1, 1, 1, 0.8, 0.4]], [5.97, [1, 1, 1, 1, 1, 1, 1, 1]],
];
const PROF_T = PROFILE.map(k => k[0]);
const profileAt = r => { const base=PROFILE[0][1].map((_, j) => pchip(PROF_T, PROFILE.map(k => k[1][j]), r)); const n=BLOCKS(); return Array.from({length:n},(_,i)=>{const u=n===1?3.5:i*7/(n-1),j=Math.min(6,Math.floor(u));return lerp(base[j],base[j+1],u-j);}); };
// 流体渐变：亮蓝底 + 左上斜光 + 白到浅蓝的光团（深蓝弧边）
const FLUID = document.createElement("canvas"), fx = FLUID.getContext("2d");
function paintFluid(w, h, p) {
  if (FLUID.width !== w || FLUID.height !== h) { FLUID.width = w; FLUID.height = h; }
  const g = fx, m = Math.min(w, h);
  g.filter = "none";
  const base = g.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, offset(HAND,24,20,1)); base.addColorStop(0.5, HAND); base.addColorStop(1, offset(HAND,19,17,1));
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.filter = `blur(${(m * 0.06).toFixed(1)}px)`;
  g.save(); g.translate(w * p.streakX, h * 0.06); g.rotate(-0.38);
  g.fillStyle = "rgba(185,205,255,0.6)"; g.beginPath(); g.ellipse(0, 0, w * 0.75, m * 0.13, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.fillStyle = "rgba(40,80,235,0.3)"; g.beginPath(); g.ellipse(w * 0.45, h * 0.55, w * 0.35, h * 0.3, 0, 0, Math.PI * 2); g.fill();
  const lx = w * p.lx, ly = h * p.ly, lr = m * p.lr;
  g.filter = `blur(${(m * 0.025).toFixed(1)}px)`;
  g.strokeStyle = "rgba(38,78,232,0.9)"; g.lineWidth = m * 0.05;
  g.beginPath(); g.arc(lx, ly, lr * 1.02, 0, Math.PI * 2); g.stroke();
  g.filter = `blur(${(m * 0.035).toFixed(1)}px)`;
  const r = g.createRadialGradient(lx - lr * 0.2, ly + lr * 0.15, lr * 0.1, lx, ly, lr);
  r.addColorStop(0, "rgba(246,250,255,0.98)"); r.addColorStop(0.55, "rgba(216,229,255,0.95)");
  r.addColorStop(0.85, "rgba(150,180,255,0.85)"); r.addColorStop(1, "rgba(100,140,255,0.5)");
  g.fillStyle = r; g.beginPath(); g.arc(lx, ly, lr, 0, Math.PI * 2); g.fill();
  g.filter = `blur(${(m * 0.05).toFixed(1)}px)`;
  g.fillStyle = "rgba(240,247,255,0.75)";
  g.beginPath(); g.ellipse(w * p.wispX, h * 1.02, w * 0.4, m * 0.12, -0.12, 0, Math.PI * 2); g.fill();
  g.filter = "none";
  return FLUID;
}
function drawStrip(r) {
  const scene=state.scene;
  const totalW = stripW(r) * S4 * scene.blockSize, maxH = stripH(r) * S4 * scene.blockSize * scene.waveHeight, prof = profileAt(Math.min(r, 5.97));
  const gap = clamp((r - 3.85) / 0.18) * scene.tileGap * (1 - clamp((r - 5.75) / 0.15));
  const col = clamp((r - 5.6) / 0.3);
  const wts = prof.map((_, i) => { const e = Math.min(i, BLOCKS() - 1 - i); return e === 0 ? 1 - col : e === 1 ? 1 - col * 0.35 : 1; });
  const wsum = wts.reduce((a, b) => a + b, 0), unit = (totalW - gap * (BLOCKS() - 1)) / wsum, pm = Math.max(...prof);
  let x = W / 2 - totalW / 2;
  const rects = prof.map((v, i) => { const w = unit * wts[i], h = maxH * v / pm, q = [x, H / 2 - h / 2, w, h]; x += w + gap; return q; });
  ctx.save();
  ctx.beginPath();
  if (r >= 5.9) {
    // 收拢后不收成方块，而是圆角越来越大，变成一个蓝色圆
    const c = seg(E.soft, r, 5.9, CIRCLE_REF);
    rr(ctx, W / 2 - totalW / 2, H / 2 - maxH / 2, totalW, maxH, lerp(Math.min(totalW, maxH) * 0.12, Math.min(totalW, maxH) / 2, c));
  } else if (r <= 2.86) {
    // One continuous square before the bars split.
    rr(ctx,W/2-totalW/2,H/2-maxH/2,totalW,maxH,Math.min(scene.roundness*.6,totalW/2,maxH/2));
  } else {
    const rad = Math.max(Math.min(14, unit * 0.18), 6 * (1 - clamp((r - 2.85) / 0.25)));   // 开头和飞来的方块圆角一致
    for (const [rx, ry, rw, rh] of rects) if (rw > 1) rr(ctx, rx - (gap < 0.5 ? 0.6 : 0), ry, rw + (gap < 0.5 ? 1.2 : 0), rh, Math.min(rad * scene.roundness / 20, rw / 2));
  }
  ctx.clip();
  const ft = r - 2.85;
  const tex = paintFluid(520, 220, { streakX: 0.1 + 0.1 * Math.sin(ft * 1.2), lx: 0.95 + 0.22 * Math.sin(ft * 2.1 - 0.6),
    ly: 0.6 + 0.25 * Math.sin(ft * 1.4), lr: 0.78, wispX: 0.5 + 0.3 * Math.sin(ft * 1.6 + 1) });
  ctx.drawImage(tex, W / 2 - totalW / 2 - 10, H / 2 - maxH / 2 - 10, totalW + 20, maxH + 20);
  // 收成圆时流体慢慢变成纯蓝，接下面的语音小球
  const solid = seg(E.soft, r, 5.85, CIRCLE_REF);
  if (solid > 0) { ctx.fillStyle = helpers.rgba(HAND, solid); ctx.fillRect(W / 2 - totalW / 2 - 2, H / 2 - maxH / 2 - 2, totalW + 4, maxH + 4); }
  if(scene.iconOpacity>0.001 && r>2.86) drawIcons(rects,r);
  ctx.restore();
  drawCaptions(rects,r,maxH);
}

function drawCaptions(rects,r,maxH){
  if(r<3.1)return;
  rects.forEach(([x,y,w],i)=>{const card=state.cards[i];if(!card?.caption||w<50)return;ctx.save();ctx.globalAlpha=(card.opacity??1)*clamp((r-3.1)/.2);ctx.fillStyle=card.textColor||state.scene.textColor;ctx.font='500 23px '+window.STGFontLibrary.family(card.fontFamily||state.typography.fontFamily);ctx.textAlign='center';ctx.fillText(card.caption,x+w/2+(card.x||0),H/2+Math.max(90,maxH/2)+30+(card.gap||0),Math.max(60,w));ctx.restore();});
}

function drawIcons(rects,r){
 const alpha=state.scene.iconOpacity*clamp((r-2.86)/.24);if(alpha<=0)return;
 rects.forEach(([x,y,w,h],i)=>{const card=state.cards[i],im=helpers.image(card,resources,r-2.85);if(!im||w<5||h<5)return;const iw=im.videoWidth||im.naturalWidth||im.width,ih=im.videoHeight||im.naturalHeight||im.height;if(!iw||!ih)return;ctx.save();ctx.globalAlpha=alpha*(card.opacity??1);ctx.beginPath();rr(ctx,x,y,w,h,Math.min(state.scene.roundness,w/2,h/2));ctx.clip();const z=Math.min(w*.64/iw,h*.64/ih)*Math.max(.2,card.scale||1);ctx.translate(x+w/2+(card.x||0),y+h/2+(card.y||0));ctx.rotate((card.rotation||0)*Math.PI/180);ctx.drawImage(im,-iw*z/2,-ih*z/2,iw*z,ih*z);ctx.restore();});
}
return {width:W,height:H,duration:3.2,shots:[['方块展开',0,1.35],['方块流动',1.35,2.65],['收拢归一',2.65,3.2]],draw(t,s,r){state=s;resources=r;HAND=s.scene.accent;ctx.setTransform(cv.width/W,0,0,cv.height/H,0,0);ctx.clearRect(0,0,W,H);if(s.cards.length)drawStrip(2.85+clamp(t*s.scene.flowSpeed,0,3.2));},stableTime(index){return Math.min(2.4,.25+index*.12);}};
};
