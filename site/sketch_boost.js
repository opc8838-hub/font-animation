var bkgdColor, textColor, strokeColor, sideSolidColor;
var colorSet = [];

var inputText = [];
var tFont = [];
var tFontData = [];
var myFont = [];
var cnFontData;
var cnOutlineFont;
var tFontFactor = [];
var starterText = "A\nSAD\nWILD\nTHING";
// var starterText = "FUTURE\nWHAT\nEVER";
// var starterText = "BUY\nTHE\nMAGIC\nBEANS";
// var starterText = "مرحبا";
// var starterText = "الحركة\nبركة"; // MOVEMENT IS A BLESSING

// var starterText = "الحركة" // MOVEMENT IS A BLESSING
// var starterText = "بركة"; // MOVEMENT IS A BLESSING

// var starterText = "WE\nARE\nALREADY\nINFNITE";

var pgTextSize = 100;
var res = 8;
var pauseLength = 30;
var fontCount = 9;

var culmLength = [];
var coreBase;
var baseAnimA = 60;
var animA = 60;     ////// INTRO
var baseAnimB = 0;
var animB = animA;     ////// STAY
var baseAnimC = 60;
var animC = animB + 60;     ////// OUTRO
var maxDelay = -20;

var stageAdirect = 2;
var stageAstrength = 3;

var stageBdirect = 2;
var stageBstrength = 3;

var wWindowMin, wWindowMax;
var scaler = 0.6;

var widgetOn = true;

var fullW, fullH;

var extrudeType = 1;
var tumbleDepthLength = -75;
var tumbleAmount = 1;
var zoomDepthLength = -500;
var punchDepthLength = -50;
var punchDistance = 100;
var punchInvert = false;

var mouseCenterOnToggle = false;
var mouseCenter;
var maxDist = 100;

var orbitOnToggle = false;
var capsOnToggle = true;
var strokeOnToggle = false;
var strokeW = 1.1;

var sidesType = 2;
var alignMode = 1;

let enableOrbit = true;

var saveMode = 0;
var recording = false;

var cwidth, cheight
var recMessageOn = false;
var frate = 30;
var recordedFrames = 0;
var numFrames = 300;

var thisDensity = 1;
var selFont = 0;

function preload(){
  tFont[0] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[1] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[2] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[3] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[4] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[5] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[6] = loadFont('assets/NotoSansSC-Regular.ttf');
  // tFont[7] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[7] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[8] = loadFont('assets/NotoSansSC-Regular.ttf');
  cnFontData = loadBytes('assets/NotoSansSC-Regular.ttf');

  tFontData[0] = loadBytes("boost_resources/Milligram-Medium.ttf");
  tFontData[1] = loadBytes("boost_resources/Milligram-Condensed-Bold.ttf");
  tFontData[2] = loadBytes("boost_resources/GT-America-Extended-Black-Trial.otf");
  tFontData[3] = loadBytes("boost_resources/GT-Alpina-Condensed-Light-Trial.otf");
  tFontData[4] = loadBytes("boost_resources/NeueWorld-CondensedRegular.ttf");
  tFontData[5] = loadBytes("boost_resources/FormulaCondensed-Black.otf");
  tFontData[6] = loadBytes("boost_resources/InstrumentSerif-Italic.ttf");
  // tFontData[7] = loadBytes("boost_resources/Zaatar-Bold.otf");
  tFontData[7] = loadBytes("boost_resources/Ko_Banzeen-SlantedL.otf");
  tFontData[8] = loadBytes("boost_resources/ZafranArabic-Black.otf");

  tFontFactor[0] = 0.73;
  tFontFactor[1] = 0.75;
  tFontFactor[2] = 0.7; 
  tFontFactor[3] = 0.675; 
  tFontFactor[4] = 0.7;
  tFontFactor[5] = 0.82;
  tFontFactor[6] = 0.75;
  tFontFactor[7] = 0.95;
  tFontFactor[8] = 0.5;
}

function setup(){
  createCanvas(windowWidth, windowHeight, WEBGL);

  thisDensity = pixelDensity();

  cwidth = width;
  cheight = height;

  mouseCenter = createVector(0, 0);

  for(var m = 0; m < fontCount; m++){
    myFont[m] = opentype.parse(tFontData[m].bytes.buffer);
  }
  cnOutlineFont = opentype.parse(cnFontData.bytes.buffer);

  wWindowMin = width/8,
  wWindowMax = width;
  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);

  textColor = color('#ffffff');
  strokeColor = color('#000000');
  bkgdColor = color('#000000');
  sideSolidColor = color('#f26666');

  colorSet[0] = color('#ffffff');
  colorSet[1] = color('#4e7cd9');
  colorSet[2] = color('#02733e');
  colorSet[3] = color('#f23030');
  colorSet[4] = color('#f26666');

  frameRate(frate);
  curveDetail(res);

  strokeJoin(ROUND);
  strokeCap(ROUND);
  rectMode(CENTER);

  document.getElementById("textArea").value = starterText;
  setText();

  const uiElement = select('#widget'); // replace with your HTML element's ID or class
  uiElement.mouseOver(() => enableOrbit = false);
  uiElement.mouseOut(() => enableOrbit = true);
}

function draw(){
  if(extrudeType == 0){
    ortho();
  } else {
    perspective();
  }

  background(bkgdColor);

  if(enableOrbit && orbitOnToggle){
    orbitControl();
  }

  push();
    // noFill();
    // stroke(255, 0, 0);
    // line(0, -500, 0, 500);
    // line(-500, 0, 500,0);
    coreBase.run();
  pop();

  // fill(0,0,255);
  // textSize(20);
  // textFont(tFont[0]);
  // text(round(frameRate()), -width/2 + 50, height/2 - 50);

  runRecording();
}

function mousePressed(){
  if(mouseCenterOnToggle && enableOrbit){
    mouseCenter.set(mouseX - width/2, mouseY - height/2);

    coreBase.liveReset();
    coreBase.tickerReset();
  }
}

function quadLerp(p0, p1, p2, t){
  return ((1-t)*(1-t)) * p0 + 2 * ((1-t) * t * p1) + t * t * p2;
}

function windowResized(){
  resizeForPreview();
}

function resizeForPreview(){
  var tempWidth, tempHeight;

  if(saveMode == 0){
    resizeCanvas(windowWidth, windowHeight, WEBGL);
  } else if(saveMode == 1){
    if(windowWidth > windowHeight * 9/16){
      tempHeight = windowHeight;
      tempWidth = windowHeight * 9/16;
    } else {
      tempWidth = windowWidth;
      tempHeight = windowWidth * 16/9;
    }
    resizeCanvas(tempWidth, tempHeight, WEBGL);
  } else if(saveMode == 2){
    if(windowWidth < windowHeight){
      tempWidth = windowWidth;
      tempHeight = windowWidth;
    } else {
      tempHeight = windowHeight;
      tempWidth = windowHeight;
    }
    resizeCanvas(tempWidth, tempHeight, WEBGL);
  }

  cwidth = width;
  cheight = height;

  wWindowMin = width/8,
  wWindowMax = width;
  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);

  setText();
}

function resizeForSave(){
  if(saveMode == 0){
    resizeCanvas(windowWidth, windowHeight, WEBGL);
  } else if(saveMode == 1){
    resizeCanvas(1080, 1920, WEBGL);
  } else if(saveMode == 2){
    resizeCanvas(1080, 1080, WEBGL);
  }

  wWindowMin = width/8,
  wWindowMax = width;
  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);

  setText();
}

function containsCJK(value){
  return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
}
