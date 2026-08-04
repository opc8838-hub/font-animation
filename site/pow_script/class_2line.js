/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class SplodeLine {
  constructor(index){
    this.index = index;
    this.lineLength = inputText[this.index].length;
    this.splodeLetters = [];

    this.setOriginalOrder();
    this.setNewOrder();
  }

  run(){
    for(var m = 0; m < this.lineLength; m++){
      this.splodeLetters[m].run();
    }
  }

  setOriginalOrder(){
    textFont(tFont[fontSelect]);
    textSize(pgTextSize);

    // this.splodeLetters = [];
    for(var m = 0; m < this.lineLength; m++){
      var thisLetter = inputText[this.index].charAt(m);

      var thisX = 0;
      if(m > 0){
        var holdX = textWidth(inputText[this.index].substring(0, m + 1));
        thisX = holdX - textWidth(inputText[this.index].charAt(m));
      }
      var thisY = pgTextSize * pgTextFactor[fontSelect] * this.index;

      thisX += width/2 - textWidth(inputText[this.index])/2;
      // thisY += height/2 + pgTextSize * pgTextFactor[fontSelect]/2 - (inputText.length - 1) * pgTextSize * pgTextFactor[fontSelect]/2;
      thisY += height/2 - (inputText.length - 2) * pgTextSize * pgTextFactor[fontSelect]/2;

      if(blastType == 0){
        this.splodeLetters[m] = new SplodeLetter(m, thisLetter, thisX, thisY);
      } else if(blastType == 1){
        this.splodeLetters[m] = new SpurLetter(m, thisLetter, thisX, thisY);
      }
    }
  }

  setNewOrder(){
    var centerClick = 0;
    var xTest = width;

    for(var m = 0; m < this.lineLength; m++){
      var charW = textWidth(inputText[this.index].charAt(centerClick));
      var measureX = dist(orgX, 0, this.splodeLetters[m].x + charW/2, 0);

      if(measureX < xTest){
        centerClick = m;
        xTest = measureX;
      }
    }

    var holdOrder = [];
    for(var m = 0; m < this.splodeLetters.length; m++){
      holdOrder[m] = this.splodeLetters[m];
    }
    this.splodeLetters[this.lineLength - 1] = holdOrder[centerClick];

    var filled = 1;
    var direct = 1;
    var clicker = 1;
    var m = 2;
    while(filled < this.splodeLetters.length){
      if(holdOrder[centerClick + direct * clicker] != null){
        this.splodeLetters[this.lineLength - m] = holdOrder[centerClick + direct * clicker];

        filled ++;
        m ++;
      }

      if(direct == -1){
        clicker ++;
      }
      direct *= -1;
    }
  }

  refresh(){
    for(var m = 0; m < this.lineLength; m++){
      this.splodeLetters[m].refresh();
    }
    this.setOriginalOrder();
    this.setNewOrder();
  }
}