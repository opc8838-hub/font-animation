const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const scope={window:{}};vm.createContext(scope);
for(const file of ['bubble-frame-motion.js','bubble-frame-fluid-lettering.js','bubble-frame-poses.js','bubble-frame-clearance.js','bubble-frame-fluid.js']){
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../site',file),'utf8'),scope);Object.assign(scope,scope.window);
}
const {BubbleFrameMotion:data,BubbleFrameFluid:fluid,BubbleFrameReferenceSlots:slots}=scope;
const state={lead:2,write:.6,restore:2.2,size:172,flow:1,rotation:1,tracking:0,lineSpacing:1,letterStyle:'bubble',textColor:'#ff54dc'};
const items=slots.map((g,i)=>({...g,row:i<7?0:1,reference:true}));
function area(points){return Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);}
function hull(points){
  const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),half=points=>{
    const h=[];for(const p of points){while(h.length>1){const a=h.at(-2),b=h.at(-1);if((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>0)break;h.pop();}h.push(p);}h.pop();return h;
  };return [...half(sorted),...half(sorted.reverse())];
}
function capture(at){
  const points=[],ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},closePath(){},fill(){},moveTo(){},quadraticCurveTo(x,y){points.push(x,y);}};
  fluid.render(ctx,items,state,at,600,320);return points;
}
// C must retain its open mouth: compressed source pixels must not introduce a blinking counter.
let largestFalseCounter=0,maxRelativeAreaStep=0,minimumMouthArea=Infinity;
for(let g=0;g<14;g++)for(let f=0;f<data.frames.length;f++){
  const p=data.frames[f][g],a=area(p.slice(0,data.outerCount))-area(p.slice(data.outerCount));
  if(slots[g].ch==='C')largestFalseCounter=Math.max(largestFalseCounter,area(p.slice(data.outerCount))*600*320);
  if(slots[g].variant==='C')minimumMouthArea=Math.min(minimumMouthArea,(area(hull(p.slice(0,data.outerCount)))-a)*600*320);
  if(f){const prev=data.frames[f-1][g],b=area(prev.slice(0,data.outerCount))-area(prev.slice(data.outerCount));maxRelativeAreaStep=Math.max(maxRelativeAreaStep,Math.abs(a-b)/b);}
}
// Sample actual drawing geometry either side of every measured knot at playback time.
let maxVelocityBreak=0;
for(let f=1;f<data.frames.length-1;f++){
  const t=state.lead*Math.acos(1-2*f/(data.frames.length-1))/Math.PI,dt=1e-5;
  const before=capture(t-dt),at=capture(t),after=capture(t+dt);
  for(let i=0;i<at.length;i++)maxVelocityBreak=Math.max(maxVelocityBreak,Math.abs((after[i]-at[i])/dt-(at[i]-before[i])/dt));
}
const result={largestFalseCounter,minimumMouthArea,maxRelativeAreaStep,maxVelocityBreak};console.log(JSON.stringify(result));
assert.ok(largestFalseCounter<1,'C has a blinking enclosed counter');
assert.ok(minimumMouthArea>1000,'The upper C mouth collapses during a compressed source frame');
assert.ok(maxRelativeAreaStep<.08,'A letter abruptly gains or loses more than 8% of its area in a source sample');
assert.ok(maxVelocityBreak<2,'Drawing velocity jumps at an interpolation knot');
// Every perimeter sample must stay attached to the same whole-letter transform.
// Local melting, tails or changing counters break these affine coordinates.
function contours(at){
  const groups=[];let points;
  const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){groups.push(points=[]);},closePath(){},fill(){},moveTo(){},quadraticCurveTo(x,y){points.push([x,y]);}};
  fluid.render(ctx,items,state,at,600,320);return groups;
}
const landmarks=contours(0).map(p=>{
  let best=[0,1,2],area=0;
  for(let b=1;b<p.length;b+=8)for(let c=b+1;c<p.length;c+=8){const det=Math.abs((p[b][0]-p[0][0])*(p[c][1]-p[0][1])-(p[b][1]-p[0][1])*(p[c][0]-p[0][0]));if(det>area){area=det;best=[0,b,c];}}
  return best;
});
function coordinates(p,g){
  const [i,j,k]=landmarks[g],a=p[i],b=p[j],c=p[k],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-a[0],c[1]-a[1]],det=u[0]*v[1]-u[1]*v[0];
  assert.ok(Math.abs(det)>1,'Letter landmarks must enclose an area');
  return p.map(q=>{const x=q[0]-a[0],y=q[1]-a[1];return [(x*v[1]-y*v[0])/det,(u[0]*y-u[1]*x)/det];});
}
const masters=contours(0).map(coordinates);let maxLocalDeformation=0;
for(let f=1;f<96;f++)contours(f/96*4.8).forEach((p,g)=>coordinates(p,g).forEach((q,i)=>q.forEach((value,k)=>{maxLocalDeformation=Math.max(maxLocalDeformation,Math.abs(value-masters[g][i][k]));})));
assert.ok(maxLocalDeformation<1e-8,'A letter develops local melting instead of moving as a complete shape');
console.log(JSON.stringify({maxLocalDeformation}));
