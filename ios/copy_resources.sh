#!/bin/sh
# Xcode build phase: copy the shared UI (app/static) and the built library index into the app bundle.
# app/static stays the single source of truth for Mac, Windows and iPhone.
set -eu
REPO="$SRCROOT/.."
DEST="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
mkdir -p "$DEST/web" "$DEST/library"
rsync -a --delete --exclude '.DS_Store' "$REPO/app/static/" "$DEST/web/"
cp "$REPO/app/data/library.sqlite" "$DEST/library/library.sqlite"
