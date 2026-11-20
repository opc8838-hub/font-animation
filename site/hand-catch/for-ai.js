function bilingual(parent, tag, copy) {
  const element = document.createElement(tag);
  for (const [key, lang] of [['zh', 'zh-CN'], ['en', 'en']]) {
    const text = document.createElement('span');
    text.lang = lang;
    text.textContent = copy[key];
    element.append(text);
  }
  parent.append(element);
}

try {
  const url = document.querySelector('#descriptor').href;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Descriptor HTTP ${response.status}`);
  const descriptor = await response.json();
  bilingual(document.querySelector('#input-copy'), 'span', descriptor.inputs.description);
  const recipe = document.querySelector('#recipe');

  for (const step of descriptor.reconstruction) {
    const section = document.createElement('section');
    section.id = step.id;
    bilingual(section, 'h2', step.name);
    bilingual(section, 'p', step.description);
    bilingual(section, 'pre', step.template);
    const files = document.createElement('ul');
    for (const file of step.files) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = new URL(`source/${file}`, location.href);
      link.textContent = file;
      item.append(link);
      files.append(item);
    }
    section.append(files);
    recipe.append(section);
  }
} catch {
  document.querySelector('#status').hidden = false;
}
