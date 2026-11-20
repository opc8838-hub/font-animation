"""测每段补帧视频的"实际运动进度"：逐帧光流幅度累加 → 0..1 的进度曲线，缓存到 video/motion/<名>.json。

python tools/video/motion.py video/segs/4.4_5.0.mp4 ...
用法（在 assemble3 里）：progress_to_time(curve, p) 把"走完 p 的运动"换算成素材秒数，实现匀速。
"""
import json, pathlib, sys, numpy as np, cv2

R = pathlib.Path(__file__).resolve().parents[2]; M = R / 'video' / 'motion'; M.mkdir(parents=True, exist_ok=True)


def analyze(p):
    p = pathlib.Path(p); out = M / (p.stem + '.json')
    if not p.is_file():
        raise FileNotFoundError(f'Missing generated clip: {p}')
    if out.exists() and out.stat().st_mtime > p.stat().st_mtime:
        return json.loads(out.read_text())
    cap = cv2.VideoCapture(str(p), cv2.CAP_FFMPEG, [cv2.CAP_PROP_N_THREADS, 2])
    fps = cap.get(cv2.CAP_PROP_FPS); prev = None; mags = [0.0]
    if not cap.isOpened() or not fps:
        cap.release()
        raise ValueError(f'Cannot decode generated clip: {p}')
    while True:
        ok, f = cap.read()
        if not ok: break
        g = cv2.cvtColor(cv2.resize(f, (256, 256), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
        if prev is not None:
            fl = cv2.calcOpticalFlowFarneback(prev, g, None, 0.5, 3, 21, 3, 5, 1.1, 0)
            m = np.linalg.norm(fl, axis=2); mask = g < 235           # 只看手和手机（白背景不算）
            mags.append(float(m[mask].mean()) if mask.any() else 0.0)
        prev = g
    cap.release()
    if prev is None:
        raise ValueError(f'No frames in generated clip: {p}')
    mags = np.array(mags); mags = np.maximum(mags, 0.02 * (mags.max() + 1e-6))   # 留一点底，避免完全静止段被跳过
    cum = np.cumsum(mags); cum = (cum - cum[0]) / (cum[-1] - cum[0] + 1e-9)
    d = {'fps': fps, 'n': len(mags), 'mag': mags.round(4).tolist(), 'cum': cum.round(5).tolist()}
    out.write_text(json.dumps(d)); return d


def progress_to_time(d, p):
    """运动进度 p∈[0,1] → 素材秒。"""
    cum = np.array(d['cum']); idx = np.arange(len(cum))
    return float(np.interp(np.clip(p, 0, 1), cum, idx)) / d['fps']


if __name__ == '__main__':
    for a in sys.argv[1:]:
        d = analyze(a); mg = np.array(d['mag'])
        q = [round(progress_to_time(d, x), 2) for x in (0.1, 0.25, 0.5, 0.75, 0.9)]
        print(pathlib.Path(a).name, 'frames', d['n'], 'peak', round(mg.max(), 2), '10/25/50/75/90% at', q)
