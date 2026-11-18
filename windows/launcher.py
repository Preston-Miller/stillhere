"""Stillhere for Windows: a native window around the local app. The Windows counterpart of desktop/Stillhere.swift.

On launch it:
  1. starts Ollama (the AI engine) on 127.0.0.1, with models in %LOCALAPPDATA%\\Stillhere\\models,
     inside a Windows job object so Ollama and its runners die with this process, even on a crash;
  2. runs the Stillhere server (app/server.py) on a thread in this same process;
  3. shows the app in an Edge WebView2 window (pywebview). Closing the window stops everything.

Layouts:
  installed  <install dir>\\Stillhere.exe (PyInstaller) with ollama\\ and library\\ next to it (see stillhere.iss)
  dev        python windows/launcher.py from the repository: uses app/, app/data/library.sqlite and an `ollama`
             on PATH (or OLLAMA_EXE). Works on macOS too, which is how the startup logic was first tested.

  --headless  start Ollama and the server without a window and wait (for automated tests)
"""
import ctypes,json,os,random,socket,subprocess,sys,threading,time,urllib.request
from pathlib import Path

APP_NAME='Stillhere'        # data folder name in %LOCALAPPDATA%; keep it so updates find existing data
DISPLAY_NAME='stillhere'    # the name people see (window, messages)
SERVER_PORT=47821   # fixed when free, so the page origin (and the settings it saves) stays the same between launches
OLLAMA_PORT=47831
WIN=sys.platform=='win32'
FROZEN=getattr(sys,'frozen',False)

# ---------- paths ----------

def data_dir():
 if WIN:return Path(os.environ.get('LOCALAPPDATA') or Path.home()/'AppData'/'Local')/APP_NAME
 return Path(os.environ.get('STILLHERE_DATA') or Path.home()/'.stillhere-dev')

def layout():
 """(resources dir, library.sqlite, ollama executable, app code dir or None when frozen)."""
 if FROZEN:
  base=Path(sys.executable).resolve().parent
  return base/'library',base/'library'/'library.sqlite',base/'ollama'/'ollama.exe',None
 repo=Path(__file__).resolve().parent.parent
 exe=os.environ.get('OLLAMA_EXE') or ('ollama.exe' if WIN else 'ollama')
 return repo,repo/'app'/'data'/'library.sqlite',Path(exe),repo/'app'

def config():
 """Settings baked in at build time (windows/build.ps1 writes config.json next to the exe)."""
 base=Path(sys.executable).resolve().parent if FROZEN else Path(__file__).resolve().parent
 try:return json.loads((base/'config.json').read_text())
 except (OSError,ValueError):return {}

# ---------- ports ----------

def can_bind(port):
 s=socket.socket(socket.AF_INET,socket.SOCK_STREAM)
 try:s.bind(('127.0.0.1',port));return True
 except OSError:return False
 finally:s.close()

def pick_port(preferred,avoid=()):
 for p in range(preferred,preferred+9):
  if p not in avoid and can_bind(p):return p
 for _ in range(200):
  p=random.randint(49152,65000)
  if p not in avoid and can_bind(p):return p
 return preferred

# ---------- Windows helpers ----------

def single_instance():
 """True if this is the only copy running. A second launch just tells the person it's already open."""
 if not WIN:return True
 k=ctypes.windll.kernel32
 single_instance.handle=k.CreateMutexW(None,False,'Local\\StillhereSingleInstance')
 return k.GetLastError()!=183   # ERROR_ALREADY_EXISTS

def message(title,text):
 if WIN:ctypes.windll.user32.MessageBoxW(None,text,title,0x40)   # MB_ICONINFORMATION
 else:print(f'{title}: {text}',file=sys.stderr)

def kill_with_us(proc):
 """Put proc in a job object that Windows closes when this process exits, killing proc and anything it started."""
 if not WIN:return
 from ctypes import wintypes as w
 class BASIC(ctypes.Structure):
  _fields_=[('PerProcessUserTimeLimit',ctypes.c_int64),('PerJobUserTimeLimit',ctypes.c_int64),('LimitFlags',w.DWORD),
            ('MinimumWorkingSetSize',ctypes.c_size_t),('MaximumWorkingSetSize',ctypes.c_size_t),('ActiveProcessLimit',w.DWORD),
            ('Affinity',ctypes.c_size_t),('PriorityClass',w.DWORD),('SchedulingClass',w.DWORD)]
 class IO(ctypes.Structure):
  _fields_=[(n,ctypes.c_uint64) for n in ('R','W','O','RB','WB','OB')]
 class EXT(ctypes.Structure):
  _fields_=[('Basic',BASIC),('Io',IO),('ProcessMemoryLimit',ctypes.c_size_t),('JobMemoryLimit',ctypes.c_size_t),
            ('PeakProcessMemoryUsed',ctypes.c_size_t),('PeakJobMemoryUsed',ctypes.c_size_t)]
 k=ctypes.windll.kernel32
 k.CreateJobObjectW.restype=w.HANDLE
 job=k.CreateJobObjectW(None,None)
 info=EXT();info.Basic.LimitFlags=0x2000   # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
 k.SetInformationJobObject(job,9,ctypes.byref(info),ctypes.sizeof(info))   # JobObjectExtendedLimitInformation
 k.AssignProcessToJobObject(job,w.HANDLE(int(proc._handle)))
 kill_with_us.job=job   # keep the handle open for our lifetime; Windows closes it when we exit

# ---------- helpers ----------

class Helpers:
 def __init__(s):s.ollama=None;s.httpd=None

 def start(s,ollama_port,server_port):
  res,lib,ollama_exe,code=layout()
  data=data_dir();logs=data/'logs';models_dir=data/'models'
  logs.mkdir(parents=True,exist_ok=True);models_dir.mkdir(parents=True,exist_ok=True)

  env=dict(os.environ,OLLAMA_HOST=f'127.0.0.1:{ollama_port}',OLLAMA_MODELS=str(models_dir),
           OLLAMA_NOPRUNE='1',OLLAMA_NO_CLOUD='1')   # local models only; nothing leaves the computer
  log=open(logs/'ollama.log','w',encoding='utf-8',errors='replace')
  s.ollama=subprocess.Popen([str(ollama_exe),'serve'],env=env,stdout=log,stderr=subprocess.STDOUT,stdin=subprocess.DEVNULL,
                            creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
  kill_with_us(s.ollama)

  # The server reads these at import time (paths.py), so set them before importing it.
  os.environ.update(STILLHERE_DATA=str(data),STILLHERE_RESOURCES=str(res),STILLHERE_LIBRARY=str(lib),
                    STILLHERE_OLLAMA=f'127.0.0.1:{ollama_port}')
  maps=config().get('maps_source')
  if maps:os.environ['OFFGRID_MAPS_SOURCE']=maps
  if code:sys.path.insert(0,str(code))
  # A windowed exe has no console: send the server's prints and tracebacks to a log instead of nowhere.
  if FROZEN or WIN:
   out=open(logs/'server.log','w',encoding='utf-8',errors='replace',buffering=1)
   sys.stdout=sys.stderr=out
  sys.argv=[sys.argv[0],str(server_port)]
  import server   # noqa: E402  (app/server.py)
  from http.server import ThreadingHTTPServer
  s.httpd=ThreadingHTTPServer(('127.0.0.1',server_port),server.Handler)
  print(f'stillhere on http://127.0.0.1:{server_port}  (Ollama on {ollama_port})',flush=True)
  threading.Thread(target=s.httpd.serve_forever,daemon=True).start()

 def stop(s):
  if s.httpd:
   try:s.httpd.shutdown()
   except Exception:pass
  if s.ollama and s.ollama.poll() is None:
   s.ollama.terminate()
   try:s.ollama.wait(3)
   except subprocess.TimeoutExpired:s.ollama.kill()

def wait_for(url,seconds):
 deadline=time.time()+seconds
 while time.time()<deadline:
  try:
   with urllib.request.urlopen(url,timeout=2) as r:
    if r.status==200:return True
  except OSError:pass
  time.sleep(0.25)
 return False

# ---------- pages shown before the app is up ----------

LOGO='<svg viewBox="0 0 330 165" width="120"><path d="M18 138 L165 20 L312 138" fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><circle cx="165" cy="128" r="36" fill="#f4a12c"/></svg>'
def notice(title,body):
 return f'''<!doctype html><meta charset="utf-8"><style>
 :root{{color-scheme:light dark;--bg:#f6f5f1;--ink:#1d1f1c;--muted:#6a6d66}}
 @media (prefers-color-scheme:dark){{:root{{--bg:#151714;--ink:#e7e8e3;--muted:#9a9e95}}}}
 html,body{{height:100%;margin:0}}body{{background:var(--bg);color:var(--ink);font:15px/1.5 "Segoe UI",system-ui,sans-serif;
 display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 32px;user-select:none;cursor:default}}
 h1{{font-size:19px;margin:22px 0 6px}}p{{color:var(--muted);margin:0;max-width:440px}}
 </style><body>{LOGO}<h1>{title}</h1><p>{body}</p></body>'''

# ---------- main ----------

def main():
 headless='--headless' in sys.argv
 if not single_instance():
  message(DISPLAY_NAME,'stillhere is already open. Look for its window on the taskbar.');return
 data=data_dir()
 try:data.mkdir(parents=True,exist_ok=True)
 except OSError:
  message(DISPLAY_NAME,"stillhere can't save its data: Windows didn't allow creating its folder in AppData.");return
 helpers=Helpers()
 ollama_port=pick_port(OLLAMA_PORT);server_port=pick_port(SERVER_PORT,{ollama_port})
 app_url=f'http://127.0.0.1:{server_port}/'

 def boot(window=None):
  show=(lambda t,b:window.load_html(notice(t,b))) if window else (lambda t,b:print(f'{t}: {b}',flush=True))
  try:helpers.start(ollama_port,server_port)
  except Exception as e:
   import traceback;traceback.print_exc()
   return show("stillhere couldn't start",f'{type(e).__name__}: {e}. The details are in the logs folder inside {data}.')
  # Ollama's first answer can take several seconds (finding the graphics card). Waiting keeps the page from
  # flashing "AI isn't running" on a normal start; if it never answers, the page says so itself.
  wait_for(f'http://127.0.0.1:{ollama_port}/api/version',45)
  if not wait_for(app_url+'index.html',90):
   return show('stillhere is taking too long to start','Close stillhere and open it again.')
  if window:window.load_url(app_url)
  else:print('READY '+app_url,flush=True)

 try:
  if headless:
   boot()
   try:
    while True:time.sleep(1)
   except KeyboardInterrupt:pass
   return
  import webview
  webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER']=True   # sources and licences open in the default browser
  webview.settings['ALLOW_DOWNLOADS']=True
  window=webview.create_window(DISPLAY_NAME,html=notice('Starting stillhere…','Getting the AI ready. This can take up to half a minute.'),
                               width=1240,height=820,min_size=(720,520),background_color='#151714',text_select=True)
  # private_mode=False keeps the page's saved settings (localStorage) between launches.
  webview.start(boot,window,private_mode=False,storage_path=str(data/'webview'),debug='--debug' in sys.argv)
 finally:
  helpers.stop()

if __name__=='__main__':
 main()
