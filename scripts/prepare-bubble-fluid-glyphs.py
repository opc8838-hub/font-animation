"""Build upright rounded alphabet masters from the editor's explicit letter paths."""
from pathlib import Path
import ast,json,re
import cv2
import numpy as np
from fontTools.pens.recordingPen import RecordingPen
from fontTools.svgLib.path import parse_path

root=Path(__file__).resolve().parents[1]
source=(root/'site/bubble-frame-glyphs.js').read_text(encoding='utf-8')
clean={}
for match in re.finditer(r"^\s*(?:([A-Z])|'([0-9])'):\[(.*?)\],?$",source,re.M):
    name=match[1] or match[2];mask=np.zeros((440,440),np.uint8)
    thickness=round((25 if name=='R' else 28 if name in 'MW' else 34 if name in 'COU' else 32)*4)
    for path in ast.literal_eval('['+match[3]+']'):
        pen=RecordingPen();parse_path(path,pen);points=[];start=None;current=None
        for op,args in pen.value:
            if op=='moveTo':current=np.array(args[0]);start=current;points.append(current)
            elif op=='lineTo':current=np.array(args[0]);points.append(current)
            elif op in ('curveTo','qCurveTo'):
                t=np.linspace(0,1,40)[:,None];p=[current]+[np.array(a) for a in args]
                curve=(1-t)**3*p[0]+3*(1-t)**2*t*p[1]+3*(1-t)*t*t*p[2]+t**3*p[3] if op=='curveTo' else (1-t)**2*p[0]+2*(1-t)*t*p[1]+t*t*p[2]
                points.extend(curve);current=p[-1]
            elif op=='closePath':points.append(start)
        p=np.rint(np.array(points)*4+20).astype(np.int32)
        cv2.polylines(mask,[p],False,255,thickness)
        for x,y in p:cv2.circle(mask,(int(x),int(y)),thickness//2,255,-1)
    mask=(cv2.GaussianBlur(mask,(0,0),1)>127).astype(np.uint8)*255
    contours,_=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    x,y,w,h=cv2.boundingRect(cv2.findNonZero(mask));result=[]
    for contour in contours:
        if cv2.contourArea(contour)<8:continue
        p=contour[:,0,:].astype(float);length=np.linalg.norm(np.roll(p,-1,axis=0)-p,axis=1)
        distances=np.r_[0,np.cumsum(length)];closed=np.vstack([p,p[0]])
        t=np.linspace(0,distances[-1],128,endpoint=False)
        p=np.c_[np.interp(t,distances,closed[:,0]),np.interp(t,distances,closed[:,1])]
        result.append(np.round((p-[x,y])/[w,h]*100,3).tolist())
    clean[name]=result
reference=(root/'site/bubble-frame-lettering.js').read_text(encoding='utf-8')
measured=json.loads(re.search(r'window.BubbleFrameOutlines=(.*?);',reference).group(1))
# The original display letters have asymmetric inflated strokes. Use their
# readable opening pose as masters, never an already tumbling intermediate pose.
for name,loops in measured.items():
    if name.startswith('O') or name.startswith('C'):
        clean[name]=clean[name[0]];continue
    mask=np.zeros((440,440),np.uint8)
    for i,contour in enumerate(loops):
        if i and not name.startswith('A'):continue
        cv2.fillPoly(mask,[np.rint(np.array(contour)*4+20).astype(np.int32)],255 if not i else 0)
    mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(39,39)))
    mask=(cv2.GaussianBlur(mask,(0,0),3)>127).astype(np.uint8)*255
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    outer=max(range(len(contours)),key=lambda i:cv2.contourArea(contours[i]));x,y,w,h=cv2.boundingRect(contours[outer]);result=[]
    for i,contour in enumerate(contours):
        if i!=outer and hierarchy[0][i][3]!=outer:continue
        if cv2.contourArea(contour)<80:continue
        p=contour[:,0,:].astype(float);distances=np.r_[0,np.cumsum(np.linalg.norm(np.roll(p,-1,axis=0)-p,axis=1))];closed=np.vstack([p,p[0]])
        t=np.linspace(0,distances[-1],128,endpoint=False);p=np.c_[np.interp(t,distances,closed[:,0]),np.interp(t,distances,closed[:,1])]
        spectrum=np.fft.rfft(p,axis=0);spectrum*=np.exp(-(np.arange(len(spectrum))/9)**4)[:,None];p=np.fft.irfft(spectrum,n=128,axis=0)
        result.append(np.round((p-[x,y])/[w,h]*100,3).tolist())
    clean[name]=result
data='/* Inflated display masters and complete replacement alphabet. */\nwindow.BubbleFrameFluidOutlines='+json.dumps(clean,separators=(',',':'))+';\n'
for name in ['Reference','Mid','End']:
    slots=re.search(r'window.BubbleFrame'+name+r'Slots=(.*?);',reference).group(1)
    data+='window.BubbleFrame'+name+'Slots='+slots+';\n'
(root/'site/bubble-frame-fluid-lettering.js').write_text(data,encoding='utf-8')
print(f'Prepared {len(clean)} upright glyphs')
