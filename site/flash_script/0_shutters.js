/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class Shutters {
  constructor(ramp_, inp_){
    this.inp = inp_;

    this.pgTextSize = 2;
    this.findTextSize();
    this.pgTextSize *= flashTextScale;
    
    this.xSpots = [];
    this.findXpos();

    this.pg = [];
    this.makeTextures();

    this.ticker = 0;

    this.shutterAnim = [];
    this.shutterYanim = [];

    this.ramp = ramp_;

    this.pacer = (sceneLength/2)/this.inp.length;
  }

  update(){
    this.ticker ++;

    for(var n = 0; n < this.inp.length; n++){
      var tk00 = constrain(this.ticker - this.pacer*n, 0, sceneLength);
      var tk0 = map(tk00, 0, sceneLength, 0, 1.0);

      var tk1;
      if(this.ramp==0){
        tk1 = easeOutQuad(tk0);
      } else if(this.ramp==1){
        tk1 = easeInOutQuad(tk0);
      }

      this.shutterAnim[n] = map(tk1, 0, 1, this.pg[0].height, 0);
      this.shutterYanim[n] = map(tk1, 0, 1, -this.pg[0].height/2, 0);
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
          translate(this.xSpots[n], this.shutterYanim[n]);

          texture(this.pg[n]);
          
          var vTop = 0;
          var vBot = map(this.pg[n].height - this.shutterAnim[n], 0, this.pg[n].height, 0, 1);

          beginShape(TRIANGLE_STRIP);
            vertex(0, this.shutterAnim[n], 0, vTop);
            vertex(0, this.pg[n].height, 0, vBot);
            vertex(this.pg[n].width, this.shutterAnim[n], 1, vTop);
            vertex(this.pg[n].width, this.pg[n].height, 1, vBot);
          endShape();
        pop();
      }
    pop();
  }

  findXpos(){
    textFont(currentFont);
    textSize(this.pgTextSize);
    var fullSize = flashInlineTextWidth(this.inp, this.pgTextSize);
    var xStart = width/2 - fullSize/2;

    for(var n = 0; n < this.inp.length; n++){
      var thisLetterWidth = flashInlineGlyphWidth(this.inp.charAt(n), this.pgTextSize);
      var upUntilWidth = flashInlineTextWidth(this.inp.slice(0,n+1), this.pgTextSize);
      var difference = upUntilWidth - thisLetterWidth;
      this.xSpots[n] = xStart + difference;
    }
  }

  findTextSize(){
    var measured = 0;
    while(measured < width){
      textSize(this.pgTextSize)
      textFont(currentFont);
      measured = flashInlineTextWidth(this.inp, this.pgTextSize);

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

      var repeatSize = max(2, round(flashInlineGlyphWidth(this.inp.charAt(n), this.pgTextSize)));
    
      this.pg[n] = createGraphics(repeatSize, this.pgTextSize * (thisFontAdjust + 0.05));
      this.pg[n].background(bkgdColor);
    
      this.pg[n].fill(foreColor);
      this.pg[n].noStroke();
      this.pg[n].textSize(this.pgTextSize);
      this.pg[n].textAlign(CENTER);
      this.pg[n].textFont(currentFont);
      var thisAdjust = this.pg[n].height/2 + this.pgTextSize * thisFontAdjust/2 + this.pgTextSize * thisFontAdjustUp;
      flashDrawInlineText(this.pg[n], this.inp.charAt(n), this.pg[n].width/2, thisAdjust, this.pgTextSize);
    }
  }

  removeGraphics(){
    for(var n = 0; n < this.inp.length; n++){
      this.pg[n].remove();
    }
  }
}
