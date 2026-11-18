# OffGrid AI project contents

The current RAG working copy is now inside this folder.

- `knowledge/`: original downloaded PDFs, unchanged.
- `rag-package/`: current retrieval data and local Ollama scripts.
- `offgrid-guides/`: detailed authoring and review documents.
- `reference-sources/`: newly acquired PDF references and offline source snapshots.
- `archives/prior-exports/`: older ZIP exports and duplicate extracted copies; do not ingest these alongside current data.
- `web/`: existing application, unchanged by the relocation.

Start the local model + retrieval test:

```sh
cd /Users/prestonmiller/Desktop/OffGridAI/rag-package
python3 tools/ask.py
```

The canonical default retrieval input is `rag-package/action-chunks.jsonl`. Do not point an automatic document loader at the entire project: review-only pages, original PDFs and archive duplicates are deliberately separate.

The original chat outputs remain as a backup snapshot. Continue editing/testing the working copy here. This relocation did not change the existing web application's configuration or deploy anything.
