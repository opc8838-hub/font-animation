(() => {
  "use strict";
  const text = document.querySelector("#sample-text");
  const size = document.querySelector("#sample-size");
  const samples = [...document.querySelectorAll(".hero-sample")];
  const status = document.querySelector("#font-status");
  const coverage = status.textContent;
  const sampleLabels = samples.map(sample => {
    const label = document.createElement('p'); label.className = 'sample-metrics'; sample.after(label); return label;
  });
  function sampleMetrics() {
    samples.forEach((sample, index) => { sampleLabels[index].textContent = `Regular 400 · 实际字号 ${parseFloat(getComputedStyle(sample).fontSize).toFixed(1)} px`; });
  }
  let revision = 0;
  async function update() {
    const current = ++revision;
    document.documentElement.style.setProperty("--sample-size", `${size.value}px`);
    document.querySelector("#size-value").value = `${size.value} px`;
    samples.forEach(sample => { sample.textContent = text.value || sample.dataset.default; });
    try {
      await window.STGFontLibrary.load("papyrus", text.value || "Aa16PAPERSjpg.");
      if (current === revision) status.textContent = coverage;
      sampleMetrics();
    } catch {
      if (current === revision) status.textContent = "字体加载失败，请刷新页面重试。";
    }
  }
  let supported = null;
  fetch("assets/fonts/paper-series/characters.json").then(response => {
    if (!response.ok) throw new Error("Character map unavailable");
    return response.json();
  }).then(codes => {
    supported = new Set(codes);
    const glyphs = codes.filter(code => code > 32 && code !== 160).map(code => String.fromCodePoint(code)).join(" ");
    document.querySelectorAll(".all-glyphs").forEach(node => { node.textContent = glyphs; });
    updateLab();
  }).catch(() => {
    document.querySelectorAll(".all-glyphs").forEach(node => { node.textContent = "字符表加载失败，请刷新页面重试。"; });
  });
  document.querySelector("#paper-texture").addEventListener("change", event => {
    const url = `assets/backgrounds/paper-series/Paper-${event.target.value}.png`;
    document.documentElement.style.setProperty("--paper-texture", `url("${url}")`);
    document.querySelector("#download-paper").href = url;
  });
  text.addEventListener("input", update);
  size.addEventListener("input", update);
  document.querySelector(".tester").addEventListener("reset", () => {
    requestAnimationFrame(update);
  });
  fetch('assets/fonts/paper-series/specification.json').then(response => {
    if (!response.ok) throw new Error('Font specification unavailable');
    return response.json();
  }).then(spec => {
    const pairs = [['字体家族', spec.family], ['真实字重', `${spec.style} · ${spec.weight}`],
      ['版本', spec.version], ['字形 / 字符映射', `${spec.glyphs} / ${spec.mappedCharacters}`],
      ['字体单位 / em', spec.unitsPerEm], ['升部 / 降部', `${spec.typographicMetrics.ascender} / ${spec.typographicMetrics.descender}`],
      ['可变字体轴', spec.variableAxes.length ? spec.variableAxes.map(axis => axis.tag).join(', ') : '无'],
      ['OpenType 特性标签', spec.openTypeFeatures.join(', ') || '未收录 GSUB / GPOS 特性']];
    document.querySelector('#font-specification').replaceChildren(...pairs.flatMap(([title, value]) => {
      const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = title; dd.textContent = value; return [dt, dd];
    }));
  }).catch(() => { document.querySelector('#font-specification').textContent = '规格文件加载失败，请刷新重试。'; });
  const labText = document.querySelector('#lab-text'), labStatus = document.querySelector('#lab-coverage');
  let labRevision = 0;
  async function updateLab() {
    const current = ++labRevision;
    for (const [id, fallback, unit] of [['size', 72, 'px'], ['tracking', 0, 'em'], ['leading', 1.4, '']]) {
      const input = document.querySelector('#lab-' + id);
      const number = input.value === '' ? fallback : Number(input.value);
      const value = Math.max(Number(input.min), Math.min(Number(input.max), Number.isFinite(number) ? number : fallback));
      document.documentElement.style.setProperty('--lab-' + id, value + unit);
    }
    document.querySelector('#lab-preview').textContent = labText.value;
    const missing = supported ? [...new Set([...labText.value].filter(char => !/\s/u.test(char) && !supported.has(char.codePointAt(0))))] : [];
    try {
      await window.STGFontLibrary.load('papyrus', labText.value || 'Aa');
      if (current !== labRevision) return;
      labStatus.textContent = !supported ? '正在检查字符覆盖…' : missing.length
        ? `其中 ${missing.length} 种字符不在 Papyrus 字符表内，使用回退字体：${missing.slice(0, 12).join(' ')}${missing.length > 12 ? '…' : ''}`
        : '当前内容由 Papyrus 原生字符覆盖 · Regular 400';
    } catch (_) { if (current === labRevision) labStatus.textContent = '试字字体加载失败，请刷新重试。'; }
  }
  for (const pixels of [16, 24, 36, 48, 72, 120]) {
    const block = document.createElement('div'), label = document.createElement('small'), sample = document.createElement('p');
    block.className = 'size-row'; label.textContent = `${pixels} px / Regular 400`;
    sample.style.fontSize = pixels + 'px'; sample.textContent = 'Hamburgefontsiv 0123456789';
    block.append(label, sample); document.querySelector('#size-waterfall').append(block);
  }
  document.querySelectorAll('.type-lab input,.type-lab textarea').forEach(input => {
    input.addEventListener('input', updateLab);
    if (input.type === 'number') input.addEventListener('change', () => {
      if (input.value !== '') input.value = Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)));
      updateLab();
    });
  });
  window.addEventListener('resize', sampleMetrics);
  updateLab();
  update();
})();
