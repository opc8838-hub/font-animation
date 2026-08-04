class BoxSquad {
  constructor(cx, cy, size){
    this.figScale  = random(0.75, 1.25);
    this.armFactor = random(0.75, 1.25);
    this.legFactor = random(0.75, 1.25);

    this.edgeHit  = 8;
    this.hover    = null;
    this.drag     = null;
    this.limbDrag = -1;
    this.grabOff  = { l: 0, r: 0, t: 0, b: 0 };

    this.leftNeighbor   = null;
    this.rightNeighbor  = null;
    this.topNeighbor    = null;
    this.bottomNeighbor = null;

    this.overArmIdx = 1;

    this.stretchFactor = 1.30;

    this.neckGap    = 0;
    this.torsoAngle = 0;

    this.twerkPhase = random(0, Math.PI * 2);

    this.restPull  = 0.30;
    this.iters     = 8;
    this.transFrac = 0.5;

    this.colorSeeds = { shirt: random(), pants: random(), shoe: random(), hat: random(), beanie: random(), glasses: random() };
    this.longSleeve  = random() < 0.5;
    this.hair        = random(['none', 'none', 'none', 'none', 'none',
                               'cap', 'rect', 'hat', 'bowldot',
                               'hood', 'longhair', 'bun', 'mohawk', 'curly', 'baseball', 'swoop',
                               'balaclava', 'hoodie', 'topbun', 'beanie', 'bald', 'sidebun']);
    this.hatBrimDir  = random() < 0.5 ? -1 : 1;
    this.swoopDir    = random() < 0.5 ? -1 : 1;
    this.sidebunDir  = random() < 0.5 ? -1 : 1;
    this.curlyOffsets = [];
    for(var ci = 0; ci < 9; ci++){
      this.curlyOffsets.push({
        dx: random(-0.19, 0.19),
        dy: random(-0.19, 0.19),
        dr: random(-0.12, 0.12),
      });
    }
    this.placket     = random() < 0.5;
    this.noseDir     = random() < 0.5 ? -1 : 1;
    this.noseShape   = random(['none', 'none', 'none', 'none',
                               'L', 'Lslope', 'carrot', 'line', 'bottomline']);
    this.mustache    = random() < 0.30;
    this.beard       = random() < 0.22;
    this.sideburns   = random() < 0.4;
    this.shorts      = random() < 0.4;
    this.legCuff     = random() < 0.5;
    this.sleeveCuff  = random() < 0.5;
    this.zipper      = random() < 0.4;
    this.glasses     = random() < 0.3;
    this.glassesShape = random(['square', 'round', 'bar']);

    if(this.hair === 'bald') this.sideburns = true;

    function pickArmEdge(side){
      return random() < 0.5 ? 'top' : (side === 'L' ? 'left' : 'right');
    }
    function pickLegEdge(side){
      return random() < 0.5 ? 'bottom' : (side === 'L' ? 'left' : 'right');
    }
    function pickFrac(edge, type, side){
      if(edge === 'top' || edge === 'bottom'){
        return side === 'L' ? random(0, 0.5) : random(0.5, 1);
      }
      return type === 'arm' ? random(0, 0.5) : random(0.5, 1);
    }

    var laEdge = pickArmEdge('L');
    var raEdge = pickArmEdge('R');
    var llEdge = pickLegEdge('L');
    var rlEdge = pickLegEdge('R');

    this.limbs = [
      { anchor: 'tl', edge: laEdge, frac: pickFrac(laEdge, 'arm', 'L'), bend: +1 },
      { anchor: 'tr', edge: raEdge, frac: pickFrac(raEdge, 'arm', 'R'), bend: -1 },
      { anchor: 'bl', edge: llEdge, frac: pickFrac(llEdge, 'leg', 'L'), bend: -1 },
      { anchor: 'br', edge: rlEdge, frac: pickFrac(rlEdge, 'leg', 'R'), bend: +1 },
    ];

    this.initialLimbs = this.limbs.map(function(l){ return { edge: l.edge, frac: l.frac }; });

    this.pieces = {
      box:   { fill: null,     stroke: bodyCol, weight: 2 },
      shirt: { fill: null,     stroke: bodyCol, weight: 1 },
      pants: { fill: null,     stroke: bodyCol, weight: 1 },
      body:  { fill: shirtCol, stroke: bodyCol, weight: 1 },
      head:  { fill: shirtCol, stroke: bodyCol, weight: 1 },
      eye:   { fill: bodyCol,  stroke: null,    weight: 0 },
      shoe:  { fill: null,     stroke: bodyCol, weight: 1 },
    };
    this.applyPalette();

    this.place(cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2);
  }

  _applyScale(size){
    var figSize = size * this.figScale;
    var sk = figSize / 200;
    var sw = size / 200;
    this.detailScale = sk;
    this.strokeScale = sw;

    this.endHit   = 16 * sw;
    this.endMarkR = 4 * sw;

    this.torsoW          = figSize * 0.20;
    this.torsoH          = figSize * 0.33;
    this.headR           = figSize * 0.0675;
    this.legStrokeWeight      = 19 * sk;
    this.legLimbStrokeWeight  = 12 * sk;
    this.armStrokeWeight      = 12 * sk;
    this.armShirtStrokeWeight = 20 * sk;
    this.legInset        = this.legStrokeWeight / 2;
    this.armInset        = this.torsoW * Math.PI / 16;
    this.armAnchorDrop = this.armStrokeWeight / 2;
    this.legAnchorRise = this.legStrokeWeight / 2;
    this.cornerMaxTravel = this.torsoH * 0.25;

    this.pieces.shirt.weight = 1.5 * sw;
    this.pieces.pants.weight = 1.5 * sw;
    this.pieces.body.weight  = 1.5 * sw;
    this.pieces.head.weight  = 1.5 * sw;
    this.pieces.shoe.weight  = 1.5 * sw;
    this.pieces.box.weight   = 1.125 * sw;

    this.minW = Math.max(this.torsoW, 2 * this.headR) + 20;
    this.minH = this.torsoH + this.neckGap + 2 * this.headR + 20;

    var armTotal = 6 * this.headR * this.armFactor;
    var legTotal = (2 * this.headR + this.neckGap + this.torsoH) * this.legFactor;
    for(var i = 0; i < this.limbs.length; i++){
      var lim   = this.limbs[i];
      var isArm = (lim.anchor === 'tl' || lim.anchor === 'tr');
      var total = isArm ? armTotal : legTotal;
      lim.L1 = total / 2;
      lim.L2 = total / 2;
    }
  }

  place(left, top, right, bottom){
    this.homeLeft = left; this.homeRight  = right;
    this.homeTop  = top;  this.homeBottom = bottom;
    this._left = left; this._right  = right;
    this._top  = top;  this._bottom = bottom;
    this._applyScale(Math.min(right - left, bottom - top));
    this.torsoCx    = (left + right) / 2;
    this.torsoCy    = (top + bottom) / 2;
    this.torsoAngle = 0;
  }

  applyPalette(){
    var pick = function(t){
      var f = colorSet[Math.min(colorSet.length - 1, Math.floor(t * colorSet.length))];
      var isBlack = red(f) + green(f) + blue(f) === 0;
      return { fill: f, stroke: isBlack ? shirtCol : bodyCol };
    };
    var s = pick(this.colorSeeds.shirt); this.pieces.shirt.fill = s.fill; this.pieces.shirt.stroke = s.stroke;
    var p = pick(this.colorSeeds.pants); this.pieces.pants.fill = p.fill; this.pieces.pants.stroke = p.stroke;
    var h = pick(this.colorSeeds.shoe);  this.pieces.shoe.fill  = h.fill; this.pieces.shoe.stroke  = h.stroke;
    this.hatCol    = pick(this.colorSeeds.hat).fill;
    this.beanieCol = pick(this.colorSeeds.beanie).fill;
    var gp = pick(this.colorSeeds.glasses);
    var gBlack = red(gp.fill) + green(gp.fill) + blue(gp.fill) === 0;
    this.glassesCol = gBlack ? shirtCol : gp.fill;
    this.glassesStroke = bodyCol;
  }

  resetPose(){
    this._left   = this.homeLeft;
    this._right  = this.homeRight;
    this._top    = this.homeTop;
    this._bottom = this.homeBottom;
    for(var i = 0; i < this.limbs.length; i++){
      this.limbs[i].edge = this.initialLimbs[i].edge;
      this.limbs[i].frac = this.initialLimbs[i].frac;
    }
    this.torsoCx    = (this.homeLeft + this.homeRight) / 2;
    this.torsoCy    = (this.homeTop  + this.homeBottom) / 2;
    this.torsoAngle = 0;
    this.drag       = null;
    this.limbDrag   = -1;
  }

  get left()    { return this._left; }
  set left(v){
    if(this._left === v) return;
    this._left = v;
    if(this.leftNeighbor)   this.leftNeighbor.right = v;
    if(this.topNeighbor)    this.topNeighbor.left    = v;
    if(this.bottomNeighbor) this.bottomNeighbor.left = v;
  }

  get right()   { return this._right; }
  set right(v){
    if(this._right === v) return;
    this._right = v;
    if(this.rightNeighbor)  this.rightNeighbor.left = v;
    if(this.topNeighbor)    this.topNeighbor.right    = v;
    if(this.bottomNeighbor) this.bottomNeighbor.right = v;
  }

  get top()     { return this._top; }
  set top(v){
    if(this._top === v) return;
    this._top = v;
    if(this.topNeighbor)    this.topNeighbor.bottom = v;
    if(this.leftNeighbor)   this.leftNeighbor.top   = v;
    if(this.rightNeighbor)  this.rightNeighbor.top  = v;
  }

  get bottom()  { return this._bottom; }
  set bottom(v){
    if(this._bottom === v) return;
    this._bottom = v;
    if(this.bottomNeighbor) this.bottomNeighbor.top = v;
    if(this.leftNeighbor)   this.leftNeighbor.bottom  = v;
    if(this.rightNeighbor)  this.rightNeighbor.bottom = v;
  }

  hitTest(mx, my){
    var t = this.edgeHit;
    var nearL = Math.abs(mx - this.left)   <= t;
    var nearR = Math.abs(mx - this.right)  <= t;
    var nearT = Math.abs(my - this.top)    <= t;
    var nearB = Math.abs(my - this.bottom) <= t;

    var inX = mx >= this.left - t && mx <= this.right  + t;
    var inY = my >= this.top  - t && my <= this.bottom + t;
    if(!inX || !inY) return null;

    if(nearT && nearL) return 'tl';
    if(nearT && nearR) return 'tr';
    if(nearB && nearL) return 'bl';
    if(nearB && nearR) return 'br';
    if(nearL) return 'l';
    if(nearR) return 'r';
    if(nearT) return 't';
    if(nearB) return 'b';
    return null;
  }

  limbEndpointAt(mx, my){
    var r2 = this.endHit * this.endHit;
    for(var i = 0; i < this.limbs.length; i++){
      var tg = this.limbTarget(this.limbs[i]);
      var dx = mx - tg.x, dy = my - tg.y;
      if(dx*dx + dy*dy <= r2) return i;
    }
    return -1;
  }

  cursorFor(hit){
    if(hit === 'l' || hit === 'r')  return 'ew-resize';
    if(hit === 't' || hit === 'b')  return 'ns-resize';
    if(hit === 'tl' || hit === 'br') return 'nwse-resize';
    if(hit === 'tr' || hit === 'bl') return 'nesw-resize';
    return 'default';
  }

  mouseMovedLimb(mx, my){
    if(this.drag || this.limbDrag >= 0) return true;
    if(this.limbEndpointAt(mx, my) >= 0){
      this.hover = 'limb';
      cursor('grabbing');
      return true;
    }
    return false;
  }

  mouseMovedEdge(mx, my){
    if(this.drag || this.limbDrag >= 0) return true;
    var h = this.hitTest(mx, my);
    if(h){
      this.hover = h;
      cursor(this.cursorFor(h));
      return true;
    }
    this.hover = null;
    return false;
  }

  mousePressedLimb(mx, my){
    var li = this.limbEndpointAt(mx, my);
    if(li < 0) return false;
    this.limbDrag = li;
    cursor('grabbing');
    var lim = this.limbs[li];
    var a   = this.limbAnchor(lim);
    var tg  = this.limbTarget(lim);
    this.dragTargetDist = Math.hypot(tg.x - a.x, tg.y - a.y);
    return true;
  }

  mousePressedEdge(mx, my){
    var hit = this.hitTest(mx, my);
    if(!hit) return false;
    this.drag = hit;
    this.grabOff.l = mx - this.left;
    this.grabOff.r = mx - this.right;
    this.grabOff.t = my - this.top;
    this.grabOff.b = my - this.bottom;
    cursor(this.cursorFor(hit));
    return true;
  }

  mouseDragged(mx, my){
    if(this.limbDrag >= 0){
      this.dragLimbEndpoint(mx, my);
      return;
    }
    if(!this.drag) return;
    var d = this.drag;

    var pL = this.left, pR = this.right, pT = this.top, pB = this.bottom;
    var MIN = 10;

    if(d.indexOf('l') !== -1){
      pL = mx - this.grabOff.l;
      if(pL > pR - MIN) pL = pR - MIN;
      if(this.leftNeighbor && pL < this.leftNeighbor.left + MIN){
        pL = this.leftNeighbor.left + MIN;
      }
    }
    if(d.indexOf('r') !== -1){
      pR = mx - this.grabOff.r;
      if(pR < pL + MIN) pR = pL + MIN;
      if(this.rightNeighbor && pR > this.rightNeighbor.right - MIN){
        pR = this.rightNeighbor.right - MIN;
      }
    }
    if(d.indexOf('t') !== -1){
      pT = my - this.grabOff.t;
      if(pT > pB - MIN) pT = pB - MIN;
      if(this.topNeighbor && pT < this.topNeighbor.top + MIN){
        pT = this.topNeighbor.top + MIN;
      }
    }
    if(d.indexOf('b') !== -1){
      pB = my - this.grabOff.b;
      if(pB < pT + MIN) pB = pT + MIN;
      if(this.bottomNeighbor && pB > this.bottomNeighbor.bottom - MIN){
        pB = this.bottomNeighbor.bottom - MIN;
      }
    }

    this.left   = pL;
    this.right  = pR;
    this.top    = pT;
    this.bottom = pB;
  }

  dragLimbEndpoint(mx, my){
    var lim = this.limbs[this.limbDrag];

    for(var pass = 0; pass < 8; pass++){
      var raw;
      if(lim.edge === 'top' || lim.edge === 'bottom'){
        raw = (mx - this.left) / (this.right - this.left);
      } else {
        raw = (my - this.top) / (this.bottom - this.top);
      }

      if(raw >= 0 && raw <= 1){
        lim.frac = raw;
        break;
      }

      var t = this.cornerTransition(lim.edge, raw > 1);
      if(!t){
        lim.frac = raw > 1 ? 1 : 0;
        break;
      }
      lim.edge = t.newEdge;
      lim.frac = t.newFrac;
    }
  }

  cornerTransition(edge, pastEnd){
    if(edge === 'top')    return pastEnd ? { newEdge: 'right',  newFrac: 0 } : { newEdge: 'left',  newFrac: 0 };
    if(edge === 'right')  return pastEnd ? { newEdge: 'bottom', newFrac: 1 } : { newEdge: 'top',   newFrac: 1 };
    if(edge === 'bottom') return pastEnd ? { newEdge: 'right',  newFrac: 1 } : { newEdge: 'left',  newFrac: 1 };
    if(edge === 'left')   return pastEnd ? { newEdge: 'bottom', newFrac: 0 } : { newEdge: 'top',   newFrac: 0 };
    return null;
  }

  perimP(edge, frac){
    var W = this.right - this.left;
    var H = this.bottom - this.top;
    if(edge === 'top')    return frac * W;
    if(edge === 'right')  return W + frac * H;
    if(edge === 'bottom') return W + H + (1 - frac) * W;
    return                       2 * W + H + (1 - frac) * H;
  }

  fromPerimP(P){
    var W = this.right - this.left;
    var H = this.bottom - this.top;
    var perim = 2 * (W + H);
    P = ((P % perim) + perim) % perim;
    if(P <= W)         return { edge: 'top',    frac: P / W };
    if(P <= W + H)     return { edge: 'right',  frac: (P - W) / H };
    if(P <= 2 * W + H) return { edge: 'bottom', frac: 1 - (P - W - H) / W };
    return                    { edge: 'left',   frac: 1 - (P - 2 * W - H) / H };
  }

  mouseReleased(){
    this.drag = null;
    this.limbDrag = -1;
  }

  torsoBounds(){
    var c  = Math.cos(this.torsoAngle);
    var s  = Math.sin(this.torsoAngle);
    var hw = this.torsoW / 2;
    var hh = this.torsoH / 2;
    var cx = this.torsoCx;
    var cy = this.torsoCy;
    function xform(lx, ly){
      return { x: cx + lx * c - ly * s, y: cy + lx * s + ly * c };
    }
    var legHw = Math.max(0, hw - this.legInset);
    var armHw = Math.max(0, hw - this.armInset);
    return {
      cx: cx,
      cy: cy,
      tl:   xform(-hw, -hh),
      tr:   xform( hw, -hh),
      bl:   xform(-hw,  hh),
      br:   xform( hw,  hh),
      armL: xform(-armHw, -hh + this.armAnchorDrop),
      armR: xform( armHw, -hh + this.armAnchorDrop),
      legL: xform(-legHw,  hh - this.legAnchorRise),
      legR: xform( legHw,  hh - this.legAnchorRise),
      head: xform(0, -hh - this.neckGap - this.headR)
    };
  }

  limbAnchor(lim){
    var t = this.torsoBounds();
    if(lim.anchor === 'tl') return t.armL;
    if(lim.anchor === 'tr') return t.armR;
    if(lim.anchor === 'bl') return t.legL;
    if(lim.anchor === 'br') return t.legR;
    return { x: t.cx, y: t.cy };
  }

  limbTarget(lim){
    return this.targetFromEdge(lim.edge, lim.frac);
  }

  targetFromEdge(edge, frac){
    if(edge === 'top')    return { x: this.left + frac * (this.right - this.left), y: this.top };
    if(edge === 'bottom') return { x: this.left + frac * (this.right - this.left), y: this.bottom };
    if(edge === 'left')   return { x: this.left,  y: this.top + frac * (this.bottom - this.top) };
    if(edge === 'right')  return { x: this.right, y: this.top + frac * (this.bottom - this.top) };
    return { x: this.left + frac * (this.right - this.left), y: this.top };
  }

  solveIK(ax, ay, tx, ty, L1, L2, side){
    var dx = tx - ax;
    var dy = ty - ay;
    var D  = Math.sqrt(dx*dx + dy*dy);
    var maxD = L1 + L2;

    if(D > maxD){
      var s = D / maxD;
      var ux = dx / D, uy = dy / D;
      return {
        jx: ax + L1 * s * ux,
        jy: ay + L1 * s * uy,
        ex: tx,
        ey: ty
      };
    }

    var minD = Math.abs(L1 - L2);
    var Dc = D < minD ? minD : D;
    var cosA = (L1*L1 + Dc*Dc - L2*L2) / (2 * L1 * Dc);
    if(cosA >  1) cosA =  1;
    if(cosA < -1) cosA = -1;
    var a = Math.acos(cosA);

    var base = Math.atan2(dy, dx);
    var jointAngle = base + side * a;
    return {
      jx: ax + L1 * Math.cos(jointAngle),
      jy: ay + L1 * Math.sin(jointAngle),
      ex: tx,
      ey: ty
    };
  }

  _lineIntersect(p1, d1, p2, d2){
    var denom = d1.x * d2.y - d1.y * d2.x;
    if(Math.abs(denom) < 1e-6) return null;
    var t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / denom;
    return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
  }

  _sampleBezier(x0, y0, x1, y1, x2, y2, x3, y3, segs){
    var pts = [];
    for(var i = 0; i <= segs; i++){
      var t = i / segs, u = 1 - t;
      var a = u*u*u, b = 3*u*u*t, c = 3*u*t*t, d = t*t*t;
      pts.push({ x: a*x0 + b*x1 + c*x2 + d*x3, y: a*y0 + b*y1 + c*y2 + d*y3 });
    }
    return pts;
  }

  _strokeOutline(pts, hw, opts){
    var n = pts.length;
    if(n < 2) return [];

    var dir = [], nrm = [];
    for(var i = 0; i < n - 1; i++){
      var dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
      var L = Math.hypot(dx, dy) || 1;
      dx /= L; dy /= L;
      dir.push({ x: dx, y: dy });
      nrm.push({ x: -dy, y: dx });
    }

    var self = this;
    var taperSegs      = (opts && opts.taperSegs)      ? opts.taperSegs      : 1;
    var startTaperSegs = (opts && opts.startTaperSegs) ? opts.startTaperSegs : 1;
    var startHipR      = (opts && opts.startHipR)      ? opts.startHipR      : hw;
    var MITER_LIMIT = 4;
    var limitedMiter = function(vertex, pa, pb, dA, dB, halfW){
      var m = self._lineIntersect(pa, dA, pb, dB);
      if(!m) return null;
      var mdx = m.x - vertex.x, mdy = m.y - vertex.y;
      var maxD = MITER_LIMIT * halfW;
      if(mdx*mdx + mdy*mdy > maxD * maxD) return null;
      return m;
    };

    function emitSide(acc, sign){
      for(var i = 0; i < n; i++){
        if(i === 0 || i === n - 1){
          if(i === 0 && opts){
            var customStart = (sign > 0) ? opts.startLeft : opts.startRight;
            if(customStart){ acc.push({ x: customStart.x, y: customStart.y }); continue; }
          }
          if(i === n - 1 && opts){
            var custom = (sign > 0) ? opts.endLeft : opts.endRight;
            if(custom){ acc.push({ x: custom.x, y: custom.y }); continue; }
          }
          var ne = (i === 0) ? nrm[0] : nrm[n-2];
          acc.push({ x: pts[i].x + ne.x*sign*hw, y: pts[i].y + ne.y*sign*hw });
          continue;
        }

        var hwEff = hw;
        if(startTaperSegs > 1 && i < startTaperSegs){
          var ratio = startHipR / hw;
          var tS    = i / startTaperSegs;
          hwEff = hw * (1 + (ratio - 1) * (1 - tS));
        }

        var na = nrm[i-1], nb = nrm[i];
        var pa = { x: pts[i].x + na.x*sign*hwEff, y: pts[i].y + na.y*sign*hwEff };
        var pb = { x: pts[i].x + nb.x*sign*hwEff, y: pts[i].y + nb.y*sign*hwEff };
        var cross = dir[i-1].x*dir[i].y - dir[i-1].y*dir[i].x;
        var dot   = dir[i-1].x*dir[i].x + dir[i-1].y*dir[i].y;
        var turn  = Math.abs(Math.atan2(cross, dot));
        var outer = (sign > 0) ? (cross < 0) : (cross > 0);

        if(taperSegs > 1 && opts && i > n - 1 - taperSegs){
          var customI = (sign > 0) ? opts.endLeft : opts.endRight;
          if(customI){
            var normalV;
            if(turn < 0.08){
              normalV = { x: (pa.x+pb.x)/2, y: (pa.y+pb.y)/2 };
            } else {
              normalV = limitedMiter(pts[i], pa, pb, dir[i-1], dir[i], hwEff)
                        || { x: (pa.x+pb.x)/2, y: (pa.y+pb.y)/2 };
            }
            var t = (i - (n - 1 - taperSegs)) / taperSegs;
            acc.push({
              x: (1 - t) * normalV.x + t * customI.x,
              y: (1 - t) * normalV.y + t * customI.y
            });
            continue;
          }
        }

        if(turn < 0.08){
          acc.push({ x: (pa.x+pb.x)/2, y: (pa.y+pb.y)/2 });
        } else if(outer){
          var a0 = Math.atan2(pa.y - pts[i].y, pa.x - pts[i].x);
          var a1 = Math.atan2(pb.y - pts[i].y, pb.x - pts[i].x);
          var da = a1 - a0;
          while(da <= -Math.PI) da += 2*Math.PI;
          while(da >   Math.PI) da -= 2*Math.PI;
          var arc = Math.max(2, Math.ceil(Math.abs(da) / 0.4));
          for(var q = 0; q <= arc; q++){
            var a = a0 + da*(q/arc);
            acc.push({ x: pts[i].x + Math.cos(a)*hwEff, y: pts[i].y + Math.sin(a)*hwEff });
          }
        } else {
          var m = limitedMiter(pts[i], pa, pb, dir[i-1], dir[i], hwEff);
          if(m){
            acc.push(m);
          } else {
            acc.push(pa);
            acc.push(pb);
          }
        }
      }
    }

    var leftPts = [], rightPts = [];
    emitSide(leftPts, +1);
    emitSide(rightPts, -1);
    rightPts.reverse();
    return leftPts.concat(rightPts);
  }

  _armPaths(ax, ay, tx, ty, L1, L2, side, longSleeve){
    var k  = this.solveIK(ax, ay, tx, ty, L1, L2, side);
    var mx = (ax + k.jx) / 2, my = (ay + k.jy) / 2;
    if(longSleeve){
      var t  = 0.7;
      var cx = k.jx + t * (k.ex - k.jx);
      var cy = k.jy + t * (k.ey - k.jy);
      return {
        sleeve: this._strokeOutline(
          [{x: ax, y: ay}, {x: mx, y: my}, {x: k.jx, y: k.jy}, {x: cx, y: cy}],
          this.armShirtStrokeWeight / 2
        ),
        fore: this._strokeOutline(
          [{x: cx, y: cy}, {x: k.ex, y: k.ey}],
          this.armStrokeWeight / 2
        ),
      };
    }
    var saLen = Math.hypot(mx - ax, my - ay) || 1;
    var saux  = (mx - ax) / saLen, sauy = (my - ay) / saLen;
    var sanx  = -sauy, sany = saux;
    var saHalfW = this.armShirtStrokeWeight / 2 * 1.2;
    var saH     = this.armShirtStrokeWeight * 0.5;
    var satX = mx - saux * saH, satY = my - sauy * saH;
    return {
      sleeve: this._strokeOutline([{x: ax, y: ay}, {x: mx, y: my}], this.armShirtStrokeWeight / 2),
      fore:   this._strokeOutline([{x: mx, y: my}, {x: k.jx, y: k.jy}, {x: k.ex, y: k.ey}], this.armStrokeWeight / 2),
      cuff: [
        { x: mx   + sanx * saHalfW, y: my   + sany * saHalfW },
        { x: mx   - sanx * saHalfW, y: my   - sany * saHalfW },
        { x: satX - sanx * saHalfW, y: satY - sany * saHalfW },
        { x: satX + sanx * saHalfW, y: satY + sany * saHalfW },
      ],
    };
  }

  _legPaths(ax, ay, tx, ty, L1, L2, side, ankleFront, ankleBack, awkward, shorts){
    var k = this.solveIK(ax, ay, tx, ty, L1, L2, side);
    var h1x = ax   + 1.5 * (k.jx - ax),   h1y = ay   + 1.5 * (k.jy - ay);
    var h2x = k.ex + 1.5 * (k.jx - k.ex), h2y = k.ey + 1.5 * (k.jy - k.ey);
    var spine = this._sampleBezier(ax, ay, h1x, h1y, h2x, h2y, k.ex, k.ey, 16);

    var opts = {};
    if(!awkward && ankleFront && ankleBack){
      var n  = spine.length;
      var dx = spine[n-1].x - spine[n-2].x, dy = spine[n-1].y - spine[n-2].y;
      var nx = -dy, ny = dx;
      var ex = spine[n-1].x,   ey = spine[n-1].y;
      var frontDot = (ankleFront.x - ex) * nx + (ankleFront.y - ey) * ny;
      var backDot  = (ankleBack.x  - ex) * nx + (ankleBack.y  - ey) * ny;
      if(frontDot > backDot){ opts.endLeft = ankleFront; opts.endRight = ankleBack; }
      else                  { opts.endLeft = ankleBack;  opts.endRight = ankleFront; }
      opts.taperSegs = 4;
    }

    var hipR   = this.legStrokeWeight / 2 * 1.3;
    var dxH    = spine[1].x - spine[0].x, dyH = spine[1].y - spine[0].y;
    var LH     = Math.hypot(dxH, dyH) || 1;
    var nxH    = -dyH / LH, nyH = dxH / LH;
    opts.startLeft      = { x: spine[0].x + nxH * hipR, y: spine[0].y + nyH * hipR };
    opts.startRight     = { x: spine[0].x - nxH * hipR, y: spine[0].y - nyH * hipR };
    opts.startTaperSegs = 6;
    opts.startHipR      = hipR;

    var result = {
      leg: this._strokeOutline(spine, this.legStrokeWeight / 2, opts),
      k: k,
      ax: ax, ay: ay,
      h1: { x: h1x, y: h1y },
      h2: { x: h2x, y: h2y },
    };

    if(shorts){
      var mid = 5;
      var upperSpine = spine.slice(0, mid + 1);
      var lowerSpine = spine.slice(mid);
      var upperOpts  = {
        startLeft:      opts.startLeft,
        startRight:     opts.startRight,
        startTaperSegs: opts.startTaperSegs,
        startHipR:      opts.startHipR,
      };
      var lowerOpts  = {};
      if(opts.endLeft){
        lowerOpts.endLeft   = opts.endLeft;
        lowerOpts.endRight  = opts.endRight;
        lowerOpts.taperSegs = opts.taperSegs;
      }
      result.upper = this._strokeOutline(upperSpine, this.legStrokeWeight     / 2, upperOpts);
      result.lower = this._strokeOutline(lowerSpine, this.legLimbStrokeWeight / 2, lowerOpts);
    }

    var cuffIdx = shorts ? 5 : spine.length - 1;
    var cB = spine[cuffIdx], cP = spine[cuffIdx - 1];
    var cLen = Math.hypot(cB.x - cP.x, cB.y - cP.y) || 1;
    var cux  = (cB.x - cP.x) / cLen, cuy = (cB.y - cP.y) / cLen;
    var cnx  = -cuy, cny = cux;
    var cHalfW = this.legStrokeWeight / 2;
    var cH     = this.legStrokeWeight * 0.5;
    var cTx = cB.x - cux * cH, cTy = cB.y - cuy * cH;
    result.cuff = [
      { x: cB.x + cnx * cHalfW, y: cB.y + cny * cHalfW },
      { x: cB.x - cnx * cHalfW, y: cB.y - cny * cHalfW },
      { x: cTx  - cnx * cHalfW, y: cTy  - cny * cHalfW },
      { x: cTx  + cnx * cHalfW, y: cTy  + cny * cHalfW },
    ];
    return result;
  }

  _circlePath(cx, cy, r){
    var pts = [], N = 24;
    for(var i = 0; i < N; i++){ var a = i / N * Math.PI * 2; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
    return pts;
  }

  _drawPiece(piece, parts){
    var emit = () => {
      for(var i = 0; i < parts.length; i++){
        var p = parts[i];
        if(!p || p.length < 2) continue;
        beginShape();
          for(var j = 0; j < p.length; j++) vertex(p[j].x, p[j].y);
        endShape(CLOSE);
      }
    };
    if(this._dbg()){
      push(); noFill(); stroke(bodyCol); strokeWeight(1); emit(); pop();
      return;
    }
    if(piece.stroke != null && piece.weight > 0){
      push();
        fill(piece.stroke); stroke(piece.stroke);
        strokeWeight(piece.weight * 2); strokeJoin(ROUND);
        emit();
      pop();
    }
    if(piece.fill != null){
      push(); fill(piece.fill); noStroke(); emit(); pop();
    }
  }

  _drawOpenPiece(path, piece){
    if(!path || path.length < 2) return;
    var emit = (close) => {
      beginShape();
        for(var i = 0; i < path.length; i++) vertex(path[i].x, path[i].y);
      endShape(close ? CLOSE : undefined);
    };
    if(this._dbg()){ push(); noFill(); stroke(bodyCol); strokeWeight(1); emit(false); pop(); return; }
    if(piece.stroke != null && piece.weight > 0){
      push();
        fill(piece.stroke); stroke(piece.stroke);
        strokeWeight(piece.weight * 2); strokeJoin(ROUND); strokeCap(SQUARE);
        emit(false);
      pop();
    }
    if(piece.fill != null){
      push(); fill(piece.fill); noStroke(); emit(true); pop();
    }
  }

  edgeNormal(edge){
    if(edge === 'top')    return { x: 0, y:  1 };
    if(edge === 'bottom') return { x: 0, y: -1 };
    if(edge === 'left')   return { x: 1, y:  0 };
    if(edge === 'right')  return { x:-1, y:  0 };
    return { x: 0, y: 0 };
  }

  _perimPoint(P){
    var e = this.fromPerimP(P);
    var W = this.right - this.left, H = this.bottom - this.top;
    var x, y;
    if(e.edge === 'top')         { x = this.left + e.frac * W; y = this.top; }
    else if(e.edge === 'bottom') { x = this.left + e.frac * W; y = this.bottom; }
    else if(e.edge === 'left')   { x = this.left;              y = this.top + e.frac * H; }
    else                         { x = this.right;             y = this.top + e.frac * H; }
    var nrm = this.edgeNormal(e.edge);
    return { x: x, y: y, nx: nrm.x, ny: nrm.y };
  }

  _shoeVertices(tx, ty, edge, jx, jy, ax, ay){
    var tang = (edge === 'top' || edge === 'bottom') ? { x: 1, y: 0 } : { x: 0, y: 1 };

    var hfX = tx - ax,  hfY = ty - ay;
    var hkX = jx - ax,  hkY = jy - ay;
    var crossKnee = hfX * hkY - hfY * hkX;
    var crossTang = hfX * tang.y - hfY * tang.x;
    var dir = (crossKnee * crossTang >= 0) ? 1 : -1;

    var shoeScale = 1.3;
    var footLen   = 30 * this.detailScale * shoeScale;
    var heelDist  = footLen / 4;
    var toeDist   = footLen * 3 / 4;
    var heelD     = 3 * this.detailScale * shoeScale;
    var toeD      = 4 * this.detailScale * shoeScale;
    var midD      = toeD * 1.5;

    var W = this.right - this.left, H = this.bottom - this.top;
    var perim  = 2 * (W + H);
    var frac0  = (edge === 'top' || edge === 'bottom') ? (tx - this.left) / W : (ty - this.top) / H;
    var P0     = this.perimP(edge, frac0);
    var pSign  = (edge === 'top' || edge === 'right') ? 1 : -1;
    var travel = pSign * dir;
    var Pheel  = P0 - travel * heelDist;

    var half = footLen / 2;
    var depthAt = function(u){
      return (u <= half) ? heelD + (midD - heelD) * (u / half)
                         : midD  + (toeD  - midD) * ((u - half) / half);
    };

    var samples = [{ u: 0, cn: null }, { u: half, cn: null }, { u: footLen, cn: null }];
    var corners  = [0, W, W + H, 2 * W + H];
    var cornerCN = [ { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 } ];
    for(var ci = 0; ci < 4; ci++){
      var d = (((travel * (corners[ci] - Pheel)) % perim) + perim) % perim;
      if(d > 1 && d < footLen - 1) samples.push({ u: d, cn: cornerCN[ci] });
    }
    samples.sort(function(a, b){ return a.u - b.u; });

    var base = [], top = [];
    for(var i = 0; i < samples.length; i++){
      var s   = samples[i];
      var pp  = this._perimPoint(Pheel + travel * s.u);
      var dep = depthAt(s.u);
      var nx  = s.cn ? s.cn.x : pp.nx;
      var ny  = s.cn ? s.cn.y : pp.ny;
      base.push({ x: pp.x, y: pp.y });
      top.push({ x: pp.x + dep * nx, y: pp.y + dep * ny });
    }
    var poly = base.slice();
    for(var j = top.length - 1; j >= 0; j--) poly.push(top[j]);

    var peakPP  = this._perimPoint(Pheel + travel * half);
    var topHalf = { x: peakPP.x + midD * peakPP.nx, y: peakPP.y + midD * peakPP.ny };
    var heelPP  = this._perimPoint(Pheel);
    var heelTop = { x: heelPP.x + heelD * heelPP.nx, y: heelPP.y + heelD * heelPP.ny };
    var backMid = { x: (heelPP.x + heelTop.x) / 2, y: (heelPP.y + heelTop.y) / 2 };

    return { poly: poly, topHalf: topHalf, backMid: backMid, heelTop: heelTop };
  }

  _drawSeg(seg, col, w){
    if(!seg) return;
    push();
      noFill(); stroke(col); strokeWeight(w); strokeCap(ROUND);
      line(seg.a.x, seg.a.y, seg.b.x, seg.b.y);
    pop();
  }

  drawFoot(tx, ty, edge, jx, jy, ax, ay){
    var v = this._shoeVertices(tx, ty, edge, jx, jy, ax, ay);
    push();
      this._paint(this.pieces.shoe);
      beginShape();
        for(var i = 0; i < v.poly.length; i++) vertex(v.poly[i].x, v.poly[i].y);
      endShape(CLOSE);
    pop();
  }

  _balaclavaPath(botY, headW){
    var capR   = this.headR + 3;
    var chordN = -0.2 * this.headR / capR;
    var edgeN  = Math.sqrt(1 - chordN * chordN);
    var theta  = Math.atan2(-chordN, edgeN);
    var halfW  = edgeN * capR;
    var pts    = [];
    var steps  = 20, startA = Math.PI + theta, endA = 2 * Math.PI - theta;
    for(var i = 0; i <= steps; i++){
      var a = startA + (i / steps) * (endA - startA);
      pts.push({ x: capR * Math.cos(a), y: capR * Math.sin(a) });
    }
    pts.push({ x:  halfW, y: botY });
    pts.push({ x: -halfW, y: botY });
    var c = Math.cos(this.torsoAngle), s = Math.sin(this.torsoAngle);
    return pts.map(p => ({ x: headW.x + p.x * c - p.y * s, y: headW.y + p.x * s + p.y * c }));
  }

  _drawNose(headBody, toWorld){
    var r  = this.headR;
    var ey = headBody.y - this.headR * 0.08;
    push();
      noFill();
      stroke(bodyCol);
      strokeWeight(this._dbg() ? 1 : 1.5 * this.strokeScale);
      if(this.noseShape === 'carrot'){
        var half = r * 0.32;
        var shoulderY = ey + r * 0.40;
        var tipY      = ey + r * 0.50;
        var cL = toWorld({ x: -half, y: shoulderY });
        var cT = toWorld({ x:  0,    y: tipY });
        var cR = toWorld({ x:  half, y: shoulderY });
        beginShape();
          vertex(cL.x, cL.y);
          vertex(cT.x, cT.y);
          vertex(cR.x, cR.y);
        endShape();
      } else if(this.noseShape === 'line'){
        var lTop = toWorld({ x: 0, y: ey + r * 0.08 });
        var lBot = toWorld({ x: 0, y: ey + r * 0.55 });
        line(lTop.x, lTop.y, lBot.x, lBot.y);
      } else if(this.noseShape === 'bottomline'){
        var blHalf = r * 0.16;
        var blY    = ey + r * 0.50;
        var blL = toWorld({ x: -blHalf, y: blY });
        var blR = toWorld({ x:  blHalf, y: blY });
        line(blL.x, blL.y, blR.x, blR.y);
      } else if(this.noseShape === 'Lslope'){
        var slopeX = r * 0.24 * this.noseDir;
        var vDrop  = r * 0.5;
        var footX  = r * 0.18 * this.noseDir;
        var sTop    = toWorld({ x: 0,              y: ey });
        var sCorner = toWorld({ x: slopeX,         y: ey + vDrop });
        var sEnd    = toWorld({ x: slopeX - footX, y: ey + vDrop });
        beginShape();
          vertex(sTop.x,    sTop.y);
          vertex(sCorner.x, sCorner.y);
          vertex(sEnd.x,    sEnd.y);
        endShape();
      } else {
        var noseVert  = r * 0.5;
        var noseHoriz = r * 0.2 * this.noseDir;
        var nTop    = toWorld({ x: 0,         y: ey });
        var nCorner = toWorld({ x: 0,         y: ey + noseVert });
        var nEnd    = toWorld({ x: noseHoriz, y: ey + noseVert });
        beginShape();
          vertex(nTop.x,    nTop.y);
          vertex(nCorner.x, nCorner.y);
          vertex(nEnd.x,    nEnd.y);
        endShape();
      }
    pop();
  }

  _drawSideburns(headW){
    var R     = this.headR;
    var yTop  = -0.40 * R;
    var yBot  =  0.30 * R;
    var burnW =  0.20 * R;
    var steps = 8;
    push();
      if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
      else            { fill(bodyCol); noStroke(); }
      translate(headW.x, headW.y);
      rotate(this.torsoAngle);
      for(var side = -1; side <= 1; side += 2){
        beginShape();
          for(var i = 0; i <= steps; i++){
            var yo = yTop + (i / steps) * (yBot - yTop);
            vertex(Math.sqrt(Math.max(0, R * R - yo * yo)) * side, yo);
          }
          for(var j = steps; j >= 0; j--){
            var yi = yTop + (j / steps) * (yBot - yTop);
            vertex((Math.sqrt(Math.max(0, R * R - yi * yi)) - burnW) * side, yi);
          }
        endShape(CLOSE);
      }
    pop();
  }

  _drawMustache(headBody, toWorld){
    var mW = this.headR * 0.95;
    var mH = this.headR * 0.3;
    var hw = mW / 2, hh = mH / 2, r = mH;
    var mCenter = toWorld({ x: 0, y: headBody.y + this.headR * 0.52 });
    var steps = 8;
    push();
      if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
      else            { fill(bodyCol); noStroke(); }
      translate(mCenter.x, mCenter.y);
      rotate(this.torsoAngle);
      beginShape();
        vertex(-hw,  hh);
        vertex( hw,  hh);
        for(var i = 0; i <= steps; i++){
          var a = (i / steps) * (-Math.PI / 2);
          vertex((hw - r) + r * Math.cos(a), hh + r * Math.sin(a));
        }
        for(var j = 0; j <= steps; j++){
          var b = (-Math.PI / 2) + (j / steps) * (-Math.PI / 2);
          vertex((-hw + r) + r * Math.cos(b), hh + r * Math.sin(b));
        }
      endShape(CLOSE);
    pop();
  }

  _drawGlasses(headW, eyeOff){
    var lensR   = this.headR * 0.36;
    var lensOff = eyeOff;
    var lensCy  = -this.headR * 0.08;
    push();
      noFill();
      stroke(bodyCol);
      strokeWeight(this._dbg() ? 1 : 1.5 * this.strokeScale);
      translate(headW.x, headW.y);
      rotate(this.torsoAngle);
      if(this.glassesShape === 'bar'){
        var barW = 2 * (lensOff + lensR);
        var barH = lensR * 1.7;
        if(!this._dbg()){ fill(this.glassesCol); stroke(this.glassesStroke); }
        rectMode(CENTER);
        rect(0, lensCy, barW, barH);
        line(-barW / 2, lensCy, -this.headR, lensCy);
        line( barW / 2, lensCy,  this.headR, lensCy);
      } else {
        if(this.glassesShape === 'square'){
          rectMode(CENTER);
          rect(-lensOff, lensCy, lensR * 2, lensR * 2);
          rect( lensOff, lensCy, lensR * 2, lensR * 2);
        } else {
          circle(-lensOff, lensCy, lensR * 2);
          circle( lensOff, lensCy, lensR * 2);
        }
        line(-lensOff + lensR, lensCy, lensOff - lensR, lensCy);
        line(-lensOff - lensR, lensCy, -this.headR, lensCy);
        line( lensOff + lensR, lensCy,  this.headR, lensCy);
      }
    pop();
  }

  _drawBeard(headW, headBody, toWorld){
    var R      = this.headR;
    var topY   = 0.67 * R;
    var halfW  = Math.sqrt(Math.max(0, R * R - topY * topY));
    var angR   = Math.atan2(topY, halfW);
    var angL   = Math.PI - angR;
    var segSteps = 22;
    var burnTop = -0.85 * R;
    var burnBot =  0.82 * R;
    var burnW   =  0.20 * R;
    var bSteps  = 8;
    push();
      if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
      else            { fill(bodyCol); noStroke(); }
      translate(headW.x, headW.y);
      rotate(this.torsoAngle);
      beginShape();
        vertex(-halfW, topY);
        vertex( halfW, topY);
        for(var i = 0; i <= segSteps; i++){
          var a = angR + (angL - angR) * (i / segSteps);
          vertex(R * Math.cos(a), R * Math.sin(a));
        }
      endShape(CLOSE);
      for(var side = -1; side <= 1; side += 2){
        beginShape();
          for(var so = 0; so <= bSteps; so++){
            var yo = burnTop + (so / bSteps) * (burnBot - burnTop);
            vertex(Math.sqrt(Math.max(0, R * R - yo * yo)) * side, yo);
          }
          for(var si = bSteps; si >= 0; si--){
            var yi = burnTop + (si / bSteps) * (burnBot - burnTop);
            vertex((Math.sqrt(Math.max(0, R * R - yi * yi)) - burnW) * side, yi);
          }
        endShape(CLOSE);
      }
    pop();
    this._drawMustache(headBody, toWorld);
  }

  update(){
    var tFrac = this.transFrac;
    var rFrac = 1 - tFrac;
    var I = Math.max(1, (this.torsoW / 2) * (this.torsoW / 2) + (this.torsoH / 2) * (this.torsoH / 2));
    var STEP_CAP = 30;
    for(var iter = 0; iter < this.iters; iter++){
      var sumCX = 0, sumCY = 0, sumAng = 0, active = 0;
      for(var i = 0; i < this.limbs.length; i++){
        var lim = this.limbs[i];
        var a   = this.limbAnchor(lim);
        var tg  = this.limbTarget(lim);
        var dx  = tg.x - a.x;
        var dy  = tg.y - a.y;
        var d   = Math.sqrt(dx*dx + dy*dy);
        if(d < 0.001) continue;

        var threshold;
        if(i === this.limbDrag){
          threshold = this.dragTargetDist;
        } else {
          threshold = (lim.L1 + lim.L2) * this.stretchFactor;
        }
        if(d <= threshold) continue;

        var excess = d - threshold;
        if(excess > STEP_CAP) excess = STEP_CAP;
        var corrX  = (dx / d) * excess;
        var corrY  = (dy / d) * excess;

        sumCX += corrX;
        sumCY += corrY;

        var rx = a.x - this.torsoCx;
        var ry = a.y - this.torsoCy;
        sumAng += (rx * corrY - ry * corrX) / I;
        active++;
      }

      if(active > 0){
        this.torsoCx    += (sumCX  / active) * tFrac;
        this.torsoCy    += (sumCY  / active) * tFrac;
        this.torsoAngle += (sumAng / active) * rFrac;
      }

      var cSumX = 0, cSumY = 0, cSumAng = 0, cActive = 0;
      var accumContain = (px, py) => {
        var corrX = 0, corrY = 0;
        if(px < this.left)        corrX = this.left   - px;
        else if(px > this.right)  corrX = this.right  - px;
        if(py < this.top)         corrY = this.top    - py;
        else if(py > this.bottom) corrY = this.bottom - py;
        if(corrX === 0 && corrY === 0) return;
        cSumX += corrX;
        cSumY += corrY;
        var rx = px - this.torsoCx;
        var ry = py - this.torsoCy;
        cSumAng += (rx * corrY - ry * corrX) / I;
        cActive++;
      };

      var tb = this.torsoBounds();
      accumContain(tb.tl.x, tb.tl.y);
      accumContain(tb.tr.x, tb.tr.y);
      accumContain(tb.bl.x, tb.bl.y);
      accumContain(tb.br.x, tb.br.y);

      var hp = tb.head;
      accumContain(hp.x - this.headR, hp.y);
      accumContain(hp.x + this.headR, hp.y);
      accumContain(hp.x, hp.y - this.headR);
      accumContain(hp.x, hp.y + this.headR);

      for(var j = 0; j < this.limbs.length; j++){
        var lim2 = this.limbs[j];
        var a2   = this.limbAnchor(lim2);
        var tg2  = this.limbTarget(lim2);
        var k2   = this.solveIK(a2.x, a2.y, tg2.x, tg2.y, lim2.L1, lim2.L2, lim2.bend);
        accumContain(k2.jx, k2.jy);
      }

      if(cActive > 0){
        this.torsoCx    += (cSumX   / cActive) * tFrac;
        this.torsoCy    += (cSumY   / cActive) * tFrac;
        this.torsoAngle += (cSumAng / cActive) * rFrac;
      }
    }
  }

  _dbg(){ return typeof debugStroke !== 'undefined' && debugStroke; }

  _paint(p){
    if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); return; }
    if(p.fill == null) noFill(); else fill(p.fill);
    if(p.stroke == null) noStroke(); else { stroke(p.stroke); strokeWeight(p.weight); }
  }

  displayBox(){
    var checker = (typeof checkerMode !== 'undefined' && checkerMode && this.gridDark && !this._dbg());
    push();
      if(checker){
        fill(bodyCol);
        if(this.pieces.box.stroke != null && this.pieces.box.weight > 0){
          stroke(this.pieces.box.stroke); strokeWeight(this.pieces.box.weight);
        } else {
          noStroke();
        }
      } else {
        this._paint(this.pieces.box);
      }
      rectMode(CORNERS);
      rect(this.left, this.top, this.right, this.bottom);
    pop();
  }

  display(){

    var twerkOffset = 0;
    if(typeof twerkMode !== 'undefined' && twerkMode){
      twerkOffset = Math.sin(frameCount * 0.22 + this.twerkPhase) * this.headR * 0.55;
      this.torsoCy += twerkOffset;
    }
    push();
      var hw    = this.torsoW / 2;
      var hh    = this.torsoH / 2;
      var hq    = this.torsoH / 4;
      var armHw = Math.max(0, hw - this.armInset);
      var legHw = Math.max(0, hw - this.legInset);
      var shTy  = -hh + this.armAnchorDrop;
      var hipLy =  hh - this.legAnchorRise;
      var rArm  = this.armShirtStrokeWeight / 2;
      var rLeg  = this.legStrokeWeight / 2;

      var neck = { x: 0,  y: -hh };
      var hipR = { x: hw,  y: hq };
      var hipL = { x: -hw, y: hq };
      var srTop = { x:  armHw,        y: shTy - rArm }, srOut = { x:  armHw + rArm, y: shTy };
      var slTop = { x: -armHw,        y: shTy - rArm }, slOut = { x: -armHw - rArm, y: shTy };
      var rHip  = rLeg * 1.3;
      var trOut = { x:  legHw + rHip, y: hipLy },        trBot = { x:  legHw,        y: hipLy + rHip };
      var tlOut = { x: -legHw - rHip, y: hipLy },        tlBot = { x: -legHw,        y: hipLy + rHip };

      var waistR = { x:  hw, y: this.torsoH / 6 };
      var waistL = { x: -hw, y: this.torsoH / 6 };
      var shirtPts = [ neck, srTop, srOut, waistR, waistL, slOut, slTop ];
      var pantPts  = [ waistL, waistR, hipR, trOut, trBot, tlBot, tlOut, hipL ];
      var headBody = { x: 0, y: -hh - this.neckGap - this.headR };

      var cphi = Math.cos(this.torsoAngle), sphi = Math.sin(this.torsoAngle);
      var cx = this.torsoCx, cy = this.torsoCy;
      var toWorld = (p) => ({ x: cx + p.x * cphi - p.y * sphi, y: cy + p.x * sphi + p.y * cphi });
      var shirtRing = shirtPts.map(toWorld);
      var pantRing  = pantPts.map(toWorld);
      var headW     = toWorld(headBody);

      var glassesOn = this.glasses;
      var eyeOff    = this.headR * (glassesOn ? 0.42 : 0.35);
      var eyeR      = this.headR * 0.12;
      var eyeLW     = toWorld({ x: -eyeOff, y: headBody.y });
      var eyeRW     = toWorld({ x:  eyeOff, y: headBody.y });

      var sleeves = [], shoulderDiscs = [];
      var hipDiscs = [];
      var overlapSleeve = null;
      var overlapSleeveCuff = null, backSleeveCuff = null;
      var overlapLeg = null;
      var overlapLegLower = null;
      var overlapFoot = null;
      var backLeg = null, backFoot = null;
      var backLegLower = null;
      var backCuff = null, overlapCuff = null;
      var bFore = null, bHand = null;
      var fForearms = [], fHands = [];
      var dbgLegs = [];
      for(var i = 0; i < this.limbs.length; i++){
        var lim   = this.limbs[i];
        var a     = this.limbAnchor(lim);
        var tg    = this.limbTarget(lim);
        var isLeg = (lim.anchor === 'bl' || lim.anchor === 'br');
        if(isLeg){
          var n      = this.edgeNormal(lim.edge);
          var inset  = this.legStrokeWeight / 2;
          var ankX   = tg.x + inset * n.x;
          var ankY   = tg.y + inset * n.y;
          var k0     = this.solveIK(a.x, a.y, ankX, ankY, lim.L1, lim.L2, lim.bend);
          var shoeV  = this._shoeVertices(tg.x, tg.y, lim.edge, k0.jx, k0.jy, a.x, a.y);

          var h1x = a.x  + 1.5 * (k0.jx - a.x),    h1y = a.y  + 1.5 * (k0.jy - a.y);
          var h2x = k0.ex + 1.5 * (k0.jx - k0.ex), h2y = k0.ey + 1.5 * (k0.jy - k0.ey);
          var outOfBox = (px, py) => (px < this.left || px > this.right ||
                                      py < this.top  || py > this.bottom);
          var awkward = outOfBox(k0.jx, k0.jy) || outOfBox(h1x, h1y) || outOfBox(h2x, h2y);

          var backAttach = this.shorts ? shoeV.heelTop : shoeV.backMid;
          var useAwkward = this.shorts ? false         : awkward;
          var lp = this._legPaths(a.x, a.y, ankX, ankY, lim.L1, lim.L2, lim.bend,
                                  shoeV.topHalf, backAttach, useAwkward, this.shorts);
          hipDiscs.push(this._circlePath(a.x, a.y, rLeg * 1.3));
          var footData = { tg: tg, edge: lim.edge, jx: lp.k.jx, jy: lp.k.jy, ax: a.x, ay: a.y };
          var legUpper = this.shorts ? lp.upper : lp.leg;
          var legLower = this.shorts ? lp.lower : null;
          if(this.shorts) footData.poly = shoeV.poly;
          var legCuffOn = this.shorts && this.legCuff;
          if(lim.anchor === 'br'){ overlapLeg = legUpper; overlapLegLower = legLower; overlapFoot = footData; overlapCuff = legCuffOn ? lp.cuff : null; }
          else                   { backLeg    = legUpper; backLegLower    = legLower; backFoot    = footData; backCuff    = legCuffOn ? lp.cuff : null; }
          if(this._dbg()){
            dbgLegs.push({ ax: lp.ax, ay: lp.ay, h1: lp.h1, h2: lp.h2, ex: lp.k.ex, ey: lp.k.ey });
          }
        } else {
          var ap    = this._armPaths(a.x, a.y, tg.x, tg.y, lim.L1, lim.L2, lim.bend, this.longSleeve);
          var handR = this.armStrokeWeight * 0.8;
          var hand  = [];
          var HN    = 24;
          for(var hi = 0; hi < HN; hi++){
            var hAng = hi / HN * Math.PI * 2;
            hand.push({ x: tg.x + Math.cos(hAng) * handR, y: tg.y + Math.sin(hAng) * handR });
          }
          sleeves.push(ap.sleeve);
          shoulderDiscs.push(this._circlePath(a.x, a.y, rArm));
          var sc = (this.sleeveCuff && !this.longSleeve) ? ap.cuff : null;
          if(i === this.overArmIdx){ overlapSleeve = ap.sleeve; overlapSleeveCuff = sc; fForearms.push(ap.fore); fHands.push(hand); }
          else                     { bFore = ap.fore; bHand = hand; backSleeveCuff = sc; }
        }
      }

      if(this.hair === 'longhair'){
        var lhCapR   = this.headR + 3;
        var lhChordN = -0.2 * this.headR / lhCapR;
        var lhEdgeN  = Math.sqrt(1 - lhChordN * lhChordN);
        var lhTopY   = lhChordN * lhCapR;
        var lhLen    = (this.headR * 1.2 - lhTopY) * 3;
        var lhBoxCy  = lhTopY + lhLen / 2;
        var lhBoxW   = 2 * lhEdgeN * lhCapR;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rectMode(CENTER);
          rect(0, lhBoxCy, lhBoxW, lhLen);
        pop();
      }

      if(backFoot && !backFoot.poly){
        var bfoot = backFoot;
        this.drawFoot(bfoot.tg.x, bfoot.tg.y, bfoot.edge, bfoot.jx, bfoot.jy, bfoot.ax, bfoot.ay);
      }

      if(backLegLower){
        var backLowerParts = [backLegLower];
        if(backFoot && backFoot.poly) backLowerParts.push(backFoot.poly);
        this._drawPiece(this.pieces.body, backLowerParts);
      }

      this._drawPiece(this.pieces.pants, [pantRing, backLeg].concat(hipDiscs));
      if(backCuff) this._drawPiece(this.pieces.pants, [backCuff]);

      this._drawPiece(this.pieces.body, [bFore, bHand]);

      var shirtParts = [shirtRing].concat(sleeves, shoulderDiscs);
      if(this.hair === 'balaclava' || this.hair === 'hoodie'){
        shirtParts.push(this._balaclavaPath(this.headR + this.neckGap + this.torsoH * 0.35, headW));
      }
      this._drawPiece(this.pieces.shirt, shirtParts);
      if(backSleeveCuff) this._drawPiece(this.pieces.shirt, [backSleeveCuff]);
      if(this.placket){
        this._drawSeg({ a: toWorld({ x: 0, y: -hh }), b: toWorld({ x: 0, y: this.torsoH / 6 }) },
                      this.pieces.shirt.stroke, 1.5 * this.strokeScale);
      }
      if(this.zipper){
        var zWaistY = this.torsoH / 6;
        var zTopY   = zWaistY + this.torsoH * 0.025;
        var zBotY   = zWaistY + 0.65 * (hipLy - zWaistY);
        this._drawSeg({ a: toWorld({ x: 0, y: zTopY }), b: toWorld({ x: 0, y: zBotY }) },
                      this.pieces.pants.stroke, 1.5 * this.strokeScale);
      }

      if(this.hair === 'curly'){
        var curR = this.headR * 0.4;
        var backSpots = [
          { x: -0.9, y: -0.35 },
          { x:  0.9, y: -0.35 },
          { x: -0.7, y: -1.10 },
          { x:  0.7, y: -1.10 },
        ];
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          for(var bi = 0; bi < backSpots.length; bi++){
            var s = backSpots[bi], o = this.curlyOffsets[bi];
            circle(this.headR * (s.x + o.dx),
                   this.headR * (s.y + o.dy),
                   (curR + this.headR * o.dr) * 2);
          }
        pop();
      } else if(this.hair === 'hood'){
        var hdCapR   = this.headR + 3;
        var hdChordN = -0.2 * this.headR / hdCapR;
        var hdEdgeN  = Math.sqrt(1 - hdChordN * hdChordN);
        var hdBoxTopY = hdChordN * hdCapR;
        var hdBoxBotY = this.headR * 1.2;
        var hdBoxH    = hdBoxBotY - hdBoxTopY;
        var hdBoxCy   = (hdBoxTopY + hdBoxBotY) * 0.5;
        var hdBoxW    = 2 * hdEdgeN * hdCapR;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rectMode(CENTER);
          rect(0, hdBoxCy, hdBoxW, hdBoxH);
        pop();
      } else if(this.hair === 'bald'){
        var sidePuffW = this.headR * 0.6;
        var sidePuffH = this.headR * 1.30;
        var sidePuffX = this.headR * 0.85;
        var sidePuffY = -this.headR * 0.10;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          for(var sp = -1; sp <= 1; sp += 2){
            ellipse(sp * sidePuffX, sidePuffY, sidePuffW, sidePuffH);
          }
        pop();
      }

      if(this.hair !== 'balaclava' && this.hair !== 'hoodie'){
        push();
          this._paint(this.pieces.head);
          circle(headW.x, headW.y, this.headR * 2);
        pop();

        push();
          this._paint(this.pieces.eye);
          circle(eyeLW.x, eyeLW.y, eyeR * 2);
          circle(eyeRW.x, eyeRW.y, eyeR * 2);
        pop();

        if(this.sideburns && this.hair !== 'none' && this.hair !== 'mohawk'){
          this._drawSideburns(headW);
        }
      }

      if(this.hair !== 'balaclava' && this.hair !== 'hoodie'){
        if(this.beard)                this._drawBeard(headW, headBody, toWorld);
        if(this.noseShape !== 'none') this._drawNose(headBody, toWorld);
        if(this.mustache && !this.beard && this.hair !== 'hood') this._drawMustache(headBody, toWorld);
      }

      if(this.glasses && this.hair !== 'balaclava' && this.hair !== 'hoodie'){
        this._drawGlasses(headW, eyeOff);
      }

      if(this.hair === 'cap'){
        var capR   = this.headR + 3;
        var chordN = -0.2 * this.headR / capR;
        var edgeN  = Math.sqrt(1 - chordN * chordN);
        var theta  = Math.atan2(-chordN, edgeN);
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          arc(0, 0, capR * 2, capR * 2, PI + theta, TWO_PI - theta, CHORD);
        pop();
      } else if(this.hair === 'rect'){
        var rHairW  = 2 * this.headR;
        var rHairH  = 0.8 * this.headR + 3;
        var rHairCy = -(0.6 * this.headR + 1.5);
        var rHairR  = this.headR * 0.2;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          rectMode(CENTER);
          rect(0, rHairCy, rHairW, rHairH, rHairR, rHairR, 0, 0);
        pop();
      } else if(this.hair === 'hat'){
        var hCapR   = this.headR;
        var hChordN = -0.2;
        var hEdgeN  = Math.sqrt(1 - hChordN * hChordN);
        var hTheta  = Math.atan2(-hChordN, hEdgeN);
        var hatFill   = this.hatCol;
        var hatStroke = bodyCol;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(hatFill); stroke(hatStroke); strokeWeight(1.5 * this.strokeScale); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          arc(0, 0, hCapR * 2, hCapR * 2, PI + hTheta, TWO_PI - hTheta, CHORD);
          var brimY      = -0.2 * this.headR;
          var brimStartX = hEdgeN * hCapR * this.hatBrimDir;
          var brimEndX   = brimStartX + this.headR * 0.9 * this.hatBrimDir;
          line(brimStartX, brimY, brimEndX, brimY);
        pop();
      } else if(this.hair === 'hood' || this.hair === 'longhair'){
        var hdCapR   = this.headR + 3;
        var hdChordN = -0.2 * this.headR / hdCapR;
        var hdEdgeN  = Math.sqrt(1 - hdChordN * hdChordN);
        var hdTheta  = Math.atan2(-hdChordN, hdEdgeN);
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          arc(0, 0, hdCapR * 2, hdCapR * 2, PI + hdTheta, TWO_PI - hdTheta, CHORD);
        pop();
      } else if(this.hair === 'bun'){
        var bunR = this.headR * 0.4;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          circle(0, -this.headR - bunR * 0.5, bunR * 2);
        pop();
      } else if(this.hair === 'mohawk'){
        var moW = this.headR * 0.38;
        var moH = this.headR * 0.95;
        var moCy = -this.headR - moH * 0.5;
        var moR = moW * 0.5;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          rectMode(CENTER);
          rect(0, moCy, moW, moH, moR, moR, 0, 0);
        pop();
      } else if(this.hair === 'curly'){
        var curFR = this.headR * 0.4;
        var frontSpots = [
          { x: -0.6, y: -0.70 },
          { x: -0.3, y: -0.95 },
          { x:  0.0, y: -1.10 },
          { x:  0.3, y: -0.95 },
          { x:  0.6, y: -0.70 },
        ];
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          for(var fi = 0; fi < frontSpots.length; fi++){
            var fs = frontSpots[fi], fo = this.curlyOffsets[4 + fi];
            circle(this.headR * (fs.x + fo.dx),
                   this.headR * (fs.y + fo.dy),
                   (curFR + this.headR * fo.dr) * 2);
          }
        pop();
      } else if(this.hair === 'baseball'){
        var bCapR   = this.headR + 3;
        var bChordN = -0.2 * this.headR / bCapR;
        var bEdgeN  = Math.sqrt(1 - bChordN * bChordN);
        var bTheta  = Math.atan2(-bChordN, bEdgeN);
        var bBrimW  = this.headR * 1.9;
        var bBrimH  = this.headR * 0.14;
        var bBrimCy = -this.headR * 0.13;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          arc(0, 0, bCapR * 2, bCapR * 2, PI + bTheta, TWO_PI - bTheta, CHORD);
          rectMode(CENTER);
          rect(0, bBrimCy, bBrimW, bBrimH);
        pop();
      } else if(this.hair === 'swoop'){
        var swCapR   = this.headR + 3;
        var swChordN = -0.2 * this.headR / swCapR;
        var swEdgeN  = Math.sqrt(1 - swChordN * swChordN);
        var swTheta  = Math.atan2(-swChordN, swEdgeN);
        var swXEdge  = swEdgeN * swCapR;
        var swChordY = swChordN * swCapR;
        var swAmp    = this.headR * 0.45;
        var swDir    = this.swoopDir;
        var swP0 = { x:  swXEdge,        y: swChordY };
        var swP1 = { x:  swXEdge * 0.15, y: swChordY + this.headR * 0.06 };
        var swP2 = { x: -swXEdge * 0.65, y: swChordY + swAmp };
        var swP3 = { x: -swXEdge,        y: swChordY };
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          beginShape();
            var swArcSteps = 20;
            var swStartA   = PI + swTheta;
            var swEndA     = TWO_PI - swTheta;
            for(var swi = 0; swi <= swArcSteps; swi++){
              var swA = swStartA + (swi / swArcSteps) * (swEndA - swStartA);
              vertex(swDir * swCapR * Math.cos(swA), swCapR * Math.sin(swA));
            }
            var swBs = 16;
            for(var swj = 1; swj <= swBs; swj++){
              var swt = swj / swBs, swu = 1 - swt;
              var swbx = swu*swu*swu*swP0.x + 3*swu*swu*swt*swP1.x + 3*swu*swt*swt*swP2.x + swt*swt*swt*swP3.x;
              var swby = swu*swu*swu*swP0.y + 3*swu*swu*swt*swP1.y + 3*swu*swt*swt*swP2.y + swt*swt*swt*swP3.y;
              vertex(swDir * swbx, swby);
            }
          endShape(CLOSE);
        pop();
      } else if(this.hair === 'sidebun'){
        var sbW = this.headR * 1.0;
        var sbH = this.headR * 0.9;
        var sbX = this.sidebunDir * this.headR * 0.55;
        var sbY = -this.headR - sbH * 0.25;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          ellipse(sbX, sbY, sbW, sbH);
        pop();
      } else if(this.hair === 'balaclava'){
        push();
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(shirtCol); stroke(bodyCol); strokeWeight(1.5 * this.strokeScale); }
          ellipse(0, 0, this.headR * 1.6, this.headR * 1.24);
          if(!this._dbg()){ fill(bodyCol); noStroke(); }
          circle(-eyeOff, 0, eyeR * 2);
          circle( eyeOff, 0, eyeR * 2);
        pop();
        if(this.noseShape !== 'none') this._drawNose(headBody, toWorld);
        if(this.mustache)             this._drawMustache(headBody, toWorld);
        if(this.glasses)              this._drawGlasses(headW, eyeOff);
      } else if(this.hair === 'hoodie'){
        push();
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(shirtCol); stroke(bodyCol); strokeWeight(1.5 * this.strokeScale); }
          ellipse(0, this.headR * 0.15, this.headR * 1.5, this.headR * 1.95);
          if(!this._dbg()){ fill(bodyCol); noStroke(); }
          circle(-eyeOff, 0, eyeR * 2);
          circle( eyeOff, 0, eyeR * 2);
        pop();
        if(this.noseShape !== 'none') this._drawNose(headBody, toWorld);
        if(this.mustache)             this._drawMustache(headBody, toWorld);
        if(this.glasses)              this._drawGlasses(headW, eyeOff);
      } else if(this.hair === 'topbun'){
        var tbCapR   = this.headR;
        var tbChordN = -0.2;
        var tbEdgeN  = Math.sqrt(1 - tbChordN * tbChordN);
        var tbTheta  = Math.atan2(-tbChordN, tbEdgeN);
        var tbBunW   = this.headR * 0.85;
        var tbBunH   = this.headR * 0.65;
        var tbBunCy  = -this.headR - tbBunH * 0.35;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          arc(0, 0, tbCapR * 2, tbCapR * 2, PI + tbTheta, TWO_PI - tbTheta, CHORD);
          ellipse(0, tbBunCy, tbBunW, tbBunH);
        pop();
      } else if(this.hair === 'beanie'){
        var beCapR   = this.headR + 3;
        var beChordY = -0.22 * this.headR;
        var beChordN = beChordY / beCapR;
        var beEdgeN  = Math.sqrt(1 - beChordN * beChordN);
        var beTheta  = Math.atan2(-beChordN, beEdgeN);
        var beBrimW  = 2 * beEdgeN * beCapR;
        var beBrimH   = this.headR * 0.34;
        var beBrimBot = -0.14 * this.headR;
        var beBrimCy  = beBrimBot - beBrimH / 2;
        var beStroke = (red(this.beanieCol) + green(this.beanieCol) + blue(this.beanieCol) === 0)
                       ? shirtCol : bodyCol;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(this.beanieCol); stroke(beStroke); strokeWeight(1.5 * this.strokeScale); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          arc(0, 0, beCapR * 2, beCapR * 2, PI + beTheta, TWO_PI - beTheta, CHORD);
          rectMode(CENTER);
          rect(0, beBrimCy, beBrimW, beBrimH);
        pop();
      } else if(this.hair === 'bowldot'){
        var bdCapR   = this.headR;
        var bdChordN = -0.2 * this.headR / bdCapR;
        var bdEdgeN  = Math.sqrt(1 - bdChordN * bdChordN);
        var bdTheta  = Math.atan2(-bdChordN, bdEdgeN);
        var bdDotR   = this.headR * 0.13;
        push();
          if(this._dbg()){ noFill(); stroke(bodyCol); strokeWeight(1); }
          else            { fill(bodyCol); noStroke(); }
          translate(headW.x, headW.y);
          rotate(this.torsoAngle);
          arc(0, 0, bdCapR * 2, bdCapR * 2, PI + bdTheta, TWO_PI - bdTheta, CHORD);
          var bdArcDots = 13;
          var bdStartA  = PI + bdTheta;
          var bdEndA    = TWO_PI - bdTheta;
          for(var bd = 0; bd <= bdArcDots; bd++){
            var bdA = bdStartA + (bd / bdArcDots) * (bdEndA - bdStartA);
            circle(bdCapR * Math.cos(bdA), bdCapR * Math.sin(bdA), bdDotR * 2);
          }
          var bdX = bdEdgeN * bdCapR;
          var bdY = bdChordN * bdCapR;
          var bdChordDots = 9;
          for(var bc = 1; bc < bdChordDots; bc++){
            circle(bdX - (bc / bdChordDots) * (2 * bdX), bdY, bdDotR * 2);
          }
        pop();
      }

      var overBodyParts = fForearms.concat(fHands);
      if(overlapLegLower)                    overBodyParts.push(overlapLegLower);
      if(overlapFoot && overlapFoot.poly)    overBodyParts.push(overlapFoot.poly);
      this._drawPiece(this.pieces.body, overBodyParts);
      this._drawOpenPiece(overlapSleeve, this.pieces.shirt);
      if(overlapSleeveCuff) this._drawPiece(this.pieces.shirt, [overlapSleeveCuff]);

      if(overlapFoot && !overlapFoot.poly){
        var of = overlapFoot;
        this.drawFoot(of.tg.x, of.tg.y, of.edge, of.jx, of.jy, of.ax, of.ay);
      }
      this._drawOpenPiece(overlapLeg, this.pieces.pants);
      if(overlapCuff) this._drawPiece(this.pieces.pants, [overlapCuff]);

      if(this._dbg()){
        push(); noStroke(); fill(bodyCol);
        for(var dv = 0; dv < shirtRing.length; dv++) circle(shirtRing[dv].x, shirtRing[dv].y, 5);
        pop();

        push();
          noFill();
          stroke(30, 120, 255);
          strokeWeight(1);
          for(var d = 0; d < dbgLegs.length; d++){
            var dl = dbgLegs[d];
            bezier(dl.ax, dl.ay, dl.h1.x, dl.h1.y, dl.h2.x, dl.h2.y, dl.ex, dl.ey);
            line(dl.ax, dl.ay, dl.h1.x, dl.h1.y);
            line(dl.ex, dl.ey, dl.h2.x, dl.h2.y);
          }
          noStroke();
          fill(30, 120, 255);
          for(var d = 0; d < dbgLegs.length; d++){
            var dl = dbgLegs[d];
            circle(dl.h1.x, dl.h1.y, 6);
            circle(dl.h2.x, dl.h2.y, 6);
          }
        pop();
      }
    pop();
    if(twerkOffset !== 0) this.torsoCy -= twerkOffset;
  }
}
