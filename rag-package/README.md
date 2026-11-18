# OffGrid AI: RAG reference package

Version 0.4.2 · November 16, 2026

This is an offline, model-independent **reference corpus and integration scaffold**. It contains no model weights or embeddings. A local generation adapter now connects the existing qwen3.5:9b model to filtered lexical retrieval; see OLLAMA.md. The source knowledge is the product being prepared; Markdown guides are the authoring/review layer.

## Files and boundaries

| File | Role |
|---|---|
| action-chunks.jsonl | Bounded nonclinical units eligible for the prototype's default retrieval |
| review-chunks.jsonl | All authored units, including incomplete and medically unreviewed material |
| reference-pages-review-only.jsonl | Raw extracted pages from newly downloaded PDFs; never action-ready recipes/procedures |
| sources.json | Stable source IDs, provenance URLs and available offline asset links/hashes |
| retrieval-policy.json | Filters, scope, conflict, citation and context-preservation rules |
| reference-index.sqlite | Offline SQLite full-text index of authored units, filtered by default |
| tools/retrieve.py | Standard-library retrieval helper; returns evidence, not advice |
| topic-routes.json | Conservative medical, ambiguous-recipe and missing-scope routing |
| chunk-schema.json | Machine-readable authored-unit schema |
| coverage.json | Machine-readable remaining gaps |
| ANSWER-CONTRACT.md | Evidence-use contract for eventual model integration |
| eval-cases.jsonl | Retrieval and safety checks with expected results |
| VALIDATION.md | What was tested and what was not |
| manifest.json | Actual counts and integration status |

The original 24 PDFs remain unchanged in the user's knowledge folder. Twelve newly acquired reference PDFs are stored separately in ../reference-sources. Twenty-seven official web pages have offline text snapshots. Some source URLs have no offline copy; sources.json makes this visible. The authored corpus and retrieval helper work without those links or network access.

## Record structure

Every authored unit has a stable chunk_id, parent document ID, section, audience, jurisdiction, review status, completeness, eligibility flag, source IDs, related unit IDs, full text, content hash and check date. Citation fields do not invent PDF page numbers. Exact PDF page numbers exist on raw page records; original tables/figures still require visual review before extraction is promoted.

A procedure remains intact with its table, qualifications and shared limitations. These are semantic units, not arbitrary fixed-length slices. Repeated safety context is intentional. If the future embedding model's input limit is smaller than a unit, create a short search-only child that retrieves its full parent; do not silently truncate the parent procedure. Word counts are not tokenizer counts.

## Offline smoke test

From this directory:

```sh
python3 tools/retrieve.py 'Where should I put a generator?' --text --limit 1
python3 tools/retrieve.py 'seizure five minutes' --include-review
```

The second command deliberately opens a review collection. Do not enable it in a released emergency-answer assistant. Clinical material is not independently reviewed, and the policy does not claim that publication by an authoritative organization alone completes clinical review.

## Connecting to an eventual RAG stack

1. Import **only** action-chunks.jsonl into the default collection, preserving metadata and the full parent text.
2. Embed retrieval text using the chosen local embedding model. Store chunk IDs so an updated content hash can replace a changed unit without duplicating it.
3. Retrieve candidates, filter by eligibility and intended audience/materials, and rerank if supported. A lexical or vector match is not an applicability decision.
4. Expand the selected parent and any essential related units before generation. Keep quantities, exceptions and source IDs together.
5. Require the answer to distinguish supported steps from missing details. Cite evidence IDs; do not improvise from a coverage-gap record or raw source page.
6. Evaluate with the actual local model and retriever. Current checks validate packaging and lexical retrieval, not model behavior, medical safety, recall across all emergencies or a finished product.

No embedding/model/framework preference has been assumed. Framework-specific adapters and tokenizer-specific chunk sizing remain pending until that stack is selected.


Search representation: `search_text` contains the substantive section for ranking/embedding; `text` retains the full procedure and attached limitations for generation. The lexical index uses English stemming so generator/generators match. Do not replace full answer context with the shorter search representation.


## Ollama generation test

[Run the installed local model with this reference corpus](OLLAMA.md). Start with `python3 tools/ask.py "Where should I put a generator?"`. This generates an answer, unlike retrieve.py, which only displays evidence. No model weights were downloaded or changed.


Session follow-ups and water-method bundles are implemented in tools/conversation.py and tools/ask.py. Water procedures use intact source-backed rendering; other questions may use the local model. Run `python3 tools/validate_conversation.py` for the additional 11 offline session checks. See conversation-validation-results.json for the three exact transcript cases.
