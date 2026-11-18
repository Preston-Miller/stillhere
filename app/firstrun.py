"""First-run setup: download the AI models through Ollama, with progress the app can show.

The download runs in a background thread so it survives the page being reloaded; the UI polls status().
Ollama resumes partial downloads on its own, so "Try again" after a dropped connection continues where it stopped.
"""
import http.client,json,threading,time
from library import OLLAMA,EMBED_MODEL,CHAT_MODEL

MODELS=[EMBED_MODEL,CHAT_MODEL]   # small one first, so search works as early as possible
APPROX_BYTES={EMBED_MODEL:639_000_000,CHAT_MODEL:6_600_000_000}   # shown before Ollama reports real sizes
_lock=threading.Lock()
_job={'state':'idle','model':None,'layers':{},'error':None,'started':None}

def installed():
 """{model: True/False}, or None if Ollama isn't reachable."""
 try:
  c=http.client.HTTPConnection(*OLLAMA,timeout=3);c.request('GET','/api/tags')
  names={m['name'] for m in json.loads(c.getresponse().read()).get('models',[])};c.close()
 except (OSError,ValueError):return None
 return {m:(m in names or m+':latest' in names) for m in MODELS}

def status():
 have=installed()
 with _lock:
  job={k:v for k,v in _job.items() if k!='layers'}
  done=sum(l['completed'] for l in _job['layers'].values());total=sum(l['total'] for l in _job['layers'].values())
 missing=[m for m in MODELS if have is not None and not have[m]]
 # Until Ollama reports layer sizes, estimate the total from the models still to fetch.
 total=max(total,sum(APPROX_BYTES[m] for m in missing)) if job['state']=='running' else total
 return {'ollama':have is not None,'models':have or {},'ready':bool(have) and all(have.values()),
         'missing':missing,'need_bytes':sum(APPROX_BYTES[m] for m in missing),**job,'done':done,'total':total}

def start():
 with _lock:
  if _job['state']=='running':return False
  _job.update(state='running',model=None,layers={},error=None,started=time.time())
 threading.Thread(target=_run,daemon=True).start()
 return True

def _run():
 try:
  have=installed()
  if have is None:raise RuntimeError("The AI engine isn't running. Quit Stillhere and open it again.")
  for m in MODELS:
   if have.get(m):continue
   with _lock:_job['model']=m
   _pull(m)
  with _lock:_job.update(state='done',model=None)
 except Exception as e:
  msg=str(e) if isinstance(e,RuntimeError) else 'The download stopped. Check your internet connection and try again.'
  with _lock:_job.update(state='error',error=msg)

def _pull(model):
 c=http.client.HTTPConnection(*OLLAMA,timeout=120)
 try:
  c.request('POST','/api/pull',json.dumps({'model':model,'stream':True}),{'Content-Type':'application/json'})
  r=c.getresponse()
  if r.status!=200:raise RuntimeError(f'Could not download {model} (error {r.status}). Check your internet connection and try again.')
  for raw in r:
   if not raw.strip():continue
   ev=json.loads(raw)
   if ev.get('error'):raise RuntimeError('The download stopped: '+ev['error'])
   if ev.get('digest') and ev.get('total'):
    with _lock:_job['layers'][ev['digest']]={'total':ev['total'],'completed':ev.get('completed',0)}
   if ev.get('status')=='success':return
  raise OSError('stream ended early')
 finally:c.close()
