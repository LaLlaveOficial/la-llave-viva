"""Isolated Runpod worker. No GPU is provisioned by importing this module."""
import base64
import binascii
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

WAN_ROOT = Path('/opt/Wan2.2')
MODEL_ROOT = Path('/models/Wan2.2-TI2V-5B')
MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_OUTPUT_BYTES = 7 * 1024 * 1024
SIZES = {'portrait': (704, 1280), 'landscape': (1280, 704)}


def validate_input(value):
    if not isinstance(value, dict):
        raise ValueError('Job input must be an object.')
    if set(value) - {'image_base64', 'prompt', 'duration', 'orientation', 'seed'}:
        raise ValueError('Unsupported parameters. URLs, paths and commands are not accepted.')
    prompt = value.get('prompt')
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4000:
        raise ValueError('Prompt must contain 1–4000 characters.')
    duration = value.get('duration', 5)
    if type(duration) is not int or duration not in (3, 5):
        raise ValueError('Duration must be 3 or 5 seconds.')
    orientation = value.get('orientation', 'portrait')
    if not isinstance(orientation, str) or orientation not in SIZES:
        raise ValueError('Orientation must be portrait or landscape.')
    seed = value.get('seed', 42)
    if type(seed) is not int or not 0 <= seed <= 2147483647:
        raise ValueError('Seed is out of range.')
    encoded = value.get('image_base64')
    if not isinstance(encoded, str) or len(encoded) > 4 * ((MAX_IMAGE_BYTES + 2) // 3):
        raise ValueError('Reference exceeds 8 MiB.')
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError('Reference must be plain base64.') from None
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise ValueError('Reference is empty or exceeds 8 MiB.')
    return dict(prompt=prompt.strip(), duration=duration, orientation=orientation, seed=seed, raw=raw)


def prepare_image(raw, destination, orientation):
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = 20_000_000
    with Image.open(io.BytesIO(raw)) as source:
        if source.format not in ('PNG', 'JPEG', 'WEBP') or source.width * source.height > 20_000_000:
            raise ValueError('Use a PNG, JPEG or WebP reference under 20 megapixels.')
        image = ImageOps.exif_transpose(source).convert('RGB')
        # Explicit center crop: never stretch a reference to change its aspect ratio.
        ImageOps.fit(image, SIZES[orientation], method=Image.Resampling.LANCZOS).save(destination, 'PNG')


def build_command(params, image_path, output_path):
    width, height = SIZES[params['orientation']]
    return ['python', str(WAN_ROOT / 'generate.py'), '--task', 'ti2v-5B',
            '--size', f'{width}*{height}', '--frame_num', str(params['duration'] * 24 + 1),
            '--ckpt_dir', str(MODEL_ROOT), '--offload_model', 'True',
            '--convert_model_dtype', '--t5_cpu', '--sample_steps', '50',
            '--base_seed', str(params['seed']), '--prompt', params['prompt'],
            '--image', str(image_path), '--save_file', str(output_path)]


def inspect_output(path, params):
    metadata = json.loads(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)], timeout=20))
    streams = metadata.get('streams', [])
    if len(streams) != 1 or streams[0].get('codec_type') != 'video':
        raise ValueError('Expected one video stream without audio.')
    video = streams[0]
    expected = SIZES[params['orientation']]
    if (video.get('width'), video.get('height')) != expected or video.get('avg_frame_rate') != '24/1':
        raise ValueError('Generated resolution or frame rate does not match the native profile.')
    actual_duration = float(metadata['format']['duration'])
    if abs(actual_duration - (params['duration'] + 1 / 24)) > 0.1:
        raise ValueError('Generated duration does not match the request.')
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(path), '-f', 'null', '-'],
                   check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not 0 < path.stat().st_size <= MAX_OUTPUT_BYTES:
        raise ValueError('Generated video exceeds the inline transport limit; private storage is required.')
    return dict(width=expected[0], height=expected[1], fps=24, duration=actual_duration,
                frames=int(video['nb_frames']), codec=video['codec_name'], audio=False)


def handler(job):
    started = time.monotonic()
    try:
        params = validate_input(job.get('input'))
    except (ValueError, AttributeError) as error:
        return {'error': str(error)}
    if not (MODEL_ROOT / 'config.json').is_file():
        return {'error': 'Model weights are not provisioned. No generation was started.'}
    try:
        with tempfile.TemporaryDirectory(prefix='studio066-') as folder:
            reference, output = Path(folder) / 'reference.png', Path(folder) / 'result.mp4'
            prepare_image(params.pop('raw'), reference, params['orientation'])
            subprocess.run(build_command(params, reference, output), cwd=WAN_ROOT, check=True,
                           timeout=540, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            metadata = inspect_output(output, params)
            return {'video_base64': base64.b64encode(output.read_bytes()).decode('ascii'),
                    'mime_type': 'video/mp4', 'metadata': metadata,
                    'generation_seconds': round(time.monotonic() - started, 2),
                    'model': 'Wan-AI/Wan2.2-TI2V-5B', 'quality_verified': False}
    except subprocess.TimeoutExpired:
        return {'error': 'Generation timed out. Do not retry automatically.'}
    except Exception:
        # Do not leak prompts, reference data or infrastructure paths into job logs.
        return {'error': 'Generation or output validation failed. Review the worker before retrying.'}


if __name__ == '__main__':
    import runpod
    runpod.serverless.start({'handler': handler})
