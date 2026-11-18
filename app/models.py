"""Which chat model Stillhere uses. Buyers pick a size on first run and can switch later.

The choice is saved in DATA/settings.json. Installs from before the picker have no setting and keep the
9B model they already downloaded (DEFAULT).
"""
import ctypes,json,os,sys,threading
from paths import DATA

# Sizes are what Ollama's registry reports (2026-11-18), used for estimates until a download reports real ones.
TIERS=[
 {'id':'small','model':'qwen3.5:4b','name':'Small','bytes':3_320_000_000,'ram_gb':8,
  'blurb':'Fastest, and runs on almost any computer. Answers are shorter and a little less careful.'},
 {'id':'standard','model':'qwen3.5:9b','name':'Standard','bytes':6_550_000_000,'ram_gb':16,
  'blurb':'The best balance of speed and answer quality.'},
 {'id':'large','model':'qwen3.5:27b','name':'Large','bytes':17_480_000_000,'ram_gb':32,
  'blurb':'The most careful answers. Slower, and needs a powerful computer.'},
]
BY_ID={t['id']:t for t in TIERS}
BY_MODEL={t['model']:t for t in TIERS}
DEFAULT='qwen3.5:9b'
SETTINGS=DATA/'settings.json'
_lock=threading.Lock()

def _read():
 try:return json.loads(SETTINGS.read_text())
 except (OSError,ValueError):return {}

def chosen():
 """The saved chat model, or None if the buyer hasn't picked one yet."""
 m=_read().get('chat_model')
 return m if m in BY_MODEL else None

def current():
 return chosen() or DEFAULT

def save(model):
 if model not in BY_MODEL:raise ValueError('unknown model '+str(model))
 with _lock:
  s=_read();s['chat_model']=model
  tmp=SETTINGS.with_suffix('.tmp');tmp.write_text(json.dumps(s,indent=1));os.replace(tmp,SETTINGS)

def ram_gb():
 """Total memory in GB, or None if it can't be read."""
 try:
  if sys.platform=='win32':
   class M(ctypes.Structure):
    _fields_=[('dwLength',ctypes.c_ulong),('dwMemoryLoad',ctypes.c_ulong),('ullTotalPhys',ctypes.c_ulonglong),
              ('ullAvailPhys',ctypes.c_ulonglong),('ullTotalPageFile',ctypes.c_ulonglong),('ullAvailPageFile',ctypes.c_ulonglong),
              ('ullTotalVirtual',ctypes.c_ulonglong),('ullAvailVirtual',ctypes.c_ulonglong),('ullAvailExtendedVirtual',ctypes.c_ulonglong)]
   m=M();m.dwLength=ctypes.sizeof(M)
   if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m)):return None
   return round(m.ullTotalPhys/2**30)
  return round(os.sysconf('SC_PAGE_SIZE')*os.sysconf('SC_PHYS_PAGES')/2**30)
 except (OSError,ValueError,AttributeError):return None

def recommended(ram):
 """The tier to suggest for this much memory. Large only when there's plenty to spare, since it's much slower."""
 if ram is None:return 'standard'
 if ram>=48:return 'large'
 if ram>=16:return 'standard'
 return 'small'
