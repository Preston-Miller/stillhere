# Stillhere app (project folder: OffGridAI)

A local chat app: an open-weight model (via Ollama) answers questions using the documentation library, and a viewer shows the cited pages.

## Run

```sh
python3 app/server.py          # http://127.0.0.1:8765
```

Requires Ollama running with `qwen3.5:9b` (chat) and `qwen3-embedding:0.6b` (search). The server uses only the Python standard library.

## How answers are labeled

- The model receives the top library passages, numbered [1], [2]...
- Any line that cites a real passage is shown as **from your library** (green), with clickable source chips that open the page on the right.
- Any line without a valid citation is shown as **model knowledge** (amber). Uncited text defaults to the model label, so the model cannot pass its own knowledge off as sourced by leaving out a citation.
- Numbers on a cited line that do not appear in the cited passage are underlined and flagged.
- Labels depend on the model citing honestly. The number check catches invented figures, not every misattribution.

## Library

`app/data/library.sqlite` holds every page of `knowledge/*.pdf` and `reference-sources/*.pdf` (page numbers kept), the offline web snapshots, and the 26 vetted guide sections from `rag-package/action-chunks.jsonl`. Search is hybrid: keyword (SQLite FTS5) and embedding similarity, fused by reciprocal rank, with a relevance cutoff (`COSINE_FLOOR` in `library.py`).

Rebuild after adding or changing documents (needs the venv with pypdf):

```sh
app-venv/bin/python app/build_index.py      # about 4 minutes for ~1,700 passages
```

Drop new PDFs into `knowledge/` and rebuild. Image-only (scanned) pages have no text and are not searchable without OCR.

## Your documents

The Sources view (sidebar) lists the built-in library and lets the user add their own PDF, Word (.docx) and text files. `userdocs.py` copies each file to `data/user/files/<id>/`, splits it like the built-in library and embeds it, storing passages in `data/user/user.sqlite`; search covers both. Their sources are labeled "your document" and the model is told which excerpts came from the user. Scanned PDFs with no text are refused with a message (no OCR yet). The server needs pypdf, so run it with `app-venv/bin/python`. Before shipping, move `data/user` to Application Support.

## Your videos

The Videos view (sidebar) lets the user add MP4, M4V and MOV files they already have, by button or drag and drop, and play them offline in a popup player. `videos.py` streams each upload to `data/user/videos/<id>/` (no size cap beyond 20 GB and free space) and keeps the list in `videos.json`. The server answers byte-range requests on `/videos/...` so the player can seek. Videos can be renamed and deleted. Downloading from YouTube was considered and left out: it's against YouTube's terms and needs a third-party tool that breaks often.

## Offline maps

The **Map** tab shows street-level maps of the states the user has downloaded. **Map regions** lists every state with its size; tick states and download, or remove them later. Internet is needed only while downloading.

- Each state is one PMTiles file in `app/data/maps/`, served as vector tiles by `app/maps.py` (stdlib reader) and drawn by MapLibre (`static/vendor/`, with local fonts and icons, so it works offline).
- Downloads come from `OFFGRID_MAPS_SOURCE`: a folder in development (`maps-build/out`), or the public R2 base URL in production. Files are checked against the SHA-256 in `catalog.json`.
- Build state files with `python3 maps-build/make_states.py UT CA ...` or `--all`, then upload `maps-build/out/` (all `.pmtiles` files plus `catalog.json`) to R2. All states come from one Protomaps build (`BUILD` in the script), so border tiles match.
- **Search** (box at the top of the map): towns, streets, trails, points of interest (hospitals, fuel, springs, peaks, campgrounds…), lakes and rivers, plus typed coordinates (decimal or degrees-minutes-seconds). Searching a kind ("hospital", "gas station") lists the nearest ones. Each state ships a small index, `<CODE>.search.sqlite`, built from the map file by `maps-build/make_search.py` (run automatically by `make_states.py`) and downloaded with the map. Street addresses are not in the basemap and are not searchable.
- Map data © OpenStreetMap contributors (ODbL), basemap by Protomaps. The attribution in the map corner must stay visible.
