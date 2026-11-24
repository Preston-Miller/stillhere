#!/bin/zsh
# Builds desktop/build/stillhere.app.
#
#   desktop/build.sh          dev build: the app runs this repository's app-venv Python and app/ code,
#                             the Ollama installed in /Applications, and the models in ~/.ollama.
#                             Fast; for trying the app window. Not something to ship.
#   desktop/build.sh release  self-contained build: bundles Ollama, the library and a frozen Python server.
#                             Needs PyInstaller in app-venv. Not signed yet; signing + notarizing is a separate step.
#                             Its first run downloads the AI models (~7.2 GB) into Application Support.
set -euo pipefail
HERE="${0:A:h}"
ROOT="${HERE:h}"
cd "$HERE"
MODE="${1:-dev}"
APP=build/stillhere.app
VERSION=$(cat VERSION 2>/dev/null || echo 0.1.0)

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

echo "• compiling"
swiftc -O -target arm64-apple-macos14.0 -o "$APP/Contents/MacOS/Stillhere" Stillhere.swift

echo "• icon"
if [[ ! -f build/AppIcon.icns || make_icon.swift -nt build/AppIcon.icns ]]; then
  rm -rf build/AppIcon.iconset
  swift make_icon.swift build/AppIcon.iconset
  iconutil -c icns build/AppIcon.iconset -o build/AppIcon.icns
fi
cp build/AppIcon.icns "$APP/Contents/Resources/AppIcon.icns"

DEVKEY=""
if [[ "$MODE" == dev ]]; then
  DEVKEY="<key>StillhereDevRoot</key><string>$ROOT</string>"
fi
# Where release builds download state maps from (the public R2 maps bucket). Override with MAPS_URL=... desktop/build.sh release
MAPS_URL="${MAPS_URL:-$(cat MAPS_URL 2>/dev/null || true)}"
MAPSKEY=""
if [[ "$MODE" == release ]]; then
  if [[ -z "$MAPS_URL" ]]; then echo "warning: no MAPS_URL (desktop/MAPS_URL); map downloads won't work in this build" >&2
  else MAPSKEY="<key>StillhereMapsSource</key><string>$MAPS_URL</string>"; fi
fi

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>stillhere</string>
  <key>CFBundleDisplayName</key><string>stillhere</string>
  <key>CFBundleIdentifier</key><string>com.stillhere.mac</string>
  <key>CFBundleExecutable</key><string>Stillhere</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.reference</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>© 2026 stillhere</string>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
  $DEVKEY
  $MAPSKEY
</dict></plist>
PLIST

if [[ "$MODE" == release ]]; then
  echo "• Ollama"
  OSRC=/Applications/Ollama.app/Contents/Resources
  mkdir -p "$APP/Contents/Resources/ollama/licenses"
  # Keep mlx_metal_v3/v4 (~435 MB): Ollama runs qwen3.5 on its MLX engine (v3 = Metal 3, v4 = newer macOS).
  # Excluding them breaks chat with "MLX runtime is not available" (tested 2026-11-17).
  rsync -a --exclude '*.png' --exclude '*.svg' --exclude '*.icns' --exclude '*LICENSE*' --exclude '*NOTICE*' "$OSRC/" "$APP/Contents/Resources/ollama/"
  rsync -a --include '*LICENSE*' --include '*NOTICE*' --exclude '*' "$OSRC/" "$APP/Contents/Resources/ollama/licenses/"

  echo "• library"
  L="$APP/Contents/Resources/library"
  mkdir -p "$L"
  cp "$ROOT/app/data/library.sqlite" "$L/"
  rsync -a --exclude '.DS_Store' "$ROOT/Final_Sources" "$L/"

  echo "• server"
  PY="$ROOT/app-venv/bin/python"
  if ! "$PY" -c 'import PyInstaller' 2>/dev/null; then
    echo "PyInstaller is not installed in app-venv. Install it with:  $PY -m pip install pyinstaller" >&2
    exit 1
  fi
  "$PY" -m PyInstaller --noconfirm --clean --log-level WARN --name stillhere-server --onedir \
    --distpath build/pyi-dist --workpath build/pyi-work --specpath build \
    --paths "$ROOT/app" --add-data "$ROOT/app/static:static" --hidden-import pypdf \
    "$ROOT/app/server.py"
  cp -R build/pyi-dist/stillhere-server "$APP/Contents/Resources/server"
fi

# Signing.
#   release: signed with the Developer ID found in the keychain (override with SIGN_ID=..., or SIGN_ID=- for ad-hoc).
#            Every nested Mach-O (Ollama, its dylibs, the frozen Python server and its .so/.dylib files) is signed
#            on its own, innermost first, with hardened runtime and a secure timestamp. Notarization requires this;
#            `codesign --deep` doesn't apply the options reliably to nested code.
#   dev:     ad-hoc. Without any signature covering the whole bundle, a downloaded copy is reported as "damaged".
if [[ "$MODE" == release && -z "${SIGN_ID:-}" ]]; then
  SIGN_ID=$(security find-identity -v -p codesigning | awk -F'"' '/Developer ID Application/ && !n++{print $2}')
  [[ -z "$SIGN_ID" ]] && { echo "error: no Developer ID Application identity in the keychain (SIGN_ID=- for ad-hoc)" >&2; exit 1; }
fi
SIGN_ID="${SIGN_ID:--}"
echo "• signing ($SIGN_ID)"
xattr -cr "$APP"
if [[ "$SIGN_ID" == - ]]; then
  codesign --force --deep --sign - "$APP"
else
  SIGN=(codesign --force --sign "$SIGN_ID" --options runtime --timestamp)
  R="$APP/Contents/Resources"
  # 1. Loose Mach-O files outside any .framework (dylibs, .so modules, helper executables), deepest path first.
  #    The two programs the app starts are signed in step 3, with entitlements.
  find "$R" -type f ! -path '*.framework/*' ! -path "$R/library/*" -print0 | xargs -0 file \
    | grep -v '(for architecture' | awk -F': ' '/Mach-O/{print $1}' \
    | grep -vxF -e "$R/ollama/ollama" -e "$R/server/stillhere-server" \
    | awk -F/ '{print NF"\t"$0}' | sort -rn | cut -f2- \
    | while IFS= read -r f; do "${SIGN[@]}" "$f" >/dev/null 2>&1 || { echo "signing failed: $f" >&2; "${SIGN[@]}" "$f"; exit 1; }; done
  # 2. Framework bundles (PyInstaller's Python.framework) as bundles.
  find "$R" -type d -name '*.framework' -prune -print0 | while IFS= read -r -d '' fw; do "${SIGN[@]}" "$fw"; done
  # 3. The helper programs, then the app itself (no --deep: everything inside is already signed).
  "${SIGN[@]}" --entitlements entitlements/server.plist "$R/server/stillhere-server"
  [[ -f "$R/ollama/ollama" ]] && "${SIGN[@]}" "$R/ollama/ollama"
  "${SIGN[@]}" "$APP"
fi
codesign --verify --deep --strict "$APP"

if [[ "$MODE" == release ]]; then
  echo "• DMG"
  zsh make_dmg.sh "$VERSION"
fi

echo "✓ $APP ($MODE)"
