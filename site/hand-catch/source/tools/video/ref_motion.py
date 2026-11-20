"""用光流逐帧测量参考视频的运动量，输出剪辑使用的速度曲线。"""

import argparse
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('reference', type=Path)
    parser.add_argument('--crop', type=int, nargs=4, metavar=('X', 'Y', 'W', 'H'))
    parser.add_argument('--preset-mask', action='store_true', help='屏蔽原作品录屏右下角的工具栏')
    parser.add_argument('--out', type=Path, default=ROOT / 'video/motion/ref.json')
    args = parser.parse_args()
    cv2.setNumThreads(2)
    capture = cv2.VideoCapture(str(args.reference), cv2.CAP_FFMPEG, [cv2.CAP_PROP_N_THREADS, 2])
    if not capture.isOpened():
        parser.error(f'无法打开视频 {args.reference}')
    fps = capture.get(cv2.CAP_PROP_FPS)
    expected_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    if not fps:
        parser.error('无法读取参考视频帧率')

    previous = None
    times, magnitudes = [], []
    index = 0
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            if args.crop:
                x, y, width, height = args.crop
                if min(x, y) < 0 or min(width, height) < 1 or x + width > frame.shape[1] or y + height > frame.shape[0]:
                    parser.error('裁切区域超出视频范围')
                frame = frame[y:y + height, x:x + width]
            gray = cv2.cvtColor(cv2.resize(frame, (256, 256), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
            if previous is not None:
                flow = cv2.calcOpticalFlowFarneback(previous, gray, None, 0.5, 3, 21, 3, 5, 1.1, 0)
                mask = (gray < 235) | (previous < 235)
                if args.preset_mask:
                    mask[int(1520 / 1630 * 256):, int(1330 / 1630 * 256):] = False
                magnitude = np.linalg.norm(flow, axis=2)
                times.append(index / fps)
                magnitudes.append(float(magnitude[mask].mean()) if mask.sum() > 50 else 0.0)
            previous = gray
            index += 1
    finally:
        capture.release()
    if not times:
        parser.error('需要至少两帧可解码的画面')
    if expected_frames and index < expected_frames:
        parser.error(f'参考视频只解码了 {index}/{expected_frames} 帧')
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({'fps': fps, 't': times, 'mag': magnitudes}), encoding='utf-8')
    print(args.out)


if __name__ == '__main__':
    main()
