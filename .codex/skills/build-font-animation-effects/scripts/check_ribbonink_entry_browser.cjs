(function () {
  const check = async function checkRibbonEntry(page) {
    return page.evaluate(async () => {
      const saved = RibbonInk.schemeData(), results = [];
      const set = (id, value) => { document.querySelector('#' + id).value = String(value); };
      try {
        RibbonInk.setPaused(true);
        set('sequenceMode', 'double'); set('textInput', 'TIME'); set('positionX', 50); set('positionY', 52);
        for (const [width, height] of [[640,360],[640,640],[360,640]]) {
          for (const scale of [55,100,150]) for (const thickness of [55,100,160]) {
            set('brushScale', scale); set('brushWidth', thickness);
            const canvas=document.createElement('canvas');
            RibbonInk.renderFrame(canvas,.92,width,height);
            const data=canvas.getContext('2d').getImageData(0,0,width,height).data;
            const ink=(x,y)=> {
              const i=(y*width+x)*4;
              return data[i]>70 && data[i+2]>90 && data[i+1]<190;
            };
            const columns=[];
            for(let x=0;x<30;x++) {
              const rows=[];for(let y=0;y<height;y++) if(ink(x,y)) rows.push(y);
              columns.push(rows);
            }
            const first=columns.findIndex(rows=>rows.length);
            if(first<0 || first>1) throw Error('Left gutter: '+JSON.stringify({width,height,scale,thickness,first}));
            // A visible default cap must curve away from the edge, not be a
            // straight source crop. Enlarged art is intentionally canvas-clipped.
            const round=columns[Math.min(29,first+8)].length>columns[first].length+3;
            if(scale===100 && thickness===100 && !round)
              throw Error('Flat default terminal: '+JSON.stringify({width,height,columns:columns.map(r=>r.length)}));
            // In portrait the default entry must not run vertically to the bottom.
            if(width===360 && scale===100 && thickness===100) {
              for(let x=0;x<80;x++) for(let y=height-130;y<height;y++)
                if(ink(x,y)) throw Error('Unexpected vertical extension at '+x+','+y);
            }
            results.push({width,height,scale,thickness,firstInkColumn:first,round});
          }
        }
        return {configurations:results.length,results};
      } finally {await RibbonInk.applyScheme(saved);RibbonInk.setPaused(true);}
    });
  };
  if(typeof module!=='undefined') module.exports=check;
  return check;
})()
