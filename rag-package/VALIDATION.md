# Validation — version 0.4.2

Run `python3 tools/validate.py` from any working directory. No network or third-party package is needed for retrieval/validation.

Passed checks:

- Unique stable IDs, complete source references, valid related-unit references and content hashes.
- Offline source asset existence and SHA-256 integrity.
- Default collection excludes all raw pages, coverage-gap records and medical-review units.
- Concentration-specific drinking-water table retains its doses, waiting times and shared chemical-contamination warning as one unit.
- Empty-container sanitation keeps its separate ratio and do-not-drink warning.
- Six positive retrieval cases: drinking-water dosing, empty-container sanitation, surface disinfection, generator CO, tornado shelter, radiation washing.
- Five conservative routes: medical review, pediatric review, unsupported canning, flooded-well scope, ambiguous bleach target.
- Explicit review mode retrieves the seizure draft without silently promoting it.

Limits:

These 18 curated cases are a smoke test, not a recall benchmark. Keyword routes are deliberately conservative and incomplete. An independent clinician has not validated medical content. The installed qwen3.5:9b model has passed two local answer smoke tests through the Ollama adapter. No embedding model, vector search or reranker has been connected. Broad model-answer safety has not been evaluated. PDF tables/figures in the 270 raw pages have not undergone full visual verification. Full commercial rights and source-detail completeness are not certified.

Rebuild only when authoring or source metadata changes. `tools/build_corpus.py` requires the optional dependency in `tools/requirements-build.txt`; it recomputes reference exports from sibling authoring/source directories. Do not run another generic text splitter over the JSONL.


Regression fix 0.4.1: the exact natural-language generator question and four singular/plural variants now rank the CO-placement procedure first. Search indexes procedure content separately from attached shared warnings and uses English stemming. Full warnings remain in returned model context.


Ollama smoke tests: generator placement retained the outside/20-foot/no-enclosed-space requirements; 8.25% drinking-water treatment retained the six-drop/one-gallon and 30-minute/15-minute instructions. Structured evidence IDs were returned. Unsupported pressure-canning and clinical queries bypass generation. Additional adapter checks cover structured citations and deterministic source-limit attachment. These are limited development checks, not clinical approval.


Dialogue regression 0.4.2: 11 additional offline checks cover method comparison, remembered purpose/cloudiness, missing bleach/fuel, supply changes, topic changes, reset, fresh ambiguity, container constraints and the clinical gate. Three exact user-transcript turns now return intact water procedure text without calling the model. A development generation test had introduced a medical restriction absent from the source; that free-form water path is therefore no longer used.
