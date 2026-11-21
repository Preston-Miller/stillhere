# Stillhere for iPhone

The same UI as the Mac and Windows apps (`app/static`), shown full screen in a WKWebView. iOS can't run the Python
server or Ollama, so Swift stands in for `app/server.py` inside the app process. There is no local network server.

## How it fits together

| File | Role |
|---|---|
| `Stillhere/StillhereApp.swift` | App entry and web view (iOS only) |
| `Stillhere/SchemeHandler.swift` | Serves `stillhere://app/...`: bundle files from `web/`, `/api/*` goes to the router, and NDJSON streams for chat |
| `Stillhere/Router.swift` | Swift version of the server's routes. Foundation only |
| `copy_resources.sh` | Build phase: copies `app/static` → `web/` and `library.sqlite` → `library/` in the bundle |

User data lives in the app's Application Support/Stillhere (chats/, pins.json, location.json), in the same formats as the desktop app.

## Status

- **Works:** UI loads; chats, pins and My location save and reload.
- **Stubbed:** chat (returns "on-device AI isn't built yet"), health, setup, Sources, maps, videos.

## Build

Needs full Xcode 16 or newer (the Mac App Store version, not just the command-line tools).

1. Open `ios/Stillhere.xcodeproj`.
2. Pick an iPhone simulator and press Run.

Team `VKPHQN7W3S` and bundle id `com.stillhere.ios` are already set. Pick the bundle id before the first TestFlight build,
because the page's saved settings are tied to it.

Type-check the non-UI code without Xcode:

```bash
swiftc -typecheck ios/Stillhere/Router.swift ios/Stillhere/SchemeHandler.swift
```

## Next steps, in order

1. **First simulator run.** Check that the MapLibre worker and the module scripts load over the `stillhere://` scheme.
   If they don't, fall back to a localhost NWListener.
2. **On-device AI.** Add the MLX Swift LLM package, run Qwen 3.5 4B (4-bit) for `/api/chat` with the desktop prompt,
   and add the increased-memory-limit entitlement. Write a phone picker and downloader for `/api/setup`.
3. **Library search.** Read `library.sqlite` and precompute the passage vectors so only the question is embedded on the phone.
   Port `/api/library`.
4. **Maps.** Download states from R2 in the background with resume, read PMTiles tiles, and add the search index.
5. **App Store.** Decide how phone buyers pay, add privacy strings (location), write App Review notes for medical content.
