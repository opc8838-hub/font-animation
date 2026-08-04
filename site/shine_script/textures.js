//////////////////////////////////////////////
/////////////////////////////       DRAW
//////////////////////////////////////////////

//////////////////////////////////////////////
/////////////////////////////       TEXT
//////////////////////////////////////////////

function drawText(p){   // straight text
  var w = width;
  var h = height;
  pg[p] = createGraphics(w, h);
  pg[p].background(255);
  pg[p].noStroke();
  // pg[p].fill(colorSet[p%colorSet.length]);
  pg[p].fill(0);
  pg[p].textFont(tFont[selFont]);
  pg[p].textSize(pgTextSize);
  pg[p].textAlign(CENTER);
  pg[p].push();
    pg[p].translate(w/2, h/2);
    pg[p].translate(0, -(inputText.length - 1) * pgTextSize * tFontFactor[selFont]/2);
    for(var m = 0; m < inputText.length; m++){
      pg[p].push();
        pg[p].translate(0, m * pgTextSize * tFontFactor[selFont]);
        pg[p].text(inputText[m], 0, pgTextSize * tFontFactor[selFont]/2);
        // pg[p].fill(0,0,255);
        // pg[p].ellipse(0,0,10,10);
      pg[p].pop();
    }
  pg[p].pop();
}

function drawArabicText(p){   // straight text
  var w = width;
  var h = height;

  var arabicFont = opentype.parse(tFontData[selFont].bytes.buffer);

  pg[p] = createGraphics(w, h);
  pg[p].background(255);
  pg[p].noStroke();
  // pg[p].fill(colorSet[p%colorSet.length]);
  pg[p].fill(255);
  pg[p].textFont(tFont[selFont]);
  pg[p].textSize(pgTextSize);
  pg[p].textAlign(CENTER);

  pg[p].push();
    pg[p].translate(w/2, h/2);
    pg[p].translate(0, -(inputText.length - 1) * pgTextSize * tFontFactor[selFont]/2);
    for(var m = 0; m < inputText.length; m++){
      pg[p].push();
        pg[p].translate(0, m * pgTextSize * tFontFactor[selFont]);

        
        var pather = arabicFont.getPath(inputText[m], 0, 0, pgTextSize);
        var bbox = pather.getBoundingBox();
        pg[p].translate(-(bbox.x2 - bbox.x1)/2, (bbox.y2 - bbox.y1)/4);
        pather.draw(pg[p].drawingContext);

      pg[p].pop();
    }
  pg[p].pop();
}