function setText(val){
  var enteredText = document.getElementById("textArea").value;
  if(stgMedia.enabled && (stgMedia.layer === "inline" || stgMedia.assets.some(function(asset){ return asset.layer === "inline"; }))){
    enteredText = stgMediaEncodeTokens(enteredText);
  }
  keyText = enteredText;
  keyArray = enteredText.match(/[^\r\n]+/g);

  if(keyArray == null){
    keyArray = "";
  }

  selector = 0;
  pickScene();
}

function setSceneLength(val){
  sceneLength = int(val);
}

function setSceneMode(value, skipHistory){
  if(value === "shuffle"){
    sceneMode = -1;
  } else {
    sceneMode = flashScenes.findIndex(function(scene) { return scene.slug === value; });
  }

  updateFlashSceneUI();
  if(!skipHistory){
    var url = new URL(window.location.href);
    if(sceneMode >= 0){
      url.searchParams.set("scene", flashScenes[sceneMode].slug);
    } else {
      url.searchParams.delete("scene");
    }
    window.history.replaceState({}, "", url);
  }
  pickScene();
}

function updateFlashSceneUI(){
  var title = document.getElementById("activeSceneName");
  var shuffleControls = document.getElementById("flashShuffleControls");
  if(title) title.textContent = sceneMode >= 0 ? flashScenes[sceneMode].label : "随机混合";
  if(shuffleControls) shuffleControls.style.display = sceneMode >= 0 ? "none" : "block";
  document.title = sceneMode >= 0 ? "Flash · " + flashScenes[sceneMode].label + " | ME Motion Studio" : "Flash | ME Motion Studio";
}

function setFont(val){
  val = int(val);
  currentFontIndex = val;
  currentFont = tFont[val] || tFont[0];
  thisFontAdjust = 0.75;
  thisFontAdjustUp = 0;
  if(val == 0){
    thisFontAdjust = 0.7;
    thisFontAdjustUp = 0;
  } else if(val == 1){
    thisFontAdjust = 0.7;
    thisFontAdjustUp = 0;
  } else if(val == 2){
    thisFontAdjust = 0.75;
    thisFontAdjustUp = 0;
  } else if(val == 3){
    thisFontAdjust = 0.7;
    thisFontAdjustUp = 0;
  } else if(val == 4){
    thisFontAdjust = 0.75;
    thisFontAdjustUp = 0;
  } else if(val == 5){
    thisFontAdjust = 0.775;
    thisFontAdjustUp = 0;
  } else if(val == 6 || val == 7 || val == 9){
    thisFontAdjust = 0.74;
    thisFontAdjustUp = 0;
  } else if(val == 8){
    thisFontAdjust = 0.8;
    thisFontAdjustUp = 0;
  } else if(val == 10){
    thisFontAdjust = 0.82;
    thisFontAdjustUp = -0.04;
  } else if(val == 11){
    thisFontAdjust = 0.88;
    thisFontAdjustUp = 0;
  }
  setText();
}

function setFlashTextScale(value){
  flashTextScale = constrain(Number(value) / 100, 0.35, 1.6);
  var output = document.getElementById('flashTextScaleValue');
  if(output) output.textContent = Math.round(flashTextScale * 100) + '%';
  setText();
}

function setFlashTracking(value){
  flashTracking = Number(value) || 0;
  var output = document.getElementById('flashTrackingValue');
  if(output) output.textContent = flashTracking + ' px';
  setText();
}

function setSelectMode(val){
  displayMode = val;

  if(displayMode == 0){               // TEXT
    document.getElementById('textModeUI').style.display = "block";
    document.getElementById('textModeUI2').style.display = "flex";
  } else if(displayMode == 1){        // CLOCK
    document.getElementById('textModeUI').style.display = "none";
    document.getElementById('textModeUI2').style.display = "none";
    sceneLength = floor(frameRate()) + 2;
  }
}

function setAccelMode(val){
  accelMode = val;
  print(accelMode);
}

function setForeColor(val){
  foreColor = color(val);
}

function setBkgdColor(val){
  bkgdColor = color(val);
}

function hideWidget(){
  widgetOn = !widgetOn;
  stgSetEditorCollapsed(!widgetOn);

  if(widgetOn){
    document.getElementById('widget').style.display = "block";
  } else {
    document.getElementById('widget').style.display = "none";
  }
  setTimeout(resizeForPreview, 240);
}

function clearAllScenes(){
  for(var n = 0; n < flashCount; n++){
    sceneOn[n] = false;
  }
  document.getElementById('arcer').checked = false;
  document.getElementById('bend').checked = false;
  document.getElementById('box').checked = false;
  document.getElementById('bugeyes').checked = false;
  // document.getElementById('cloud').checked = false;
  // document.getElementById('grid').checked = false;
  document.getElementById('halo').checked = false;
  document.getElementById('risesun').checked = false;
  document.getElementById('shutters').checked = false;
  document.getElementById('shutters2').checked = false;
  document.getElementById('slotmachine').checked = false;
  document.getElementById('snap').checked = false;
  document.getElementById('split').checked = false;
  document.getElementById('starburst').checked = false;
  document.getElementById('twist').checked = false;

  sceneCount = 0;
}

function setScene(val){
  sceneOn[val] = !sceneOn[val];

  sceneCount = 0;
  for(var n = 0; n < flashCount; n++){
    if(sceneOn[n]){
      sceneCount++;
    }
  }
}

function toggleRecMessage(){
  recMessageOn = !recMessageOn;

  if(recMessageOn){
    document.getElementById('recStatus').style.display = "block";
  } else {
    document.getElementById('recStatus').style.display = "none";
  }
}

function setSceneRepeats(val){
  sceneRepeats = round(val);
}

function toggleColorSwap(){
  if(document.getElementById('colorSwap').checked){
    colorSwapOn = true;
  } else {
    colorSwapOn = false;
  }
}

function sizeSaveChange(val){
  saveMode = val;
  resizeForPreview();
}
