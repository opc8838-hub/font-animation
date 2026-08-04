/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

var bkgdColor, foreColor;

var inputText = [];

// var starterText = "ALL\nGOOD\nTHINGS";
var starterText = "GO\nNOW\nSTART\nOVER";
// var starterText = "الحركة\nبركة"; // MOVEMENT IS A BLESSING

var pg = [];
var tFont = [];
var tFontData = [];
var tFontFactor = [];
var arabicFont;
var arabicPath;
var pgTextSize = 100;
var colorSet = [];
var colorType = 0;
var leading = 0;

// var stageA = 60;
// var stageB = stageA + 60;

var stageAdirect = 1; // 0: IN, 1: OUT, 2:InOut
var stageAstrength = 3;
var stageAlength = 60;

var stageBdirect = 0;
var stageBstrength = 3;
var stageBlength = 60;

var pauseLength = 30;
var delayMax = -30;

var resLon = 200;
var resLat = 250;
var ang;
var radius;
var radStep;
var radMax;

var anim0 = 0;
var anim1 = anim0 + stageAlength;
var anim2 = anim1 + stageBlength;
var anim3 = anim2 + pauseLength;

var wWindowMin, wWindowMax;
var scaler = 0.75;

var spokes = [];
var testPoints = [];

var pointCounter = 0;
var spokeCounter = 0;

var c;

var widgetOn = true;
var scrubOn = false;
var scrubVal = 0;
var scrubFull = anim3 - delayMax -1;

var taperOn = true;
var baseSW = 2;
var minSW = 1;
var maxSW = 8;
var pausePop = false;

var minFlux = -10;
var maxFlux = 25;
var randomFlux = 4;

var ranRunOn = false;
var allSlidersOn = true;

var saveMode = 0;
var recording = false;

var cwidth, cheight
var recMessageOn = false;
var frate = 30;
var recordedFrames = 0;
var numFrames = 300;

var thisDensity = 1;

var selFont = 4;

function preload(){
  tFont[0] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[1] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[2] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[3] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[4] = loadFont('assets/NotoSansSC-Regular.ttf');

  tFont[5] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFontData[5] = loadBytes("shine_resources/ZafranArabic-Black.otf");

  tFont[6] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFontData[6] = loadBytes("shine_resources/Ko_Banzeen-SlantedL.otf");

  tFontFactor[0] = 0.75;
  tFontFactor[1] = 0.75;
  tFontFactor[2] = 0.75; 
  tFontFactor[3] = 0.9; 
  tFontFactor[4] = 0.8; 
  tFontFactor[5] = 0.5; 
  tFontFactor[6] = 1.3;
}

function setup(){
  createCanvas(windowWidth, windowHeight);

  thisDensity = pixelDensity();

  cwidth = width;
  cheight = height;

  runRan();

  wWindowMin = width/8,
  wWindowMax = width;
  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);

  c = createVector(width/2, height/2);

  ang = TWO_PI/resLon;
  if(width > height){
    radius = width;
  } else {
    radius = height;
  }
  radStep = (radius)/resLat;
  radMax = radius;

  foreColor = color('#ffffff');
  bkgdColor = color('#000000');

  // FOOTIT
  colorSet[0] = color('#d90d43');
  colorSet[1] = color('#164df2');
  colorSet[2] = color('#f2b807');
  colorSet[3] = color('#078c4e');
  colorSet[4] = color('#f2a007');
  // colorSet[0] = color('#f2aec7');
  // colorSet[1] = color('#5080bf');
  // colorSet[2] = color('#f2b441');
  // colorSet[3] = color('#f24535');
  // colorSet[4] = color('#00ed79');
  // colorSet[5] = foreColor;

  textureMode(NORMAL);
 
  document.getElementById("textArea").value = starterText;
  setText();
}

function draw(){
  background(bkgdColor);

  // image(pg[0], 0, 0);
  for(var m = 0; m < spokes.length; m++){
    spokes[m].run();
  }

  if(spokes[0].ticker1 >= anim3 - delayMax){
  // if(spokes[spokes.length - 1].ticker1 >= anim3){
    if(ranRunOn){
      runRan();
    } else {
      for(var m = 0; m < spokes.length; m++){
        spokes[m].reset();
      }
    }
  }

  // fill(255,0,0);
  // ellipse(c.x, c.y, 5, 5);

  runRecording();
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
  c = createVector(width/2, height/2);

  cwidth = width;
  cheight = height;

  wWindowMin = width/8,
  wWindowMax = width;
  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);

  if(width > height){
    radius = width;
  } else {
    radius = height;
  }
  radStep = (radius)/resLat;

  setText();
  // createAnimation();
}

function resizeForSave(){
  if(saveMode == 0){
    resizeCanvas(windowWidth, windowHeight);
  } else if(saveMode == 1){
    resizeCanvas(1080, 1920);
  } else if(saveMode == 2){
    resizeCanvas(1080, 1080);
  }

  c = createVector(width/2, height/2);

  wWindowMin = width/8,
  wWindowMax = width;
  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);

  if(width > height){
    radius = width;
  } else {
    radius = height;
  }
  radStep = (radius)/resLat;

  setText();
  // createAnimation();
}

function makeSpokes(){
  spokes = [];
  var switcher = false;

  for(var m = 0; m < resLon; m++){
    switcher = false;
    
    preX = 0;
    preY = 0;
    
    for(var n = 0; n < resLat; n++){
      var start;

      var tAng = m * ang;
      var tX = cos(tAng) * (n * radStep) + c.x;
      var tY = sin(tAng) * (n * radStep) + c.y;

      if(!switcher){
        if(brightness(pg[0].get(tX, tY)) < 90){
          start = createVector(tX, tY);
          preX = tX;
          preY = tY;
          
          switcher = true;
        }
      } else if(switcher){
        if(brightness(pg[0].get(tX, tY)) > 90){
          var end = createVector(tX, tY);

          var index = spokes.length;
          spokes[spokes.length] = new Spoke(start, end, tAng, index);

          switcher = false;
        }
      }
    }
  }

  print("SPOKE COUNT: " + spokes.length);

  //// find radMax;
  var distRuler = 0;
  for(var p = 0; p < spokes.length; p++){
    var distFromCenter = dist(c.x, c.y, spokes[p].p1.x, spokes[p].p1.y);
    if(distFromCenter > distRuler){
      distRuler = distFromCenter;
    }
  }
  radMax = distRuler;

  for(var m = 0; m < spokes.length; m++){
    spokes[m].resetFull();
  }
}

function makeDots(){
  pointCounter = 0;
  for(var m = 0; m < resLon; m++){
    for(var n = 0; n < resLat; n++){
      var tX = cos(m * ang) * (n * radStep) + width/2;
      var tY = sin(m * ang) * (n * radStep) + height/2;

      if(brightness(pg[0].get(tX, tY)) < 10){
        testPoints[pointCounter] = {
          x: tX,
          y: tY
        }
        pointCounter ++;
      }
    }
  }
}

function mouseClicked(){
  if(!pausePop){
    c = createVector(mouseX, mouseY);

    makeSpokes();
  }
}

// function keyPressed(){
//   save('testImage.png');
// }