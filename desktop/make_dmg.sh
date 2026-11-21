#!/bin/zsh
# Packages build/stillhere.app into build/Stillhere-<version>.dmg with a laid-out installer window:
# fixed size, large icons, the app on the left, Applications on the right, and an arrow background.
# The layout is written by Finder itself (AppleScript), so the first run may ask to allow controlling Finder.
# usage: make_dmg.sh <version>     (run from desktop/; build.sh calls it)
set -euo pipefail
VERSION="$1"
APP=build/stillhere.app
DMG="build/Stillhere-$VERSION.dmg"   # file name stays: it is the R2 object key the website sends buyers
RW=build/Stillhere-rw.dmg
VOL="stillhere"

# Background (1x + 2x in one TIFF so it's sharp on Retina screens).
if [[ ! -f build/dmg-bg/background.tiff || make_dmg_background.swift -nt build/dmg-bg/background.tiff ]]; then
  swift make_dmg_background.swift build/dmg-bg
  tiffutil -cathidpicheck build/dmg-bg/background.png build/dmg-bg/background@2x.png -out build/dmg-bg/background.tiff >/dev/null
fi

# A volume with this name already mounted (e.g. a previous test) would make Finder lay out the wrong window.
for v in /Volumes/"$VOL"(N) /Volumes/"$VOL "*(N); do [[ -d "$v" ]] && hdiutil detach -quiet -force "$v" || true; done

rm -f "$RW" "$DMG"
SIZE_MB=$(( $(du -sm "$APP" | cut -f1) + 40 ))
hdiutil create -quiet -size ${SIZE_MB}m -fs HFS+ -volname "$VOL" -ov "$RW"
MOUNT=$(hdiutil attach -readwrite -noverify -noautoopen "$RW" | awk -F'\t' '/\/Volumes\//{print $NF}')

ditto "$APP" "$MOUNT/stillhere.app"
ln -s /Applications "$MOUNT/Applications"
mkdir "$MOUNT/.background"
cp build/dmg-bg/background.tiff "$MOUNT/.background/background.tiff"
cp build/AppIcon.icns "$MOUNT/.VolumeIcon.icns"
SetFile -a C "$MOUNT"          # use the custom volume icon
SetFile -a V "$MOUNT/.background" "$MOUNT/.VolumeIcon.icns" 2>/dev/null || true

osascript <<OSA
tell application "Finder"
  tell disk "$VOL"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set bounds of container window to {200, 120, 840, 520}
    set opts to the icon view options of container window
    set arrangement of opts to not arranged
    set icon size of opts to 128
    set text size of opts to 13
    set background picture of opts to file ".background:background.tiff"
    set position of item "stillhere.app" of container window to {170, 190}
    set position of item "Applications" of container window to {470, 190}
    close
    open
    update without registering applications
    delay 2
    close
  end tell
end tell
OSA

sync
hdiutil detach -quiet "$MOUNT" || hdiutil detach -quiet -force "$MOUNT"
hdiutil convert -quiet "$RW" -format UDZO -imagekey zlib-level=9 -o "$DMG"
rm -f "$RW"

# Sign, notarize and staple when the app carries a Developer ID signature (build.sh release does this by default).
# Uses the notarytool keychain profile "stillhere" (xcrun notarytool store-credentials stillhere ...).
# NOTARIZE=0 skips the Apple upload, e.g. for a quick local test of a signed build.
SIGNER=$(codesign -dvv "$APP" 2>&1 | awk -F= '/^Authority=Developer ID Application/ && !n++{print $2}')
if [[ -n "$SIGNER" ]]; then
  echo "• signing DMG ($SIGNER)"
  codesign --force --sign "$SIGNER" --timestamp "$DMG"
  if [[ "${NOTARIZE:-1}" == 1 ]]; then
    echo "• notarizing (uploads to Apple, usually a few minutes)"
    OUT=$(xcrun notarytool submit "$DMG" --keychain-profile "${NOTARY_PROFILE:-stillhere}" --wait 2>&1) || true
    echo "$OUT"
    if ! grep -q 'status: Accepted' <<<"$OUT"; then
      ID=$(awk '/^  id: /{print $2; exit}' <<<"$OUT")
      [[ -n "$ID" ]] && xcrun notarytool log "$ID" --keychain-profile "${NOTARY_PROFILE:-stillhere}" build/notary-log.json \
        && echo "Apple's report: desktop/build/notary-log.json" >&2
      echo "error: notarization was not accepted" >&2; exit 1
    fi
    xcrun stapler staple "$DMG"
    spctl -a -t open --context context:primary-signature -vv "$DMG"
  fi
fi
echo "✓ $DMG ($(du -h "$DMG" | cut -f1))"
