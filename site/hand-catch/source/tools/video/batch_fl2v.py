"""按时间线批量跑海螺首尾帧补帧（最多 4 个并行），已存在的输出跳过。

python tools/video/batch_fl2v.py
关键帧：video/keys/<名字>.jpg（由 prep 步骤从 img/out 生成）
"""
import os
import pathlib, subprocess, sys, concurrent.futures as cf
from PIL import Image

R = pathlib.Path(__file__).resolve().parents[2]; V = R / 'video'; K = V / 'keys'; K.mkdir(parents=True, exist_ok=True)
SRC = {'0.00': 'img/out/orbit/key_0.00.png', '0.40': 'img/out/key_0.40.png', '1.33': 'img/out/key_1.33.png', '4.4': 'img/out/grip_b.png'}
for t in ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '9.0', '9.5', '10.0', '11.0', '11.5', '12.5', '13.0', '14.0', '17.5']:
    SRC[t] = f'img/out/orbit/key_{t}.png'

ORBIT = ("Static white seamless studio background. A man's right hand holds an iPhone perfectly still; the hand, fingers and phone do not move at all. "
         "Only the camera moves: it orbits smoothly around the hand and phone from the first viewpoint to the second viewpoint, like dragging a 3D model viewer. "
         "Realistic hand, the phone keeps its exact shape and its lock screen stays unchanged. No cuts, no extra objects, no text.")
FALL = ("Static locked-off camera, pure white seamless studio background. An iPhone falls into the frame from above, tilting slightly, while a man's open right hand "
        "rises in from the bottom of the frame, palm up, ready to catch it. Smooth continuous motion, realistic hand, the phone keeps its exact shape and lock screen. No cuts, no extra objects.")
CATCH = ("Static locked-off camera, pure white seamless studio background. A falling iPhone lands into a man's open right hand; the fingers close smoothly around the phone "
         "and the hand brings it upright, then holds it still. Natural, realistic hand motion, the phone keeps its exact shape and its lock screen stays unchanged. No camera movement, no cuts, no extra objects.")
HOLD = ("Pure white seamless studio background. A man's right hand holds an iPhone almost still, with only a tiny natural settling movement, and the camera drifts very slightly. "
        "Realistic hand, phone shape and lock screen unchanged. No cuts, no extra objects.")

SEGS = [('0.00', '0.40', FALL), ('0.40', '1.33', FALL), ('1.33', '4.4', CATCH)]
OPENING_OUTPUTS = {
    ('0.40', '1.33'): V / 'seg_fall.mp4',
    ('1.33', '4.4'): V / 'seg_open_to_grip.mp4',
}
orbit = ['4.4', '5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '9.0', '9.5', '10.0', '11.0']
SEGS += [(a, b, ORBIT) for a, b in zip(orbit, orbit[1:])]
SEGS += [('11.5', '12.5', FALL), ('12.5', '13.0', CATCH), ('13.0', '14.0', CATCH), ('14.0', '17.5', HOLD)]


def prep(t):
    p = K / f'{t}.jpg'
    if not p.exists():
        with Image.open(R / SRC[t]) as image:
            image.convert('RGB').resize((1024, 1024), Image.LANCZOS).save(p, quality=95)
    return p


def job(seg):
    a, b, prompt = seg
    out = OPENING_OUTPUTS.get((a, b), V / 'segs' / f'{a}_{b}.mp4')
    if out.exists(): return f'{a}->{b} skip'
    r = subprocess.run([sys.executable, '-u', str(R / 'tools/video/fl2v.py'), str(prep(a)), str(prep(b)), str(out), prompt, '--dur', '5'],
                       capture_output=True, text=True, errors='replace', timeout=2100)
    if r.returncode:
        raise RuntimeError(f'{a}->{b}: {r.stderr.strip()} {r.stdout.strip()}'.strip())
    return f'{a}->{b} {out.name}'


if __name__ == '__main__':
    if not os.getenv('MINIMAX_API_KEY'):
        sys.exit('Set the MINIMAX_API_KEY environment variable first.')
    for t in SRC:
        prep(t)
    failed = False
    with cf.ThreadPoolExecutor(4) as executor:
        pending = [executor.submit(job, seg) for seg in SEGS]
        for future in cf.as_completed(pending):
            try:
                print(future.result(), flush=True)
            except (RuntimeError, OSError, subprocess.TimeoutExpired) as error:
                failed = True
                print(error, file=sys.stderr, flush=True)
    sys.exit(int(failed))
