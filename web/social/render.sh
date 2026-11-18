#!/bin/zsh
# Renders social/og.html to public/<name>.png with headless Chrome, e.g.  zsh social/render.sh social-preview-v4
set -euo pipefail
cd "${0:A:h}/.."
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars \
  --allow-file-access-from-files --virtual-time-budget=8000 --window-size=1200,630 \
  --screenshot="$PWD/public/$1.png" "file://$PWD/social/og.html" 2>/dev/null
echo "public/$1.png"
