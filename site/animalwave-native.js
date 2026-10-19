/* Native archived choreography; player/editor/export are supplied by CellMotion. */
window.ArchiveMotionFactories ||= {};
window.ArchiveMotionFactories['animalwave'] = (cv, helpers) => {
let state, resources;
let EARLY=18, drawTime=0, lastCount=0, captionGap=0;const cachedSprites=new WeakMap();

// ───────── 文案（改这里） ─────────
let TXT_FIRST = "is here";
function captionText(template, shown, name) {
  const extra = Math.max(0, shown - 1);
  const count = Math.round(Number(state.scene.countStart || 0) + shown * Number(state.scene.countStep ?? 1));
  return String(template).replaceAll('{count}', String(count)).replaceAll('{shown}', String(shown))
    .replaceAll('{n}', String(extra)).replaceAll('{s}', extra === 1 ? '' : 's').replaceAll('{name}', name);
}
let BRAND_A, BRAND_B;
let PURPLE, INK;

// 头像文件顺序对应的名字（prep.py 里的排序）
let NAMES = [];
// 出场顺序：狮子第一个，长颈鹿（logo 里的那只）最后一个
const FIRST = [2,15,22,3,10,18,8,13,29,1,38,41,47,19,12,25,36,0];
let ORDER = [];
let TOTAL = 59;  // 59

// ───────── 基本 ─────────
const W = 1920, H = 1080;
let FONT;
function bezier(x1, y1, x2, y2) {
  const cx = 3*x1, bx = 3*(x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3*y1, by = 3*(y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax*t + bx)*t + cx)*t, Y = t => ((ay*t + by)*t + cy)*t;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; } return Y(t); };
}
const E = { inOut: bezier(0.65,0,0.35,1), out: bezier(0.2,0.7,0.2,1), pop: bezier(0.3,1.5,0.5,1), slide: bezier(0.4,0,0.2,1) };
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, m) => a + (b - a) * m;
const seg = (t, a, b) => clamp((t - a) / (b - a));

// ───────── 时间轴 ─────────
const T_SPLIT = 1.0;                       // 字从同一行掉到头像下面
const T_ARR = Array.from({ length: 18 }, (_, j) => j === 0 ? -1 : 1.0 + (j - 1) * 0.26);   // 前 18 只一只只进
const POP = 0.24;                          // 每只挤进来的时长
const T_RUSH = 5.85, T_RUSH_END = 7.5;     // 数字狂涨 + 变成波浪
const CRUISE = 1.5;                        // 波浪段每秒流过的头像数
const T_LOGO = 8.5;                        // 字换成 hely.Animals
const DUR = 11.0;

// c(t)：已经"挤进来"的头像数（连续值）
let RUSH_TAB; function buildRush() {     // 狂涨段：速度先冲上去再落回巡航，积分到 T_RUSH_END 正好 59
  const dt = 1/1000, n = Math.round((DUR - T_RUSH) / dt) + 1, base = new Float64Array(n);
  const v0 = t => CRUISE * E.inOut(seg(t, T_RUSH, T_RUSH_END));
  const bump = t => { const u = seg(t, T_RUSH, T_RUSH_END); return Math.pow(Math.sin(Math.PI * u), 2) * (1 - u * 0.35); };
  let a = 0, b = 0;
  for (let i = 1; i < n; i++) { const t = T_RUSH + i*dt; if (t <= T_RUSH_END) { a += v0(t)*dt; b += bump(t)*dt; } }
  const P = (TOTAL - EARLY - a) / b;
  let c = 0;
  for (let i = 1; i < n; i++) { const t = T_RUSH + i*dt; c += (v0(t) + (t <= T_RUSH_END ? P * bump(t) : 0)) * dt; base[i] = c; }
  return { dt, base };
}
function countC(t) {
  if (t >= T_RUSH) { const i = Math.min(RUSH_TAB.base.length - 1, Math.floor((t - T_RUSH) / RUSH_TAB.dt)); return EARLY + RUSH_TAB.base[i]; }
  let c = 1;
  for (let j = 1; j < EARLY; j++) c += E.slide(seg(t, T_ARR[j], T_ARR[j] + POP));
  return c;
}
function arrivals(t) {          // 字幕用的整数：已出场多少只
  if (t >= T_RUSH) return Math.min(TOTAL, Math.floor(countC(t) + 0.15));
  let n = 1; for (let j = 1; j < EARLY; j++) if (t >= T_ARR[j]) n++; return n;
}

// ───────── 素材预渲染：头像加白边 + 软阴影 ─────────
const SPR = 220, PAD = 30;
function makeSprite(src) {
  const c = document.createElement("canvas"); c.width = c.height = SPR + PAD * 2;
  const g = c.getContext("2d"), r = SPR / 2, cx = PAD + r;
  g.save(); g.shadowColor = "rgba(20,20,40,0.16)"; g.shadowBlur = 18; g.shadowOffsetY = 5;
  g.beginPath(); g.arc(cx, cx, r, 0, Math.PI*2); g.fillStyle = "#fff"; g.fill(); g.restore();
  g.save(); g.beginPath(); g.arc(cx, cx, r - 7, 0, Math.PI*2); g.clip(); const iw=src.videoWidth||src.naturalWidth||src.width, ih=src.videoHeight||src.naturalHeight||src.height; const side=Math.min(iw,ih); g.drawImage(src,(iw-side)/2,(ih-side)/2,side,side,cx-r+7,cx-r+7,SPR-14,SPR-14); g.restore();
  g.beginPath(); g.arc(cx, cx, r - 7, 0, Math.PI*2); g.strokeStyle = "rgba(0,0,0,0.06)"; g.lineWidth = 1.5; g.stroke();
  return c;
}
const load = s => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.src = s; });
let SPRITES = [], ICON_SPR = null;

// ───────── 画字 ─────────
function badge(g, x, y, r) {          // 紫色圆 + 白爪印（代替原片蓝勾）
  g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fillStyle = PURPLE; g.fill();
  g.fillStyle = "#fff";
  g.beginPath(); g.ellipse(x, y + r*0.22, r*0.36, r*0.29, 0, 0, Math.PI*2); g.fill();
  for (const [dx, dy, s] of [[-0.42,-0.12,0.15],[-0.15,-0.42,0.16],[0.15,-0.42,0.16],[0.42,-0.12,0.15]]) {
    g.beginPath(); g.ellipse(x + dx*r, y + dy*r, s*r, s*r*1.2, dx*0.6, 0, Math.PI*2); g.fill();
  }
}
function captionWidth(g, size, name, rest) {
  if (state.scene.captionMode === 'text') { g.font = `500 ${size}px ${FONT}`; return g.measureText(rest).width; }
  g.font = `700 ${size}px ${FONT}`; const a = g.measureText(name).width;
  g.font = `400 ${size}px ${FONT}`; const b = g.measureText(" " + rest).width;
  return a + captionGap * size / 128 + size * 0.86 + b;
}
function caption(g, x, y, size, name, rest, alpha = 1) {   // x = 左端，y = 字中线
  g.save(); g.globalAlpha = alpha; g.textBaseline = "middle"; g.fillStyle = INK;
  if (state.scene.captionMode === "text") { g.font = `500 ${size}px ${FONT}`; g.fillText(rest,x,y); g.restore(); return; }
  g.font = `700 ${size}px ${FONT}`; g.fillText(name, x, y); let cx = x + g.measureText(name).width + captionGap * size / 128;
  badge(g, cx + size * 0.43, y + size * 0.02, size * 0.43); cx += size * 0.86;
  g.fillStyle = INK; g.font = `400 ${size}px ${FONT}`; g.fillText(" " + rest, cx, y);
  g.restore();
}
function brand(g, cx, y, size, alpha, rise) {   // 最后的 logo：图标 + hely.Animals
  g.save(); g.globalAlpha = alpha; g.textBaseline = "middle";
  g.font = `700 ${size}px ${FONT}`;
  const wa = g.measureText(BRAND_A).width, wb = g.measureText(BRAND_B).width, iz = size * 1.5, gap = (state.scene.iconGap / 128 + .15) * size;
  const total = iz + gap + wa + wb, x0 = cx - total / 2, yy = y + rise;
  drawSpr(g, ICON_SPR, x0 + iz / 2, yy, iz);
  g.fillStyle = INK; g.fillText(BRAND_A, x0 + iz + gap, yy);
  g.fillStyle = PURPLE; g.fillText(BRAND_B, x0 + iz + gap + wa, yy);
  g.restore();
}
function drawSpr(g,spr,x,y,d,alpha=1){if(!spr||d<=.5||alpha<=0)return;const image=helpers.image(spr,resources,drawTime);if(!image)return;let cached=cachedSprites.get(image);if(!cached){cached=makeSprite(image);cachedSprites.set(image,cached);}const size=d*(spr.scale||1)/SPR*(SPR+PAD*2);g.save();g.globalAlpha*=alpha*(spr.opacity??1);g.translate(x+(spr.x||0),y+(spr.y||0));g.rotate((spr.rotation||0)*Math.PI/180);g.drawImage(cached,-size/2,-size/2,size,size);g.restore();}

// ───────── 一帧 ─────────
let D = 64, STEP = 0.78, GAP = 16, FS = 30;     // 基础单位（乘镜头缩放 k）
let RIB_D = 184, RIB_SP = 162, RIB_A = 92;const RIB_Y = 420, RIB_L = 2200, RIB_TEXT_Y = 810, RIB_FS = 82;
const g = cv.getContext("2d");

function render(t) {
  drawTime=t;
  g.setTransform(cv.width/W,0,0,cv.height/H,0,0);g.clearRect(0,0,W,H);
  if (!SPRITES.length) return;
  const c = countC(t), n = arrivals(t);
  const split = E.inOut(seg(t, T_SPLIT, T_SPLIT + 0.32));
  const m = E.inOut(seg(t, T_RUSH + 0.15, T_RUSH_END));        // 一排 → 波浪
  const lgOut = E.inOut(seg(t, T_LOGO, T_LOGO + 0.35)), lg = E.out(seg(t, T_LOGO + 0.3, T_LOGO + 1.0));   // 字先退，logo 再上
  const intro = E.out(seg(t, 0, 0.45));

  // 字幕内容
  const newest = ORDER[(n - 1) % TOTAL];
  const name = NAMES[newest], rest = captionText(n <= 1 ? TXT_FIRST : state.scene.many, n, name);
  captionGap=state.scene.iconGap+Number(state.cards[newest]?.gap||0);FONT=STGFontLibrary.family(state.cards[newest]?.fontFamily||state.typography.fontFamily);

  // 一排的布局（镜头跟着内容宽度缩放）
  const cRow = Math.min(c, EARLY);
  const rowW = D + GAP + (cRow - 1) * D * STEP + D;
  const capW = captionWidth(g, FS, name, rest);
  const inlineW = rowW + (1 - split) * (GAP + capW);
  const k = Math.min(3.2, 0.9 * W / inlineW) * lerp(0.96, 1, intro);
  const left = W / 2 - inlineW * k / 2;
  const rowY = H / 2 - split * 26 * k;
  const firstX = left + (D + GAP) * k + D * k / 2;           // 第 0 格头像中心

  // 波浪参数
  const wavePh = t * 0.9;
  const ribX = s => -RIB_SP * 1.5 + s * RIB_SP;              // 新来的从左边画面外进
  const ribY = x => RIB_Y + RIB_A * Math.sin(2 * Math.PI * x / RIB_L - wavePh);
  const depth = x => 1 + 0.1 * Math.cos(2 * Math.PI * x / RIB_L - wavePh + 0.9);

  // hely 图标（一排最左边）
  drawSpr(g, ICON_SPR, left + D * k / 2, rowY, D * k * (1 - m), intro * (1 - m));

  // 头像：第 j 只出场的位置格 s = c - 1 - j（0 = 最左），越新越左
  const items = [];
  const jMax = Math.floor(c + 0.999), jMin = Math.max(0,jMax-TOTAL, Math.floor(c - 1 - (m > 0 ? 26 : 19)));
  for (let j = jMin; j < jMax; j++) {
    const s = c - 1 - j;
    const popIn = clamp(s + 1);                                   // -1 → 0 这一段是挤进来
    const sz = j === 0 ? 1 : E.pop(popIn);
    const xr = firstX + Math.max(0, s) * D * STEP * k, yr = rowY, dr = D * k * sz;
    const xw = ribX(s), dw = RIB_D * depth(xw) * (m < 1 ? clamp(s + 1) : 1);
    const x = lerp(xr, xw, m), y = lerp(yr, ribY(xw), m), d = lerp(dr, dw, m);
    if (x < -150 || x > W + 150) continue;
    const a = (j === 0 ? intro : 1) * (s > 18.5 ? lerp(clamp(19.5 - s), 1, m) : 1);
    items.push({ x, y, d, a, spr: SPRITES[ORDER[j % TOTAL]], z: m > 0.5 ? depth(xw) : -s });
  }
  items.sort((p, q) => p.z - q.z);
  for (const it of items) drawSpr(g, it.spr, it.x, it.y, it.d, it.a);

  // 字幕：同一行 → 头像下面居中 → 波浪下面放大
  const fs = lerp(FS * k, RIB_FS, m);
  const capW2 = captionWidth(g, fs, name, rest);
  const xInline = left + rowW * k + GAP * k, yInline = H / 2;
  const xBelow = W / 2 - capW2 / 2, yBelow = rowY + 50 * k;
  let cx = lerp(xInline, xBelow, split), cy = lerp(yInline, yBelow, split);
  cx = lerp(cx, W / 2 - capW2 / 2, m); cy = lerp(cy, RIB_TEXT_Y, m);
  INK=state.cards[newest]?.textColor||state.scene.textColor;
  if (lgOut < 1) caption(g, cx, cy - lgOut * 24, fs, name, rest, intro * (1 - lgOut));
  INK=state.scene.textColor;FONT=helpers.font(state);
  if (lg > 0) brand(g, W / 2, RIB_TEXT_Y + 10, 128, lg, (1 - lg) * 40);
}


return {width:W,height:H,shots:[['单只亮相',0,1],['头像递增',1,5.85],['加速成浪',5.85,7.5],['波浪巡航',7.5,8.5],['品牌收尾',8.5,11]],duration:DUR,stableTime(index){if(index===0)return .8;if(index<Math.min(18,TOTAL))return T_ARR[index]+POP+.005;let lo=T_RUSH,hi=T_RUSH_END;for(let i=0;i<30;i++){const mid=(lo+hi)/2;if(countC(mid)<index+1)lo=mid;else hi=mid;}return Math.min(T_RUSH_END,hi+.025);},draw(t,s,r){state=s;resources=r;TOTAL=s.cards.length;EARLY=Math.min(18,TOTAL);if(TOTAL!==lastCount){RUSH_TAB=buildRush();lastCount=TOTAL;}ORDER=s.cards.map((_,i)=>i);NAMES=s.cards.map(c=>c.caption||r.get(c.libraryId)?.name||'');SPRITES=s.cards;ICON_SPR={libraryId:s.scene.brandId,scale:1,opacity:1,x:0,y:0,rotation:0};TXT_FIRST=s.scene.first;BRAND_A=s.scene.brandA;BRAND_B=s.scene.brandB;PURPLE=s.scene.accent;INK=s.scene.textColor;FONT=helpers.font(s);GAP=s.scene.iconGap*.625;STEP=s.scene.spacing;RIB_SP=162*s.scene.spacing/.78;D=64*s.scene.iconSize;RIB_D=184*s.scene.iconSize;RIB_A=s.scene.amplitude;render(t);}};
};
