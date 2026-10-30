// jd-portal v3（v2 + 弧形首页 + 开场）：整页一个 canvas。真实 Live 画面不拆层；立体感 = 深度视差(空间照片) + 卡片 3D 倾斜。
import * as THREE from 'three';

const BASE = new URLSearchParams(location.search).get('assets') || './assets';
const DEFS = [
  { id: 'road', t: ['monument', 'valley'] },
  { id: 'street', t: ['los', 'angeles'] },
  { id: 'lake', t: ['lake', 'powell'] },
];
// 只用于开场的 4 张卡(无 ext、无全屏、不能点开)。fanK = 开场扇面位置(中心 street=0，负=左，正=右)
const EXTRA_DEFS = [
  { id: 'vegas', fanK: -2, intro: true }, { id: 'glencanyon', fanK: -3, intro: true },
  { id: 'cloud', fanK: 2, intro: true }, { id: 'goldengate', fanK: 3, intro: true },
];
const FAN_K = { road: -1, street: 0, lake: 1 };
// 首页弧面：左卡绕 y +25°(朝向中间)、右卡 -25°，外侧更近(z>0)更大；中间正对、稍远(z<0)。手机竖屏侧卡 ±12°。
const ARC = { rotL: 25, rotP: 12, zSide: 0.05, zMid: -0.05, sp: 1.1 };   // z 单位 = 相机距离 D；sp = 相邻卡中心距(占卡宽)
const K_CARD = 0.012, K_FULL = 0.02;       // 视差强度：单位 = 卡片窗口宽度占画面宽度的比例 × 倾斜量
const TILT_DEG = 5.5;
const FEATHER = { street: 0.12 };           // 视频边缘羽化宽度(占画面宽)：street 手持晃得厉害，接缝放宽；road/lake 6%
const OMEGA = 7.4;                         // 临界阻尼弹簧：约 0.9s 到位，无过冲
const BG0 = new THREE.Color(0xEEEDF0);
const CENTER_K = 1.2;                      // 首页中间卡放大系数(世界尺寸)；因中间在弧面后方、侧卡在前方，屏幕上约为侧卡的 1.085 倍

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: new URLSearchParams(location.search).get('aa') === '1',   // 默认关 MSAA：这块弱显卡上 MSAA 解析占掉一大半帧时间(36→60fps)，圆角边缘由着色器里的 SDF 抗锯齿，肉眼无差别
    alpha: false, powerPreference: 'high-performance' });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);
let camD = 1000;                                  // 相机距离：首页 1.5H；开场 4.8×卡高(真透视)，开场末尾渐变回 1.5H。z=0 平面始终像素对齐
const raycaster = new THREE.Raycaster();
let W = 0, H = 0;

// ------------------------------------------------------------------ shader
const vert = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const frag = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVid, uPoster, uExt, uExtD, uExt2, uExtD2;       // ext2 = 第二个镜头(street 的空地)的延伸底图
uniform vec4 uCamA2, uVR2; uniform vec2 uCamT2; uniform vec3 uGain2; uniform float uShotW, uWhip;   // uWhip：转场「对焦」时 ext 采样的 mip 级别(0=清晰)；ext 带 mipmap，用 textureLod 做各向同性模糊，和视频里烘焙的高斯模糊同节奏   // uShotW：第二镜头的权重(0..1)，叠化时两张 ext 按它混合
uniform float uVidOK;
uniform vec2 uClip, uFrameO, uFrameS;      // 裁剪矩形像素尺寸；画面左上角(相对裁剪矩形左上)；画面像素尺寸
uniform float uKB; uniform vec2 uWinC;      // 开场慢推：画面围绕卡窗中心放大 uKB 倍(1=不变)，让风景类几乎静止的 Live 也明显在动
uniform vec4 uVR;                          // 视频在 ext 里的矩形 x0,y0,w,h (ext uv, 自上而下)
uniform vec2 uTilt, uHL, uCamT;
uniform float uBlurBG, uIter, uDXs;
uniform vec2 uVX, uVYR, uVYD;               // 帧坐标 -> 视频纹理坐标(卡片版只含卡窗口；全屏版含整幅)
uniform vec4 uWB;                           // 当前视频覆盖的画面范围(帧归一化 x0,y0,x1,y1)；之外用 poster
uniform vec4 uCamA;
uniform vec3 uGain;
uniform float uK, uWinW, uDF, uFeather, uRad, uOp, uHLamt, uBackF, uRimA;
// street 全屏：同一段视频放大铺满 + 强高斯模糊(iOS 竖视频在横屏里的模糊底)；只采 RGB 半幅，取样点内缩防止采到深度半幅
vec3 blurbg(vec2 f){
  vec2 b = vec2(.5 + (f.x-.5)*uFrameS.x/max(uClip.x,1.), .5 + (f.y-.5)*mix(1., uFrameS.x/max(uClip.x,1.), .35));   // 横向放大铺满，纵向只放大一点：模糊底带整幅画面的颜色分布(天/地/人)
  vec3 acc = vec3(0.); float wsum = 0.;
  for(int i=0;i<16;i++){
    float fi = float(i)+.5; float r = sqrt(fi/16.)*.075; float a = fi*2.39996;
    vec2 q = clamp(b + vec2(cos(a), sin(a))*r, vec2(.03,.04), vec2(.97,.96));
    float w = exp(-r*r/.0030);
    vec3 s = (uVidOK>.5 && uWB.z-uWB.x>.99) ? textureLod(uVid, vec2(q.x, 1.-.5*q.y), 3.6).rgb : textureLod(uPoster, vec2(q.x,1.-q.y), 3.6).rgb;
    acc += s*w; wsum += w;
  }
  return acc/wsum*.92;                                  // 亮度降约 8%
}
float rr(vec2 p, vec2 hs, float r){ vec2 q=abs(p)-hs+r; return length(max(q,0.))+min(max(q.x,q.y),0.)-r; }
// 视频纹理：全屏版 上半 RGB、下半深度；卡片版 上 2/3 RGB(窗口裁剪)、下 1/3 半分辨率深度
vec3 vrgb(vec2 f){ return textureLod(uVid, vec2(uVX.x*f.x+uVX.y, uVYR.x*f.y+uVYR.y), 0.).rgb; }
float vdep(vec2 f){ return mix(uDF, textureLod(uVid, vec2((uVX.x*f.x+uVX.y)*uDXs, uVYD.x*f.y+uVYD.y), 0.).r, uVidOK); }
vec3 ergb(vec2 e){ return textureLod(uExt, vec2(e.x, 1.-e.y), 0.).rgb; }
float edep(vec2 e){ return textureLod(uExtD, vec2(e.x, 1.-e.y), 0.).r; }
// ext 采样：帧坐标 f -> 经相机跟踪 -> ext 坐标，ext 深度视差(迭代 2 次)，乘整体色调增益
vec3 extSample(sampler2D E, sampler2D ED, vec4 cA, vec2 cT, vec3 gn, vec4 vr, vec2 f, float asp, float s){
  vec2 q = vec2(cA.x*f.x + cA.y*f.y, cA.z*f.x + cA.w*f.y) + cT;
  vec2 e0 = clamp(vr.xy + q*vr.zw, vec2(.0005), vec2(.9995));
  vec2 eu = e0;
  for(int i=0;i<2;i++){ float d=textureLod(ED, vec2(eu.x, 1.-eu.y), 0.).r; eu = clamp(e0 + vec2(uTilt.x*vr.z, uTilt.y*asp*vr.w)*(d-uDF)*s, vec2(.0005), vec2(.9995)); }
  return textureLod(E, vec2(eu.x, 1.-eu.y), uWhip).rgb*gn;
}
vec3 extSampleW(sampler2D E, sampler2D ED, vec4 cA, vec2 cT, vec3 gn, vec4 vr, vec2 f, float asp, float s){ return extSample(E, ED, cA, cT, gn, vr, f, asp, s); }
void main(){
  float ux = uBackF>.5 ? 1.-vUv.x : vUv.x;                // 背面：同一块玻璃从后面看 → 左右镜像
  vec2 lp = vec2(ux, 1.-vUv.y)*uClip;
  float sd = rr(lp-.5*uClip, .5*uClip, uRad);
  float a = 1.-smoothstep(-.7,.7,sd);
  if(a<=0.) discard;
  vec2 f = (lp-uFrameO)/uFrameS;                       // 画面(视频)归一化坐标
  f = uWinC + (f - uWinC)/uKB;
  float s = uK*uWinW;                                  // 视差基准位移(画面宽度的比例)
  float asp = uFrameS.x/uFrameS.y;
  // 视频(迭代 uIter 次：卡片版 1、全屏版 2)；范围外/未就绪用 poster
  vec2 lo = uWB.xy+vec2(.0015), hi = uWB.zw-vec2(.0015);
  vec2 fv = clamp(f, lo, hi);
  vec2 fu = fv;
  for(int i=0;i<2;i++){ if(float(i)>=uIter) break; float d=vdep(fu); fu = clamp(fv + vec2(uTilt.x, uTilt.y*asp)*(d-uDF)*s, lo, hi); }
  float inV = step(uWB.x,f.x)*step(f.x,uWB.z)*step(uWB.y,f.y)*step(f.y,uWB.w)*uVidOK;
  vec3 cv = inV>.5 ? vrgb(fu) : textureLod(uPoster, vec2(clamp(f.x,0.,1.), 1.-clamp(f.y,0.,1.)), 0.).rgb;
  float fw = max(uFeather, 1e-4);
  float m = smoothstep(0.,fw,f.x)*smoothstep(0.,fw,1.-f.x);
  m *= step(0., f.y)*step(f.y, 1.);
  if(uFeather<=1e-4) m = step(0.,f.x)*step(f.x,1.)*step(0.,f.y)*step(f.y,1.);
  vec3 ce = vec3(0.);
  if(m<.999){                                         // 只有画面边缘之外才算 ext / 模糊底(卡片态完全跳过)
    if(uBlurBG>.5) ce = blurbg(f);
    else {
      if(uShotW<.999) ce = extSampleW(uExt, uExtD, uCamA, uCamT, uGain, uVR, f, asp, s);           // 镜头 1 的 ext(帧坐标 -> 海报(ext)坐标：ext 跟着镜头平移+旋转+缩放)
      if(uShotW>.001){ vec3 c2 = extSampleW(uExt2, uExtD2, uCamA2, uCamT2, uGain2, uVR2, f, asp, s); ce = uShotW>.999 ? c2 : mix(ce, c2, uShotW); }   // 镜头 2 的 ext；叠化段两张按权重混合
    }
  }
  vec3 c = mix(ce, cv, m);
  // 玻璃反光(随倾斜移动)，全屏时淡出
  vec2 p = (vec2(ux,vUv.y)-.5)*vec2(uClip.x/uClip.y,1.);
  vec2 cc = uHL;                                       // 高光中心(卡面坐标，已按卡高归一)
  float g = exp(-dot(p-cc,p-cc)/.06);
  float band = smoothstep(.18,0.,abs(dot(p-cc, normalize(vec2(.8,.6)))));
  c += (g*.06 + band*.019)*uHLamt;   // v3：约为 v2(.16/.05)的 37%，小光斑+窄斜带，像玻璃上的一点高光
  // 玻璃：圆角内侧一条细亮边(左上亮右下暗)，正面很淡，背面更明显；背面再罩一层约 11% 白霜 + 轻微去饱和 + 随倾斜移动的斜向高光
  { float rim = 1.-smoothstep(0.,1.7,-sd); vec2 dd = lp-.5*uClip; float gdir = .5+.5*dot(dd/max(length(dd),1.), normalize(vec2(-.55,-.83)));
    c = mix(c, vec3(.97,.985,1.), clamp(rim*uRimA*(.35+.65*gdir),0.,1.));
    if(uBackF>.5){
      float lum = dot(c, vec3(.3,.59,.11)); c = mix(vec3(lum), c, .9); c = mix(c, vec3(.96,.98,1.), .11);
      float sh = smoothstep(.17,0.,abs(dot(p-vec2(-.08+uTilt.x*.3, .12-uTilt.y*.2), normalize(vec2(.7,.7)))));
      c += sh*.06 + .03*(1.-vUv.y);
    } }
  gl_FragColor = vec4(c, a*uOp);
}`;

// ------------------------------------------------------------------ 标题
// Inter 500(OFL，本地 fonts/)；画布 2048×1024(4×)，字距 -0.01em；mipmap + 各向异性，缩小也锐利。等字体就绪后才画
const TITLE_FONT = '500 200px Inter, -apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';
function titleTexture(lines) {
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 1024;
  const g = cv.getContext('2d');
  g.font = TITLE_FONT; if ('letterSpacing' in g) g.letterSpacing = '-2px';       // -0.01em × 200px
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,.26)'; g.shadowBlur = 24; g.shadowOffsetY = 4;
  lines.forEach((l, i) => g.fillText(l, 12, 200 + i * 224));
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

// 卡片实体：圆角板，厚约卡高 1.2%。正面 = 着色器平面(Live)，侧边 = 浅色半透明玻璃，背面 = 纯色背壳(取 poster 主色，提亮降饱和 + 竖向渐变 + 柔和高光)
const CARD_T = 0.010;
const bodyGeo = (() => {
  const w = 0.75, h = 1, r = 0.045, sh = new THREE.Shape();
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
  sh.lineTo(w / 2, h / 2 - r); sh.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
  sh.lineTo(-w / 2 + r, h / 2); sh.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
  sh.lineTo(-w / 2, -h / 2 + r); sh.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(sh, { depth: CARD_T, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -CARD_T / 2); return g;
})();
const bodyVert = `varying vec3 vN; varying vec3 vP; varying vec3 vW; varying vec3 vNW; varying vec3 vZW;
void main(){ vN=normal; vP=position; vec4 wp=modelMatrix*vec4(position,1.); vW=wp.xyz; vNW=mat3(modelMatrix)*normal; vZW=mat3(modelMatrix)*vec3(0.,0.,1.); gl_Position=projectionMatrix*viewMatrix*wp; }`;
// 厚度边：薄玻璃。大部分透明、微冷、带一点卡片主色；一条细亮线随视角在厚度方向移动，掠射角(Fresnel)更亮；没有不透明白
const bodyFrag = `precision highp float; varying vec3 vN; varying vec3 vP; varying vec3 vW; varying vec3 vNW; varying vec3 vZW; uniform vec3 uBack; uniform float uOp;
void main(){
  if(abs(vN.z)>.5) discard;                              // 正反面由 Live 平面负责(背面 = 镜像 Live)；这里只画厚度边
  vec3 V = normalize(cameraPosition - vW); float ndv = abs(dot(normalize(vNW), V));
  float fr = pow(1.-ndv, 2.2);
  float zn = vP.z/(${CARD_T}*.5);
  float c0 = clamp(dot(V, normalize(vZW))*1.6, -.7, .7);
  float ln = exp(-pow((zn-c0)/.2, 2.));
  vec3 tint = mix(vec3(.74,.82,.92), uBack, .3)*(.82+.1*(vP.y+.5));
  vec3 col = tint + vec3(.55,.62,.7)*ln*(.45+.55*fr);
  float a = clamp(.16 + .26*fr + ln*(.18+.4*fr), 0., .78);
  gl_FragColor = vec4(col, a*uOp);
}`;
function shellColor(img) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 16; const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, 16, 16); const d = g.getImageData(0, 0, 16, 16).data; let r = 0, gg = 0, b = 0;
  for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
  const n = d.length / 4, col = new THREE.Color(r / n / 255, gg / n / 255, b / n / 255), hsl = {}; col.getHSL(hsl);
  col.setHSL(hsl.h, Math.min(0.55, hsl.s * 0.65), Math.min(0.86, hsl.l * 0.55 + 0.42)); return col;
}

// ------------------------------------------------------------------ 卡片
const loader = new THREE.TextureLoader();
const tex = url => new Promise((res, rej) => loader.load(url, t => { t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; res(t); }, undefined, rej));
const cards = [];
function makeVideo(src) {
  const v = document.createElement('video');
  v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.src = src;
  // 记录「真正显示出来的那一帧」的媒体时间：currentTime 比上屏的帧超前 1–2 帧，按它切 ext 会在镜头切点错位(街景视频配空地 ext)
  v.addEventListener('seeking', () => { v._mt = null; });
  if ('requestVideoFrameCallback' in v) { const tick = (now, md) => { v._mt = md.mediaTime; v.requestVideoFrameCallback(tick); }; v.requestVideoFrameCallback(tick); }
  return v;
}
const shownTime = v => (v._mt != null && !v.seeking ? v._mt : v.currentTime) || 0;
// 视频纹理映射：卡片版(只含窗口) / 全屏版(整幅，上半 RGB 下半深度)
function setVidMap(c, full) {
  const u = c.u, w = c.win;
  if (full === 'small') {
    const ww = w[2] - w[0], wh = w[3] - w[1];
    u.uVX.value.set(1 / ww, -w[0] / ww); u.uVYR.value.set(-1 / wh, 1 + w[1] / wh); u.uVYD.value.set(-1 / wh, 1 + w[1] / wh);
    u.uDXs.value = 1; u.uWB.value.set(w[0], w[1], w[2], w[3]); u.uIter.value = 0;
  } else if (full) { u.uVX.value.set(1, 0); u.uVYR.value.set(-0.5, 1); u.uVYD.value.set(-0.5, 0.5); u.uDXs.value = 1; u.uWB.value.set(0, 0, 1, 1); u.uIter.value = 2; }
  else {
    const ww = w[2] - w[0], wh = w[3] - w[1];
    u.uVX.value.set(1 / ww, -w[0] / ww); u.uVYR.value.set(-(2 / 3) / wh, 1 + (2 / 3) * w[1] / wh); u.uVYD.value.set(-(1 / 3) / wh, 1 / 3 + (1 / 3) * w[1] / wh);
    u.uDXs.value = 0.5; u.uWB.value.set(w[0], w[1], w[2], w[3]); u.uIter.value = 1;
  }
}
// 点开：后台起全屏版视频(整幅+ext 区)，与卡片版对齐到同一帧后无缝切换；缩回后切回卡片版
// 弹跳循环(street)：视频帧号 → 慢放帧位置 pb/pf；卡片版↔全屏版按「位置 + 运动方向」找到对应帧
function bounceMap(c, fromArr, toArr, m, lead) {
  const n = fromArr.length, m2 = (m + lead) % n, pos = fromArr[m2], dir = fromArr[(m2 + 1) % n] - pos;
  let best = -1, be = 1e9;
  for (let j = 0; j < toArr.length; j++) {
    const d = toArr[(j + 1) % toArr.length] - toArr[j], e = Math.abs(toArr[j] - pos) + ((dir * d < 0) ? 3 : 0);
    if (e < be) { be = e; best = j; }
  }
  return be < 0.8 ? best : -1;
}
function startFull(c) {
  if (c.noFull || c.full === 'on' || c.full === 'loading') return;
  c.full = 'loading';
  const F = c.meta.full, fps = c.meta.fps;                       // F：全屏只播「ext 对得上的稳定段」(帧号 a..b，硬切循环)；没有就整段
  const a = F ? F.lo : 0, b = F ? F.hi : c.meta.cam.length - 1;   // 卡片版帧号 a..b 内才切(a 之前是全屏版开头的叠化段)
  c.camOff = F ? F.a : 0;
  const fv = c.fullVideo || (c.fullVideo = makeVideo(`${BASE}/${c.def.id}/${F ? F.file : 'live.mp4'}`));
  if (!c.fullVt) { const t = new THREE.VideoTexture(fv); t.colorSpace = THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.generateMipmaps = !!c.noExt; t.minFilter = c.noExt ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; c.fullVt = t; }
  const lead = 0.06, t0 = performance.now();
  const go = () => {
    if (c.full !== 'loading') return;
    const ft = (c.cardVideo.currentTime || 0) * fps;              // 卡片版此刻的帧号(cam 下标)
    let tf;
    if (c.meta.bounce) {                                           // 弹跳：位置+方向对齐
      const j = bounceMap(c, c.meta.bounce.pb, c.meta.bounce.pf, Math.floor(ft), 2);
      if (j < 0 && performance.now() - t0 < 6000) { requestAnimationFrame(go); return; }
      tf = (Math.max(0, j) + 0.5) / fps;
    } else if (F && F.c2f) {                                         // 多镜头(street)：卡片版帧号 -> 全屏版同一帧内容的帧号(全屏只含 ext 对得上的部分；c2f<0 = 全屏没有的帧，等播到有的)
      const j = F.c2f[(Math.floor(ft) + Math.round(lead * fps)) % F.c2f.length];
      if (j < 0 && performance.now() - t0 < 6000) { requestAnimationFrame(go); return; }
      tf = (Math.max(0, j) + 0.5) / fps;
    } else {
      if (!(ft >= a && ft <= b - lead * fps - 1) && performance.now() - t0 < 6000) { requestAnimationFrame(go); return; }   // 还没走进稳定段：等
      tf = clamp((ft - c.camOff) / fps + lead, 0, Math.max(0, fv.duration - 0.05));
    }
    fv.onseeked = () => {
      fv.onseeked = null;
      const sw = () => { if (c.full !== 'loading') { fv.pause(); return; } c.full = 'on'; c.u.uVid.value = c.fullVt; c.video = fv; setVidMap(c, true); c.cardVideo.pause(); c.playing = true; };
      fv.play().then(() => { if ('requestVideoFrameCallback' in fv) fv.requestVideoFrameCallback(() => requestAnimationFrame(sw)); else setTimeout(sw, 60); }).catch(() => { c.full = null; });
    };
    fv.currentTime = tf;
  };
  const ready = () => requestAnimationFrame(go);
  if (fv.readyState >= 3) ready(); else { fv.addEventListener('canplay', ready, { once: true }); fv.load && fv.preload !== 'auto' && fv.load(); }
}
function endFull(c) {
  if (c.full !== 'on' && c.full !== 'loading') return;
  const fv = c.fullVideo;
  if (c.full === 'on') {
    if (c.meta.bounce) { const j = bounceMap(c, c.meta.bounce.pf, c.meta.bounce.pb, Math.floor(fv.currentTime * c.meta.fps), 1); c.cardVideo.currentTime = ((j < 0 ? 0 : j) + 0.5) / c.meta.fps; }
    else if (c.meta.full && c.meta.full.f2c) { const f2c = c.meta.full.f2c, j = f2c[clamp(Math.floor(fv.currentTime * c.meta.fps), 0, f2c.length - 1)]; c.cardVideo.currentTime = ((j < 0 ? 0 : j) + 0.5) / c.meta.fps; }
    else c.cardVideo.currentTime = fv.currentTime + (c.camOff || 0) / c.meta.fps;
    c.u.uVid.value = c.cardVt; c.video = c.cardVideo; setVidMap(c, false); c.playing = false; setPlaying(c, true);
  }
  fv.pause(); c.full = null;
}

async function makeCard(def) {
  const meta = await (await fetch(`${BASE}/${def.id}/meta.json`)).json();
  let poster;
  const ph = () => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); t.needsUpdate = true; return t; };
  const ext = ph(), extD = ph();                       // ext / 深度大图先给 1x1 占位(卡片态用不到)，开场结束后分帧加载 + 预上传(loadExt)，避免开场卡顿
  if (def.intro || def.noExt) { meta.ext = { w: meta.w, video_rect: [0, 0, 1, 1] }; meta.cam = [[1, 0, 0, 1, 0, 0]]; meta.cam_gain = [[1, 1, 1]]; }
  poster = await tex(`${BASE}/${def.id}/poster.jpg`);
  if (def.noExt) { poster.generateMipmaps = true; poster.minFilter = THREE.LinearMipmapLinearFilter; }   // street 的模糊底在视频未切到全屏版时用 poster 的 mip
  const small = WANT_INTRO;                           // 开场期间 7 张都用 360×480 纯 RGB 小版(解码/上传最轻)，开场中途无缝换成标准卡片版
  const video = makeVideo(`${BASE}/${def.id}/${small ? 'live_s.mp4' : 'live_card.mp4'}`);   // 卡片版：只含卡窗口的 RGB 540×720 + 半分辨率深度，540×1080
  const vt = new THREE.VideoTexture(video); vt.colorSpace = THREE.NoColorSpace; vt.magFilter = THREE.LinearFilter; vt.minFilter = THREE.LinearFilter; vt.generateMipmaps = false;
  const win = meta.card_window;                       // [x0,y0,x1,y1] 归一化(画面)
  const vr = meta.ext.video_rect;                     // [x0,y0,x1,y1] 归一化(ext)
  const u = {
    uVid: { value: vt }, uPoster: { value: poster }, uExt: { value: ext }, uExtD: { value: extD }, uVidOK: { value: 0 },
    uExt2: { value: ph() }, uExtD2: { value: ph() }, uCamA2: { value: new THREE.Vector4(1, 0, 0, 1) }, uCamT2: { value: new THREE.Vector2() }, uGain2: { value: new THREE.Vector3(1, 1, 1) }, uShotW: { value: 0 }, uWhip: { value: 0 }, uVR2: { value: new THREE.Vector4(vr[0], vr[1], vr[2] - vr[0], vr[3] - vr[1]) },
    uClip: { value: new THREE.Vector2(100, 100) }, uFrameO: { value: new THREE.Vector2() }, uFrameS: { value: new THREE.Vector2(100, 100) }, uKB: { value: 1 }, uWinC: { value: new THREE.Vector2((win[0] + win[2]) / 2, (win[1] + win[3]) / 2) },
    uVR: { value: new THREE.Vector4(vr[0], vr[1], vr[2] - vr[0], vr[3] - vr[1]) },
    uCamA: { value: new THREE.Vector4(1, 0, 0, 1) }, uCamT: { value: new THREE.Vector2() }, uGain: { value: new THREE.Vector3(1, 1, 1) }, uTilt: { value: new THREE.Vector2() }, uHL: { value: new THREE.Vector2() },
    uK: { value: K_CARD }, uWinW: { value: win[2] - win[0] }, uDF: { value: meta.subject.depth },
    uBlurBG: { value: def.noExt ? 1 : 0 }, uIter: { value: 1 }, uDXs: { value: 0.5 }, uVX: { value: new THREE.Vector2(1, 0) }, uVYR: { value: new THREE.Vector2(-0.5, 1) }, uVYD: { value: new THREE.Vector2(-0.5, 0.5) }, uWB: { value: new THREE.Vector4(0, 0, 1, 1) }, uFeather: { value: 0 }, uRad: { value: 20 }, uOp: { value: 1 }, uHLamt: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); mat.side = THREE.FrontSide;
  u.uBackF = { value: 0 }; u.uRimA = { value: 0.16 };
  const backMat = new THREE.ShaderMaterial({ uniforms: { ...u, uBackF: { value: 1 }, uRimA: { value: 0.42 } }, vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false, depthWrite: false, side: THREE.FrontSide });
  const backMesh = new THREE.Mesh(mesh.geometry, backMat); backMesh.rotation.y = Math.PI;
  await document.fonts.load('400 20px Inter'); await document.fonts.ready;
  const tmat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const title = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), tmat);
  const bmat = new THREE.ShaderMaterial({ uniforms: { uBack: { value: shellColor(poster.image) }, uOp: { value: 1 } }, vertexShader: bodyVert, fragmentShader: bodyFrag, transparent: true, depthTest: false, depthWrite: false });
  const body = new THREE.Mesh(bodyGeo, bmat);
  const group = new THREE.Group(); group.add(body); group.add(mesh); group.add(backMesh); group.add(title); scene.add(group);
  let camDL = 0, camDR = 0;
  { const SD = vr[0] * meta.ext.w / meta.w;
    const lim = (m) => { const qL = m[0] * (-SD) + m[4], qR = m[0] * (1 + SD) + m[4]; camDL = Math.max(camDL, -SD - qL); camDR = Math.max(camDR, qR - (1 + SD)); };
    const SH = meta.shots, MF = meta.full;   // 多镜头：每个镜头只在自己权重>0 的帧上用到自己的 ext；全屏只播全屏版，所以只按全屏版的帧算平移范围
    if (SH && MF && MF.cam2) { MF.cam.forEach((m, i) => { if (MF.w[i] < 0.999) lim(m); }); MF.cam2.forEach((m, i) => { if (MF.w[i] > 0.001) lim(m); }); }
    else meta.cam.forEach(m => lim(m));
    camDL += 0.01; camDR += 0.01; }
  // 标题改为屏幕对齐的 HTML 叠层：不随卡片 3D 旋转/透视变形；位置跟卡片左上角的投影，字号跟卡片投影高度
  const tEl = document.createElement('div'); tEl.className = 'ttl'; tEl.innerHTML = (def.t || []).join('<br>'); document.body.appendChild(tEl); title.visible = false;
  const c = { backMesh, backMat, tEl, tFS: 0, tShow: false, camDL, camDR, def, meta, win, vr, video, cardVideo: video, vt, cardVt: vt, u, mesh, body, bmat, title, tmat, group, noExt: !!def.noExt, hover: 0, hlAmt: 1, hlPos: new THREE.Vector2(), aspect: meta.w / meta.h, feather: FEATHER[def.id] || 0.06, extRatio: meta.ext.w / meta.w, extSide: vr[0] * meta.ext.w / meta.w, playing: false, ready: false, idx: DEFS.indexOf(def), fanK: def.fanK ?? FAN_K[def.id], extra: !!def.intro, full: null };
  c.mode = small ? 'small' : 'std'; setVidMap(c, small ? 'small' : false);
  return c;
}

// ext / 深度大图：开场结束后一张张加载并预上传(initTexture)，不在开场里卡
function ensureExt(c) {
  if (c.noExt || c.def.intro) return Promise.resolve();
  if (c.extP) return c.extP;
  return c.extP = Promise.all([tex(`${BASE}/${c.def.id}/ext.jpg`), tex(`${BASE}/${c.def.id}/ext_depth.png`)]).then(([a, b]) => {
    if (c.meta.shots) { a.generateMipmaps = true; a.minFilter = THREE.LinearMipmapLinearFilter; } else { a.generateMipmaps = false; a.minFilter = THREE.LinearFilter; }   // 街景的 ext 带 mipmap(对焦转场里模糊采样用)；其余卡着色器只取 lod 0，不需要
    c.u.uExt.value = a; c.u.uExtD.value = b; renderer.initTexture(a); renderer.initTexture(b);
    if (c.meta.shots) return Promise.all([tex(`${BASE}/${c.def.id}/${c.meta.shots.ext}`), tex(`${BASE}/${c.def.id}/${c.meta.shots.ext_depth}`)]).then(([a2, b2]) => {
      a2.generateMipmaps = true; a2.minFilter = THREE.LinearMipmapLinearFilter; c.u.uExt2.value = a2; c.u.uExtD2.value = b2; renderer.initTexture(a2); renderer.initTexture(b2);
      return new Promise(r => requestAnimationFrame(r));
    });
    return new Promise(r => requestAnimationFrame(r));
  });
}
async function backgroundLoad() {
  for (const c of cards) { await ensureExt(c); await new Promise(r => setTimeout(r, 500)); }
  for (const c of cards) if (!c.fullVideo) { c.fullVideo = makeVideo(`${BASE}/${c.def.id}/${c.meta.full ? c.meta.full.file : 'live.mp4'}`); c.fullVideo.load(); await new Promise(r => setTimeout(r, 150)); }
}
function applyDPR() { if (O.on) { renderer.setPixelRatio(1); renderer.setSize(O.Wp, O.Hp, false); return; } renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, I.on ? INTRO_DPR : 2)); renderer.setSize(W, H, false); }

function setPlaying(c, on) {
  if (on && !c.playing) { c.playing = true; const p = c.video.play(); if (p && p.catch) p.catch(() => { c.playing = false; }); }
  else if (!on && c.playing) { c.playing = false; c.video.pause(); }
}

// ------------------------------------------------------------------ 状态
const S = {
  open: -1, p: 0, v: 0, target: 0, manual: false,
  scroll: 0, scrollT: 0,
  tilt: new THREE.Vector2(), tiltT: new THREE.Vector2(),
  mouse: { x: 0.5, y: 0.5, moved: false, t: -99, touch: false, in: false },
  gyro: { on: false, x: 0, y: 0, b0: null, g0: null },
  panX: 0, panT: 0, panMouse: false, panMouseRef: 0,
  drag: null, hl: new THREE.Vector2(),
};
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const portrait = () => W / H < 1.0;

// 首页每张卡的基础姿态 (屏幕像素, y 向下)：cx,cy,w,h + rot(绕 y 轴，弧度，正=朝向右/中间) + z(像素，+近)
// 三张卡在内凹弧面上：外侧卡转向中间、外侧边更近更大；中间正对、略远；垂直中心同一条线。整组再叠加倾斜(鼠标/陀螺仪)。
function homeRect(i, scroll = S.scroll) {
  const D = H * 1.5, por = portrait();
  let w, h;
  if (por) { h = Math.min(H * 0.66, (W * 0.78) * 4 / 3); w = h * 0.75; }
  else { w = Math.min(H * 0.66 * 0.75, W * 0.84 / (2 * ARC.sp + 1)); h = w * 4 / 3; }
  const off = por ? i - scroll : i - 1;
  const a = clamp(Math.abs(off), 0, 1);
  const cx = W / 2 + off * (por ? w + W * 0.07 : ARC.sp * w);
  const cy = H / 2 + (por ? -0.01 * H : 0);
  const rot = -clamp(off, -1, 1) * (por ? ARC.rotP : ARC.rotL) * Math.PI / 180;
  const z = D * lerp(ARC.zMid, ARC.zSide, a) * (por ? 0.5 : 1);
  const kc = lerp(por ? 1.12 : CENTER_K, 1, a);          // 中间(当前聚焦)那张放大；弧形排布不变
  return { cx, cy, w: w * kc, h: h * kc, rot, z, op: 1, title: 1 };
}

// 全屏时的内容几何：返回 frame 宽高、ext 宽、pan 范围
function fullGeom(c) {
  if (c.noExt) {                                       // street：不用 AI ext。画面居中、不左右平移，两侧是模糊底
    let FH = H, FW = FH * c.aspect; if (FW > W) { FW = W; FH = FW / c.aspect; }
    const x = (W - FW) / 2; return { FW, FH, SD: 0, ExtW: FW, lo: x, hi: x, center: x, mid: x, top: (H - FH) / 2 };
  }
  let FH = H, FW = FH * c.aspect;
  const ER = c.extRatio, SD = c.extSide;             // ext 宽 = 画面宽 * ER，左右各 SD
  if (ER * FW < W) { FW = W / ER; FH = FW / c.aspect; }
  if (c.meta.ext.pad_r_px != null) { const need = c.camDL + c.camDR + (c.meta.ext.pad_l_px + c.meta.ext.pad_r_px) / c.meta.w + 0.04; if ((ER - need) * FW < W) { FW = W / (ER - need); FH = FW / c.aspect; } }   // 街景：屏幕太宽、ext 放不下「屏宽 + 镜头漂移 + 软边」时，整体放大一点(裁上下)，宁可裁也不露出 ext 之外(会拉成横条)
  // 全屏版视频还没切上来时(c.full!=='on')，播的是只含「卡窗口」的卡片版，窗口之外会露出 poster(带人，和动的画面对不上 → 一条横向断线)。
  // 所以那段时间把画面放大到「窗口上下都盖满屏幕」(zNeed)，全屏版切上来后 zk 缓缓回到 1。
  const wh = c.win[3] - c.win[1]; c.zNeed = Math.max(1, H / (wh * FH) * 1.02);
  const zk = c.zk == null ? 1 : c.zk; FW *= zk; FH *= zk;
  const ExtW = ER * FW;
  const subj = c.meta.subject;
  const mid = (W - ExtW) / 2;                                // 居中时 ext 左边
  const center = clamp(W / 2 - (SD + subj.center[0]) * FW, W - ExtW, 0);   // 人物居中
  let top = FH > H + 1 ? clamp(H / 2 - subj.center[1] * FH, H - FH, 0) : (H - FH) / 2;
  if (c.zNeed > 1.0001 && zk > 1.0001) top = lerp(top, H / 2 - (c.win[1] + c.win[3]) / 2 * FH, clamp((zk - 1) / (c.zNeed - 1), 0, 1));   // 卡窗口居中盖满屏高
  // 播放时 ext 跟着镜头平移/缩放，视口边缘可能采到 ext 之外：把平移范围内缩 dL/dR(画面宽的比例)，保证采样不越界
  const padL = (c.meta.ext.pad_l_px != null ? c.meta.ext.pad_l_px : (c.meta.ext.pad_side_px || 0)) / c.meta.w, padR = (c.meta.ext.pad_r_px != null ? c.meta.ext.pad_r_px : (c.meta.ext.pad_side_px || 0)) / c.meta.w;   // ext 两侧为凑宽度加的柔化边(街景)：平移范围收紧，永远不露出来
  let lo = W - ExtW + (c.camDR + padR) * FW, hi = -(c.camDL + padL) * FW;
  if (hi < lo) { hi = lo = (W - ExtW) / 2; }
  return { FW, FH, SD, ExtW, lo, hi, center: clamp(center, lo, hi), mid, top };
}

// ------------------------------------------------------------------ 开场
/* 开场 v4：真 3D 透视，1:1 复刻苹果(参考视频2)。
   0–1.2s 严格照原片：7 张卡是同一透视相机(D=4.8×卡高)下的真物体，七张真正平行、同一转角，
   左排看到正面 Live、右排看到背面(背壳)。中心卡绕自身竖轴转，右边缘后退；其余 6 张起点在它正后方(被挡住)，
   左右成对沿斜线退到 ∧ 形槽位：屏幕偏移=±0.41/0.79/1.09×卡高(世界 X 再乘 1.22/1.47/1.75)，Z=−0.22/−0.47/−0.75×D；0.80/0.93/1.08s 出发，各 0.55s easeOutCubic。
   转角关键点(原片实测)：0:0° .1:6° .2:13° .3:26° .43:40° .53:46° .6:55° .73:68° .83:72° .9:77° 1.03:83° 1.2:87°，单调三次插值；1.2s 后 0.25s 缓收到 88°。
   以下是我们加的(用户第 4 条)：
     1.5–2.3s  7 张同时转回正面(中心先，外侧每对晚 0.04s)，展成正面弧形一排(中心最大)，右排自然翻到正面
     2.3–4.3s  正面停 2 秒（用户 10-30 要求从 1 秒加到 2 秒），7 张 Live 都在播，轻微漂浮
     4.3–5.3s  road/LA/lake 落到首页姿态(镜头同时拉回首页距离)；4 张新卡边侧转边后退、缩小、淡出；标题 5.0–5.3s 淡入
   最后一帧(t=INTRO_T)所有量 == 首页。 */
const INTRO_T = 5.52;                                   // 收拢 7→3 张由 1.0s 缩到 0.65s(用户 10-30：太拖)
const HOLD_END = 4.87;
const TURN_T = 1.6; const TURN_D = 1.15;   // 转回正面时长：0.68s→1.15s（用户 10-30：转到正面有点快）
                                   // 转回正面开始(原 1.5；扇面散开放慢后推近到 ~1.5s 才收尾，延后 0.1s，七张停留仍是 2s)
const FAN_SPREAD = 0.75, FAN_PUSH = 1.1;               // 横向散开 0.42s easeOutCubic → 0.75s smootherstep(从缝里慢慢滑出)；前推 0.95s → 1.1s
const CS = (INTRO_T - HOLD_END) / 1.0;                 // 收拢时长相对原 1.0s 的比例(0.65)                                   // 七张停住到这一刻，之后收拢 1.0s
const INTRO_DPR = new URLSearchParams(location.search).get('idpr') ? +new URLSearchParams(location.search).get('idpr') : 1.0;   // 开场渲染倍率(弱显卡上降到 1 以下省填充/MSAA 解析)
const ROT_PTS = [[0, 0], [.1, 10], [.2, 25], [.3, 38], [.4, 53], [.5, 65], [.55, 72], [.6, 75], [.7, 81], [.8, 84], [.9, 85.4], [1.0, 86.6], [1.2, 87.5], [1.45, 88]];   // 按「原片实时录屏 pts」重测(t=pts−0.1)：粉色屏宽/面积反推，0.6s 已转到约 75°，1.0s 约 87°。原表(0.6s=55°)的时间轴比实时慢约 1.45 倍(像拖进度条读数)
const ROT_D = (() => {                                // 单调三次(Fritsch–Carlson)：保证不回摆
  const n = ROT_PTS.length, h = [], dl = [], d = new Array(n);
  for (let i = 0; i < n - 1; i++) { h[i] = ROT_PTS[i + 1][0] - ROT_PTS[i][0]; dl[i] = (ROT_PTS[i + 1][1] - ROT_PTS[i][1]) / h[i]; }
  d[0] = 30; d[n - 1] = 0;
  for (let i = 1; i < n - 1; i++) {
    if (dl[i - 1] * dl[i] <= 0) d[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; d[i] = (w1 + w2) / (w1 / dl[i - 1] + w2 / dl[i]); }
  }
  return d;
})();
function fanDeg(t) {
  const P = ROT_PTS; if (t <= 0) return 0; if (t >= P[P.length - 1][0]) return P[P.length - 1][1];
  let i = 0; while (t > P[i + 1][0]) i++;
  const h = P[i + 1][0] - P[i][0], x = (t - P[i][0]) / h, x2 = x * x, x3 = x2 * x;
  return (2 * x3 - 3 * x2 + 1) * P[i][1] + (x3 - 2 * x2 + x) * h * ROT_D[i] + (-2 * x3 + 3 * x2) * P[i + 1][1] + (x3 - x2) * h * ROT_D[i + 1];
}
const ORDER = { road: 0, lake: 1, vegas: 2, cloud: 3, glencanyon: 4, goldengate: 5 };   // 左右成对、由近到远：偶数在左、奇数在右
const FAN_DUR = 0.5;    // 2026-10-29 晚按真实帧细化（见 introPose 扇面注释）；旧值 0.55：   // easeOutCubic。苹果逐帧(按 showinfo pts 对齐，t=pts−0.1)：第 1/2/3 对在 t≈0.60/0.68/0.78s 从粉色身后露出，约 0.55s 走完(n14→n24)；PLAN 里原先的 0.85/0.95/1.1 是帧号错位算出来的
const FAN_X = [0.41 * 1.22, 0.79 * 1.47, 1.09 * 1.75], FAN_Z = [0.22, 0.47, 0.75], FAN_T0 = [0.50, 0.58, 0.66];   // 苹果实测 0.41/0.79/1.09×卡高 是「屏幕上」的偏移；世界 X = 屏幕偏移 × (D−Z)/D
const extras = [];
const I = { on: false, t: 0, freeze: null };
const sm = x => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };      // smootherstep
const eo = x => 1 - Math.pow(1 - clamp(x, 0, 1), 3);                                         // easeOutCubic
const RAD = Math.PI / 180;

function introGeo() {
  const por = portrait();
  const wF = por ? 0.58 * W : 0.75 * 0.55 * H, hF = wF * 4 / 3;     // t=0 中心卡：横屏屏高 55%；手机宽 58%(66% 放不下扇面)
  const q = new URLSearchParams(location.search);               // 调试：?daw=镜头距离(×卡宽) &fxs=横向间距倍数
  const daw = q.get('daw') ? +q.get('daw') : null;
  // 镜头距离按「卡宽」对齐苹果(D≈2.7×iMac 宽)：我们是窄竖卡，按卡高算镜头太远、侧排只剩细棍。实测 2.0×卡宽、间距×0.5 最像 n26
  return { por, wF, hF, Da: (daw || 2.0) * wF, fxs: q.get('fxs') ? +q.get('fxs') : 0.5, compSign: q.get('cs') ? +q.get('cs') : -1, fanSign: 1 };
}
// 正面展开的一排：7 张底边对齐同一基线，尺寸从中心向外 1/.88/.77/.67 递减(中心最高、两侧台阶式变矮)；
// 相邻重叠约 12%(手机 25%)，中心压外侧、逐级压低；外侧向内微转 0/4/7/10°
const ROW_S = [1, 0.88, 0.77, 0.67];
function rowLayout(G) {
  // 尺寸几经调整：现在桌面重叠 32%，七张完整在屏内，中心卡高≈50% 屏高；
  // 手机中心卡宽≈62% 屏宽，两侧卡部分出屏
  const por = G.por, ov = por ? 0.38 : 0.32, xs = [0];
  for (let a = 1; a < 4; a++) xs[a] = xs[a - 1] + ((ROW_S[a - 1] + ROW_S[a]) / 2 - ov * ROW_S[a]);     // 单位：中心卡宽
  const wc = por ? 0.62 * W : Math.min(0.97 * W / (2 * (xs[3] + ROW_S[3] * 0.5)), 0.74 * H * 0.75);   // 用户「稍稍缩小，看不全」：七张完整在屏内(最外一对外边缘留约 1.5% 边距)
  return { wc, xs };
}
function rowSlot(c, G) {
  const k = c.fanK, ak = Math.abs(k), sg = Math.sign(k), L = rowLayout(G);
  const w = ROW_S[ak] * L.wc, hc = L.wc * 4 / 3, h = w * 4 / 3;
  return { x: sg * L.xs[ak] * L.wc, y: hc / 2 - h / 2 + (G.por ? 0 : 0), w, rot: -sg * [0, 4, 7, 10][ak] * RAD, z: -ak * 0.004 * G.Da };
}
function introCam(t) {
  const G = introGeo();
  return lerp(G.Da, H * 1.5, sm((t - HOLD_END) / CS));
}

// 方案 B（?scheme=b）：七张卡不转回正面，停在斜侧面（看起来约 ANG_B），尽量多露出画面；停 1 秒后同样收成首页三卡。方案 A 不变。
const SCHEME_B = new URLSearchParams(location.search).get('scheme') === 'b';
const ANG_B = 42 * RAD, OV_B = 0.30;
function angSlot(c, G) {
  const k = c.fanK, por = G.por;
  const pw = Math.cos(ANG_B);                                  // 斜 ANG_B 时投影宽 / 卡宽
  const step = pw * (1 - OV_B);                                // 相邻卡中心距（单位：卡宽）
  const span = 6 * step + pw;
  const w = por ? Math.min(0.96 * W / (2 * step + pw), 0.5 * H * 0.75) : Math.min(0.97 * W / span, 0.62 * H * 0.75);
  const x = k * step * w;
  const z = 0;
  // 镜头很近，偏离中线的卡会被透视额外转动：补偿视线偏角，让七张看起来都是同样的 ANG_B、都露出正面
  const rot = ANG_B * Math.sign(G.fanSign || 1) + Math.atan2(x, G.Da - z) * (G.compSign || 1);
  return { x, y: 0, z, w, rot };
}
// 开场慢推（用户 10-30：「确保 7 张是动的」——金门/格伦峡谷/拉斯维加斯/云海原片几乎静止）：
// 0→停住结束(HOLD_END) 画面缓慢放大到 1.09；首页三张在收拢时缓回 1（首页无缝），四张新卡淡出时继续推
function kbZoom(c, t) {
  const up = 1 + 0.09 * sm(t / HOLD_END);
  if (c.idx < 0) return up + 0.03 * sm((t - HOLD_END) / CS);
  return lerp(up, 1, sm((t - HOLD_END) / (INTRO_T - HOLD_END)));
}
function introPose(c, t) {
  const G = introGeo(), Da = G.Da, k = c.fanK, ak = Math.abs(k), isHome = c.idx >= 0;
  const ord = ORDER[c.def.id] ?? -1, pair = ord < 0 ? -1 : Math.floor(ord / 2), side = ord < 0 ? 0 : (ord % 2 === 0 ? -1 : 1);
  // ---- 扇面(0–1.5s 严格照苹果)
  const rotF = fanDeg(t) * RAD;
  let fx = 0, fz = 0;
  if (pair >= 0) {
    // 苹果真实帧 n13–n20 的三个细节：①刚露出时已接近最终大小(紫色约粉色 3/4 高，之后只长 ~20%)，主要是「横向滑出」而不是从远处飞来；
    // ②一层压一层像摊开一副牌：外侧那台跟着内侧那台走、藏在它后面，滑过它才露出来；③出发时中间那台还够宽，能把后面的完全挡住。
    // ⑤（用户：苹果是「后面出现、往前推的同时展开」）实测原片：粉色高度恒定 551（镜头不推）；橙色露出时高 225→1.1s 317(+41%)，
    //   紫色 206→259(+26%)。即「先快速横向探出（此时约终大小 70%）→ 再一边继续散开一边往镜头推近」。
    //   所以横移用快曲线(0.42s)，前推用更慢更柔的曲线(0.62s、晚 0.05s)，起点更深(+0.42Da)
    let xr = 0;
    for (let q = 0; q <= pair; q++) xr += (FAN_X[q] - (q ? FAN_X[q - 1] : 0)) * sm((t - FAN_T0[q]) / FAN_SPREAD);
    const uz = sm((t - FAN_T0[pair] - 0.03) / FAN_PUSH);   // 10-30 用户「往前推不明显」：推近更长(0.95s)，一直推到扇面停稳
    fx = side * xr * G.hF * G.fxs;
    fz = lerp(-(FAN_Z[pair] + 0.85) * Da, -FAN_Z[pair] * Da, uz);   // 起点更深(+0.85Da)：探出时更小，推近幅度约翻倍
  }
  // ④苹果 iMac 是宽屏，靠近镜头的透视让两侧那几台看起来没那么侧（左排露大片屏幕、右排露大片背壳）；我们是窄竖卡，同角度只剩细条。
  //   所以两侧的卡出来时偏离中心卡的角度：中心 ~88°，左排 72/68/64°，右排 104/108/112°（越往外露得越多）
  let rotC = rotF;
  //   左排少转（露正面 Live）、右排多转过 90°（露纯色背壳），和原片「左边一片屏幕、右边一片背壳」一致
  if (pair >= 0) rotC = lerp(rotF, rotF * (side < 0 ? [0.82, 0.77, 0.73][pair] : [1.18, 1.23, 1.27][pair]), eo((t - FAN_T0[pair]) / FAN_DUR));
  let P = { x: fx, y: 0, z: fz, w: G.wF, rot: rotC };
  // ---- 1.5–2.3s 转回正面 + 展成一排
  const rs = SCHEME_B ? angSlot(c, G) : rowSlot(c, G), pi = pair + 1;
  const uB = sm((t - TURN_T - 0.05 * pi) / TURN_D);
  P = { x: lerp(P.x, rs.x, uB), y: lerp(P.y, rs.y, uB), z: lerp(P.z, rs.z, uB), w: lerp(P.w, rs.w, uB), rot: lerp(P.rot, rs.rot, uB) };
  // ---- 2.3–4.3s 停住，轻微漂浮
  const fl = sm((t - TURN_T - TURN_D - 0.05) / 0.3) * (1 - sm((t - HOLD_END) / 0.3));
  P.y += Math.sin(t * 2.4 + k * 1.1) * 0.006 * H * fl;
  let cx = W / 2 + P.x, cy = H / 2 + P.y, w = P.w, h = P.w * 4 / 3, z = P.z, rot = P.rot, op = 1, title = 0;
  const uT = sm((t - TURN_T - TURN_D - 0.15) / 0.7) * 0.6 + sm((t - HOLD_END) / CS) * 0.4, tilt = t < TURN_T + TURN_D + 0.15 ? 0 : uT;
  if (isHome) {
    op = 1;
    const delay = (c.idx === 1 ? 0 : (c.idx === 0 ? 0.04 : 0.08)) * CS;
    const uD = sm((t - HOLD_END - delay) / (0.92 * CS)), hr = homeRect(c.idx);
    cx = lerp(cx, hr.cx, uD); cy = lerp(cy, hr.cy, uD); w = lerp(w, hr.w, uD); h = lerp(h, hr.h, uD); rot = lerp(rot, hr.rot, uD); z = lerp(z, hr.z, uD);
    title = sm((t - (INTRO_T - 0.25)) / 0.25);
    if (t >= INTRO_T) { cx = hr.cx; cy = hr.cy; w = hr.w; h = hr.h; rot = hr.rot; z = hr.z; title = 1; }
  } else {
    op = 1;
    const uD = sm((t - HOLD_END - (ord - 2) * 0.02 * CS) / (0.9 * CS));   // 边侧转边后退、缩小、淡出
    cx = W / 2 + (cx - W / 2) * (1 - 0.3 * uD); z -= uD * 0.3 * Da; const s2 = 1 - 0.4 * uD;
    w *= s2; h *= s2; rot -= side * 40 * RAD * uD; op *= 1 - uD;
  }
  return { cx, cy, w, h, rot, z, op, title, tilt: t >= INTRO_T ? 1 : tilt };
}

// 开场小版视频 → 标准卡片版：提前起标准版并预载，对齐到同一帧后换纹理；换的时候卡很小(约 200px)，小版 360 宽够清楚，换了看不出
function toStd(c, instant) {
  if (c.mode !== 'small' || c.idx < 0 || c.stdSwap === 'done') return;
  const old = c.cardVideo;
  const sv = c.stdVideo || (c.stdVideo = makeVideo(`${BASE}/${c.def.id}/live_card.mp4`));
  if (!c.stdVt) { const t = new THREE.VideoTexture(sv); t.colorSpace = THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; c.stdVt = t; }
  const sw = () => {
    if (c.stdSwap === 'done') return; c.stdSwap = 'done'; c.mode = 'std';
    c.u.uVid.value = c.stdVt; c.video = sv; c.cardVideo = sv; c.cardVt = c.stdVt; c.vt = c.stdVt; setVidMap(c, false); c.u.uVidOK.value = sv.readyState >= 2 ? 1 : 0;
    old.pause(); c.playing = true; if (sv.paused) sv.play().catch(() => {});
  };
  if (instant) { sv.currentTime = (old.currentTime || 0) % (c.meta.cam.length / c.meta.fps); sw(); return; }
  if (c.stdSwap) return; c.stdSwap = 'loading';
  const go = () => {
    sv.onseeked = () => { sv.onseeked = null; sv.play().then(() => { if ('requestVideoFrameCallback' in sv) sv.requestVideoFrameCallback(() => requestAnimationFrame(sw)); else setTimeout(sw, 60); }).catch(() => { c.stdSwap = null; }); };
    sv.currentTime = ((old.currentTime || 0) + 0.06) % (c.meta.cam.length / c.meta.fps);   // 小版是循环 4 遍的长文件，取模回到一个循环内
  };
  if (sv.readyState >= 3) go(); else sv.addEventListener('canplay', go, { once: true });
}
function stepIntro(dt) {
  if (!I.on) return;
  I.t = I.freeze != null ? I.freeze : I.t + dt;
  if (I.t >= INTRO_T) endIntro();
}
function endIntro() {
  if (!I.on) return;
  I.on = false; I.t = INTRO_T; I.freeze = null; applyDPR(); cards.forEach((c, k) => setTimeout(() => toStd(c, false), 400 + k * 450)); (() => { let done = false; const go = () => { if (done) return; done = true; backgroundLoad(); }; ['pointermove', 'pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, go, { once: true, passive: true })); setTimeout(go, 12000); })();   // ext/全屏视频的后台加载等用户一有动作(或 12s)再做，避免开场刚结束就卡   // 小版→标准版放到开场结束后(页面静止时)再换，换的那一下的小卡顿不会落在动画里
  document.getElementById('skip').classList.remove('show');
  setTimeout(() => loadOutro().catch(() => { }), 6000);
  for (const c of extras) {                             // 4 张新卡：暂停并释放视频/纹理
    scene.remove(c.group); setPlaying(c, false);
    c.video.pause(); c.video.removeAttribute('src'); c.video.load();
    c.vt.dispose(); c.u.uPoster.value.dispose(); c.u.uExt.value.dispose();
    c.mesh.geometry.dispose(); c.mesh.material.dispose(); c.backMat.dispose(); c.bmat.dispose(); c.title.geometry.dispose(); c.tmat.dispose(); c.tEl.remove();
  }
  extras.length = 0;
}
const skipIntro = endIntro;

// ------------------------------------------------------------------ 结尾：拉远，发现两只手拿着 iPhone Duo
/* 整页(WebGL 场景 + HTML 标题)成为手机屏幕内容。场景渲到 RT（虚拟布局尺寸 Wv×Hv，开场 0.3s 内从视口比例渐变到屏幕比例 1.4296，卡片自然重排，起点与首页完全一致），
   再用一个全屏 quad 合成：照片层(手+手机，屏幕处透明；素材来自 outro/photo.png + config.json，换图只换这两个文件) + 内容层(屏幕区由照片 alpha 反推)。
   内容与照片共用同一个 2D 变换(缩放 s + 平移 o)：起点 s0=1/m 使内容 1:1 铺满视口，终点 s1=视口宽/照片宽(手机≈55% 宽)；
   缩放曲线 = 参考视频实测(9:41 字宽 + ECC 相似变换)：先快后慢，约 2.5s。没有折痕层(用户：不要折痕)。 */
const OUT_T = 3.4;                                     // 总时长；参考片 ln(宽度) 几乎匀速下降(0.29/s)，只在最后 ~0.4s 软着陆，没有快起步
const O = { on: false, t: 0, dir: 0, freeze: null, cfg: null, loading: null, Wp: 0, Hp: 0, Wv: 0, Hv: 0, tf: '' };
const OUT_IN = 0.25, OUT_OUT = 0.5;                      // 起步缓入 0.25s、落地缓出 0.5s，中间 ln(缩放) 匀速
function outU(t) {                                         // 对数缩放进度 0→1：速度先线性升到 v0、匀速、再线性降到 0；积分归一
  const T = OUT_T, a = OUT_IN, b = OUT_OUT, v0 = 1 / (T - a / 2 - b / 2);
  t = clamp(t, 0, T);
  if (t < a) return v0 * t * t / (2 * a);
  if (t < T - b) return v0 * (a / 2 + (t - a));
  const r = T - t; return 1 - v0 * r * r / (2 * b);
}
const RTW = 2048, RTH = 1536;
const BG_RAW = new THREE.Color().setRGB(0xEE / 255, 0xED / 255, 0xF0 / 255, THREE.LinearSRGBColorSpace);   // RT 里不做 sRGB 编码：清屏色按原始字节写入，和首页一致
function loadOutro() {
  if (O.loading) return O.loading;
  return O.loading = (async () => {
    const base = new URL('../outro/', import.meta.url).href;
    const cfg = await (await fetch(base + 'config.json')).json();
    const photo = await new Promise((res, rej) => new THREE.TextureLoader().load(base + cfg.photo, res, undefined, rej));
    photo.colorSpace = THREE.NoColorSpace; photo.flipY = false; photo.premultiplyAlpha = true; photo.generateMipmaps = true;
    photo.minFilter = THREE.LinearMipmapLinearFilter; photo.magFilter = THREE.LinearFilter; photo.wrapS = photo.wrapT = THREE.ClampToEdgeWrapping;
    photo.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const rt = new THREE.WebGLRenderTarget(RTW, RTH, { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, depthBuffer: true });
    const U = {
      uPhoto: { value: photo }, uRT: { value: rt.texture }, uS: { value: 1 }, uO: { value: new THREE.Vector2() }, uC: { value: new THREE.Vector2() }, uM: { value: 1 },
      uV: { value: new THREE.Vector2() }, uRS: { value: 1 }, uRTS: { value: new THREE.Vector2(RTW, RTH) }, uScr: { value: new THREE.Vector4() }, uCan: { value: new THREE.Vector2(cfg.canvas[0], cfg.canvas[1]) },
      uR2: { value: 0 }, uPA: { value: 0 }, uHP: { value: 1 }, uBase: { value: new THREE.Vector3(cfg.bg[0] / 255, cfg.bg[1] / 255, cfg.bg[2] / 255) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: U, depthTest: false, depthWrite: false, vertexShader: 'void main(){ gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: `
precision highp float;
uniform sampler2D uPhoto, uRT; uniform float uS, uM, uRS, uR2, uHP, uPA; uniform vec2 uO, uC, uV, uRTS, uCan; uniform vec4 uScr; uniform vec3 uBase;
void main(){
  vec2 cp = vec2(gl_FragCoord.x, uHP - gl_FragCoord.y);
  vec2 p = (cp - uO) / uS;                                  // 照片像素坐标
  vec4 ph = texture2D(uPhoto, clamp(p / uCan, 0., 1.));    // 预乘 alpha
  vec2 v = (p - uC) / uM + .5 * uV;                         // 内容(虚拟布局)像素坐标，y 向下
  float inRect = step(0., v.x) * step(v.x, uV.x) * step(0., v.y) * step(v.y, uV.y);
  vec2 sp = p - uScr.xy;
  float inScr = step(0., sp.x) * step(sp.x, uScr.z) * step(0., sp.y) * step(sp.y, uScr.w);
  float hole = inScr * (1. - ph.a);                         // 屏幕覆盖度(拇指处已被扣掉)
  float cov = mix(inRect, inRect * step(.004, hole), uR2);
  vec2 vc = clamp(v, vec2(.5), uV - .5) * uRS;
  vec3 c = texture2D(uRT, vec2(vc.x / uRTS.x, (uV.y * uRS - vc.y) / uRTS.y)).rgb;
  float keep = (1. - inRect * (1. - uR2)) * uPA;                    // 起头 0.3s：内容溢出屏幕的部分盖在机身上，机身逐渐显出
  vec3 under = mix(uBase, c, cov);
  gl_FragColor = vec4(ph.rgb * keep + (1. - ph.a * keep) * under, 1.);
}` });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
    const qs = new THREE.Scene(); qs.add(quad);
    O.cfg = cfg; O.rt = rt; O.U = U; O.qs = qs; O.qcam = new THREE.Camera(); O.mat = mat;
    renderer.initTexture(photo);
    // 预热：RT 分配 + 合成着色器编译/链接 + 照片上传，放在空闲时，避免点击后第一帧卡一下
    try {
      await new Promise(r => requestAnimationFrame(r));
      renderer.compile(qs, O.qcam); rt.viewport.set(0, 0, 64, 48); renderer.setRenderTarget(rt); renderer.setClearColor(BG_RAW, 1); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null); renderer.setClearColor(BG0);
      const tiny = new THREE.WebGLRenderTarget(64, 48); renderer.setRenderTarget(tiny); renderer.render(qs, O.qcam); renderer.setRenderTarget(null); tiny.dispose();
    } catch (e) { }
  })();
}
function outroGeom() {
  const sc = O.cfg.screen, [cw, ch] = O.cfg.canvas, ar = sc.w / sc.h, { Wp, Hp } = O;
  // RT 的版式 = 真实视口版式(Wp×Hp)，只是画布高度扩成 Wp/ar(屏幕比例)：卡片按真实 W,H 摆在 RT 竖直正中，上下多出的是页面底色 → 视口正中那一段与首页逐像素一致，没有版式重排
  O.Hrt = Wp / ar; O.Wv = Wp; O.Hv = O.Hrt;
  O.m = sc.w / Wp; O.s0 = 1 / O.m; O.s1 = Wp / cw;
  O.C = [sc.x + sc.w / 2, sc.y + sc.h / 2];
  O.M0 = [Wp / 2, Hp / 2];
  const offY = Hp - ch * O.s1 + (sc.bottom_shift || O.cfg.bottom_shift || 0) * O.s1;     // 照片底边对齐视口底边(手腕被画面切掉)；bottom_shift = 照片再下移多少(照片像素)，把手机压到接近中心
  O.M1 = [O.s1 * O.C[0], O.s1 * O.C[1] + offY];
  O.rs = Math.min(1, RTW / Wp, RTH / O.Hrt);
}
function outro() {
  if (O.on && O.dir < 0) { O.dir = 1; return Promise.resolve(true); }
  if (O.on || I.on || S.open >= 0 || S.p > 0.01 || !cards.length) return Promise.resolve(false);
  return loadOutro().then(() => {
    if (O.on || I.on || S.open >= 0) return false;
    O.Wp = window.innerWidth; O.Hp = window.innerHeight; O.t = 0; O.dir = 1; O.freeze = null;
    outroGeom(); O.on = true; O.needSize = true;                  // 画布尺寸在第一帧渲染前、同一帧里改(避免提前清空画布出现白帧)
    cards.forEach(c => { c.tEl.style.transformOrigin = '0 0'; });
    return true;
  });
}
function outroBack() { if (O.on) { O.dir = -1; O.freeze = null; } }
function stepOutro(dt) {
  if (O.freeze != null) O.t = O.freeze; else O.t += O.dir * dt * (O.dir < 0 ? 1.25 : 1);
  O.t = clamp(O.t, 0, OUT_T);
  if (O.t <= 0 && O.dir < 0) {                          // 回到首页：恢复布局/DPR/标题变换
    O.on = false; O.dir = 0; O.tf = ''; W = O.Wp; H = O.Hp; applyDPR(); camera.aspect = W / H; cards.forEach(c => { c.tEl.style.transformOrigin = ''; }); return;
  }
  // 缩放 = 对数匀速(见 outU)，单调下降；第 1 帧就是首页(内容 1:1 铺满视口、看不到机身)，机身从左右边缘慢慢爬进来；平移沿同一个对数进度
  const L = Math.log(O.s0 / O.s1), u = outU(O.t);
  const s = O.s0 * Math.exp(-L * u), g = 1 - u;
  O.u = u; O.sRatio = s / O.s0;
  const Mx = lerp(O.M1[0], O.M0[0], g), My = lerp(O.M1[1], O.M0[1], g);
  const ox = Mx - s * O.C[0], oy = My - s * O.C[1];
  O.s = s; O.ox = ox; O.oy = oy;
  const k = s * O.m, dx = s * (O.C[0] - O.m * O.Wv / 2) + ox, dy = s * (O.C[1] - O.m * O.Hv / 2) + oy;
  O.tf = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) scale(${k.toFixed(5)}) `;
}
function renderOutro() {
  const U = O.U, sc = O.cfg.screen;
  if (O.needSize) { O.needSize = false; renderer.setPixelRatio(1); renderer.setSize(O.Wp, O.Hp, false); }
  O.rt.viewport.set(0, 0, Math.round(O.Wv * O.rs), Math.round(O.Hv * O.rs));
  renderer.setRenderTarget(O.rt); renderer.setClearColor(BG_RAW, 1); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
  U.uS.value = O.s; U.uO.value.set(O.ox, O.oy); U.uC.value.set(O.C[0], O.C[1]); U.uM.value = O.m; U.uV.value.set(O.Wv, O.Hv); U.uRS.value = O.rs;
  U.uScr.value.set(sc.x, sc.y, sc.w, sc.h); U.uR2.value = sm((O.t - 0.1) / 0.4); U.uPA.value = sm((O.t - 0.03) / 0.3); U.uHP.value = O.Hp;
  renderer.render(O.qs, O.qcam);
}

// ------------------------------------------------------------------ 布局 / 更新
function resize() {
  if (O.on) { O.Wp = window.innerWidth; O.Hp = window.innerHeight; outroGeom(); renderer.setSize(O.Wp, O.Hp, false); return; }
  W = window.innerWidth; H = window.innerHeight;
  applyDPR();
  camera.aspect = W / H; setCam(H * 1.5);
}
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function setCam(D) {                                     // z=0 平面始终像素对齐：fov 随距离变
  camD = D; camera.fov = 2 * Math.atan((O.on ? O.Hrt : H) / 2 / D) * 180 / Math.PI; camera.position.set(0, 0, D); camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}

function openCard(i) {
  if (S.open >= 0 || !cards[i]) return;
  S.open = i; S.target = 1; S.panMouse = false; S.panStart = null;
  ensureExt(cards[i]); startFull(cards[i]);
  cards[i].zk = 1; fullGeom(cards[i]); cards[i].zk = cards[i].full === 'on' ? 1 : cards[i].zNeed;
  const g = fullGeom(cards[i]);
  S.panX = S.panT = g.center;
  document.getElementById('back').classList.add('show');
  S.gyro.b0 = S.gyro.g0 = null;
}
function closeCard() {
  if (S.open < 0 || S.target === 0) return;
  S.target = 0;
  document.getElementById('back').classList.remove('show');
}

function updateSpring(dt) {
  if (S.manual) return;
  let n = Math.ceil(dt / (1 / 120));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    const a = -2 * OMEGA * S.v - OMEGA * OMEGA * (S.p - S.target);
    S.v += a * h; S.p += S.v * h;
  }
  if (Math.abs(S.p - S.target) < 0.0004 && Math.abs(S.v) < 0.002) { S.p = S.target; S.v = 0; }
  S.p = clamp(S.p, 0, 1);
}

// 玻璃高光只给鼠标指着的那张卡(射线检测)，光斑跟着鼠标，淡入淡出约 0.25s；手机：只给当前居中的卡，跟陀螺仪，很淡；开场/全屏没有
function hoverUpdate(dt) {
  let hit = null, hp = null, cardMode = null;
  const active = !I.on && !O.on && S.open < 0 && S.p === 0;
  const mouseMode = S.mouse.moved && !S.mouse.touch && S.mouse.in && !S.gyro.on;
  if (active && mouseMode) {
    raycaster.setFromCamera(new THREE.Vector2(S.mouse.x * 2 - 1, -(S.mouse.y * 2 - 1)), camera);
    const hs = raycaster.intersectObjects(cards.map(c => c.mesh), false);
    if (hs.length) { hit = cards.find(c => c.mesh === hs[0].object); hp = hs[0].uv; }
  }
  const kf = 1 - Math.exp(-dt * 12);                       // ≈0.25s 淡入淡出
  for (const c of cards) {
    let tgt = 0;
    if (c === hit) { tgt = 1; c.hlAmt = 1; const px = (hp.x - .5) * 0.75, py = hp.y - .5; c.hlPos.x += (px - c.hlPos.x) * (c.hover < .05 ? 1 : 1 - Math.exp(-dt * 20)); c.hlPos.y += (py - c.hlPos.y) * (c.hover < .05 ? 1 : 1 - Math.exp(-dt * 20)); }
    else if (active && !mouseMode && (portrait() || S.mouse.touch || S.gyro.on) && Math.abs(c.idx - S.scroll) < 0.5) {
      tgt = 1; c.hlAmt = 0.3; c.hlPos.set(clamp(S.gyro.x, -1, 1) * 0.3 + 0.05, clamp(-S.gyro.y, -1, 1) * 0.3 + 0.15);
    }
    c.hover += (tgt - c.hover) * kf;
    if (c.hover < 0.002) c.hover = 0;
  }
}

let tPrev = performance.now() / 1000, time = 0;
function frame() {
  const _t0 = performance.now();
  frame_();
  const _d = performance.now() - _t0; (window.__jst = window.__jst || []).push(_d); if (window.__jst.length > 600) window.__jst.shift();
}
function frame_() {
  requestAnimationFrame(frame);
  const now = performance.now() / 1000, dt = Math.min(I.on ? 0.1 : 0.05, now - tPrev); tPrev = now; time += dt;
  if (!cards.length) { renderer.setClearColor(BG0); renderer.render(scene, camera); return; }
  if (O.on) { stepOutro(dt); if (O.on) { W = O.Wp; H = O.Hp; camera.aspect = O.Wv / O.Hv; } }
  updateSpring(dt);
  if (S.p === 0 && S.target === 0 && S.open >= 0) { endFull(cards[S.open]); S.open = -1; }

  // 倾斜输入
  const idle = time - S.mouse.t > 3.5 && !S.gyro.on && !S.drag;
  if (S.gyro.on) S.tiltT.set(S.gyro.x, S.gyro.y);
  else if (S.mouse.moved && !S.mouse.touch) S.tiltT.set((S.mouse.x - .5) * 2, (S.mouse.y - .5) * 2);
  else S.tiltT.set(0, 0);
  if (idle) S.tiltT.set(Math.sin(time * .6) * .38, Math.cos(time * .45) * .26);
  S.tiltT.set(clamp(S.tiltT.x, -1, 1), clamp(S.tiltT.y, -1, 1));
  const kt = 1 - Math.exp(-dt * 5);
  S.tilt.lerp(S.tiltT, kt);

  // 首页横滑吸附(竖屏)
  if (portrait()) {
    if (!S.drag || S.drag.kind !== 'scroll') S.scroll += (S.scrollT - S.scroll) * (1 - Math.exp(-dt * 10));
  } else S.scroll = 1;

  // 全屏平移
  let g = null, panNorm = 0;
  if (S.open >= 0) {
    const c = cards[S.open];
    if (S.target === 1) { const zt = c.full === 'on' ? 1 : c.zNeed; c.zk += (zt - c.zk) * (1 - Math.exp(-dt * (zt < c.zk ? 4 : 12))); if (Math.abs(c.zk - zt) < 0.0005) c.zk = zt; }
    g = fullGeom(c);
    if (S.gyro.on && !S.drag && S.p > .5) S.panT = clamp(g.center - S.gyro.x * (g.hi - g.lo) * 0.5, g.lo, g.hi);
    else if (S.panMouse && !S.drag && !S.mouse.touch) S.panT = lerp(g.hi, g.lo, S.mouse.x);
    const lim = clamp(S.panT, g.lo, g.hi);
    const target = S.drag && S.drag.kind === 'pan' ? S.panT : lim;
    const over = target - clamp(target, g.lo, g.hi);
    const disp = clamp(target, g.lo, g.hi) + Math.sign(over) * Math.min(70, Math.abs(over) * .35);
    S.panX += (disp - S.panX) * (1 - Math.exp(-dt * (S.drag ? 18 : 6)));
    if (!S.drag) S.panT = lim;
    panNorm = clamp(-(S.panX - g.mid) / Math.max(1, (g.hi - g.lo) / 2), -1.2, 1.2);
  }

  const p = S.p, e = p;                                   // 线性插值参数(弹簧本身已是缓动)
  renderer.setClearColor(BG0);                            // 点开时背景保持浅色，不渐变成黑

  stepIntro(dt);
  setCam(I.on ? introCam(I.t) : H * 1.5);
  hoverUpdate(dt);
  const drawList = I.on ? cards.concat(extras) : cards;
  const poses = new Map();
  drawList.forEach(c => poses.set(c, I.on ? introPose(c, I.t) : homeRect(c.idx)));
  const rank = new Map();                                 // 由远到近画(同一姿态的平行卡片没有互穿，画家算法即可)
  const rowStage = I.on && I.t >= TURN_T && I.t < INTRO_T;
  drawList.slice().sort((a, b) => {
    if (rowStage) return Math.abs(b.fanK) - Math.abs(a.fanK);       // 正面一排：中心压在最上，外侧逐级压低
    const pa = poses.get(a), pb = poses.get(b); return ((pb.cx - W / 2) ** 2 + (camD - pb.z) ** 2) - ((pa.cx - W / 2) ** 2 + (camD - pa.z) ** 2); }).forEach((c, n) => rank.set(c, n + 1));
  drawList.forEach((c) => {
    c.tShow = false;
    const i = c.idx;
    const pose = poses.get(c);
    const hr = pose;
    const isOpen = i >= 0 && i === S.open;
    let rect, op = pose.op, sc = 1, tiltAmt = pose.tilt ?? 1;
    const u = c.u;
    const winW = c.win[2] - c.win[0], winH = c.win[3] - c.win[1];
    if (isOpen) {
      rect = { l: lerp(hr.cx - hr.w / 2, 0, e), t: lerp(hr.cy - hr.h / 2, 0, e), w: lerp(hr.w, W, e), h: lerp(hr.h, H, e) };
      tiltAmt = (1 - p) * tiltAmt;
    } else {
      sc = lerp(1, 0.92, p); op = pose.op * (1 - clamp(p * 1.3, 0, 1));
      rect = { l: hr.cx - hr.w * sc / 2, t: hr.cy - hr.h * sc / 2, w: hr.w * sc, h: hr.h * sc };
    }
    // 画面(视频帧)矩形：card 态=窗口对齐卡片，全屏态=高度铺满
    const cardFW = hr.w / winW, cardFH = cardFW / c.aspect;
    let FW = cardFW, FH = cardFH, FL = hr.cx - hr.w / 2 - c.win[0] * cardFW, FT = hr.cy - hr.h / 2 - c.win[1] * cardFH;
    if (isOpen) {
      const gg = g;
      const FL1 = S.panX + gg.SD * gg.FW, FT1 = gg.top;
      FW = lerp(cardFW, gg.FW, e); FH = lerp(cardFH, gg.FH, e); FL = lerp(FL, FL1, e); FT = lerp(FT, FT1, e);
    } else {
      // 非激活卡：内容随卡片缩放
      const k = sc; FW *= k; FH *= k; FL = rect.l - c.win[0] * FW; FT = rect.t - c.win[1] * FH;
    }
    // 可见性 / 播放
    const vis = rect.l < W && rect.l + rect.w > 0 && op > 0.01;
    c.group.visible = vis;
    if (I.on) setPlaying(c, true);                   // 开场期间 7 张卡都在播(包括此刻被挡住/透明的)
    else if (!vis) { setPlaying(c, false); return; }
    else setPlaying(c, !(S.open >= 0 && !isOpen && p > .99));
    if (!vis) return;
    u.uVidOK.value = c.video.readyState >= 2 ? 1 : 0;
    // ext 是静态图：跟着镜头背景平移(meta.cam 是每帧相对海报帧的平移，画面归一化)，按播放时间线性插值
    { const cam = c.meta.cam, n = cam.length; const FF = c.video === c.fullVideo && c.meta.full && c.meta.full.cam; const camA = FF ? c.meta.full.cam : cam, gainA = FF ? c.meta.full.gain : c.meta.cam_gain; const nn = camA.length;
      let ft = (shownTime(c.video) + 0.5 / c.meta.fps) * c.meta.fps; ft = clamp(ft, 0, nn - 1);   // 用上屏帧的时间(+半帧取整到该帧)
      const i0 = Math.floor(ft), i1 = Math.min(i0 + 1, nn - 1), k = ft - i0, A = camA[i0], B = camA[i1];   // 硬切循环：不在接点处插值
      u.uCamA.value.set(lerp(A[0], B[0], k), lerp(A[1], B[1], k), lerp(A[2], B[2], k), lerp(A[3], B[3], k));
      u.uCamT.value.set(lerp(A[4], B[4], k), lerp(A[5], B[5], k));
      const GA = gainA[i0], GB = gainA[i1]; u.uGain.value.set(lerp(GA[0], GB[0], k), lerp(GA[1], GB[1], k), lerp(GA[2], GB[2], k));
      const SH = c.meta.shots;                                                   // 多镜头(street)：第二镜头的 ext 跟踪 + 色调增益 + 权重(叠化段两张 ext 按权重混合)
      if (SH) { const src = FF ? c.meta.full : SH, ca = src.cam2, ga = src.gain2, wa = src.w, A2 = ca[i0], B2 = ca[i1], G2 = ga[i0], H2 = ga[i1];
        u.uCamA2.value.set(lerp(A2[0], B2[0], k), lerp(A2[1], B2[1], k), lerp(A2[2], B2[2], k), lerp(A2[3], B2[3], k)); u.uCamT2.value.set(lerp(A2[4], B2[4], k), lerp(A2[5], B2[5], k));
        u.uGain2.value.set(lerp(G2[0], H2[0], k), lerp(G2[1], H2[1], k), lerp(G2[2], H2[2], k)); u.uShotW.value = wa[i0]; { const lv = src.blur ? src.blur[i0] : 0; u.uWhip.value = lv > 0.02 ? Math.log2(Math.max(1, 3.5 * 0.025 * 720 * lv)) : 0; } } }   // 高斯 σ = 画面宽 2.5% × lv；mip 级别 ≈ log2(3.5σ 个 ext 像素)   // 硬切：镜头权重按当前帧取值(0 或 1)，不在两帧之间插值

    const mesh = c.mesh;
    mesh.scale.set(rect.w, rect.h, 1); c.backMesh.scale.set(rect.w, rect.h, 1); c.backMesh.position.z = -(rect.h * CARD_T / 2 + 0.3);
    c.body.scale.set(rect.h, rect.h, rect.h); mesh.position.z = rect.h * CARD_T / 2 + 0.3;
    c.bmat.uniforms.uOp.value = isOpen ? pose.op * (1 - clamp(p * 10, 0, 1)) : op; c.body.visible = c.bmat.uniforms.uOp.value > 0.01;
    c.group.position.set(rect.l + rect.w / 2 - W / 2, H / 2 - (rect.t + rect.h / 2), isOpen ? lerp(hr.z, 1, e) : hr.z);
    c.group.rotation.set(S.tilt.y * TILT_DEG * Math.PI / 180 * tiltAmt, hr.rot * (isOpen ? 1 - e : 1) + S.tilt.x * TILT_DEG * Math.PI / 180 * tiltAmt, 0);   // 基础转角 + 整组倾斜
    const ro = isOpen ? 1000 : 3 * (rank.get(c) || 0); c.group.renderOrder = ro; c.body.renderOrder = ro; mesh.renderOrder = ro + 1; c.backMesh.renderOrder = ro + 1; c.title.renderOrder = ro + 2;
    u.uClip.value.set(rect.w, rect.h);
    u.uFrameO.value.set(FL - rect.l, FT - rect.t);
    u.uKB.value = I.on ? kbZoom(c, I.t) : 1;
    u.uFrameS.value.set(FW, FH);
    u.uRad.value = lerp(hr.w * 0.06 * sc, 0, isOpen ? e : 0) * (isOpen ? 1 : 1);
    u.uOp.value = op;
    u.uHLamt.value = (isOpen || I.on) ? 0 : c.hover * c.hlAmt;
    u.uHL.value.set(c.hlPos.x, c.hlPos.y);
    u.uFeather.value = isOpen ? c.feather * clamp(p / .3, 0, 1) : 0;
    u.uK.value = isOpen ? lerp(K_CARD, K_FULL, e) : K_CARD;
    if (isOpen) u.uTilt.value.set(lerp(S.tilt.x, panNorm * 0.8 + S.tilt.x * 0.25, e), lerp(S.tilt.y, S.tilt.y, e));
    else u.uTilt.value.set(S.tilt.x, S.tilt.y);
    // 标题：左上，小写白字两行，字号约卡宽的 9.5%(贴图 100px 字 / 1024px 宽 = tw 的 9.8%，tw = 0.97 卡宽)，离左上约 7%，不探出
    const tOp = pose.title * (isOpen ? 1 - clamp(p * 4, 0, 1) : 1 - clamp(p * 1.3, 0, 1));
    if (c.def.t && tOp > 0.003) {
      c.group.updateMatrixWorld(true);
      mesh.localToWorld(_v.set(-0.5, 0.5, 0)).project(camera); mesh.localToWorld(_v2.set(-0.5, -0.5, 0)).project(camera);
      const Hc = O.on ? O.Hrt : H, sx = (_v.x + 1) / 2 * W, sy = (1 - _v.y) / 2 * Hc, ph = Math.abs((_v2.y - _v.y) / 2 * Hc), pw = ph * 0.75;   // 投影后的左上角、卡片投影高度(→宽)
      const fs = pw * 0.085;                                                     // 字号 ≈ 卡片宽的 9.5%(和原来的贴图比例一致)
      if (Math.abs(fs - c.tFS) > 0.25) { c.tFS = fs; c.tEl.style.fontSize = fs.toFixed(2) + 'px'; }
      c.tEl.style.transform = `${O.on ? O.tf : ''}translate(${(sx + pw * 0.08).toFixed(1)}px,${(sy + ph * 0.095).toFixed(1)}px)`;
      c.tEl.style.opacity = tOp.toFixed(3); c.tShow = true;
    }
  });
  for (const c of drawList) if (!c.tShow && c.tEl.style.opacity !== '0') c.tEl.style.opacity = '0';
  if (O.on) renderOutro(); else renderer.render(scene, camera);
}

// ------------------------------------------------------------------ 输入
function pt(ev) { return { x: ev.clientX, y: ev.clientY }; }
canvas.addEventListener('pointerdown', ev => {
  if (I.on || O.on) return;              // 开场/结尾期间不响应点击
  canvas.setPointerCapture(ev.pointerId);
  const touch = ev.pointerType !== 'mouse';
  S.mouse.touch = touch; S.mouse.t = time;
  S.drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, lx: ev.clientX, ly: ev.clientY, kind: null, moved: 0, t0: performance.now(), vx: 0 };
});
canvas.addEventListener('pointermove', ev => {
  const touch = ev.pointerType !== 'mouse';
  S.mouse.x = ev.clientX / W; S.mouse.y = ev.clientY / H; S.mouse.t = time; S.mouse.in = true;
  if (!touch) { S.mouse.touch = false; if (!S.mouse.moved) { S.mouse.moved = true; } }
  const d = S.drag;
  if (!d || d.id !== ev.pointerId) {
    if (!touch && S.open >= 0 && S.p > .9 && !S.panMouse) { if (!S.panStart) S.panStart = { x: ev.clientX }; else if (Math.abs(ev.clientX - S.panStart.x) > 24) S.panMouse = true; }
    return;
  }
  const dx = ev.clientX - d.lx, dy = ev.clientY - d.ly; d.lx = ev.clientX; d.ly = ev.clientY;
  d.moved = Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0);
  d.vx = d.vx * .7 + dx * .3;
  if (S.open >= 0 && S.target === 1) {
    if (!d.kind && d.moved > 8) d.kind = Math.abs(ev.clientY - d.y0) > Math.abs(ev.clientX - d.x0) * 1.2 && ev.clientY > d.y0 ? 'down' : 'pan';
    if (d.kind === 'pan') { S.panT += dx; S.panMouse = false; }
    if (d.kind === 'down' && ev.clientY - d.y0 > 90) { closeCard(); S.drag = null; }
  } else if (S.open < 0 && portrait()) {
    if (!d.kind && d.moved > 8) d.kind = 'scroll';
    if (d.kind === 'scroll') { const gw = homeRect(0).w + W * .07; S.scroll = clamp(S.scroll - dx / gw, -0.25, cards.length - 0.75); S.scrollT = S.scroll; }
  }
});
function endDrag(ev) {
  const d = S.drag; if (!d || d.id !== ev.pointerId) return;
  S.drag = null;
  if (d.kind === 'scroll') { const gw = homeRect(0).w + W * .07; S.scrollT = clamp(Math.round(S.scroll - d.vx * 6 / gw), 0, cards.length - 1); }
  if (d.kind === 'pan') { S.panMouse = false; S.panStart = null; }
  if (!d.kind && d.moved < 8 && S.open < 0 && ev.type === 'pointerup') {
    for (let i = 0; i < cards.length; i++) {
      const r = homeRect(i), kz = H * 1.5 / (H * 1.5 - r.z);     // 透视放大后的屏幕矩形(近似，忽略转角)
      if (Math.abs(ev.clientX - (W / 2 + (r.cx - W / 2) * kz)) < r.w * kz / 2 * 0.95 && Math.abs(ev.clientY - (H / 2 + (r.cy - H / 2) * kz)) < r.h * kz / 2) {
        if (portrait()) { if (Math.abs(i - S.scroll) > 0.55) { S.scrollT = i; break; } }
        openCard(i); break;
      }
    }
  }
}
canvas.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') S.mouse.in = false; });
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
document.getElementById('back').addEventListener('click', closeCard);
window.addEventListener('keydown', e => { if (e.key === 'o' || e.key === 'O') outro(); if (e.key === 'b' || e.key === 'B') outroBack(); if (e.key === 'Escape') closeCard(); if ((e.key === ' ' || e.code === 'Space') && I.on) { e.preventDefault(); skipIntro(); } });
document.getElementById('skip').addEventListener('click', skipIntro);
window.addEventListener('resize', resize);

// 手机动感
const btn = document.getElementById('motion');
function onOri(ev) {
  if (ev.gamma == null) return;
  if (S.gyro.g0 == null) { S.gyro.g0 = ev.gamma; S.gyro.b0 = ev.beta; }
  S.gyro.on = true;
  const gx = clamp((ev.gamma - S.gyro.g0) / 22, -1, 1), gy = clamp((ev.beta - S.gyro.b0) / 22, -1, 1);
  S.gyro.x += (gx - S.gyro.x) * .2; S.gyro.y += (gy - S.gyro.y) * .2;
}
if (window.DeviceOrientationEvent) {
  if (typeof DeviceOrientationEvent.requestPermission === 'function' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) {
    btn.classList.add('show');
    btn.addEventListener('click', async () => {
      try { const r = await DeviceOrientationEvent.requestPermission(); if (r === 'granted') { window.addEventListener('deviceorientation', onOri); btn.classList.remove('show'); } } catch (e) { }
    });
  } else window.addEventListener('deviceorientation', onOri);
}

// ------------------------------------------------------------------ 启动
resize();
requestAnimationFrame(frame);
const QS = new URLSearchParams(location.search);
const WANT_INTRO = QS.get('intro') !== '0';
if (portrait()) { S.scroll = S.scrollT = 1; }          // 手机首页从中间那张(洛杉矶)开始，和开场落点一致
Promise.all(DEFS.concat(WANT_INTRO ? EXTRA_DEFS : []).map(makeCard)).then(cs => {
  cs.forEach(c => (c.extra ? extras : cards).push(c));
  if (WANT_INTRO) {
    extras.forEach(c => { c.title.visible = false; });
    I.on = true; I.t = 0; applyDPR();
    const fixed = QS.get('introAt') != null ? parseFloat(QS.get('introAt')) : null;
    I.freeze = fixed != null ? fixed : 0; I.hold = fixed == null;            // 分阶段加载：7 张卡视频都能播(readyState≥3)之前停在洛杉矶第一帧
    if (I.hold) {
      const hint = document.getElementById('load'); hint.classList.add('show');   // 只切 opacity，不动 display(避免合成层增删造成的卡一下)
      const t0 = performance.now(), ok = () => cards.concat(extras).every(c => c.video.readyState >= 3);
      const poll = () => { if (ok() || performance.now() - t0 > 12000) { I.hold = false; I.freeze = null; hint.classList.remove('show'); } else setTimeout(poll, 60); };
      poll();
    }
    document.getElementById('skip').classList.add('show');
    cards.concat(extras).forEach(c => setPlaying(c, true));
    // 预热：材质/着色器编译 + 标准版视频预载(不播)，保证开场里不再有第一次编译/第一次上传
    cards.concat(extras).forEach(c => { c.group.visible = true; });
    if (!QS.get('nocompile')) try { renderer.compile(scene, camera); } catch (e) { }
    if (!QS.get('nostd')) cards.forEach(c => { const sv = c.stdVideo = makeVideo(`${BASE}/${c.def.id}/live_card.mp4`); const t = new THREE.VideoTexture(sv); t.colorSpace = THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; c.stdVt = t; sv.addEventListener('loadeddata', () => { try { renderer.initTexture(t); } catch (e) { } }, { once: true }); sv.load(); });
  }
  if (!WANT_INTRO) { backgroundLoad(); setTimeout(() => loadOutro().catch(() => { }), 6000); }
  const kick = () => cards.concat(extras).forEach(c => { if (c.group.visible) { c.playing = false; setPlaying(c, true); } });
  window.addEventListener('pointerdown', kick, { once: true });
  window.__portal = {
    fanDeg, fullGeom, S, I, cards, extras, openCard, closeCard, skipIntro, homeRect, introPose,
    cam: camera, V3: THREE.Vector3, O, outro, outroBack,
    seekOutro(t) { return outro().then(() => { O.freeze = t; }); },
    seekIntro(t) { if (I.on) { I.freeze = t; if (t != null && t >= INTRO_T) endIntro(); } },
    setP(p) { S.manual = true; S.p = p; S.v = 0; S.target = p > 0 ? 1 : 0; },
    auto() { S.manual = false; },
    setPan(x) { const g = fullGeom(cards[S.open]); S.panT = x < 0 ? g.lo : x > 1 ? g.hi : lerp(g.hi, g.lo, x); S.panX = clamp(S.panT, g.lo, g.hi); },
    setTilt(x, y) { S.mouse.moved = true; S.mouse.x = (x + 1) / 2; S.mouse.y = (y + 1) / 2; S.mouse.t = time; S.tilt.set(x, y); S.tiltT.set(x, y); },
  };
  window.__cam = camera; window.__V3 = THREE.Vector3;
  document.title = 'jd portal';
  window.__portal.perf = () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, tex: renderer.info.memory.textures });
}).catch(e => console.error('init failed', e));
