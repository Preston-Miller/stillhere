#!/usr/bin/env python3
"""Build app/data/library.sqlite from Final_Sources/, the only built-in library (Preston's final pick, 2026-11-23).

Final_Sources/<Category>/<file>.pdf|.txt
  - The folder name is the category shown in the Sources view. Order and blurbs: Final_Sources/categories.json.
  - PDFs: one or more passages per page (page number kept for the viewer).
  - Text files: an optional header (Title:, Source:/Original:, a bare URL, Retrieved:/Accessed:, Page date:,
    Date last reviewed:, Updated ..., attribution lines) is read for the title, link and date, then dropped.
  - TITLES below gives display titles; anything not listed is titled from its file name.
The old sources (knowledge/, reference-sources/) were moved to _removed-sources/2026-11-23/.
Run with the app venv:  app-venv/bin/python app/build_index.py
"""
import json,logging,re,sqlite3,sys,time
from array import array
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from library import ROOT,DB,EMBED_MODEL,WORDS,OVERLAP,embed
logging.disable(logging.CRITICAL)   # pypdf font warnings are noise here
from pypdf import PdfReader

SRC='Final_Sources'

def windows(text):
 words=text.split()
 if len(words)<=WORDS+80:return [' '.join(words)] if words else []
 out=[];i=0
 while i<len(words):
  out.append(' '.join(words[i:i+WORDS]))
  if i+WORDS>=len(words):break
  i+=WORDS-OVERLAP
 return out

def nice(name):
 return re.sub(r'[-_]+',' ',Path(name).stem).replace(' 2015','').strip()

def clean(t):
 t=t.replace('­','').replace('ﬁ','fi').replace('ﬂ','fl')
 t=re.sub(r'-\n(?=[a-z])','',t)          # re-join hyphenated line breaks
 return re.sub(r'[ \t]+',' ',t).strip()

TITLES={
 'Aerie-Wilderness-Medicine-15th.pdf':'Aerie Backcountry Medicine (15th edition)',
 'Army-ATP-4-02.11-First-Aid-2026.pdf':'Army First Aid, ATP 4-02.11 (2026)',
 'CDC-Keep-Food-Safe-After-a-Disaster-or-Emergency.txt':'Keep Food Safe After a Disaster or Emergency (CDC)',
 'FoodSafety-gov-Food-Safety-During-Power-Outage.txt':'Food Safety During a Power Outage (FoodSafety.gov)',
 'CDC-Personal-Hygiene-During-an-Emergency.txt':'Personal Hygiene During an Emergency (CDC)',
 'King-County-How-to-Create-an-Emergency-Toilet.txt':'How to Create an Emergency Toilet (Public Health Seattle & King County)',
 'FDA-Safe-Drug-Use-After-a-Natural-Disaster.txt':'Safe Drug Use After a Natural Disaster (FDA)',
 'Medicine-Quick-Guide.txt':'Medicine Quick Guide',
 'FDA-Label-Childrens-Ibuprofen-100mg-per-5mL.txt':"Children's Ibuprofen 100 mg per 5 mL, Dosing Chart (FDA label)",
 'FDA-Label-Childrens-Acetaminophen-160mg-per-5mL.txt':"Children's Acetaminophen (Tylenol) 160 mg per 5 mL, Dosing Chart (FDA label)",
 'FDA-Label-Infants-Ibuprofen-50mg-per-1.25mL.txt':"Infants' Ibuprofen Drops 50 mg per 1.25 mL, Dosing Chart (FDA label)",
 'FDA-Label-Infants-Acetaminophen-160mg-per-5mL.txt':"Infants' Acetaminophen (Tylenol) 160 mg per 5 mL, Dosing Chart (FDA label)",
 'CDC-What-to-Do-During-a-Power-Outage.txt':'What to Do During a Power Outage (CDC)',
 'Generator-Troubleshooting-Research-Summary.txt':'Generator Troubleshooting',
 'CDC-How-to-Find-Clean-Water-in-an-Emergency.txt':'How to Find Clean Water in an Emergency (CDC)',
 'CDC-How-to-Make-Water-Safe-in-an-Emergency.txt':'How to Make Water Safe in an Emergency (CDC)',
 'NWS-During-a-Winter-Storm.txt':'During a Winter Storm (National Weather Service)',
 'NWS-Severe-Weather-Safety.txt':'Severe Weather Safety (National Weather Service)',
}
# PDFs carry no header to read a date from: (year, 'stated' = printed in it, 'file' = only the file's date).
PDF_DATES={'Aerie-Wilderness-Medicine-15th.pdf':(2025,'file'),'Army-ATP-4-02.11-First-Aid-2026.pdf':(2026,'stated')}

META=re.compile(r'^(title|source|original|publisher|retrieved|accessed|status|page[- ]date(?:-as-captured)?|date last reviewed|updated)\b[: ]',re.I)
URL=re.compile(r'https?://\S+')
def text_doc(f):
 """(body, url, year, basis) for a text source; the header lines at the top are read, then dropped."""
 lines=f.read_text(errors='replace').replace('﻿','').splitlines()
 url=None;stated=None;got=None;body=[];i=0
 # The header is the run of metadata, URL, attribution and title lines before the first real paragraph.
 while i<len(lines) and i<14:
  l=lines[i].strip()
  if not l:i+=1;continue
  m=META.match(l)
  if m or URL.fullmatch(l) or re.search(r'does not (imply )?endorse|is available free from',l,re.I) or (i<2 and l.isupper()):
   u=URL.search(l)
   if u and not url:url=u.group(0).rstrip('.,)')
   y=re.search(r'(19|20)\d\d',l)
   if y and m:
    key=m.group(1).lower()
    if key.startswith(('page','date last','updated')):stated=stated or int(y.group(0))
    elif key in ('retrieved','accessed'):got=got or int(y.group(0))
   i+=1;continue
  break
 body=lines[i:]
 year,basis=(stated,'stated') if stated else (got,'retrieved') if got else (None,None)
 return '\n'.join(body),url,year,basis

def main():
 chunks=[];report=[]
 files=sorted(p for p in (ROOT/SRC).glob('*/*') if p.suffix.lower() in ('.pdf','.txt') and p.is_file())
 for p in files:
  rel=str(p.relative_to(ROOT));title=TITLES.get(p.name) or nice(p.name)
  if p.suffix.lower()=='.pdf':
   try:reader=PdfReader(p);total=len(reader.pages)
   except Exception as e:report.append((rel,'UNREADABLE '+type(e).__name__+': '+str(e)[:80]));continue
   y,b=PDF_DATES.get(p.name,(None,None))
   if not y:print(f'  NOTE: no date for {p.name}; add it to PDF_DATES')
   pages=blank=0
   for n,page in enumerate(reader.pages,1):
    try:text=clean(page.extract_text() or '')
    except Exception:text=''
    if len(text)<40:blank+=1;continue
    for k,w in enumerate(windows(text)):
     chunks.append({'id':f'{rel}#p{n}'+(f'.{k}' if k else ''),'kind':'pdf','doc':rel,'title':title,'path':rel,'page':n,'url':None,'text':w,'year':y,'dated':b})
    pages+=1
   report.append((rel,f'{total} pages, {blank} without extractable text'))
  else:
   body,url,y,b=text_doc(p)
   n=0
   for k,w in enumerate(windows(clean(body))):
    chunks.append({'id':f'{rel}#{k}','kind':'web' if url else 'guide','doc':rel,'title':title,'path':rel,'page':None,'url':url,'text':w,'year':y,'dated':b});n+=1
   report.append((rel,f'{n} passages, {"web page" if url else "guide"}, {b or "no date"} {y or ""}'))
 for rel,msg in report:print(f'  {rel}: {msg}')
 print(f'{len(chunks)} chunks; embedding with {EMBED_MODEL}...',flush=True)
 t=time.time();vecs=[]
 for i in range(0,len(chunks),16):
  vecs+=embed([c['title']+'\n'+c['text'] for c in chunks[i:i+16]])
  print(f'\r  {len(vecs)}/{len(chunks)}',end='',flush=True)
 print(f'\n  done in {time.time()-t:.0f}s')
 DB.parent.mkdir(exist_ok=True);tmp=DB.with_suffix('.tmp');tmp.unlink(missing_ok=True)
 con=sqlite3.connect(tmp)
 con.execute('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)')
 con.execute('CREATE TABLE chunks (id TEXT PRIMARY KEY, kind TEXT, doc TEXT, title TEXT, path TEXT, page INTEGER, url TEXT, text TEXT, year INTEGER, dated TEXT)')
 con.execute('CREATE TABLE vectors (id TEXT PRIMARY KEY, vector BLOB)')
 con.execute('CREATE VIRTUAL TABLE fts USING fts5(id UNINDEXED, title, text, tokenize="porter unicode61")')
 for c,v in zip(chunks,vecs):
  con.execute('INSERT INTO chunks VALUES (:id,:kind,:doc,:title,:path,:page,:url,:text,:year,:dated)',c)
  con.execute('INSERT INTO vectors VALUES (?,?)',(c['id'],array('f',v).tobytes()))
  con.execute('INSERT INTO fts VALUES (?,?,?)',(c['id'],c['title'],c['text']))
 con.executemany('INSERT INTO meta VALUES (?,?)',[('embed_model',EMBED_MODEL),('built',time.strftime('%Y-%m-%d %H:%M')),('chunks',str(len(chunks)))])
 con.commit();con.close();tmp.replace(DB)
 print('wrote',DB.relative_to(ROOT))

if __name__=='__main__':main()
