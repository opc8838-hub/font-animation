(() => {
  "use strict";
  const library = () => window.STGFontLibrary;
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normalize = (value) => {
    const id = library()?.idFor(value);
    return id ? `stg:${id}` : "";
  };
  const preset = (row, typography) => library()?.preset(row?.fontFamily || typography.fontFamily) || { family: "STG Inter", weight: 500, style: "normal" };
  function options(value) {
    const selected = normalize(value);
    const groups = new Map();
    (library()?.fonts || []).forEach((font) => {
      if (!groups.has(font.group)) groups.set(font.group, []);
      groups.get(font.group).push(font);
    });
    return `<option value=""${selected ? "" : " selected"}>跟随全局字体</option>` + Array.from(groups, ([group, fonts]) =>
      `<optgroup label="${escape(group)}">${fonts.map((font) => `<option value="stg:${font.id}"${selected === `stg:${font.id}` ? " selected" : ""}>${escape(font.label)}</option>`).join("")}</optgroup>`).join("");
  }
  const loads = new Map();
  function loadFace(font, sample) {
    const css = `${font.style || "normal"} ${font.weight || 400} 64px "${font.family}"`;
    const key = `${css}:${sample}`;
    if (!loads.has(key)) loads.set(key, document.fonts.load(css, sample).catch((error) => { loads.delete(key); throw error; }));
    return loads.get(key);
  }
  async function loadRows(rows, typography) {
    if (!document.fonts?.load) return;
    await Promise.all(rows.map(async (row) => {
      const sample = Array.from(new Set(Array.from(row.text || "Aa"))).join("");
      await loadFace(preset(row, typography), sample);
      // Canvas doesn't trigger font downloads. Load the same CJK fallback faces
      // used by the shared catalog, including text entered under a Latin face.
      const fallbackIds = [];
      if (/[\u3400-\u9fff]/u.test(sample)) fallbackIds.push("noto-sc");
      if (/[\u3040-\u30ff]/u.test(sample)) fallbackIds.push("noto-jp-thin");
      if (/[\uac00-\ud7af]/u.test(sample)) fallbackIds.push("noto-kr-black");
      await Promise.all(fallbackIds.map((id) => loadFace(library().preset(`stg:${id}`), sample)));
    }));
  }
  window.MERowFonts = { normalize, preset, options, loadRows };
})();
