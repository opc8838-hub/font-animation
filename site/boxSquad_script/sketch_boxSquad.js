var bkgdColor, foreColor;
var colorSet = [];       
var colorSetFull = [];     
var colorSetBW   = [];     
var pantCol, shirtCol, bodyCol, shoeCol;
var debugStroke = false; 
var twerkMode   = false;  
var bwMode      = false;  
var checkerMode = false;  
var squadText = '中文动效';

var boxSquads = [];

var BOX_COLS = 4;
var BOX_ROWS = 4;
var BOX_TARGET = 320;

function setup(){
  createCanvas(windowWidth, windowHeight);

  if(windowWidth <= 600){
    BOX_COLS = 2;
    BOX_ROWS = 3;
  } else {
    BOX_COLS = Math.max(1, Math.round(width  / BOX_TARGET));
    BOX_ROWS = Math.max(1, Math.round(height / BOX_TARGET));
  }

  bkgdColor = color('#ffffff');
  foreColor = color('#000000');
  colorSetFull[0] = color('#f2aec7');
  colorSetFull[1] = color('#5080bf');
  colorSetFull[2] = color('#f2b441');
  colorSetFull[3] = color('#f24535');
  colorSetFull[4] = color('#40bf72');
  colorSetFull[5] = color('#000000');

  colorSetBW[0] = color('#ffffff');
  colorSetBW[1] = color('#000000');

  colorSet = bwMode ? colorSetBW : colorSetFull;

  pantCol  = color('#000000');  
  shirtCol = color('#ffffff');  
  shoeCol  = color('#000000');  
  bodyCol  = foreColor;         

  buildGrid();
  syncGridUI();  
}

function buildGrid(){
  boxSquads = [];
  var cellW = width  / BOX_COLS;
  var cellH = height / BOX_ROWS;
  var seed  = Math.min(cellW, cellH);       
  for(var r = 0; r < BOX_ROWS; r++){
    for(var c = 0; c < BOX_COLS; c++){
      var b = new BoxSquad((c + 0.5) * cellW, (r + 0.5) * cellH, seed);
      b.place(c * cellW, r * cellH, (c + 1) * cellW, (r + 1) * cellH);
      boxSquads.push(b);
    }
  }
  wireNeighbors();
}

function layoutGrid(){
  if(boxSquads.length !== BOX_COLS * BOX_ROWS){ buildGrid(); return; }
  var cellW = width  / BOX_COLS;
  var cellH = height / BOX_ROWS;
  for(var r = 0; r < BOX_ROWS; r++){
    for(var c = 0; c < BOX_COLS; c++){
      boxSquads[r * BOX_COLS + c].place(c * cellW, r * cellH, (c + 1) * cellW, (r + 1) * cellH);
    }
  }
}


function wireNeighbors(){
  for(var r = 0; r < BOX_ROWS; r++){
    for(var c = 0; c < BOX_COLS; c++){
      var b = boxSquads[r * BOX_COLS + c];
      b.gridDark = ((r + c) % 2) === 1; 
      b.leftNeighbor = b.rightNeighbor = b.topNeighbor = b.bottomNeighbor = null;
      if(c > 0)            b.leftNeighbor   = boxSquads[r * BOX_COLS + c - 1];
      if(c < BOX_COLS - 1) b.rightNeighbor  = boxSquads[r * BOX_COLS + c + 1];
      if(r > 0)            b.topNeighbor    = boxSquads[(r - 1) * BOX_COLS + c];
      if(r < BOX_ROWS - 1) b.bottomNeighbor = boxSquads[(r + 1) * BOX_COLS + c];
    }
  }
}

function resetGrid(){
  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].resetPose();
}

function rerollGrid(){
  for(var i = 0; i < boxSquads.length; i++){
    var old = boxSquads[i];
    var nb  = new BoxSquad(0, 0, 1);  

    nb.place(old.homeLeft, old.homeTop, old.homeRight, old.homeBottom);
    nb._left = old.left; nb._right = old.right; nb._top = old.top; nb._bottom = old.bottom;
    nb.torsoCx = (nb._left + nb._right) / 2;
    nb.torsoCy = (nb._top  + nb._bottom) / 2;
    boxSquads[i] = nb;
  }
  wireNeighbors();
}

var GRID_MIN = 1;
var GRID_MAX = 40;

function adjustCols(delta){
  BOX_COLS = Math.max(GRID_MIN, Math.min(GRID_MAX, BOX_COLS + delta));
  buildGrid();
  syncGridUI();
  return BOX_COLS;
}

function adjustRows(delta){
  BOX_ROWS = Math.max(GRID_MIN, Math.min(GRID_MAX, BOX_ROWS + delta));
  buildGrid();
  syncGridUI();
  return BOX_ROWS;
}

function syncGridUI(){
  var c = document.getElementById('cols-val');
  var r = document.getElementById('rows-val');
  if(c) c.textContent = BOX_COLS;
  if(r) r.textContent = BOX_ROWS;
}


function setBWMode(on){
  bwMode = on;
  colorSet = bwMode ? colorSetBW : colorSetFull;
  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].applyPalette();
}

function draw(){
  background(bkgdColor);

  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].update();
  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].displayBox();
  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].display();

  push();
  textFont('STG Noto Sans SC');
  textAlign(CENTER, BOTTOM);
  textSize(Math.max(13, Math.min(width / BOX_COLS, height / BOX_ROWS) * 0.07));
  noStroke();
  fill(bwMode ? '#ffffff' : '#11110f');
  for(var j = 0; j < boxSquads.length; j++){
    var box = boxSquads[j];
    text(squadText, (box.left + box.right) / 2, box.bottom - 10);
  }
  pop();

  if(frameCount % 10 == 0){
    var el = document.getElementById('fps');
    if(el) el.textContent = Math.round(frameRate());
  }
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  layoutGrid();
}

function overPanel(mx, my){
  var el = document.getElementById('panel');
  if(!el) return false;
  var r = el.getBoundingClientRect();
  return mx >= r.left && mx <= r.right && my >= r.top && my <= r.bottom;
}

function mouseMoved(){
  if(overPanel(mouseX, mouseY)) return;
  for(var i = 0; i < boxSquads.length; i++){
    if(boxSquads[i].mouseMovedLimb(mouseX, mouseY)) return;
  }
  for(var i = 0; i < boxSquads.length; i++){
    if(boxSquads[i].mouseMovedEdge(mouseX, mouseY)) return;
  }
  cursor('default');
}

function mousePressed(){
  if(overPanel(mouseX, mouseY)) return;

  for(var i = 0; i < boxSquads.length; i++){
    if(boxSquads[i].mousePressedLimb(mouseX, mouseY)) return;
  }
  for(var i = 0; i < boxSquads.length; i++){
    if(boxSquads[i].mousePressedEdge(mouseX, mouseY)) return;
  }
}

function mouseDragged(){
  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].mouseDragged(mouseX, mouseY);
}

function mouseReleased(){
  for(var i = 0; i < boxSquads.length; i++) boxSquads[i].mouseReleased();
}
