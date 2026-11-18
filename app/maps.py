"""Offline maps: serve vector tiles from per-state PMTiles files and manage which states are installed.

Standard library only. Each installed state is one .pmtiles file (PMTiles v3, gzip-compressed directories
and tiles, as produced by the Protomaps basemap). Tiles are looked up across all installed states; border
tiles exist in both neighbors and are identical because every state is cut from the same world build.
"""
import gzip,hashlib,json,math,os,re,shutil,sqlite3,struct,threading,time,urllib.request
from pathlib import Path

APP=Path(__file__).resolve().parent
from paths import DATA
MAP_DIR=DATA/'maps'
# Where state files are downloaded from: a folder (development) or an https base URL (the public R2 bucket).
MAPS_SOURCE=os.environ.get('OFFGRID_MAPS_SOURCE',str(APP.parent/'maps-build'/'out'))

# ---------------- PMTiles v3 reader ----------------
def _varint(buf,pos):
 shift=result=0
 while True:
  b=buf[pos];pos+=1;result|=(b&0x7f)<<shift
  if b<0x80:return result,pos
  shift+=7

def _rotate(n,x,y,rx,ry):
 if ry==0:
  if rx==1:x,y=n-1-x,n-1-y
  x,y=y,x
 return x,y

def zxy_to_tileid(z,x,y):
 """Hilbert-curve tile id used by PMTiles v3."""
 acc=((1<<(2*z))-1)//3
 n=1<<z;d=0;s=n>>1
 while s>0:
  rx=1 if x&s else 0;ry=1 if y&s else 0
  d+=s*s*((3*rx)^ry)
  x,y=_rotate(n,x,y,rx,ry)
  s>>=1
 return acc+d

class PMTiles:
 def __init__(self,path):
  self.path=Path(path);self.fd=os.open(self.path,os.O_RDONLY)   # os.pread is safe across server threads
  h=os.pread(self.fd,127,0)
  if h[:7]!=b'PMTiles' or h[7]!=3:raise ValueError(f'{path} is not a PMTiles v3 file')
  (self.root_off,self.root_len,self.meta_off,self.meta_len,self.leaf_off,self.leaf_len,self.data_off,self.data_len)=struct.unpack_from('<8Q',h,8)
  self.internal_comp,self.tile_comp,self.tile_type,self.minzoom,self.maxzoom=h[97],h[98],h[99],h[100],h[101]
  minlon,minlat,maxlon,maxlat=struct.unpack_from('<4i',h,102)
  self.bounds=[minlon/1e7,minlat/1e7,maxlon/1e7,maxlat/1e7]
  if self.internal_comp not in (1,2) or self.tile_comp not in (1,2):raise ValueError('Only uncompressed or gzip PMTiles are supported')
  self._dirs={};self._lock=threading.Lock()

 def close(self):
  try:os.close(self.fd)
  except OSError:pass

 def _read(self,off,length):return os.pread(self.fd,length,off)

 def _dir(self,off,length):
  key=(off,length)
  with self._lock:
   if key in self._dirs:return self._dirs[key]
  raw=self._read(off,length)
  if self.internal_comp==2:raw=gzip.decompress(raw)
  n,p=_varint(raw,0);ids=[];last=0
  for _ in range(n):v,p=_varint(raw,p);last+=v;ids.append(last)
  runs=[];lens=[];offs=[]
  for _ in range(n):v,p=_varint(raw,p);runs.append(v)
  for _ in range(n):v,p=_varint(raw,p);lens.append(v)
  for i in range(n):
   v,p=_varint(raw,p)
   offs.append(offs[i-1]+lens[i-1] if v==0 and i>0 else v-1)
  entries=(ids,runs,lens,offs)
  with self._lock:
   if len(self._dirs)>256:self._dirs.clear()   # crude bound on cached leaf directories
   self._dirs[key]=entries
  return entries

 def tile(self,z,x,y):
  """Raw tile bytes (still gzip-compressed if the archive compresses tiles), or None."""
  if not (self.minzoom<=z<=self.maxzoom):return None
  tid=zxy_to_tileid(z,x,y);off,length=self.root_off,self.root_len
  for _ in range(4):   # root + up to 3 levels of leaf directories
   ids,runs,lens,offs=self._dir(off,length)
   lo,hi=0,len(ids)-1;i=-1
   while lo<=hi:
    mid=(lo+hi)//2
    if ids[mid]<=tid:i=mid;lo=mid+1
    else:hi=mid-1
   if i<0:return None
   if runs[i]==0:off,length=self.leaf_off+offs[i],lens[i];continue
   if tid<ids[i]+runs[i]:return self._read(self.data_off+offs[i],lens[i])
   return None
  return None

# Long features that show up as several search entries; their duplicates merge over larger distances.
LINEAR={**{k:'water' for k in ('River','Stream','Water','Lake','Reservoir','Canal','Ditch')},
        **{k:'road' for k in ('Street','Road','Highway','Trail','Pedestrian','Track','Footway','Cycleway','Service')}}

# ---------------- installed states ----------------
class MapStore:
 def __init__(self):
  MAP_DIR.mkdir(parents=True,exist_ok=True)
  self.archives={};self.lock=threading.Lock();self.jobs={}
  self.reload()

 def reload(self):
  found={}
  for p in sorted(MAP_DIR.glob('*.pmtiles')):
   try:found[p.stem]=PMTiles(p)
   except (OSError,ValueError) as e:print('Skipping map file',p.name,e)
  with self.lock:old,self.archives=self.archives,found
  for a in old.values():a.close()

 def tile(self,z,x,y):
  with self.lock:archives=list(self.archives.values())
  for a in archives:
   t=a.tile(z,x,y)
   if t:return t,a.tile_comp==2
  return None,False

 def installed(self):
  with self.lock:items=list(self.archives.items())
  return {code:{'bytes':a.path.stat().st_size,'bounds':a.bounds,'maxzoom':a.maxzoom,'search':(MAP_DIR/f'{code}.search.sqlite').exists()} for code,a in items}

 # ---- offline place search (index built by maps-build/make_search.py) ----
 def search(self,q,lon=None,lat=None,limit=8):
  toks=re.findall(r'\w+',q.lower())[:6]
  if not toks:return []
  match=' '.join(f'"{t}"*' for t in toks);ql=' '.join(toks)
  with self.lock:codes=list(self.archives)
  rows=[]
  for code in codes:
   p=MAP_DIR/f'{code}.search.sqlite'
   if not p.exists():continue
   con=sqlite3.connect(f'file:{p}?mode=ro',uri=True)
   cols='f.id,f.name,f.label,f.town,f.lon,f.lat,f.weight'
   # Three pulls, merged: best overall, anything near the map center, and exact name matches anywhere.
   # A common name like "Main Street" has thousands of entries, so "best overall" alone misses the local one.
   pulls=[(f'SELECT {cols} FROM fts JOIN f ON f.id=fts.rowid WHERE fts MATCH ? ORDER BY f.weight DESC LIMIT 1000',(match,)),
          (f'SELECT {cols} FROM f WHERE name=? COLLATE NOCASE LIMIT 2000',(q.strip(),))]
   if lon is not None and lat is not None:
    pulls.append((f'SELECT {cols} FROM fts JOIN f ON f.id=fts.rowid WHERE fts MATCH ? AND f.lat BETWEEN ? AND ? AND f.lon BETWEEN ? AND ? LIMIT 3000',(match,lat-.6,lat+.6,lon-.8,lon+.8)))
   seen=set()
   try:
    for sql,args in pulls:
     for i,name,label,town,x,y,w in con.execute(sql,args):
      if i in seen:continue
      seen.add(i);rows.append((name,label,town,x,y,w,code))
   except sqlite3.OperationalError:pass
   finally:con.close()
  def dist(x,y,x2,y2):return math.hypot((x2-x)*math.cos(math.radians((y+y2)/2)),y2-y)*111.2
  scored=[]
  for name,label,town,x,y,w,code in rows:
   n=' '.join(re.findall(r'\w+',name.lower()))
   s=w+(40 if n==ql else 5 if n.startswith(ql) else 0)
   if all(any(t.startswith(q) for t in label.lower().split()) for q in toks):s+=25   # "hospital", "gas station": nearest of that kind
   if lon is not None and lat is not None:s-=12*math.log10(1+dist(lon,lat,x,y))   # nearby first
   scored.append((s,name,label,town,x,y,code))
  scored.sort(key=lambda r:-r[0]);out=[]
  for s,name,label,town,x,y,code in scored:
   # The same thing seen twice: one spot tagged two ways, or a long river/road crossing several tiles.
   cls=LINEAR.get(label)
   if any(o['name'].lower()==name.lower() and (dist(o['lon'],o['lat'],x,y)<2 or
          (cls=='water' and o['cls']=='water' and dist(o['lon'],o['lat'],x,y)<30) or
          (cls=='road' and o['cls']=='road' and o['town']==town and dist(o['lon'],o['lat'],x,y)<15)) for o in out):continue
   out.append({'name':name,'label':label,'town':town,'state':code,'lon':round(x,6),'lat':round(y,6),'cls':cls})
   if len(out)>=limit:break
  return out

 # ---- catalog and downloads ----
 def _open(self,name):
  src=MAPS_SOURCE.rstrip('/')
  if src.startswith(('http://','https://')):
   req=urllib.request.Request(src+'/'+name,headers={'User-Agent':'Stillhere/1.0 (offline maps)'})   # Cloudflare may refuse Python's default agent
   r=urllib.request.urlopen(req,timeout=30);return r,int(r.headers.get('Content-Length') or 0)
  p=Path(src)/name;return p.open('rb'),p.stat().st_size

 def catalog(self):
  f,_=self._open('catalog.json')
  with f:return json.loads(f.read())

 def install(self,code):
  code=code.upper()
  with self.lock:
   if self.jobs.get(code,{}).get('state')=='downloading':return
   self.jobs[code]={'state':'downloading','done':0,'total':0}
  threading.Thread(target=self._download,args=(code,),daemon=True).start()

 def _fetch(self,name,sha,dest,job):
  part=dest.with_name(dest.name+'.part');h=hashlib.sha256()
  try:
   src,_=self._open(name)
   with src,part.open('wb') as out:
    while chunk:=src.read(1<<20):
     out.write(chunk);h.update(chunk);job['done']+=len(chunk)
   if h.hexdigest()!=sha:raise ValueError('download was corrupted (checksum mismatch); try again')
   os.replace(part,dest)
  finally:part.unlink(missing_ok=True)

 def _download(self,code):
  job=self.jobs[code]
  try:
   entry=next((s for s in self.catalog()['states'] if s['code']==code),None)
   if not entry:raise ValueError('not in catalog')
   search=entry.get('search')
   job['total']=entry['bytes']+(search['bytes'] if search else 0)
   # Search index first, so the map never appears without it.
   if search:self._fetch(search['file'],search['sha256'],MAP_DIR/f'{code}.search.sqlite',job)
   self._fetch(entry['file'],entry['sha256'],MAP_DIR/f'{code}.pmtiles',job)
   self.reload();job['state']='installed'
  except Exception as e:
   job.update(state='error',error=str(e))

 def remove(self,code):
  p=MAP_DIR/f'{code.upper()}.pmtiles'
  if p.parent!=MAP_DIR:return
  p.unlink(missing_ok=True);(MAP_DIR/f'{code.upper()}.search.sqlite').unlink(missing_ok=True)
  self.jobs.pop(code.upper(),None);self.reload()
