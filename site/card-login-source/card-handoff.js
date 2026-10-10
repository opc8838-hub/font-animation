const MOTION = Object.freeze({
  fps: 60,
  durationMs: 1800,
  frameStops: [0, 6, 96, 108],
  faceSwitchPercent: 32.001,
  contentDelayMs: 1050,
  contentDurationMs: 600
});

const loginMarkup = () => `
  <div class="login-overlay" data-login-overlay>
    <div class="login-perspective">
      <form class="card-handoff" data-card-handoff>
        <div class="card-face card-back" aria-hidden="true">
          <span class="card-eyes"><i></i><i></i></span>
        </div>
        <div class="card-face card-front">
          <div class="login-content">
            <span class="login-kicker">CARDBOT WORKSPACE</span>
            <h1>Welcome back.</h1>
            <p>Continue to your company workspace.</p>
            <label><span>Account</span><input autocomplete="username"></label>
            <label><span>Password</span><input type="password" autocomplete="current-password"></label>
            <button class="login-submit" type="button">Log in <span>↗</span></button>
            <footer><span>One workday. Every conversation.</span><b>● READY</b></footer>
          </div>
        </div>
      </form>
    </div>
  </div>`;

/**
 * 按视频末帧卡片的实际 CSS 像素尺寸，计算动画起点。
 * 量的是播放器最终呈现后的尺寸，不是视频源文件的像素。
 */
function setHandoffFootprint(card, {
  sourceWidth,
  sourceHeight,
  offsetY = -14,
  rotateY = -2,
  rotateZ = -5
}) {
  // offsetWidth/offsetHeight 不包含正在播放的起始 transform。
  card.style.setProperty('--handoff-scale-x', String(sourceWidth / card.offsetWidth));
  card.style.setProperty('--handoff-scale-y', String(sourceHeight / card.offsetHeight));
  card.style.setProperty('--handoff-offset-y', `${offsetY}px`);
  card.style.setProperty('--handoff-rotate-y', `${rotateY}deg`);
  card.style.setProperty('--handoff-rotate-z', `${rotateZ}deg`);
}

function armRestState(card, onSettled = () => {}) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    card.classList.add('is-rest');
    onSettled();
    return;
  }
  const settle = (event) => {
    if (event.target !== card || event.animationName !== 'card-to-login') return;
    card.classList.add('is-rest');
    card.removeEventListener('animationend', settle);
    onSettled();
  };
  card.addEventListener('animationend', settle);
}

/**
 * container 必须同时承载视频末帧和登录 overlay，避免交接时重建整屏。
 */
function startCardLoginHandoff(container, options = {}) {
  container.querySelector('[data-login-overlay]')?.remove();
  container.classList.remove('handoff-active');
  container.insertAdjacentHTML('beforeend', loginMarkup());
  const card = container.querySelector('[data-card-handoff]');

  if (options.sourceWidth && options.sourceHeight) {
    setHandoffFootprint(card, options);
  }

  armRestState(card, options.onSettled);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    container.classList.add('handoff-active');
  }));
  return card;
}

window.CardBotHandoff = {
  MOTION,
  start: startCardLoginHandoff,
  setFootprint: setHandoffFootprint
};

const demo = document.querySelector('[data-demo-stage]');
const replay = document.querySelector('[data-replay]');
if (demo && replay) {
  const play = () => {
    demo.querySelector('[data-login-overlay]')?.remove();
    demo.classList.remove('handoff-active');
    void demo.offsetWidth;
    window.setTimeout(() => startCardLoginHandoff(demo), 180);
  };
  replay.addEventListener('click', play);
  window.setTimeout(play, 450);
}
