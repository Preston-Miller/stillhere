#!/usr/bin/env python3
"""Build per-state offline map files (PMTiles) from the Protomaps world basemap.

  python3 maps-build/make_states.py --list                  # state codes
  python3 maps-build/make_states.py --dry-run UT CA          # estimate sizes, download nothing
  python3 maps-build/make_states.py UT                       # extract Utah into maps-build/out/
  python3 maps-build/make_states.py --all                    # every state + DC

Each state is cut with its census boundary (plus a small margin), so border towns show on both sides.
Outputs maps-build/out/<CODE>.pmtiles, <CODE>.search.sqlite (place search) and maps-build/out/catalog.json, which the app reads to offer
downloads. Upload the out/ folder as-is to the public map host (R2).
Map data (c) OpenStreetMap contributors (ODbL); basemap by Protomaps. Keep attribution visible in the app.
"""
import argparse,hashlib,json,re,subprocess,sys,time,xml.etree.ElementTree as ET
from pathlib import Path
import make_search
HERE=Path(__file__).resolve().parent
PMTILES=HERE/'dl-pmtiles'/'pmtiles'
KML=HERE/'dl-census'/'cb_2024_us_state_5m.kml'
OUT=HERE/'out';SHAPES=HERE/'shapes'
BUILD='20261116'   # Protomaps daily build used for every state, so border tiles match exactly
SOURCE=f'https://build.protomaps.com/{BUILD}.pmtiles'
MAXZOOM=15         # 15 = street level, building outlines; 14 roughly halves size but loses some detail
MARGIN=0.05        # degrees (~5 km) added around each state's box
NS={'k':'http://www.opengis.net/kml/2.2'}
# 50 states + DC. Territories can be added; the census file includes PR, GU, VI, AS, MP.
INCLUDE=set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())

def states():
 root=ET.parse(KML).getroot();out={}
 for pm in root.iter('{http://www.opengis.net/kml/2.2}Placemark'):
  data={d.get('name'):(d.text or '') for d in pm.iter('{http://www.opengis.net/kml/2.2}SimpleData')}
  code=data.get('STUSPS');name=data.get('NAME')
  if code not in INCLUDE:continue
  polys=[]
  for poly in pm.iter('{http://www.opengis.net/kml/2.2}Polygon'):
   ring=poly.find('k:outerBoundaryIs/k:LinearRing/k:coordinates',NS)
   pts=[[float(a) for a in p.split(',')[:2]] for p in ring.text.split()]
   polys.append([pts])
  out[code]={'code':code,'name':name,'polygons':polys}
 return out

def bounds(st):
 xs=[x for poly in st['polygons'] for x,_ in poly[0]];ys=[y for poly in st['polygons'] for _,y in poly[0]]
 # Alaska's Aleutians cross the antimeridian; keep only the western-hemisphere part's box.
 xs=[x for x in xs if x<0] or xs
 return [round(min(xs)-MARGIN,4),round(min(ys)-MARGIN,4),round(max(xs)+MARGIN,4),round(max(ys)+MARGIN,4)]

def region_file(st):
 SHAPES.mkdir(exist_ok=True);p=SHAPES/f"{st['code']}.geojson"
 polys=[poly for poly in st['polygons'] if not (st['code']=='AK' and min(x for x,_ in poly[0])>0)]
 p.write_text(json.dumps({'type':'Feature','properties':{'code':st['code']},'geometry':{'type':'MultiPolygon','coordinates':polys}}))
 return p

def extract(st,dry):
 out=OUT/f"{st['code']}.pmtiles";OUT.mkdir(exist_ok=True)
 # --region clips to the state outline; tiles touching the border are kept whole.
 cmd=[str(PMTILES),'extract',SOURCE,str(out),f'--region={region_file(st)}',f'--maxzoom={MAXZOOM}','--download-threads=8']
 if dry:cmd.append('--dry-run')
 r=subprocess.run(cmd,capture_output=True,text=True)
 if r.returncode:sys.exit(f"pmtiles failed for {st['code']}:\n{r.stderr[-2000:]}")
 return r.stdout+r.stderr,out

def sha256(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()

def write_catalog(all_states):
 entries=[]
 for code in sorted(all_states):
  p=OUT/f'{code}.pmtiles'
  if not p.exists():continue
  st=all_states[code]
  e={'code':code,'name':st['name'],'file':p.name,'bytes':p.stat().st_size,'sha256':sha256(p),'bounds':bounds(st)}
  sp=OUT/f'{code}.search.sqlite'
  if sp.exists():e['search']={'file':sp.name,'bytes':sp.stat().st_size,'sha256':sha256(sp)}
  entries.append(e)
 (OUT/'catalog.json').write_text(json.dumps({'build':BUILD,'maxzoom':MAXZOOM,'attribution':'© OpenStreetMap contributors, Protomaps','states':entries},indent=1))
 return len(entries)

def main():
 ap=argparse.ArgumentParser(description=__doc__,formatter_class=argparse.RawDescriptionHelpFormatter)
 ap.add_argument('codes',nargs='*');ap.add_argument('--all',action='store_true');ap.add_argument('--dry-run',action='store_true');ap.add_argument('--list',action='store_true');ap.add_argument('--force',action='store_true')
 a=ap.parse_args();all_states=states()
 if a.list:print(' '.join(f"{c}={s['name']}" for c,s in sorted(all_states.items())));return
 codes=sorted(all_states) if a.all else [c.upper() for c in a.codes]
 bad=[c for c in codes if c not in all_states]
 if bad or not codes:sys.exit('Unknown or missing state codes: '+' '.join(bad))
 for c in codes:
  if not a.dry_run and not a.force and (OUT/f'{c}.pmtiles').exists() and (OUT/f'{c}.search.sqlite').exists():
   print(f'{c}: already built, skipping (--force to redo)',flush=True);continue
  t=time.time();log,out=extract(all_states[c],a.dry_run)
  if not a.dry_run:make_search.build(c)   # offline place search, from the map file just made
  size=re.findall(r'archive size of [0-9.]+ [KMGT]?B',log)
  print(f"{c} {all_states[c]['name']}: "+('; '.join(size[-2:]) if a.dry_run else f'{out.stat().st_size/1e9:.2f} GB in {time.time()-t:.0f}s'),flush=True)
 if not a.dry_run:print('catalog entries:',write_catalog(all_states))

if __name__=='__main__':main()
