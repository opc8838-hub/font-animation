/* Mechanical build of immutable presets and native-model AI descriptors. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const site = path.resolve(__dirname, '../site');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(site,'cardmotion-renderers.js'),'utf8'),context);
const library = JSON.parse(fs.readFileSync(path.join(site,'assets/cardbot/library.json'),'utf8')).cards;
const source = fs.readFileSync(path.join(site,'cardmotion-editor.js'),'utf8');
const lists = source.split('const fields = login ? [')[1].split('const input =')[0].split('] : [');
const pair = (zh,en) => ({zh,en});
for (const [index,id,name,en] of [[0,'card-login','翻牌登录','Card Login'],[1,'carddeck','卡牌剧场','Card Deck']]) {
  const preset = context.window.CardMotion.defaults(id,library);
  fs.writeFileSync(path.join(site,`assets/presets/${id}-default.json`),JSON.stringify(preset,null,2)+'\n');
  const parameters = [...lists[index].matchAll(/\['([^']+)','([^']+)','([^']+)',(-?[\d.]+),(-?[\d.]+),([\d.]+),'([^']*)'\]/g)].map(([,key,zh,en,lo,hi,,unit])=>({
    path:`composition.${key}`,scope:'effect',name:pair(zh,en),type:'number',minimum:Number(lo),maximum:Number(hi),unit:unit==='%'?'ratio':unit,
    ...(unit==='%'?{description:pair('以倍率保存，0.32 表示 32%；界面显示百分比。','Stored as a ratio: 0.32 means 32%; the editor displays percentages.')}:{})
  }));
  parameters.unshift(...[['canvas.width','画布宽度','Canvas width','integer','px'],['canvas.height','画布高度','Canvas height','integer','px'],['backgroundColor','画面背景','Background','color',''],['motion.speed','整体速度','Overall speed','number','×'],['motion.loop','循环播放','Loop playback','boolean','']].map(([key,zh,en,type,unit])=>({path:`composition.${key}`,scope:'global',name:pair(zh,en),type,unit})));
  parameters.push(...[['backgroundMedia','背景素材','Background media','media'],['backgroundMedia.videoStart','视频起点','Video trim start','number'],['backgroundMedia.videoEnd','视频终点','Video trim end','number'],['customAssets','上传素材','Embedded uploads','array']].map(([key,zh,en,type])=>({path:`composition.${key}`,scope:'global',name:pair(zh,en),type})));
  const sceneNames = {brand:['品牌','Brand'],title:['标题','Title'],subtitle:['说明','Subtitle'],account:['账号标签','Account label'],password:['密码标签','Password label'],button:['按钮文字','Button text'],footer:['底部文字','Footer'],frontColor:['登录正面','Login face'],backColor:['卡牌背面','Card back'],textColor:['文字颜色','Text color'],accent:['强调色','Accent'],width:['登录卡宽度','Card width'],height:['登录卡高度','Card height'],radius:['圆角','Corner radius'],x:['水平位置','Horizontal position'],y:['垂直位置','Vertical position']};
  if(index===0) {
    for(const [key,value] of Object.entries(preset.scene)) parameters.push({path:`composition.scene.${key}`,scope:'scene',name:pair(...sceneNames[key]),type:typeof value==='number'?'number':key.toLowerCase().includes('color')||key==='accent'?'color':'string'});
    parameters.push({path:'composition.typography.fontFamily',scope:'global',type:'font',name:pair('字体','Font')},{path:'composition.motion.direction',scope:'effect',type:'integer',enum:[-1,1],name:pair('翻转方向','Flip direction')});
  } else {
    for(const [key,zh,en,values] of [['mode','展开方式','Spread style',['dos','eventail']],['modeRepli','收拢方式','Gather style',['synchrone','rangees']],['rythme','快慢节奏','Easing',['fluide','regulier','vif']]])parameters.push({path:`composition.motion.${key}`,scope:'effect',type:'string',enum:values,name:pair(zh,en)});
    for(const [key,zh,en,type] of [['libraryId','素材来源','Asset reference','string'],['scale','卡牌大小','Card size','number'],['opacity','不透明度','Opacity','number'],['color','卡牌颜色','Card color','color'],['x','水平偏移','Horizontal offset','number'],['y','垂直偏移','Vertical offset','number'],['rotation','旋转角度','Rotation','number']])parameters.push({path:`composition.cards[].${key}`,scope:'card',type,name:pair(zh,en)});
  }
  const phases = context.window.CardMotion.phases(preset).map((p,i)=>({id:p.id,name:pair(p.zh,p.en),colorToken:['phase.sky','phase.violet','phase.coral','phase.mint'][i]}));
  const definition={effect:{id,name:pair(name,en),version:'1.0.0',category:'card-motion'},runtime:{kind:'iframe-bridge',entry:`${id}.html?preview=1&embed=1`,bridgeVersion:'1.0.0',renderer:'canvas2d'},
    capabilities:{compositionModel:index===0?'scene':'cards',timeline:true,responsiveCanvas:true,exports:['png','gif','mp4'],customImageAssets:true,backgrounds:['color','image','gif','video'],videoTrim:true,animatedCardFaces:index===1,authentication:false},
    behavior:{summary:pair(index===0?'卡牌保持原尺寸衔接，旋转放大时中途变白，登录内容渐入并轻柔归位。':'卡牌从叠放中向上抽出或横向分排，交错横移后同步或逐排收回；表情使用源 SVG 的时间数据。',index===0?'A size-matched card rotates and grows, turns white during the flip, and reveals its login face with a soft settle.':'Cards lift from behind or fan into rows, drift in alternating directions, and gather together or row by row; faces follow source SVG keyframes.'),phases},parameters};
  fs.writeFileSync(path.join(site,`effects/${id}.component.json`),JSON.stringify(definition,null,2)+'\n');
}
console.log('Built both immutable presets and AI descriptors');
