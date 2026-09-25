const $ = (selector) => document.querySelector(selector);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const categoryNames = {all:'全部动效',type:'文字排版',graphic:'图标与图形',media:'图片与媒体',flow:'流动与路径',space:'立体空间',physics:'物理粒子',pending:'待上新'};
const isPending = (effect) => effect?.status === 'pending';
function inCategory(effect, category) {
  if (category === 'pending') return isPending(effect);
  if (isPending(effect)) return false;
  return category === 'all' || effect.category === category;
}
const escapeHTML = (text) => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const mediaURL = (url) => `${url}?v=20260909-1`;
const play = async (video) => { try { await video.play(); return true; } catch { return false; } };
let effects = [], featured = [], activeCategory = 'all', limit = 12;
let activeUsage = 'all';
const ribbonSeed = [
  {id:'sproutshift',name:'字芽',href:'sproutshift.html',poster:'assets/cellmotion/poster-sproutshift.jpg',video:'assets/previews/sproutshift-wide-card.mp4'},
  {id:'iconburst',name:'图标爆发',href:'iconburst.html',poster:'assets/cellmotion/poster-iconburst.jpg?v=20260926-2',video:'assets/previews/iconburst-card.mp4?v=20260926-2'},
  {id:'typecascade',name:'字倾',href:'typecascade.html',poster:'assets/cellmotion/poster-typecascade.jpg',video:'assets/previews/typecascade-wide-card.mp4'},
  {id:'dotresolve',name:'点解',href:'dotresolve.html',poster:'assets/cellmotion/poster-dotresolve.jpg',video:'assets/previews/dotresolve-wide-card.mp4'},
  {id:'glyphmorph',name:'字融',href:'glyphmorph.html',poster:'assets/cellmotion/poster-glyphmorph.jpg',video:'assets/previews/glyphmorph-card.mp4'},
  {id:'currentwall',name:'水流',href:'currentwall.html',poster:'assets/cellmotion/poster-currentwall.jpg',video:'assets/previews/water-flow-card.mp4'},
  {id:'pathwriter',name:'轨书',href:'pathwriter.html',poster:'assets/cellmotion/poster-pathwriter.jpg',video:'assets/previews/pathwriter-card.mp4'},
  {id:'ribbonink',name:'流彩笔迹',href:'ribbonink.html',poster:'assets/cellmotion/poster-ribbonink.jpg',video:'assets/previews/ribbon-ink-card.mp4'}
];
const homePreview = $('#catalog-grid')?.dataset.homePreview === 'true';
const capabilityLabels = $('#catalog-grid')?.dataset.capabilityLabels === 'true';
let selected = 0, autoRotate = !reduced.matches, featuredIntent = !reduced.matches, featureVisible = false;
const hero = $('#hero-video'), featureVideo = $('#featured-video');
let heroIntent=!reduced.matches, heroVisible=false;

if (hero) {
  if(reduced.matches)hero.pause();
  const sync=()=>{$('#hero-toggle').textContent=hero.paused?'▶':'Ⅱ';$('#hero-toggle').setAttribute('aria-label',hero.paused?'播放品牌视频':'暂停品牌视频');};
  hero.addEventListener('play',sync);hero.addEventListener('pause',sync);sync();
  $('#hero-toggle').addEventListener('click',()=>{heroIntent=hero.paused;heroIntent?play(hero):hero.pause();});
  new IntersectionObserver(([entry])=>{heroVisible=entry.isIntersecting;if(heroVisible&&heroIntent&&!document.hidden)play(hero);else hero.pause();},{threshold:.15}).observe(hero);
}

function initRibbon() {
  const ribbon=$('#motion-ribbon');if(!ribbon)return;
  if(ribbon.dataset.ready==='true')return;
  ribbon.dataset.ready='true';
  const items=ribbonSeed.map(seed=>effects.find(effect=>effect.id===seed.id)||seed).filter(effect=>effect?.video && !isPending(effect));
  $('#ribbon-track').innerHTML=items.map(effect=>`<a class="ribbon-card${effect.id==='iconburst'?' is-portrait':''}" href="${effect.href}" aria-label="打开${escapeHTML(effect.name)}编辑器"><img src="${effect.poster}" alt="${escapeHTML(effect.name)}动效"><video data-src="${effect.video}" muted loop playsinline preload="none" aria-hidden="true"></video><span class="ribbon-name">${escapeHTML(effect.name)} ↗</span></a>`).join('');
  const cards=[...ribbon.querySelectorAll('.ribbon-card')];
  cards.forEach((card,index)=>{card.style.backgroundImage=`url("${items[index].poster}")`;});
  let width=ribbon.clientWidth, cardWidth=0, cardSizes=[], offset=0, previous=0, raf=0, visible=false, hovered=false, focused=false, enabled=!reduced.matches;
  const videos=cards.map(card=>card.querySelector('video'));
  videos.forEach((video,index)=>{
    const card=cards[index];
    video.addEventListener('playing',()=>{if(video.dataset.active==='true')card.classList.add('is-playing');});
    ['waiting','stalled','error','emptied'].forEach(type=>video.addEventListener(type,()=>card.classList.remove('is-playing')));
  });
  const running=()=>enabled&&visible&&!hovered&&!focused&&!document.hidden;
  function size(){width=ribbon.clientWidth;const maxHeight=Math.max(100,ribbon.clientHeight-28);cardWidth=Math.max(225,Math.min(370,width*.235));cardSizes=cards.map(card=>{const height=card.classList.contains('is-portrait')?Math.min(maxHeight,Math.min(260,width*.6)):Math.min(cardWidth*.64,maxHeight);const cardWidthForCard=card.classList.contains('is-portrait')?height*9/16:height/.64;card.style.width=`${cardWidthForCard}px`;card.style.height=`${height}px`;card.style.top=`${Math.max(8,(ribbon.clientHeight-height)/2)}px`;return {width:cardWidthForCard,height};});}
  function update(time=0){
    raf=0;
    const active=running();
    if(active&&previous)offset+=(Math.min(50,time-previous)/1000)*25;
    previous=time;
    const gap=18,total=cardSizes.reduce((sum,size)=>sum+size.width+gap,0);let cursor=0;
    const centers=cardSizes.map(size=>{const center=cursor+size.width/2;cursor+=size.width+gap;return center;});
    cards.forEach((card,i)=>{
      const size=cardSizes[i];
      const x=((centers[i]-offset+total/2)%total+total)%total-total/2;
      const n=x/(width*.5), visibleCard=Math.abs(x)<width*.5+size.width*.6;
      card.style.visibility=visibleCard?'visible':'hidden';
      card.style.transform=`translateX(${x-size.width/2}px) translateY(${-Math.min(1.8,n*n)*17}px) perspective(1050px) rotateY(${-n*19}deg) scaleY(${1+Math.min(1.8,n*n)*.23})`;
      const video=videos[i], shouldPlay=visibleCard&&active;
      if(shouldPlay&&video.dataset.active!=='true'){
        video.dataset.active='true';if(!video.getAttribute('src'))video.src=mediaURL(video.dataset.src);
        play(video).then(()=>{if(video.dataset.active!=='true')video.pause();});
      }else if(!shouldPlay){video.dataset.active='false';video.pause();card.classList.remove('is-playing');}
    });
    if(active)raf=requestAnimationFrame(update);
  }
  function refresh(){cancelAnimationFrame(raf);previous=0;update();}
  const toggle=$('#ribbon-toggle');
  toggle.textContent=enabled?'Ⅱ 暂停轮转':'▶ 播放轮转';toggle.setAttribute('aria-pressed',String(enabled));
  toggle.addEventListener('click',()=>{enabled=!enabled;toggle.textContent=enabled?'Ⅱ 暂停轮转':'▶ 播放轮转';toggle.setAttribute('aria-pressed',String(enabled));refresh();});
  ribbon.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hovered=true;refresh();}});
  ribbon.addEventListener('pointerleave',()=>{hovered=false;refresh();});
  ribbon.addEventListener('focusin',()=>{focused=true;refresh();});
  ribbon.addEventListener('focusout',event=>{if(!ribbon.contains(event.relatedTarget)){focused=false;refresh();}});
  new ResizeObserver(()=>{size();refresh();}).observe(ribbon);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;refresh();},{threshold:.1}).observe(ribbon);
  document.addEventListener('visibilitychange',refresh);
  size();refresh();
}

function syncFeatureControls() {
  $('#featured-toggle').textContent=featureVideo.paused?'▶':'Ⅱ';
  $('#featured-toggle').setAttribute('aria-label',featureVideo.paused?'播放精选预览':'暂停精选预览');
  $('#rotation-toggle').textContent=`自动轮播 · ${autoRotate?'开':'关'}`;
  $('#rotation-toggle').setAttribute('aria-pressed',String(autoRotate));
}
function selectFeature(index, manual=false) {
  selected=(index+featured.length)%featured.length;
  const effect=featured[selected];
  if(manual){autoRotate=false;featuredIntent=true;}
  featureVideo.pause();
  featureVideo.src=mediaURL(effect.video);
  if(effect.poster)featureVideo.poster=effect.poster;else featureVideo.removeAttribute('poster');
  $('#featured-name').textContent=effect.name;
  $('#featured-en').textContent=effect.english.toUpperCase();
  $('#featured-description').textContent=effect.description;
  $('#featured-open').href=effect.href;
  featureVideo.setAttribute('aria-label',`${effect.name}动效预览`);
  $('#featured-progress').style.width='0%';
  $('#featured-error').hidden=true;
  document.querySelectorAll('.featured-choice').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===selected)));
  if(featuredIntent&&(featureVisible||manual)&&!document.hidden)play(featureVideo);
  syncFeatureControls();
}
function initFeatured() {
  if(!featureVideo)return;
  $('#featured-list').innerHTML=featured.map((effect,i)=>`<button class="featured-choice" data-index="${i}" aria-pressed="${i===0}"><span class="choice-number">${String(i+1).padStart(2,'0')}</span><span><span class="choice-name">${escapeHTML(effect.name)}</span><span class="choice-en">${escapeHTML(effect.english)}</span></span><span class="choice-arrow" aria-hidden="true">↗</span></button>`).join('');
  $('#featured-list').addEventListener('click',event=>{const button=event.target.closest('[data-index]');if(button)selectFeature(Number(button.dataset.index),true);});
  featureVideo.addEventListener('ended',()=>{if(autoRotate){selectFeature(selected+1);}else{featuredIntent=false;syncFeatureControls();}});
  featureVideo.addEventListener('timeupdate',()=>{$('#featured-progress').style.width=`${Number.isFinite(featureVideo.duration)?100*featureVideo.currentTime/featureVideo.duration:0}%`;});
  featureVideo.addEventListener('play',syncFeatureControls);featureVideo.addEventListener('pause',syncFeatureControls);
  featureVideo.addEventListener('error',()=>{$('#featured-error').hidden=false;featuredIntent=false;syncFeatureControls();});
  $('#featured-toggle').addEventListener('click',()=>{featuredIntent=featureVideo.paused;if(featuredIntent){if(featureVideo.ended)featureVideo.currentTime=0;play(featureVideo);}else featureVideo.pause();});
  $('#rotation-toggle').addEventListener('click',()=>{autoRotate=!autoRotate;if(autoRotate){featuredIntent=true;if(featureVideo.ended)selectFeature(selected+1);else play(featureVideo);}syncFeatureControls();});
  selectFeature(0);
  new IntersectionObserver(([entry])=>{featureVisible=entry.isIntersecting;if(featureVisible&&featuredIntent&&!document.hidden)play(featureVideo);else featureVideo.pause();},{threshold:.2}).observe(featureVideo);
}

function syncCard(preview,playing) {
  preview.classList.toggle('playing',playing);
  const button=preview.querySelector('.card-play');
  if(button){button.textContent=playing?'Ⅱ':'▶';button.setAttribute('aria-pressed',String(playing));}
}
function stopCard(preview,{remember=false}={}) {
  if(!preview)return;
  preview.dataset.playRequest=String(Number(preview.dataset.playRequest||0)+1);
  if(remember)preview.dataset.userPaused='true';
  preview.querySelector('video')?.pause();syncCard(preview,false);
}
function stopAllCards() {
  document.querySelectorAll('.catalog-preview').forEach(preview=>stopCard(preview));
}
async function startCard(preview,{manual=false}={}) {
  const video=preview?.querySelector('video');if(!video)return;
  if(manual)delete preview.dataset.userPaused;
  if(!manual&&(reduced.matches||preview.dataset.userPaused==='true'||preview.dataset.visible!=='true'||document.hidden))return;
  const request=String(Number(preview.dataset.playRequest||0)+1);preview.dataset.playRequest=request;
  if(!video.getAttribute('src'))video.src=mediaURL(video.dataset.src);
  const success=await play(video);
  if(preview.dataset.playRequest!==request||(!manual&&preview.dataset.visible!=='true')){video.pause();return;}
  if(success)syncCard(preview,true);else stopCard(preview);
}
const cardsObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
    const preview=entry.target;preview.dataset.visible=String(entry.isIntersecting);
    if(entry.isIntersecting)startCard(preview);else stopCard(preview);
  }
},{threshold:.18});
function catalogCard(effect) {
  const pending=isPending(effect);
  const image=effect.poster?`<img src="${effect.poster}" alt="${escapeHTML(effect.name)}动效封面" loading="lazy">`:`<span class="poster-fallback">${escapeHTML(effect.name)}</span>`;
  const category=`<span class="card-category">${categoryNames[effect.category]||''}</span>`;
  if(pending){
    return `<article class="catalog-card is-pending" aria-disabled="true" aria-label="${escapeHTML(effect.name)}，待上新，未完成"><div class="catalog-preview">${image}${category}<span class="pending-cover">待上新，未完成</span></div><div class="card-caption"><div><h3>${escapeHTML(effect.name)}</h3><p>${escapeHTML(effect.english)}</p></div></div></article>`;
  }
  const video=effect.video?`<video data-src="${effect.video}" muted loop playsinline preload="none" aria-label="${escapeHTML(effect.name)}预览"></video>`:'';
  const play=effect.video?`<button class="card-play" aria-label="播放或暂停${escapeHTML(effect.name)}预览" aria-pressed="false">▶</button>`:'';
  return `<article class="catalog-card"><div class="catalog-preview"><a href="${effect.href}" aria-label="打开${escapeHTML(effect.name)}编辑器">${image}${video}${category}</a>${play}</div><div class="card-caption"><a href="${effect.href}"><h3>${escapeHTML(effect.name)}</h3><p>${escapeHTML(effect.english)}</p></a><a href="${effect.href}" aria-label="编辑${escapeHTML(effect.name)}">↗</a></div></article>`;
}
function renderCatalog() {
  stopAllCards();cardsObserver.disconnect();
  const query=($('#search')?.value||'').trim().toLocaleLowerCase();
  // Existing editors are video-creation materials, not verified distributable web components.
  // Do not infer React/SDK availability or supported export formats from a preview MP4.
  const matches=effects.filter(effect=>activeUsage!=='web'&&inCategory(effect,activeCategory)&&`${effect.name} ${effect.english} ${effect.id} ${effect.description}`.toLocaleLowerCase().includes(query));
  const homeIds=['sproutshift','iconburst','shutterafter','currentwall','impactbuild','pathwriter'];
  const showing=homePreview?homeIds.map(id=>effects.find(effect=>effect.id===id)).filter(effect=>effect && !isPending(effect)):matches.slice(0,limit);
  if($('#result-count'))$('#result-count').textContent=activeUsage==='web'?'0 个已适配组件':`${matches.length} 个动效`;
  if($('#catalog-empty'))$('#catalog-empty').hidden=matches.length>0||activeUsage==='web';
  if($('#web-planned'))$('#web-planned').hidden=activeUsage!=='web';
  if($('#load-more'))$('#load-more').hidden=matches.length<=limit;
  if($('#usage-note'))$('#usage-note').textContent=activeUsage==='web'?'网页使用是独立适配方向，不等同于把 MP4 嵌入网页。当前尚无已发布的网页组件。':activeUsage==='video'?'选择动效，进入工作台编辑，再使用该编辑器提供的导出功能。视频拼接器尚未开放。':'当前提供动效预览与独立编辑器；具体导出格式以各编辑器为准。网页组件正在规划，尚未提供代码安装。';
  $('#catalog-grid').innerHTML=showing.map(catalogCard).join('');
  $('#catalog-grid').querySelectorAll('.catalog-preview').forEach(preview=>{
    const pending=preview.closest('.catalog-card')?.classList.contains('is-pending');
    if(pending)return;
    if(capabilityLabels){const badges=document.createElement('div');badges.className='card-capabilities';badges.innerHTML='<span>独立编辑器</span><span>网页待适配</span>';preview.closest('.catalog-card').append(badges);}
    preview.querySelector('.card-play')?.addEventListener('click',()=>{
      const video=preview.querySelector('video');
      if(video&&!video.paused)stopCard(preview,{remember:true});else startCard(preview,{manual:true});
    });
    cardsObserver.observe(preview);
  });
}
function initCatalog() {
  if(!$('#catalog-grid'))return;
  const ids=['all',...Object.keys(categoryNames).filter(id=>id!=='all'&&effects.some(effect=>inCategory(effect,id)))];
  const count=id=>effects.filter(effect=>inCategory(effect,id)).length;
  if(homePreview){$('#category-links').innerHTML=ids.filter(id=>id!=='all').map(id=>`<a href="cellmotion-components.html?category=${id}">${categoryNames[id]}<span>${count(id)}</span></a>`).join('');renderCatalog();return;}
  const params=new URLSearchParams(location.search);
  activeCategory=ids.includes(params.get('category'))?params.get('category'):'all';
  activeUsage=$('#usage-filters')&&['video','web'].includes(params.get('use'))?params.get('use'):'all';
  $('#search').value=params.get('q')||'';
  const syncURL=()=>{const url=new URL(location.href);for(const [key,value]of [['category',activeCategory],['use',activeUsage],['q',$('#search').value.trim()]]){if(!value||value==='all')url.searchParams.delete(key);else url.searchParams.set(key,value);}history.replaceState(null,'',url);};
  $('#filters').innerHTML=ids.map(id=>`<button class="filter" data-category="${id}" aria-pressed="${id===activeCategory}">${categoryNames[id]}${capabilityLabels?`<span class="filter-count">${count(id)}</span>`:''}</button>`).join('');
  $('#filters').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;activeCategory=button.dataset.category;limit=12;$('#filters').querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));syncURL();renderCatalog();});
  const syncUsage=()=>{$('#usage-filters')?.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.usage===activeUsage)));};
  $('#usage-filters')?.addEventListener('click',event=>{const button=event.target.closest('[data-usage]');if(!button)return;activeUsage=button.dataset.usage;limit=12;syncUsage();syncURL();renderCatalog();});
  $('#show-video-effects')?.addEventListener('click',()=>{activeUsage='video';activeCategory='all';$('#search').value='';limit=12;$('#filters').querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category==='all')));syncUsage();syncURL();renderCatalog();});
  $('#search').addEventListener('input',()=>{limit=12;syncURL();renderCatalog();});
  $('#load-more').addEventListener('click',()=>{limit+=12;renderCatalog();});
  syncUsage();
  renderCatalog();
}

let storyURL=null, storyPreviewWasPlaying=false;
function initStory() {
  const videos=[...document.querySelectorAll('.case-video')];if(!videos.length)return;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const video=entry.target;
    if(entry.isIntersecting&&!document.hidden&&!reducedMotion){video.play().catch(()=>{});}
    else video.pause();
  }),{threshold:.2});
  videos.forEach(video=>observer.observe(video));
  document.querySelectorAll('.case-phone-card').forEach(card=>{
    const video=card.querySelector('video'),button=card.querySelector('.case-toggle');
    const sync=()=>{button.textContent=video.paused?'▶':'Ⅱ';button.setAttribute('aria-label',video.paused?'播放视频案例':'暂停视频案例');button.setAttribute('aria-pressed',String(!video.paused));};
    video.addEventListener('play',sync);video.addEventListener('pause',sync);sync();
    button.addEventListener('click',()=>{
      if(video.paused)video.play().catch(()=>{});else video.pause();
    });
  });
  const preview=$('#story-video');
  $('#case-file').addEventListener('change',event=>{
    const file=event.target.files[0];if(!file)return;
    if(file.type&&!file.type.startsWith('video/')){$('#case-status').textContent='请选择视频文件。';return;}
    if(storyURL)URL.revokeObjectURL(storyURL);
    storyURL=URL.createObjectURL(file);preview.src=storyURL;preview.hidden=false;preview.load();
    preview.play().catch(()=>{});
    $('#case-status').textContent=`已载入 ${file.name}。仅在本机预览，不上传。`;
  });
  preview.addEventListener('play',()=>{storyPreviewWasPlaying=true;});
  preview.addEventListener('pause',()=>{storyPreviewWasPlaying=false;});
  addEventListener('pagehide',()=>{observer.disconnect();if(storyURL)URL.revokeObjectURL(storyURL);});
}
document.addEventListener('visibilitychange',()=>{
  const caseVideos=[...document.querySelectorAll('.case-video')];
  if(document.hidden){hero?.pause();featureVideo?.pause();$('#story-video')?.pause();caseVideos.forEach(video=>video.pause());stopAllCards();}
  else{if(heroIntent&&heroVisible&&hero)play(hero);if(featuredIntent&&featureVisible&&featureVideo)play(featureVideo);if(storyPreviewWasPlaying)$('#story-video')?.play().catch(()=>{});caseVideos.forEach(video=>{if(video.getBoundingClientRect().top<innerHeight&&video.getBoundingClientRect().bottom>0&&!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});});document.querySelectorAll('.catalog-preview[data-visible="true"]').forEach(preview=>startCard(preview));}
});
async function loadCatalogData() {
  try {
    const response=await fetch('cellmotion-catalog.json?v=20260923-pending1');
    if(!response.ok)throw new Error(`Catalog HTTP ${response.status}`);
    const catalog=await response.json();
    effects=catalog.effects;
    featured=catalog.featured.map(id=>effects.find(effect=>effect.id===id)).filter(effect=>effect?.video && !isPending(effect));
    // This is editorial ordering only, never a claim that all effects passed review.
    effects.sort((a,b)=>{const ai=catalog.featured.indexOf(a.id),bi=catalog.featured.indexOf(b.id);return(ai<0?999:ai)-(bi<0?999:bi);});
    initCatalog();initFeatured();initStory();
  } catch(error) {
    if($('#catalog-error'))$('#catalog-error').hidden=false;
    console.error('CellMotion catalog:',error);
  }
}

initRibbon();
loadCatalogData();

const contactDialog = document.querySelector("#contact-dialog");
document.querySelector("[data-contact-open]")?.addEventListener("click", () => {
  const card = document.querySelector("#contact-wechat");
  if (card) card.hidden = true;
  contactDialog?.showModal();
});
contactDialog?.querySelector("[data-contact-close]")?.addEventListener("click", () => contactDialog.close());
contactDialog?.addEventListener("click", (event) => { if (event.target === contactDialog) contactDialog.close(); });
document.querySelector("[data-contact-wechat]")?.addEventListener("click", () => {
  const card = document.querySelector("#contact-wechat");
  if (card) card.hidden = !card.hidden;
});
