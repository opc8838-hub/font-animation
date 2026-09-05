/* Smooth ribbon material and a separate depth mask, shared by every output. */
(function (root) {
  'use strict';
  let ink, rear, layer, cover;
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  function surface(canvas, w, h) {
    canvas ||= document.createElement('canvas');
    if (canvas.width !== Math.ceil(w) || canvas.height !== Math.ceil(h)) { canvas.width = Math.ceil(w); canvas.height = Math.ceil(h); }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    return canvas;
  }
  function outline(points) {
    const path = new Path2D(), a = points[0], b = points[points.length - 1];
    const side = (p, s) => [p.x - Math.sin(p.angle) * p.r * s, p.y + Math.cos(p.angle) * p.r * s];
    path.moveTo(...side(a, 1));
    for (let i = 1; i < points.length; i++) path.lineTo(...side(points[i], 1));
    path.arc(b.x, b.y, b.r, b.angle + Math.PI / 2, b.angle - Math.PI / 2, true);
    for (let i = points.length - 2; i >= 0; i--) path.lineTo(...side(points[i], -1));
    path.arc(a.x, a.y, a.r, a.angle - Math.PI / 2, a.angle + Math.PI / 2, true);
    path.closePath(); return path;
  }
  function radius(p, motion, brushWidth, join) {
    const organic = .96 + .12 * Math.sin(p.length / 84) + .10 * root.RibbonInkFreehand.noise(p.length / 135, 7);
    const pressure = .89 + .11 * Math.cos(p.angle * 2 - .4);
    // A broad, rounded brush end, not a tapered pen nib. Keep the existing
    // pressure variation in the body; only soften the two moving cut ends.
    // Near-full radius also makes the side meet the semicircular cap gently.
    const tail = motion.tail > 0 ? .94 + .06 * smooth((p.length - motion.tail) / 46) : 1;
    const head = .96 + .04 * smooth((motion.head - p.length) / 32);
    const body = brushWidth * .5 * organic * pressure;
    const blend = join ? smooth(p.length / join.blend) : 1;
    return ((join?.radius ?? body) * (1 - blend) + body * blend) * Math.min(head, tail);
  }
  function pigmentBounds(length, drift, density) {
    const u = (length - drift) * density * 1.65;
    // Unequal wavelengths create connected lobes and narrow waists. This is
    // a two-dimensional dye boundary, not a collection of round-ended strokes.
    const center = .86 * Math.sin(u / 68) + .48 * Math.sin(u / 123 + 1.3) + .28 * Math.sin(u / 31 + .7);
    const half = .53 + .20 * Math.sin(u / 89 + .9) + .14 * Math.cos(u / 39);
    return { low: center - half, high: center + half, u };
  }
  const materialDrift = (time, speed) => time * 140 * speed;
  const softMax = (a, b, k = .3) => {
    const h = Math.max(0, k - Math.abs(a - b)) / k;
    return Math.max(a,b) + h*h*k*.25;
  };
  let dyeCache;
  function materialRings(length, drift, density) {
    if (dyeCache && dyeCache.length === length && dyeCache.density === density
      && dyeCache.from < -drift-128 && dyeCache.to > length-drift+128) return dyeCache.rings;
    // Build the advecting field once in material coordinates. Each frame only
    // bends its contours onto the fixed route; no per-frame grid reconstruction.
    const from = Math.floor((-drift-1536)/3)*3;
    const to = Math.ceil((length-drift+384)/3)*3;
    const extent = to-from;
    const nx = Math.ceil(extent / 3), ny = 64, stride = ny + 1;
    const values = new Float32Array((nx+1)*stride);
    const noise = root.RibbonInkFreehand.noise, step = 190/density;
    const pools = [];
    for (let k = Math.floor(from/step)-1; k*step < to+step; k++) {
      pools.push({center:k*step+noise(k,23)*step*.32,
        half:(50+22*(noise(k,41)+1))/density, flip:noise(k,13)>0?1:-1, cut:Math.abs(k)%2===0});
    }
    for (let x=0;x<=nx;x++) {
      const s=from+x/nx*extent, b=pigmentBounds(s,0,density);
      const nearby=pools.filter(p=>Math.abs(s-p.center)<p.half*1.5);
      for (let y=0;y<=ny;y++) {
        const v=y/ny*5-2.5;
        let f=Math.min(v-b.low,b.high-v);
        for(const p of nearby) {
          const u=(s-p.center)/p.half;
          // A lobe curls back across the width; the soft union rounds its
          // junction with the main field instead of leaving pointed cutouts.
          const middle=p.flip*(.35+.48*Math.sin(u*2.8));
          const pool=(1-Math.hypot(u,(v-middle)/.70))*.70;
          f=p.cut ? -softMax(-f,pool) : softMax(f,pool);
        }
        values[x*stride+y]=(x===0||x===nx||y===0||y===ny)?-3:f;
      }
    }
    const vertices=new Map(), links=new Map();
    const edge=(x,y,e)=>{
      const endpoints=[[[x,y],[x+1,y]],[[x+1,y],[x+1,y+1]],[[x,y+1],[x+1,y+1]],[[x,y],[x,y+1]]][e];
      const [a,b]=endpoints, ai=a[0]*stride+a[1], bi=b[0]*stride+b[1];
      const id=ai*2+(a[0]===b[0]?1:0);
      if(!vertices.has(id)) {
        const t=values[ai]/(values[ai]-values[bi]);
        vertices.set(id,[from+(a[0]+(b[0]-a[0])*t)/nx*extent,(a[1]+(b[1]-a[1])*t)/ny*5-2.5]);
      }
      return id;
    };
    const pairs={1:[[3,0]],2:[[0,1]],3:[[3,1]],4:[[1,2]],6:[[0,2]],7:[[3,2]],8:[[2,3]],9:[[0,2]],11:[[1,2]],12:[[1,3]],13:[[0,1]],14:[[3,0]]};
    for(let x=0;x<nx;x++)for(let y=0;y<ny;y++) {
      const corners=[values[x*stride+y],values[(x+1)*stride+y],values[(x+1)*stride+y+1],values[x*stride+y+1]];
      const mask=corners.reduce((n,v,i)=>n+(v>0?1<<i:0),0);
      let segments=pairs[mask];
      if(mask===5||mask===10) {
        const inside=corners.reduce((a,b)=>a+b,0)>0;
        segments=(mask===5)===inside?[[0,1],[2,3]]:[[3,0],[1,2]];
      }
      for(const [a,b] of segments||[]) {
        const ia=edge(x,y,a),ib=edge(x,y,b);
        if(!links.has(ia))links.set(ia,[]);if(!links.has(ib))links.set(ib,[]);
        links.get(ia).push(ib);links.get(ib).push(ia);
      }
    }
    const rings=[],visited=new Set();
    for(const start of links.keys()) {
      if(visited.has(start))continue;
      let at=start,previous=-1;
      const ring=[];
      do {
        ring.push(vertices.get(at));
        visited.add(at);
        const next=links.get(at).find(id=>id!==previous);
        if(next===undefined)break;
        previous=at;at=next;
      }while(at!==start&&!visited.has(at));
      rings.push(ring);
    }
    dyeCache={length,density,from,to,rings};
    return rings;
  }
  function clipRing(ring, limit, keepGreater) {
    const result=[];
    let a=ring.at(-1),insideA=keepGreater?a[0]>=limit:a[0]<=limit;
    for(const b of ring) {
      const insideB=keepGreater?b[0]>=limit:b[0]<=limit;
      if(insideA!==insideB) {
        const t=(limit-a[0])/(b[0]-a[0]);
        result.push([limit,a[1]+(b[1]-a[1])*t]);
      }
      if(insideB)result.push(b);
      a=b;insideA=insideB;
    }
    return result;
  }
  function dyeContours(points, brushWidth, drift, density, rings, part, join) {
    const path=new Path2D(),accents=[new Path2D(),new Path2D(),new Path2D()];
    const start=points[0].length,length=points.at(-1).length;
    const mapped=([u,v])=>{
      const s=u+drift;
      let lo=0,hi=points.length-1;
      while(hi-lo>1){const m=(lo+hi)>>1;if(points[m].length<s)lo=m;else hi=m;}
      const a=points[lo],b=points[hi],t=Math.max(0,Math.min(1,(s-a.length)/Math.max(1e-8,b.length-a.length)));
      const angle=a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*t;
      const extra=s<start?s-start:s>length?s-length:0;
      const r=radius({length:Math.max(start,Math.min(length,s)),angle},{head:Infinity,tail:0},brushWidth,join);
      return [a.x+(b.x-a.x)*t+Math.cos(angle)*extra-Math.sin(angle)*r*v,
        a.y+(b.y-a.y)*t+Math.sin(angle)*extra+Math.cos(angle)*r*v];
    };
    for(const uv of rings) {
      let clipped=clipRing(uv,part.start-drift-brushWidth*1.5,true);
      if(!clipped.length)continue;
      clipped=clipRing(clipped,part.end-drift+brushWidth*1.5,false);
      if(clipped.length<3)continue;
      const ring=clipped.map(mapped),loop=new Path2D(),last=ring.at(-1),first=ring[0];
      loop.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);
      ring.forEach((p,i)=>{const n=ring[(i+1)%ring.length];loop.quadraticCurveTo(p[0],p[1],(p[0]+n[0])/2,(p[1]+n[1])/2);});
      loop.closePath();path.addPath(loop);
      const index=Math.abs(Math.floor(uv[0][0]/(190/density)))%3;
      accents[index].addPath(loop);
    }
    return {path,accents};
  }
  function paletteStyle(ctx, colors, nextColors, index, part, route) {
    if (colors[index] === nextColors[index]) return colors[index];
    if (part !== route.parts[0]) return nextColors[index];
    const start = part.points[0].x, end = part.points.at(-1).x;
    const gradient = ctx.createLinearGradient(start, 0, start + (end-start)*.82, 0);
    gradient.addColorStop(0, colors[index]);
    gradient.addColorStop(.12, colors[index]);
    gradient.addColorStop(1, nextColors[index]);
    return gradient;
  }
  function draw(route, motion, w, h, unit, brushWidth, colors, time, speed, density, weave, nextColors = colors) {
    ink = surface(ink, w, h); rear = surface(rear, w, h); layer = surface(layer, w, h); cover = surface(cover, w, h);
    const ctx = ink.getContext('2d'), depth = rear.getContext('2d'), paint = layer.getContext('2d');
    const coverage = cover.getContext('2d');
    if (motion.head <= motion.tail) return { ink, rear, cover };
    const routePoints = route.parts.flatMap(part => part.points).filter((p, i, list) => !i || p.length > list[i - 1].length + 1e-8);
    const drift = materialDrift(time, speed);
    const rings = materialRings(route.length,drift,density);
    for (const part of route.parts) {
      const from = Math.max(part.start, motion.tail), to = Math.min(part.end, motion.head);
      if (to <= from) continue;
      const points = root.RibbonInkSequence.section(part.points, from, to).map(p => ({ ...p, r: radius(p, motion, brushWidth, route.join) }));
      if (points.length < 2) continue;
      const dye = dyeContours(routePoints,brushWidth,drift,density,rings,part,route.join);
      paint.setTransform(1, 0, 0, 1, 0, 0); paint.clearRect(0, 0, w, h);
      paint.save(); paint.scale(unit, unit); paint.translate(-motion.camera * w / unit, 0);
      const body = outline(points);
      paint.fillStyle = paletteStyle(paint,colors,nextColors,0,part,route); paint.fill(body);
      paint.globalCompositeOperation = 'source-atop';
      // Keep pigment geometry independent of the reveal window. Moving head
      // and tail clip a continuously advecting field, not newly capped decals.
      paint.fillStyle = paletteStyle(paint,colors,nextColors,1,part,route);
      paint.fill(dye.path,'evenodd');
      // Give every convex dye tip a finite round radius, including the very
      // narrow lobes created as two color regions separate. Curves alone can
      // still form needle-like ends; a round dilation prevents those tips.
      paint.lineJoin='round';paint.lineCap='round';paint.lineWidth=brushWidth*.09;
      paint.strokeStyle=paint.fillStyle;paint.stroke(dye.path);
      // Accent tones belong to the same contours, not an extra layer of marks.
      dye.accents.forEach((path,i)=>{paint.globalAlpha=.10;paint.fillStyle=paletteStyle(paint,colors,nextColors,[2,4,3][i],part,route);paint.fill(path,'evenodd');});
      paint.restore();
      ctx.drawImage(layer, 0, 0);
      const behind = weave === 'back' || (weave !== 'front' && (weave === 'reverse' ? !part.rear : part.rear));
      // A later foreground pass must also clear an earlier rear pass at self-crossings.
      depth.globalCompositeOperation = behind ? 'source-over' : 'destination-out';
      depth.save(); depth.scale(unit, unit); depth.translate(-motion.camera * w / unit, 0);
      depth.fillStyle = '#fff';
      // Cover the ink's antialiased fringe so a rear stroke cannot leave a
      // colored hairline across a solid glyph when the text is composited back.
      const expanded = outline(points.map(p => ({ ...p, r: p.r + 1.25 })));
      depth.fill(expanded);
      depth.restore();
      coverage.save(); coverage.scale(unit, unit); coverage.translate(-motion.camera * w / unit, 0);
      coverage.fillStyle = '#fff'; coverage.fill(expanded); coverage.restore();
    }
    depth.globalCompositeOperation = 'source-over';
    return { ink, rear, cover };
  }
  root.RibbonInkWriting = { draw, radius, materialDrift, pigmentBounds, paletteStyle };
})(typeof window === 'undefined' ? globalThis : window);
