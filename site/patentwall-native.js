/* Native archived choreography; player/editor/export are supplied by CellMotion. */
window.ArchiveMotionFactories ||= {};
window.ArchiveMotionFactories['patentwall'] = (cv, helpers) => {
let state, resources;

// ───────── 基本参数 ─────────
const W = 1920, H = 1080;
const IMG_W = 1055, IMG_H = 1491;
const CH = 1000, CW = CH * IMG_W / IMG_H;          // 世界单位里的一张证书
const ZC = 1.93;     // 特写：标题+字段区都在画面里，左右露出一点相邻证书
const CY_C = -60;    // 特写时镜头的纵向位置（偏上，看标题和字段）
const ZK = 0.90;     // 卡片带：和特写只差约 2 倍（原片 1.85 倍）
const ZW = 0.36;     // 专利墙
const GAP = 85;      // 特写平移时证书之间的空隙

// 卡片带顺序（下标 → 图）。0 是开场那张，跳过 1、2，3..6 是四张特写
const CAROUSEL = { "-8":"p3", "-7":"p2", "-6":"p6", "-5":"p5", "-4":"p4", "-3":"p1", "-2":"p3", "-1":"p2",
                   0:"p5", 1:"p4", 2:"p6", 3:"p1", 4:"p2", 5:"p3", 6:"p6",
                   7:"p4", 8:"p5", 9:"p1", 10:"p2", 11:"p3", 12:"p4", 13:"p5", 14:"p1" };
const FEATURED = [3, 4, 5, 6];

// ───────── 缓动 ─────────
// cubic-bezier，和 CSS 的同一套写法
function bezier(x1, y1, x2, y2) {
  const cx = 3*x1, bx = 3*(x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3*y1, by = 3*(y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax*t + bx)*t + cx)*t, Y = t => ((ay*t + by)*t + cy)*t;
  return x => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (X(t) < x) lo = t; else hi = t; }
    return Y(t);
  };
}
const E = {
  lin: t => t,
  out: bezier(0.3, 0, 0.2, 1),       // 开场缩小：先快后慢
  slide: bezier(0.5, 0, 0.3, 1),     // 卡片带滑动：加速再减速
  push: bezier(0.55, 0, 0.25, 1),    // 推近：先慢后快，轻轻落地
  pan: bezier(0.65, 0, 0.35, 1),     // 特写之间平移：两头都很柔
  wall: bezier(0.45, 0, 0.2, 1),     // 拉远成墙
  calm: bezier(0.3, 0, 0.7, 1),      // 结尾极慢的拉远
  land: bezier(0.2, 0.7, 0.2, 1),
  wallZoom: bezier(0.6, 0, 0.2, 1), // 拉远：先只有主卡慢慢缩，再加速    // 各列滑进来：进得快、落得柔
};
const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, m) => a + (b - a) * m;

// 关键帧轨道：[[时间, 值, 进入该帧的缓动], ...]
function track(keys, t, log=false) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, ease] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i-1];
      const p = (E[ease] || E.lin)(clamp((t - t0) / (t1 - t0)));
      return log ? Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * p) : v0 + (v1 - v0) * p;
    }
  }
  return keys[keys.length-1][1];
}

// ───────── 逐字节奏 ─────────
const rowStart = j => j * 0.05;
const rowDur = r => 0.12 + 0.40 * (r.x1 - r.x0) / 860;
const scanLen = name => Math.max(...window.PATENT_ROWS[name].rows.map((r, j) => rowStart(j) + rowDur(r)));

// ───────── 时间轴 ─────────
// Logo 翻转成专利 → 左右专利慢慢展开 → 滑过两张推近特写 1 → 平移切 2–4 → 拉远，专利一张张上下进场成墙
const T = {
  logo: 0.8,        // Logo 先停一会儿
  spread: 1.6,      // 左右专利同时从主卡后面展开（翻转途中就开始）
  slideGap: 0.15,   // 展开完到开始滑动的间隔
  slide3: 1.3,      // 第一次滑：跳过两张（滑 3 格）
  pushLead: 0.2,    // 滑动结束前多久开始推近
  push: 1.0,        // 推近
  scanLead: 0.55,   // 推近开始后多久开始逐字（一边放大一边动）
  pan: 0.85,        // 特写之间平移
  panScanLead: 0.6, // 平移开始后多久开始逐字
  rest: 0.35,       // 字出完后再停多久
  wall: 2.0,        // 拉远成墙
  wallHold: 1.8,    // 铺满后：相邻列反向上下滚动 + 极慢拉远
  cards: 0.55,      // 拉远开始后多久，周围的专利开始一张张进场
  cardStep: 0.13,   // 离主卡每远一张卡宽，晚多少进场
  cardDur: 0.95,    // 每张滑进来用多久
  enter: 3,         // 从多远滑进来（几张卡高）
  flow: 70,         // 铺满后各列上下滚动的速度（世界单位/秒）
};
// 翻转参数照搬 CellMotion「卡片登录」(card-login motion-spec)：先停 0.1s，1.5s 边转 180° 边放大，0.2s 回弹落定；Logo 放正，不倾斜
const FLIP = { hold: 0.1, turn: 1.5, settle: 0.2, perspective: 1500 / 440,
               scale0: 0.65, rotY0: 0, rotZ0: 0, dy0: 0, overshoot: 0.01 };
E.flipTurn = bezier(0.25, 0.1, 0.25, 1);
E.flipSettle = bezier(0.22, 1, 0.36, 1);
E.spread = bezier(0.25, 0.75, 0.25, 1);   // 展开：起步就有速度，收尾很柔

const FLIP_T = T.logo, FLIP_END = FLIP_T + FLIP.hold + FLIP.turn + FLIP.settle;
// 展开从翻转转过 SPREAD_DEG（专利面刚露出来）那一刻开始
const SPREAD_DEG = 100;
const SPREAD_T = (() => {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (180 * E.flipTurn(mid) < SPREAD_DEG) lo = mid; else hi = mid; }
  return FLIP_T + FLIP.hold + lo * FLIP.turn;
})();
const SPREAD_END = SPREAD_T + T.spread;
const zoomK = [[0, ZK]];
const cyK   = [[0, 0]];
const sK    = [[0, 0]];
const scanStart = [], SHOTS = [["Logo 翻转", 0, FLIP_END]];
let cur = FLIP_END;
{
  // 第 1 张：展开 → 滑过两张 → 推近
  const slideStart = SPREAD_END + T.slideGap, slideEnd = slideStart + T.slide3;
  sK.push([slideStart, 0, "lin"], [slideEnd, FEATURED[0], "slide"]);
  const pushStart = slideEnd - T.pushLead, pushEnd = pushStart + T.push;
  zoomK.push([pushStart, ZK, "lin"], [pushEnd, ZC, "push"]);
  cyK.push([pushStart, 0, "lin"], [pushEnd, CY_C, "push"]);
  scanStart.push(pushStart + T.scanLead);
  const end = Math.max(pushEnd, scanStart[0] + scanLen(CAROUSEL[FEATURED[0]]) + T.rest);
  SHOTS.push(["展开·右滑·特写 1", cur, end]);
  cur = end;
}
for (let k = 1; k < 4; k++) {
  // 第 2–4 张：镜头大小不变，下一张从右边平移进来
  sK.push([cur, FEATURED[k - 1], "lin"], [cur + T.pan, FEATURED[k], "pan"]);
  scanStart.push(cur + T.panScanLead);
  const end = scanStart[k] + scanLen(CAROUSEL[FEATURED[k]]) + T.rest;
  SHOTS.push([`特写 ${k + 1}`, cur, end]);
  cur = end;
}
const WALL_T = cur;
const DUR = WALL_T + T.wall + T.wallHold;
zoomK.push([WALL_T, ZC, "lin"], [WALL_T + T.wall, ZW, "wallZoom"], [DUR, 0.31, "calm"]);
cyK.push([WALL_T, CY_C, "lin"], [WALL_T + T.wall, 0, "wall"]);
SHOTS.push(["拉远·专利墙", WALL_T, DUR]);

// 翻转卡此刻的姿态
function flipState(t) {
  const u = t - FLIP_T - FLIP.hold;
  if (u <= 0) return { rotY: FLIP.rotY0, rotZ: FLIP.rotZ0, scale: FLIP.scale0, dy: FLIP.dy0 };
  if (u <= FLIP.turn) {
    const p = E.flipTurn(u / FLIP.turn);
    return { rotY: lerp(FLIP.rotY0, 180, p), rotZ: lerp(FLIP.rotZ0, 0, p),
             scale: lerp(FLIP.scale0, 1 + FLIP.overshoot, p), dy: lerp(FLIP.dy0, 0, p) };
  }
  const p = E.flipSettle(clamp((u - FLIP.turn) / FLIP.settle));
  return { rotY: 180, rotZ: 0, scale: lerp(1 + FLIP.overshoot, 1, p), dy: 0 };
}

// 专利墙里每张卡的纵向位置：每张单独进场——上半部分的从顶边滑下来，下半部分的从底边升上来，离主卡近的先到
function wallTarget(cell) { return cell.r * PY + (cell.c === 0 ? 0 : COL_OFF[cell.c] * PY); }
function wallY(cell, t) {
  const u = t - WALL_T, target = wallTarget(cell), dir = cell.c % 2 === 0 ? 1 : -1;
  let y = target;
  if (Math.abs(cell.c) === 1 && cell.r === 0 && u < 0.3) y = 0;   // 特写时露在两边的两张：原地淡出
  else if (cell.c !== 0 || cell.r !== 0) {
    const dist = Math.hypot(cell.c * PX, target) / PX;
    const p = E.land(clamp((u - T.cards - (dist - 1) * T.cardStep) / T.cardDur));
    y += (target < 0 ? -1 : 1) * T.enter * PY * (1 - p);
  }
  // 铺满后整面墙不停：相邻列反向慢慢滚（速度缓慢爬升，不会突然动起来）
  const f = Math.max(0, u - 1.8), R = 1.0;
  y += -dir * T.flow * (f < R ? f * f / (2 * R) : f - R / 2);
  return y;
}

// 卡片带形状（缩小时）：下标差 d → 横向位置（几张卡宽）和缩放。左右对称，都叠在主卡后面
const STRIP_X = { "-8":-2.15, "-7":-1.97, "-6":-1.77, "-5":-1.55, "-4":-1.31, "-3":-1.04, "-2":-0.74, "-1":-0.40,
                  0:0, 1:0.40, 2:0.74, 3:1.04, 4:1.31, 5:1.55, 6:1.77, 7:1.97, 8:2.15 };
const STRIP_S = { "-8":0.62, "-7":0.65, "-6":0.68, "-5":0.71, "-4":0.74, "-3":0.78, "-2":0.84, "-1":0.91,
                  0:1, 1:0.91, 2:0.84, 3:0.78, 4:0.74, 5:0.71, 6:0.68, 7:0.65, 8:0.62 };
// Catmull-Rom：卡片经过每个位置时速度连续，不会一顿一顿
function strip(table, d) {
  d = clamp(d, -8, 8);
  const i = Math.min(7, Math.floor(d)), f = d - i;
  const v = j => table[clamp(j, -8, 8)];
  const p0 = v(i - 1), p1 = v(i), p2 = v(i + 1), p3 = v(i + 2);
  return 0.5 * ((2*p1) + (-p0 + p2)*f + (2*p0 - 5*p1 + 4*p2 - p3)*f*f + (-p0 + 3*p1 - 3*p2 + p3)*f*f*f);
}

// ───────── 专利墙布局 ─────────
// 中间一行就是特写时那一排（同样间距、同样的图），拉远时各列再上下错开，所以切换处没有跳变
const PX = CW + GAP, PY = CH + GAP;
const COL_OFF = { 0:0, 1:0.42, "-1":0.68, 2:0.15, "-2":0.33, 3:0.78, "-3":0.05, 4:0.5, "-4":0.88, 5:0.25, "-5":0.6, 6:0.9, "-6":0.4, 7:0.12, "-7":0.72 };
const WALL = [];
(function buildWall() {
  const names = ["p1","p2","p3","p4","p5","p6"], center = FEATURED[3];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grid = {};
  for (let c = -7; c <= 7; c++) grid[`${c},0`] = CAROUSEL[center + c] || names[(c + 70) % 6];
  for (let c = -7; c <= 7; c++) for (let r = -6; r <= 6; r++) {
    if (r !== 0) {
      const avoid = [grid[`${c},${r-1}`], grid[`${c},${r+1}`], grid[`${c-1},${r}`], grid[`${c-1},${r+1}`]];
      let name;
      do { name = names[Math.floor(rnd() * 6)]; } while (avoid.includes(name));
      grid[`${c},${r}`] = name;
    }
    WALL.push({ c, r, name: grid[`${c},${r}`], featured: r === 0 ? FEATURED.indexOf(center + c) : -1 });
  }
})();

// ───────── 图片 ─────────
const IMGS = {};
function loadAll() {
  const jobs = [];
  for (let i = 1; i <= 6; i++) for (const suf of ["", "_blank"]) {
    const key = `p${i}${suf}`, im = new Image();
    im.src = `assets/${key}.jpg`;
    IMGS[key] = im;
    jobs.push(im.decode());
  }
  IMGS.logo = new Image();
  IMGS.logo.src = "assets/logo.jpg";
  jobs.push(IMGS.logo.decode());
  return Promise.all(jobs);
}

// ───────── 画一张证书 ─────────
const ctx = cv.getContext("2d");
ctx.imageSmoothingQuality = "high";

function drawCard(name, sx, sy, sw, sh, featured, t) {
  const cards = state.cards.slice(1); if(!cards.length)return; const slot = (Number(name.slice(1))-1)%cards.length; const card=cards[slot], record=resources.get(card.libraryId);
  if(!record)return; name=record.rowsKey||name;
  sw *= card.scale;sh *= card.scale;
  if(!record.rowsKey || card.caption || card.rotation || card.opacity !== 1 || record.animated || cards.length>6){ helpers.asset(ctx,card,resources,t,sx,sy,sw,sh,false);helpers.cardText(ctx,card,sx,sy,sw,sh,t,featured<0?1:clamp((t-scanStart[featured])/0.7),state);return; }
  sx += card.x;sy += card.y;
  const x = sx - sw/2, y = sy - sh/2;
  if (x > W || y > H || x + sw < 0 || y + sh < 0) return;
  // 阴影：白底上让证书浮起来一点
  if (sh > 250) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.16)";
    ctx.shadowBlur = Math.min(40, sh * 0.03);
    ctx.shadowOffsetY = Math.min(16, sh * 0.012);
    ctx.fillStyle = "#f3eee4";
    ctx.fillRect(x, y, sw, sh);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(x - 1, y - 1, sw + 2, sh + 3);
  }
  const t0 = featured >= 0 ? scanStart[featured] : -1;
  if (featured < 0 || t >= t0 + scanLen(name)) { ctx.drawImage(IMGS[name], x, y, sw, sh); return; }
  ctx.drawImage(IMGS[name + "_blank"], x, y, sw, sh);
  if (t < t0) return;
  const k = sw / IMG_W;
  window.PATENT_ROWS[name].rows.forEach((r, j) => {
    const p = clamp((t - t0 - rowStart(j)) / rowDur(r));
    if (p <= 0) return;
    // 按字出现：已出现的字整段画出，正在出现的那个字淡入
    const g = r.glyphs, n = g.length, rh = r.y1 - r.y0;
    const done = Math.floor(p * n), frac = p * n - done;
    const base = ctx.globalAlpha;
    const draw = (gx0, gx1, alpha) => {
      ctx.globalAlpha = alpha * base;
      ctx.drawImage(IMGS[name], gx0, r.y0, gx1 - gx0, rh, x + gx0 * k, y + r.y0 * k, (gx1 - gx0) * k, rh * k);
      ctx.globalAlpha = base;
    };
    if (done > 0) draw(r.x0, Math.min(r.x1, done < n ? g[done][0] : r.x1), 1);
    if (done < n && frac > 0) draw(g[done][0], g[done][1], frac);
  });
}

// ───────── Logo 翻转卡 ─────────
// canvas 没有 3D，按竖条切开逐条做透视投影，效果等同 CSS perspective + rotateY
const LOGO_CROP = { sx: 0, sy: (1672 - 941 * IMG_H / IMG_W) / 2, sw: 941, sh: 941 * IMG_H / IMG_W };
function drawFlip(t) {
  const st = flipState(t);
    const th = st.rotY * Math.PI / 180, cos = Math.cos(th), sin = Math.sin(th);
  const D = FLIP.perspective * CW * ZK;
  const front = cos >= 0;
  const active=front?state.cards[0]:state.cards.slice(1)[4%Math.max(1,state.cards.length-1)];
  if(!active)return;
  const w=CW*ZK*st.scale*active.scale,h=CH*ZK*st.scale*active.scale;
  const N = 96;
  const proj = x => x * cos * D / (D + x * sin);
  ctx.save();
  ctx.globalAlpha*=active.opacity??1;
  ctx.translate(W / 2+(active.x||0), H / 2 + st.dy * CH * ZK+(active.y||0));
  ctx.rotate((st.rotZ+(active.rotation||0)) * Math.PI / 180);
  // 阴影：按投影后的外框画
  const xl = proj(-w / 2), xr = proj(w / 2);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.16)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = front ? "#fff" : "#f3eee4";
  const fl = D / (D - w / 2 * sin), fr = D / (D + w / 2 * sin);
  ctx.beginPath();
  ctx.moveTo(xl, -h / 2 * fl); ctx.lineTo(xr, -h / 2 * fr); ctx.lineTo(xr, h / 2 * fr); ctx.lineTo(xl, h / 2 * fl);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  for (let i = 0; i < N; i++) {
    const xa = -w / 2 + w * i / N, xb = xa + w / N, xm = (xa + xb) / 2;
    const pa = proj(xa), pb = proj(xb), f = D / (D + xm * sin);
    const left = Math.min(pa, pb), dw = Math.abs(pb - pa) + 0.6, dh = h * f;
    if (front) {
      const u0 = (xa + w / 2) / w;
      const logo = helpers.image(state.cards[0],resources,t); if(logo){const original=state.cards[0]?.libraryId==="patentwall-logo";const crop=original?LOGO_CROP:{sx:0,sy:0,sw:logo.width,sh:logo.height};ctx.drawImage(logo,crop.sx+u0*crop.sw,crop.sy,crop.sw/N,crop.sh,left,-dh/2,dw,dh);}
    } else {
      const u0 = (w / 2 - xb) / w;   // 背面左右镜像，转到 180° 时正好是正的
      const card=state.cards.slice(1)[4%Math.max(1,state.cards.length-1)],image=helpers.image(card,resources,t);if(image)ctx.drawImage(image,u0*image.width,0,image.width/N,image.height,left,-dh/2,dw,dh);
    }
  }
  helpers.cardText(ctx,{...active,x:0,y:0,rotation:0,opacity:1},0,0,Math.abs(proj(w/2)-proj(-w/2)),h,t,1,state);
  ctx.restore();
}

// ───────── 一帧 ─────────
function render(t) {
  if(!state.cards.length){ctx.clearRect(0,0,W,H);return;}
  const z = track(zoomK, t, true);
  const camY = track(cyK, t);
  if(state.backgroundMedia)ctx.clearRect(0,0,W,H);else{ctx.fillStyle=state.backgroundColor;ctx.fillRect(0,0,W,H);}
  const toScreen = (wx, wy) => [W/2 + wx * z, H/2 + (wy - camY) * z];

  if (t < WALL_T) {
    // 卡片带左右对称、都叠在主卡后面；推到特写时变成等距一排（m 跟着镜头大小走）
    const m = clamp(Math.log(z / ZK) / Math.log(ZC / ZK));
    const s = track(sK, t);
    const flipping = t < FLIP_END;
    // 翻转转过侧面、专利面一露出来，左右就同时往外展开
    const e = E.spread(clamp((t - SPREAD_T) / T.spread));
    const fade = clamp((t - SPREAD_T) / 0.08);
    const list = [];
    if (t >= SPREAD_T) for (let i = Math.floor(s) - 8; i <= Math.floor(s) + 8; i++) {
      const name = CAROUSEL[i]; if (!name) continue;
      const d = i - s;
      if (flipping && i === 0) continue;               // 主卡还在翻，单独画
      const wx = lerp(strip(STRIP_X, d) * CW, d * PX, m) * (i === 0 ? 1 : e);
      const sc = lerp(0.7, lerp(strip(STRIP_S, d), 1, m), d === 0 ? 1 : e);
      list.push({ i, name, wx, sc, key: -Math.abs(d) });   // 离中间越近越在上面
    }
    list.sort((a, b) => a.key - b.key);
    for (const c of list) {
      const [sx, sy] = toScreen(c.wx, 0);
      ctx.globalAlpha = c.i === 0 ? 1 : fade;
      drawCard(c.name, sx, sy, CW * c.sc * z, CH * c.sc * z, FEATURED.indexOf(c.i), t);
      ctx.globalAlpha = 1;
    }
    if (flipping) drawFlip(t);
  } else {
    // 专利墙：每张单独上下进场，见 wallY
    const u = t - WALL_T;
    for (const cell of WALL) {
      const [sx, sy] = toScreen(cell.c * PX, wallY(cell, t));
      // 特写时露在两边的那两张：先原地淡出，稍后再从屏幕外滑进来
      ctx.globalAlpha = Math.abs(cell.c) === 1 && cell.r === 0 && u < 0.3 ? 1 - u / 0.3 : 1;
      drawCard(cell.name, sx, sy, CW * z, CH * z, cell.featured, t);
      ctx.globalAlpha = 1;
    }
  }
}


const originalCarousel={...CAROUSEL},originalWall=WALL.map(c=>c.name);
return { width:W,height:H,shots:SHOTS,duration:DUR,draw(t,s,r){state=s;resources=r;const count=Math.max(1,s.cards.length-1);for(const key of Object.keys(CAROUSEL))CAROUSEL[key]=count===6?originalCarousel[key]:"p"+(((Number(key)+1000)%count)+1);WALL.forEach((cell,i)=>cell.name=count===6?originalWall[i]:"p"+((i%count)+1));for(const a of r.values())if(a.rowsKey){IMGS[a.rowsKey]=a.image;IMGS[a.rowsKey+'_blank']=a.blankImage||a.image;} render(t);}};
};
