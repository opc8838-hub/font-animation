(() => {
  const root = document.documentElement;
  const themeButton = document.getElementById('portal-theme');
  let theme = 'light';
  try { theme = localStorage.getItem('cellmotion-site-theme') === 'dark' ? 'dark' : 'light'; } catch (_) {}
  function applyTheme() {
    root.dataset.siteTheme = theme;
    themeButton.textContent = theme === 'dark' ? '☼' : '◐';
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
  }
  applyTheme();
  document.addEventListener('cellmotion:languagechange', applyTheme);
  themeButton.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    try { localStorage.setItem('cellmotion-site-theme', theme); } catch (_) {}
  });
  let toastTimer;
  function toast(message) {
    const status = document.getElementById('portal-toast');
    clearTimeout(toastTimer);
    status.textContent = message;
    status.hidden = false;
    toastTimer = setTimeout(() => { status.hidden = true; }, 2800);
  }
  const copy = document.getElementById('portal-copy');
  copy.addEventListener('click', async () => {
    copy.disabled = true;
    try {
      // Start the clipboard write in the click gesture, including on Safari.
      const prompt = fetch('live-portal/AI_PROMPT.md').then(response => {
        if (!response.ok) throw new Error('Prompt unavailable');
        return response.text();
      });
      if (window.ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': prompt.then(text => new Blob([text], { type: 'text/plain' })) })]);
      } else {
        await navigator.clipboard.writeText(await prompt);
      }
      toast('已复制 / Copied');
    } catch (_) {
      toast('复制失败，请重试 / Could not copy. Please retry.');
    } finally { copy.disabled = false; }
  });
})();
