/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class DropAll {
  constructor(){
    this.dropLines = [];
    for(var m = 0; m < inputText.length; m++){
      this.dropLines[m] = new DropLine(m);
    }
  }

  run(){
    for(var m = 0; m < inputText.length; m++){
      this.dropLines[m].run();
    }
    
    for(var m = 0; m < debrisGroup.length; m++){
      debrisGroup[m].run();
    }
  }

  refresh(){
    for(var m = 0; m < inputText.length; m++){
      this.dropLines[m].refresh();
    }
  }

  resetPos(){
    for(var m = 0; m < inputText.length; m++){
      this.dropLines[m].resetPos();
    }

    for(var m = 0; m < debrisGroup.length; m++){
      debrisGroup[m].resetPos();
    }
  }

  removeIt(){
    for(var m = inputText.length - 1; m >= 0; m--){
      this.dropLines[m].removeIt();
    }

    for(var m = debrisGroup.length - 1; m >= 0; m--){
      debrisGroup[m].removeIt();
    }
  }

  removeConstraint(){
    for(var m = inputText.length - 1; m >=0 ; m--){
      this.dropLines[m].removeConstraint();
    }
  }
}