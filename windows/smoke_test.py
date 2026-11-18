"""Automated check of a Windows build, run by .github/workflows/windows.yml after windows/build.ps1.

  1. headless: start Stillhere.exe --headless, download the Small model through the app's own setup API,
     ask a real question, and time the answer (the GitHub runner has no graphics card, so this is the
     slow, processor-only case: the worst a buyer would see with Small);
  2. window: start Stillhere.exe normally, wait until the app answers, take a screenshot, and check it stays up.

Uses a throwaway LOCALAPPDATA so it never touches a real install. Exits non-zero on failure.
  python windows/smoke_test.py build\\win\\Stillhere\\Stillhere.exe <data dir> <screenshot.png>
"""
import json,os,subprocess,sys,time,urllib.request
from pathlib import Path

EXE,DATA,SHOT=sys.argv[1],Path(sys.argv[2]),sys.argv[3]
BASE='http://127.0.0.1:47821'
QUESTION='Can I run my generator in the garage with the door open?'
env=dict(os.environ,LOCALAPPDATA=str(DATA))

def get(path,timeout=10):
 with urllib.request.urlopen(BASE+path,timeout=timeout) as r:return json.loads(r.read())
def post(path,body,timeout=30):
 req=urllib.request.Request(BASE+path,json.dumps(body).encode(),{'Content-Type':'application/json'})
 return urllib.request.urlopen(req,timeout=timeout)
def wait(cond,seconds,what):
 end=time.time()+seconds
 while time.time()<end:
  try:
   v=cond()
   if v:return v
  except OSError:pass
  time.sleep(2)
 raise SystemExit(f'FAIL: timed out waiting for {what}')
def stop(p):
 subprocess.run(['taskkill','/F','/T','/PID',str(p.pid)],capture_output=True);time.sleep(3)
def logs():
 for name in ('server.log','ollama.log'):
  f=DATA/'Stillhere'/'logs'/name
  if f.exists():
   print(f'----- {name} (last 40 lines) -----');print('\n'.join(f.read_text(errors='replace').splitlines()[-40:]))

print('== 1. headless: setup, download Small, ask a question')
p=subprocess.Popen([EXE,'--headless'],env=env)
try:
 t0=time.time()
 st=wait(lambda:(lambda s:s if s['ollama'] else None)(get('/api/setup')),120,'the app and its AI engine')
 print(f"started in {time.time()-t0:.0f}s · RAM {st['ram_gb']} GB · recommended: {st['recommended']} · ready: {st['ready']}")
 if not st['ready']:
  post('/api/setup/start',{'tier':'small'}).read()
  t1=time.time();last=0
  def done():
   global last
   s=get('/api/setup')
   if s['state']=='error':raise SystemExit('FAIL: download error: '+str(s['error']))
   if time.time()-last>60:last=time.time();print(f"  downloading {s.get('model')}: {s['done']/1e9:.1f} of {s['total']/1e9:.1f} GB")
   return s['ready'] and s
  st=wait(done,45*60,'the model download')
  print(f'downloaded in {time.time()-t1:.0f}s')
 h=get('/api/health');print('health:',h)
 if h['chat_model']!='qwen3.5:4b' and not h['chat_model_installed']:raise SystemExit('FAIL: chat model not installed')
 t2=time.time();answer='';first=None;stats={}
 with post('/api/chat',{'messages':[{'role':'user','content':QUESTION}]},timeout=1800) as r:
  for raw in r:
   ev=json.loads(raw)
   if ev.get('type')=='token':
    answer+=ev.get('text') or ev.get('content') or ''
    if first is None:first=time.time()-t2
   elif ev.get('type')=='done':stats=ev.get('stats',{})
   elif ev.get('type')=='error':raise SystemExit('FAIL: chat error: '+json.dumps(ev))
 print(f'answer: first words after {first or 0:.0f}s, finished after {time.time()-t2:.0f}s · {stats}')
 print(answer[:800])
 if len(answer)<80:raise SystemExit('FAIL: answer too short')
 if '[1]' not in answer and '[2]' not in answer:print('WARNING: no citations in the answer')
finally:
 logs();stop(p)

print('== 2. window: open the app normally')
p=subprocess.Popen([EXE],env=env)
try:
 wait(lambda:get('/api/health').get('chunks'),120,'the app window to start its server')
 time.sleep(15)   # let the window load the page
 if p.poll() is not None:raise SystemExit(f'FAIL: Stillhere.exe exited with code {p.returncode}')
 try:
  from PIL import ImageGrab
  ImageGrab.grab().save(SHOT);print('screenshot:',SHOT)
 except Exception as e:print('screenshot failed:',e)
 print('window: still running after 15 s')
finally:
 logs();stop(p)
print('PASS')
