#!/usr/bin/env python3
"""Session/retrieval regression tests; no model server or network required."""
import json
from conversation import ConversationState
import ask

def ids(records):return [r['chunk_id'] for r in records]
def validate():
 checks=[];state=ConversationState()
 def select(q):
  state.update(q);result,records,_=ask.evidence_for(q,state=state);return result,records
 _,records=select('I have some cloudy water, what are some ways I could purify it?')
 assert len(records)==3 and any('boiling' in r['chunk_id'] for r in records) and any('2-bleach' in r['chunk_id'] for r in records) and any('other-treatment' in r['chunk_id'] for r in records);checks.append('broad method question gets a method bundle')
 _,records=select("I don't have any bleach, any other options?")
 assert state.target=='drinking_water' and state.water_condition=='cloudy' and 'bleach' in state.unavailable
 assert any('boiling' in r['chunk_id'] for r in records) and not any('2-bleach' in r['chunk_id'] for r in records);checks.append('no-bleach follow-up retains purpose and excludes bleach procedure')
 result,records=select('drinking water')
 assert result['status']=='bounded_reference_evidence' and any('boiling' in r['chunk_id'] for r in records) and not any('2-bleach' in r['chunk_id'] for r in records);checks.append('short purpose reply retains supply constraint')
 _,records=select("I can't boil it either, no fuel")
 assert 'boiling' in state.unavailable and not any('boiling' in r['chunk_id'] or '2-bleach' in r['chunk_id'] for r in records);checks.append('no-fuel excludes boiling too')
 _,records=select('I now have bleach, how much for drinking water?')
 assert 'bleach' not in state.unavailable and any('2-bleach' in r['chunk_id'] for r in records);checks.append('explicit availability change updates supply state')
 _,records=select('Where should I put a generator?')
 assert state.topic=='generator' and not state.unavailable and records[0]['chunk_id']=='offgrid.05-power.prevent-carbon-monoxide-poisoning';checks.append('topic change clears water constraints')
 _,records=select('How far from windows?')
 assert records[0]['chunk_id']=='offgrid.05-power.prevent-carbon-monoxide-poisoning';checks.append('non-water follow-up retains topic')
 state.reset();assert state.snapshot()['topic'] is None and not state.unavailable;checks.append('explicit reset clears session')
 result,_=select("I don't have bleach")
 assert result['status']=='clarify_treatment_target';checks.append('fresh ambiguous query still asks purpose')
 result,_=select('I need to sanitize an empty water container')
 assert result['status']=='constraints_not_supported';checks.append('container change cannot erase missing bleach')
 # No generation may occur for a clinical request even during a water conversation.
 original=ask.post
 ask.post=lambda *a,**k: (_ for _ in ()).throw(AssertionError('Unexpected model request'))
 try:
  r=ask.answer('seizure five minutes',state=state);assert not r['model_called'];checks.append('clinical gate still prevents generation')
 finally:ask.post=original
 return {'result':'passed','checks':checks,'live_model_used':False}
if __name__=='__main__':print(json.dumps(validate(),indent=2))
