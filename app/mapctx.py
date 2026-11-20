"""Map context for the chat: the person's saved location, their pins, and nearby places from the downloaded
state maps, turned into numbered map items [M1], [M2]... that the model can cite like library excerpts.

Only added when the question is about places (where, nearest, how far, a pin...), so ordinary questions keep
their short prompt. Distances are straight lines from My location; the maps can't do road routing.
"""
import json,math,re

# What a question can ask to find, and the search-index labels that count as that kind of place.
KINDS=[
 ('hospital',r'hospital|emergency room|\ber\b|trauma cent',['Hospital']),
 ('clinic or doctor',r'clinic|doctor|urgent care|physician|medical care|medical help',['Clinic','Doctors']),
 ('pharmacy',r'pharmac|drug ?store|prescription|medication|medicine|insulin',['Pharmacy']),
 ('gas station',r'\bgas\b|fuel|gasoline|diesel|petrol',['Gas station']),
 ('grocery store',r'grocer|supermarket|buy food|get food|food store|groceries',['Supermarket']),
 ('police',r'police|sheriff|law enforcement',['Police']),
 ('ranger station',r'ranger',['Ranger station']),
 ('fire station',r'fire station|fire department|firefighter',['Fire station']),
 ('campground',r'campground|camp ?site|place to camp|camping',['Campground']),
 ('shelter',r'shelter|cabin|hut',['Shelter']),
 ('drinking water',r'water|spring',['Spring','Drinking water','Watering place']),
 ('lake, river or stream',r'lake|river|stream|creek|reservoir',['Lake','Reservoir','River','Stream']),
 ('hardware store',r'hardware|lumber|tools',['Hardware']),
 ('trailhead',r'trailhead|\btrails?\b|hike|hiking',['Trailhead']),
 ('town',r'\btown|\bcity\b|village|settlement|civilization',['City','Town','Village']),
]
PLACE_INTENT=re.compile(r'\b(near|nearest|nearby|closest|close to|close by|around (here|me)|where|map|pins?|route|directions?|distance|how far|miles?|km|'
                        r'kilomet|walk to|drive to|get to|go to|head to|evacuat|meet(ing)?( point| spot| place)?|rally|my location|location|local|in my area|find)\b',re.I)
PIN_WORDS=re.compile(r'\b(pins?|pinned|saved (spot|place|point)s?|marked|my (cache|stash|meeting|spot)s?|meeting (point|spot|place)|rally point)\b',re.I)
PIN_KIND_NAMES={'meeting':'meeting point','water':'water','shelter':'shelter','supplies':'supplies / cache','medical':'medical','danger':'danger','other':'other'}
SETTLEMENT=['City','Town','Village','Hamlet']
MAX_PINS=25

def km(a,b):
 """Great-circle distance in km between (lon, lat) pairs."""
 (x1,y1),(x2,y2)=a,b
 p1,p2=math.radians(y1),math.radians(y2);dp=p2-p1;dl=math.radians(x2-x1)
 h=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
 return 2*6371.0088*math.asin(math.sqrt(h))

def compass(a,b):
 (x1,y1),(x2,y2)=a,b
 p1,p2=math.radians(y1),math.radians(y2);dl=math.radians(x2-x1)
 deg=(math.degrees(math.atan2(math.sin(dl)*math.cos(p2),math.cos(p1)*math.sin(p2)-math.sin(p1)*math.cos(p2)*math.cos(dl)))+360)%360
 return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][round(deg/22.5)%16]

def away(me,lon,lat):
 """'1.6 miles NW of your location (straight line)', or '' without a location."""
 if not me:return ''
 d=km((me['lng'],me['lat']),(lon,lat))
 if d<0.03:return 'at your location'
 mi=d/1.609344
 dist=f'{round(mi*5280/10)*10} feet' if mi<0.1 else f'{mi:.1f} miles' if mi<10 else f'{round(mi)} miles'
 return f'{dist} {compass((me["lng"],me["lat"]),(lon,lat))} of your location (straight line)'

def read_json(path,default):
 try:return json.loads(path.read_text()) if path.exists() else default
 except (OSError,ValueError):return default

def build(question,maps,pins_path,me_path):
 """(items for the browser, text block for the model). Both empty when the question isn't about places."""
 q=question.lower()
 pins=[p for p in read_json(pins_path,[]) if isinstance(p,dict) and 'lng' in p and 'lat' in p]
 me=read_json(me_path,None)
 if not (isinstance(me,dict) and 'lng' in me):me=None
 label_hit=any(len(w)>=4 and re.search(r'\b'+re.escape(w)+r'\b',q) for p in pins for w in re.findall(r'\w+',(p.get('label') or '').lower()))
 intent=bool(PLACE_INTENT.search(q))
 if not (intent or label_hit or PIN_WORDS.search(q)):return [],''
 installed=maps.installed()
 items=[];notes=[]
 def add(kind,name,sub,lon,lat,text,**extra):
  items.append({'m':len(items)+1,'kind':kind,'name':name,'sub':sub,'lng':lon,'lat':lat,'text':text,**extra})
  return f'[M{len(items)}] {text}'
 lines=[]
 if me:
  town=maps.nearest(me['lng'],me['lat'],SETTLEMENT,limit=1,radius_km=40)
  near=f', near {town[0]["name"]}' if town else ''
  lines.append(add('me','My location',f'{me["lat"]:.5f}, {me["lng"]:.5f}',me['lng'],me['lat'],
                   f'My location (the spot the user saved as theirs): {me["lat"]:.5f}, {me["lng"]:.5f}{near}.'))
 else:notes.append('The user has not set "My location" on the map, so distances and "nearest" can\'t be worked out. If they ask for the nearest place or a distance, tell them to set their location on the Map tab first (the "Set location" button).')
 # Pins: nearest first when a location is set. Labels and notes are the user's own words.
 if me:pins.sort(key=lambda p:km((me['lng'],me['lat']),(p['lng'],p['lat'])))
 for p in pins[:MAX_PINS]:
  label=(p.get('label') or 'Untitled pin').strip();kind=PIN_KIND_NAMES.get(p.get('kind'),'other')
  where=away(me,p['lng'],p['lat']) or f'at {p["lat"]:.5f}, {p["lng"]:.5f}'
  note=re.sub(r'\s+',' ',p.get('note') or '').strip()
  lines.append(add('pin',label,', '.join(x for x in (PIN_KIND_NAMES.get(p.get('kind'),'pin'),where) if x),p['lng'],p['lat'],
                   f'Saved pin "{label}" (type: {kind}), {where}.'+(f' The user\'s note on it: "{note[:300]}"' if note else ''),pin=str(p.get('id',''))))
 if len(pins)>MAX_PINS:notes.append(f'The user has {len(pins)} pins; only the {MAX_PINS} closest are listed.')
 if not pins and PIN_WORDS.search(q):notes.append('The user has no saved pins.')
 # Nearby places of the kinds the question asks about, from the downloaded maps.
 if intent:
  if not installed:notes.append('No maps are downloaded, so nearby places can\'t be looked up. The user can download their state in the Map tab (Map regions).')
  elif me:
   for name,pat,labels in KINDS:
    if not re.search(pat,q):continue
    found=maps.nearest(me['lng'],me['lat'],labels,limit=4)
    if not found:notes.append(f'No {name} was found within about 100 miles of the user\'s location on their downloaded maps.');continue
    for r in found:
     town=f', {r["town"]}' if r['town'] and r['town']!=r['name'] else ''
     mine=next((p for p in pins[:MAX_PINS] if km((p['lng'],p['lat']),(r['lon'],r['lat']))<0.2),None)
     if mine:town+=f' (the user\'s pin "{(mine.get("label") or "Untitled pin").strip()}" is here)'
     lines.append(add('place',r['name'],', '.join(x for x in (r['label'],r['town'],away(me,r['lon'],r['lat'])) if x),r['lon'],r['lat'],
                      f'{r["label"]}: {r["name"]}{town}, {away(me,r["lon"],r["lat"])}.'))
  states=', '.join(sorted(installed)) or 'none'
  notes.append(f'Downloaded state maps: {states}. Places outside them are not on the map.')
 if not lines and not notes:return [],''
 return items,'\n'.join(lines+notes)
