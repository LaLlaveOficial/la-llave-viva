#!/usr/bin/env bash
set -euo pipefail
# Credentials remain on the destination server; never echo docker compose config.
target="${1:?Indica el directorio houston-066 preparado}"
command -v docker >/dev/null || { echo 'Falta Docker en el servidor.' >&2; exit 1; }
cd "$target/selfhost"
[[ -f .env ]] || { echo 'Configura .env directamente en el servidor.' >&2; exit 1; }
[[ -s web/index.html ]] || { echo 'Falta la pantalla web compilada.' >&2; exit 1; }
docker compose config --quiet
docker compose up -d --build
docker compose ps
