(() => {
  'use strict';
  const $ = id=>document.getElementById(id), player=$('demoPlayer'), params=new URLSearchParams(location.search);
  const effect=params.get('effect')==='carddeck'?'carddeck':'card-login', live=params.get('live')==='1';
  let language=localStorage.getItem('cellmotion-language')==='en'?'en':'zh', configured='', current;
  function translate(){document.documentElement.lang=language==='en'?'en':'zh-CN';document.querySelectorAll('[data-zh][data-en]').forEach(n=>n.textContent=n.dataset[language]);$('language').textContent=language==='en'?'中文':'EN';if(current){$('title').textContent=current.effect.name[language];$('demoTitle').textContent=current.effect.name[language];}}
  function apply(manifest){const v=CellMotionAI.validate(manifest);if(!v.valid)throw new Error(v.errors.join('; '));if(!['card-login','carddeck'].includes(manifest.effect.id))throw new Error('Unsupported effect');current=manifest;player.manifest=manifest;const ratio=manifest.composition.canvas.width/manifest.composition.canvas.height;player.style.maxWidth=`min(100%,${65*ratio}vh)`;player.style.marginInline='auto';configured=CellMotionAI.configuredCode(manifest);$('demoCode').textContent=configured;document.querySelector('.demo-back').href=`${manifest.effect.id}.html`;$('demoStatus').textContent=language==='en'?'Configured. Loading renderer…':'已接收配置，正在加载渲染器…';translate();}
  window.addEventListener('message',e=>{if(live&&e.source===opener&&e.origin===location.origin&&e.data?.type==='cellmotion:demo-manifest')try{apply(e.data.manifest);}catch(err){$('demoStatus').textContent=err.message;}});
  player.addEventListener('cellmotion-ready',()=>{$('demoStatus').textContent=language==='en'?'Ready · using the editor’s authoritative renderer':'已就绪 · 使用编辑器同一渲染器';});
  player.addEventListener('cellmotion-durationchange',()=>{$('demoSeek').max=player.duration;});
  document.querySelector('.demo-controls').onclick=e=>{const a=e.target.dataset.playerAction;if(a)player[a]();};$('demoSeek').oninput=()=>player.seek($('demoSeek').value);
  document.querySelector('.demo-tabs').onclick=e=>{const tab=e.target.dataset.tab;if(!tab)return;document.querySelectorAll('[data-tab]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.tab===tab)));document.querySelectorAll('[data-panel]').forEach(n=>n.hidden=n.dataset.panel!==tab);};
  $('copyDemoCode').onclick=()=>CellMotionAI.copyText(configured);$('language').onclick=()=>{language=language==='en'?'zh':'en';translate();};
  $('theme').onclick=()=>{document.body.dataset.editorTheme=document.body.dataset.editorTheme==='dark'?'light':'dark';};translate();
  if(live&&opener)opener.postMessage({type:'cellmotion:demo-ready'},location.origin);
  else Promise.all([fetch(`effects/${effect}.component.json`).then(r=>r.json()),fetch(`assets/presets/${effect}-default.json`).then(r=>r.json())]).then(([definition,scheme])=>apply(CellMotionAI.createManifest({definition,scheme,baseUrl:document.baseURI}))).catch(e=>$('demoStatus').textContent=e.message);
})();
