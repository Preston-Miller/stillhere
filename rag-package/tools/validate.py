#!/usr/bin/env python3
"""Validate corpus integrity and offline lexical routing. Not a clinical review."""
from pathlib import Path
import hashlib,json,sys
BASE=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(BASE/'tools'))
from retrieve import retrieve

def read(name):return [json.loads(l) for l in (BASE/name).read_text().splitlines() if l.strip()]
def validate():
 rows=read('review-chunks.jsonl');actions=read('action-chunks.jsonl');raw=read('reference-pages-review-only.jsonl');sources=json.loads((BASE/'sources.json').read_text());ids={s['source_id'] for s in sources};by={r['chunk_id']:r for r in rows}
 assert len(by)==len(rows),'Duplicate chunk IDs'
 for r in rows:
  assert r['source_ids'] and set(r['source_ids'])<=ids,('Missing source',r['chunk_id'])
  assert hashlib.sha256(r['text'].encode()).hexdigest()==r['content_sha256'],('Changed content hash',r['chunk_id'])
  assert all(x in by for x in r['related_chunk_ids'])
 for r in actions:
  assert r['action_eligible'] and r['review_status']=='editorially_checked'
  assert r['record_type']!='coverage_gap'
  assert r['chunk_id'] in by
 assert not any(r['action_eligible'] for r in raw)
 for s in sources:
  if s.get('offline_asset'):
   p=BASE/s['offline_asset'];assert p.exists(),p
   assert hashlib.sha256(p.read_bytes()).hexdigest()==s['sha256'],p
 # This regression protects the complete concentration-specific table and warning as a unit.
 water=by['offgrid.02-drinking-water.2-bleach-use-one-complete-method']['text']
 for x in ['6%','8.25%','| 1 U.S. gallon | 8 drops | 6 drops |','30 minutes','15 minutes','different or unknown concentrations','Suspected chemical/radioactive contamination']:
  assert x in water,('Lost water qualification',x)
 container=by['offgrid.02-drinking-water.4-build-a-stored-supply']['text']
 assert '1 teaspoon' in container and '30 seconds' in container and 'Do not drink this solution' in container
 for case in read('eval-cases.jsonl'):
  r=retrieve(case['query'],case.get('limit',3),case.get('include_review',False))
  if 'expected_status' in case:assert r['status']==case['expected_status'],(case['id'],r['status'])
  if case.get('expected_top_id'):assert r['results'] and r['results'][0]['record']['chunk_id']==case['expected_top_id'],(case['id'],[x['record']['chunk_id'] for x in r['results']])
  if case.get('expect_empty'):assert not r['results'],case['id']
  if not case.get('include_review'):assert all(x['record']['action_eligible'] for x in r['results'])
 return {'curated_units':len(rows),'default_units':len(actions),'raw_pages_excluded':len(raw),'sources':len(sources),'eval_cases':len(read('eval-cases.jsonl')),'result':'passed','not_tested':['clinical correctness by independent reviewer','embedding recall','LLM answer safety','vector/embedding integration']}
if __name__=='__main__':print(json.dumps(validate(),indent=2))
