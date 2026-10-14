FROM pytorch/pytorch:2.8.0-cuda12.8-cudnn9-devel
ARG WAN_REVISION=1ea34ff48f87168174e12956e200b1d908b1c5ff
ENV PYTHONUNBUFFERED=1 TOKENIZERS_PARALLELISM=false
RUN apt-get update && apt-get install -y --no-install-recommends git ffmpeg && rm -rf /var/lib/apt/lists/*
RUN git clone https://github.com/Wan-Video/Wan2.2.git /opt/Wan2.2 && cd /opt/Wan2.2 && git checkout "$WAN_REVISION"
WORKDIR /opt/Wan2.2
RUN pip install --no-cache-dir -r requirements.txt runpod==1.7.13
COPY handler.py /opt/studio066/handler.py
CMD ["python", "/opt/studio066/handler.py"]
