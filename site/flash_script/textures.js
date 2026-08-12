//////////////////////////////////////////////
/////////////////////////////       STRIP
//////////////////////////////////////////////

function drawText(p, inp, tFont){   // straight text
  textSize(pgTextSize);
  textFont(tFont);
  var repeatSize = round(textWidth(inp)) + 100;

  pg[p] = createGraphics(repeatSize, pgTextSize);

  pg[p].background(bkgdColor);
  pg[p].fill(foreColor);

  pg[p].noStroke();
  pg[p].textSize(pgTextSize);
  pg[p].textAlign(CENTER);
  pg[p].textFont(tFont);
  pg[p].text(inp, pgStrip[p].width/2, pgStrip[p].height/2 + pgTextSize*0.7/2);
}

function flashFontForCharacter(character){
  var isCjk = /[\u3000-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(character);
  var selectedSupportsCjk = currentFontIndex === 0 || currentFontIndex === 1 || (currentFontIndex >= 22 && currentFontIndex <= 24);
  return isCjk && !selectedSupportsCjk ? tFont[0] : currentFont;
}

function flashInlineGlyphWidth(character, fontSizeValue){
  var mediaAsset = stgMediaAssetForCharacter(character);
  if(mediaAsset && stgMedia.enabled && mediaAsset.layer === "inline"){
    return stgMediaInlineWidth(fontSizeValue * 0.72, mediaAsset) + flashTracking;
  }
  textSize(fontSizeValue);
  textFont(flashFontForCharacter(character));
  return textWidth(character) + flashTracking;
}

function flashInlineTextWidth(value, fontSizeValue){
  var total = 0;
  for(var index = 0; index < value.length; index++){
    total += flashInlineGlyphWidth(value.charAt(index), fontSizeValue);
  }
  return total;
}

function flashDrawInlineText(target, value, centerX, baselineY, fontSizeValue){
  var totalWidth = flashInlineTextWidth(value, fontSizeValue);
  var cursor = centerX - totalWidth/2;
  target.push();
  target.textAlign(LEFT);
  for(var index = 0; index < value.length; index++){
    var character = value.charAt(index);
    var glyphWidth = flashInlineGlyphWidth(character, fontSizeValue);
    var mediaAsset = stgMediaAssetForCharacter(character);
    if(mediaAsset && stgMedia.enabled && mediaAsset.layer === "inline"){
      target.push();
      target.translate(cursor + glyphWidth/2, baselineY - fontSizeValue * 0.34);
      stgDrawInlineMediaToGraphics(target, fontSizeValue * 0.72, mediaAsset);
      target.pop();
    } else {
      target.textFont(flashFontForCharacter(character));
      target.text(character, cursor, baselineY);
    }
    cursor += glyphWidth;
  }
  target.pop();
}

function flashDrawInlineGlyph(character, x, baselineY, fontSizeValue, centered){
  var mediaAsset = stgMediaAssetForCharacter(character);
  if(mediaAsset && stgMedia.enabled && mediaAsset.layer === "inline"){
    var glyphWidth = flashInlineGlyphWidth(character, fontSizeValue);
    push();
    translate(x + (centered ? 0 : glyphWidth/2), baselineY - fontSizeValue * 0.34);
    stgDrawInlineMedia(glyphWidth, fontSizeValue * 0.72, mediaAsset);
    pop();
  } else {
    textFont(flashFontForCharacter(character));
    text(character, x, baselineY);
  }
}
