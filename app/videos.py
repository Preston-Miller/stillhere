"""Your videos: video files the user adds (MP4/MOV), kept on this computer and played offline in the app.

Files live in data/user/videos/<id>/<name>; the list is data/user/videos/videos.json.
In the Mac app, data/ is ~/Library/Application Support/Stillhere (see paths.py).
"""
import json,os,re,shutil,threading,time,uuid
from pathlib import Path

from paths import DATA
DIR=DATA/'user'/'videos'
INDEX=DIR/'videos.json'
TYPES={'.mp4':'video/mp4','.m4v':'video/mp4','.mov':'video/quicktime'}   # what the Mac's built-in player handles
MAX_BYTES=20*1024**3
lock=threading.Lock()

class VideoError(Exception):
 """A problem the user should see, worded for them."""

def _read():
 try:return json.loads(INDEX.read_text())
 except (OSError,ValueError):return []

def _write(items):
 tmp=INDEX.with_suffix('.tmp');tmp.write_text(json.dumps(items,ensure_ascii=False,indent=1));os.replace(tmp,INDEX)

def title_from(name):
 t=re.sub(r'[-_]+',' ',Path(name).stem).strip()
 return t[:1].upper()+t[1:] if t else 'Untitled video'

def list_videos():
 with lock:return sorted(_read(),key=lambda v:-v['added'])

def add(name,length,stream):
 """Copy `length` bytes from `stream` into the library. Returns the new entry."""
 name=Path(name).name.strip() or 'video.mp4'
 ext=Path(name).suffix.lower()
 if ext not in TYPES:raise VideoError(f'{name}: only MP4 and MOV videos can be added. Other formats (like MKV or AVI) need converting first.')
 if length<=0:raise VideoError(f'{name} is empty.')
 if length>MAX_BYTES:raise VideoError(f'{name} is larger than {MAX_BYTES//1024**3} GB.')
 DIR.mkdir(parents=True,exist_ok=True)
 free=shutil.disk_usage(DIR).free
 if length>free-2*1024**3:raise VideoError(f'Not enough free space on this Mac for {name}.')
 vid=time.strftime('%Y%m%d%H%M%S')+'-'+uuid.uuid4().hex[:6]
 safe=re.sub(r'[^\w.\- ()]+','_',name)[:120]
 folder=DIR/vid;folder.mkdir();part=folder/(safe+'.part')
 try:
  left=length
  with part.open('wb') as f:
   while left>0:
    chunk=stream.read(min(1<<20,left))
    if not chunk:raise VideoError(f'The upload of {name} stopped before it finished.')
    f.write(chunk);left-=len(chunk)
  part.rename(folder/safe)
 except BaseException:
  part.unlink(missing_ok=True)
  try:folder.rmdir()
  except OSError:pass
  raise
 entry={'id':vid,'title':title_from(name),'file':safe,'path':f'{vid}/{safe}','bytes':length,'type':TYPES[ext],'added':time.time()}
 with lock:items=_read();items.append(entry);_write(items)
 return entry

def rename(vid,title):
 title=str(title).strip()[:150]
 if not title:return None
 with lock:
  items=_read()
  for v in items:
   if v['id']==vid:v['title']=title;_write(items);return v
 return None

def remove(vid):
 with lock:
  items=_read();keep=[v for v in items if v['id']!=vid]
  if len(keep)==len(items):return False
  _write(keep)
 folder=(DIR/vid).resolve()
 if folder.is_dir() and folder.parent==DIR.resolve():shutil.rmtree(folder)
 return True

def file(rel):
 target=(DIR/rel).resolve()
 return target if target.is_file() and target.is_relative_to(DIR.resolve()) and target.name!='videos.json' else None
