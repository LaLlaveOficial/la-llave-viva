FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends git && rm -rf /var/lib/apt/lists/*
# Official source, pinned to the reviewed commit (8 October 2026).
RUN pip install --no-cache-dir 'git+https://github.com/googleads/google-ads-mcp.git@8efbd2e2b56da755cd0b3e642149ed8ad96b44b5'
RUN pip install --no-cache-dir 'PyJWT[crypto]>=2.10,<3'
COPY start.py /app/start.py
COPY llave_changes.py /app/llave_changes.py
RUN useradd --create-home app
USER app
ENV PORT=8080
EXPOSE 8080
CMD ["python", "/app/start.py"]
