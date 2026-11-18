"""Local embedding support via the Ollama /api/embed endpoint. Standard library only.

Vectors live in vector-index.sqlite, keyed by chunk_id plus a hash of the exact text embedded and
the model name, so a corpus rebuild or model swap is detected as stale instead of silently mismatched.
"""
import hashlib,http.client,json,math,sqlite3
from array import array
from pathlib import Path
BASE=Path(__file__).resolve().parents[1]
DB=BASE/'vector-index.sqlite'
MODEL='qwen3-embedding:0.6b'
# Per-model input conventions. Asymmetric models need a query instruction/prefix to perform as benchmarked.
PROFILES={
 'qwen3-embedding:0.6b':{'query':'Instruct: Given a question from someone during an emergency or power outage, retrieve the reference passage that answers it\nQuery: {q}','doc':'{d}'},
 'nomic-embed-text':{'query':'search_query: {q}','doc':'search_document: {d}'},
 'embeddinggemma':{'query':'task: search result | query: {q}','doc':'title: none | text: {d}'},
}
# Minimum cosine similarity for a result to count as relevant; calibrated on eval-paraphrase.jsonl.
FLOOR=0.0

def doc_text(record):
 return record['title']+'\n'+record['section']+'\n\n'+record['search_text']

def _embed(texts,model=MODEL,timeout=120):
 c=http.client.HTTPConnection('127.0.0.1',11434,timeout=timeout)
 try:
  c.request('POST','/api/embed',json.dumps({'model':model,'input':texts,'truncate':False}),{'Content-Type':'application/json'})
  r=c.getresponse();data=r.read()
  if r.status!=200:raise RuntimeError('Ollama embed HTTP '+str(r.status)+': '+data.decode(errors='replace')[:300])
  return json.loads(data)['embeddings']
 finally:c.close()

def _norm(v):
 n=math.sqrt(sum(x*x for x in v)) or 1.0
 return [x/n for x in v]

def build(records,model=MODEL):
 prof=PROFILES[model]
 texts=[prof['doc'].format(d=doc_text(r)) for r in records]
 vecs=[]
 for i in range(0,len(texts),8):vecs+=_embed(texts[i:i+8],model)
 DB.unlink(missing_ok=True)
 con=sqlite3.connect(DB)
 con.execute('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)')
 con.execute('CREATE TABLE vectors (chunk_id TEXT PRIMARY KEY, text_sha256 TEXT, vector BLOB)')
 con.execute('INSERT INTO meta VALUES (?,?)',('model',model))
 con.execute('INSERT INTO meta VALUES (?,?)',('dimensions',str(len(vecs[0]))))
 for r,t,v in zip(records,texts,vecs):
  con.execute('INSERT INTO vectors VALUES (?,?,?)',(r['chunk_id'],hashlib.sha256(t.encode()).hexdigest(),array('f',_norm(v)).tobytes()))
 con.commit();con.close()
 return len(vecs),len(vecs[0])

def load_index(pool,model=MODEL):
 """Return {chunk_id: unit vector} for every record in pool, or None if the index is missing/stale."""
 if not DB.exists():return None
 con=sqlite3.connect(DB)
 try:
  meta=dict(con.execute('SELECT key,value FROM meta'))
  if meta.get('model')!=model:return None
  rows={cid:(h,blob) for cid,h,blob in con.execute('SELECT chunk_id,text_sha256,vector FROM vectors')}
 finally:con.close()
 prof=PROFILES[model];out={}
 for cid,record in pool.items():
  if cid not in rows:return None
  h,blob=rows[cid]
  if h!=hashlib.sha256(prof['doc'].format(d=doc_text(record)).encode()).hexdigest():return None
  out[cid]=array('f',blob)
 return out

def similarities(query,index,model=MODEL):
 q=_norm(_embed([PROFILES[model]['query'].format(q=query)],model)[0])
 return {cid:sum(a*b for a,b in zip(q,v)) for cid,v in index.items()}
