/* Original procedural ASCII marine life. Visual reference: stackedlol/ascii-sharks. */
(() => {
  'use strict';
  const effect = document.body.dataset.cardmotion;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const names = ['字符海洋', 'ASCII Ocean'];
  const beats = [['海洋巡游', 'Marine swim', 'swim', '#8ec8ff']];
  const fields = [['motion.swim', '巡游一轮', 'Swim cycle', 8, 60, .5, 's']];
  function phases(s) {
    let start = 0;
    return beats.map(([zh, en, id, color]) => { const duration = s.motion[id] / s.motion.speed, p = {id, zh, en, color, start, duration}; start += duration; return p; });
  }
  const duration = s => phases(s).reduce((a, p) => a + p.duration, 0);
  function defaults(id) {
    const creatures = ['ascii-longtail', 'ascii-shark', 'ascii-hammerhead', 'ascii-tiger', 'ascii-whale', 'ascii-manta'];
    return {effect: id, version: 1, canvas: {width: 1920, height: 1080}, typography: {fontFamily: 'stg:inter'},
      backgroundColor: '#fcfcfa', customAssets: [], cards: creatures.map((libraryId, i) => ({id: 'card-' + i, libraryId, scale: i===4?.9:1, opacity: i===4?.88:1, rotation: 0, x: 0, y: 0, gap: 30, caption: '', fontFamily: ''})),
      scene: {color: '#61666b', accent: '#808c87', size: 1, density: 1, fish: 260, dots: .35, amplitude: 1, contrast: 1.2, shimmer: 1.25, direction: 1},
      motion: {speed: 1, loop: true, swim: 30}};
  }
  const draw = (g, time, width, height, s, resources) => AsciiOceanRenderer.render(g, time, width, height, s, resources, duration(s));
  window.CardMotion = {clamp, defaults, phases, duration, draw};
  const number = (p, zh, en, min, max, step = .01) => [p, zh, en, min, max, step, ''];
  window.CellMotionEditorExtension = {
    title: names, assetLabel: ['海洋生物', 'Marine life'], captionLabel: ['生物附加文字', 'Creature caption'], assetLibrary: 'assets/ascii-ocean/library.json', fields,
    content({input, range, select, t}) {
      return '<section class="gm-card"><h2>' + t('海洋与色彩', 'Ocean & color') + '</h2><label class="gm-field">' + t('字幕字体', 'Caption font') + '<select id="fontFamily" data-path="typography.fontFamily"></select></label><div class="gm-grid-2">' + input('scene.color', '字符颜色', 'Character color', 'color') + input('backgroundColor', '背景颜色', 'Background', 'color', 'id="backgroundColor"') + input('scene.accent', '鱼群与闪光', 'Fish & glints', 'color') + '</div>' +
        range(number('scene.contrast', '方格明暗对比', 'Tile contrast', .4, 2)) + range(number('scene.shimmer', '明暗流动强度', 'Flowing light', 0, 2)) +
        range(number('scene.size', '主体大小', 'Subject size', .3, 1.4)) + range(number('scene.density', '字符密度', 'Character density', .6, 1.6)) + range(number('scene.fish', '小鱼数量', 'Small fish', 0, 420, 1)) + range(number('scene.dots', '海水微粒', 'Water particles', 0, 1)) + range(number('scene.amplitude', '摆尾幅度', 'Tail amplitude', 0, 2)) + select('scene.direction', '巡游方向', 'Swim direction', [[1, '正向游动', 'Forward'], [-1, '反向游动', 'Reverse']]) + '</section><section class="gm-card me-layer-panel" id="assetManager"><button class="me-layer-toggle" id="assetToggle">' + t('展开已选', 'Show selected') + '</button><div class="me-layer-items" id="selectedAssets" hidden></div></section>';
    },
    async prepare(s, resources, prepareAsset, builtins) { for (const a of builtins) if (!resources.get(a.libraryId)?.image) await prepareAsset(a); await document.fonts.load('600 16px "STG IBM Plex Mono"'); await Promise.all(s.cards.map(c => document.fonts.load('500 24px ' + STGFontLibrary.family(c.fontFamily || s.typography.fontFamily)))); },
    normalize(raw, s, def) {
      s.scene = {...def.scene, ...raw.scene};
      for (const [key, lo, hi] of [['size', .3, 1.4], ['density', .6, 1.6], ['fish', 0, 420], ['dots', 0, 1], ['amplitude', 0, 2], ['contrast', .4, 2], ['shimmer', 0, 2]]) s.scene[key] = clamp(Number.isFinite(Number(s.scene[key])) ? Number(s.scene[key]) : def.scene[key], lo, hi);
      s.scene.direction = Number(s.scene.direction) === -1 ? -1 : 1;
      for (const key of ['color', 'accent']) if (!/^#[\da-f]{6}$/i.test(s.scene[key])) s.scene[key] = def.scene[key];
      if (!/^#[\da-f]{6}$/i.test(s.backgroundColor)) s.backgroundColor = def.backgroundColor;
      for (const c of s.cards) { c.caption = String(c.caption || '').slice(0, 300); c.gap = clamp(Number(c.gap) || 0, 0, 160); if (!/^#[\da-f]{6}$/i.test(c.textColor || '')) delete c.textColor; }
    },
    stable: s => duration(s) * .18,
    seekForPath(s, path) { const p = phases(s).find(p => 'motion.' + p.id === path); return p ? p.start + p.duration * .5 : duration(s) * .18; },
    layout() {
      document.body.classList.add('archive-editor', 'ascii-editor');
      const heading = document.querySelector('.tc-panel-heading h2'); heading.dataset.zh = '海洋生物'; heading.dataset.en = 'Marine life'; heading.textContent = '海洋生物';
      document.querySelector('.tc-panel-heading').append(document.getElementById('openLibrary'));
      const label = document.querySelector('.tc-tabs [data-panel="content"] span'); label.dataset.zh = '画面设置'; label.dataset.en = 'Scene';
    },
    extraCard({t}) { return '<label class="gm-field">' + t('名称 / 字幕', 'Name / caption') + '<input data-card-key="caption" type="text" maxlength="300"></label><label class="gm-field">' + t('字幕字体', 'Caption font') + '<select id="assetFontFamily" data-card-key="fontFamily"></select></label><label class="gm-field">' + t('字幕颜色', 'Caption color') + '<input data-card-key="textColor" type="color"></label><button id="replaceAsset">' + t('替换生物', 'Replace creature') + '</button>'; },
    bindCard({card, state}) { document.querySelector('[data-card-key="caption"]').value = card.caption || ''; document.querySelector('[data-card-key="textColor"]').value = card.textColor || state.scene.color; }
  };
})();
