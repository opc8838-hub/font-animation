/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

var bkgdColor, foreColor, accentColor;
var colorSet = [];

var inputText = [];
// var starterText = "GOOD\nNIGHT\nNOISES\nEVERY\nWHERE";
// var starterText = "WHEN\nPROBABILITY\nWAVES\nCOLLAPSE\nINTO\nEVENT";
var starterText = "THE\nMEANING\nOF ALL\nMOTIONS\nSHAPES &\nSOUNDS";
// var starterText = "THOSE\nPETTY ONES\nCAN'T FUCK\nWITH ME\n'CAUSE\nI'M A\nCLEVER\nGIRL";
// var starterText = "EVERY\nTHING\nEVERY\nWHERE\nIS ALWAYS\nMOVING\nFOREVER";

var tFont = [];
var pgTextSize = 90;
var pgBkgd = [];
var fontHeightFactor = [];
var coreBase;

var fontFactor = [];
var vesselSW = 2;

var wWindow;
var textScale = 1;
var saveMode = 0;

// var centerX = 0;
var centerY = 0;
var leftX = 0;
var rightX = 0;
var culmYtarget = 0;

var stageA = 30;
var stageB = 45;

var stageAdirect = 2;
var stageAstrength = 3;
var stageBdirect = 2;
var stageBstrength = 3;

var cTickerMeasure = 0;
var cTicker = 0;

var boxWmeas = 0;
var boxW = 0;
var boxWorg = 0;
var boxWtarget = 0;

var peakY = 0;
var boxH = 0;
var boxHorg = 0;
var boxHtarget = 0;

var boxRTop = 0;
var boxRTopOrg = 0;
var boxRTopTarget = 0;

var boxRBot = 0;
var boxRBotOrg = 0;
var boxRBotTarget = 0;

var charDelay = -2;
var lineDelay = -3;

var fontSel = 0;
var crestType = 1;

var widgetOn = true;

var debugOn = false;
var centerOn = false;

var svgSaveOn = false;
var recording = false;

var cwidth, cheight
var recMessageOn = false;
var frate = 30;
var recordedFrames = 0;
var numFrames = 300;

var thisDensity = 1;

function preload(){
  tFont[0] = loadFont('assets/NotoSansSC-Regular.ttf');
  fontFactor[0] = 0.8;
  fontHeightFactor[0] = 0.70;

  tFont[1] = loadFont('assets/NotoSansSC-Regular.ttf');
  fontFactor[1] = 0.8;
  fontHeightFactor[1] = 0.72;

  tFont[2] = loadFont('assets/NotoSansSC-Regular.ttf');
  fontFactor[2] = 0.9;
  fontHeightFactor[2] = 0.8;

  tFont[3] = loadFont('assets/NotoSansSC-Regular.ttf');
  fontFactor[3] = 0.8;
  fontHeightFactor[3] = 0.70;

  tFont[4] = loadFont('assets/NotoSansSC-Regular.ttf');
  fontFactor[4] = 0.8;
  fontHeightFactor[4] = 0.70;

  tFont[5] = loadFont('assets/NotoSansSC-Regular.ttf');
  fontFactor[5] = 0.8;
  fontHeightFactor[5] = 0.70;
}

function setup(){
  createCanvas(windowWidth,windowHeight);

  thisDensity = pixelDensity();

  cwidth = width;
  cheight = height;

  if(width < 500){
    wWindow = width/2;
  } else {
    wWindow = width/3;
  }

  colorSet[0] = color('#f24b78');
  colorSet[1] = color('#0b8ad9');
  colorSet[2] = color('#0a5926');
  colorSet[3] = color('#f2a20c');
  colorSet[4] = color('#f21f0c');

  accentColor = '#00ff00';
  foreColor = '#ffffff';
  bkgdColor = '#000000';

  document.getElementById('foreColor').value = foreColor;
  document.getElementById('bkgdColor').value = bkgdColor;

  rectMode(CENTER);

  frameRate(frate);

  document.getElementById("textArea").value = starterText;
  setText();

  runCoreReset();
}

function draw(){
  background(bkgdColor);
  // image(pgBkgd[0], 0, 0);

  drawMain();

  cTicker++;

  if(cTicker > stageB){
    runCoreReset();
  } else {
    runBorderAnim();
  }

  // fill(foreColor);
  // textSize(20);
  // text(cTicker, 50, height - 50);
  runRecording();
}

function drawMain(){
  push();
    translate(width/2, height/2);
    // noFill();
    // stroke(255);
    // line(0, -300, 0, 300);
    // line(300, 0, -300, 0);
    // rect(0, 0, 400, 300);
    // ellipse(0,0,5,5);

    if(crestType == 1){
      stroke(foreColor);
      strokeWeight(vesselSW);
      noFill();
      rect(0, 0, boxW, boxH, boxRTop, boxRTop, boxRBot, boxRBot);
    } else if(crestType == 2){
      noStroke();
      fill(foreColor);
      rect(0, 0, boxW, boxH, boxRTop, boxRTop, boxRBot, boxRBot);
    }

    //DEBUG
    if(debugOn && crestType > 0){
      noFill();

      stroke(accentColor);
      strokeWeight(0.5);
      line(boxWorg/2 - boxRTopOrg, -boxHorg/2,
          boxWtarget/2 - boxRTopTarget, -boxHtarget/2);
      line(boxWorg/2, -boxHorg/2 + boxRTopOrg,
          boxWtarget/2, -boxHtarget/2 + boxRTopTarget);
      line(-boxWorg/2 + boxRTopOrg, -boxHorg/2,
          -boxWtarget/2 + boxRTopTarget, -boxHtarget/2);
      line(-boxWorg/2, -boxHorg/2 + boxRTopOrg,
          -boxWtarget/2, -boxHtarget/2 + boxRTopTarget);

      line(boxWorg/2 - boxRBotOrg, boxHorg/2,
          boxWtarget/2 - boxRBotTarget, boxHtarget/2);
      line(boxWorg/2, boxHorg/2 - boxRBotOrg,
          boxWtarget/2, boxHtarget/2 - boxRBotTarget);
      line(-boxWorg/2 + boxRBotOrg, boxHorg/2,
          -boxWtarget/2 + boxRBotTarget, boxHtarget/2);
      line(-boxWorg/2, boxHorg/2 - boxRBotOrg,
          -boxWtarget/2, boxHtarget/2 - boxRBotTarget);

      strokeWeight(1);
      rect(0, 0, boxWorg, boxHorg, boxRTopOrg, boxRTopOrg, boxRBotOrg, boxRBotOrg);
      rect(0, 0, boxWtarget, boxHtarget, boxRTopTarget, boxRTopTarget, boxRBotTarget, boxRBotTarget);
    }
        
    translate(0, -centerY/2);
    translate(-(leftX + rightX)/2, 0);
    // translate(-centerX, 0);

    centerY = 0;
    // centerX = 0;
    leftX = 0;
    rightX = 0;
    coreBase.run();
  pop();
}

function runBorderAnim(){
  if(cTicker < cTickerMeasure){
    boxW = boxWorg;
    boxH = boxHorg;
    boxRTop = boxRTopOrg;
    boxRBot = boxRBotOrg;

  } else if(cTicker < stageA){
    var tk0 = map(cTicker, cTickerMeasure, stageA - 1, 0, 1);
    boxW = map(stageAaccel(tk0), 0, 1, boxWorg, boxWtarget);
    boxH = map(stageAaccel(tk0), 0, 1, boxHorg, boxHtarget);
    boxRTop = map(stageAaccel(tk0), 0, 1, boxRTopOrg, boxRTopTarget);
    boxRBot = map(stageAaccel(tk0), 0, 1, boxRBotOrg, boxRBotTarget);

    boxRTop = constrain(boxRTop,0, 2000);
    boxRBot = constrain(boxRBot,0, 2000);
  } else {
    boxW = boxWtarget;
    boxH = boxHtarget;
    boxRTop = boxRTopTarget;
    boxRBot = boxRBotTarget;

  }
}

function runCoreReset(){
  cTicker = cTickerMeasure;

  boxWorg = boxWtarget;
  boxHorg = boxHtarget;
  boxRTopOrg = boxRTopTarget;
  boxRBotOrg = boxRBotTarget;

  boxWmeas = 0;
  peakY = 0;

  coreBase.resetMain();

  boxWtarget = boxWmeas + pgTextSize * fontFactor[fontSel];
  boxHtarget = peakY + (inputText.length) * pgTextSize * fontFactor[fontSel];

  // boxWtarget += pgTextSize * fontFactor[fontSel];
  boxWtarget *= 2;
  boxHtarget += 2.5 * pgTextSize * fontFactor[fontSel];

  boxRTopTarget = random(boxWtarget/2);
  boxRBotTarget = random(boxWtarget/2);

}

function createAnimation(){
  findMaxSize();

  textFont(tFont[fontSel]);
  textSize(pgTextSize);

  cTickerMeasure = 0;
  boxWmeas = 0;
  peakY = 0;

  coreBase = null;
  coreBase = new Base();

  cTicker = cTickerMeasure;
  boxWtarget = boxWmeas + pgTextSize * fontFactor[fontSel];
  boxHtarget = peakY + (inputText.length) * pgTextSize * fontFactor[fontSel];

  // boxWtarget += pgTextSize * fontFactor[fontSel];
  boxWtarget *= 2;
  boxHtarget += 2.5 * pgTextSize * fontFactor[fontSel];

  boxW = boxWtarget;
  boxH = boxHtarget;
  boxWorg = boxW;
  boxHorg = boxH;
}

function windowResized(){
  resizeForPreview();
}

function resizeForPreview(){
  var tempWidth, tempHeight;

  if(saveMode == 0){
    resizeCanvas(windowWidth, windowHeight);
  } else if(saveMode == 1){
    if(windowWidth > windowHeight * 9/16){
      tempHeight = windowHeight;
      tempWidth = windowHeight * 9/16;
    } else {
      tempWidth = windowWidth;
      tempHeight = windowWidth * 16/9;
    }
    resizeCanvas(tempWidth, tempHeight);
  } else if(saveMode == 2){
    if(windowWidth < windowHeight){
      tempWidth = windowWidth;
      tempHeight = windowWidth;
    } else {
      tempHeight = windowHeight;
      tempWidth = windowHeight;
    }
    resizeCanvas(tempWidth, tempHeight);
  }

  cwidth = width;
  cheight = height;

  if(width < 500){
    wWindow = width/2;
  } else {
    wWindow = width/3;
  }

  createAnimation();
}

function resizeForSave(){
  if(saveMode == 0){
    resizeCanvas(windowWidth, windowHeight);
  } else if(saveMode == 1){
    resizeCanvas(1080, 1920);
  } else if(saveMode == 2){
    resizeCanvas(1080, 1080);
  }

  if(width < 500){
    wWindow = width/2;
  } else {
    wWindow = width/3;
  }

  createAnimation();
}

function stageAaccel(val){
  if(stageAdirect == 0){
    if(stageAstrength == 0){ return easeInSine(val); }
    else if(stageAstrength == 1){ return easeInCubic(val); }
    else if(stageAstrength == 2){ return easeInCirc(val); }
    else if(stageAstrength == 3){ return easeInExpo(val); }
    else if(stageAstrength == 4){ return easeInBack(val); }
    else if(stageAstrength == 5){ return easeInBounce(val); }
    else if(stageAstrength == 6){ return easeInElastic(val); }
  } else if(stageAdirect == 1){
    if(stageAstrength == 0){ return easeOutSine(val); }
    else if(stageAstrength == 1){ return easeOutCubic(val); }
    else if(stageAstrength == 2){ return easeOutCirc(val); }
    else if(stageAstrength == 3){ return easeOutExpo(val); }
    else if(stageAstrength == 4){ return easeOutBack(val); }
    else if(stageAstrength == 5){ return easeOutBounce(val); }
    else if(stageAstrength == 6){ return easeOutElastic(val); }
  } else if(stageAdirect == 2){
    if(stageAstrength == 0){ return easeInOutSine(val); }
    else if(stageAstrength == 1){ return easeInOutCubic(val); }
    else if(stageAstrength == 2){ return easeInOutCirc(val); }
    else if(stageAstrength == 3){ return easeInOutExpo(val); }
    else if(stageAstrength == 4){ return easeInOutBack(val); }
    else if(stageAstrength == 5){ return easeInOutBounce(val); }
    else if(stageAstrength == 6){ return easeInOutElastic(val); }
  }
}

function stageBaccel(val){
  if(stageBdirect == 0){
    if(stageBstrength == 0){ return easeInSine(val); }
    else if(stageBstrength == 1){ return easeInCubic(val); }
    else if(stageBstrength == 2){ return easeInCirc(val); }
    else if(stageBstrength == 3){ return easeInExpo(val); }
    else if(stageBstrength == 4){ return easeInBack(val); }
    else if(stageBstrength == 5){ return easeInBounce(val); }
    else if(stageBstrength == 6){ return easeInElastic(val); }
  } else if(stageBdirect == 1){
    if(stageBstrength == 0){ return easeOutSine(val); }
    else if(stageBstrength == 1){ return easeOutCubic(val); }
    else if(stageBstrength == 2){ return easeOutCirc(val); }
    else if(stageBstrength == 3){ return easeOutExpo(val); }
    else if(stageBstrength == 4){ return easeOutBack(val); }
    else if(stageBstrength == 5){ return easeOutBounce(val); }
    else if(stageBstrength == 6){ return easeOutElastic(val); }
  } else if(stageBdirect == 2){
    if(stageBstrength == 0){ return easeInOutSine(val); }
    else if(stageBstrength == 1){ return easeInOutCubic(val); }
    else if(stageBstrength == 2){ return easeInOutCirc(val); }
    else if(stageBstrength == 3){ return easeInOutExpo(val); }
    else if(stageBstrength == 4){ return easeInOutBack(val); }
    else if(stageBstrength == 5){ return easeInOutBounce(val); }
    else if(stageBstrength == 6){ return easeInOutElastic(val); }
  }
}