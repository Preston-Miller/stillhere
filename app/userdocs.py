"""Your documents: files the user adds, indexed on this computer and searched alongside the built-in library.

Files are copied into data/user/files/<id>/ and their passages go into data/user/user.sqlite (same layout as
library.sqlite). Chunk paths start with "user-docs/", which the server maps to the files folder.
In the Mac app, data/ is ~/Library/Application Support/Stillhere (see paths.py).
"""
import hashlib,json,re,sqlite3,threading,time,zipfile
from array import array
from io import BytesIO
from pathlib import Path
from build_index import windows,clean,nice
from library import EMBED_MODEL,embed

from paths import DATA
USER=DATA/'user'
FILES=USER/'files'
PREFIX='user-docs/'
TYPES={'.pdf':'PDF','.txt':'Text','.md':'Text','.docx':'Word'}
MAX_BYTES=300*1024*1024

class ImportError_(Exception):
 """A problem the user should see, worded for them."""

class UserDocs:
 def __init__(self,lib):
  FILES.mkdir(parents=True,exist_ok=True)
  self.lib=lib;self.lock=threading.Lock();self.busy=threading.Lock()
  self.con=sqlite3.connect(USER/'user.sqlite',check_same_thread=False)
  with self.lock:
   self.con.executescript('''
    CREATE TABLE IF NOT EXISTS docs (id TEXT PRIMARY KEY, title TEXT, filename TEXT, path TEXT, type TEXT, pages INTEGER,
      passages INTEGER, year INTEGER, sha256 TEXT, added REAL, embed_model TEXT);
    CREATE TABLE IF NOT EXISTS chunks (id TEXT PRIMARY KEY, kind TEXT, doc TEXT, title TEXT, path TEXT, page INTEGER, url TEXT, text TEXT, year INTEGER, dated TEXT);
    CREATE TABLE IF NOT EXISTS vectors (id TEXT PRIMARY KEY, vector BLOB);
    CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(id UNINDEXED, title, text, tokenize="porter unicode61");''')
   cols=['id','kind','doc','title','path','page','url','text','year','dated']
   chunks=[dict(zip(cols,r)) for r in self.con.execute('SELECT '+','.join(cols)+' FROM chunks')]
   vecs=dict(self.con.execute('SELECT id,vector FROM vectors'))
   stale=[r[0] for r in self.con.execute('SELECT id FROM docs WHERE embed_model!=?',(EMBED_MODEL,))]
  if stale:print(f'  {len(stale)} of your documents were indexed with another embedding model; re-add them to search them.')
  chunks=[c for c in chunks if c['id'] in vecs and not any(c['doc']==PREFIX+s or c['doc'].startswith(PREFIX+s+'/') for s in stale)]
  lib.add_chunks(chunks,[array('f',vecs[c['id']]) for c in chunks])
  lib.extra.append(self)
  # Built-in documents the user removed. The files stay inside the app (a signed app can't change its own
  # contents); they're just left out of search and the Sources list, and can be restored.
  self.hidden_file=USER/'hidden.json';self.stash={}
  try:hidden=json.loads(self.hidden_file.read_text())
  except (OSError,ValueError):hidden=[]
  for doc in hidden:self._stash(doc)

 def _stash(self,doc):
  chunks=[c for c in self.lib.chunks.values() if c['doc']==doc]
  if not chunks or doc.startswith(PREFIX):return False
  self.stash[doc]=(chunks,[self.lib.vectors[c['id']] for c in chunks])
  self.lib.remove_doc(doc);return True

 def _save_hidden(self):
  tmp=self.hidden_file.with_suffix('.tmp');tmp.write_text(json.dumps(sorted(self.stash)));tmp.replace(self.hidden_file)

 def hide(self,doc):
  with self.lock:
   ok=self._stash(doc)
   if ok:self._save_hidden()
  return ok

 def unhide(self,doc):
  with self.lock:
   if doc not in self.stash:return False
   chunks,vecs=self.stash.pop(doc);self.lib.add_chunks(chunks,vecs);self._save_hidden()
  return True

 def hidden(self):
  out=[]
  for doc,(chunks,_) in self.stash.items():
   c=chunks[0];pages=max([x['page'] or 0 for x in chunks])
   out.append({'doc':doc,'title':c['title'].split(' — ')[0] if c['kind']=='guide' else c['title'],'kind':c['kind'],'path':c['path'],
               'year':c.get('year'),'dated':c.get('dated'),'passages':len(chunks),'pages':pages})
  return sorted(out,key=lambda d:d['title'].lower())

 def keyword(self,match,n):
  sql='SELECT id,bm25(fts,0,4,1) FROM fts WHERE fts MATCH ? ORDER BY bm25(fts,0,4,1) LIMIT ?'
  with self.lock:return self.con.execute(sql,(match,n)).fetchall()

 def list(self):
  cols=['id','title','filename','path','type','pages','passages','year','added']
  with self.lock:return [dict(zip(cols,r)) for r in self.con.execute('SELECT '+','.join(cols)+' FROM docs ORDER BY added DESC')]

 def add(self,filename,data,progress=lambda done,total:None):
  """Copy, read, split and embed one file. Returns its docs row. Raises ImportError_ with a user-facing message."""
  filename=Path(filename).name.strip() or 'document'
  ext=Path(filename).suffix.lower()
  if ext not in TYPES:raise ImportError_(f'{filename}: only PDF, Word (.docx) and text files can be added.')
  if len(data)>MAX_BYTES:raise ImportError_(f'{filename} is larger than {MAX_BYTES//2**20} MB.')
  sha=hashlib.sha256(data).hexdigest()
  with self.lock:dup=self.con.execute('SELECT title FROM docs WHERE sha256=?',(sha,)).fetchone()
  if dup:raise ImportError_(f'{filename} is already in your documents as "{dup[0]}".')
  if not self.busy.acquire(blocking=False):raise ImportError_('Another document is still being added. Try again when it finishes.')
  try:
   doc_id=time.strftime('%Y%m%d%H%M%S')+'-'+sha[:8]
   safe=re.sub(r'[^\w.\- ()]+','_',filename)[:120]
   rel=f'{PREFIX}{doc_id}/{safe}'
   pages,title,year=read(ext,data,filename)
   kind='pdf' if ext=='.pdf' else 'text'
   chunks=[]
   for n,text in pages:
    for k,w in enumerate(windows(text)):
     cid=f'{rel}#p{n}'+(f'.{k}' if k else '') if kind=='pdf' else f'{rel}#{k}'
     chunks.append({'id':cid,'kind':kind,'doc':rel,'title':title,'path':rel,'page':n if kind=='pdf' else None,'url':None,'text':w,'year':year,'dated':'file' if year else None})
   if not chunks:
    raise ImportError_(f'No text could be read from {filename}. If it is a scan or photos of pages, it needs a text version (OCR) first.')
   vecs=[];progress(0,len(chunks))
   for i in range(0,len(chunks),16):
    vecs+=embed([c['title']+'\n'+c['text'] for c in chunks[i:i+16]]);progress(len(vecs),len(chunks))
   folder=FILES/doc_id;folder.mkdir(parents=True);(folder/safe).write_bytes(data)
   row={'id':doc_id,'title':title,'filename':filename,'path':rel,'type':TYPES[ext],'pages':len(pages) if kind=='pdf' else None,
        'passages':len(chunks),'year':year,'sha256':sha,'added':time.time(),'embed_model':EMBED_MODEL}
   with self.lock:
    self.con.execute('INSERT INTO docs VALUES (:id,:title,:filename,:path,:type,:pages,:passages,:year,:sha256,:added,:embed_model)',row)
    for c,v in zip(chunks,vecs):
     self.con.execute('INSERT INTO chunks VALUES (:id,:kind,:doc,:title,:path,:page,:url,:text,:year,:dated)',c)
     self.con.execute('INSERT INTO vectors VALUES (?,?)',(c['id'],array('f',v).tobytes()))
     self.con.execute('INSERT INTO fts VALUES (?,?,?)',(c['id'],c['title'],c['text']))
    self.con.commit()
   self.lib.add_chunks(chunks,vecs)
   return {k:row[k] for k in ('id','title','filename','path','type','pages','passages','year','added')}
  finally:self.busy.release()

 def remove(self,doc_id):
  with self.lock:
   r=self.con.execute('SELECT path FROM docs WHERE id=?',(doc_id,)).fetchone()
   if not r:return False
   rel=r[0];ids=[x[0] for x in self.con.execute('SELECT id FROM chunks WHERE doc=?',(rel,))]
   self.con.executemany('DELETE FROM vectors WHERE id=?',[(i,) for i in ids])
   self.con.executemany('DELETE FROM fts WHERE id=?',[(i,) for i in ids])
   self.con.execute('DELETE FROM chunks WHERE doc=?',(rel,));self.con.execute('DELETE FROM docs WHERE id=?',(doc_id,))
   self.con.commit()
  self.lib.remove_doc(rel)
  folder=FILES/doc_id
  if folder.is_dir():
   for f in folder.iterdir():f.unlink()
   folder.rmdir()
  return True

 def file(self,rel):
  """Resolve a "user-docs/<id>/<name>" path to the stored file, or None."""
  target=(FILES/rel[len(PREFIX):]).resolve()
  return target if target.is_file() and target.is_relative_to(FILES.resolve()) else None

def read(ext,data,filename):
 """[(page number, text)], title, year. Text files count as one page."""
 if ext=='.pdf':
  from pypdf import PdfReader
  try:reader=PdfReader(BytesIO(data))
  except Exception:raise ImportError_(f'{filename} could not be opened as a PDF.')
  if reader.is_encrypted:
   try:reader.decrypt('')
   except Exception:raise ImportError_(f'{filename} is password-protected.')
  pages=[]
  for n,page in enumerate(reader.pages,1):
   try:t=clean(page.extract_text() or '')
   except Exception:t=''
   if len(t)>=40:pages.append((n,t))
  meta=reader.metadata or {}
  title=str(meta.get('/Title') or '').strip()
  # PDF titles are often junk ("Microsoft Word - draft3.doc", "untitled"); fall back to the file name.
  if len(title)<4 or re.search(r'^(untitled|microsoft|document\d*$)|\.(docx?|pdf|indd)$',title,re.I):title=nice(filename)
  year=None
  try:year=reader.metadata.creation_date.year if reader.metadata and reader.metadata.creation_date else None
  except Exception:pass
  return pages,title[:150],year
 if ext=='.docx':
  try:xml=zipfile.ZipFile(BytesIO(data)).read('word/document.xml').decode('utf8',errors='replace')
  except Exception:raise ImportError_(f'{filename} could not be opened as a Word document.')
  xml=re.sub(r'</w:p>','\n',xml);xml=re.sub(r'<w:tab/>',' ',xml)
  text=re.sub(r'<[^>]+>','',xml)
  text=re.sub(r'&lt;','<',re.sub(r'&gt;','>',re.sub(r'&quot;','"',re.sub(r'&apos;',"'",text)))).replace('&amp;','&')
 else:
  text=data.decode('utf8',errors='replace')
 text=clean(text)
 return ([(1,text)] if len(text)>=40 else []),nice(filename)[:150],None
