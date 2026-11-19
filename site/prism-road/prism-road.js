import {ribbons} from './ribbon-shader.js';
import {bodyFragment, resample, vapor, skyVertex, skyFragment} from './scene-shaders.js';
const root = document.documentElement;
const themeButton = document.getElementById('prism-theme');
let theme = 'light';
try { theme = localStorage.getItem('cellmotion-site-theme') === 'dark' ? 'dark' : 'light'; } catch (_) {}
function applyTheme() {
  root.dataset.siteTheme = theme;
  themeButton.textContent = theme === 'dark' ? '☼' : '◐';
  themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
}
applyTheme();
document.addEventListener('cellmotion:languagechange', applyTheme);
themeButton.addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  try { localStorage.setItem('cellmotion-site-theme', theme); } catch (_) {}
});

const W = 1597, H = 985, TAU = Math.PI * 2;
const stage = document.querySelector('.prism-stage');
const canvas = stage.querySelector('canvas');
const video = stage.querySelector('video');
const status = document.querySelector('.prism-status');
const button = stage.querySelector('.prism-pause');
const capture = new URLSearchParams(location.search).has('capture');
const gl = canvas.getContext('webgl2', {
  alpha: false, antialias: false, depth: false, stencil: false,
  powerPreference: 'high-performance', preserveDrawingBuffer: capture,
});
const asset = name => new URL('assets/' + name, import.meta.url);
const textures = {}, programs = {}, buffers = {};
const locations = new WeakMap();
let time = 0, last = null, raf = 0, frames = 0, ready = false, recorded = false;
let playing = !capture && !matchMedia('(prefers-reduced-motion: reduce)').matches;
let view = [0, 0, W, H], dpr = 1, meta, dotState, tracks, instances, starCount, dust;
let dustData, starData, darkData, darkStars, darkPaths, wheels, wheelAngles, sceneTarget;
let tier=0, sampleTime=0, samples=0, slowWindows=0;
const sceneScales=[1,.82,.66,.50];
function program(v, f) {
  const p = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, v], [gl.FRAGMENT_SHADER, f]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
    gl.attachShader(p, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(p));
  locations.set(p, new Map());
  return p;
}
function loc(p, name) {
  const cache = locations.get(p);
  if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name));
  return cache.get(name);
}
async function fetchAsset(name) {
  const res = await fetch(asset(name));
  if (!res.ok) throw Error(name + ' ' + res.status);
  return res;
}
async function loadTexture(name) {
  const res = await fetchAsset(name + '.png');
  const bitmap = await createImageBitmap(await res.blob(), {premultiplyAlpha:'none', colorSpaceConversion:'none'});
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  for (const [key, val] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
    [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, key, val);
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  bitmap.close();
  textures[name] = t;
}
function select(p, names) {
  gl.useProgram(p);
  gl.uniform4fv(loc(p,'viewRect'), view);
  gl.uniform1f(loc(p,'t'), time);
  names.forEach((n,i) => {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, textures[n]);
    gl.uniform1i(loc(p, n+'Tex'), i);
  });
}

const quadVertex = `#version 300 es
precision highp float;
uniform vec4 viewRect, rect;
out vec2 pos;
void main() {
  vec2 corners[4] = vec2[4](vec2(0,0),vec2(1,0),vec2(0,1),vec2(1,1));
  pos = rect.xy + corners[gl_VertexID] * rect.zw;
  vec2 screen = (pos-viewRect.xy)/viewRect.zw;
  gl_Position = vec4(screen * vec2(2,-2) + vec2(-1,1),0,1);
}`;
const roadFragment = `#version 300 es
precision highp float;
in vec2 pos;
uniform sampler2D nightBaseTex, carrierTex, detailTex, flowTex, zonesTex;
uniform float t;
out vec4 result;
const vec2 size=vec2(1597,985);
${resample}
${vapor}
${ribbons}
vec2 offsetAt(vec2 grid,float age){
  float slice=clamp(age*10.+7.,0.,14.);
  vec2 atlas=vec2(400.,3705.);
  vec2 slot=vec2(0.,247.);
  vec4 encoded=mix(texture(flowTex,(grid+floor(slice)*slot)/atlas),
                   texture(flowTex,(grid+ceil(slice)*slot)/atlas),fract(slice));
  return (encoded.rb*256.+encoded.ga)*(255./128.)-256.;
}
void main() {
  vec2 uv = vec2(pos.x,abs(pos.y))/vec2(1597,985);
  if(pos.y < 0.) uv.y = mod(-pos.y,300.)/985.;
  vec3 c = samplePlate(nightBaseTex, uv);
  if(pos.y > 320.) {
    vec2 p=pos;
    vec2 grid=clamp((p-.5)/(size-1.),0.,1.)*vec2(399.,246.)+.5;
    vec2 zone=texture(zonesTex,uv).rg;
    vec4 carrier=texture(carrierTex,uv);
    if(zone.r>.001){
      float period=1.37;
      float first=fract(t/period+texture(detailTex,uv).a), second=fract(first+.5);
      float weight=.5-.5*cos(6.2831853*first);
      vec2 sourceA=uv+offsetAt(grid,(.5-first)*period)/size,sourceB=uv+offsetAt(grid,(.5-second)*period)/size;
      vec3 flowing=mix(texture(nightBaseTex,sourceB).rgb,texture(nightBaseTex,sourceA).rgb,weight);
      c=mix(c,flowing,zone.r);
    }
    if(carrier.a>.0) c=mix(c,ribbonColor(grid,p,uv,carrier),carrier.a);
    if(zone.g>.001){
      vec3 mist=smokeSample(nightBaseTex,uv,size,pos);
      vec3 plate=texture(nightBaseTex,uv).rgb;
      vec3 photo=texture(plumeTex,(pos-vec2(930.,570.))/vec2(667.,220.)).rgb;
      vec3 pink=mix(plate,photo,smoothstep(1138.,1150.,pos.x));
      float lift=clamp(dot(mist-plate,vec3(.2126,.7152,.0722))+.033,0.,.11);
      c=mix(c,pink*(1.+lift),smoothstep(.0,.78,zone.g));
    }
  }
  result = vec4(c,1);
}`;
// Original 2E tiles have a one-pixel blank guard. Sample at subpixel positions.
const dotVertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 instance;
uniform vec4 viewRect;
uniform vec2 atlasSize;
uniform sampler2D laneTex;
out vec2 spriteUV;
out float opacity;
void main(){
  vec2 corner[4]=vec2[4](vec2(0,0),vec2(1,0),vec2(0,1),vec2(1,1));
  vec2 q=corner[gl_VertexID], pos=instance.xy+.5+(q-.5)*9.;
  vec2 p=(pos-viewRect.xy)/viewRect.zw;
  gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);
  float tile=instance.z<0.?-instance.z-1.:instance.z;
  spriteUV=(vec2(mod(tile,128.),floor(tile/128.))+q)*9./atlasSize;
  opacity=instance.w*(instance.z<0.?smoothstep(.02,.45,textureLod(laneTex,(instance.xy+.5)/vec2(1597,985),0.).r):1.);
}`;
const dotFragment = `#version 300 es
precision highp float;
uniform sampler2D spritesTex;
in vec2 spriteUV; in float opacity; out vec4 result;
void main(){result=vec4(texture(spritesTex,spriteUV).rgb*opacity,0.);}`;
const pointVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 positionSize;
layout(location=1) in vec4 colorOpacity;
uniform vec4 viewRect;
uniform float scale;
out vec4 color; out vec2 center;
void main(){
  vec2 p=(positionSize.xy-viewRect.xy)/viewRect.zw;
  gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0,1);
  center=positionSize.xy;
  float diameter=positionSize.z*scale;
  gl_PointSize=max(2.,diameter);
  color=vec4(colorOpacity.rgb,colorOpacity.a*min(1.,diameter*diameter/4.));
}`;
const pointFragment = `#version 300 es
precision highp float;
uniform sampler2D paintTex; uniform float dustOn, bob;
in vec4 color; in vec2 center; out vec4 result;
void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.08,1.,r))*color.a;
  if(dustOn>.5){
    vec2 uv=(center-vec2(545.,548.+bob))/vec2(610.,243.);
    a*=1.-texture(paintTex,uv).b;
  }
  result=vec4(color.rgb*a,0.);
}`;

function seededRandom(seed) {
  return () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
}

function makeDust() {
  const rand = seededRandom(4201);
  // Packets lift from the wheel, lower lip and outer bumper at different times.
  const origins = [[1118,695], [1001,724], [902,744], [1090,706],
                   [1124,685], [974,730], [1043,718], [928,741], [1109,700]];
  return origins.map(([x,y], index) => {
    const period = 4.8 + 2.4*rand();
    const grains = Array.from({length: 116 + Math.floor(68*rand())}, () => {
      const angle = TAU*rand(), radius = Math.sqrt(rand())*(.55+.45*rand());
      const fleck = rand() < .13;
      return {
        dx: Math.cos(angle)*radius, dy: Math.sin(angle)*radius,
        lag: .62*rand()**2, life: 2.5+1.5*rand(), turn: TAU*rand(),
        size: fleck ? 2.2+rand() : 1.15+1.2*rand(),
        alpha: fleck ? .29+.23*rand() : .42+.54*rand(), warmth: rand(),
      };
    });
    return {x,y, grains, period, start: index===0 ? 0 : period*rand(),
      vx: 98+37*rand(), vy: -19-14*rand(), turn: TAU*rand()};
  });
}

function makeDarkStars(indices) {
  const rand = seededRandom(6394), settings = new Array(meta.dots);
  for (const i of indices) {
    settings[i] = {
      active: rand() < .6, glint: rand() < .06,
      periods: [3+6*rand(), 3+6*rand(), 3+6*rand()],
      phases: [rand(), rand(), rand()], glintPeriod: 13+16*rand(), glintPhase: rand(),
    };
  }
  return settings;
}

function noiseKnot(n, seed) {
  let hash = Math.imul(seed ^ n, 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  const jitter = ((hash ^ (hash >>> 16)) >>> 0) / 4294967296 * .16;
  return n & 1 ? 1-jitter : jitter;
}

// Smooth alternating high/low knots; successive peaks and troughs vary in height.
function slowNoise(cycles, seed) {
  const pos = 2*cycles, k = Math.floor(pos), u = pos-k;
  const a = noiseKnot(k, seed);
  return a + (noiseKnot(k+1, seed)-a)*u*u*(3-2*u);
}

function darkStarGain(star, index) {
  let signal = 0;
  for (let k=0; k<3; k++) {
    signal += (k===0 ? .74 : k===1 ? .18 : .08) *
      slowNoise(time/star.periods[k]+star.phases[k], 3*index+k);
  }
  const u = Math.max(0, Math.min(1, (signal-.12)/.76));
  let gain = star.active ? .2+.8*u*u*(3-2*u) : .78+.12*u;
  if (star.active && star.glint) {
    const distance = Math.abs((time/star.glintPeriod+star.glintPhase)%1-.5)*star.glintPeriod;
    const pulse = Math.max(0, 1-distance/.62);
    gain += (1-gain)*.78*pulse*pulse*(3-2*pulse);
  }
  return gain;
}
function drawDots() {
  let count=0;
  for(let i=0;i<meta.dots;i++){
    const k=i*5, rate=dotState[k+2], phase=dotState[k+3];
    let x=dotState[k], y=dotState[k+1], opacity=1;
    if(rate>0){
      const u=(time*rate+phase)%1, a=u*64, s=Math.floor(a), f=a-s, off=(i*65+s)*2;
      x=(tracks[off]+(tracks[off+2]-tracks[off])*f)/16-512;
      y=(tracks[off+1]+(tracks[off+3]-tracks[off+1])*f)/16-512;
      const v=Math.min(1,u/.12,(1-u)/.12);
      opacity=v*v*(3-2*v);
    } else if(darkStars[i]) {
      const star=darkStars[i], travel=(time*.25+phase)%1, step=travel*32;
      const offset=(star.path*33+Math.floor(step))*2, fraction=step%1;
      x=(darkPaths[offset]+fraction*(darkPaths[offset+2]-darkPaths[offset]))/16-512;
      y=(darkPaths[offset+1]+fraction*(darkPaths[offset+3]-darkPaths[offset+1]))/16-512;
      opacity=darkStarGain(star,i)*Math.min(1,travel*12,(1-travel)*12);
      const point=star.path*7;
      darkData[point]=x+.5;darkData[point+1]=y+.5;darkData[point+6]=opacity;
      continue;
    } else if(dotState[k+4]>0) {
      opacity=.7+.3*Math.cos(TAU*(time*dotState[k+4]+phase));
    }
    if(x<view[0]-5 || x>view[0]+view[2]+5 || y<view[1]-5 || y>view[1]+view[3]+5) continue;
    const j=4*count++;
    instances[j]=x; instances[j+1]=y; instances[j+2]=rate>0?-(i+1):i; instances[j+3]=opacity;
  }
  const p=programs.dot;
  select(p,['sprites','lane']);
  gl.uniform2fv(loc(p,'atlasSize'),meta.spriteAtlas);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers.dots);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,instances,0,count*4);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);
  gl.vertexAttribDivisor(0,1);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,count);
  gl.vertexAttribDivisor(0,0);
  gl.disableVertexAttribArray(0);
  drawPoints(darkData,buffers.dark,false);
}
function drawPoints(data,buffer,isDust=false) {
  const p=programs.points;
  select(p,['paint']);
  gl.uniform1f(loc(p,'dustOn'),isDust?1:0);
  gl.uniform1f(loc(p,'bob'),.5*Math.sin(TAU*time*3/8)+.2*Math.sin(TAU*time*7/8));
  gl.uniform1f(loc(p,'scale'),isDust?canvas.width/view[2]:1);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,data);
  gl.enableVertexAttribArray(0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
  gl.vertexAttribPointer(1,4,gl.FLOAT,false,28,12);
  gl.drawArrays(gl.POINTS,0,data.length/7);
  gl.disableVertexAttribArray(0);
  gl.disableVertexAttribArray(1);
}
function drawDust() {
  let j = 0;
  for (const packet of dust) {
    const cycle = Math.floor((time+packet.start)/packet.period);
    const elapsed = time+packet.start-cycle*packet.period;
    const bend = packet.turn+cycle*2.39996;
    for (const s of packet.grains) {
      const age = elapsed-s.lag;
      if (age <= 0 || age >= s.life) {
        dustData[j+6]=0; j+=7; continue;
      }
      const u=age/s.life, travel=-Math.expm1(-.84*age)/.84;
      // Gentle rotation and two different shears curl the expanding packet.
      const angle=.27*age*Math.sin(bend)+.16*Math.sin(1.2*age+bend);
      const ca=Math.cos(angle), sa=Math.sin(angle);
      const dx=s.dx*ca-s.dy*sa, dy=s.dx*sa+s.dy*ca;
      const radius=1+1.58*travel+.48*age;
      const cx=packet.x+packet.vx*travel+10*age;
      const cy=packet.y+(packet.vy+7*Math.sin(bend))*travel;
      dustData[j]=cx+14*dx*radius+3.5*age*Math.sin(2.6*dy+.95*age+bend);
      dustData[j+1]=cy+8*dy*radius+2.8*age*Math.sin(3*dx-.83*age+bend)
        +1.2*age*Math.sin(s.turn+.7*age);
      dustData[j+2]=s.size*(1+.95*u);
      dustData[j+3]=1; dustData[j+4]=.97-.04*s.warmth; dustData[j+5]=.94-.07*s.warmth;
      const fadeIn=Math.min(1,age/.11), fadeOut=1-u*u*(3-2*u);
      dustData[j+6]=s.alpha*fadeIn*fadeOut;
      j+=7;
    }
  }
  drawPoints(dustData,buffers.dust,true);
}
function drawStars() {
  const sky=programs.sky;
  select(sky,[]);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers.stars);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);
  gl.uniform1f(loc(sky,'deviceScale'),1);
  for(let offset=0;offset>=Math.min(0,view[1]-390);offset-=390){
    gl.uniform1f(loc(sky,'repeatY'),offset);gl.drawArrays(gl.POINTS,0,starCount);
  }
  gl.disableVertexAttribArray(0);
}
function allocateScene(){
  const width=Math.max(1,Math.round(canvas.width*sceneScales[tier]));
  const height=Math.max(1,Math.round(canvas.height*sceneScales[tier]));
  if(sceneTarget?.width===width && sceneTarget.height===height) return;
  if(sceneTarget){gl.deleteFramebuffer(sceneTarget.buffer);gl.deleteTexture(textures.environment);}
  textures.environment=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,textures.environment);
  gl.texStorage2D(gl.TEXTURE_2D,1,gl.RGBA8,width,height);
  for(const param of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D,param,gl.LINEAR);
  const buffer=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,buffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,textures.environment,0);
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete scene framebuffer');
  sceneTarget={width,height,buffer};
}
function render(t) {
  if(!ready) return;
  time=t; frames++;
  allocateScene();
  gl.bindFramebuffer(gl.FRAMEBUFFER,sceneTarget.buffer);
  gl.viewport(0,0,sceneTarget.width,sceneTarget.height);
  const road=programs.road;
  select(road,['nightBase','carrier','detail','flow','zones','ribbonStation','ribbonFlow','plume']);
  gl.uniform1f(loc(road,'cubic'),tier===0 && canvas.width>view[2]*1.01?1:0);
  gl.uniform4fv(loc(road,'rect'),view);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE,gl.ONE);
  if(tier===0) drawDots();
  if(tier===0) drawStars();
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);
  gl.blitFramebuffer(0,0,sceneTarget.width,sceneTarget.height,0,0,canvas.width,canvas.height,gl.COLOR_BUFFER_BIT,gl.LINEAR);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);
  if(tier>0) drawDots();
  if(tier>0) drawStars();
  const body=programs.body;
  select(body,['body','materials','normal','gear','environment','paint','zones','exposure']);
  const bob=.5*Math.sin(TAU*time*3/8)+.2*Math.sin(TAU*time*7/8);
  gl.uniform4f(loc(body,'rect'),545,548+bob,610,243);
  gl.uniform1f(loc(body,'bob'),bob);
  gl.uniform4fv(loc(body,'wheel[0]'),wheels);
  gl.uniform2fv(loc(body,'wheelAngles'),wheelAngles);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_COLOR);
  drawDust();
  gl.disable(gl.BLEND);
}
function resize() {
  const r=stage.getBoundingClientRect();
  if(!gl || recorded || !r.width || !r.height) return;
  const aspect=r.width/r.height, vw=Math.max(730,Math.min(W,H*aspect)), vh=vw/aspect;
  view=[(W-vw)*.53, vh>H?H-vh:(H-vh)*.68,vw,vh];
  dpr=Math.min(2, devicePixelRatio || 1, gl.getParameter(gl.MAX_TEXTURE_SIZE)/Math.max(r.width,r.height));
  canvas.width=Math.max(1,Math.round(r.width*dpr));
  canvas.height=Math.max(1,Math.round(r.height*dpr));
  render(time);
}
function tick(now) {
  raf=0;
  if(!ready || !playing || document.hidden) return;
  if(!capture && last!==null && tier<sceneScales.length-1){
    const elapsed=now-last;
    if(elapsed<300){sampleTime+=elapsed;samples++;}
    if(sampleTime>=1500){
      slowWindows=sampleTime/samples>19?slowWindows+1:0;
      if(slowWindows>=2){tier++;slowWindows=0;}
      sampleTime=0;samples=0;
    }
  }
  render(time+(last===null?0:(now-last)/1000));
  last=now; raf=requestAnimationFrame(tick);
}
function schedule() {
  cancelAnimationFrame(raf); raf=0; last=null;
  if (recorded) {
    if (playing && !document.hidden) {
      video.play().catch(error => {
        if (error.name === 'NotAllowedError') setPlaying(false);
      });
    } else {
      video.pause();
    }
  } else if (ready && playing && !document.hidden) {
    raf=requestAnimationFrame(tick);
  }
  button.textContent=playing?'暂停':'播放';
  button.setAttribute('aria-label',button.textContent+'动画');
}
function setPlaying(value) { playing=value; schedule(); }
function fallback() {
  if (recorded) return;
  recorded = true;
  ready = false;
  stage.classList.remove('is-ready');
  video.src = 'prism-road/previews/prism-road-card.mp4';
  video.hidden = false;
  button.hidden = false;
  status.hidden = false;
  status.textContent = '当前浏览器不支持实时渲染，正在播放录制版';
  schedule();
}
function info() {
  const ext=gl?.getExtension('WEBGL_debug_renderer_info');
  return {ready,time,playing,frames,dpr,tier,sceneScale:sceneScales[tier],view:[...view],canvas:[canvas.width,canvas.height],
    renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'',glError:gl?.getError()};
}
document.addEventListener('visibilitychange',schedule);
button.addEventListener('click',()=>setPlaying(!playing));
canvas.addEventListener('webglcontextlost',fallback);
new ResizeObserver(resize).observe(stage);
async function init() {
  resize();
  if(!gl){fallback();return info();}
  const json=async name=>(await fetchAsset(name)).json();
  const bytes=async name=>(await fetchAsset(name)).arrayBuffer();
  const [config, wheelInfo, sky, state, path, darkIndices, darkTravel, tones]=await Promise.all([
    json('meta.json'),json('wheels.json'),json('night-stars.json'),bytes('dot-state.f32'),bytes('dot_paths.u16'),
    bytes('dark-stars.u16'),bytes('dark-paths.u16'),bytes('dark-tones.u32'), ...['night-base','carrier','detail','flow','body-moving-ground','paint','materials','panel-normals','running-gear','motion-zones','sprites','lane','ribbon-station','ribbon-flow','plume-color','wheel-exposure'].map(loadTexture),
  ]);
  meta=config; tracks=new Uint16Array(path); dotState=new Float32Array(state);
  wheels=wheelInfo.wheels.flatMap(w=>[...w.center,w.major_axis/2,w.minor_axis/2]);
  wheelAngles=wheelInfo.wheels.map(w=>w.rotation_degrees*Math.PI/180);
  darkStars=makeDarkStars(new Uint16Array(darkIndices));
  darkPaths=new Uint16Array(darkTravel);
  const colors=new Uint32Array(tones);
  darkData=new Float32Array(colors.length*7);
  new Uint16Array(darkIndices).forEach((index,pathIndex)=>{
    darkStars[index].path=pathIndex;const tone=colors[pathIndex],point=pathIndex*7;
    darkData[point+2]=3.2;darkData[point+3]=(tone>>>16)/255;darkData[point+4]=((tone>>8)&255)/255;darkData[point+5]=(tone&255)/255;
  });
  textures.nightBase=textures['night-base'];textures.normal=textures['panel-normals'];
  textures.gear=textures['running-gear'];textures.zones=textures['motion-zones'];textures.body=textures['body-moving-ground'];
  textures.ribbonStation=textures['ribbon-station'];
  textures.ribbonFlow=textures['ribbon-flow'];
  textures.plume=textures['plume-color'];
  textures.exposure=textures['wheel-exposure'];
  dust=makeDust(); dustData=new Float32Array(dust.reduce((n,p)=>n+p.grains.length,0)*7);
  const rand=seededRandom(46081);
  const stars = sky;
  stars.sort((left,right)=>left[2]-right[2]);
  const catalog=stars.flatMap(([x,y],index)=>[x+.5,y+.5,index/stars.length,rand()]);
  starCount = Math.round(stars.length * 1.5);
  for(let i=stars.length;i<starCount;i++){
    const [x,y]=stars[Math.floor(rand()*stars.length)];
    // Offset above a measured sky point to stay above the sloping horizon.
    catalog.push(Math.min(W-1,Math.max(0,x+(rand()-.5)*28)),Math.abs(y-4-rand()*28),rand(),rand());
  }
  starData=new Float32Array(catalog);
  instances=new Float32Array(meta.dots*4);
  for(const [name,data] of Object.entries({dots:instances,dust:dustData,stars:starData,dark:darkData})){
    buffers[name]=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buffers[name]);
    gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,buffers.stars);gl.bufferData(gl.ARRAY_BUFFER,starData,gl.STATIC_DRAW);
  programs.sky=program(skyVertex,skyFragment);
  programs.road=program(quadVertex,roadFragment);
  programs.body=program(quadVertex,bodyFragment);
  programs.dot=program(dotVertex,dotFragment); programs.points=program(pointVertex,pointFragment);
  if (recorded || gl.isContextLost()) { fallback(); return info(); }
  ready=true; resize(); stage.classList.add('is-ready'); status.hidden=true; button.hidden=false;
  schedule(); return info();
}
const initialized = init().catch(() => { fallback(); return info(); });
if (capture) {
  window.__prism = {ready: initialized, info, renderAt: render};
}
