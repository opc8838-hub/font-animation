/* Rounded select presentation. Native selects remain the authoritative controls. */
(() => {
  if (!document.body.classList.contains('tc-workspace')) return;
  const body = document.body;
  const popover = document.createElement('div');
  popover.className = 'tc-select-popover';
  popover.id = 'tcSelectPopover';
  popover.setAttribute('role', 'listbox');
  popover.hidden = true;
  popover.style.display = 'none';
  body.append(popover);
  let active = null;

  function close({ focus = false } = {}) {
    if (!active) return;
    const { trigger } = active;
    trigger.setAttribute('aria-expanded', 'false');
    popover.hidden = true;
    popover.style.display = 'none';
    popover.replaceChildren();
    active = null;
    if (focus && trigger.isConnected) trigger.focus({ preventScroll: true });
  }

  function sync(select) {
    const trigger = select.nextElementSibling;
    if (!trigger?.classList.contains('tc-select-trigger')) return;
    const option = select.selectedOptions[0] || select.options[0];
    trigger.querySelector('.tc-select-label').textContent = option?.textContent || '';
    trigger.disabled = select.disabled;
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || select.closest('label')?.childNodes[0]?.textContent?.trim() || option?.textContent || 'Select');
  }

  function menuItems(select) {
    const fragment = document.createDocumentFragment();
    [...select.children].forEach(child => {
      if (child.tagName === 'OPTGROUP') {
        const heading = document.createElement('div');
        heading.className = 'tc-select-group';
        heading.textContent = child.label;
        fragment.append(heading);
        [...child.children].forEach(option => fragment.append(optionButton(select, option)));
      } else if (child.tagName === 'OPTION') fragment.append(optionButton(select, child));
    });
    return fragment;
  }

  function optionButton(select, option) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tc-select-option';
    button.dataset.value = option.value;
    button.textContent = option.textContent;
    button.disabled = option.disabled;
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(option.value === select.value));
    button.tabIndex = option.value === select.value ? 0 : -1;
    return button;
  }

  function positionPopover(trigger) {
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const maxHeight = Math.min(360, window.innerHeight - margin * 2);
    const width = Math.max(rect.width, Math.min(300, window.innerWidth - margin * 2));
    popover.style.width = `${width}px`;
    popover.style.maxHeight = `${maxHeight}px`;
    const measuredHeight = Math.min(popover.scrollHeight, maxHeight);
    const roomBelow = window.innerHeight - rect.bottom - margin;
    const top = roomBelow >= Math.min(measuredHeight, 180)
      ? rect.bottom + 6
      : Math.max(margin, rect.top - measuredHeight - 6);
    popover.style.left = `${Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))}px`;
    popover.style.top = `${top}px`;
  }

  function open(select) {
    if (active?.select === select) { close({ focus: true }); return; }
    close();
    const trigger = select.nextElementSibling;
    active = { select, trigger };
    popover.replaceChildren(menuItems(select));
    popover.hidden = false;
    popover.style.display = 'block';
    trigger.setAttribute('aria-expanded', 'true');
    positionPopover(trigger);
    const selected = popover.querySelector('[aria-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }

  function refreshOpen(select) {
    if (active?.select !== select) return;
    popover.replaceChildren(menuItems(select));
    positionPopover(active.trigger);
    popover.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }

  function enhance(select) {
    if (select.dataset.tcRoundedSelect === 'true') return;
    select.dataset.tcRoundedSelect = 'true';
    select.classList.add('tc-native-select');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'tc-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-controls', popover.id);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="tc-select-label"></span><i aria-hidden="true"></i>';
    select.after(trigger);
    sync(select);
    trigger.addEventListener('click', () => open(select));
    trigger.addEventListener('keydown', event => {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        open(select);
        const selected = popover.querySelector('[aria-selected="true"]');
        selected?.focus({ preventScroll: true });
      }
    });
    select.addEventListener('change', () => sync(select));
    new MutationObserver(() => {
      sync(select);
      refreshOpen(select);
    }).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'label'] });
  }

  function enhanceTree(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('select')) enhance(root);
    root.querySelectorAll?.('select').forEach(enhance);
  }

  popover.addEventListener('click', event => {
    const option = event.target.closest('.tc-select-option');
    if (!option || !active || option.disabled) return;
    active.select.value = option.dataset.value;
    active.select.dispatchEvent(new Event('input', { bubbles: true }));
    active.select.dispatchEvent(new Event('change', { bubbles: true }));
    sync(active.select);
    close({ focus: true });
  });
  popover.addEventListener('keydown', event => {
    const options = [...popover.querySelectorAll('.tc-select-option:not(:disabled)')];
    const index = options.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); close({ focus: true }); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); document.activeElement?.click(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    options[next]?.focus({ preventScroll: true });
    options[next]?.scrollIntoView({ block: 'nearest' });
  });
  document.addEventListener('pointerdown', event => {
    if (active && !popover.contains(event.target) && !active.trigger.contains(event.target)) close();
  }, true);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close({ focus: true }); });
  window.addEventListener('resize', () => { if (active) positionPopover(active.trigger); });
  document.addEventListener('scroll', event => {
    if (!active || event.target === popover || popover.contains(event.target)) return;
    requestAnimationFrame(() => { if (active) positionPopover(active.trigger); });
  }, true);
  document.addEventListener('tc-languagechange', () => {
    document.querySelectorAll('select[data-tc-rounded-select="true"]').forEach(sync);
    if (active) refreshOpen(active.select);
  });
  document.querySelectorAll('select').forEach(enhance);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(enhanceTree)))
    .observe(body, { childList: true, subtree: true });
})();
