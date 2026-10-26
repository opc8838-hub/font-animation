"""Track labelled silhouettes through the full-letter section of the supplied stage video."""
from pathlib import Path
import ast,json,re,sys
import cv2
import numpy as np

root=Path(__file__).resolve().parents[1]
tree=ast.parse((root/'scripts/trace-bubble-reference.py').read_text(encoding='utf-8'))
regions=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='mid_regions' for t in n.targets))
source=(root/'site/bubble-frame-lettering.js').read_text(encoding='utf-8')
slots=json.loads(re.search(r'window.BubbleFrameReferenceSlots=(.*?);',source).group(1))
W,H=600,320;u,v=np.meshgrid(np.linspace(0,1,W),np.linspace(0,1,H))
mapx=(101+389*u).astype('float32');mapy=(515-100*u*u+(132+150*u*u)*v).astype('float32')
cap=cv2.VideoCapture(sys.argv[1]);times=np.linspace(13,14.6,49);images=[];masks=[]
for t in times:
    cap.set(cv2.CAP_PROP_POS_MSEC,float(t)*1000);ok,frame=cap.read()
    if not ok:raise RuntimeError(f'Missing frame {t}')
    flat=cv2.remap(frame,mapx,mapy,cv2.INTER_CUBIC);images.append(cv2.cvtColor(flat,cv2.COLOR_BGR2GRAY))
    mask=((flat[:,:,1]>180)&(flat[:,:,2]<90)).astype(np.uint8)*255
    masks.append(mask)
seed=6;labels=np.zeros((H,W),np.uint8)
for i,poly in enumerate(regions):cv2.fillPoly(labels,[np.rint(np.array(poly)/2).astype(np.int32)],i+1)
tracked={seed:labels};gx,gy=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
for order in [range(seed+1,len(times)),range(seed-1,-1,-1)]:
    previous=seed
    for index in order:
        backward=cv2.calcOpticalFlowFarneback(images[index],images[previous],None,.5,4,29,5,7,1.5,0)
        propagated=cv2.remap(tracked[previous],gx+backward[:,:,0],gy+backward[:,:,1],cv2.INTER_NEAREST,borderMode=cv2.BORDER_REPLICATE)
        tracked[index]=propagated;previous=index

def sample(contour,count):
    points=contour[:,0,:].astype(float);length=np.linalg.norm(np.roll(points,-1,axis=0)-points,axis=1)
    distances=np.r_[0,np.cumsum(length)];closed=np.vstack([points,points[0]]);t=np.linspace(0,distances[-1],count,endpoint=False)
    points=np.c_[np.interp(t,distances,closed[:,0]),np.interp(t,distances,closed[:,1])]
    return sum(np.roll(points,k,axis=0)*w for k,w in [(-2,1),(-1,2),(0,3),(1,2),(2,1)])/9

def align(points,previous):
    area=lambda p:np.sum(p[:,0]*np.roll(p[:,1],-1)-np.roll(p[:,0],-1)*p[:,1])
    if np.sign(area(points))!=np.sign(area(previous)):points=points[::-1]
    offset=min(range(len(points)),key=lambda n:np.sum((np.roll(points,n,axis=0)-previous)**2))
    return np.roll(points,offset,axis=0)

def open_false_counters(mask,slot):
    # Codec bridges can close C/U/H clefts for a few frames. Keep their topology
    # open by cutting the thinnest bridge, rather than alternating outer/hole paths.
    contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    outer=max(range(len(contours)),key=lambda i:cv2.contourArea(contours[i]))
    boundary=contours[outer][:,0,:]
    for i,contour in enumerate(contours):
        if hierarchy[0][i][3]!=outer:continue
        if cv2.contourArea(contour)<=10:
            cv2.drawContours(mask,[contour],-1,255,-1);continue
        counter=contour[:,0,:]
        # The upper C opens upward throughout this measured segment. Selecting
        # an equally thin side wall instead would move its mouth between frames.
        candidates=boundary[boundary[:,1]<counter[:,1].min()] if slot['variant']=='C' else boundary
        if not len(candidates):candidates=boundary
        distances=np.sum((counter[:,None,:]-candidates[None,:,:])**2,axis=2)
        a,b=np.unravel_index(np.argmin(distances),distances.shape)
        cv2.line(mask,tuple(counter[a]),tuple(candidates[b]),0,3)
    return mask

frames=[];previous=None;diagnostics=[]
for index in range(len(times)):
    glyphs=[];union=np.zeros((H,W),np.uint8)
    for number,slot in enumerate(slots):
        mask=((tracked[index]==number+1)&(masks[index]>0)).astype(np.uint8)*255
        # Remove thin video-compression fragments while retaining pressure-driven shapes.
        mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
        if slot['ch'] not in 'OA':mask=open_false_counters(mask,slot)
        contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
        outer=max(range(len(contours)),key=lambda i:cv2.contourArea(contours[i]))
        main=sample(contours[outer],128)
        if previous:main=align(main,previous[number][0])
        holes=[c for i,c in enumerate(contours) if hierarchy[0][i][3]==outer and cv2.contourArea(c)>10] if slot['ch'] in 'OA' else []
        # One counter per observed letter. Tiny seams are not letter counters.
        if holes:
            hole=sample(max(holes,key=cv2.contourArea),48)
            if previous:hole=align(hole,previous[number][1])
        else:
            center=previous[number][1].mean(axis=0) if previous else main.mean(axis=0)
            hole=np.repeat(center[None,:],48,axis=0)
        glyphs.append([main,hole]);cv2.drawContours(union,[contours[outer]],-1,255,-1)
    previous=glyphs;frames.append(glyphs)
    a=masks[index]>0;b=union>0;diagnostics.append(float((a&b).sum()/(a|b).sum()))
# A short symmetric temporal filter removes codec jitter, preserving the measured path.
filtered=[]
for i in range(len(frames)):
    filtered.append([[sum(frames[min(len(frames)-1,max(0,i+k))][g][c]*w for k,w in [(-2,1),(-1,4),(0,6),(1,4),(2,1)])/16 for c in range(2)] for g in range(14)])
packed=[]
for frame in filtered:
    packed.append([[[round(float(p[0]/W),5),round(float(p[1]/H),5)] for contour in glyph for p in contour] for glyph in frame])
data={'sourceStart':13,'sourceEnd':14.6,'outerCount':128,'holeCount':48,'frames':packed}
(root/'site/bubble-frame-motion.js').write_text('/* Measured full-letter motion from the supplied stage recording. */\nwindow.BubbleFrameMotion='+json.dumps(data,separators=(',',':'))+';\n',encoding='utf-8')
out=root/'output/bubble-research';out.mkdir(exist_ok=True)
(out/'tracking.json').write_text(json.dumps({'frames':len(frames),'minimumUnionIoU':min(diagnostics),'meanUnionIoU':float(np.mean(diagnostics))},indent=2))
print(f'Tracked {len(frames)} frames, mean union overlap {np.mean(diagnostics):.4f}')
