/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class Blank {
  constructor(ramp_, inp_){
    this.inp = inp_;

    this.pgTextSize = 2;
    this.findTextSize();

    this.pgA;
    this.drawTextures();
  
    this.ticker = 0;
  }

  update(){
    this.ticker ++;
  }

  display(){
    background(bkgdColor);

    push();
      translate(width/2, height/2);
      translate(-this.pgA.width/2, -this.pgA.height/2);
      image(this.pgA, 0, 0);
    pop();
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

  drawTextures(){
    textSize(this.pgTextSize);
    textFont(currentFont);
    var repeatSize = round(textWidth(this.inp));
  
    this.pgA = createGraphics(repeatSize, this.pgTextSize * (thisFontAdjust + 0.05));
    this.pgA.background(bkgdColor);
  
    this.pgA.fill(foreColor);
    this.pgA.noStroke();
    this.pgA.textSize(this.pgTextSize);
    this.pgA.textAlign(CENTER);
    this.pgA.textFont(currentFont);
    var thisAdjust = this.pgA.height/2 + this.pgTextSize * thisFontAdjust/2 + this.pgTextSize * thisFontAdjustUp;
    this.pgA.translate(width/2, thisAdjust);
    this.pgA.text(this.inp, 0, 0);
  }

  removeGraphics(){
    this.pgA.remove();
  }
}
