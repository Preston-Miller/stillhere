#!/usr/bin/env python3
"""Build app/data/library.sqlite from the documentation.

Sources indexed:
  knowledge/*.pdf, reference-sources/*.pdf  -> one or more chunks per page (page number kept for the viewer)
  reference-sources/web/*.txt               -> official web-page snapshots
  reference-sources/incoming/<batch>/**      -> later acquisitions (PDFs and .txt snapshots), titles/URLs from each
                                                batch's acquisition-manifest.json; EXCLUDE lists files kept out
  rag-package/action-chunks.jsonl           -> authored guide sections (off: GUIDES=False)
Run with the app venv:  app-venv/bin/python app/build_index.py
"""
import json,logging,re,sqlite3,sys,time
from array import array
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from library import ROOT,DB,EMBED_MODEL,WORDS,OVERLAP,embed
logging.disable(logging.CRITICAL)   # pypdf font warnings are noise here
from pypdf import PdfReader

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

# Acquired but not cleared for a commercial product.
EXCLUDE={'USU-Practical-Guide-Prolonged-Casualty-Care-2025':'CC BY-NC-SA 4.0 (noncommercial only)'}

def incoming():
 """(path, title, url) for every included file in the incoming batches."""
 out=[]
 for batch in sorted((ROOT/'reference-sources/incoming').glob('*/')):
  mf=batch/'acquisition-manifest.json'
  meta={}
  if mf.exists():
   for x in json.loads(mf.read_text()):
    for f in x.get('files',[]):meta[f]=x
  for f in sorted(batch.rglob('*')):
   if f.suffix not in ('.pdf','.txt') or not f.is_file():continue
   m=meta.get(str(f.relative_to(batch)),{})
   if f.stem in EXCLUDE or m.get('name') in EXCLUDE:
    print(f'  skipping {f.name}: {EXCLUDE.get(f.stem) or EXCLUDE.get(m.get("name"))}');continue
   out.append((f,re.sub(r'[-_]+',' ',m['name']).strip() if m.get('name') else nice(f.name),m.get('resolved_url') or m.get('requested_url')))
 return out

def snapshot_text(f):
 """Split off the 'Title:/Source:/Retrieved:/Page-date-as-captured:/Status:' header the acquisition scripts write.
 Returns (body text, year retrieved or None)."""
 lines=f.read_text(errors='replace').replace('\ufeff','').splitlines();year=None
 while lines and (re.match(r'^(Title|Source|Retrieved|Status|Page-date-as-captured):',lines[0]) or not lines[0].strip()):
  m=re.match(r'^Retrieved:\s*(\d{4})',lines[0])
  if m:year=int(m.group(1))
  lines.pop(0)
 return '\n'.join(lines),year

GUIDES=False
def load_dates():
 return {k:v for k,v in json.loads((ROOT/'reference-sources/source-dates.json').read_text()).items() if not k.startswith('_')}

def main():
 chunks=[];report=[];DATES=load_dates()
 extra=incoming();titles={f:(t,u) for f,t,u in extra}
 pdfs=sorted((ROOT/'knowledge').glob('*.pdf'))+sorted((ROOT/'reference-sources').glob('*.pdf'))+[f for f,_,_ in extra if f.suffix=='.pdf']
 for p in pdfs:
  rel=str(p.relative_to(ROOT))
  try:reader=PdfReader(p);total=len(reader.pages)
  except Exception as e:report.append((rel,'UNREADABLE '+type(e).__name__+': '+str(e)[:80]));continue
  pages=0;blank=0
  d=DATES.get(rel)
  if not d:print(f'  NOTE: no date for {rel}; add it to reference-sources/source-dates.json')
  dated={'year':d['year'] if d else None,'dated':d['basis'] if d else None}
  for n,page in enumerate(reader.pages,1):
   try:text=clean(page.extract_text() or '')
   except Exception:text=''
   if len(text)<40:blank+=1;continue
   for k,w in enumerate(windows(text)):
    chunks.append({'id':f'{rel}#p{n}'+(f'.{k}' if k else ''),'kind':'pdf','doc':rel,'title':titles.get(p,(nice(p.name),))[0],'path':rel,'page':n,'url':titles.get(p,(0,None))[1],'text':w,**dated})
   pages+=1
  report.append((rel,f'{total} pages, {blank} without extractable text'))
 snaps={x['offline_asset'].split('/')[-1]:x for x in json.loads((ROOT/'reference-sources/web-snapshot-manifest.json').read_text()) if x.get('offline_asset')}
 for f in sorted((ROOT/'reference-sources/web').glob('*.txt')):
  meta=snaps.get(f.name,{});rel=str(f.relative_to(ROOT))
  body,year=snapshot_text(f)
  for k,w in enumerate(windows(clean(body))):
   chunks.append({'id':f'{rel}#{k}','kind':'web','doc':rel,'title':meta.get('title') or nice(f.name),'path':rel,'page':None,'url':meta.get('url'),'text':w,'year':year,'dated':'retrieved' if year else None})
 for f,title,url in extra:
  if f.suffix!='.txt':continue
  rel=str(f.relative_to(ROOT))
  body,year=snapshot_text(f)
  for k,w in enumerate(windows(clean(body))):
   chunks.append({'id':f'{rel}#{k}','kind':'web','doc':rel,'title':title,'path':rel,'page':None,'url':url,'text':w,'year':year,'dated':'retrieved' if year else None})
 # The authored guides were dropped from the library on 2026-11-17 (only the sources in
 # reference-sources/library-keep.json ship). Set GUIDES=True to index rag-package/action-chunks.jsonl again.
 for line in ((ROOT/'rag-package/action-chunks.jsonl').read_text().splitlines() if GUIDES else []):
  r=json.loads(line)
  chunks.append({'id':r['chunk_id'],'kind':'guide','doc':r['document_id'],'title':r['title']+' — '+r['section'],'path':r['guide_path'].replace('../',''),'page':None,'url':None,'text':r['procedure_text'],'year':None,'dated':None})
 # Explicitly reviewed baseline selection; never ingest the whole acquired folder.
 selected=ROOT/'reference-sources/baseline-2026-11-17/active-reference-chunks.jsonl'
 if selected.exists():
  for line in selected.read_text().splitlines():
   if line.strip():chunks.append(json.loads(line))
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
