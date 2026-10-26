"""Reserve actual silhouette clearance over the complete packed-letter trajectory."""
from pathlib import Path
import json,subprocess
import cv2
import numpy as np

root=Path(__file__).resolve().parents[1]
capture=r"""
const fs=require('node:fs'),vm=require('node:vm'),scope={window:{}};vm.createContext(scope);
for(const file of ['bubble-frame-fluid-lettering.js','bubble-frame-poses.js','bubble-frame-fluid.js']){
 vm.runInContext(fs.readFileSync('site/'+file,'utf8'),scope);Object.assign(scope,scope.window);
}
scope.BubbleFrameClearance=Array.from({length:49},()=>Array.from({length:14},()=>[1,0,0]));
const items=scope.BubbleFrameReferenceSlots.map((g,i)=>({...g,row:i<7?0:1,reference:true}));
const state={lead:2,write:.6,restore:2.2,size:172,tracking:0,lineSpacing:1,flow:1,rotation:1,letterStyle:'bubble',textColor:'#fff'},frames=[];
for(let f=0;f<49;f++){
 const letters=[];let points;const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){letters.push(points=[])},moveTo(){},quadraticCurveTo(x,y){points.push([x,y])},closePath(){},fill(){}};
 scope.BubbleFrameFluid.render(ctx,items,state,2*Math.acos(1-2*f/48)/Math.PI,600,320);frames.push(letters);
}
process.stdout.write(JSON.stringify(frames));
"""
raw=json.loads(subprocess.check_output(['node','-e',capture],cwd=root))
frames=[[np.array(p)*.6 for p in frame] for frame in raw]
W,H=360,192;radius=18;pad=40
corrections=np.zeros((14,3));corrections[:,0]=1
centers=[[(p.min(0)+p.max(0))/2 for p in frame] for frame in frames]
def shape(f,g,q):
    p=centers[f][g]+(frames[f][g]-centers[f][g])*q
    low=np.floor(p.min(0)).astype(int)-2;high=np.ceil(p.max(0)).astype(int)+3
    mask=np.zeros(tuple((high-low)[::-1]),np.uint8)
    cv2.drawContours(mask,[np.rint(loop-low).astype(np.int32) for loop in np.split(p,len(p)//128)],-1,1,-1)
    return low,mask
def place(f,g):
    q,dx,dy=corrections[g];low,mask=shape(f,g,q);x,y=low+np.rint([dx,dy]).astype(int)+pad
    result=np.zeros((H+2*pad,W+2*pad),np.uint8);result[y:y+mask.shape[0],x:x+mask.shape[1]]=mask
    return result
yy,xx=np.mgrid[-radius:radius+1,-radius:radius+1]
resolved=[]
for f in range(len(frames)):
    previous=corrections.copy();masks=[place(f,g) for g in range(14)];total=sum(masks).astype(np.float32)
    for iteration in range(3):
        collisions=[float((masks[g]*(total-masks[g])).sum()) for g in range(14)]
        for g in np.argsort(collisions)[::-1]:
            other=cv2.dilate(total-masks[g],np.ones((5,5),np.uint8));other[:pad]=10;other[pad+H:]=10;other[:,:pad]=10;other[:,pad+W:]=10
            best=None
            for q in np.arange(1,.59,-.05):
                low,mask=shape(f,g,q);x,y=low+pad-radius
                roi=other[y:y+mask.shape[0]+2*radius,x:x+mask.shape[1]+2*radius]
                cost=np.maximum(0,cv2.matchTemplate(roi,mask.astype(np.float32),cv2.TM_CCORR))
                score=2000*cost+xx*xx+yy*yy+((1-q)*170)**2+2*((xx-previous[g,1])**2+(yy-previous[g,2])**2)+((q-previous[g,0])*100)**2
                location=np.unravel_index(score.argmin(),score.shape);candidate=(score[location],q,int(xx[location]),int(yy[location]))
                if best is None or candidate[0]<best[0]:best=candidate
            corrections[g]=best[1:];total-=masks[g];masks[g]=place(f,g);total+=masks[g]
        if np.maximum(total-1,0).sum()<1:break
    resolved.append(corrections.copy())
    if f%12==0:print('frame',f,'minimum scale',round(float(corrections[:,0].min()),2),flush=True)
# Smooth the small position/size allowances over time, keeping complete glyphs intact.
resolved=np.array(resolved);smooth=np.empty_like(resolved)
for f in range(len(frames)):
    smooth[f]=sum(resolved[min(len(frames)-1,max(0,f+k))]*w for k,w in [(-2,1),(-1,4),(0,6),(1,4),(2,1)])/16
smooth[:,:,0]*=.97
result=[[[round(float(q),5),round(float(x/W),6),round(float(y/H),6)] for q,x,y in frame] for frame in smooth]
(root/'site/bubble-frame-clearance.js').write_text('/* Whole-letter spacing reserved across the complete packed trajectory. */\nwindow.BubbleFrameClearance='+json.dumps(result,separators=(',',':'))+';\n',encoding='utf-8')
