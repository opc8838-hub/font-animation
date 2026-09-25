(() => {
  const root = document.documentElement;
  const body = document.body;
  if (!body) return;
  const initialTitle = document.title;
  const store = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  const read = (key) => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const preferredLanguage = read('cellmotion-site-language') || (navigator.language?.toLowerCase().startsWith('zh') ? 'zh' : 'en');
  let language = preferredLanguage === 'en' ? 'en' : 'zh';
  const originals = new WeakMap();
  const dictionary = new Map();
  let phraseTrie = null;
  let englishPhraseTrie = null;
  const skipped = 'script,style,textarea,input,output,code,pre,svg,.no-translate,[data-no-translate],.site-preferences,.stg-cn-toolbar,.stg-cn-drawer';
  let translating = false;

  const controls = document.createElement('div');
  controls.id = 'site-preferences';
  controls.className = 'site-preferences';
  controls.setAttribute('aria-label', 'Site preferences');
  const languageButton = document.createElement('button');
  languageButton.type = 'button';
  languageButton.className = 'site-preference-button site-language-toggle';
  controls.append(languageButton);

  const actions = document.querySelector('.header-actions');
  if (actions) actions.append(controls);
  else {
    const header = document.querySelector('header');
    (header || body).append(controls);
    controls.classList.add('site-preferences-floating');
  }

  function setLanguage(next, persist = true) {
    language = next === 'en' ? 'en' : 'zh';
    root.lang = language === 'en' ? 'en' : 'zh-CN';
    root.dataset.siteLanguage = language;
    const titleHasChinese = /[\u3400-\u9fff]/.test(initialTitle);
    document.title = (language === 'en' && titleHasChinese) || (language === 'zh' && !titleHasChinese)
      ? (dictionary.get(initialTitle) || initialTitle)
      : initialTitle;
    languageButton.textContent = language === 'en' ? '中' : 'EN';
    languageButton.setAttribute('aria-label', language === 'en' ? '切换为中文' : 'Switch to English');
    languageButton.title = language === 'en' ? '切换为中文' : 'Switch to English';
    const legacyLanguageButton = document.getElementById('tcLanguageToggle');
    if (legacyLanguageButton && body.dataset.editorLanguage !== language) legacyLanguageButton.click();
    if (!body.classList.contains('tc-workspace')) {
      translateTree(document.head);
      translateTree(body);
    } else {
      const translateVisibleEditorText = () => translateEditorTextTree(body);
      window.requestAnimationFrame(translateVisibleEditorText);
      window.setTimeout(translateVisibleEditorText, 180);
      window.setTimeout(translateVisibleEditorText, 650);
    }
    if (persist) store('cellmotion-site-language', language);
    document.dispatchEvent(new CustomEvent('cellmotion:languagechange', { detail: { language } }));
  }

  function translateValue(value, node, key) {
    if (!value || node.parentElement?.closest(skipped)) return value;
    const lead = value.match(/^\s*/)?.[0] || '';
    const tail = value.match(/\s*$/)?.[0] || '';
    const core = value.slice(lead.length, value.length - tail.length);
    if (!core) return value;
    const containsChinese = /[\u3400-\u9fff\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/.test(core);
    const punctuation = { '。': '.', '，': ',', '、': ',', '：': ':', '；': ';', '（': '(', '）': ')', '“': '"', '”': '"', '‘': "'", '’': "'", '！': '!', '？': '?' };
    if (language === 'en' && containsChinese && !/[\u3400-\u9fff]/.test(core)) return lead + core.replace(/[。 ，、：；（）“”‘’！？]/g, (character) => punctuation[character] || character) + tail;
    const translated = language === 'en'
      ? (containsChinese ? dictionary.get(core) : null)
      : (!containsChinese ? dictionary.get(core) : null);
    if (translated) return lead + translated + tail;
    if (language === 'zh' && containsChinese && englishPhraseTrie) {
      let composed = '';
      let changed = false;
      for (let index = 0; index < core.length;) {
        let branch = englishPhraseTrie;
        let cursor = index;
        let match = null;
        let matchEnd = index;
        while (cursor < core.length && branch[core[cursor]]) {
          branch = branch[core[cursor++]];
          if (Object.hasOwn(branch, '$')) { match = branch.$; matchEnd = cursor; }
        }
        if (match) { composed += match; changed = true; index = matchEnd; }
        else composed += core[index++];
      }
      if (changed && !/[A-Za-z]/.test(composed)) return lead + composed + tail;
    }
    if (language === 'en') {
      if (containsChinese && phraseTrie) {
        let composed = '';
        let changed = false;
        for (let index = 0; index < core.length;) {
          let branch = phraseTrie;
          let cursor = index;
          let match = null;
          let matchEnd = index;
          while (cursor < core.length && branch[core[cursor]]) {
            branch = branch[core[cursor++]];
            if (Object.hasOwn(branch, '$')) {
              match = branch.$;
              matchEnd = cursor;
            }
          }
          if (match) {
            composed += match;
            changed = true;
            index = matchEnd;
          } else {
            const character = core[index++];
            composed += punctuation[character] || character;
          }
        }
        if (changed && !/[\u3400-\u9fff\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/.test(composed)) return lead + composed + tail;
      }
      const openEditor = core.match(/^打开(.+?)编辑器$/);
      if (openEditor && dictionary.has(openEditor[1])) return `${lead}Open ${dictionary.get(openEditor[1])} editor${tail}`;
      const editEffect = core.match(/^编辑(.+)$/);
      if (editEffect && dictionary.has(editEffect[1])) return `${lead}Edit ${dictionary.get(editEffect[1])}${tail}`;
      const playEffect = core.match(/^播放或暂停(.+?)预览$/);
      if (playEffect && dictionary.has(playEffect[1])) return `${lead}Play or pause ${dictionary.get(playEffect[1])} preview${tail}`;
      const pendingEffect = core.match(/^(.+)，待上新，未完成$/);
      if (pendingEffect && dictionary.has(pendingEffect[1])) return `${lead}${dictionary.get(pendingEffect[1])} · Coming soon${tail}`;
      const seconds = core.match(/^([+\-−]?\d+(?:\.\d+)?)\s*秒$/);
      if (seconds) return `${lead}${seconds[1]} s${tail}`;
      const numbered = core.match(/^([+\-−]?\d+)\s*(帧|项|张|个|段|组)$/);
      if (numbered) return `${lead}${numbered[1]} ${{ 帧: 'frames', 项: 'items', 张: 'images', 个: 'items', 段: 'blocks', 组: 'groups' }[numbered[2]]}${tail}`;
      const effectCount = core.match(/^(\d+)\s*个(动效|图标|字体|项目|结果)$/);
      if (effectCount) return `${lead}${effectCount[1]} ${{ 动效: 'effects', 图标: 'icons', 字体: 'fonts', 项目: 'projects', 结果: 'results' }[effectCount[2]]}${tail}`;
      const ratio = core.match(/^(\d+:\d+)\s*(方形|竖版|全屏|横版)$/);
      if (ratio) return `${lead}${ratio[1]} ${{ 方形: 'Square', 竖版: 'Portrait', 全屏: 'Full screen', 横版: 'Landscape' }[ratio[2]]}${tail}`;
      const phase = core.match(/^阶段\s*(\d+)$/);
      if (phase) return `${lead}Phase ${phase[1]}${tail}`;
      const autoplay = core.match(/^自动轮播\s*[·.、]\s*(开|关)$/);
      if (autoplay) return `${lead}Autoplay · ${autoplay[1] === '开' ? 'On' : 'Off'}${tail}`;
      const counted = core.match(/^(文字排版|图标与图形|图片与媒体|流动与路径|立体空间|物理粒子|待上新)\s*(\d+)\s*个?$/);
      if (counted && dictionary.has(counted[1])) return `${lead}${dictionary.get(counted[1])} ${counted[2]}${tail}`;
    }
    if (key === 'text' && language === 'en') {
      const count = core.match(/^(\d+)\s*(项|个|张|帧|段|组|个图标|张图片)$/);
      if (count) return `${lead}${count[1]} ${count[1] === '1' ? 'item' : 'items'}${tail}`;
      const beat = core.match(/^(\d+)\s*[·.、]\s*(.+)$/);
      if (beat && dictionary.has(beat[2])) return `${lead}${beat[1]} · ${dictionary.get(beat[2])}${tail}`;
    }
    return value;
  }

  function translateNode(node, key = 'text') {
    const current = key === 'text' ? node.nodeValue : node.getAttribute(key);
    if (current == null) return;
    let record = originals.get(node);
    if (!record) { record = {}; originals.set(node, record); }
    const previous = record[key];
    const source = previous && previous.last === current ? previous.source : current;
    const result = translateValue(source, node, key);
    record[key] = { source, last: result };
    if (result !== current) {
      translating = true;
      if (key === 'text') node.nodeValue = result;
      else node.setAttribute(key, result);
      translating = false;
    }
  }

  function translateTree(node) {
    if (!node || node.nodeType === Node.ELEMENT_NODE && node.matches(skipped)) return;
    if (node.nodeType === Node.TEXT_NODE) { translateNode(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE && node !== body) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) if (node.hasAttribute(attr)) translateNode(node, attr);
      if (node.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"]')) translateNode(node, 'content');
    }
    for (const child of node.childNodes) translateTree(child);
  }

  function translateEditorTextTree(node) {
    if (!node || (node.nodeType === Node.ELEMENT_NODE && node.matches(skipped))) return;
    if (node.nodeType === Node.TEXT_NODE) { translateNode(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE && node !== body) return;
    for (const child of node.childNodes) translateEditorTextTree(child);
  }

  languageButton.addEventListener('click', () => setLanguage(language === 'en' ? 'zh' : 'en'));
  root.dataset.siteTheme = 'light';
  fetch(new URL('site-locale-dictionary.json?v=20260926-18', document.currentScript?.src || location.href), { cache: 'reload' })
    .then((response) => response.ok ? response.json() : {})
    .then((entries) => {
      for (const [source, translated] of Object.entries(entries)) dictionary.set(source, translated);
      phraseTrie = {};
      englishPhraseTrie = {};
      for (const [term, translated] of dictionary) {
        if (term.length < 2) continue;
        if (/[\u3400-\u9fff]/.test(term) && !/[\u3400-\u9fff]/.test(translated)) {
          let branch = phraseTrie;
          for (const character of term) branch = branch[character] || (branch[character] = {});
          branch.$ = translated;
        } else if (!/[\u3400-\u9fff]/.test(term) && /[\u3400-\u9fff]/.test(translated)) {
          let branch = englishPhraseTrie;
          for (const character of term) branch = branch[character] || (branch[character] = {});
          branch.$ = translated;
        }
      }
      setLanguage(language, false);
      const observer = new MutationObserver((records) => {
        if (body.classList.contains('tc-workspace')) return;
        if (translating) return;
        for (const record of records) {
          if (record.type === 'childList') record.addedNodes.forEach(translateTree);
          else if (record.type === 'characterData') translateNode(record.target);
          else if (record.type === 'attributes') translateNode(record.target, record.attributeName);
        }
      });
      if (!body.classList.contains('tc-workspace')) {
        observer.observe(body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt'] });
      }
    })
    .catch(() => setLanguage(language, false));
})();
