/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class Spoke {
  constructor(p0, p1, ang, index){
    this.p0 = p0;
    this.p1 = p1;
    this.ang = ang;
    this.index = index;

    this.a0 = createVector(this.p0.x, this.p0.y);
    this.a1 = createVector(this.p1.x, this.p1.y);

    this.scrubOffset0 = 0;
    this.scrubOffset1 = 0;

    // DELAY
    // RANDOM MIN, MAX
    this.ranMin, this.ranMax;
    this.reDistance();

    // STROKE
    this.sw;
    this.reStroke();

    // COLOR
    this.aColor, this.targetColor,this.startColor
    this.reColor();
    
    this.ticker0, this.ticker1;
    this.t0, this.t1;
    this.reset();
  }


  run(){
    this.update();
    this.display();
  }

  update(){
    var frontTicker, backTicker;
    if(scrubOn){
      frontTicker = scrubVal + this.scrubOffset0;
      backTicker = scrubVal + this.scrubOffset1;
    } else {
      frontTicker = this.ticker0;
      backTicker = this.ticker1;
    }

    if(frontTicker< anim0){
      this.a0 = this.p0;
      this.aColor = this.startColor;

    } else if(frontTicker < anim1){
      var tk0 = map(frontTicker, anim0, anim1, 0, 1);

      this.a0 = p5.Vector.lerp(this.p0, this.t0, stageAaccel(tk0));
      this.aColor = lerpColor(this.startColor, this.targetColor, stageAaccel(tk0));
    } else if(frontTicker < anim2){
      var tk0 = map(frontTicker, anim1, anim2, 0, 1);

      this.a0 = p5.Vector.lerp(this.t0, this.p0, stageBaccel(tk0));
      this.aColor = lerpColor(this.targetColor, this.startColor, stageBaccel(tk0));

    } else {
      this.a0 = this.p0;
      this.aColor = this.startColor;
    }
    
    if(backTicker < anim0){
      this.a1 = this.p1;

    } else if(backTicker < anim1){
      var tk0 = map(backTicker, anim0, anim1, 0, 1);

      this.a1 = p5.Vector.lerp(this.p1, this.t1, stageAaccel(tk0));

    } else if(backTicker < anim2){
      var tk0 = map(backTicker, anim1, anim2, 0, 1);

      this.a1 = p5.Vector.lerp(this.t1, this.p1, stageBaccel(tk0));

    } else {
      this.a1 = this.p1;
    }

    // this.a0.x = constrain(this.a0.x, c.x, 10000);
    // this.a0.y = constrain(this.a0.y, c.y, 10000);

    if(!scrubOn){
      this.ticker0 ++;
      this.ticker1 ++;
    }
  }

  display(){
    noFill();
    stroke(this.aColor);
    strokeWeight(this.sw);
    line(this.a0.x, this.a0.y, this.a1.x, this.a1.y);
  }

  reset(){
    this.ticker0 = map(dist(c.x, c.y, this.p0.x, this.p0.y), 0, radMax, 0, delayMax);
    this.ticker1 = map(dist(c.x, c.y, this.p1.x, this.p1.y), 0, radMax, 0, delayMax);

    this.scrubOffset0 = map(dist(c.x, c.y, this.p0.x, this.p0.y), 0, radMax, 0, delayMax);
    this.scrubOffset1 = map(dist(c.x, c.y, this.p1.x, this.p1.y), 0, radMax, 0, delayMax);

    var ranDist = random(this.ranMin, this.ranMax);
    this.t0 = createVector(this.p0.x + cos(this.ang) * ranDist, this.p0.y + sin(this.ang) * ranDist);
    this.t1 = createVector(this.p1.x + cos(this.ang) * ranDist, this.p1.y + sin(this.ang) * ranDist);

    if(this.ang < PI/2){
      this.t0.x = constrain(this.t0.x, c.x, this.p0.x + cos(this.ang) * 10000);
      this.t0.y = constrain(this.t0.y, c.y, this.p0.y + sin(this.ang) * 10000);
  
      this.t1.x = constrain(this.t1.x, c.x, this.p1.x + cos(this.ang) * 10000);
      this.t1.y = constrain(this.t1.y, c.y, this.p1.y + sin(this.ang) * 10000);
    } else if(this.ang < PI){
      this.t0.x = constrain(this.t0.x, this.p0.x + cos(this.ang) * 10000, c.x);
      this.t0.y = constrain(this.t0.y, c.y, this.p0.y + sin(this.ang) * 10000);
  
      this.t1.x = constrain(this.t1.x, this.p1.x + cos(this.ang) * 10000, c.x);
      this.t1.y = constrain(this.t1.y, c.y, this.p1.y + sin(this.ang) * 10000);
    } else if(this.ang < PI * 3/2){
      this.t0.x = constrain(this.t0.x, this.p0.x + cos(this.ang) * 10000, c.x);
      this.t0.y = constrain(this.t0.y, this.p0.y + sin(this.ang) * 10000, c.y);
  
      this.t1.x = constrain(this.t1.x, this.p1.x + cos(this.ang) * 10000, c.x);
      this.t1.y = constrain(this.t1.y, this.p1.y + sin(this.ang) * 10000, c.y);
    } else {
      this.t0.x = constrain(this.t0.x, c.x, this.p0.x + cos(this.ang) * 10000);
      this.t0.y = constrain(this.t0.y, this.p0.y + sin(this.ang) * 10000, c.y);
  
      this.t1.x = constrain(this.t1.x, c.x, this.p1.x + cos(this.ang) * 10000);
      this.t1.y = constrain(this.t1.y, this.p1.y + sin(this.ang) * 10000, c.y);
    } 
  }

  resetFull(){
    this.reDistance();
    this.reStroke();
    this.reColor();
  }

  reStroke(){
    this.sw = baseSW;
    if(taperOn){
      var avgX = (this.p0.x + this.p1.x)/2;
      var avgY = (this.p0.y + this.p1.y)/2;
      var tk1 = map(dist(avgX, avgY, c.x, c.y), 0, radMax, 0, 1);
      this.sw = map(easeInSine(tk1), 0, 1, minSW, maxSW);

      if(tk1 > 1){
        this.sw = maxSW;
      }
    }

    this.sw *= width/1400;

    this.reset();
  }

  reDistance(){
    // var dist0 = dist(this.p0.x, 0, c.x, 0);
    // var dist1 = dist(this.p1.x, 0, c.x, 0);
    
    // var dist0 = dist(this.p0.y, 0, c.y, 0);
    // var dist1 = dist(this.p1.y, 0, c.y, 0);

    var dist0 = dist(this.p0.x, this.p0.y, c.x, c.y);
    var dist1 = dist(this.p1.x, this.p1.y, c.x, c.y);

    var distAve = (dist0 + dist1)/2;
    var tk0 = map(distAve, 0, radMax, 0, PI);
    this.ranMin = map(cos(tk0), 1, -1, minFlux, maxFlux);
    this.ranMax = this.ranMin * randomFlux;

    // print("ranMin made: " + this.ranMin)

    this.reset();
  }

  reColor(){
    this.aColor = foreColor;
    this.startColor = foreColor;
    // this.startColor = this.targetColor;
    if(colorType == 0){
      this.targetColor = foreColor;
    } else if(colorType == 1){
      this.targetColor = colorSet[int(random(3))];
    } else if(colorType == 2){
      this.targetColor = colorSet[int(random(5))];
    }
  }
}