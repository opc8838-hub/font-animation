export type HandoffOptions = {
  sourceWidth?: number;
  sourceHeight?: number;
  offsetY?: number;
  rotateY?: number;
  rotateZ?: number;
  onSettled?: () => void;
};

declare global {
  interface Window {
    CardBotHandoff: {
      start: (container: HTMLElement, options?: HandoffOptions) => HTMLElement;
      setFootprint: (card: HTMLElement, options: HandoffOptions) => void;
    };
  }
}

/**
 * HTML 结构：
 * <section data-card-film>
 *   <video class="handoff-video" data-card-film-video ...></video>
 * </section>
 *
 * section 要 position:relative; overflow:hidden;
 * 视频建议 width/height:100%; object-fit:cover;
 * 不要在 ended 回调里删除 video。
 */
export function connectCardFilmToLogin(
  container: HTMLElement,
  video: HTMLVideoElement,
  options: HandoffOptions = {}
) {
  let started = false;

  const advance = () => {
    if (started) return;
    started = true;

    window.CardBotHandoff.start(container, {
      // 当前 CardBot 成品校准值；换视频后可按末帧实测覆盖。
      sourceWidth: options.sourceWidth,
      sourceHeight: options.sourceHeight,
      offsetY: options.offsetY ?? -14,
      rotateY: options.rotateY ?? -2,
      rotateZ: options.rotateZ ?? -5,
      onSettled: options.onSettled
    });
  };

  video.addEventListener('ended', advance, { once: true });

  return () => {
    started = true;
    video.removeEventListener('ended', advance);
  };
}
