/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

class Base {
  constructor(){
    this.lines = [];

    for(var m = 0; m < inputText.length; m++){
      this.lines[m] = new Line(m);
    }
  }

  run(){
    for(var m = 0; m < inputText.length; m++){
      this.lines[m].run();
    }
  }

  resetMain(){
    for(var m = 0; m < inputText.length; m++){
      this.lines[m].resetMain();
    }
  }
}