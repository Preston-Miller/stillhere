#!/usr/bin/env python3
"""Offline reference retrieval; returns evidence, never generates advice.

Hybrid ranking: SQLite FTS5 BM25 and local-embedding cosine similarity, fused with
reciprocal rank fusion (RRF). Falls back to lexical-only when vector-index.sqlite is
missing, built with a different model, or stale for any current record. Results below
the relevance floor are dropped so weak matches never reach the generator.
"""
import argparse,http.client,json,re,sqlite3
from pathlib import Path
import embeddings
BASE=Path(__file__).resolve().parents[1]
RRF_K=60
CANDIDATES=10
# Relevance floor, calibrated on eval-paraphrase.jsonl (see VALIDATION.md). A result survives if its
# cosine similarity clears VECTOR_FLOOR, or it is a strong lexical match. Tune only against the eval set.
VECTOR_FLOOR=embeddings.FLOOR
LEXICAL_STRONG=-8.0   # bm25() is negative; more negative = stronger match
STOP={'a','an','the','is','it','i','we','you','to','of','for','and','or','in','on','with','what','how','do','does','can','should','my','at','this','that','use','where','when','why','which','who','would','could','please','put','place','tell','me','about'}

def route(query):
 routing=json.loads((BASE/'topic-routes.json').read_text())
 for rule in routing['rules']:
  if re.search(rule['pattern'],query,re.I):
   return {'status':rule['status'],'query':query,'results':[],'reason':rule['reason'],'review_document_ids':rule.get('review_document_ids',[])}

def lexical(con,query,include_review,n):
 terms=[t for t in re.findall(r'[a-zA-Z0-9]+',query.lower()) if t not in STOP][:30]
 if not terms:return []
 sql='SELECT r.chunk_id,bm25(search,0,3,6,1) FROM search JOIN records r ON search.chunk_id=r.chunk_id WHERE search MATCH ?'
 if not include_review:sql+=' AND r.action_eligible=1'
 sql+=' ORDER BY bm25(search,0,3,6,1),r.chunk_id LIMIT ?'
 return con.execute(sql,[' OR '.join('"'+t+'"' for t in terms),n]).fetchall()

def retrieve(query,limit=5,include_review=False,mode='auto',floor=True):
 """mode: 'auto' (hybrid if a fresh vector index exists), 'hybrid', 'lexical' or 'vector'."""
 if not include_review:
  routed=route(query)
  if routed:return routed
 con=sqlite3.connect(BASE/'reference-index.sqlite')
 rows={cid:(eligible,payload) for cid,eligible,payload in con.execute('SELECT chunk_id,action_eligible,payload FROM records')}
 pool={cid:json.loads(p) for cid,(e,p) in rows.items() if include_review or e}
 vindex=embeddings.load_index(pool) if mode!='lexical' else None
 if mode in ('hybrid','vector') and vindex is None:
  con.close();raise RuntimeError('Vector index missing or stale. Run tools/embed.py.')
 used='lexical' if vindex is None else ('vector' if mode=='vector' else 'hybrid')
 lex=lexical(con,query,include_review,CANDIDATES) if used!='vector' else [];con.close()
 bm={cid:s for cid,s in lex}
 cos={}
 if vindex is not None:
  try:cos=embeddings.similarities(query,vindex)
  except (OSError,RuntimeError,http.client.HTTPException):
   if mode!='auto':raise
   # Embedding server unavailable: degrade to lexical rather than fail the question.
   used='lexical';lex=lexical(sqlite3.connect(BASE/'reference-index.sqlite'),query,include_review,CANDIDATES);bm={cid:s for cid,s in lex}
 fused={}
 for rank,(cid,_) in enumerate(lex):fused[cid]=fused.get(cid,0)+1/(RRF_K+rank+1)
 for rank,(cid,_) in enumerate(sorted(cos.items(),key=lambda x:-x[1])[:CANDIDATES]):fused[cid]=fused.get(cid,0)+1/(RRF_K+rank+1)
 ranked=sorted(fused,key=lambda c:(-fused[c],c))
 if floor:
  def relevant(cid):
   if used=='lexical':return True   # no calibrated signal; legacy behavior
   return cos.get(cid,-1)>=VECTOR_FLOOR or bm.get(cid,0)<=LEXICAL_STRONG
  ranked=[c for c in ranked if relevant(c)]
 results=[{'score':round(fused[c],5),'bm25':bm.get(c),'cosine':(round(cos[c],4) if c in cos else None),'record':pool[c]} for c in ranked[:limit]]
 status='review_evidence' if include_review else ('bounded_reference_evidence' if results else 'no_supported_reference')
 return {'status':status,'collection':'review' if include_review else 'action','retrieval_mode':used,'query':query,'results':results,'warning':'Evidence retrieval only. Matching does not establish applicability. Apply retrieval-policy.json before generating any answer.'}

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('query');p.add_argument('--limit',type=int,default=5);p.add_argument('--include-review',action='store_true',help='Explicit development/review mode; can return unreviewed medical drafts')
 p.add_argument('--mode',choices=['auto','hybrid','lexical','vector'],default='auto')
 p.add_argument('--text',action='store_true',help='Print readable evidence instead of JSON')
 a=p.parse_args()
 if not 1<=a.limit<=20:p.error('--limit must be between 1 and 20')
 result=retrieve(a.query,a.limit,a.include_review,a.mode)
 if a.text:
  print('Status: '+result['status']+(' ('+result['retrieval_mode']+')' if result.get('retrieval_mode') else ''))
  if result.get('reason'):print(result['reason'])
  for n,hit in enumerate(result['results'],1):
   record=hit['record'];print('\n'+str(n)+'. '+record['title']+' — '+record['section'])
   print('Evidence ID: '+record['chunk_id']+'\n')
   print(record['text'])
  print('\nRetrieved reference material; no AI answer was generated.')
 else:print(json.dumps(result,ensure_ascii=False,indent=2))
