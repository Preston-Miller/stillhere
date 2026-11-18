"""Minimal Mapbox Vector Tile decoder and PMTiles tile walker (standard library only).

Used at map-build time to pull named features out of a state's .pmtiles file for offline search.
Only what search needs: layer names, feature properties and one representative point per feature.
"""
import gzip,math,struct,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'app'))
from maps import PMTiles,_varint   # noqa: E402  (reuse the app's reader)

def _fields(buf):
 """Yield (field_number, wire_type, value) for a protobuf message. Length-delimited values are memoryviews."""
 pos=0;n=len(buf)
 while pos<n:
  key,pos=_varint(buf,pos);f,w=key>>3,key&7
  if w==0:v,pos=_varint(buf,pos)
  elif w==2:
   ln,pos=_varint(buf,pos);v=buf[pos:pos+ln];pos+=ln
  elif w==5:v=bytes(buf[pos:pos+4]);pos+=4
  elif w==1:v=bytes(buf[pos:pos+8]);pos+=8
  else:raise ValueError('unsupported wire type %d'%w)
  yield f,w,v

def _packed(buf):
 pos=0;out=[]
 while pos<len(buf):v,pos=_varint(buf,pos);out.append(v)
 return out

def _value(buf):
 for f,w,v in _fields(buf):
  if f==1:return bytes(v).decode('utf-8','replace')
  if f==2:return struct.unpack('<f',v)[0]
  if f==3:return struct.unpack('<d',v)[0]
  if f in (4,5):return v
  if f==6:return (v>>1)^-(v&1)
  if f==7:return bool(v)
 return None

def _first_point(geom,gtype):
 """A representative point in tile coordinates: the point itself, a line's middle vertex, a polygon ring's average."""
 x=y=0;pts=[];i=0
 while i<len(geom):
  cmd=geom[i]&7;count=geom[i]>>3;i+=1
  if cmd in (1,2):
   for _ in range(count):
    dx,dy=geom[i],geom[i+1];i+=2
    x+=(dx>>1)^-(dx&1);y+=(dy>>1)^-(dy&1);pts.append((x,y))
  if gtype==1 and pts:break
  if gtype==3 and cmd==7:break   # first (outer) ring is enough
 if not pts:return None
 if gtype==2:return pts[len(pts)//2]
 if gtype==3:return (sum(p[0] for p in pts)/len(pts),sum(p[1] for p in pts)/len(pts))
 return pts[0]

def decode(data,layers=None):
 """{layer_name: [(props, (tx,ty)|None, extent)]} for the requested layers."""
 out={}
 for f,w,lv in _fields(memoryview(data)):
  if f!=3:continue
  name=None;feats=[];keys=[];vals=[];extent=4096
  for lf,lw,v in _fields(lv):
   if lf==1:
    name=bytes(v).decode()
    if layers and name not in layers:break   # name comes first in practice; skip unwanted layers cheaply
   elif lf==2:feats.append(v)
   elif lf==3:keys.append(bytes(v).decode())
   elif lf==4:vals.append(v)
   elif lf==5:extent=v
  if layers and name not in layers:continue
  vals=[_value(v) for v in vals]
  res=[]
  for fv in feats:
   tags=[];geom=[];gtype=0
   for ff,fw,v in _fields(fv):
    if ff==2:tags=_packed(v)
    elif ff==3:gtype=v
    elif ff==4:geom=_packed(v)
   props={keys[tags[k]]:vals[tags[k+1]] for k in range(0,len(tags)-1,2)}
   res.append((props,_first_point(geom,gtype),extent))
  out[name]=res
 return out

def to_lonlat(z,x,y,tx,ty,extent):
 n=1<<z;fx=(x+tx/extent)/n;fy=(y+ty/extent)/n
 lon=fx*360-180;lat=math.degrees(math.atan(math.sinh(math.pi*(1-2*fy))))
 return lon,lat

# ---- walk every tile id stored in an archive ----
def tileid_to_zxy(tid):
 z=0;acc=0
 while True:
  num=1<<(2*z)
  if tid<acc+num:break
  acc+=num;z+=1
 d=tid-acc;n=1<<z;x=y=0;s=1;t=d
 while s<n:
  rx=1&(t//2);ry=1&(t^rx)
  if ry==0:
   if rx==1:x,y=s-1-x,s-1-y
   x,y=y,x
  x+=s*rx;y+=s*ry;t//=4;s*=2
 return z,x,y

def walk(pm,zoom):
 """Yield (z,x,y,raw_tile_bytes) for every tile at `zoom`."""
 lo=((1<<(2*zoom))-1)//3;hi=lo+(1<<(2*zoom))
 def entries(off,length,leaf):
  ids,runs,lens,offs=pm._dir(off,length)
  for i in range(len(ids)):
   if runs[i]==0:
    yield from entries(pm.leaf_off+offs[i],lens[i],True)
   else:
    for k in range(runs[i]):
     tid=ids[i]+k
     if lo<=tid<hi:yield tid,offs[i],lens[i]
 for tid,off,ln in entries(pm.root_off,pm.root_len,False):
  raw=pm._read(pm.data_off+off,ln)
  if pm.tile_comp==2:raw=gzip.decompress(raw)
  yield (*tileid_to_zxy(tid),raw)
