#!/usr/bin/env bash
set -euo pipefail
# Prepare source only. Does not create credentials, change DNS or start a service.
HOUSTON_REVISION=597cba982c0cb725edc92237d9be7a40db69a6ff
target="${1:-./houston-066}"
if [[ -e "$target" ]]; then
  echo 'El destino ya existe. Usa un directorio nuevo; no se sobrescribe.' >&2
  exit 1
fi
for required in git node pnpm; do
  command -v "$required" >/dev/null || { echo "Falta $required" >&2; exit 1; }
done
node -e 'if(Number(process.versions.node.split(".")[0])<22) process.exit(1)'
git clone --filter=blob:none --no-checkout https://github.com/gethouston/houston.git "$target"
git -C "$target" checkout --detach "$HOUSTON_REVISION"
cd "$target"
pnpm install --frozen-lockfile
VITE_NEW_ENGINE=1 pnpm --filter houston-web build
mkdir -p selfhost/web
cp -R packages/web/dist/. selfhost/web/
echo 'Motor y pantalla web preparados. Configura selfhost/.env en el servidor antes de iniciar.'
