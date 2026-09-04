"""Independently decode the actual MP4; avoid headless Windows video surfaces."""
import sys
import tempfile
from pathlib import Path
import cv2

path = Path(sys.argv[1]).resolve()
output = Path(tempfile.mkdtemp(prefix='continuation-video-check-'))
capture = cv2.VideoCapture(str(path))
fps = capture.get(cv2.CAP_PROP_FPS)
width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
duration = capture.get(cv2.CAP_PROP_FRAME_COUNT)/fps
assert fps > 0 and width > 0 and height > 0
times = [.2,.6,1.1] if duration<3 else [1,3.5,4,6.5,7]
frames = {round(t*fps):t for t in times}
decoded = 0
while True:
    ok,frame = capture.read()
    if not ok: break
    if decoded in frames:
        time = frames[decoded]
        ink = int((frame.min(axis=2)<230).sum())
        assert ink>100,(time,ink)
        if duration<3:
            ys,xs = (frame.min(axis=2)<235).nonzero()
            assert abs((xs.min()+xs.max()+1)/2-width/2)<=5
            assert abs((ys.min()+ys.max()+1)/2-height/2)<=5
        if duration>3 and time>=6.5:
            assert frame[int(height*.75):].std()>10,'The approved video background must not become a flat fill.'
        cv2.imwrite(str(output/f'frame-{time}.png'),frame)
        print(time,ink,flush=True)
    decoded+=1
capture.release()
assert abs(decoded/fps-duration)<.1
print('PASS',{'size':[width,height],'fps':fps,'duration':duration,'decoded':decoded,'output':str(output)},flush=True)
