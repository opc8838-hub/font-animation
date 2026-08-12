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
var pgTextSize = 90;
var lineHeight = pgTextSize * 0.8;
var bkgdColor, foreColor, fadeColor;

var keyText;
var keyArray = [];

var main = "DANGER";

var groupCount = 7;
var kineticGroups = [];

var budgeCenter = [];
var fullHeight = 0;

let cwidth, cheight;
let cXadjust, cYadjust;
let widthHold, heightHold;
let cScale = 1;

let encoder;

const frate = 30; // frame rate
var numFrames = 105; // num of frames to record
let recording = false;
let recordedFrames = 0;
let recMessageOn = false;

let currentFont;
var currentFontIndex = 0;
let saveSizeState = 0;
let horzSpacer;
var newWidth;

var frameFade = 3;

var thisDensity;

var widgetOn = true;

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
}

function setup(){
  stgConfigurePerformance();
  stgMountCanvas(createCanvas(stgCanvasAreaWidth(), stgCanvasAreaHeight()));
  cwidth = int(width);
  cheight = int(height);

  thisDensity = pixelDensity();

  widthHold = width;
  heightHold = height;

  pgTextSize = width/11;
  document.getElementById("fontSize").value = pgTextSize;
  lineHeight = pgTextSize * 0.8;

  if(width < 600){
    document.getElementById("textArea").value = "THIS\nAND\nTHEN\nTHAT\nAND\nNOW\nTHIS";
  } else if(width > 1300){
    document.getElementById("textArea").value = "CHANGES\nchanges";
  } else {
    document.getElementById("textArea").value = "ONE\nFINAL\nPERFECT\nFUTURE";
  }

  bkgdColor = color('#000000');
  foreColor = color('#FFFFFF');
  fadeColor = color('#FFFFFF');
  currentFont = tFont[0];
  newWidth = widthHold;
  newHeight = heightHold;
  horzSpacer = widthHold/2;
  cXadjust = 0;
  cYadjust = 0;

  frameRate(frate);
  // Uploaded cutouts are scaled every frame; bilinear filtering keeps their edges clean without pixel grain.
  smooth();
  textureMode(NORMAL);

  setText();
}

function draw(){
  background(bkgdColor);

  push();
    if(recording){
      scale(cScale);
      translate(cXadjust, cYadjust);
    }
    stgDrawMediaLayer({ layer: "behind", width: widthHold, height: heightHold, phase: (frameCount % numFrames) / numFrames });
    translate(widthHold/2, heightHold/2);
    
    if(!recording){
      stroke(foreColor);
      strokeWeight(frameFade);
      noFill();
      rectMode(CENTER);
      rect(0, 0, newWidth, newHeight);
    }
    
    translate(0, -fullHeight/2 + lineHeight);

    for(var p = 0; p < kineticGroups.length; p++){
      kineticGroups[p].update();
      kineticGroups[p].run();
    }
  pop();

  push();
    if(recording){
      scale(cScale);
      translate(cXadjust, cYadjust);
    }
    stgDrawMediaLayer({ layer: "front", width: widthHold, height: heightHold, phase: (frameCount % numFrames) / numFrames });
  pop();

  if (recording) {
    console.log('recording');
    encoder.addFrameRgba(drawingContext.getImageData(0, 0, encoder.width, encoder.height).data);
    recordedFrames++;
  }
  if (recordedFrames === numFrames) {
    recording = false;
    recordedFrames = 0;
    console.log('recording stopped');

    encoder.finalize();
    const uint8Array = encoder.FS.readFile(encoder.outputFilename);
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([uint8Array], { type: 'video/mp4' }));
    anchor.download = encoder.outputFilename;
    anchor.click();
    encoder.delete();

    setRecorder(); // reinitialize encoder

    toggleRecMessage();
  }

  if(frameFade > 0.2){
    frameFade -= 0.2;
  }
}

function resetAnim(){
  fullHeight = keyArray.length * lineHeight;

  for(var p = 0; p < groupCount; p++){
    // kineticGroups[p] = new KineticGroup(-horzSpacer * 2 + p * horzSpacer, 0, p);
    kineticGroups[p] = new KineticGroup(-horzSpacer * ((groupCount-1)/2) + p * horzSpacer, 0, p);
  }
}

function windowResized(){
  resizeCanvas(stgCanvasAreaWidth(), stgCanvasAreaHeight());
  
  widthHold = width;
  heightHold = height;

  sizeSaveChange(saveSizeState);
}

function setRecorder(){
  HME.createH264MP4Encoder().then(enc => {
    encoder = enc;
    encoder.outputFilename = 'STG_vSnap';
    encoder.pixelDensity = thisDensity;
    encoder.width = cwidth * thisDensity;
    encoder.height = cheight * thisDensity;
    encoder.frameRate = frate;
    encoder.kbps = 50000; // video quality
    encoder.groupOfPictures = 5; // lower if you have fast actions.
    encoder.initialize();
  })
}
