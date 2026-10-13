# Estudio 066: native higher-resolution Wan worker

Prepared code, not a deployed or quality-validated engine. This change leaves the existing free Hugging Face panel unchanged. It does not provision a GPU, start a job, or enable a browser button.

The official Wan2.2 TI2V 5B profile generates 704×1280 portrait or 1280×704 landscape at 24 fps. Requests use 73 or 121 frames for approximately 3.04 or 5.04 seconds, 50 sampling steps, one start image and no audio. The reference is center-cropped to the selected aspect ratio. Character continuity remains unverified.

## Request contract

Runpod job input: `image_base64` (plain PNG/JPEG/WebP bytes, maximum 8 MiB and 20 MP), `prompt` (maximum 4000 characters), `duration` (3 or 5), `orientation` (`portrait` or `landscape`), and `seed` (0–2147483647). URLs, filesystem paths, commands, end frames, audio and arbitrary parameters are rejected. The server must authenticate OP066 users before forwarding a job; Runpod credentials must never be sent to the browser.

The worker returns a base64 MP4 plus measured resolution/fps/duration. It verifies full decoding before returning. Results over 7 MiB fail closed until private object storage is connected. No automatic retries. `quality_verified: false` explicitly means the result has not passed a human continuity review.

## Deployment requirements still outstanding

1. Build and test the container on the target GPU; the container has not been built here. Upstream source is pinned, while transitive Python dependencies still require a lockfile and GPU compatibility validation.
2. Mount weights at `/models/Wan2.2-TI2V-5B`, downloaded from `Wan-AI/Wan2.2-TI2V-5B` revision `921dbaf3f1674a56f47e83fb80a34bac8a8f203e`. Confirm sufficient storage and the official model's GPU requirements.
3. Provision a serverless endpoint with zero minimum workers, maximum one, idle timeout 5 seconds and execution timeout 600 seconds. An execution timeout is not a spending cap.
4. Obtain the actual rate and required deposit. Historical preparation records a USD 2 test budget but no approved USD 10 deposit. Do not treat this implementation as funding approval.
5. Connect an authenticated backend job submit/status flow and browser result import after an endpoint exists. Before submission, display the estimated cost; never replay a submission after an ambiguous network failure.
6. Generate one authorized Caso 066 test; inspect identity, clothing, motion, actual GPU charge, and playback/import/export. Enable the quality engine only after this passes.

## Local checks

`python3 tests/studio066-wan-worker.test.py` tests validation and the native command contract without a GPU or provider call.

Sources checked on 2026-10-13:
- https://github.com/Wan-Video/Wan2.2/blob/1ea34ff48f87168174e12956e200b1d908b1c5ff/wan/configs/wan_ti2v_5B.py
- https://github.com/Wan-Video/Wan2.2/blob/1ea34ff48f87168174e12956e200b1d908b1c5ff/generate.py
