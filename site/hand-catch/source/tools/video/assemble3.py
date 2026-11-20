"""整片 18 秒 v3（丝滑版）：

1. 速度跟原片：每段素材先按自身光流测出"运动进度"（motion.py），再让进度按原片实测运动量（ref_motion.py）推进；
   同一条连续镜头（链）里跨段速度连续，不会在每张关键帧处停顿。
2. 关键帧接口：前后两段在接口 ±W 秒内做光流变形过渡（不是叠化），消除 AI 生成带来的小跳动。
3. 回放接住：12.5→13.0 那段海螺生成成了"接住又松手"，只用它前 2.75 秒，再光流接到 13.0→14.0 段的 2.17 秒之后。

python tools/video/assemble3.py [--until 秒] [--out 路径]
"""
import argparse
from collections import OrderedDict
import json, os, pathlib, shutil, subprocess, numpy as np, cv2

from motion import analyze

R = pathlib.Path(__file__).resolve().parents[2]; V = R / 'video'; S = V / 'segs'
FF = os.getenv('FFMPEG') or shutil.which('ffmpeg')
FPS, SIZE, SHUTTER, W = 30, 1080, 0.5, 0.06

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=pathlib.Path, default=V / 'catch_full_v3.mp4')
parser.add_argument('--until', type=float, default=18.0)
parser.add_argument('--reference-motion', type=pathlib.Path, default=V / 'motion/ref.json')
args = parser.parse_args()
if not FF:
    parser.error('Set FFMPEG or add ffmpeg to PATH.')
if not 1 / FPS <= args.until <= 18:
    parser.error('--until must be between one frame and 18 seconds.')
cv2.setNumThreads(2)

# ---------- 原片速度 ----------
ref = json.loads(args.reference_motion.read_text(encoding='utf-8'))
rt = np.array(ref['t']); rm = np.array(ref['mag'])
k = np.exp(-0.5 * (np.arange(-30, 31) / (0.10 * ref['fps'])) ** 2); rm = np.convolve(rm, k / k.sum(), 'same')   # 平滑 σ=0.1s
EPS = 0.06
def wref(t): return np.interp(t, rt, rm) + EPS

# ---------- 素材 ----------
class ClipReader:
    """Decode frames on demand, keeping only recent frames for adjacent samples."""
    def __init__(self, path):
        self.path = path
        self.capture = cv2.VideoCapture(str(path), cv2.CAP_FFMPEG, [cv2.CAP_PROP_N_THREADS, 2])
        self.next_index = 0
        self.recent = OrderedDict()

    def get(self, index):
        if index in self.recent:
            self.recent.move_to_end(index)
            return self.recent[index]
        if index < self.next_index:
            if not self.capture.set(cv2.CAP_PROP_POS_FRAMES, index):
                raise ValueError(f'Cannot seek to frame {index} in {self.path}')
            self.next_index = index
        while self.next_index < index:
            if not self.capture.grab():
                raise ValueError(f'Cannot skip to frame {index} in {self.path}')
            self.next_index += 1
        ok, frame = self.capture.read()
        if not ok:
            raise ValueError(f'Cannot read frame {index} in {self.path}')
        self.next_index += 1
        self.recent[index] = frame
        if len(self.recent) > 12:
            self.recent.popitem(last=False)
        return frame


readers = OrderedDict()


def reader_for(path):
    if path not in readers:
        if len(readers) == 2:
            readers.popitem(last=False)[1].capture.release()
        readers[path] = ClipReader(path)
    readers.move_to_end(path)
    return readers[path]


class Seg:
    """片内 [a,b] ← 素材 p 的 [s0,s1] 秒，按运动进度匀化后再按原片速度推进。"""
    def __init__(s, a, b, p, s0=0.0, s1=None):
        s.a, s.b, s.p = a, b, p; d = analyze(p); s.fps = d['fps']; s.n = n = d['n']
        s1 = (n - 1) / s.fps if s1 is None else s1
        i0 = min(n - 1, int(round(s0 * s.fps)))
        i1 = min(n - 1, int(round(s1 * s.fps)))
        mag = np.array(d['mag'][i0:i1 + 1]); mag[0] = 0; cum = np.cumsum(mag)
        s.M = cum[-1]; s.cum = cum / (cum[-1] + 1e-9); s.idx = np.arange(i0, i1 + 1)
        s.h = 1.0
    def tgrid(s):
        return np.linspace(s.a, s.b, 400)
    def build(s, hfun):
        """hfun(t)：链级速度校正（让跨段速度连续）。"""
        g = s.tgrid(); w = wref(g) * hfun(g); c = np.concatenate([[0], np.cumsum((w[1:] + w[:-1]) / 2 * np.diff(g))])
        s.g, s.P = g, c / c[-1]
    def src_index(s, t):
        prog = np.interp(t, s.g, s.P)
        return np.interp(prog, s.cum, s.idx)          # 素材帧号（浮点）
    def frame(s, t):
        """t 时刻的画面（含快门模糊）；超出范围就钳住首/尾帧。"""
        reader = reader_for(s.p)
        t0 = min(max(t, s.a), s.b); t1 = min(max(t + SHUTTER / FPS, s.a), s.b)
        j0, j1 = sorted((s.src_index(t0), s.src_index(t1)))
        i0 = int(np.clip(round(j0), 0, s.n - 1)); i1 = int(np.clip(round(j1), i0, s.n - 1))
        exposure = reader.get(i0).astype(np.float32)
        for index in range(i0 + 1, i1 + 1):
            exposure += reader.get(index)
        return exposure / (i1 - i0 + 1)


def chain(segs):
    """同一条连续镜头：算每段"我们的运动量 / 原片运动量"，在段中点之间线性插值其倒数，使跨段画面速度连续。"""
    mids, inv = [], []
    for s in segs:
        g = np.linspace(s.a, s.b, 200)
        integrate = np.trapezoid if hasattr(np, 'trapezoid') else np.trapz
        Wi = integrate(wref(g), g)
        mids.append((s.a + s.b) / 2); inv.append(Wi / max(s.M, 1e-6))
    inv = np.array(inv); inv = inv / inv.mean()
    h = lambda t: np.interp(t, mids, inv)
    for s in segs: s.build(h)
    return segs


seg = lambda x, y: S / f'{x}_{y}.mp4'
CHAINS = []
# 第一镜：落下 → 接住 → 停稳 → 停顿 → 拖动转视角 → 停（11.31 硬切）
orbit = [('4.4', 4.40), ('5.0', 5.0), ('5.5', 5.5), ('6.0', 6.0), ('6.5', 6.5), ('7.0', 7.0), ('7.5', 7.5), ('8.0', 8.0),
         ('9.0', 9.0), ('9.5', 9.5), ('10.0', 10.0), ('11.0', 11.0)]
c1 = [Seg(0.00, 0.40, seg('0.00', '0.40')), Seg(0.40, 1.33, V / 'seg_fall.mp4'), Seg(1.33, 4.40, V / 'seg_open_to_grip.mp4')]
c1 += [Seg(ta, tb, seg(na, nb)) for (na, ta), (nb, tb) in zip(orbit, orbit[1:])]
hold = Seg(11.0, 11.31, seg('10.0', '11.0'), s0=5.1, s1=5.1)     # 停住
# 第二镜：斜侧重播
A, B = seg('12.5', '13.0'), seg('13.0', '14.0')
c2 = [Seg(11.31, 12.50, seg('11.5', '12.5')), Seg(12.50, 13.00, A, 0.0, 0.40), Seg(13.00, 13.55, A, 0.40, 2.75),
      Seg(13.55, 14.00, B, 2.17, None), Seg(14.00, 18.00, seg('14.0', '17.5'))]
for c in (c1, c2): chain(c)
hold.build(lambda t: np.ones_like(t))
TL = c1 + [hold] + c2
CUTS = {11.31}                                   # 硬切处不做过渡


# ---------- 光流变形过渡 ----------
def flow(a, b):
    ga = cv2.cvtColor(cv2.resize(a, (512, 512)).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    gb = cv2.cvtColor(cv2.resize(b, (512, 512)).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    f = cv2.calcOpticalFlowFarneback(ga, gb, None, 0.5, 5, 41, 5, 7, 1.5, 0)
    return cv2.resize(f, (a.shape[1], a.shape[0])) * (a.shape[1] / 512)


def morph(x, y, al):
    h, w = x.shape[:2]; gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    fxy, fyx = flow(x, y), flow(y, x)
    xw = cv2.remap(x, gx - al * fxy[..., 0], gy - al * fxy[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    yw = cv2.remap(y, gx - (1 - al) * fyx[..., 0], gy - (1 - al) * fyx[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return (1 - al) * xw + al * yw


def frame_at(t):
    for i, s in enumerate(TL):
        if s.a <= t < s.b or (i == len(TL) - 1 and t >= s.a):
            # 接口过渡：靠近本段起点且前一段相连
            if i > 0 and t - s.a < W and s.a not in CUTS and TL[i - 1].b == s.a:
                al = 0.5 + 0.5 * (t - s.a) / W; al = al * al * (3 - 2 * al)
                return morph(TL[i - 1].frame(t), s.frame(t), al)
            if i + 1 < len(TL) and s.b - t < W and s.b not in CUTS and TL[i + 1].a == s.b:
                al = 0.5 - 0.5 * (s.b - t) / W; al = al * al * (3 - 2 * al)
                return morph(s.frame(t), TL[i + 1].frame(t), al)
            return s.frame(t)


def finish(img):
    img = cv2.resize(np.clip(img, 0, 255).astype(np.uint8), (SIZE, SIZE), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    img = img + 0.45 * (img - cv2.GaussianBlur(img, (0, 0), 1.2))
    lum = img.mean(2, keepdims=True); img = np.where(lum > 238, 255, img)
    return np.clip(img, 0, 255).astype(np.uint8)


if __name__ == '__main__':
    n = int(round(args.until * FPS))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    cmd = [FF, '-y', '-loglevel', 'error', '-filter_threads', '2', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{SIZE}x{SIZE}', '-r', str(FPS), '-i', '-',
           '-c:v', 'libx264', '-threads', '2', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p',
           '-vf', 'scale=out_range=tv:flags=accurate_rnd+full_chroma_int', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
           '-movflags', '+faststart', str(args.out)]
    with subprocess.Popen(cmd, stdin=subprocess.PIPE) as process:
        for index in range(n):
            process.stdin.write(finish(frame_at(index / FPS)).tobytes())
        process.stdin.close()
        if process.wait():
            raise SystemExit('FFmpeg encoding failed.')
    print('saved', args.out, n, 'frames')
