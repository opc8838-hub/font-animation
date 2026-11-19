// Stations are measured in source pixels along the guides. Both sides of a
// ribbon share its centerline station across each normal cross-section.
export const ribbons = `
uniform sampler2D ribbonStationTex, ribbonFlowTex, plumeTex;
vec2 decodePair(vec4 q){return (256.*q.rb+q.ga)*255.;}
vec2 chartUV(vec2 grid){return grid/vec2(400.,247.);}
float nearRoad(vec2 p){
  float divide=p.x<450.?mix(855.,770.,p.x/450.):
    p.x<800.?mix(770.,734.,(p.x-450.)/350.):
    p.x<1200.?mix(734.,716.,(p.x-800.)/400.):mix(716.,695.,(p.x-1200.)/396.);
  return smoothstep(divide-8.,divide+8.,p.y);
}
vec2 ribbonOffset(vec2 grid,float age){
  float slice=clamp(3.+10.*age,0.,6.);
  vec2 a=grid+vec2(0.,247.*floor(slice));
  vec2 b=grid+vec2(0.,247.*ceil(slice));
  vec2 atlas=vec2(400.,1729.);
  return decodePair(mix(texture(ribbonFlowTex,a/atlas),texture(ribbonFlowTex,b/atlas),fract(slice)))/128.-256.;
}
float surge(float distance){
  float angle=distance*(6.2831853/775.);
  float crest=.5+.5*cos(angle+.41*sin(angle*.51+.7));
  return mix(.43,1.83,crest*crest*(3.-2.*crest));
}
vec3 ribbonColor(vec2 grid,vec2 p,vec2 uv,vec4 carrier){
  float near=nearRoad(p);
  vec2 station=decodePair(texture(ribbonStationTex,chartUV(grid)))/24.-350.;
  float phase=fract(t/.60+texture(detailTex,uv).a);
  float weight=.5-.5*cos(6.2831853*phase);
  vec2 a=uv+ribbonOffset(grid,(.5-phase)*.60)/size;
  vec2 b=uv+ribbonOffset(grid,(.5-fract(phase+.5))*.60)/size;
  vec3 detail=(mix(texture(detailTex,b).rgb,texture(detailTex,a).rgb,weight)-.5)
              /(1.35*length(vec2(weight,1.-weight)));
  vec2 travel=station-vec2(130.,395.)*t;
  float gain=mix(surge(travel.x),surge(travel.y+234.),near);
  vec3 color=max(vec3(0.),carrier.rgb+detail);
  return color*min(gain,1./max(.001,max(color.r,max(color.g,color.b))));
}
`;
