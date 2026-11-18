#!/usr/bin/env python3
"""Build the offline search index for a state's map from the map file itself.

  python3 maps-build/make_search.py UT          # reads out/UT.pmtiles, writes out/UT.search.sqlite

Everything comes from the named features already in the Protomaps tiles at street zoom: towns and
neighbourhoods, points of interest (hospitals, fuel, springs, peaks, trailheads, campgrounds...), lakes,
rivers and streams, and named roads and trails. Street addresses are not in the basemap and not searchable.
One entry is kept per name and kind within a short distance, and each entry records its nearest town.
"""
import math,multiprocessing as mp,sqlite3,sys,time
from pathlib import Path
from mvt import PMTiles,walk,decode,to_lonlat

HERE=Path(__file__).resolve().parent;OUT=HERE/'out'
ZOOM=15
LAYERS={'places','pois','roads','water'}
SETTLEMENTS={'city','town','village'}
PLACE_KINDS={'locality','neighbourhood','macrohood','county'}
# Points of interest that are clutter for search (numbered campsites, bus stops, private pools...).
SKIP_POI={'bus_stop','camp_pitch','residential','pitch','swimming_pool','platform','station_entrance','bench','waste_basket','vending_machine','atm','toilets'}
SKIP_WATER={'swimming_pool','basin','reflecting_pool','fountain'}
LABEL={'city':'City','town':'Town','village':'Village','hamlet':'Hamlet','locality':'Place','isolated_dwelling':'Place','farm':'Farm',
       'neighbourhood':'Neighborhood','suburb':'Neighborhood','quarter':'District','macrohood':'District','county':'County',
       'minor_road':'Street','major_road':'Road','highway':'Highway','path':'Trail','other':'Road',
       'water':'Water','lake':'Lake','reservoir':'Reservoir','river':'River','stream':'Stream','canal':'Canal','drain':'Ditch',
       'fuel':'Gas station','camp_site':'Campground','caravan_site':'RV park','place_of_worship':'Church',
       'drinking_water':'Drinking water','fire_station':'Fire station','police':'Police','townhall':'Town hall'}
# Merge distance (km) for repeated sightings of the same name: a road shows up in every tile it crosses.
MERGE_KM={'place':3,'road':3,'water':3,'poi':0.3}
WEIGHT={'place':48,'poi':60,'water':55,'road':40}   # populated places get more, by population

def label(kind):return LABEL.get(kind) or (kind or 'Place').replace('_',' ').capitalize()

def tile_features(args):
 z,x,y,raw=args;out=[]
 for layer,feats in decode(raw,LAYERS).items():
  for p,pt,ext in feats:
   name=p.get('name:en') or p.get('name')
   if not name or pt is None or not isinstance(name,str):continue
   kind=p.get('kind')
   if layer=='places':
    if kind not in PLACE_KINDS:continue
    group='place';kind=p.get('kind_detail') or kind   # city/town/village/hamlet/locality/suburb...
   elif layer=='pois':
    if kind in SKIP_POI or (kind=='parking' and 'trail' not in name.lower()):continue
    if kind in ('water','lake','reservoir'):group='water'
    else:group='poi'
   elif layer=='roads':
    if kind in ('rail','ferry','aerialway'):continue
    group='road'
   else:
    if kind in SKIP_WATER:continue
    group='water'
   lon,lat=to_lonlat(z,x,y,pt[0],pt[1],ext)
   # Only real settlements carry a real population; the basemap fills in placeholders for the rest.
   pop=p.get('population') if layer=='places' and kind in SETTLEMENTS else None
   out.append((group,kind,name.strip(),lon,lat,pop if isinstance(pop,(int,float)) else 0))
 return out

def km(a,b,c,d):
 return math.hypot((c-a)*math.cos(math.radians((b+d)/2)),d-b)*111.2

def build(code):
 src=OUT/f'{code}.pmtiles';dst=OUT/f'{code}.search.sqlite'
 pm=PMTiles(src);t=time.time()
 clusters={}   # (group, kind-ish, lowercase name, cell) -> entry
 def kindkey(group,kind):return group if group in ('road','water') else (group,kind)
 n=0
 with mp.Pool() as pool:
  for feats in pool.imap_unordered(tile_features,walk(pm,ZOOM),chunksize=64):
   n+=1
   for group,kind,name,lon,lat,pop in feats:
    d=MERGE_KM[group]/111.2;cx,cy=int(lon/d),int(lat/d);key=(kindkey(group,kind),name.lower())
    hit=None
    for dx in (-1,0,1):
     for dy in (-1,0,1):
      e=clusters.get((key,cx+dx,cy+dy))
      if e and km(e['lon'],e['lat'],lon,lat)<=MERGE_KM[group]:hit=e;break
     if hit:break
    if hit:hit['pop']=max(hit['pop'],pop);continue
    clusters[(key,cx,cy)]={'group':group,'kind':kind,'name':name,'lon':lon,'lat':lat,'pop':pop}
 entries=list(clusters.values())
 # Nearest town for context ("Main Street · Provo").
 # Only populated towns give context; OSM has many unpopulated 'localities' (old sidings, basins).
 towns=[e for e in entries if e['kind'] in SETTLEMENTS and e['pop']>=500];G=0.5;grid={}
 for tw in towns:grid.setdefault((int(tw['lon']//G),int(tw['lat']//G)),[]).append(tw)
 for e in entries:
  best=None;bd=40
  if e['group']=='place':e['town']='';continue   # a town's own context is its state, shown by the app
  gx,gy=int(e['lon']//G),int(e['lat']//G)
  for dx in (-1,0,1):
   for dy in (-1,0,1):
    for tw in grid.get((gx+dx,gy+dy),()):
     if tw is e:continue
     dist=km(e['lon'],e['lat'],tw['lon'],tw['lat'])
     # Prefer bigger towns slightly, so a farm hamlet doesn't win over the city next door.
     score=dist/(1+math.log10(1+tw['pop'])/3)
     if score<bd:bd,best=score,tw
  e['town']=best['name'] if best else ''
 dst.unlink(missing_ok=True);tmp=dst.with_suffix('.tmp');tmp.unlink(missing_ok=True)
 con=sqlite3.connect(tmp)
 con.execute('CREATE TABLE f (id INTEGER PRIMARY KEY, name TEXT, kind TEXT, label TEXT, town TEXT, lon REAL, lat REAL, weight REAL)')
 con.execute("CREATE VIRTUAL TABLE fts USING fts5(name, label, content='f', content_rowid='id', tokenize='unicode61 remove_diacritics 2', prefix='2 3')")
 rows=[]
 for e in entries:
  w=WEIGHT[e['group']]+(34+math.log10(1+e['pop'])*8 if e['pop'] else 0)
  rows.append((e['name'],e['kind'],label(e['kind']),e['town'],round(e['lon'],6),round(e['lat'],6),round(w,2)))
 con.executemany('INSERT INTO f (name,kind,label,town,lon,lat,weight) VALUES (?,?,?,?,?,?,?)',rows)
 con.execute("INSERT INTO fts(rowid,name,label) SELECT id,name,label FROM f")
 con.execute('CREATE INDEX f_name ON f(name COLLATE NOCASE)')
 con.execute('CREATE INDEX f_lat ON f(lat)')
 con.execute("INSERT INTO fts(fts) VALUES('optimize')")
 con.commit();con.execute('VACUUM');con.close();tmp.rename(dst)
 by={};[by.__setitem__(e['group'],by.get(e['group'],0)+1) for e in entries]
 print(f'{code}: {n} tiles, {len(entries)} entries {by}, {dst.stat().st_size/1e6:.1f} MB in {time.time()-t:.0f}s',flush=True)
 return dst

if __name__=='__main__':
 codes=[c.upper() for c in sys.argv[1:]]
 if not codes:sys.exit(__doc__)
 for c in codes:build(c)
