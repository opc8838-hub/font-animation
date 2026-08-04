/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class Shutters2 {
  constructor(ramp_, inp_){
    this.inp = inp_;

    this.pgTextSize = 2;
    this.findTextSize();
    
    this.xSpots = [];
    this.findXpos();

    this.pg = [];
    this.makeTextures();

    this.ticker = 0;

    this.xAnim = [];

    this.shutterAnim = [];

    this.ramp = ramp_;

    this.pacer = (sceneLength/3)/this.inp.length;
  }

  update(){
    this.ticker ++;

    for(var n = 0; n < this.inp.length; n++){
      var tk00 = constrain(this.ticker - this.pacer*n, 0, sceneLength);
      var tk0 = map(tk00, 0, sceneLength, 0, 1.0);
      
      var tk1;
      var a0, b0;
      var a1, b1;
      if(accelMode == 0){
        if(this.ramp==0){
          tk1 = easeOutQuad(tk0);
        } else if(this.ramp==1){
          tk1 = easeInOutQuad(tk0);
        }
        a0 = 0;
        b0 = this.pg[n].width;
        a1 = width/2;
        b1 = this.xSpots[n];
      } else {
        if(tk0 < 0.5){
          var tk0b = map(tk0, 0, 0.5, 0, 1);
          tk1 = easeOutCirc(tk0b);
          a0 = 0;
          b0 = this.pg[n].width;
          a1 = width/2;
          b1 = this.xSpots[n];
        } else {
          var tk0b = map(tk0, 0.5, 1, 0, 1);
          tk1 = easeInCirc(tk0b);
          a0 = this.pg[n].width;
          b0 = 0;
          a1 = this.xSpots[n];
          b1 = this.xSpots[n];
        }
      }

      this.shutterAnim[n] = map(tk1, 0, 1, a0, b0);
      this.xAnim[n] = map(tk1, 0, 1, a1, b1); 
    }
  }

  display(){
    background(bkgdColor);
    push();
      translate(0, height/2);
      translate(0, -this.pg[0].height/2);

      textSize(this.pgTextSize);
      textAlign(LEFT);

      fill(foreColor);
      noStroke();

      for(var n = 0; n < this.inp.length; n++){
        push();
          translate(this.xAnim[n], 0);

          texture(this.pg[n]);
          stroke(0, 0, 255);

          var uLeft = 0;
          var uRight = map(this.pg[n].width - this.shutterAnim[n], 0, this.pg[n].width, 1, 0);
          // var uRight =1;

          beginShape(TRIANGLE_STRIP);
            vertex(0, 0, uLeft, 0);
            vertex(0, this.pg[n].height, uLeft, 1);
            vertex(this.shutterAnim[n], 0, uRight, 0);
            vertex(this.shutterAnim[n], this.pg[n].height, uRight, 1);
          endShape();
        pop();
      }
    pop();
  }

  findXpos(){
    textFont(currentFont);
    textSize(this.pgTextSize);
    var fullSize = textWidth(this.inp);
    var xStart = width/2 - fullSize/2;

    for(var n = 0; n < this.inp.length; n++){
      var thisLetterWidth = textWidth(this.inp.charAt(n));
      var upUntilWidth = textWidth(this.inp.slice(0,n+1));
      var difference = upUntilWidth - thisLetterWidth;
      this.xSpots[n] = xStart + difference;
    }
  }

  findTextSize(){
    var measured = 0;
    while(measured < width){
      textSize(this.pgTextSize)
      textFont(currentFont);
      measured = textWidth(this.inp);

      this.pgTextSize += 2;
    }

    if(this.pgTextSize * thisFontAdjust > height * 7/8){
      this.pgTextSize = (height * 7/8)/thisFontAdjust;
    }
  }

  makeTextures(){
    textSize(this.pgTextSize);
    textFont(currentFont);

    for(var n = 0; n < this.inp.length; n++){
      var repeatSize = round(textWidth(this.inp.charAt(n)));
    
      this.pg[n] = createGraphics(repeatSize, this.pgTextSize * (thisFontAdjust + 0.05));
      this.pg[n].background(bkgdColor);
    
      this.pg[n].fill(foreColor);
      this.pg[n].noStroke();
      this.pg[n].textSize(this.pgTextSize);
      this.pg[n].textAlign(CENTER);
      this.pg[n].textFont(currentFont);
      var thisAdjust = this.pg[n].height/2 + this.pgTextSize * thisFontAdjust/2 + this.pgTextSize * thisFontAdjustUp;
      this.pg[n].text(this.inp.charAt(n), this.pg[n].width/2, thisAdjust);
    }
  }

  removeGraphics(){
    for(var n = 0; n < this.inp.length; n++){
      this.pg[n].remove();
    }
  }
}
