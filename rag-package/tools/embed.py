#!/usr/bin/env python3
"""Build vector-index.sqlite from every curated record (action and review) using a local Ollama embedding model.
Run after tools/build_corpus.py. Retrieval falls back to lexical-only until this has run against current content."""
import argparse,json,sqlite3
from pathlib import Path
import embeddings
BASE=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--model',default=embeddings.MODEL);a=p.parse_args()
con=sqlite3.connect(BASE/'reference-index.sqlite');records=[json.loads(x) for (x,) in con.execute('SELECT payload FROM records ORDER BY chunk_id')];con.close()
n,d=embeddings.build(records,a.model)
print(json.dumps({'model':a.model,'records':n,'dimensions':d,'index':str(embeddings.DB.name)}))
