class TumbleBase {
  constructor(){
    this.lets = [];

    this.build();
  }

  build(){
    var leading = 10;
    var tracking = 0;
    if(selFont == 5){
      tracking = 5;
    }

    maxDist = 0;

    var hasCJK = inputText.some(function(line){ return containsCJK(line); });
    if((selFont == 7 || selFont == 8) && !hasCJK){         //////////// ARABIC

      var fullLeftX = 0;
      var fullRightX = 0;
      var topY = 0;
      var botY = 0;
      
      for(var p = 0; p < inputText.length; p++){
        var testerPath = myFont[selFont].getPath(inputText[p], 0, 0, pgTextSize);

        for(var m = 0; m < testerPath.commands.length - 1; m++){
          if(testerPath.commands[m].y){
            if(testerPath.commands[m].x < fullLeftX){
              fullLeftX = testerPath.commands[m].x;
            } else if(testerPath.commands[m].x > fullRightX){
              fullRightX = testerPath.commands[m].x;
            }

            var thisY = testerPath.commands[m].y + p * pgTextSize * tFontFactor[selFont];
            if(thisY < topY){
              topY = thisY;
            } else if(thisY > botY){
              botY = thisY;
            }
          }
        }
      }

      var allFullX = dist(fullLeftX, 0, fullRightX, 0);
      var fullY = dist(0, topY, 0, botY);

      var letCounter = 0;
      for(var p = 0; p < inputText.length; p++){
        var holderPaths = myFont[selFont].getPath(inputText[p], 0, 0, pgTextSize);
        var thesePaths = [];
        var pathCounter = 0;
        thesePaths[pathCounter] = [];
        var leftX = 0;
        var rightX = 0;

        for(var m = 0; m < holderPaths.commands.length; m++){
          if(holderPaths.commands[m].x < leftX){
            leftX = holderPaths.commands[m].x;
          } else if(holderPaths.commands[m].x > rightX){
            rightX = holderPaths.commands[m].x;
          }

          thesePaths[pathCounter].push(holderPaths.commands[m]);

          if(holderPaths.commands[m].type == 'Z'){
            if(
              m < holderPaths.commands.length - 1
              && holderPaths.commands[m + 1].x > leftX
              && holderPaths.commands[m + 1].x < rightX
              // && holderPaths.commands[m + 1].y > botY
              // && holderPaths.commands[m + 1].y < topY
            ){
              console.log("COUNTER DETECTED");
            } else {
              if(m < holderPaths.commands.length - 1){
                pathCounter ++;
                thesePaths[pathCounter] = [];
              }
            }
          }
        }

        console.log(thesePaths)
        var fullX = dist(leftX, 0, rightX, 0);

        for(var m = 0; m < thesePaths.length; m++){
          var x = 0;
          var y = p * pgTextSize * tFontFactor[selFont];

          y += pgTextSize * tFontFactor[selFont];
          y -= fullY/2;

          if(alignMode == 0){
            x -= allFullX/2;
          } else if(alignMode == 1){
            x -= fullX/2
          } else if(alignMode == 2){
            x += allFullX/2;
            x -= fullX;
          }
          
          this.lets[letCounter] = new TumbleLetArabic(x, y, thesePaths[m], p, m);

          var meas = dist(this.lets[letCounter].orgX, this.lets[letCounter].orgY, mouseCenter.x, mouseCenter.y);
          if(meas > maxDist){
            maxDist = meas;
          }

          letCounter++;
        }

      }
      // console.log("THIS MANY MADE: " + this.lets.length);

    } else {                          //////////// EVERYTHING ELSE
      for(var p = 0; p < inputText.length; p++){
        for(var m = 0; m < inputText[p].length; m++){
          var nextW = textWidth(inputText[p].substring(0, m + 1));
          var thisW = textWidth(inputText[p].charAt(m));
  
          var x = nextW - thisW;
          var y = p * pgTextSize * tFontFactor[selFont];
          
          if(alignMode == 0){
            x -= fullW/2;
          } else if(alignMode == 1){
            x -= (textWidth(inputText[p]) + (inputText[p].length - 1) * tracking)/2;
          } else if(alignMode == 2){
            x += fullW/2;
            x -= textWidth(inputText[p]);
          }
  
          x += (m - 1) * tracking;
  
          y -= -pgTextSize * tFontFactor[selFont] + inputText.length * pgTextSize * tFontFactor[selFont]/2;
          y -= (inputText.length - 1) * leading/2;
          if(p > 0){
            y += (p) * leading;
          }
  
          if(inputText[p].charAt(m) != " "){
            this.lets[this.lets.length] = new TumbleLet(x, y, p, m);
  
            var meas = dist(x, y, mouseCenter.x, mouseCenter.y);
            if(meas > maxDist){
              maxDist = meas;
            }
          }
        }
      }
    }

    this.liveReset();
    this.tickerReset();
  }

  run(){
    for(var m = 0; m < this.lets.length; m++){
      this.lets[m].run();
    }

    // this.resetDetect();
  }

  liveReset(){
    for(var m = 0; m < this.lets.length; m++){
      this.lets[m].liveReset();
    }
  }

  tickerReset(){
    for(var m = 0; m < this.lets.length; m++){
      this.lets[m].tickerReset();
    }
  }
}
