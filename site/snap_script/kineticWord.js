/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

function snapFontForCharacter(character){
  var isCjk = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(character);
  var selectedSupportsCjk = currentFontIndex === 0 || currentFontIndex === 1 || (currentFontIndex >= 22 && currentFontIndex <= 24);
  return isCjk && !selectedSupportsCjk ? tFont[0] : currentFont;
}

function snapGlyphWidth(character){
  var mediaAsset = stgMediaAssetForCharacter(character);
  if(mediaAsset && stgMedia.enabled && mediaAsset.layer === "inline"){
    return stgMediaInlineWidth(pgTextSize * 0.72, mediaAsset);
  }
  textFont(snapFontForCharacter(character));
  return textWidth(character);
}

function snapTextWidth(value){
  var total = 0;
  for(var index = 0; index < value.length; index++){
    total += snapGlyphWidth(value.charAt(index));
  }
  return total;
}

class KineticWord {
  constructor(x_, y_, p_, m_){
    this.p = p_;
    this.m = m_;
    this.x0 = x_;
    this.y0 = y_;
    this.y1 = map(this.m, 0, keyArray.length-1, -newHeight/4, newHeight/4);
    this.yAnim = 0;
    
    this.kinetics = [];

    textSize(pgTextSize);
    textFont(currentFont);

    var thisTracking = pgTextSize * 0.15;
    var fullMainWidth = snapTextWidth(keyArray[this.m]) - (keyArray[this.m].length - 1) * (thisTracking - 5);

    this.budgeCenter = 0;

    for(var n = 0; n < keyArray[this.m].length; n++){
      var tempMain0 = snapTextWidth(keyArray[this.m].slice(0, n+1));
      var tempMain1 = snapGlyphWidth(keyArray[this.m].charAt(n));

      var thisX = tempMain0 - tempMain1 - thisTracking * n - fullMainWidth/2;
      this.kinetics[n] = new KineticLetter(thisX, this.p, this.m, n);
    }

    this.influ = 10;
    this.ticker = -this.m * 1;
  }

  update(){
    this.ticker ++;

    if(this.ticker < 0){
      this.yAnim = this.y1;
    } else if(this.ticker < 60){
      var tick0 = map(this.ticker, 0, 60, 0, 1);
      var tick1 = aSet(tick0, this.influ);

      this.yAnim = map(tick1, 0, 1, this.y1, 0);
    } else {
      this.yAnim = 0;
    }
  }

  run(){
    push();
      translate(-this.budgeCenter/2, 0);
      translate(this.x0, this.y0);
      translate(0, this.yAnim);

      this.budgeCenter = 0;
      for(var n = 0; n < this.kinetics.length; n++){

        this.kinetics[n].update();
        this.kinetics[n].display();
      }
    pop();
  }
}
