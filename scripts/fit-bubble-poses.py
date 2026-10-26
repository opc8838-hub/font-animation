"""Fit clean complete letters to measured packing, without copying edge noise."""
from pathlib import Path
import json,re
import cv2
import numpy as np

root=Path(__file__).resolve().parents[1]
source=(root/'site/bubble-frame-fluid-lettering.js').read_text(encoding='utf-8')
masters=json.loads(re.search(r'window.BubbleFrameFluidOutlines=(.*?);',source).group(1))
slots=json.loads(re.search(r'window.BubbleFrameReferenceSlots=(.*?);',source).group(1))
source=(root/'site/bubble-frame-motion.js').read_text(encoding='utf-8');motion=json.loads(source[source.index('=')+1:].strip().rstrip(';'))
angles=np.deg2rad(np.arange(-180,180,3));poses=[[] for _ in motion['frames']];scores=[]
for g,slot in enumerate(slots):
    master=[(np.array(p)/100-.5)*[slot['w']*600,slot['h']*320] for p in masters[slot['variant']]]
    candidates=[]
    for angle in angles:
        c,s=np.cos(angle),np.sin(angle);rotation=np.array([[c,-s],[s,c]])
        rotated=[p@rotation.T for p in master];all_points=np.vstack(rotated);low=all_points.min(0);extent=np.ptp(all_points,axis=0)
        mask=np.zeros((96,96),np.uint8)
        cv2.drawContours(mask,[np.rint((p-low)/extent*91+2).astype(np.int32) for p in rotated],-1,255,-1)
        candidates.append(mask>0)
    candidates=np.array(candidates);cost=[];boxes=[]
    for frame in motion['frames']:
        p=np.array(frame[g])*[600,320];low=p[:128].min(0);extent=np.ptp(p[:128],axis=0)
        mask=np.zeros((96,96),np.uint8);cv2.drawContours(mask,[np.rint((q-low)/extent*91+2).astype(np.int32) for q in [p[:128],p[128:]]],-1,255,-1);mask=mask>0
        iou=np.logical_and(candidates,mask).sum((1,2))/np.logical_or(candidates,mask).sum((1,2))
        cost.append(1-iou);boxes.append([*(low/np.array([600,320])),*(extent/np.array([600,320]))])
    cost=np.array(cost);difference=(angles[:,None]-angles[None,:]+np.pi)%(2*np.pi)-np.pi
    transition=(difference/.12)**2*.015
    accumulated=cost[0]+.015*(angles/np.pi)**2;back=[]
    for row in cost[1:]:
        paths=accumulated[:,None]+transition;indices=paths.argmin(0);back.append(indices);accumulated=row+paths[indices,np.arange(len(angles))]
    path=[int(accumulated.argmin())]
    for indices in back[::-1]:path.append(int(indices[path[-1]]))
    path=path[::-1];turns=np.unwrap(angles[path])
    # Smooth only whole-letter pose channels; the master geometry stays fixed.
    turns=np.convolve(np.pad(turns,(2,2),mode='edge'),[1/16,4/16,6/16,4/16,1/16],mode='valid')
    for i,(box,turn) in enumerate(zip(boxes,turns)):poses[i].append([*[round(v,6) for v in box],round(float(turn),6)])
    scores.append(float(np.mean([1-cost[f,p] for f,p in enumerate(path)])))
    print(slot['variant'],round(float(np.rad2deg(turns[0])),1),round(float(np.rad2deg(turns[-1])),1),'mean fit',round(scores[-1],3))
(root/'site/bubble-frame-poses.js').write_text('/* Whole-letter packing and turns fitted to supplied stage frames. */\nwindow.BubbleFramePoses='+json.dumps(poses,separators=(',',':'))+';\n',encoding='utf-8')
