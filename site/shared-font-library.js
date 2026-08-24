(() => {
  "use strict";
  if (window.STGFontLibrary) return;

  const fonts = [
    ["inter", "Inter", "STG Inter", 500, "normal", "常用拉丁"],
    ["space-grotesk", "Space Grotesk", "STG Space Grotesk", 500, "normal", "常用拉丁"],
    ["manrope", "Manrope", "STG Manrope", 500, "normal", "常用拉丁"],
    ["poppins", "Poppins", "STG Poppins", 400, "normal", "常用拉丁"],
    ["work-sans", "Work Sans", "STG Work Sans", 400, "normal", "常用拉丁"],
    ["archivo-black", "Archivo Black", "STG Archivo Black", 900, "normal", "常用拉丁"],
    ["league-spartan", "League Spartan", "STG League Spartan", 600, "normal", "常用拉丁"],
    ["lora", "Lora", "STG Lora", 500, "normal", "衬线与书写"],
    ["fraunces", "Fraunces", "STG Fraunces", 500, "normal", "衬线与书写"],
    ["instrument-serif", "Instrument Serif", "STG Instrument Serif", 400, "normal", "衬线与书写"],
    ["cinzel", "Cinzel", "STG Cinzel", 600, "normal", "衬线与书写"],
    ["fenix", "Fenix", "STG Fenix", 400, "normal", "衬线与书写"],
    ["kepler", "Kepler", "STG Kepler", 500, "normal", "衬线与书写"],
    ["vollkorn", "Vollkorn Bold Italic", "STG Vollkorn", 700, "italic", "衬线与书写"],
    ["aguafina", "Aguafina Script", "STG Aguafina", 400, "normal", "衬线与书写"],
    ["tratto", "Tratto", "STG Tratto", 300, "italic", "衬线与书写"],
    ["bebas-neue", "Bebas Neue", "STG Bebas Neue", 400, "normal", "展示与窄体"],
    ["roboto-condensed", "Roboto Condensed", "STG Roboto Condensed", 700, "normal", "展示与窄体"],
    ["origin-condensed", "Origin Super Condensed", "STG Origin Super Condensed", 400, "normal", "展示与窄体"],
    ["formula-condensed", "Formula Condensed", "STG Formula Condensed", 700, "normal", "展示与窄体"],
    ["neue-world-condensed", "Neue World Condensed", "STG Neue World Condensed", 400, "normal", "展示与窄体"],
    ["nimbus-condensed", "Nimbus Sans Condensed", "STG Nimbus Sans Condensed", 400, "normal", "展示与窄体"],
    ["teko", "Teko", "STG Teko", 500, "normal", "展示与窄体"],
    ["khand", "Khand", "STG Khand", 400, "normal", "展示与窄体"],
    ["rajdhani", "Rajdhani", "STG Rajdhani", 700, "normal", "展示与窄体"],
    ["cairo", "Cairo", "STG Cairo", 700, "normal", "展示与窄体"],
    ["oi", "Oi", "STG Oi", 400, "normal", "展示与窄体"],
    ["barriecito", "Barriecito", "STG Barriecito", 400, "normal", "展示与窄体"],
    ["plaid-xl", "Plaid XL", "STG Plaid XL", 400, "normal", "展示与窄体"],
    ["editorial-new", "Editorial New Thin", "STG Editorial New", 100, "normal", "展示与窄体"],
    ["proxima-thin", "Proxima Nova Thin", "STG Proxima Nova", 100, "normal", "常用拉丁"],
    ["proxima-black", "Proxima Nova Black", "STG Proxima Nova", 900, "normal", "常用拉丁"],
    ["roboto-thin", "Roboto Thin", "STG Roboto", 100, "normal", "常用拉丁"],
    ["roboto-black-italic", "Roboto Black Italic", "STG Roboto", 900, "italic", "常用拉丁"],
    ["ibm-plex-mono", "IBM Plex Mono", "STG IBM Plex Mono", 400, "normal", "等宽字体"],
    ["ibm-plex-mono-bold-italic", "IBM Plex Mono Bold Italic", "STG IBM Plex Mono", 700, "italic", "等宽字体"],
    ["space-mono", "Space Mono Bold", "STG Space Mono", 700, "normal", "等宽字体"],
    ["martian-mono", "Martian Mono", "STG Martian Mono", 500, "normal", "等宽字体"],
    ["berlin", "Berlin Grotesk", "STG Berlin Grotesk", 400, "normal", "常用拉丁"],
    ["berlin-bold", "Berlin Grotesk Bold", "STG Berlin Grotesk", 700, "normal", "常用拉丁"],
    ["noto-sc-thin", "Noto Sans SC Thin · 中文", "STG Noto Sans SC", 200, "normal", "中文字体"],
    ["noto-sc", "Noto Sans SC · 中文", "STG Noto Sans SC", 400, "normal", "中文字体"],
    ["noto-sc-black", "Noto Sans SC Black · 中文", "STG Noto Sans SC", 900, "normal", "中文字体"],
    ["noto-hk", "Noto Sans HK · 中文", "STG Noto Sans HK", 500, "normal", "中文字体"],
    ["noto-jp-thin", "Noto Sans JP Thin · 日文", "STG Noto Sans JP", 200, "normal", "日文字体"],
    ["noto-jp-black", "Noto Sans JP Black · 日文", "STG Noto Sans JP", 900, "normal", "日文字体"],
    ["noto-kr-black", "Noto Sans KR Black · 韩文", "STG Noto Sans KR", 900, "normal", "韩文字体"],
    ["do-hyeon", "Do Hyeon · 韩文", "STG Do Hyeon", 400, "normal", "韩文字体"]
  ].map(([id, label, family, weight, style, group]) => ({ id, label, family, weight, style, group }));

  const aliases = {
    "snap-inter-medium": "inter", "snap-inter-black": "inter", inter: "inter",
    "snap-space-grotesk": "space-grotesk", "ff-space-grotesk": "space-grotesk", space: "space-grotesk",
    "snap-ibm-plex": "ibm-plex-mono-bold-italic", "snap-space-mono": "space-mono",
    "ff-martian-mono": "martian-mono", "ff-oi": "oi", "ff-barriecito": "barriecito",
    "uncut-berlin": "berlin", "uncut-berlin-bold": "berlin-bold",
    "fs-satoshi": "manrope", "fs-general-sans": "work-sans", "fs-clash-display": "league-spartan", "fs-cabinet": "manrope",
    satoshi: "manrope", "general-sans": "work-sans",
    manrope: "manrope", poppins: "poppins", noto: "noto-sc", "noto-sc": "noto-sc", "noto-hk": "noto-hk",
    "cn-noto-regular": "noto-sc", "cn-noto-black": "noto-sc-black", "city-black": "noto-sc-black",
    archivoBlack: "archivo-black", robotoCondensed: "roboto-condensed", work: "work-sans", serif: "lora", mono: "martian-mono",
    scRegular: "noto-sc", scBlack: "noto-sc-black", fenix: "fenix", spaceMonoBold: "space-mono",
    vollkornBoldItalic: "vollkorn", cairoBold: "cairo", aguafina: "aguafina", spartan: "league-spartan",
    cinzel: "cinzel", instrument: "instrument-serif", bebas: "bebas-neue", rajdhani: "rajdhani", teko: "teko",
    khand: "khand", fraunces: "fraunces", scThin: "noto-sc-thin", jpThin: "noto-jp-thin",
    jpBlack: "noto-jp-black", krBlack: "noto-kr-black",
    "ib-archivo": "archivo-black", "ib-roboto-condensed": "roboto-condensed", "ib-work": "work-sans",
    "ib-lora": "lora", "ib-fenix": "fenix", "ib-vollkorn": "vollkorn", "ib-cairo": "cairo",
    "ib-aguafina": "aguafina", "ib-manrope": "manrope", "ib-spartan": "league-spartan",
    "ib-cinzel": "cinzel", "ib-instrument": "instrument-serif", "ib-bebas": "bebas-neue",
    "ib-poppins": "poppins", "ib-rajdhani": "rajdhani", "ib-teko": "teko", "ib-khand": "khand",
    "ib-fraunces": "fraunces", "ib-sc-thin": "noto-sc-thin", "ib-jp-thin": "noto-jp-thin",
    "ib-jp-black": "noto-jp-black", "ib-kr-black": "noto-kr-black"
  };
  const byId = new Map(fonts.map((font) => [font.id, font]));
  const fallbackStack = '"STG Noto Sans SC","STG Noto Sans JP","STG Noto Sans KR",sans-serif';

  function idFor(value) {
    const raw = String(value || "").replace(/^stg:/, "");
    return byId.has(raw) ? raw : aliases[raw] || "";
  }
  function preset(value) {
    const font = byId.get(idFor(value));
    return font ? { family: font.family, weight: font.weight, style: font.style, id: font.id, label: font.label } : null;
  }
  function family(value, fallback = fallbackStack) {
    const font = byId.get(idFor(value));
    return font ? `"${font.family}",${fallbackStack}` : fallback;
  }
  function shouldEnhance(select) {
    const id = select.id || "";
    if (!/font/i.test(id) || /weight|size|style|scale|tracking/i.test(id)) return false;
    return select.tagName === "SELECT";
  }
  function enhanceSelect(select) {
    if (!shouldEnhance(select) || select.dataset.stgFontLibrary === "true") return;
    const previous = idFor(select.value) || "inter";
    const groups = new Map();
    fonts.forEach((font) => {
      if (!groups.has(font.group)) groups.set(font.group, []);
      groups.get(font.group).push(font);
    });
    select.replaceChildren();
    Object.entries(aliases).forEach(([alias, fontId]) => {
      if (alias.startsWith("stg:") || byId.has(alias)) return;
      const font = byId.get(fontId);
      if (!font) return;
      const option = document.createElement("option");
      option.value = alias;
      option.textContent = font.label;
      option.hidden = true;
      select.append(option);
    });
    groups.forEach((items, label) => {
      const group = document.createElement("optgroup");
      group.label = label;
      items.forEach((font) => {
        const option = document.createElement("option");
        option.value = `stg:${font.id}`;
        option.textContent = font.label;
        group.append(option);
      });
      select.append(group);
    });
    select.value = `stg:${previous}`;
    if (!select.value) select.value = "stg:inter";
    select.dataset.stgFontLibrary = "true";
  }
  function enhanceAll(root = document) {
    if (root instanceof HTMLSelectElement) enhanceSelect(root);
    root.querySelectorAll?.("select").forEach(enhanceSelect);
  }

  const styleLink = document.createElement("link");
  styleLink.rel = "stylesheet";
  styleLink.href = "shared-fonts.css?v=20260824-2";
  styleLink.dataset.stgSharedFonts = "true";
  if (!document.querySelector("link[data-stg-shared-fonts]")) document.head.append(styleLink);

  window.STGFontLibrary = { fonts, aliases, idFor, preset, family, enhanceSelect, enhanceAll, fallbackStack };
  enhanceAll();
  new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) enhanceAll(node);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();
