"""Minimal MiniMax v2 client for first/last-frame video generation."""

import base64
import json
import mimetypes
import os
from pathlib import Path
import shutil
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

BASE_URL = 'https://api.minimaxi.com'


def image_url(path):
    path = Path(path)
    mime = mimetypes.guess_type(path.name)[0]
    if mime not in ('image/png', 'image/jpeg', 'image/webp'):
        raise ValueError(f'Unsupported image type: {path.name}')
    return f'data:{mime};base64,{base64.b64encode(path.read_bytes()).decode("ascii")}'


def call(path, body=None):
    key = os.getenv('MINIMAX_API_KEY')
    if not key:
        raise RuntimeError('Set the MINIMAX_API_KEY environment variable first.')
    data = json.dumps(body).encode('utf-8') if body is not None else None
    request = Request(BASE_URL + path, data, {
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
    })
    # A timed-out POST may already have started a billable generation.
    attempts = 1 if body is not None else 3
    for attempt in range(attempts):
        try:
            with urlopen(request, timeout=60) as response:
                result = json.load(response)
            break
        except HTTPError as error:
            if error.code < 500 or attempt + 1 == attempts:
                raise RuntimeError(f'MiniMax HTTP {error.code}') from None
        except (URLError, TimeoutError):
            if attempt + 1 == attempts:
                raise RuntimeError('MiniMax request failed. Check the task before retrying a submission.') from None
        time.sleep(5)
    status = (result.get('base_resp') or {}).get('status_code', 0)
    if status:
        raise RuntimeError(f'MiniMax API status {status}')
    return result


def wait(task_id, out):
    out = Path(out)
    deadline = time.monotonic() + 25 * 60
    last_status = None
    while time.monotonic() < deadline:
        time.sleep(15)
        result = call('/v2/query/video_generation/' + quote(str(task_id), safe=''))
        task = result.get('task') or {}
        status = task.get('status')
        if status != last_status:
            print(status, flush=True)
            last_status = status
        if status == 'succeeded':
            link = (task.get('content') or {}).get('url', '')
            if urlsplit(link).scheme != 'https':
                raise RuntimeError('MiniMax did not return an HTTPS download URL.')
            out.parent.mkdir(parents=True, exist_ok=True)
            partial = out.with_suffix(out.suffix + '.part')
            try:
                with urlopen(link, timeout=180) as response, partial.open('wb') as stream:
                    shutil.copyfileobj(response, stream)
                partial.replace(out)
            finally:
                partial.unlink(missing_ok=True)
            return
        if status in ('failed', 'cancelled') or status is None:
            raise RuntimeError(f'MiniMax task ended with status {status!r}.')
    raise TimeoutError(f'MiniMax task {task_id} is still pending.')
