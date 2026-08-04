function setText(){
  var enteredText = document.getElementById("textArea").value;
  
  inputText = "";
  inputText = enteredText.match(/[^\r\n]+/g);

  if(enteredText == ""){
    print("SHORT EXECUTED! and inputText is " + inputText);
    inputText = [];
    inputText[0] = " ";
  }

  coreCount = inputText.length;

  findMaxSize();

  createAnimation();
}

function findMaxSize(){
  var leading = 10;

  var testerSize = 100;
  textSize(testerSize);
  textFont(tFont[selFont]);
  
  ///////// FIND THE LONGEST LINE
  var longestLine = 0;
  var measurer = 0;

  for(var m = 0; m < inputText.length; m++){
    var tapeMeasurer = textWidth(inputText[m]);

    if(tapeMeasurer > measurer){
      longestLine = m;
      measurer = tapeMeasurer;
    }
  }
  // print("LONGLEST LINE IS:" + longestLine + " which reads: " + inputText[longestLine]);

  ///////// FIND THE SIZE THAT FILLS TO THE MAX WIDTH
  var widthTest = wWindow;

  let sizeHolder = 2;
  textSize(sizeHolder);
  let holdW = 0;

  while(holdW < widthTest){
    textSize(sizeHolder);
    holdW = textWidth(inputText[longestLine]);

    sizeHolder += 2;
  }
  pgTextSize = sizeHolder;

  ///////// MAKE SURE THE HEIGHT DOESN'T BRAKE THE HEIGHT
  var heightTest = (height - 100) - (inputText.length - 1) * leading;
  let holdH = inputText.length * sizeHolder * tFontFactor[selFont];
  while(holdH > heightTest){
    holdH = inputText.length * sizeHolder * tFontFactor[selFont];
    sizeHolder -= 2;
  }
  pgTextSize = sizeHolder;

  textSize(pgTextSize);
  fullH = inputText.length * pgTextSize * tFontFactor[selFont] + (inputText.length - 1) * leading;
  fullW = textWidth(inputText[longestLine]);
}

function setAlignMode(val){
  alignMode = val;

  setText();
}

function createAnimation(){
  coreBase = null;
  coreBase = new TumbleBase();
}

function setFont(val){
  selFont = val;

  setText();
}

function setScaler(val){
  scaler = map(val, 0, 100, 0.1, 1);

  wWindow = map(scaler, 0, 1, wWindowMin, wWindowMax);
  
  setText();
}

function setExtrudeType(val){
  extrudeType = val;

  if(extrudeType == 0){
    document.getElementById('tumbleSet').style.display = "block";
    document.getElementById('zoomSet').style.display = "none";
    document.getElementById('punchSet').style.display = "none";

  } else if(extrudeType == 1){
    document.getElementById('tumbleSet').style.display = "none";
    document.getElementById('zoomSet').style.display = "block";
    document.getElementById('punchSet').style.display = "none";

  } else {
    maxDelay = -5;
    document.getElementById('maxDelay').value = map(maxDelay, 0, -90, 0, 100);
    stageAstrength = 3;
    document.getElementById('stageAstrength').value = stageAstrength;
    stageAdirect = 1;
    document.getElementById('stageAdirect').value = stageAdirect;

    document.getElementById('tumbleSet').style.display = "none";
    document.getElementById('zoomSet').style.display = "none";
    document.getElementById('punchSet').style.display = "block";
    
    coreBase.tickerReset();
  }

  coreBase.liveReset();
}

function setMouseCenterOn(){
  mouseCenterOnToggle = !mouseCenterOnToggle;

  if(mouseCenterOnToggle == false){
    mouseCenter.set(0, 0);
  }

  coreBase.tickerReset();
}

function setTumbleDepthLength(val){
  tumbleDepthLength = map(val, 0, 100, 0, -150);

  coreBase.liveReset();
}

function setTumbleAmount(val){
  tumbleAmount = map(val, 0, 100, 0, 2);

  coreBase.liveReset();
}

function setZoomDepthLength(val){
  zoomDepthLength = map(val, 0, 100, 0, -1000);

  coreBase.liveReset();
}

function setPunchDepthLength(val){
  punchDepthLength = map(val, 0, 100, 0, -150);

  coreBase.liveReset();
}

function setPunchDistance(val){
  punchDistance = map(val, 0, 100, 0, 200);

  coreBase.liveReset();
}

function setPunchInvert(){
  punchInvert = !punchInvert;

  coreBase.tickerReset();
}

function setMaxDelay(val){
  maxDelay = map(val, 0, 100, 0, -90);

  coreBase.tickerReset();
}

function setStageAdirect(val){
  stageAdirect = val;
}

function setStageAstrength(val){
  stageAstrength = val;
}

function setStageAlength(val){
  baseAnimA = round(map(val, 0, 100, 10, 200));

  setAnimStages();
}

function setStageBdirect(val){
  stageBdirect = val;
}

function setStageBstrength(val){
  stageBstrength = val;
}

function setStageBlength(val){
  baseAnimC = round(map(val, 0, 100, 10, 200));

  setAnimStages();
}

function setPauseLength(val){
  baseAnimB = round(map(val, 0, 100, 0, 100));

  setAnimStages();
}

function setAnimStages(){
  animA = baseAnimA;
  animB = baseAnimA + baseAnimB;
  animC = baseAnimA + baseAnimB + baseAnimC;
}

function setCapsOn(){
  capsOnToggle = !capsOnToggle;

  if(capsOnToggle){
    document.getElementById('capsOptions').style.display = "block";
  } else {
    document.getElementById('capsOptions').style.display = "none";
  }
}

function setStrokeOn(){
  strokeOnToggle = !strokeOnToggle;

  if(strokeOnToggle){
    document.getElementById('strokeOptions').style.display = "block";
  } else {
    document.getElementById('strokeOptions').style.display = "none";
  }
}

function setStrokeWeight(val){
  strokeW = map(val, 0, 100, 0, 10);
}

function setForeColor(val){
  foreColor = color(val);

  for(var m = 0; m < spokes.length; m++){
    spokes[m].reColor();
  }
}
function setBkgdColor(val){ bkgdColor = color(val); }
function setTextColor(val){ textColor = color(val); }
function setStrokeColor(val){ strokeColor = color(val); }
function setSideSolidColor(val){ sideSolidColor = color(val); }

function setOrbitOn(){
  orbitOnToggle = !orbitOnToggle;

  if(orbitOnToggle == false){
    print("RESET VIEW!");
    camera();
  }
}


function setColorSet(index, val){
  colorSet[index] = color(val);
}

function setSidesType(val){
  sidesType = val;

  document.getElementById('sidesOptionsTrans').style.display = "none";
  document.getElementById('sidesOptionsSolid').style.display = "none";
  document.getElementById('sidesOptionsRandom').style.display = "none";
  document.getElementById('sidesOptionsTexture').style.display = "none";

  if(val == 0){
    document.getElementById('sidesOptionsTrans').style.display = "block";
  } else if(val == 1){
    document.getElementById('sidesOptionsSolid').style.display = "block";
  } else if(val == 2){
    document.getElementById('sidesOptionsRandom').style.display = "block";
  } else {
    document.getElementById('sidesOptionsTexture').style.display = "block";
  }
}

function sizeSaveChange(val){
  saveMode = val;
  resizeForPreview();
}

function generateRandomPalette(){
  var rs0 = random(80);
  var holdCol = [];
  var holdBkgd, holdStroke, holdText;

  if(rs0 < 10){           ////////// CHECK
    print("p: 1 GOOD");
    holdCol[0] = ('#484fd9');
    holdCol[1] = ('#3f52bf');
    holdCol[2] = ('#7ef25e');
    holdCol[3] = ('#f2f2f2');
    holdCol[4] = ('#000000');
    holdBkgd = ('#ffffff');
    holdText = ('#f2f2f2');
    holdStroke = ('#000000');
  } else if(rs0 < 20){           ////////// CHECK
    print("p: 2 GOOD");
    holdCol[0] = ('#f20530');
    holdCol[1] = ('#0367a6');
    holdCol[2] = ('#038c65');
    holdCol[3] = ('#f29f05');
    holdCol[4] = ('#f20505');
    holdBkgd = ('#ffffff');
    holdText = ('#000000');
    holdStroke = ('#000000');
  } else if(rs0 < 30){           ////////// CHECK
    print("p: 3 GOOD");
    holdCol[0] = ('#0597F2');
    holdCol[1] = ('#05c7F2');
    holdCol[2] = ('#f2e205');
    holdCol[3] = ('#f2cb05');
    holdCol[4] = ('#f2220f');
    holdBkgd = ('#f2220f');
    holdText = ('#000000');
    holdStroke = ('#000000');
  } else if(rs0 < 40){      ////// CHECK
    print("p: 4 GOOD");
    holdCol[0] = ('#4f2859');
    holdCol[1] = ('#4ed9cb');
    holdCol[2] = ('#d93814');
    holdCol[3] = ('#d9cd30');
    holdCol[4] = ('#37a6a6');
    holdBkgd = ('#4ed9cb');
    holdText = ('#ffffff');
    holdStroke = ('#5e5e5e');
  } else if(rs0 < 50){      ////// CHECK
    print("p: 5 GOOD");
    holdCol[0] = ('#1c2840');
    holdCol[1] = ('#f2f1f0');
    holdCol[2] = ('#797f8c');
    holdCol[3] = ('#bfbfbf');
    holdCol[4] = ('#3c4659');
    holdBkgd = ('#1c2840');
    holdText = ('#ffffff');
    holdStroke = ('#000000');
  } else if(rs0 < 60){      ////////// CHECK
    print("p: 6 GOOD");
    holdCol[0] = ('#f2359d');
    holdCol[1] = ('#4ab8d9');
    holdCol[2] = ('#5ea65b');
    holdCol[3] = ('#f2d43d');
    holdCol[4] = ('#ffffff');
    holdBkgd = ('#000000');
    holdText = ('#000000');
    holdStroke = ('#ffffff');
  } else if(rs0 < 70){      ////// CHECK
    print("p: 7 GOOD");
    holdCol[0] = ('#95acbf');
    holdCol[1] = ('#f2a663');
    holdCol[2] = ('#d92d07');
    holdCol[3] = ('#400101');
    holdCol[4] = ('#f2f2f2');
    holdBkgd = ('#c2c2c2');
    holdText = ('#ffffff');
    holdStroke = ('#000000');
  } else if(rs0 < 80){      ////// CHECK
    print("p: 8 GOOD");
    holdCol[0] = ('#8c8c8b');
    holdCol[1] = ('#141414');
    holdCol[2] = ('#424242');
    holdCol[3] = ('#707070');
    holdCol[4] = ('#444444');
    holdBkgd = ('#000000');
    holdText = ('#212121');
    holdStroke = ('#00ff97');
  }
  document.getElementById('bkgdColor').value = holdBkgd;
  document.getElementById('textColor').value = holdText;
  document.getElementById('strokeColor').value = holdStroke;

  document.getElementById('quint0color').value = holdCol[0];
  document.getElementById('quint1color').value = holdCol[1];
  document.getElementById('quint2color').value = holdCol[2];
  document.getElementById('quint3color').value = holdCol[3];
  document.getElementById('quint4color').value = holdCol[4];

  bkgdColor = holdBkgd;
  textColor = holdText;
  strokeColor = holdStroke;
  for(var m = 0; m < 5; m++){
    colorSet[m] = color(holdCol[m]);
  }
}

function hideWidget(){
  widgetOn = !widgetOn;

  if(widgetOn){
    document.getElementById('widget').style.display = "block";
  } else {
    document.getElementById('widget').style.display = "none";
  }
}
