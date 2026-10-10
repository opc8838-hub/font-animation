# CardBot 卡片 → 登录页衔接动效包

- [在线预览](https://opc8838-hub.github.io/cardbot/motion-kits/login-handoff/)
- [直接下载独立 ZIP](https://opc8838-hub.github.io/cardbot/motion-kits/cardbot-login-handoff.zip)
- [原站完整开场](https://opc8838-hub.github.io/cardbot/?intro=1)
- [原版时间轴与参考帧](../../frontend/motion/cardbot-entry/)
- [全部动效入口](https://opc8838-hub.github.io/cardbot/motion-kits/)

下载 ZIP 并解压，双击 `index.html` 即可看独立转场。这个预览只展示登录页面外观，Log in 按钮不执行登录；移植时由你的项目绑定动作。

这是从 CardBot 当前开场中独立抽出的「视频末帧接管 → 同尺寸保持 → 旋转放大 → 黑转白 → 登录内容出现」动效。

它不包含原来的卡牌视频，也不依赖 CardBot 工作台。你可以把自己的视频放在前面，在视频 `ended` 时调用这里的衔接函数。

## 文件

- `index.html`：双击即可看的独立预览。
- `card-handoff.css`：完整视觉和 60fps 关键帧。
- `card-handoff.js`：预览页控制器与尺寸校准入口。
- `handoff-from-video.ts`：接到现有 `<video>` 后面的 TypeScript 示例。
- `motion-spec.json`：可以交给其他项目或动效工具读取的参数数据。
- `reference/`：原项目的末帧与关键帧参考图，方便校准。
- `LICENSE`：Apache-2.0 许可。原作者/项目归属及使用方式见 `NOTICE`。

## 核心时间轴

| 区间 | 帧 | 时间 | 发生什么 |
|---|---:|---:|---|
| 同高接管 | 0–6 | 0–100ms | 卡片保持视频末帧尺寸，不先缩小 |
| 主翻转放大 | 6–96 | 100–1600ms | 同一合成层旋转到 180°，同时放大到 1.01 |
| 黑白换面 | ≈35 | ≈576ms | 卡片接近侧边时，黑背面隐藏、白正面接管 |
| 内容进入 | 63–99 | 1050–1650ms | 登录内容上移 18px 并渐显 |
| 轻微落稳 | 96–108 | 1600–1800ms | 1.01 回落到 1.00，不突然刹停 |

## 精确动效参数

```css
/* 起点：和视频尾卡对齐 */
transform:
  translateY(-14px)
  translateZ(0)
  scale3d(.47, .445, 1)
  rotateY(-2deg)
  rotateZ(-5deg);

/* 主段终点 */
transform:
  translateY(0)
  translateZ(0)
  scale3d(1.01, 1.01, 1)
  rotateY(180deg)
  rotateZ(0);

/* 最终静止 */
transform:
  translateY(0)
  translateZ(0)
  scale3d(1, 1, 1)
  rotateY(180deg)
  rotateZ(0);
```

- 总时长：`1800ms`
- 目标帧率：`60fps`
- 总帧数：`108`
- 关键帧：`[0, 6, 96, 108]`
- 主曲线：`cubic-bezier(.25,.1,.25,1)`
- 落稳曲线：`cubic-bezier(.22,1,.36,1)`
- 内容曲线：`cubic-bezier(.22,1,.36,1)`
- 透视距离：`1500px`
- 只动画 `transform` 与 `opacity`，不动画 `width/height/background/border`。

## “同高”怎样适配你的视频

原项目最终登录卡尺寸是 `440 × 590px`。起始缩放并不是固定理论值，而是根据视频末帧中央卡牌校准出来的：

```text
scaleX = 视频尾卡宽度 / 登录卡宽度
scaleY = 视频尾卡高度 / 登录卡高度
```

当前成品使用：

```text
scaleX = 0.47
scaleY = 0.445
offsetY = -14px
rotateY = -2deg
rotateZ = -5deg
```

如果你的视频尾卡换了位置或大小，只改四个 CSS 变量即可：

```css
.card-handoff {
  --handoff-scale-x: .47;
  --handoff-scale-y: .445;
  --handoff-offset-y: -14px;
  --handoff-rotate-z: -5deg;
}
```

也可以在 JS 中按像素校准：

```js
setHandoffFootprint(card, {
  sourceWidth: 230,
  sourceHeight: 279,
  offsetY: -14,
  rotateZ: -5
});
```

函数使用登录卡动画前的布局宽高计算 `scaleX/scaleY`。请在你的最终播放分辨率下量视频尾卡，而不是拿视频源文件像素直接除。输入尺寸是未倾斜的轮廓；若测的是已经倾斜后的包围盒，需要结合倾角再次校准。

## 无缝衔接的关键

1. 视频结束时不要立刻删除 `<video>`；让最后一帧继续停留在原 DOM 层。
2. 把登录卡叠在同一个全屏容器中，定位中心必须完全一致。
3. 插入登录卡后等待两个 `requestAnimationFrame`，再启动交接。
4. 视频在第 `60ms` 开始用 `120ms linear` 淡出；卡片也在 `60ms` 开始显现。
5. 前 6 帧保持同样几何尺寸，消除“先缩小、卡一下、再放大”的视觉落差。
6. 黑背面只显示到旋转侧边；白正面随后接管。不要先放大整张黑卡再改白。
7. 动画结束后移除动画态，直接落在最终静止样式，避免重绘抖动。

## 接入现有视频

先加载 `card-handoff.css` 和 `card-handoff.js`，再参考 `handoff-from-video.ts`：监听视频 `ended`，将登录场景插到视频容器里，再调用 `window.CardBotHandoff.start(...)`。视频添加 `class="handoff-video"`，容器应为全屏的相对定位元素。示例：

```html
<link rel="stylesheet" href="card-handoff.css">
<section id="film" style="position:relative;height:100svh;overflow:hidden">
  <video class="handoff-video" src="your-cards.mp4" autoplay muted playsinline></video>
</section>
<script src="card-handoff.js"></script>
<script>
  const stage = document.querySelector('#film');
  const video = stage.querySelector('video');
  video.addEventListener('ended', () => {
    window.CardBotHandoff.start(stage, {
      onSettled: () => console.log('login ready')
    });
  }, { once: true });
</script>
```

默认参数复用 CardBot 已校准的起点；更换视频后可传 `sourceWidth/sourceHeight/offsetY/rotateZ` 重新匹配。

## 响应式规则

- 桌面登录卡：`min(440px, 100vw - 40px)` × `min(590px, 100svh - 118px)`。
- 760px 以下：宽度改为 `100vw - 28px`，高度改为 `100svh - 88px`。
- 小屏幕最终卡片尺寸变化后，应再次按实际渲染尺寸计算起点 `scaleX/scaleY`。
- `prefers-reduced-motion: reduce` 时直接显示白色登录最终态。

## 性能要求

- 卡片尺寸在动画开始前就确定，运动中不修改布局尺寸。
- `will-change: transform, opacity` 只放在运动主体。
- 只保留一个旋转放大合成层。
- 不在每帧 JS 中改样式；CSS 关键帧交给浏览器合成器。
