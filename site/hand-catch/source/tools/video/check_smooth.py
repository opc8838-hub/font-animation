"""成片逐帧运动量 vs 原片；列出"跳帧"（本帧运动远大于前后帧）。python tools/video/check_smooth.py video/x.mp4"""
import argparse, json
from pathlib import Path
import numpy as np
import cv2

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('video')
parser.add_argument('--reference-motion', type=Path,
                    default=Path(__file__).resolve().parents[2] / 'video/motion/ref.json')
args = parser.parse_args()
cv2.setNumThreads(2)
c = cv2.VideoCapture(args.video, cv2.CAP_FFMPEG, [cv2.CAP_PROP_N_THREADS, 2])
fps = c.get(cv2.CAP_PROP_FPS)
if not c.isOpened() or not fps:
    parser.error(f'Cannot decode {args.video}')
prev = None; mg = []
while True:
    ok, f = c.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(f, (256, 256), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    if prev is not None:
        fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 21, 3, 5, 1.1, 0); m = np.linalg.norm(fl, axis=2)
        mask = (g < 235) | (prev < 235); mg.append(float(m[mask].mean()) if mask.sum() > 50 else 0)
    prev = g
c.release()
if not mg:
    parser.error('At least two decoded frames are required.')
mg = np.array(mg); t = np.arange(1, len(mg) + 1) / fps
ref = json.loads(args.reference_motion.read_text(encoding='utf-8')); rt = np.array(ref['t']); rm = np.array(ref['mag']) * ref['fps'] / fps
print(' 秒   成片  原片')
for a in np.arange(0, t[-1], 0.5):
    s = (t >= a) & (t < a + 0.5); r = (rt >= a) & (rt < a + 0.5)
    observed = mg[s].mean() if s.any() else 0
    reference = rm[r].mean() if r.any() else 0
    print(f'{a:5.1f} {observed:5.2f} {reference:5.2f}  ' + '#' * int(observed * 3) + ' | ' + '*' * int(reference * 3))
loc = np.array([np.median(mg[max(0, i - 3):i + 4]) for i in range(len(mg))])
jumps = [(round(t[i], 2), round(mg[i], 2), round(loc[i], 2)) for i in range(len(mg)) if mg[i] > 2.2 * loc[i] + 0.4]
print('跳帧(秒, 本帧, 邻近中位):', jumps)
