#!/usr/bin/env python3
"""Paraphrase retrieval benchmark: hit@1 / hit@3 on natural questions, plus correct abstention."""
import argparse,json,sys
from pathlib import Path
from retrieve import retrieve
BASE=Path(__file__).resolve().parents[1]
def run(mode,floor=True,verbose=False):
 cases=[json.loads(l) for l in (BASE/'eval-paraphrase.jsonl').read_text().splitlines() if l.strip()]
 pos=[c for c in cases if 'expected' in c];neg=[c for c in cases if c.get('expect')=='abstain']
 h1=h3=ab=0;misses=[]
 for c in pos:
  r=retrieve(c['query'],3,mode=mode,floor=floor);ids=[x['record']['chunk_id'] for x in r['results']]
  if r['status'] not in ('bounded_reference_evidence','no_supported_reference'):misses.append((c['id'],'ROUTED:'+r['status']));continue
  if ids[:1] and ids[0] in c['expected']:h1+=1
  if any(i in c['expected'] for i in ids):h3+=1
  else:misses.append((c['id'],ids[:1]))
 for c in neg:
  r=retrieve(c['query'],3,mode=mode,floor=floor)
  if not r['results']:ab+=1
  else:misses.append((c['id'],'FALSE HIT '+r['results'][0]['record']['chunk_id']))
 out={'mode':mode,'floor':floor,'positives':len(pos),'hit@1':round(h1/len(pos),3),'hit@3':round(h3/len(pos),3),'abstain_cases':len(neg),'abstain_correct':round(ab/len(neg),3)}
 if verbose:out['misses']=misses
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--mode',default='auto');p.add_argument('--no-floor',action='store_true');p.add_argument('-v',action='store_true');a=p.parse_args()
 print(json.dumps(run(a.mode,not a.no_floor,a.v),indent=1))
