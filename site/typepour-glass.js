/* Photographic glass shell, layered around the exact same fluid boundaries. */
(() => {
  'use strict';
  const asset = new Image();
  const ready = new Promise((resolve,reject)=>{asset.onload=resolve;asset.onerror=()=>reject(new Error('玻璃杯素材加载失败'));});
  asset.src='assets/typepour/clear-tumbler-v2.png';
  function drawAsset(ctx) {
    // Preserve the accepted inner floor at y=865. Compress only the heavy optical base.
    ctx.drawImage(asset,120,110,810,1010,288,414,374,451);
    ctx.drawImage(asset,120,1120,810,280,288,865,374,74);
  }
  function back(ctx) {
    ctx.save();
    const shadow=ctx.createRadialGradient(475,939,8,475,939,180);
    shadow.addColorStop(0,'#292a2b28');shadow.addColorStop(.65,'#292a2b0b');shadow.addColorStop(1,'#292a2b00');
    ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(475,940,185,18,0,0,Math.PI*2);ctx.fill();
    drawAsset(ctx);ctx.restore();
  }
  function front(ctx, fluidCanvas) {
    ctx.save();
    // Real reflected edges and heavy base in front; the center is open for legible liquid.
    ctx.beginPath();
    ctx.moveTo(287,442);ctx.lineTo(314,454);ctx.lineTo(338,873);ctx.lineTo(286,873);ctx.closePath();
    ctx.moveTo(636,452);ctx.lineTo(663,443);ctx.lineTo(663,874);ctx.lineTo(611,874);ctx.closePath();
    ctx.rect(287,858,377,86);
    // Only the nearer half of the mouth can cover the falling stream.
    ctx.moveTo(299,450);ctx.bezierCurveTo(344,480,608,480,651,450);
    ctx.lineTo(651,462);ctx.bezierCurveTo(597,490,347,490,299,462);ctx.closePath();
    ctx.clip();drawAsset(ctx);ctx.restore();
    // Fresnel refraction of the current animated content along both sides of the glass.
    if(fluidCanvas){
      ctx.save();ctx.globalAlpha=.21;
      ctx.beginPath();ctx.moveTo(315,478);ctx.lineTo(326,853);ctx.lineTo(340,853);ctx.lineTo(326,478);ctx.closePath();ctx.clip();
      ctx.drawImage(fluidCanvas,316,478,22,375,314,478,30,375);ctx.restore();
      ctx.save();ctx.globalAlpha=.17;
      ctx.beginPath();ctx.moveTo(634,478);ctx.lineTo(621,853);ctx.lineTo(609,853);ctx.lineTo(622,478);ctx.closePath();ctx.clip();
      ctx.drawImage(fluidCanvas,611,478,22,375,605,478,30,375);ctx.restore();
    }
    // Broad, weak softbox reflections: these reveal the curved wall without whitening the pool.
    const sheen=ctx.createLinearGradient(318,0,640,0);
    [[0,'#ffffff00'],[.045,'#ffffff8a'],[.10,'#ffffff10'],[.24,'#ffffff00'],[.81,'#ffffff00'],[.90,'#ffffff44'],[1,'#ffffff00']].forEach(([p,c])=>sheen.addColorStop(p,c));
    ctx.beginPath();ctx.moveTo(314,468);ctx.lineTo(334,852);ctx.quadraticCurveTo(475,878,618,852);ctx.lineTo(636,468);ctx.closePath();ctx.fillStyle=sheen;ctx.fill();
  }
  window.TypePourGlass={ready,back,front};
})();
