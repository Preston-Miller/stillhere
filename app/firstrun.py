"""AI downloads: the first-run setup and later model switches, with progress the app can show.

The download runs in a background thread so it survives the page being reloaded; the UI polls status().
Ollama resumes partial downloads on its own, so "Try again" after a dropped connection continues where it stopped.

On first run the picked model is saved right away (nothing works without it anyway). When switching later, the
current model keeps answering until the new one has finished downloading, then the setting changes.
"""
import http.client,json,threading,time
from library import OLLAMA,EMBED_MODEL
import models

_lock=threading.Lock()
_job={'state':'idle','model':None,'target':None,'layers':{},'error':None,'started':None}

def installed_names():
 """Set of model names Ollama has, or None if Ollama isn't reachable."""
 try:
  c=http.client.HTTPConnection(*OLLAMA,timeout=3);c.request('GET','/api/tags')
  names={m['name'] for m in json.loads(c.getresponse().read()).get('models',[])};c.close()
 except (OSError,ValueError):return None
 return names

def has(names,m):return m in names or m+':latest' in names

def status():
 names=installed_names()
 chat=models.current()
 need=[EMBED_MODEL,chat]
 have=None if names is None else {m:has(names,m) for m in need}
 with _lock:
  job={k:v for k,v in _job.items() if k!='layers'}
  done=sum(l['completed'] for l in _job['layers'].values());total=sum(l['total'] for l in _job['layers'].values())
 missing=[m for m in need if have is not None and not have[m]]
 size=lambda m:models.BY_MODEL[m]['bytes'] if m in models.BY_MODEL else 639_000_000
 # Until Ollama reports layer sizes, estimate the total from what the job still has to fetch.
 if job['state']=='running':
  todo=[m for m in [EMBED_MODEL,job['target']] if m and names is not None and not has(names,m)]
  total=max(total,sum(size(m) for m in todo))
 ram=models.ram_gb()
 tiers=[{**t,'installed':names is not None and has(names,t['model']),'current':t['model']==chat} for t in models.TIERS]
 return {'ollama':names is not None,'models':have or {},'ready':bool(have) and all(have.values()),
         'missing':missing,'need_bytes':sum(size(m) for m in missing),**job,'done':done,'total':total,
         'chat_model':chat,'chosen':models.chosen() is not None,'tiers':tiers,'ram_gb':ram,'recommended':models.recommended(ram)}

def start(tier=None):
 """Download what's missing. With a tier id, download that model (and switch to it once it's in)."""
 target=models.BY_ID[tier]['model'] if tier in models.BY_ID else models.current()
 with _lock:
  if _job['state']=='running':return False
  _job.update(state='running',model=None,target=target,layers={},error=None,started=time.time())
 # Nothing can answer yet on first run, so the pick takes effect now. Otherwise keep the working model until the new one is in.
 names=installed_names() or set()
 if not has(names,models.current()):models.save(target)
 threading.Thread(target=_run,args=(target,),daemon=True).start()
 return True

def _run(target):
 try:
  names=installed_names()
  if names is None:raise RuntimeError("The AI engine isn't running. Quit Stillhere and open it again.")
  for m in [EMBED_MODEL,target]:   # small one first, so search works as early as possible
   if has(names,m):continue
   with _lock:_job['model']=m
   _pull(m)
  models.save(target)
  with _lock:_job.update(state='done',model=None)
 except Exception as e:
  msg=str(e) if isinstance(e,RuntimeError) else 'The download stopped. Check your internet connection and try again.'
  with _lock:_job.update(state='error',error=msg)

def use(tier):
 """Switch to an already-downloaded model. Returns False if it isn't downloaded."""
 m=models.BY_ID[tier]['model']
 names=installed_names()
 if names is None or not has(names,m):return False
 models.save(m);return True

def remove(tier):
 """Delete a downloaded model that isn't in use, to free disk space."""
 m=models.BY_ID[tier]['model']
 if m==models.current():raise RuntimeError("That's the model Stillhere is using. Switch to another one first.")
 with _lock:
  if _job['state']=='running' and _job['target']==m:raise RuntimeError('That model is still downloading.')
 c=http.client.HTTPConnection(*OLLAMA,timeout=60)
 try:
  c.request('DELETE','/api/delete',json.dumps({'model':m}),{'Content-Type':'application/json'})
  r=c.getresponse();r.read()
  if r.status not in (200,404):raise RuntimeError(f'Could not remove {m} (error {r.status}).')
 finally:c.close()

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
