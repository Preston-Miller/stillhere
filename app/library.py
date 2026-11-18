"""Stillhere library: page-level index of the documentation plus hybrid (keyword + embedding) search.

Everything is local. Ollama serves both the embedding model and the chat model (address in paths.py).
"""
import hashlib,http.client,json,math,re,sqlite3,threading
from array import array
from pathlib import Path

from paths import RESOURCES as ROOT,LIBRARY_DB as DB,OLLAMA   # ROOT: where knowledge/ and reference-sources/ live
EMBED_MODEL='qwen3-embedding:0.6b'
# The chat model is a buyer's choice: see models.py.
QUERY_TEMPLATE='Instruct: Given a question from someone preparing for or dealing with an emergency, retrieve passages from survival and emergency manuals that help answer it\nQuery: {q}'
# Folders the viewer may serve files from. Nothing outside these is reachable over HTTP.
SERVABLE=['knowledge','reference-sources','offgrid-guides']
RRF_K=60
WORDS=320;OVERLAP=60   # passage window size and overlap, in words (used by build_index.py)
# A chunk is shown to the model only if it clears this cosine similarity (or is a very strong keyword hit).
# Calibrated 2026-11-16 on rag-package/eval-paraphrase.jsonl: real questions >=0.41, off-topic <=0.36; re-check after changing the embedding model.
COSINE_FLOOR=0.40
BM25_STRONG=-12.0
STOP=set('a an the is it i we you to of for and or in on with what how do does can should my at this that use where when why which who would could please tell me about if are be our there their they them your was were has have had get got from as by'.split())

def ollama(path,payload,timeout=300):
 c=http.client.HTTPConnection(*OLLAMA,timeout=timeout)
 try:
  c.request('POST',path,json.dumps(payload),{'Content-Type':'application/json'})
  r=c.getresponse();data=r.read()
  if r.status!=200:raise RuntimeError(f'Ollama {path} HTTP {r.status}: '+data.decode(errors='replace')[:300])
  return json.loads(data)
 finally:c.close()

def embed(texts):
 return [unit(v) for v in ollama('/api/embed',{'model':EMBED_MODEL,'input':texts})['embeddings']]

def unit(v):
 n=math.sqrt(sum(x*x for x in v)) or 1.0
 return [x/n for x in v]

class Library:
 def __init__(self,db=DB):
  self.con=sqlite3.connect(db,check_same_thread=False);self.lock=threading.Lock()   # one connection shared by server threads
  self.chunks={}
  cols=[r[1] for r in self.con.execute('PRAGMA table_info(chunks)')]   # older builds lack year/dated
  for row in self.con.execute('SELECT '+','.join(cols)+' FROM chunks'):
   self.chunks[row[0]]=dict(zip(cols,row))
  for c in self.chunks.values():c.setdefault('year',None);c.setdefault('dated',None)
  # Every window of each PDF page, in reading order, so a hit can be widened to its whole page and the next one.
  self.pages={}
  for cid,c in self.chunks.items():
   if c['kind']=='pdf':self.pages.setdefault((c['doc'],c['page']),[]).append(c)
  for v in self.pages.values():v.sort(key=lambda c:window_index(c['id']))
  meta=dict(self.con.execute('SELECT key,value FROM meta'))
  if meta.get('embed_model')!=EMBED_MODEL:raise RuntimeError('Library was embedded with '+str(meta.get('embed_model'))+'; rebuild with app/build_index.py')
  self.vectors={cid:array('f',blob) for cid,blob in self.con.execute('SELECT id,vector FROM vectors')}
  self.extra=[]   # more searchable stores (the user's own documents); each has keyword(query,n)

 # Adding/removing documents swaps in new dicts instead of mutating, so a search running on another thread
 # never sees a dict change size mid-iteration.
 def add_chunks(self,chunks,vectors):
  ch=dict(self.chunks);vec=dict(self.vectors);pages={k:list(v) for k,v in self.pages.items()}
  for c,v in zip(chunks,vectors):
   ch[c['id']]=c;vec[c['id']]=array('f',v)
   if c['kind']=='pdf':pages.setdefault((c['doc'],c['page']),[]).append(c)
  for v in pages.values():v.sort(key=lambda c:window_index(c['id']))
  self.chunks,self.vectors,self.pages=ch,vec,pages

 def remove_doc(self,doc):
  self.chunks={k:c for k,c in self.chunks.items() if c['doc']!=doc}
  self.vectors={k:v for k,v in self.vectors.items() if k in self.chunks}
  self.pages={k:v for k,v in self.pages.items() if k[0]!=doc}

 def keyword(self,query,n):
  terms=[t for t in re.findall(r'[a-z0-9]+',query.lower()) if t not in STOP and len(t)>1][:30]
  if not terms:return []
  sql='SELECT id,bm25(fts,0,4,1) FROM fts WHERE fts MATCH ? ORDER BY bm25(fts,0,4,1) LIMIT ?'
  match=' OR '.join('"'+t+'"' for t in terms)
  with self.lock:hits=self.con.execute(sql,(match,n)).fetchall()
  for store in self.extra:hits+=store.keyword(match,n)
  return sorted(hits,key=lambda h:h[1])[:n]   # bm25: lower is better

 def search(self,query,limit=8,candidates=24,widen=4,carry=150):
  """Top `limit` sources. The first `widen` PDF sources get their whole page plus the first `carry` words of
  the next page, because manual procedures often run across a page break."""
  q=embed([QUERY_TEMPLATE.format(q=query)])[0]
  chunks,pages=self.chunks,self.pages   # one consistent snapshot even if a document is added meanwhile
  cos={cid:sum(a*b for a,b in zip(q,v)) for cid,v in self.vectors.items()}
  vec=sorted(cos,key=lambda c:-cos[c])[:candidates]
  lex=self.keyword(query,candidates);bm=dict(lex)
  fused={}
  for rank,cid in enumerate(vec):fused[cid]=fused.get(cid,0)+1/(RRF_K+rank+1)
  for rank,(cid,_) in enumerate(lex):fused[cid]=fused.get(cid,0)+1/(RRF_K+rank+1)
  keep=[c for c in sorted(fused,key=lambda c:-fused[c]) if c in chunks and (cos.get(c,0)>=COSINE_FLOOR or bm.get(c,0)<=BM25_STRONG)]
  # Group passages that come from the same PDF page (or the same web page / guide section) into one source.
  groups={};order=[];per_doc={}
  for cid in keep:
   ch=chunks[cid];key=source_key(ch)
   if key not in groups:
    # Avoid one manual crowding out everything else, and stop once we have enough distinct sources.
    if per_doc.get(ch['doc'],0)>=3 or len(order)>=limit:continue
    per_doc[ch['doc']]=per_doc.get(ch['doc'],0)+1
    groups[key]=[];order.append(key)
   groups[key].append(cid)
  out=[]
  for rank,key in enumerate(order):
   # Best 3 matching passages per source keeps the prompt (and time to first word) bounded.
   ids=groups[key][:3];best=ids[0];ch=chunks[best]
   text=merge_windows([chunks[i] for i in ids]);cont=None
   if ch['kind']=='pdf' and rank<widen:
    text=merge_windows(pages[key])
    nxt=pages.get((ch['doc'],ch['page']+1))
    if nxt:
     words=nxt[0]['text'].split()
     text+=f"\n[continues on page {ch['page']+1}] "+' '.join(words[:carry])+(' …' if len(words)>carry else '')
     cont=ch['page']+1
   out.append(dict(ch,id=best,text=text,continues=cont,passages=len(ids),
                   score=round(sum(fused[i] for i in ids),5),cosine=round(max(cos.get(i,0) for i in ids),4),bm25=bm.get(best)))
  return out

def source_key(ch):
 return (ch['doc'],ch['page']) if ch['kind']=='pdf' else (ch['doc'],None)

def window_index(cid):
 # PDF ids: "<path>#p12" or "<path>#p12.3"; web ids: "<path>#3"; guide ids have no window.
 m=re.search(r'(?:#p\d+\.(\d+)|#(\d+))$',cid)
 return int(m.group(1) or m.group(2)) if m else 0

def merge_windows(chunks):
 """Join matched windows of one page in reading order, dropping the overlap between adjacent windows."""
 chunks=sorted(chunks,key=lambda c:window_index(c['id']))
 text=chunks[0]['text'];prev=window_index(chunks[0]['id'])
 for c in chunks[1:]:
  i=window_index(c['id'])
  text+=(' '+' '.join(c['text'].split()[OVERLAP:])) if i==prev+1 else (' … '+c['text'])
  prev=i
 return text
