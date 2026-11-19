export const resample = `
uniform float cubic;
vec3 samplePlate(sampler2D image, vec2 uv){
  if(cubic<.5) return texture(image,uv).rgb;
  vec2 size=vec2(textureSize(image,0)), pixel=uv*size-.5, cell=floor(pixel)+.5, f=fract(pixel);
  vec2 a=-.5*f*(1.-f)*(1.-f), d=-.5*f*f*(1.-f);
  vec2 b=1.+f*f*(-2.5+1.5*f), c=f*(.5+f*(2.-1.5*f));
  vec2 mid=c/(b+c), positions[3]=vec2[3](cell-1.,cell+mid,cell+2.);
  vec2 weights[3]=vec2[3](a,b+c,d);
  vec3 color=vec3(0.);
  for(int row=0;row<3;row++) for(int col=0;col<3;col++)
    color+=texture(image,vec2(positions[col].x,positions[row].y)/size).rgb*weights[col].x*weights[row].y;
  return color;
}`;

export const vapor = `
vec2 vaporOffset(vec2 p,float age){
  vec2 q=p*vec2(.019,.029);
  float clock=t*.43;
  vec2 curl=vec2(7.*cos(q.x*.6+q.y+clock)+4.*cos(q.y*1.5-clock*.7),
                 -4.2*cos(q.x*.6+q.y+clock)+5.*sin(q.x*1.4-clock));
  return age*(vec2(31.,-2.)+curl)+vec2(2.*sin(q.y+clock),2.4*cos(q.x*.9-clock));
}
vec3 smokeSample(sampler2D image,vec2 uv,vec2 size,vec2 p){
  float phase=fract(t/2.8+.21*sin(p.y*.015)+.12*sin(p.x*.009));
  float blend=.5-.5*cos(6.2831853*phase);
  vec2 first=vaporOffset(p,(.5-phase)*2.8), second=vaporOffset(p,(.5-fract(phase+.5))*2.8);
  vec3 advected=mix(texture(image,uv+second/size).rgb,texture(image,uv+first/size).rgb,blend);
  vec2 plume=(p-vec2(t*27.,0.))*vec2(.029,.052);
  float eddy=sin(plume.x+.65*sin(plume.y+t*.45))*.60+cos(plume.x*.52-plume.y+sin(plume.x*.71+t*.27))*.40;
  return advected+eddy*vec3(.032,.027,.026);
}`;

export const bodyFragment = `#version 300 es
precision highp float;
in vec2 pos;
uniform sampler2D bodyTex, materialsTex, normalTex, gearTex, environmentTex, paintTex, zonesTex;
uniform sampler2D exposureTex;
uniform float t,bob;
uniform vec4 wheel[2],viewRect;
uniform vec2 wheelAngles;
out vec4 result;
const vec2 origin=vec2(545,548), size=vec2(610,243);
vec4 carAt(vec2 p){return texture(bodyTex,(p-origin)/size);}
vec3 environment(vec2 world){
  vec2 uv=clamp((world-viewRect.xy)/viewRect.zw,.002,.998);
  return texture(environmentTex,vec2(uv.x,1.-uv.y)).rgb;
}
void main(){
  vec2 p=pos-vec2(0.,bob), uv=(p-origin)/size;
  vec4 car=carAt(p); if(car.a<.001) discard;
  vec4 material=texture(materialsTex,uv);
  vec3 gear=texture(gearTex,uv).rgb;
  for(int index=0;index<2;index++){
    vec2 delta=p-wheel[index].xy-.5;
    float angle=wheelAngles[index]; mat2 axes=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
    vec2 unit=transpose(axes)*delta/wheel[index].zw;
    float r=length(unit);
    if(r<1.38 && (gear.g+gear.b)>.001){
      float turn=t*(index==0?11.7:11.1);
      vec2 dish=vec2(index==0?3.:10.,-1.)*(1.-smoothstep(.40,.97,r));
      vec2 local=transpose(axes)*(delta-dish)/wheel[index].zw;
      float phi=atan(local.y,local.x);
      vec2 circle=length(local)*vec2(cos(phi+turn),sin(phi+turn));
      vec2 texUV=(wheel[index].xy+.5+dish+axes*(circle*wheel[index].zw)-origin)/size;
      vec3 disc=texture(exposureTex,texUV).rgb;
      disc*=1.+.055*cos(5.*(phi+turn));
      float rim=exp(-pow((r-.90)/.048,2.));
      disc+=vec3(.69,.74,.8)*rim*pow(.5+.5*cos(phi+turn-.4),12.);
      float hub=smoothstep(.14,.24,length(local))*(1.-smoothstep(.96,1.015,r));
      car.rgb=mix(car.rgb,disc,hub*gear.b);
      car.rgb=mix(car.rgb,texture(exposureTex,uv).rgb,gear.g*.66);
      result=vec4(min(car.rgb,vec3(car.a)),car.a);
      return;
    }
  }
  float smoke=texture(zonesTex,p/vec2(1597,985)).g;
  float veil=smoke*smoothstep(986.,1100.,p.x)*smoothstep(673.,713.,p.y)*(1.-material.a);
  if(veil>.001){
    vec2 delta=vec2(sin(t*1.8+p.y*.045)*3.8,cos(t*.9+p.x*.029)*2.3);
    float drift=dot(carAt(p+delta).rgb-car.rgb,vec3(.2126,.7152,.0722));
    car.rgb*=1.+veil*clamp(drift,0.,.09);
  }
  if(gear.g<.5){
    vec3 normal=normalize(texture(normalTex,uv).rgb*2.-1.);
    float fresnel=.14+.86*pow(1.-abs(normal.z),2.);
    vec2 donor=vec2(1050.+(p.x-815.)*.76+170.*normal.x,790.+(684.-p.y)*.42+57.*normal.y);
    vec3 road=.54*environment(donor)+.23*(environment(donor+vec2(5,1.7))+environment(donor-vec2(5,1.7)));
    float luma=dot(car.rgb,vec3(.2126,.7152,.0722));
    float stripe=texture(paintTex,uv).g;
    // Project the live foreground ribbon across the normal of each painted panel.
    // Sliding the lookup along the body also carries hue through the beltline.
    float axis=p.x+.32*(p.y-660.)+20.*normal.x+13.*normal.y;
    float wave=6.2831853*(axis-t*113.)/153.;
    float fold=.5+.5*cos(wave+.65*sin((p.y-650.)*.072));
    float band=smoothstep(.18,.94,fold);
    float sampleY=834.+83.*sin(wave*.64+normal.y*.52);
    vec3 reflected=.78*environment(vec2(1200.,sampleY))+.22*road;
    const vec3 Y=vec3(.2126,.7152,.0722);
    vec3 hue=reflected/max(.045,dot(reflected,Y));
    float exposure=smoothstep(.018,.070,luma);
    float cleanPaint=1.-smoothstep(935.,1010.,p.x)*smoothstep(657.,687.,p.y);
    float plumeEdge=smoothstep(890.,954.,p.x)*smoothstep(672.,716.,p.y);
    cleanPaint*=1.-plumeEdge;
    float coat=material.r*cleanPaint*exposure;
    // On polished contours the original photograph already contains the
    // reflection. Redirect part of that energy into the moving donor hue.
    float colorMix=min(.92,coat*(.65+.27*stripe)*(.22+.78*band));
    car.rgb=mix(car.rgb,hue*luma,colorMix);
    car.rgb+=coat*hue*luma*(.026+(.73+.08*fresnel)*band+.11*stripe);
    float pane=(p.x-690.)*.80+(p.y-615.)*1.45-t*24.+normal.x*7.;
    float glint=pow(.5+.5*cos(pane*.092),4.);
    vec3 glassColor=environment(vec2(1200.,826.+73.*sin(pane*.052)));
    car.rgb+=material.g*((carAt(p+normal.xy*2.6).rgb-car.rgb)*.30+
             glint*(.27+.17*fresnel)*glassColor);
    car.rgb+=material.b*(.28*road+.12*max(road.r,max(road.g,road.b))-.09);
    car.rgb+=material.a*vec3(.057,.009,.004)*(.5+.5*sin(t*1.45));
    car.rgb+=gear.r*.05*road;
  }
  result=vec4(clamp(car.rgb,0.,car.a),car.a);
}`;

export const skyVertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 spec;
uniform vec4 viewRect;
uniform float t,repeatY,deviceScale;
out vec3 tint; out float radius,gain,rays,extent;
void main(){
  float seed=spec.w; vec2 world=spec.xy;
  if(repeatY<0.) world=vec2(fract(seed*82.413+repeatY*.117)*1597.,fract(seed*59.391+repeatY*.079)*390.+repeatY);
  vec2 uv=(world-viewRect.xy)/viewRect.zw;
  gl_Position=vec4(uv*vec2(2,-2)+vec2(-1,1),0,1);
  float layer=spec.z;
  float warm=fract(seed*11.31); tint=warm<.19?vec3(1.,.93,.77):mix(vec3(.66,.79,1.),vec3(.98,.99,1.),warm);
  rays=step(.96,layer);
  radius=deviceScale*(layer<.96?mix(.42,1.04,layer):mix(1.35,2.,(layer-.96)/.04));
  extent=ceil(max(4.,radius*(rays>.5?10.:5.)+1.));
  gl_PointSize=extent;
  float clock=t*(1.05+2.15*seed)+seed*275.;
  float twinkle=.5+.5*sin(clock+.38*sin(clock*.41+seed*32.));
  if(fract(seed*19.7)>.92) twinkle=pow(twinkle,3.);
  gain=mix(.15,1.,twinkle)*(.72+.83*layer)*(repeatY<0.?.75:1.);
}`;

export const skyFragment = `#version 300 es
precision highp float;
in vec3 tint;in float radius,gain,rays,extent;
out vec4 result;
void main(){
  vec2 delta=abs(gl_PointCoord-.5)*extent;float dist=length(delta);
  float core=1.-smoothstep(max(0.,radius-.45),radius+.45,dist);
  float halo=(.10+.085*rays)*exp(-dist*dist/max(.15,1.8*radius*radius));
  float crossRay=rays*.44*exp(-min(delta.x,delta.y)*5.-dist/max(.3,1.8*radius));
  result=vec4(tint*gain*(core+halo+crossRay),0.);
}`;
