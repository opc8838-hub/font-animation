"""Generate a clip between two images with MiniMax-H3-Max."""

import argparse
from pathlib import Path
import sys

from minimax_client import call, image_url, wait


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('first')
    parser.add_argument('last')
    parser.add_argument('out', type=Path)
    parser.add_argument('prompt')
    parser.add_argument('--dur', type=int, default=5)
    parser.add_argument('--model', default='MiniMax-H3-Max')
    parser.add_argument('--res', default='768P')
    args = parser.parse_args()

    body = {
        'model': args.model,
        'resolution': args.res,
        'duration': args.dur,
        'content': [
            {'type': 'text', 'text': args.prompt},
            {'type': 'image_url', 'image_url': {'url': image_url(args.first)}, 'role': 'first_frame'},
            {'type': 'image_url', 'image_url': {'url': image_url(args.last)}, 'role': 'last_frame'},
        ],
    }
    result = call('/v2/video_generation', body)
    task_id = (
        (result.get('task') or {}).get('task_id')
        or result.get('task_id')
        or (result.get('data') or {}).get('task_id')
    )
    if not task_id:
        raise RuntimeError('MiniMax did not return a task ID.')
    print('task', task_id, flush=True)
    wait(task_id, args.out)
    print('saved', args.out, flush=True)


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, OSError, ValueError) as error:
        sys.exit(str(error))
