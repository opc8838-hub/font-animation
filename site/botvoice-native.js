/* Native archived choreography; player/editor/export are supplied by CellMotion. */
window.ArchiveMotionFactories ||= {};
window.ArchiveMotionFactories['botvoice'] = (cv, helpers) => {
let state, resources;

// ───────── 基本 ─────────
const W = 1080, H = 1920;
let BG, HAND, FRAME, BOT;
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
const tk = (keys, t) => pchip(keys.map(k => k[0]), keys.map(k => k[1]), t);

// ───────── 时间轴 ─────────
// 第一拍照原片（视频1）秒数；第二拍接第三段的方块流动；第三拍照视频2 的语音展开
const T = {
  dotOn: 1.12,              // 灵动岛亮蓝点、Bot 开始从侧边挤进来
  bubblePop: 1.47,          // 玻璃泡泡消失
  timerIn: 2.35,            // 「12:00」开始浮现、猫开始升上来（和拉远同时）
  zoom: [2.35, 3.4],        // 镜头拉远（放慢，起步和落定都柔）
  drift: 0.025,             // 拉远后镜头再极慢地退一点（呼吸感）
  fly: [3.4, 4.4],          // Bot 到左上角不停，接着拐向画面中间，边飞边变方块
  fade: [3.55, 4.25],       // 手机场景整体淡出
  stripRef: 2.85,           // 方块流动从第三段原片时间 2.85 开始
  stripStart: 4.4,
  talkHold: 3.6,            // 语音一直讲多久（不缩回去）
};
const REF = t => T.stripRef + (t - T.stripStart);          // 真实时间 → 第三段原片时间
const squareAmt = t => 0;   // 飞行前一直是圆，变方块在飞行段里做
const CIRCLE_REF = 6.05;                                    // 收成蓝色圆的原片时刻
const VOICE_T = T.stripStart + (CIRCLE_REF - T.stripRef);   // 语音开始
const DUR = VOICE_T + 0.6 + T.talkHold;
const SHOTS = [
  ["手机特写·按键", 0, T.dotOn], ["Bot 挤进屏幕", T.dotOn, T.timerIn], ["12:00 · 猫 · 拉远", T.timerIn, T.fly[0]],
  ["Bot 边飞边变方块", T.fly[0], T.stripStart], ["方块流动", T.stripStart, VOICE_T], ["语音", VOICE_T, DUR],
];

// ───────── 世界坐标 = 原片拉远后那一帧（592 宽）的像素 ─────────
const PH = { x: 170, y: 42, w: 235, h: 481, r: 40, bez: 8 };
const SCR = { x: PH.x + PH.bez, y: PH.y + PH.bez, w: PH.w - PH.bez * 2, h: PH.h - PH.bez * 2, r: PH.r - PH.bez };
const CAT_SHIFT = 12;                                       // 猫往左挪一点（猫尾巴在左，视觉上身体偏右）
const Z_END = 2.47, Z_START = Z_END * 2.48;                 // 原片特写是拉远后的 2.48 倍
const CAM_START = [389.5, 145.4], CAM_END = [300, 300];
function camera(t) {
  const p = seg(E.zoom, t, T.zoom[0], T.zoom[1]);
  const z = Math.exp(lerp(Math.log(Z_START), Math.log(Z_END), p));
  // 中心跟着缩放比例走（保证拉远过程中不乱晃）
  const m = (Z_START / z - 1) / (Z_START / Z_END - 1);
  const breathe = 1 - T.drift * seg(E.soft, t, T.zoom[1] - 0.15, T.zoom[1] + 1.3);   // 拉远后继续极慢地退
  return { z: z * breathe, cx: lerp(CAM_START[0], CAM_END[0], m), cy: lerp(CAM_START[1], CAM_END[1], m) };
}

// Bot 的轨迹（世界坐标，照原片逐帧量）
const BOT_X = [[1.12, 404], [1.22, 384], [1.34, 362], [1.5, 348], [1.75, 352], [2.1, 362], [2.45, 350], [2.9, 292], [3.4, 221]];
const BOT_Y = [[1.12, 180], [1.34, 178], [1.5, 171], [1.75, 152], [2.1, 130], [2.45, 116], [2.9, 132], [3.4, 157]];
const BOT_R = [[1.12, 12], [1.35, 15], [2.45, 15], [3.4, 13]];
// 挤过侧边时横向压扁拉长，泡泡破的一刻弹一下
function botSquash(t) {
  const through = Math.sin(Math.PI * seg(x => x, t, 1.12, 1.4));          // 穿过边缘那一段
  const bounce = Math.sin(seg(x => x, t, 1.47, 1.85) * Math.PI * 3) * (1 - seg(x => x, t, 1.47, 1.85)) * 0.12;
  return { sx: 1 + 0.22 * through - bounce, sy: 1 - 0.16 * through + bounce };
}
const botBob = t => t < 1.5 ? 0 : 2.2 * Math.sin((t - 1.5) * 3.2) * seg(E.soft, t, 1.5, 2.0) * (1 - seg(E.soft, t, 2.9, 3.4));   // 飘的时候轻轻浮动，进入飞行前收掉

// ───────── 图片 ─────────
const IMGS = {};
function loadAll() {
  const im = new Image(); im.src = "assets/cat.png"; IMGS.cat = im; return im.decode();
}
const MAIN = cv.getContext("2d");
let ctx = MAIN;                     // 画手机场景淡出时临时换成离屏图层，整体淡出不透出层叠
ctx.imageSmoothingQuality = "high";
const LAYER = document.createElement("canvas"); LAYER.width = W; LAYER.height = H;
const LCTX = LAYER.getContext("2d"); LCTX.imageSmoothingQuality = "high";
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// ───────── 手 ─────────
// 拇指动作（照原片）：0.43 离开侧键往右下挪开 → 0.63 起慢慢移回 → 0.9 按下侧键
// 开头拇指离侧键有一点空隙（照原片）；按下时往左压到侧键上，侧键凹进机身，松开后弹回
const THUMB_DX = [[0, 0], [0.43, 0], [0.55, 22], [0.63, 22], [0.84, 1], [0.9, -8], [0.98, -8], [1.12, 0]];
const THUMB_DY = [[0, 0], [0.43, 0], [0.55, 10], [0.63, 10], [0.84, 1], [0.9, 0.5], [0.98, 0.5], [1.12, 0]];
const pressAmt = t => seg(E.soft, t, 0.87, 0.91) * (1 - seg(E.soft, t, 0.98, 1.08));   // 侧键被按下去的程度
function drawHand(t) {
  ctx.fillStyle = HAND;
  // 手掌 + 手腕（在手机后面，不动）
  ctx.beginPath();
  ctx.moveTo(500, 352);                                     // 顶边压低，拇指挪开时不会露出来
  ctx.bezierCurveTo(512, 362, 520, 370, 528, 380);
  ctx.bezierCurveTo(552, 440, 600, 505, 660, 600);
  ctx.lineTo(700, 900); ctx.lineTo(280, 900);
  ctx.bezierCurveTo(300, 760, 340, 640, 380, 560);
  ctx.lineTo(300, 352); ctx.closePath(); ctx.fill();
  // 拇指：圆顶钟形
  const dx = tk(THUMB_DX, t), dy = tk(THUMB_DY, t);
  ctx.save(); ctx.translate(dx, dy);
  ctx.beginPath();
  ctx.moveTo(406, 330);
  ctx.bezierCurveTo(405, 230, 412, 134, 440, 131);          // 顶部是圆的（钟形），不是尖的
  ctx.bezierCurveTo(462, 129, 478, 168, 490, 220);
  ctx.bezierCurveTo(500, 262, 508, 318, 516, 360);
  ctx.bezierCurveTo(522, 385, 532, 405, 546, 432);          // 往下接到手掌，接缝不露白
  ctx.lineTo(430, 450); ctx.closePath(); ctx.fill();
  ctx.restore();
  // 左手四根手指：四个大小不一、挨在一起的圆团，只露出手机左边一截
  // 食指：往左上倾斜的水滴形；下面三根略倾斜的椭圆，指缝凹得深
  [[146, 250, 42, 31, -0.55], [154, 317, 26, 24, -0.25], [148, 382, 30, 36, -0.15], [151, 467, 27, 33, -0.1]].forEach(([cx, cy, rx, ry, rot]) => {
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  });
  ctx.beginPath(); rr(ctx, 163, 225, 120, 280, 20); ctx.fill();
}

// ───────── 屏幕边缘流光（粉紫橙一圈，慢慢转）：画在半分辨率离屏画布上做模糊 ─────────
const GLOW = document.createElement("canvas"), gx = GLOW.getContext("2d");
// 流光亮度：开头淡淡亮着，0.43 拇指离开时熄灭，0.95 按下后亮起来
const glowLevel = t => t < 0.43 ? 0.5 : t < 0.95 ? 0.5 * (1 - seg(E.soft, t, 0.43, 0.52)) : seg(E.soft, t, 0.95, 1.2);
const glowSpread = t => t < 0.95 ? 1 : seg(E.out, t, 0.95, 1.25);    // 亮起时从上往下铺开
function drawGlow(t, z, sx, sy) {
  const level = glowLevel(t); if (level <= 0.01) return;
  const k = Math.min(0.5, 240 / (SCR.w * z)), w = Math.ceil(SCR.w * z * k), h = Math.ceil(SCR.h * z * k);   // 特写时自动降分辨率，模糊光本来就不需要细节
  if (GLOW.width !== w || GLOW.height !== h) { GLOW.width = w; GLOW.height = h; }
  gx.clearRect(0, 0, w, h);
  const cg = gx.createConicGradient(t * 0.9, w / 2, h / 2);
  [["#ff8bd8", 0], ["#b48cff", 0.18], ["#7fb0ff", 0.36], ["#ffb27a", 0.55], ["#ff9ac8", 0.75], ["#ff8bd8", 1]].forEach(([c, s]) => cg.addColorStop(s, c));
  gx.filter = `blur(${(6 * z * k).toFixed(1)}px)`;
  gx.strokeStyle = cg; gx.lineWidth = 14 * z * k;
  gx.beginPath(); rr(gx, 0, 0, w, h, SCR.r * z * k); gx.stroke();
  gx.filter = "none";
  const sp = glowSpread(t);
  if (sp < 1) {   // 还没铺到的下半截先擦掉
    const m = gx.createLinearGradient(0, 0, 0, h), e = sp * 1.25;
    m.addColorStop(clamp(e - 0.25), "rgba(0,0,0,0)"); m.addColorStop(clamp(e), "rgba(0,0,0,1)");
    gx.globalCompositeOperation = "destination-out"; gx.fillStyle = m; gx.fillRect(0, 0, w, h);
    gx.globalCompositeOperation = "source-over";
  }
  ctx.save();
  ctx.beginPath(); rr(ctx, sx, sy, SCR.w * z, SCR.h * z, SCR.r * z); ctx.clip();   // 只在屏幕里亮，不画到黑边框上
  ctx.globalAlpha = 0.9 * level; ctx.drawImage(GLOW, sx, sy, SCR.w * z, SCR.h * z); ctx.restore();
}

// ───────── Bot（蓝色小圆 + 两只眼睛） ─────────
function drawBot(x, y, r, opts = {}) {
  const sq = opts.square || 0, sc = opts.scale || 1;
  const R = r * sc, side = R * 2;
  ctx.save();
  const g = ctx.createLinearGradient(x, y - R, x, y + R);
  g.addColorStop(0, BOT==="#3f7bf6"?"#5a92ff":helpers.tint(BOT,.18));g.addColorStop(1,BOT==="#3f7bf6"?"#3a72f2":BOT);
  ctx.fillStyle = opts.fill || g;
  ctx.beginPath(); rr(ctx, x - R, y - R, side, side, lerp(R, R * 0.117, sq)); ctx.fill();
  const eyes = opts.eyes == null ? 1 : opts.eyes;
  if (eyes > 0.01) {
    ctx.fillStyle = `rgba(255,255,255,${eyes})`;
    for (const dx of [-0.26, 0.26]) { ctx.beginPath(); ctx.ellipse(x + dx * R, y - 0.02 * R, R * 0.11, R * 0.2, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

// ───────── 第一拍：手机场景 ─────────
function drawPhoneScene(t, alpha = 1, showBot = true) {
  const cam = camera(t), z = cam.z;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.setTransform(z, 0, 0, z, W / 2 - cam.cx * z, H / 2 - cam.cy * z);
  drawHand(t);
  // 手机
  ctx.fillStyle = FRAME;
  ctx.beginPath(); rr(ctx, PH.x, PH.y, PH.w, PH.h, PH.r); ctx.fill();
  ctx.fillRect(PH.x + PH.w - 1 - pressAmt(t) * 4.5, 148, 6, 56);   // 右侧键（被按时凹进机身）
  ctx.fillRect(PH.x - 5, 140, 6, 28); ctx.fillRect(PH.x - 5, 182, 6, 48);   // 左侧键
  ctx.fillStyle = "#fff";
  ctx.beginPath(); rr(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r); ctx.fill();
  ctx.save();
  ctx.beginPath(); rr(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r); ctx.clip();
  // 30:00 + 猫
  const ta = seg(E.soft, t, T.timerIn, T.timerIn + 0.55);                 // 时钟从模糊到清楚，慢慢浮现
  if (ta > 0) {
    ctx.save();
    ctx.globalAlpha = alpha * ta;
    const blur = (1 - ta) * 6;
    if (blur > 0.2) ctx.filter = `blur(${(blur * z).toFixed(1)}px)`;
    ctx.fillStyle = state.scene.textColor;
    ctx.font = `600 150px ${helpers.font(state)}`;
    try { ctx.fontStretch = "condensed"; } catch (e) {}
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    const txt = state.scene.clock, tw = ctx.measureText(txt).width, sx = 150 / tw, cap = 150 * 0.72, sy = 104 / cap;
    ctx.translate(SCR.x + SCR.w / 2 - 75, 282); ctx.scale(sx, sy); ctx.fillText(txt, 0, 0);   // 往上移，不挡猫
    ctx.restore();
    const cat = helpers.image(state.cards[0], resources, t), cw = 168 * (state.cards[0]?.scale || 1), ch = cat ? cw * cat.height / cat.width : 0;   // 缩小一点、居中
    const rise = (1 - seg(E.out, t, T.timerIn + 0.05, T.timerIn + 0.85)) * 45;   // 猫从屏幕底部轻轻升上来
    ctx.globalAlpha = alpha * seg(E.soft, t, T.timerIn + 0.05, T.timerIn + 0.45);
    if (cat) {const x=SCR.x+SCR.w/2-CAT_SHIFT,y=SCR.y+SCR.h+4-ch/2+rise;helpers.asset(ctx,state.cards[0],resources,t,x,y,cw,ch,false);helpers.cardText(ctx,state.cards[0],x,y,cw,ch,t,1,state);}
    ctx.globalAlpha = alpha;
  }
  ctx.restore();
  // 灵动岛 + 蓝点
  ctx.fillStyle = "#1c1b1a";
  ctx.beginPath(); rr(ctx, 237, 64, 100, 22, 11); ctx.fill();
  const dot = seg(E.out, t, T.dotOn, T.dotOn + 0.15);
  if (dot > 0) { ctx.fillStyle = `rgba(90,160,255,${dot})`; ctx.beginPath(); ctx.arc(325, 75, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 屏幕边缘流光
  drawGlow(t, z, W / 2 + (SCR.x - cam.cx) * z, H / 2 + (SCR.y - cam.cy) * z);
  ctx.setTransform(z, 0, 0, z, W / 2 - cam.cx * z, H / 2 - cam.cy * z);
  // Bot：从右侧边挤进来（外面裹一层玻璃泡泡，后面拖着一截液体），泡泡消失后飘到位
  if (showBot && t >= T.dotOn) {
    const bx = tk(BOT_X, t), by = tk(BOT_Y, t) + botBob(t), br = tk(BOT_R, t), sqz = botSquash(t);
    ctx.save();
    ctx.beginPath(); rr(ctx, SCR.x, SCR.y, SCR.w, SCR.h, SCR.r); ctx.clip();
    if (t < T.bubblePop + 0.12) {
      const edge = SCR.x + SCR.w;
      const bp = seg(E.out, t, T.dotOn, T.bubblePop), pop = seg(E.out, t, T.bubblePop, T.bubblePop + 0.12);
      const wob = 1 + 0.06 * Math.sin((t - T.dotOn) * 26) * (1 - bp);
      const bubR = lerp(8, 44, bp) * wob * (1 + pop * 0.18), bubX = lerp(edge + 4, bx + 12, bp);
      // 液体颈：从 Bot 拉向侧边，越往后越细
      if (pop < 1) {
        const neck = (1 - pop) * clamp(bp * 3);
        ctx.fillStyle = BOT;
        ctx.beginPath();
        ctx.moveTo(bx, by - br * 0.75 * neck);
        ctx.quadraticCurveTo((bx + edge) / 2, by - br * 0.18 * neck, edge + 2, by - br * 0.85 * neck);
        ctx.lineTo(edge + 2, by + br * 0.85 * neck);
        ctx.quadraticCurveTo((bx + edge) / 2, by + br * 0.18 * neck, bx, by + br * 0.75 * neck);
        ctx.closePath(); ctx.fill();
      }
      // 玻璃泡泡
      ctx.globalAlpha = 1 - pop;
      const gg = ctx.createRadialGradient(bubX - bubR * 0.3, by - bubR * 0.35, bubR * 0.1, bubX, by, bubR);
      gg.addColorStop(0, "rgba(255,255,255,0.85)"); gg.addColorStop(0.6, "rgba(225,232,255,0.55)");
      gg.addColorStop(0.9, "rgba(170,165,250,0.55)"); gg.addColorStop(1, "rgba(150,140,245,0.25)");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(bubX, by, bubR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.save(); ctx.translate(bx, by); ctx.scale(sqz.sx, sqz.sy);
    drawBot(0, 0, br, { square: squareAmt(t) });
    ctx.restore();
    ctx.restore();
  }
  ctx.restore();
}

// ───────── 第二拍：方块流动（第三段那套，改成视频里的亮蓝） ─────────
const S4 = 2.1;   // 第三段原片像素 → 9:16 画面
const B_SW = bezier(0.10, 0.80, 0.70, 1.00), B_SH1 = bezier(0.00, 0.20, 0.00, 0.70), B_SH2 = bezier(0.35, 0.00, 1.00, 0.80), B_COL = bezier(0.45, 0.00, 0.55, 0.60);
const stripW = r => r < 5.5 ? 49 + 416 * seg(B_SW, r, 2.85, 4.2) : r < 5.9 ? 465 - 324 * seg(B_COL, r, 5.5, 5.9) : lerp(141, 58, seg(E.soft, r, 5.9, CIRCLE_REF));
const stripH = r => r < 4.4 ? 49 + 92 * seg(B_SH1, r, 2.85, 4.4) : r < 5.9 ? 141 - 92 * seg(B_SH2, r, 4.4, 5.9) : lerp(49, 58, seg(E.soft, r, 5.9, CIRCLE_REF));
const BLOCKS = 8;
const PROFILE = [
  [2.85, [1, 1, 1, 1, 1, 1, 1, 1]], [2.93, [0.55, 0.8, 0.95, 1, 1, 0.95, 0.72, 0.5]], [3.13, [1, 0.85, 0.55, 0.35, 0.3, 0.55, 0.95, 0.9]],
  [3.33, [0.5, 0.3, 0.2, 0.2, 0.45, 0.75, 1, 1]], [3.6, [0.25, 0.3, 0.55, 0.85, 1, 0.95, 0.85, 0.6]], [3.93, [0.18, 0.4, 0.72, 0.92, 1, 0.93, 0.68, 0.4]],
  [4.2, [0.25, 0.5, 0.82, 1, 1, 0.88, 0.5, 0.15]], [4.53, [0.6, 0.95, 1, 1, 0.85, 0.45, 0.18, 0.12]], [4.8, [0.9, 1, 1, 0.8, 0.55, 0.35, 0.2, 0.4]],
  [5.13, [1, 0.85, 0.6, 0.42, 0.3, 0.32, 0.65, 0.85]], [5.4, [0.75, 0.55, 0.4, 0.35, 0.5, 0.75, 1, 1]], [5.6, [0.3, 0.35, 0.5, 0.7, 0.95, 1, 0.75, 0.5]],
  [5.9, [0.4, 0.8, 1, 1, 1, 1, 0.8, 0.4]], [5.97, [1, 1, 1, 1, 1, 1, 1, 1]],
];
const PROF_T = PROFILE.map(k => k[0]);
const profileAt = r => PROFILE[0][1].map((_, j) => pchip(PROF_T, PROFILE.map(k => k[1][j]), r));
// 流体渐变：亮蓝底 + 左上斜光 + 白到浅蓝的光团（深蓝弧边）
const FLUID = document.createElement("canvas"), fx = FLUID.getContext("2d");
function paintFluid(w, h, p) {
  if (FLUID.width !== w || FLUID.height !== h) { FLUID.width = w; FLUID.height = h; }
  const g = fx, m = Math.min(w, h);
  g.filter = "none";
  const base = g.createLinearGradient(0, 0, w, h);
  base.addColorStop(0, "#5a86ff"); base.addColorStop(0.5, HAND); base.addColorStop(1, "#5583ff");
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
  const totalW = stripW(r) * S4, maxH = stripH(r) * S4, prof = profileAt(Math.min(r, 5.97));
  const gap = clamp((r - 3.85) / 0.18) * 6 * (1 - clamp((r - 5.75) / 0.15));
  const col = clamp((r - 5.6) / 0.3);
  const wts = prof.map((_, i) => { const e = Math.min(i, BLOCKS - 1 - i); return e === 0 ? 1 - col : e === 1 ? 1 - col * 0.35 : 1; });
  const wsum = wts.reduce((a, b) => a + b, 0), unit = (totalW - gap * (BLOCKS - 1)) / wsum, pm = Math.max(...prof);
  let x = W / 2 - totalW / 2;
  const rects = prof.map((v, i) => { const w = unit * wts[i], h = maxH * v / pm, q = [x, H / 2 - h / 2, w, h]; x += w + gap; return q; });
  ctx.save();
  ctx.beginPath();
  if (r >= 5.9) {
    // 收拢后不收成方块，而是圆角越来越大，变成一个蓝色圆
    const c = seg(E.soft, r, 5.9, CIRCLE_REF);
    rr(ctx, W / 2 - totalW / 2, H / 2 - maxH / 2, totalW, maxH, lerp(Math.min(totalW, maxH) * 0.12, Math.min(totalW, maxH) / 2, c));
  } else {
    const rad = Math.max(Math.min(14, unit * 0.18), 6 * (1 - clamp((r - 2.85) / 0.25)));   // 开头和飞来的方块圆角一致
    for (const [rx, ry, rw, rh] of rects) if (rw > 1) rr(ctx, rx - (gap < 0.5 ? 0.6 : 0), ry, rw + (gap < 0.5 ? 1.2 : 0), rh, Math.min(rad, rw / 2));
  }
  ctx.clip();
  const ft = r - 2.85;
  const tex = paintFluid(520, 220, { streakX: 0.1 + 0.1 * Math.sin(ft * 1.2), lx: 0.95 + 0.22 * Math.sin(ft * 2.1 - 0.6),
    ly: 0.6 + 0.25 * Math.sin(ft * 1.4), lr: 0.78, wispX: 0.5 + 0.3 * Math.sin(ft * 1.6 + 1) });
  ctx.drawImage(tex, W / 2 - totalW / 2 - 10, H / 2 - maxH / 2 - 10, totalW + 20, maxH + 20);
  // 收成圆时流体慢慢变成纯蓝，接下面的语音小球
  const solid = seg(E.soft, r, 5.85, CIRCLE_REF);
  if (solid > 0) { ctx.fillStyle = helpers.rgba(HAND, solid); ctx.fillRect(W / 2 - totalW / 2 - 2, H / 2 - maxH / 2 - 2, totalW + 4, maxH + 4); }
  ctx.restore();
}

// ───────── 第三拍：语音（视频2：圆球分成两个点拉开，中间几根线像声波一样一直动） ─────────
let PILL_W = 960, PILL_H = 158, DOT_R = 44;
function speech(t) {   // “说话”的音量起伏：几个不同频率叠加，永远在动
  return 0.55 + 0.25 * Math.sin(t * 5.3) + 0.15 * Math.sin(t * 8.9 + 1.3) + 0.1 * Math.sin(t * 13.7 + 0.4);
}
function drawVoice(t) {
  const u = t - VOICE_T;
  const ball = 58 * S4 / 2;                             // 刚收成的圆的半径
  const sh = seg(E.soft, u, 0, 0.12);                    // 先缩成小点、压扁一下
  const sp = seg(E.out, u, 0.1, 0.55);                   // 两个点往两边拉开
  const half = lerp(0, PILL_W / 2 - PILL_H / 2, sp);
  const dr = lerp(ball, DOT_R, sh);
  const cx = W / 2, cy = H / 2;
  // 浅色胶囊
  const pa = clamp(sp * 3);
  if (pa > 0) {
    ctx.fillStyle = `rgba(226,226,230,${pa})`;   // 浅灰底
    const pw = half * 2 + PILL_H, ph = lerp(dr * 2, PILL_H, clamp(sp * 2));
    ctx.beginPath(); rr(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2); ctx.fill();
  }
  // 声波：几根细线在两个点之间交织，两头为零、中间最大
  const wa = seg(E.soft, u, 0.3, 0.6);
  if (wa > 0 && half > 4) {
    const L = half * 2, x0 = cx - half;
    const strands = [[1.0, 2.6, 0, 5.5], [0.85, 3.4, 1.7, 4.5], [0.7, 2.1, 3.1, 3.8], [0.55, 4.0, 4.4, 3.2]];
    ctx.lineCap = "round";
    strands.forEach(([amp, k, ph, lw], i) => {
      ctx.strokeStyle = helpers.rgba(BOT, (0.85 - i * 0.12) * wa); ctx.lineWidth = lw;
      ctx.beginPath();
      for (let s = 0; s <= 120; s++) {
        const q = s / 120, x = x0 + q * L, env = Math.exp(-Math.pow((q - 0.5) / 0.19, 2));   // 两头几乎是直线，波浪集中在中间
        const y = cy + env * amp * PILL_H * 0.62 * speech(t + i * 0.37) * Math.sin(q * k * Math.PI * 2 - t * (6 + i * 1.7) + ph) * wa;
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    });
  }
  // 两个蓝点
  ctx.fillStyle = HAND;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * half, cy, dr * lerp(1, 1.15, sh * (1 - sp)), dr * lerp(1, 0.85, sh * (1 - sp)), 0, 0, Math.PI * 2); ctx.fill(); }
}

// ───────── 一帧 ─────────
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (t < T.fly[0]) { drawPhoneScene(t); return; }
  if (t < T.stripStart) {
    // 手机场景：淡出前实时画；淡出时把那一刻整体缓存成一张图再淡出，不透出层叠
    if (t < T.fade[0]) drawPhoneScene(t, 1, false);
    else {
      const fade = 1 - seg(E.soft, t, T.fade[0], T.fade[1]);
      if (fade > 0) {
        if (!LAYER.ready) {
          ctx = LCTX; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
          drawPhoneScene(T.fade[0], 1, false);
          ctx = MAIN; LAYER.ready = true;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = fade; ctx.drawImage(LAYER, 0, 0); ctx.globalAlpha = 1;
      }
    }
    // Bot：沿着刚才飘的速度方向直接拐向画面中间（三次 Hermite，起点速度和飘的速度一样，所以不停顿）
    const D = T.fly[1] - T.fly[0], u = clamp((t - T.fly[0]) / D);
    const scr = tt => { const c = camera(tt); return [W / 2 + (tk(BOT_X, tt) - c.cx) * c.z, H / 2 + (tk(BOT_Y, tt) + botBob(tt) - c.cy) * c.z]; };
    const P0 = scr(T.fly[0]), Pb = scr(T.fly[0] - 0.02), V0 = [(P0[0] - Pb[0]) / 0.02 * D, (P0[1] - Pb[1]) / 0.02 * D];
    const P1 = [W / 2, H / 2], h00 = 2*u**3 - 3*u**2 + 1, h10 = u**3 - 2*u**2 + u, h01 = -2*u**3 + 3*u**2;
    const x = h00 * P0[0] + h10 * V0[0] + h01 * P1[0], y = h00 * P0[1] + h10 * V0[1] + h01 * P1[1];
    const c0 = camera(T.fly[0]), s0 = tk(BOT_R, T.fly[0]) * c0.z, s1 = 49 * S4 / 2;
    const r = lerp(s0, s1, E.inOut(u));
    drawBot(x, y, r, { square: E.inOut(clamp((u - 0.05) / 0.8)), eyes: 1 - seg(E.soft, u, 0.2, 0.55) });
    // 快到中间时渐变成方块流动的质感，直接接上 8 块流动
    const blend = seg(E.soft, u, 0.72, 1);
    if (blend > 0) {
      // 和 drawStrip 在 2.85 那一刻用的是同一张流体，画在飞行中的方块身上
      const tex = paintFluid(520, 220, { streakX: 0.1, lx: 0.95 + 0.22 * Math.sin(-0.6), ly: 0.6, lr: 0.78, wispX: 0.5 + 0.3 * Math.sin(1) });
      ctx.save(); ctx.globalAlpha = blend;
      ctx.beginPath(); rr(ctx, x - r, y - r, r * 2, r * 2, r * 0.117); ctx.clip();
      ctx.drawImage(tex, x - r - 10, y - r - 10, r * 2 + 20, r * 2 + 20);
      ctx.restore();
    }
    return;
  }
  if (t < VOICE_T) { drawStrip(REF(t)); return; }
  drawVoice(t);
}


let layerState="";
return { width:W,height:H,shots:SHOTS,duration:DUR,draw(t,s,r){state=s;resources=r;const key=JSON.stringify([s.scene,s.cards]);if(key!==layerState){LAYER.ready=false;layerState=key;}BG=s.backgroundColor;HAND=s.scene.handColor;FRAME=s.scene.frameColor;BOT=s.scene.accent;PILL_W=s.scene.pillWidth;render(t);if(t>=VOICE_T)helpers.extras(ctx,s.cards.slice(1),r,t,W,H,s);}};
};
