/*!
 * This file is part of Space Type Generator.
 * 
 * Copyright (c) Kiel Mutschelknaus
 * 
 * This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/ or send a letter to
 * Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
 */

var tFont = [];
var pgTextSize = 100;
var bkgdColor, foreColor;
var colorA = [];

var main;
var selector = 0;
var fullMainWidth;
var budgeCenter = 0;

var mainFlash;
var sceneLength = 30;

var starterText = "THE\nCOLLECTIVE\nPOWER\nOF\nTINY\nMOMENTS";
// var starterText = "الحركة\nبركة";

var rampCounter = 0;

var thisFont = 0;
var currentFontIndex = 0;
var thisFontAdjust = 0.7;
var thisFontAdjustUp = -0.2;
var flashTextScale = 1;
var flashTracking = 0;

var flashCount = 13;
var sceneOn = [];
var sceneCount = 13;
var sceneMode = -1;

var flashScenes = [
  { slug: "arc", label: "Arc / 弧线", create: function(slot, textValue) { return new Arcer(slot, textValue); } },
  { slug: "bend", label: "Bend / 弯折", create: function(slot, textValue) { return new Bend(slot, textValue); } },
  { slug: "box", label: "Box / 方框", create: function(slot, textValue) { return new Box(slot, textValue); } },
  { slug: "bug-eye", label: "Bug Eye / 虫眼", create: function(slot, textValue) { return accelMode == 0 ? new BugEyes(slot, textValue) : new BugEyesEE(slot, textValue); } },
  { slug: "halo", label: "Halo / 光环", create: function(slot, textValue) { return new Halo(slot, textValue); } },
  { slug: "sun", label: "Sun / 旭日", create: function(slot, textValue) { return new RiseSun(slot, textValue); } },
  { slug: "shutter-1", label: "Shutter 1 / 百叶窗一", create: function(slot, textValue) { return accelMode == 0 ? new Shutters(slot, textValue) : new ShuttersEE(slot, textValue); } },
  { slug: "shutter-2", label: "Shutter 2 / 百叶窗二", create: function(slot, textValue) { return new Shutters2(slot, textValue); } },
  { slug: "slots", label: "Slots / 滚轮", create: function(slot, textValue) { return new SlotMachine(slot, textValue); } },
  { slug: "snap", label: "Snap / 闪切", create: function(slot, textValue) { return new Snap(slot, textValue); } },
  { slug: "split", label: "Split / 分裂", create: function(slot, textValue) { return new Split(slot, textValue); } },
  { slug: "star", label: "Star / 星芒", create: function(slot, textValue) { return new Starburst(slot, textValue); } },
  { slug: "twist", label: "Twist / 扭转", create: function(slot, textValue) { return new Twist(slot, textValue); } }
];

var widgetOn = true;

let encoder;

const frate = 30;
var numFrames = 100;
let recording = false;
let recordedFrames = 0;

let sceneRepeats = 2;
let thisDensity = 2;

let cwidth, cheight;
let saveMode = 0;

let coreCounter = 0;
let recMessageOn = false;
let colorSwapOn = true;

let displayMode = 0;
let accelMode = 0;
let sHold = 0;

function preload(){
  tFont[0] = loadFont('assets/NotoSansSC-Regular.ttf');
  tFont[1] = loadFont('assets/NotoSansSC-Black.ttf');
  tFont[2] = loadFont('assets/fonts/SpaceGrotesk-Variable.ttf');
  tFont[3] = loadFont('assets/fonts/Lora-Variable.ttf');
  tFont[4] = loadFont('assets/fonts/MartianMono-Variable.ttf');
  tFont[5] = loadFont('assets/fonts/Fenix-Regular.ttf');
  tFont[6] = loadFont('assets/WorkSans-Regular.ttf');
  tFont[7] = loadFont('assets/SpaceMono-Bold.ttf');
  tFont[8] = loadFont('assets/Vollkorn-BoldItalic.ttf');
  tFont[9] = loadFont('assets/RobotoCondensed-Bold.ttf');
  tFont[10] = loadFont('assets/Cairo-Bold.ttf');
  tFont[11] = loadFont('assets/AguafinaScript-Regular.ttf');
  tFont[12] = loadFont('assets/fonts/Manrope-Variable.ttf');
  tFont[13] = loadFont('assets/fonts/LeagueSpartan-Variable.ttf');
  tFont[14] = loadFont('assets/fonts/Cinzel-Variable.ttf');
  tFont[15] = loadFont('assets/fonts/InstrumentSerif-Regular.ttf');
  tFont[16] = loadFont('assets/fonts/BebasNeue-Regular.ttf');
  tFont[17] = loadFont('assets/fonts/Poppins-Regular.ttf');
  tFont[18] = loadFont('assets/fonts/Rajdhani-Bold.ttf');
  tFont[19] = loadFont('assets/fonts/Teko-Variable.ttf');
  tFont[20] = loadFont('assets/fonts/Khand-Regular.ttf');
  tFont[21] = loadFont('assets/fonts/Fraunces-Variable.ttf');
  tFont[22] = loadFont('resources/NotoSansSC-Thin.otf');
  tFont[23] = loadFont('assets/NotoSansJP-Thin.otf');
  tFont[24] = loadFont('resources/NotoSansJP-Black.otf');
  tFont[25] = loadFont('resources/NotoSansKR-Black.otf');

  currentFont = tFont[0];
  thisFontAdjust = 0.7;
  thisFontAdjustUp = 0;
}

function setup(){
  stgConfigurePerformance();
  stgMountCanvas(createCanvas(stgCanvasAreaWidth(), stgCanvasAreaHeight(), WEBGL));

  for(var n = 0; n < flashCount; n++){
    sceneOn[n] = true;
  }

  if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){
    pixelDensity(1);

    sceneOn[1] = false;
    document.getElementById("bend").checked = false;
    sceneOn[2] = false;
    document.getElementById("box").checked = false;
    sceneOn[3] = false;
    document.getElementById("bugeyes").checked = false;
    sceneOn[4] = false;
    document.getElementById("halo").checked = false;
    sceneOn[5] = false;
    document.getElementById("risesun").checked = false;
    sceneOn[12] = false;
    document.getElementById("twist").checked = false;
  }

  cwidth = width;
  cheight = height;

  thisDensity = pixelDensity();

  bkgdColor = color('#ffffff');
  foreColor = color('#000000');
  colorA[0] = color('#f25835');
  colorA[1] = color('#0487d9');
  colorA[2] = color('#014029');
  colorA[3] = color('#f2ae30');
  colorA[4] = color('#f2aec1');

  // frameRate(10);
  frameRate(frate);
  textureMode(NORMAL);

  document.getElementById("textArea").value = starterText;
  var requestedScene = new URLSearchParams(window.location.search).get("scene");
  if(requestedScene){
    var requestedIndex = flashScenes.findIndex(function(scene) { return scene.slug === requestedScene; });
    if(requestedIndex >= 0){
      sceneMode = requestedIndex;
      document.getElementById("flashSceneSelect").value = requestedScene;
      updateFlashSceneUI();
    }
  }
  setText(starterText);
}

function draw(){
  background(bkgdColor);
  ortho(-width / 2, width / 2, -height / 2, height / 2, -10000, 10000);
  
  push();
    translate(-width/2, -height/2);
    var mediaPhase = (coreCounter % sceneLength) / sceneLength;
    stgDrawMediaLayer({ layer: "behind", width: width, height: height, phase: mediaPhase });
    mainFlash.update();
    mainFlash.display();
    stgDrawMediaLayer({ layer: "front", width: width, height: height, phase: mediaPhase });
  pop();

  runRecording();

  if(displayMode == 0){
    if((coreCounter+1) % sceneLength == 0){
      pickScene();
    }
  } else if(displayMode == 1){
    if(sHold != second()){
      pickScene();
      sHold = second();
    }
  }

  coreCounter ++;
}

function pickScene(){
  if(mainFlash != null){
    mainFlash.removeGraphics();
  }

  if(selector == keyArray.length){
    selector = 0;
  }

  var currentText = keyArray[selector];
  if(displayMode == 1){
    let h = hour();
    let m = minute();
    let s = second();
    m = checkTime(m);
    s = checkTime(s);

    var barrier = ":";
    if(currentFont == tFont[5]){
      barrier = ".";
    }

    currentText = h + barrier + m + barrier + s;
  }

  if(sceneMode >= 0){
    mainFlash = flashScenes[sceneMode].create(rampCounter%2, currentText);
  } else if(sceneCount == 0){
    mainFlash = new Blank(rampCounter%2, currentText);
  } else {
    var sceneSelecting = true;
    var rs0 = random(flashCount * 10);
    while(sceneSelecting){
      if(rs0 < 10 && sceneOn[0]){
        mainFlash = new Arcer(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 10 && rs0 < 20 && sceneOn[1]){
        mainFlash = new Bend(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 20 && rs0 < 30 && sceneOn[2]){
        mainFlash = new Box(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 30 && rs0 < 40 && sceneOn[3]) {
        if(accelMode == 0){
          mainFlash = new BugEyes(rampCounter%2, currentText);
        } else {
          mainFlash = new BugEyesEE(rampCounter%2, currentText);
        }
        sceneSelecting = false;
      } else if(rs0 > 40 && rs0 < 50 && sceneOn[4]){
        mainFlash = new Halo(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 50 && rs0 < 60 && sceneOn[5]){
        mainFlash = new RiseSun(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 60 && rs0 < 70 && sceneOn[6]){
        if(accelMode == 0){
          mainFlash = new Shutters(rampCounter%2, currentText);
        } else {
          mainFlash = new ShuttersEE(rampCounter%2, currentText);
        }
        sceneSelecting = false;
      } else if(rs0 > 70 && rs0 < 80 && sceneOn[7]){
        mainFlash = new Shutters2(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 80 && rs0 < 90 && sceneOn[8]){
        mainFlash = new SlotMachine(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 90 && rs0 < 100 && sceneOn[9]){
        mainFlash = new Snap(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 100 && rs0 < 110 && sceneOn[10]){
        mainFlash = new Split(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 110 && rs0 < 120 && sceneOn[11]){
        mainFlash = new Starburst(rampCounter%2, currentText);
        sceneSelecting = false;
      } else if(rs0 > 120 && rs0 <= 130 && sceneOn[12]) {
        mainFlash = new Twist(rampCounter%2, currentText);
        sceneSelecting = false;
      } else {
        rs0 = random(flashCount * 10);
      }
    }
  }

  if(colorSwapOn){
    if(random(10) < 3){
      var colorA = rgbToHex(foreColor.levels[0], foreColor.levels[1], foreColor.levels[2]);
      var colorB = rgbToHex(bkgdColor.levels[0], bkgdColor.levels[1], bkgdColor.levels[2]);
  
      foreColor = color(colorB);
      bkgdColor = color(colorA);
  
      document.getElementById('bColor').value = colorA;
      document.getElementById('fColor').value = colorB;
    }
  }

  rampCounter ++;
  selector ++;
}

function checkTime(i){
  if (i < 10) {i = "0" + i};
  return i;
}

function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function windowResized(){
  resizeForPreview();
}

function resizeForSave(){
  if(saveMode == 0){
    resizeCanvas(stgCanvasAreaWidth(), stgCanvasAreaHeight(), WEBGL);
  } else if(saveMode == 1){
    resizeCanvas(1080, 1920, WEBGL);
  } else if(saveMode == 2){
    resizeCanvas(1080, 1080, WEBGL);
  }
}

function resizeForPreview(){
  var tempWidth, tempHeight;
  var stageWidth = stgCanvasAreaWidth();
  var stageHeight = stgCanvasAreaHeight();

  if(saveMode == 0){
    resizeCanvas(stageWidth, stageHeight, WEBGL);
  } else if(saveMode == 1){
    if(stageWidth > stageHeight * 9/16){
      tempHeight = stageHeight;
      tempWidth = stageHeight * 9/16;
    } else {
      tempWidth = stageWidth;
      tempHeight = stageWidth * 16/9;
    }
    resizeCanvas(tempWidth, tempHeight, WEBGL);
  } else if(saveMode == 2){
    if(stageWidth < stageHeight){
      tempWidth = stageWidth;
      tempHeight = stageWidth;
    } else {
      tempHeight = stageHeight;
      tempWidth = stageHeight;
    }
    resizeCanvas(tempWidth, tempHeight, WEBGL);
  }

  cwidth = width;
  cheight = height;
}
