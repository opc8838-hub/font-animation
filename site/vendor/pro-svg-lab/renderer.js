/* Independent study of Refero's PRO material. No library or animation loop required.
 * The public site's filter architecture is credited in analysis.md.
 * Letter geometry, palette sampling, controls and extensions are authored for this study. */
(function (root) {
  'use strict';
  const path = 'M0 3H59C86 3 101 16 101 42C101 67 86 81 59 81H30V126H0ZM30 28V56H52C64 56 70 52 70 42C70 32 64 28 52 28Z M108 3H166C194 3 210 15 210 38C210 54 201 65 185 69C202 73 207 88 208 110C209 119 209 123 212 125V126H180C177 122 179 101 174 92C171 86 166 83 158 83H139V126H108ZM139 28V58H160C173 58 180 53 180 43C180 33 173 28 160 28Z M275 0C314 0 337 26 337 64C337 103 314 129 275 129C237 129 214 103 214 64C214 26 237 0 275 0ZM275 25C255 25 245 39 245 64C245 90 255 104 275 104C295 104 306 90 306 64C306 39 295 25 275 25Z';
  const palettes = {
    original: [[0,'#000000'],[.1833,'#000000'],[.2833,'#001465'],[.4,'#00aaff'],[.45,'#e1e1fe'],[.5,'#ffcb5c'],[.55,'#ff4400'],[.6,'#f384ff'],[.6667,'#ffffff'],[1,'#ffffff']],
    silver: [[0,'#060914'],[.19,'#060914'],[.3,'#192639'],[.38,'#90a3b3'],[.43,'#f7ffff'],[.48,'#344052'],[.53,'#b6c3cf'],[.58,'#eef5fa'],[.6667,'#ffffff'],[1,'#ffffff']],
    lava: [[0,'#100406'],[.2,'#180708'],[.3,'#672020'],[.39,'#ec420c'],[.45,'#ffda40'],[.49,'#fff7ce'],[.55,'#ff7b31'],[.62,'#ffdcc2'],[.68,'#ffffff'],[1,'#ffffff']],
    violet: [[0,'#09041c'],[.2,'#110732'],[.3,'#2d1274'],[.4,'#8156ff'],[.45,'#a1ffff'],[.5,'#feefff'],[.55,'#fb62c5'],[.6,'#cfabff'],[.6667,'#ffffff'],[1,'#ffffff']]
  };
  function rgb(h) { return [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255); }
  function tables(name) {
    const stops = (palettes[name] || palettes.original).map(([x,c]) => [x,rgb(c)]);
    return [0,1,2].map(ch => Array.from({length:61}, (_,i) => {
      const x=i/60; let k=1;
      while(k<stops.length-1 && stops[k][0]<x) k++;
      const [a,A]=stops[k-1], [b,B]=stops[k];
      return +(A[ch]+(B[ch]-A[ch])*(x-a)/(b-a)).toFixed(3);
    }).join(' '));
  }
  function create(options={}) {
    const o={id:'pro',blur:7.3,grain:.12,period:4.4,palette:'original',stage:5,warp:0,light:0,intro:true,...options};
    const p=o.id.replace(/[^a-zA-Z0-9_-]/g,'');
    const id=n=>`${p}-${n}`;
    const url=n=>`url(#${id(n)})`;
    const f=n=>Number(n).toFixed(4).replace(/\.?0+$/,'') || '0';
    const matrixA=k=>`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${k} 0`;
    const palette=tables(o.palette);
    const bands=Array.from({length:17},(_,i)=>{
      const v=Math.round(255*Math.pow((1+Math.cos(2*Math.PI*i/16))/2,2.2));
      return `<stop offset="${i/16}" stop-color="rgb(${v},${v},${v})"/>`;
    }).join('');
    const reveal=Array.from({length:17},(_,i)=>`<stop offset="${i/16}" stop-color="white" stop-opacity="${f(Math.pow((1-Math.cos(Math.PI*i/16))/2,2.2))}"/>`).join('');
    const inner=[[1.5,.43],[4.5,.67],[9.5,.73]].map(([b,a],i)=>`
      <feGaussianBlur in="hard" stdDeviation="${b}" result="blur${i}"/>
      <feComposite in="blur${i}" in2="hard" operator="arithmetic" k2="-1" k3="1"/>
      <feColorMatrix values="${matrixA(a)}" result="rim${i}"/>`).join('');
    const extraWarp=o.warp>0?`
      <feTurbulence type="fractalNoise" baseFrequency=".018 .035" numOctaves="2" seed="8" result="flow">
        <animate attributeName="baseFrequency" values=".018 .035;.027 .02;.018 .035" dur="${o.period*2}s" repeatCount="indefinite"/>
      </feTurbulence>
      <feDisplacementMap in="textured" in2="flow" scale="${o.warp}" xChannelSelector="R" yChannelSelector="G" result="distorted"/>` : '';
    const extraLight=o.light>0?`
      <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="height"/>
      <feSpecularLighting in="height" surfaceScale="5" specularConstant="${o.light}" specularExponent="22" lighting-color="#dceeff" result="specular">
        <fePointLight x="-60" y="-60" z="90"><animate attributeName="x" values="-60;397;-60" dur="${o.period*2}s" repeatCount="indefinite"/></fePointLight>
      </feSpecularLighting>
      <feComposite in="specular" in2="SourceAlpha" operator="in"/>
      <feBlend in2="colored" mode="screen"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-18 -24 373 177" width="746" height="354" role="img" aria-label="PRO — animated SVG material" data-material="${o.palette}">
  <title>PRO · SVG material study</title>
  <desc>Independent recreation inspired by Mike Bespalov / Refero. Native SVG filters and SMIL. No JavaScript, video or canvas needed by this image.</desc>
  <defs>
    <path id="${id('letters')}" d="${path}" fill-rule="evenodd"/>
    <linearGradient id="${id('sweep')}" gradientUnits="userSpaceOnUse" x1="0" y1="64" x2="486" y2="64" spreadMethod="repeat" gradientTransform="rotate(-35 168 64)">
      ${bands}
      <animateTransform attributeName="gradientTransform" type="translate" from="109 0" to="595 0" dur="${o.period}s" repeatCount="indefinite" additive="sum"/>
    </linearGradient>
    <linearGradient id="${id('reveal')}" gradientUnits="userSpaceOnUse" x1="-243" y1="64" x2="0" y2="64" gradientTransform="rotate(-35 168 64)">
      ${reveal}
      <animateTransform attributeName="gradientTransform" type="translate" from="109 0" to="594 0" dur="${Math.max(.1,o.period-.01)}s" fill="freeze" additive="sum"/>
    </linearGradient>
    <filter id="${id('relief')}" x="0" y="0" width="337" height="129" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceAlpha" values="${matrixA(127)}" result="hard"/>
      ${inner}
      <feMerge><feMergeNode in="rim0"/><feMergeNode in="rim1"/><feMergeNode in="rim2"/></feMerge>
      <feColorMatrix values="0 0 0 -1 1 0 0 0 -1 1 0 0 0 -1 1 0 0 0 0 1" result="contour"/>
      <feFlood flood-color="#9d9d9d"/>
      <feComposite in2="contour" operator="arithmetic" k2="1" k3=".59" k4="-.59" result="base"/>
      <feColorMatrix in="SourceGraphic" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 ${o.stage===1?0:.61} 0" result="stripe"/>
      <feBlend in="stripe" in2="base" mode="overlay"/>
      <feComposite in2="SourceAlpha" operator="in"/>
    </filter>
    <filter id="${id('finish')}" x="-24" y="-24" width="385" height="177" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-color="white" result="paper"/>
      <feMerge><feMergeNode in="paper"/><feMergeNode in="SourceGraphic"/></feMerge>
      <feGaussianBlur stdDeviation="${o.blur}" result="soft"/>
      ${o.stage>=4?`<feTurbulence type="fractalNoise" baseFrequency="4" numOctaves="1" stitchTiles="stitch" seed="0"/>
      <feColorMatrix values="-${o.grain} 0 0 0 1 -${o.grain} 0 0 0 1 -${o.grain} 0 0 0 1 0 0 0 0 1" result="grain"/>
      <feComposite in="soft" in2="grain" operator="arithmetic" k1="1" result="textured"/>`:''}
      ${o.stage===5?`${extraWarp}
      <feComponentTransfer result="colored">${['R','G','B'].map((ch,i)=>`<feFunc${ch} type="table" tableValues="${palette[i]}"/>`).join('')}</feComponentTransfer>${extraLight}`:''}
    </filter>
  </defs>
  <g ${o.stage>=3?`filter="${url('finish')}"`:''}>
    <use href="#${id('letters')}" fill="${o.stage<=1?'#16181b':url('sweep')}" ${o.stage>0?`filter="${url('relief')}"`:''}/>
    ${o.intro&&o.stage>=2?`<use href="#${id('letters')}" fill="${url('reveal')}"/>`:''}
  </g>
</svg>`.replace(/[ \t]+$/gm,'');
  }
  root.SVGMaterial={create,tables,palettes,path};
})(typeof window!=='undefined'?window:globalThis);
