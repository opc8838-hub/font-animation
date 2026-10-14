/* Visible source line. The accepted in-cup simulation remains untouched. */
(() => {
  'use strict';
  const START = -64, END = 299, BASELINE = 110, SOURCE_LIFT = 70;
  const bend = [];
  let length = 0, previous = { x: END, y: BASELINE };
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, u = 1 - t;
    const point = { x: u*u*u*END + 3*u*u*t*316 + 3*u*t*t*318 + t*t*t*332,
      y: u*u*u*BASELINE + 3*u*u*t*110 + 3*u*t*t*122 + t*t*t*132 };
    if (i) length += Math.hypot(point.x - previous.x, point.y - previous.y);
    bend.push({ ...point, distance: length }); previous = point;
  }
  const straightLength = END - START, totalLength = straightLength + length;
  function pointAt(distance) {
    if (distance <= straightLength) return { x: START + distance, y: BASELINE - SOURCE_LIFT, angle: 0 };
    const s = Math.min(length, distance - straightLength);
    let i = 1; while (i < bend.length - 1 && bend[i].distance < s) i++;
    const a = bend[i-1], b = bend[i], blend = (s - a.distance) / (b.distance - a.distance);
    return { x: a.x + (b.x-a.x)*blend, y: a.y + (b.y-a.y)*blend - SOURCE_LIFT, angle: Math.atan2(b.y-a.y,b.x-a.x) };
  }
  function pose(x,y,angle,id=0){
    const p=Math.max(0,Math.min(1,(y-62)/198)),blend=p*p*(3-2*p);
    // Sparse individual glyphs peel off the sentence before the jet fans out.
    // Hidden carriers fade into the widening lower jet; the accepted pool is unmodified.
    const hash=TypePourFluid.hash;
    const revealAt=210+hash(id+517)*170;
    const reveal=Math.max(0,Math.min(1,(y-revealAt)/55));
    const sparse=id%20===0?1:reveal*reveal*(3-2*reveal);
    const entry=Math.max(0,Math.min(1,(y-62)/10));
    const settle=Math.max(0,Math.min(1,(y-90)/170));
    const signed=(angle+Math.PI)%(Math.PI*2)-Math.PI;
    const heading=.7*(1-settle)+signed*settle;
    const center=332+(y-62)*.19;
    // Stable per-glyph lanes fan out smoothly, then reconnect before cup collision.
    const air=Math.max(0,Math.min(1,(y-132)/318));
    const join=Math.max(0,Math.min(1,(y-360)/90));
    const spread=Math.pow(air,.8)*(1-join*join*(3-2*join));
    const lane=(hash(id+811)-.5)*116;
    const curl=Math.sin(air*5.2+hash(id+913)*Math.PI*2)*15*air;
    const baseX=y<260?center+(x-center)*(.12+.88*blend):x;
    // Stretch the upper fall smoothly while keeping the cup entry and settled pool fixed.
    const drop=Math.max(0,Math.min(1,(y-62)/388));
    const lift=SOURCE_LIFT*(1-drop*drop*(3-2*drop));
    return {x:baseX+(lane+curl)*spread,y:y+70*(1-blend)-lift,
      angle:y<260?heading:angle,opacity:entry*sparse};
  }
  function draw(ctx, time, run) {
    if (!run.glyphs.length || run.width <= 0 || time >= 7.2) return;
    const travel = Math.max(0, Math.min(6.75, time-.45))*92;
    const phase = travel % run.width;
    // Stop supplying new letters early enough for the final tail to reach the outlet.
    const tail = Math.max(0, totalLength - (7.2 - time) * 92);
    ctx.save();ctx.fillStyle=run.color||'#202321';ctx.font=run.font;ctx.textAlign='center';ctx.textBaseline='middle';
    for (let copy=-1;copy<=Math.ceil(totalLength/run.width);copy++) {
      for (const glyph of run.glyphs) {
        const s=copy*run.width+phase+glyph.center;
        if(s<tail||s>totalLength)continue;
        const p=pointAt(s);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
        ctx.globalAlpha=Math.min(1,s/10,(totalLength-s)/8);
        ctx.fillText(glyph.text,0,0);ctx.restore();
      }
    }
    ctx.restore();
  }
  window.TypePourSource={pointAt,pose,draw,totalLength};
})();
