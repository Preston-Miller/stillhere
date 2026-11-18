#!/usr/bin/env python3
"""Write simplified state outlines for the app: app/static/vendor/states.geojson.

The map uses them to shade everything outside the downloaded states and to name the state under the
map center ("Nevada isn't downloaded"). Small (~300 KB) and fixed, so it ships with the app.

  python3 maps-build/make_outlines.py
"""
import json
from pathlib import Path
from make_states import states

HERE=Path(__file__).resolve().parent
DEST=HERE.parent/'app'/'static'/'vendor'/'states.geojson'
TOL=0.004   # degrees (~400 m): invisible at the zooms where the shading matters

def simplify(pts,tol):
 """Douglas-Peucker, iterative."""
 if len(pts)<5:return pts
 keep=[False]*len(pts);keep[0]=keep[-1]=True;stack=[(0,len(pts)-1)]
 while stack:
  a,b=stack.pop();(x1,y1),(x2,y2)=pts[a],pts[b];dx,dy=x2-x1,y2-y1;n=(dx*dx+dy*dy)**.5
  best,idx=0,-1
  for i in range(a+1,b):
   x,y=pts[i]
   d=abs(dy*x-dx*y+x2*y1-y2*x1)/n if n else ((x-x1)**2+(y-y1)**2)**.5
   if d>best:best,idx=d,i
  if best>tol:keep[idx]=True;stack+=[(a,idx),(idx,b)]
 return [p for p,k in zip(pts,keep) if k]

def main():
 feats=[]
 for code,st in sorted(states().items()):
  polys=[]
  for poly in st['polygons']:
   ring=poly[0]
   if code=='AK' and min(x for x,_ in ring)>0:continue   # Aleutians past the antimeridian
   r=[[round(x,4),round(y,4)] for x,y in simplify(ring,TOL)]
   if len(r)>=4:polys.append([r])
  feats.append({'type':'Feature','properties':{'code':code,'name':st['name']},'geometry':{'type':'MultiPolygon','coordinates':polys}})
 DEST.write_text(json.dumps({'type':'FeatureCollection','features':feats},separators=(',',':')))
 print(f'{len(feats)} states, {DEST.stat().st_size/1e3:.0f} KB -> {DEST}')

if __name__=='__main__':main()
