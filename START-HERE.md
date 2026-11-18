# OffGrid AI reference data — version 0.4.2

The primary deliverable is [the RAG package](rag-package/README.md), prepared for an offline local model to retrieve supporting knowledge. It is an ingestion/review package and retrieval scaffold; the installed local Ollama model is now connected via rag-package/tools/ask.py; vector search is not installed.

- [Test the local Ollama model](rag-package/OLLAMA.md)
- [RAG files and integration instructions](rag-package/README.md)
- [Current counts and status](rag-package/manifest.json)
- [Remaining gaps](rag-package/coverage.json)
- [Validation scope](rag-package/VALIDATION.md)
- [Detailed authoring reference](OffGrid-AI-First-Draft.md)
- [Offline source evidence](reference-sources/README.md)

Default import: rag-package/action-chunks.jsonl. The full review export and raw pages are separate; do not point a generic folder loader at the whole bundle. Medical drafts are intentionally excluded from default actions pending qualified review.

The source-detail audit is incomplete. Eighteen retrieval/routing cases plus eleven session checks and integrity checks passed; this does not establish clinical correctness, embedding recall or model answer safety. All original local PDFs remain unchanged.
