const phrases = {
  'Color adjustments': '色彩调整', 'Shape preview': '形状预览', 'Color editor': '色彩编辑',
  'Shape': '形状', 'Butterfly': '蝴蝶', 'Iris': '鸢尾', 'Clover': '三叶草', 'Aura': '光晕',
  'Wings': '飞翼', 'Bloom': '盛放', 'Halo': '光环', 'Petal': '花瓣',
  'Undo': '撤销', 'Redo': '重做', 'Undo · ⌘Z': '撤销 · Ctrl/⌘ Z', 'Redo · ⌘⇧Z': '重做 · Ctrl/⌘ Shift Z',
  'Compare with original': '对比默认效果', 'Back to editing': '返回编辑', 'Reset to original': '恢复默认',
  'Reset all settings to original': '恢复默认设置', 'Save PNG': '导出 PNG', 'Reset': '重置',
  'Animate colors': '启用色彩动画', 'Pause': '暂停', 'Play': '播放', 'Restart animation': '从头播放',
  'Pause color animation': '暂停色彩动画', 'Play color animation': '播放色彩动画',
  'Playback speed': '流动速度', 'Flow amount': '流动幅度', 'Pattern detail': '纹理细节',
  'Animate color shift': '启用色谱偏移', 'Shift range': '偏移范围', 'Shift speed': '偏移速度',
  'Animate color spread': '启用色域呼吸', 'Spread range': '呼吸范围', 'Spread speed': '呼吸速度',
  'Organic': '有机渐变', 'Color areas': '局部色彩', 'Organic gradient': '有机渐变',
  'Color spread': '色域范围', 'Color shift': '色谱偏移', 'Blend softness': '混合柔度',
  'Color gradient': '渐变色谱', 'Shadow': '暗部', 'Core': '亮部', 'Reverse': '反转色谱',
  'Color areas 0': '局部色彩 0', '+ Add area': '＋ 添加色区', '+ Add color area': '＋ 添加色区',
  'Add color area': '添加色区', 'Hide edit points': '隐藏编辑点', 'Show edit points': '显示编辑点',
  'Duplicate': '复制色区', 'Show': '显示', 'Hide': '隐藏', 'Unlink wings': '拆分双翼', 'Unlink sides': '拆分两侧',
  'Wing': '作用范围', 'Side': '作用范围', 'Both wings': '双翼', 'Left wing': '左翼', 'Right wing': '右翼',
  'Both sides': '两侧', 'Left side': '左侧', 'Right side': '右侧',
  'Mirror wings': '双翼镜像', 'Mirror sides': '两侧镜像', 'Horizontal': '水平位置', 'Vertical': '垂直位置',
  'Position X': '水平位置', 'Position Y': '垂直位置', 'Radius': '色区半径', 'Strength': '色彩强度',
  'Softness': '边缘柔度', 'Stretch': '拉伸', 'Rotation': '旋转', 'Bend': '弯曲', 'Taper': '收束',
  'Size': '色区大小', 'Color intensity': '色彩强度', 'Edge softness': '边缘柔度',
  'Hue': '色相', 'Position': '色标位置', 'Mix midpoint': '混合中点', 'Transition width': '过渡宽度',
  'Finishing adjustments': '质感调整', 'Color depth': '色彩深度', 'Saturation': '饱和度',
  'Contrast': '对比度', 'Brightness': '亮度', 'Grain': '颗粒', 'Palettes': '预设色谱',
  'Original': '原色', 'Lagoon': '潟湖', 'Sunset': '落日', 'Prism': '棱镜', 'Acid': '酸绿', 'Porcelain': '瓷白',
  'Paired': '镜像', 'Single': '单色区', 'Left': '左', 'Right': '右', 'Hidden': '已隐藏',
  'Add color': '添加颜色', 'Selected color': '当前颜色', 'Remove selected color': '删除当前颜色',
  'Remove color': '删除颜色', 'Remove color area': '删除色区', 'A palette needs at least two colors': '至少保留两种颜色',
  'Open system color picker': '打开系统取色器', 'Color hue': '颜色色相', 'Color format': '颜色格式',
  'Color saturation and brightness': '颜色饱和度与亮度', 'Copy color': '复制颜色', 'Copy hex color': '复制 HEX 色值',
  'Color area placement': '局部色区位置', 'Drag to balance adjacent colors': '拖动以调整相邻颜色的混合比例',
  'Property categories': '属性分类', 'Canvas size': '画布尺寸', 'Background color': '背景颜色',
  'Replay from start': '从头播放', 'Color timeline': '色彩时间轴', 'Playback position': '播放进度', 'Export PNG': '导出 PNG',
  'Saved in this browser': '修改已保存在本机', 'Editing palette': '正在编辑色谱',
  'Changes are kept in this tab only': '修改仅保留在当前页面', 'Preview unavailable': '预览暂不可用',
  'Original palette and tone restored.': '已恢复默认色谱与质感。',
  'Color added. Choose its new shade.': '已添加颜色，可以调整新色值。',
  'Color removed. The remaining colors now blend together.': '颜色已删除，其余颜色将自然混合。',
  'Area added. Drag its point on the shape.': '色区已添加，可拖动画布中的编辑点。',
  'Drag to choose a color. Left and right arrows adjust saturation. Up and down arrows adjust brightness. Hold Shift for larger steps.': '拖动选择颜色，左右方向键调整饱和度，上下方向键调整亮度，按住 Shift 可加大步长。',
};
const originals = new WeakMap();
const englishPhrases = Object.fromEntries(Object.entries(phrases).map(([en, zh]) => [zh, en]));
function chinese(source) {
  if (phrases[source]) return phrases[source];
  let match;
  if ((match = source.match(/^COLOR (\d+)$/))) return `颜色 ${match[1]}`;
  if ((match = source.match(/^AREA (\d+) COLOR$/))) return `色区 ${match[1]} · 颜色`;
  if ((match = source.match(/^Area (\d+)$/))) return `色区 ${match[1]}`;
  if ((match = source.match(/^Select (\w+) shape$/))) return `选择${phrases[match[1]] || match[1]}形状`;
  if ((match = source.match(/^Apply (\w+) palette$/))) return `应用${phrases[match[1]] || match[1]}色谱`;
  if ((match = source.match(/^(Color stop position|Transition midpoint) (\d+)$/))) return `${match[1] === 'Color stop position' ? '色标位置' : '过渡中点'} ${match[2]}`;
  if ((match = source.match(/^Select color (\d+): (.+)$/))) return `选择颜色 ${match[1]}：${match[2]}`;
  if ((match = source.match(/^(\w+) palette applied$/))) return `已应用${phrases[match[1]] || match[1]}色谱`;
  return source;
}

export function localize(root) {
  const english = document.documentElement.dataset.siteLanguage === 'en';
  document.title = english ? 'Organic Color · Fluedit | CellMotion' : '流彩 Fluedit | CellMotion';
  root.querySelectorAll('[data-zh][data-en]').forEach(node => {
    const value = english ? node.dataset.en : node.dataset.zh;
    if (node.textContent !== value) node.textContent = value;
  });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script,style,textarea,input,output,svg,[data-zh]')) continue;
    const trimmed = node.nodeValue.trim();
    if (!trimmed) continue;
    const previous = originals.get(node);
    const source = previous && (trimmed === previous.source || trimmed === previous.translated) ? previous.source : trimmed;
    const translated = chinese(source);
    originals.set(node, { source, translated });
    const value = english ? source : translated;
    if (trimmed !== value) node.nodeValue = node.nodeValue.replace(trimmed, value);
  }
  root.querySelectorAll('[aria-label],[title],[placeholder]').forEach(node => {
    let entries = originals.get(node);
    if (!entries) { entries = {}; originals.set(node, entries); }
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      const current = node.getAttribute(attribute);
      if (!current) continue;
      const previous = entries[attribute];
      const source = previous && (current === previous.source || current === previous.translated) ? previous.source : (englishPhrases[current] || current);
      const translated = chinese(source);
      entries[attribute] = { source, translated };
      const value = english ? source : translated;
      if (current !== value) node.setAttribute(attribute, value);
    }
  });
}
