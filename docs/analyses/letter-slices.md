# 字形切片 / Letter Slices

## 2026-11-02 correction

The earlier explanation below described horizontal sampling displacement. Frame by frame review of the source video at 0.55, 1.8 and 2.15 seconds disproved that model. The peak has repeated dark letter planes with white gaps, a solid central body and narrow blue/cyan and amber edge light. Its outer shape remains readable as `a`. A simple striped glyph looked flat; fully compressed copies made a rectangular block.

The revised renderer repeats horizontally compressed copies of the selected glyph, clips them to a widened glyph silhouette, and retains a dark central body. Blue, cyan and amber copies are offset by a few pixels behind each dark face, with a weak blurred blue halo. The number of visible planes grows during expansion and shrinks during return. A full glyph fades over the early and late transitions so the shape does not break apart before the planes have spread.

This remains an approximation: the post does not provide its source font, 3D geometry, material settings or motion curves. The default uses the shared Montserrat preset, while the same rendering and export path supports other text and font choices.

来源：[Fabio - abduzeedo 的 X 视频](https://x.com/abduzeedo/status/2115976186711134655)，2026-10-30 发布。保存原视频于本地工作输出，未提交仓库。原片为 1080×1080、4.088 秒、240 帧、约 58.7 FPS，无音轨。用 Watch 浏览全片，用 FFmpeg 以 8 FPS 抽取接触表，并核对 0.1 秒与 1.65 秒的全尺寸帧。

## 可见证据

| 时间 | 观察 | 实现解释 | 把握 |
| --- | --- | --- | --- |
| 0–0.3s | 白底中央为完整深灰色小写 `a` | 字形静态停留 | 高 |
| 0.3–0.8s | 字形先出现数层错位，边缘有微弱蓝、橙色 | 切片位移从零加速，叠加色边 | 高 |
| 0.8–1.5s | 字形分裂为越来越密的纵向竖片，内孔也出现重复轮廓 | 水平方向的周期性采样位移 | 高 |
| 1.5–2.5s | 竖片形成尖锐锯齿边缘，整体仍读得出 `a`，变化很小 | 展开峰值短暂停留 | 高 |
| 2.5–3.5s | 竖片逐步合并，重复轮廓消失 | 同一位移场反向收拢 | 高 |
| 3.5–4.088s | 完整字形重新出现 | 收尾停留，进入循环 | 高 |

## 动作约束

- 背景固定白色；主体为单个深灰字形，光学中心在方形画布中央。
- 切片只改变字形的水平取样位置，不改变字母身份；蓝、橙错位贴近切片边缘。
- 展开和收拢使用同一条位移函数，峰值附近短暂停留。
- 换字母、中文、日文或韩文字符时，沿用同一切片运动；字体从共享字库选择。
- 预览、逐帧定位与 PNG/GIF/MP4 导出调用同一个确定性 Canvas 绘制函数。

## 取舍与未确定项

原视频未公开逐帧工程参数或字体文件，推文只提到使用外部工具制作。默认使用共享字库中的 Montserrat 近似字形；条纹来自周期性横向采样，微小色边以蓝橙两层模拟。原片底部的创作者网址属于作品署名，不作为可替换文字动效的一部分写进导出画面。
