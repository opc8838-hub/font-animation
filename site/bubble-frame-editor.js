/* CellMotion editor surfaces; composition state and drawing stay in the effect. */
(() => {
  const $=id=>document.getElementById(id),body=document.body;
  const card=$('text').closest('.gm-card'),pause=$('pauseEdit');
  const color=$('textColor').closest('label'),swatches=document.querySelector('.ink-color-swatches');
  const toolbar=document.createElement('div');toolbar.className='bf-row-tools';
  pause.before(color,swatches,toolbar);toolbar.append(pause);
  const background=document.createElement('details');background.className='bf-disclosure';background.id='screenSettings';
  background.innerHTML='<summary><i id="screenSwatch" aria-hidden="true"></i><span data-zh="屏幕背景" data-en="Screen background">屏幕背景</span></summary><div class="bf-disclosure-body"></div>';
  const backgroundBody=background.lastElementChild;
  backgroundBody.append($('backgroundColor').closest('label'),document.querySelector('.ink-paper-swatches'));
  const video=document.querySelector('.ink-background-card');video.classList.remove('gm-card');backgroundBody.append(video);card.append(background);
  const type=document.createElement('details');type.className='bf-disclosure';
  type.innerHTML='<summary><span data-zh="字体与排版" data-en="Typography">字体与排版</span></summary><div class="bf-disclosure-body"></div>';
  for(const id of ['letterStyle','font','size','tracking','lineSpacing'])type.lastElementChild.append($(id).closest('.tp-field'));
  background.before(type);
  const film=document.createElement('canvas');film.id='backgroundFilmstrip';film.width=480;film.height=64;film.setAttribute('aria-label','Video frames');$('backgroundVideoName').after(film);
  const nav=document.querySelector('.tc-row-select');
  nav.addEventListener('click',()=>{document.querySelector('[data-tab="content"]').click();pause.click();$('text').focus({preventScroll:true});});
  function sync(){
    const state=CellMotionBubbleFrame.state();$('screenSwatch').style.background=state.backgroundColor;
    const selected=document.querySelector('.tc-row-text');selected.textContent=state.text.replace(/\s+/g,' ').trim()||(body.dataset.editorLanguage==='en'?'Bubble lettering':'泡泡文字');
    selected.removeAttribute('data-zh');selected.removeAttribute('data-en');
    document.dispatchEvent(new Event('tc-controls-synced'));
  }
  document.addEventListener('bubble-controls-synced',sync);sync();
  const preferenceKey='cellmotion-bubble-editor-preferences';
  let preferences={};try{preferences=JSON.parse(localStorage.getItem(preferenceKey))||{};}catch{}
  for(const [key,id] of [['theme','theme'],['language','language']]){
    const attribute=key==='theme'?'editorTheme':'editorLanguage';
    if(preferences[key]&&preferences[key]!==body.dataset[attribute])$(id).click();
    $(id).addEventListener('click',()=>{preferences[key]=body.dataset[attribute];localStorage.setItem(preferenceKey,JSON.stringify(preferences));sync();document.dispatchEvent(new Event('tc-languagechange'));});
  }
})();
