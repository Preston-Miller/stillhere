# Test with your local Ollama model

Detected and tested: Ollama at 127.0.0.1:11434, installed model qwen3.5:9b. No model download was performed. Retrieval remains local SQLite full-text search; embeddings/vector search are not installed by this adapter.

## One question

From the rag-package directory:

```sh
python3 tools/ask.py "Where should I put a generator?"
```

## Repeated questions

```sh
python3 tools/ask.py
```

Type `exit` to quit. The session remembers a small set of user-stated context: topic, water purpose/condition, and unavailable supplies. Use `/reset` to clear it. It does not store model answers as factual evidence or retain state after exit. The helper retrieves complete eligible reference units. General responses use the installed local model; drinking-water procedures are rendered directly from intact authored reference text to prevent unsupported additions. It prints source-labeled guidance and evidence IDs.

## Useful comparisons

```sh
python3 tools/retrieve.py "Where should I put a generator?" --text --limit 1
python3 tools/ask.py "Where should I put a generator?"
python3 tools/ask.py "How much 8.25% bleach should I add to one gallon of clear drinking water?"
python3 tools/ask.py "How long do I pressure-can green beans?"
```

The final example should return a missing-scope message without calling the model. Medical drafts remain outside this adapter's default collection. There is no override to generate from raw reference pages or medical-review drafts.

## How it works

- Calls only the local Ollama chat endpoint with an installed model; does not use a hosted API or download models.
- General questions use lexical retrieval; drinking-water questions use explicit method bundles so boiling, bleach and product limitations can be compared. Missing bleach excludes its procedure; missing heat excludes boiling.
- Requests a structured answer plus evidence labels. Missing/invalid citations and output-limit truncation cause the answer to be withheld.
- Displays attached safety limits from the reference independently of the model summary, so those limits are not silently omitted.
- Does not truncate a procedure to fit context. Its conservative character guard is not an exact tokenizer guarantee.
- `--json` includes model token counts and evidence metadata for inspection.
- Model output can still be wrong despite correct citations. The small live smoke test is not clinical validation or a general answer-safety certification.

The source registry in sources.json maps the printed IDs to provenance and available offline evidence. Ollama must already be running locally. This does not modify the model's weights or add knowledge permanently: retrieval is performed for each question.


## Fixes from the cloudy-water dialogue

The exact three-turn test now retains cloudy drinking-water context and the unavailable-bleach constraint. A short reply of “drinking water” no longer erases prior constraints. New topics clear water-specific constraints; `/reset` explicitly clears all session state. This is inspectable structured state, not unrestricted long-term conversational memory. No free-form generated water-treatment restrictions are presented.
