#!/usr/bin/env bash
# Gera as imagens do README a partir das bancadas, por Chrome headless.
# Precisa do servidor de pré-visualização no ar (porta 8793).
#   preview_start mw-window-curtain-paper-preview   (ou: python3 -m http.server 8793)
set -euo pipefail
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
cd "$(dirname "$0")/.."
mkdir -p docs
"$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --window-size=1180,1400 --screenshot=docs/exemplos.png \
  --virtual-time-budget=2500 "http://localhost:8793/tools/vitrine.html"
echo "docs/exemplos.png:"; ls -lh docs/exemplos.png
