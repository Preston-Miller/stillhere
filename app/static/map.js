// Offline map tab: MapLibre rendering vector tiles served by the local server from the installed state files,
// plus the "Map regions" picker for downloading/removing states. Everything here works offline except downloads.
import * as maplibregl from './vendor/maplibre-gl.mjs';
import * as geo from './coords.js';

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const gb=b=>b>=1e9?(b/1e9).toFixed(1)+' GB':Math.round(b/1e6)+' MB';
let map=null,info=null,poll=null,installedKey='',selected=new Set(),filter='';
let userMoved=false;   // until the person pans/zooms, keep the downloaded states framed as the window settles
let outlines=null;     // simplified state outlines (vendor/states.geojson, built by maps-build/make_outlines.py)
const outlinesReady=fetch('/vendor/states.geojson').then(r=>r.json()).then(d=>{outlines=d;updateOverlays();updateHint()}).catch(e=>console.warn('No state outlines',e));

function flavor(){return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
function style(version){
 const o=location.origin,f=flavor();
 return {version:8,
  glyphs:o+'/vendor/fonts/{fontstack}/{range}.pbf',
  sprite:o+'/vendor/sprites/'+f,
  sources:{protomaps:{type:'vector',tiles:[o+'/tiles/{z}/{x}/{y}.mvt?v='+version],maxzoom:15,
   attribution:'<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors</a> · <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>'}},
  layers:window.basemaps.layers('protomaps',window.basemaps.namedFlavor(f),{lang:'en'})};
}
function dark(){return flavor()==='dark'}
function unionBounds(installed){
 const b=Object.values(installed).map(s=>s.bounds);if(!b.length)return null;
 return [[Math.min(...b.map(x=>x[0])),Math.min(...b.map(x=>x[1]))],[Math.max(...b.map(x=>x[2])),Math.max(...b.map(x=>x[3]))]];
}

async function load(){
 info=await fetch('/api/maps').then(r=>r.json());
 // Tile cache key: which state files are installed, with their sizes, so a replaced file gets fresh tiles.
 const key=Object.keys(info.installed).sort().map(c=>c+info.installed[c].bytes).join(',');
 const any=key.length>0;
 $('#mapEmpty').hidden=any;
 if(any&&!map){
  // Come back to where the person left the map (survives a refresh); otherwise frame the downloaded states.
  let cam=null;try{cam=JSON.parse(localStorage.getItem('mapCamera'))}catch{}
  if(cam&&Array.isArray(cam.center))userMoved=true;else cam=null;
  map=new maplibregl.Map({container:'map',style:style(key),...(cam?{center:cam.center,zoom:cam.zoom,bearing:cam.bearing||0}:{bounds:unionBounds(info.installed),fitBoundsOptions:{padding:20}}),attributionControl:{compact:true},maxZoom:17});
  map.on('moveend',()=>{if(!userMoved)return;const c=map.getCenter();try{localStorage.setItem('mapCamera',JSON.stringify({center:[+c.lng.toFixed(5),+c.lat.toFixed(5)],zoom:+map.getZoom().toFixed(2),bearing:+map.getBearing().toFixed(1)}))}catch{}});
  // The map is often created while the window or sidebar is still settling; refit until the person moves it themselves.
  new ResizeObserver(()=>{map.resize();if(!userMoved&&info&&Object.keys(info.installed).length)map.fitBounds(unionBounds(info.installed),{padding:20,duration:0})}).observe(document.getElementById('map'));
  map.on('movestart',e=>{if(e.originalEvent)userMoved=true});
  map.on('error',e=>console.error('Map error:',e.error?.message||e.error||e));
  map.on('style.load',addOverlays);   // also after the light/dark style swap, which drops runtime layers
  map.on('moveend',updateHint);
  map.on('click',onMapClick);
  bindPinEvents();
  loadPins();
  map.addControl(new maplibregl.NavigationControl({visualizePitch:false}),'top-right');
  map.addControl(new maplibregl.ScaleControl({unit:'imperial'}),'bottom-left');
  map.addControl(readoutControl,'bottom-left');
  bindCoordEvents();
 }else if(any&&key!==installedKey){
  // States were added/removed: re-request tiles and frame the new set.
  map.getSource('protomaps')?.setTiles([location.origin+'/tiles/{z}/{x}/{y}.mvt?v='+key]);
  map.fitBounds(unionBounds(info.installed),{padding:20,duration:0});
 }
 installedKey=key;
 updateOverlays();updateHint();
 if(!$('#regions').hidden)renderRegions();
 const busy=Object.values(info.jobs||{}).some(j=>j.state==='downloading');
 clearTimeout(poll);if(busy)poll=setTimeout(load,1000);
}

function renderRegions(){
 const inst=info.installed,jobs=info.jobs||{};
 const cat=(info.catalog?.states)||[];
 const byCode=new Map(cat.map(s=>[s.code,s]));
 for(const c of Object.keys(inst))if(!byCode.has(c))byCode.set(c,{code:c,name:c,bytes:inst[c].bytes});
 const rows=[...byCode.values()].sort((a,b)=>a.name.localeCompare(b.name)).filter(s=>!filter||s.name.toLowerCase().includes(filter)||s.code.toLowerCase()===filter);
 const used=Object.values(inst).reduce((n,s)=>n+s.bytes,0);
 $('#regionsNote').innerHTML=info.catalog_error?`<span class="warn">${esc(info.catalog_error)}</span>`:
  `Street-level maps of the states you pick, stored on this computer. Internet is needed only while downloading. Using ${gb(used)}.`;
 $('#regionsList').innerHTML=rows.map(s=>{
  const j=jobs[s.code];const installed=!!inst[s.code];
  let right;
  if(j&&j.state==='downloading'){const pct=j.total?Math.floor(100*j.done/j.total):0;right=`<span class="rprog"><span style="width:${pct}%"></span></span><span class="rsize">${pct}%</span>`}
  else if(installed)right=`<span class="rok">Downloaded</span><button class="rbtn" data-remove="${s.code}">Remove</button>`;
  else if(j&&j.state==='error')right=`<span class="warn" title="${esc(j.error||'')}">Failed</span><button class="rbtn" data-retry="${s.code}">Retry</button>`;
  else right=`<span class="rsize">${gb(s.bytes)}</span>`;
  const box=installed||(j&&j.state==='downloading')?'<span class="rbox"></span>':`<input type="checkbox" data-code="${s.code}" ${selected.has(s.code)?'checked':''} aria-label="Select ${esc(s.name)}">`;
  return `<label class="rrow">${box}<span class="rname">${esc(s.name)}</span>${right}</label>`;
 }).join('')||'<div class="rnone">No states match.</div>';
 const pick=[...selected].filter(c=>byCode.has(c)&&!inst[c]);
 const total=pick.reduce((n,c)=>n+(byCode.get(c).bytes||0),0);
 const btn=$('#regionsGo');btn.disabled=!pick.length;btn.textContent=pick.length?`Download ${pick.length} state${pick.length>1?'s':''} (${gb(total)})`:'Select states to download';
 $('#regionsList').querySelectorAll('input[data-code]').forEach(cb=>cb.onchange=()=>{cb.checked?selected.add(cb.dataset.code):selected.delete(cb.dataset.code);renderRegions()});
 $('#regionsList').querySelectorAll('[data-remove]').forEach(b=>b.onclick=async e=>{e.preventDefault();
  const name=byCode.get(b.dataset.remove)?.name||b.dataset.remove;
  if(!await window.appConfirm({title:`Remove the ${name} map?`,message:'It will be deleted from this computer. You can download it again later.',ok:'Remove'}))return;
  await fetch('/api/maps/'+b.dataset.remove,{method:'DELETE'});load()});
 $('#regionsList').querySelectorAll('[data-retry]').forEach(b=>b.onclick=async e=>{e.preventDefault();await fetch(`/api/maps/${b.dataset.retry}/install`,{method:'POST'});load()});
}

$('#regionsGo').onclick=async()=>{
 const codes=[...selected].filter(c=>!info.installed[c]);selected.clear();
 // Downloads run one at a time on the server side per request; start them all and poll progress.
 for(const c of codes)await fetch(`/api/maps/${c}/install`,{method:'POST'});
 load();
};
$('#regionsSearch').oninput=e=>{filter=e.target.value.trim().toLowerCase();renderRegions()};
function openRegions(open){$('#regions').hidden=!open;if(open)$('#pinsPanel').hidden=true;if(open){load().then(renderRegions);$('#regionsSearch').focus()}}
$('#regionsBtn').onclick=()=>openRegions($('#regions').hidden);
$('#regionsClose').onclick=()=>openRegions(false);
$('#mapEmptyBtn').onclick=()=>openRegions(true);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(map)map.setStyle(style(installedKey),{diff:false})});

// ---------------- coverage: shade what isn't downloaded, and say so ----------------
const WORLD=[[-180,-85],[180,-85],[180,85],[-180,85],[-180,-85]];
function installedOutlines(){return (outlines?.features||[]).filter(f=>info?.installed[f.properties.code])}
function maskData(){
 const holes=installedOutlines().flatMap(f=>f.geometry.coordinates.map(p=>p[0]));
 return {type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[WORLD,...holes]}};
}
function edgeData(){return {type:'FeatureCollection',features:installedOutlines()}}
function updateOverlays(){
 if(!map||!outlines)return;
 map.getSource('cover-mask')?.setData(maskData());map.getSource('cover-edge')?.setData(edgeData());
}
function addOverlays(){
 const d=dark();
 if(!map.getSource('cover-mask')){
  map.addSource('cover-mask',{type:'geojson',data:outlines?maskData():{type:'FeatureCollection',features:[]}});
  map.addSource('cover-edge',{type:'geojson',data:outlines?edgeData():{type:'FeatureCollection',features:[]}});
  map.addLayer({id:'cover-mask',type:'fill',source:'cover-mask',paint:{'fill-color':d?'#000':'#2b2d29','fill-opacity':d?.45:.28}});
  map.addLayer({id:'cover-edge',type:'line',source:'cover-edge',paint:{'line-color':d?'#7cc59e':'#2f6f4f','line-width':1.5,'line-opacity':.75}});
 }
 addPinLayers();
 addMeasureLayers();
}
function inRing(x,y,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
function stateAt(lng,lat){return (outlines?.features||[]).find(f=>f.geometry.coordinates.some(p=>inRing(lng,lat,p[0])))?.properties||null}
const coverHint=document.createElement('div');coverHint.className='coverhint';coverHint.hidden=true;$('#mapPane').appendChild(coverHint);
function updateHint(){
 if(!map||!outlines||!info||map.getZoom()<7){coverHint.hidden=true;return}
 const c=map.getCenter(),st=stateAt(c.lng,c.lat);
 if(st&&info.installed[st.code]){coverHint.hidden=true;return}
 if(st){
  const e=(info.catalog?.states||[]).find(s=>s.code===st.code);
  coverHint.innerHTML=`<span>${esc(st.name)} isn’t downloaded, so there’s no detail here.</span><button type="button">Download ${esc(st.name)}${e?` (${gb(e.bytes)})`:''}</button>`;
  coverHint.querySelector('button').onclick=()=>{selected.add(st.code);openRegions(true)};
 }else coverHint.innerHTML='<span>This area isn’t covered. Offline maps are available for US states.</span>';
 coverHint.hidden=false;
}

// ---------------- pins ----------------
// Drawn as a map layer (not DOM markers) so nearby pins group into a numbered bubble when zoomed out.
const KINDS={meeting:['Meeting point','#2f6fd0'],water:['Water','#1b9ad6'],shelter:['Shelter','#2f8f4f'],supplies:['Supplies / cache','#8d6e3f'],
 medical:['Medical','#c0392b'],danger:['Danger','#e8590c'],other:['Other','#6a6d66']};
let pins=[],placing=false,pinsLoaded=false,popup=null,drag=null;
function newId(){return crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}

async function loadPins(){
 if(pinsLoaded)return;pinsLoaded=true;
 pins=await fetch('/api/pins').then(r=>r.json()).catch(()=>[]);
 refreshPins();renderPinList();
}
function savePins(){
 fetch('/api/pins',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(pins.filter(p=>!p._new).map(({_new,...p})=>p))})
  .catch(e=>console.warn('Could not save pins',e));
 renderPinList();
}
function pinData(){return {type:'FeatureCollection',features:pins.map(p=>({type:'Feature',properties:{id:p.id,label:p.label||'',kind:KINDS[p.kind]?p.kind:'other'},geometry:{type:'Point',coordinates:[p.lng,p.lat]}}))}}
function refreshPins(){map?.getSource('pins')?.setData(pinData())}
function pinImage(color){
 const r=2,w=26,h=34,c=document.createElement('canvas');c.width=w*r;c.height=h*r;
 const g=c.getContext('2d');g.scale(r,r);
 g.beginPath();g.moveTo(13,32);g.bezierCurveTo(10,27,2,20,2,13);g.arc(13,13,11,Math.PI,0);g.bezierCurveTo(24,20,16,27,13,32);g.closePath();
 g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=3;g.shadowOffsetY=1;g.fillStyle=color;g.fill();
 g.shadowColor='transparent';g.lineWidth=2;g.strokeStyle='#fff';g.stroke();
 g.beginPath();g.arc(13,13,4,0,2*Math.PI);g.fillStyle='#fff';g.fill();
 return {img:{width:w*r,height:h*r,data:g.getImageData(0,0,w*r,h*r).data},r};
}
function addPinLayers(){
 if(map.getSource('pins'))return;
 const d=dark(),accent=d?'#3f8a63':'#2f6f4f';
 for(const [k,[,color]] of Object.entries(KINDS)){const {img,r}=pinImage(color);map.addImage('pin-'+k,img,{pixelRatio:r})}
 map.addSource('pins',{type:'geojson',data:pinData(),cluster:true,clusterRadius:36,clusterMaxZoom:12});
 map.addLayer({id:'pin-clusters',type:'circle',source:'pins',filter:['has','point_count'],
  paint:{'circle-color':accent,'circle-radius':['step',['get','point_count'],17,10,21,50,25],'circle-stroke-width':2,'circle-stroke-color':'#fff'}});
 map.addLayer({id:'pin-count',type:'symbol',source:'pins',filter:['has','point_count'],
  layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Noto Sans Medium'],'text-size':14,'text-allow-overlap':true},paint:{'text-color':'#fff'}});
 map.addLayer({id:'pins',type:'symbol',source:'pins',filter:['!',['has','point_count']],
  layout:{'icon-image':['concat','pin-',['get','kind']],'icon-anchor':'bottom','icon-allow-overlap':true,'icon-size':1.25,
   'text-field':['get','label'],'text-font':['Noto Sans Medium'],'text-size':14,'text-anchor':'top','text-offset':[0,.25],'text-max-width':12,'text-optional':true},
  paint:{'text-color':d?'#e7e8e3':'#1d1f1c','text-halo-color':d?'#151714':'#fff','text-halo-width':1.6}});
}
function bindPinEvents(){
 const cv=map.getCanvas();
 for(const id of ['pins','pin-clusters']){
  map.on('mouseenter',id,()=>{if(!drag&&!placing&&!measuring)cv.style.cursor='pointer'});
  map.on('mouseleave',id,()=>{if(!drag&&!placing&&!measuring)cv.style.cursor=''});
 }
 map.on('click','pin-clusters',async e=>{
  if(placing||measuring)return;const f=e.features[0];
  // Frame the pins inside the bubble; zooming to the "expansion zoom" can leave them still grouped.
  const leaves=await map.getSource('pins').getClusterLeaves(f.properties.cluster_id,Infinity);
  const b=new maplibregl.LngLatBounds();leaves.forEach(l=>b.extend(l.geometry.coordinates));
  const cam=map.cameraForBounds(b,{padding:90,maxZoom:16});
  userMoved=true;map.easeTo({...cam,zoom:Math.max(cam.zoom,13)});   // pins stop grouping above zoom 12
 });
 map.on('click','pins',e=>{if(placing||measuring)return;const p=pins.find(x=>x.id===e.features[0].properties.id);if(p)editPin(p)});
 // Drag a pin to move it; the move can be undone from the notice instead of confirming first.
 map.on('mousedown','pins',e=>{
  if(placing||measuring||e.originalEvent.button!==0)return;
  const p=pins.find(x=>x.id===e.features[0].properties.id);if(!p)return;
  e.preventDefault();drag={p,start:e.point,from:[p.lng,p.lat],moved:false};
 });
 map.on('mousemove',e=>{
  if(!drag)return;
  if(!drag.moved){if(Math.hypot(e.point.x-drag.start.x,e.point.y-drag.start.y)<4)return;drag.moved=true;popup?.remove();cv.style.cursor='grabbing'}
  drag.p.lng=+e.lngLat.lng.toFixed(6);drag.p.lat=+e.lngLat.lat.toFixed(6);refreshPins();
 });
 const end=()=>{
  if(!drag)return;const d=drag;drag=null;cv.style.cursor='';
  if(!d.moved||d.p._new)return;
  savePins();
  toast(`Moved “${d.p.label||'Untitled pin'}”.`,()=>{[d.p.lng,d.p.lat]=d.from;refreshPins();savePins()});
 };
 map.on('mouseup',end);cv.addEventListener('mouseleave',end);
}
function removePin(p){pins=pins.filter(x=>x!==p);refreshPins();savePins()}
function editPin(p){
 popup?.remove();
 const f=document.createElement('form');f.className='pinform';
 f.innerHTML=`<input name="label" maxlength="80" placeholder="Label (e.g. Family meeting spot)">
  <select name="kind">${Object.entries(KINDS).map(([k,[n]])=>`<option value="${k}">${n}</option>`).join('')}</select>
  <textarea name="note" maxlength="1000" placeholder="Notes (optional)"></textarea>
  <div class="coords">${esc(fmtCoord(p.lat,p.lng))}</div>
  <div class="row"><button type="button" class="del">Delete</button><button type="submit" class="save">Save</button></div>`;
 f.label.value=p.label;f.kind.value=KINDS[p.kind]?p.kind:'other';f.note.value=p.note||'';
 let saved=false;
 f.onsubmit=e=>{e.preventDefault();
  p.label=f.label.value.trim();p.kind=f.kind.value;p.note=f.note.value.trim();delete p._new;saved=true;
  refreshPins();savePins();popup.remove()};
 f.querySelector('.del').onclick=()=>{
  const wasNew=p._new;saved=true;removePin(p);popup.remove();
  if(!wasNew)toast(`Deleted “${p.label||'Untitled pin'}”.`,()=>{pins.push(p);refreshPins();savePins()});
 };
 popup=new maplibregl.Popup({offset:[0,-43],maxWidth:'280px',closeOnClick:true}).setLngLat([p.lng,p.lat]).setDOMContent(f).addTo(map);
 // A brand-new pin that is closed without saving is discarded.
 popup.on('close',()=>{if(p._new&&!saved)removePin(p)});
 setTimeout(()=>f.label.focus(),0);
}
const toastEl=document.createElement('div');toastEl.className='maptoast';toastEl.hidden=true;toastEl.setAttribute('role','status');$('#mapPane').appendChild(toastEl);
let toastTimer=0;
function toast(msg,undo){
 toastEl.innerHTML='<span></span>'+(undo?'<button type="button">Undo</button>':'');toastEl.firstChild.textContent=msg;
 if(undo)toastEl.querySelector('button').onclick=()=>{toastEl.hidden=true;clearTimeout(toastTimer);undo()};
 toastEl.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toastEl.hidden=true},7000);
}
function setPlacing(on){
 if(on&&measuring)endMeasure();
 placing=on;$('#addPinBtn').classList.toggle('on',on);$('#pinHint').hidden=!on;
 if(map)map.getCanvas().style.cursor=on?'crosshair':'';
}
function renderPinList(){
 const saved=pins.filter(p=>!p._new);
 $('#pinsBtn').textContent=saved.length?`Pins (${saved.length})`:'Pins';
 const list=saved.sort((a,b)=>(a.label||'~').localeCompare(b.label||'~'));
 $('#pinsList').innerHTML=list.map(p=>`<div class="rrow" data-id="${esc(p.id)}"><span class="pdot" style="background:${KINDS[p.kind]?.[1]||KINDS.other[1]}"></span><span class="rname">${esc(p.label||'Untitled pin')}${p.note?`<br><span class="rsize">${esc(p.note.slice(0,80))}</span>`:''}</span><span class="rsize">${esc(KINDS[p.kind]?.[0]||'Other')}</span></div>`).join('')
  ||'<div class="rnone">No pins yet. Use “+ Add pin” and click the map.</div>';
 $('#pinsList').querySelectorAll('.rrow').forEach(r=>r.onclick=()=>{
  const p=pins.find(x=>x.id===r.dataset.id);if(!p)return;
  userMoved=true;map.flyTo({center:[p.lng,p.lat],zoom:Math.max(map.getZoom(),14)});
  map.once('moveend',()=>editPin(p));
 });
}
function onMapClick(e){
 if(measuring){addMeasurePoint([e.lngLat.lng,e.lngLat.lat]);return}
 if(!placing)return;
 setPlacing(false);
 const p={id:newId(),lng:+e.lngLat.lng.toFixed(6),lat:+e.lngLat.lat.toFixed(6),label:'',kind:'other',note:'',_new:true};
 pins.push(p);refreshPins();editPin(p);
}
$('#addPinBtn').onclick=()=>{if(!map){openRegions(true);return}$('#pinsPanel').hidden=true;setPlacing(!placing)};
$('#pinsBtn').onclick=()=>{if(!map)return;const open=$('#pinsPanel').hidden;$('#pinsPanel').hidden=!open;$('#regions').hidden=true;if(open)renderPinList()};
$('#pinsClose').onclick=()=>{$('#pinsPanel').hidden=true};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&placing)setPlacing(false)});

// ---------------- coordinates: live readout, right-click a spot to copy it ----------------
const FORMATS={dd:['DD','Decimal degrees',geo.fmtDD],dms:['DMS','Degrees, minutes, seconds',geo.fmtDMS],
 usng:['USNG','US National Grid (search and rescue)',geo.fmtUSNG],utm:['UTM','UTM',geo.fmtUTM]};
let coordFmt='dd';try{coordFmt=localStorage.getItem('coordFmt')||'dd'}catch{}
if(!FORMATS[coordFmt])coordFmt='dd';
function fmtCoord(lat,lng,f=coordFmt){return FORMATS[f][2](lat,lng)}
const readout=document.createElement('button');readout.type='button';readout.className='coordread';
readout.title='Position under the cursor (or the map center). Click to switch format. Right-click the map to copy a spot.';
let readoutAt=null;   // cursor position, or null for the map center
function paintReadout(){
 if(!map)return;const c=readoutAt||map.getCenter();
 readout.innerHTML=`<span class="k">${FORMATS[coordFmt][0]}</span>${esc(fmtCoord(c.lat,c.lng))}`;
}
readout.onclick=()=>{
 const ks=Object.keys(FORMATS);coordFmt=ks[(ks.indexOf(coordFmt)+1)%ks.length];
 try{localStorage.setItem('coordFmt',coordFmt)}catch{}
 paintReadout();
};
const readoutControl={onAdd(){const d=document.createElement('div');d.className='maplibregl-ctrl';d.appendChild(readout);return d},onRemove(){}};
function bindCoordEvents(){
 map.on('mousemove',e=>{readoutAt=e.lngLat;paintReadout();if(measuring){mHover=[e.lngLat.lng,e.lngLat.lat];paintMeasure()}});
 map.getCanvas().addEventListener('mouseleave',()=>{readoutAt=null;paintReadout();if(measuring){mHover=null;paintMeasure()}});
 map.on('move',()=>{if(!readoutAt)paintReadout()});
 map.on('contextmenu',e=>{if(!measuring&&!placing)openSpotMenu(e.lngLat)});
 map.on('dblclick',e=>{if(measuring){e.preventDefault();endMeasure()}});
 paintReadout();
}
function openSpotMenu(ll){
 popup?.remove();
 const box=document.createElement('div');box.className='spotmenu';
 box.innerHTML='<div class="h">Copy this spot</div>'+Object.entries(FORMATS).map(([k,[,name]])=>
  `<button type="button" data-copy="${k}"><span class="v">${esc(fmtCoord(ll.lat,ll.lng,k))}</span><span class="n">${esc(name)}</span></button>`).join('')+
  '<div class="sep"></div><button type="button" data-a="measure">Measure from here</button><button type="button" data-a="pin">Add pin here</button>';
 popup=new maplibregl.Popup({closeButton:false,maxWidth:'320px',offset:6}).setLngLat(ll).setDOMContent(box).addTo(map);
 box.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{popup.remove();copyText(fmtCoord(ll.lat,ll.lng,b.dataset.copy))});
 box.querySelector('[data-a=measure]').onclick=()=>{popup.remove();startMeasure([ll.lng,ll.lat])};
 box.querySelector('[data-a=pin]').onclick=()=>{
  popup.remove();
  const p={id:newId(),lng:+ll.lng.toFixed(6),lat:+ll.lat.toFixed(6),label:'',kind:'other',note:'',_new:true};
  pins.push(p);refreshPins();editPin(p);
 };
}
async function copyText(t){
 try{await navigator.clipboard.writeText(t)}
 catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
 toast(`Copied ${t}`);
}

// ---------------- measure: click points for distance and bearing ----------------
let measuring=false,mPts=[],mHover=null;
const mBar=document.createElement('div');mBar.className='measurebar';mBar.hidden=true;$('#mapPane').appendChild(mBar);
function mLine(){return measuring&&mHover&&mPts.length?[...mPts,mHover]:mPts}
function measureData(){
 const line=mLine(),f=[];
 if(line.length>1)f.push({type:'Feature',properties:{kind:'line'},geometry:{type:'LineString',coordinates:line}});
 mPts.forEach(c=>f.push({type:'Feature',properties:{kind:'pt'},geometry:{type:'Point',coordinates:c}}));
 return {type:'FeatureCollection',features:f};
}
function addMeasureLayers(){
 if(map.getSource('measure'))return;
 const ink=dark()?'#f2c94c':'#d9480f';
 map.addSource('measure',{type:'geojson',data:measureData()});
 map.addLayer({id:'measure-line',type:'line',source:'measure',filter:['==',['get','kind'],'line'],layout:{'line-cap':'round','line-join':'round'},
  paint:{'line-color':ink,'line-width':3,'line-dasharray':[2,1.5]}});
 map.addLayer({id:'measure-pts',type:'circle',source:'measure',filter:['==',['get','kind'],'pt'],
  paint:{'circle-radius':6,'circle-color':'#fff','circle-stroke-color':ink,'circle-stroke-width':2.5}});
}
function paintMeasure(){
 map?.getSource('measure')?.setData(measureData());
 if(!measuring&&!mPts.length){mBar.hidden=true;return}
 const line=mLine();let total=0;
 for(let i=1;i<line.length;i++)total+=geo.distance(line[i-1],line[i]);
 let txt;
 if(line.length<2)txt=mPts.length?'Click the next point':'Click the map where you want to start';
 else{
  const br=geo.bearing(line[line.length-2],line[line.length-1]);
  txt=`<b>${geo.fmtDistance(total)}</b><span class="dot">·</span>${line.length>2?'last leg ':''}${String(Math.round(br)%360).padStart(3,'0')}° ${geo.compass(br)}`+
   ` <span class="tn" title="Bearings are from true north. A compass points to magnetic north, which differs by up to about 15° across the US; check the declination for your area.">true</span>`;
 }
 const btns=measuring
  ?`<button type="button" data-a="undo" ${mPts.length?'':'disabled'}>Undo point</button><button type="button" data-a="done" class="pri">Done</button>`
  :`<button type="button" data-a="again">Measure again</button><button type="button" data-a="clear" class="pri">Clear</button>`;
 mBar.innerHTML=`<span class="mt">${txt}</span>${btns}`;
 mBar.hidden=false;
 const on=(a,f)=>{const b=mBar.querySelector(`[data-a=${a}]`);if(b)b.onclick=f};
 on('undo',()=>{mPts.pop();paintMeasure()});on('done',endMeasure);on('clear',clearMeasure);on('again',()=>startMeasure());
}
function addMeasurePoint(pt){
 const last=mPts[mPts.length-1];
 if(last){const a=map.project(last),b=map.project(pt);if(Math.hypot(a.x-b.x,a.y-b.y)<4)return}   // the second click of a double-click
 mPts.push(pt);paintMeasure();
}
function startMeasure(first){
 if(!map){openRegions(true);return}
 setPlacing(false);popup?.remove();
 measuring=true;mPts=first?[first]:[];mHover=null;
 map.doubleClickZoom.disable();map.getCanvas().style.cursor='crosshair';$('#measureBtn').classList.add('on');
 paintMeasure();
}
function endMeasure(){
 if(!measuring)return;
 measuring=false;mHover=null;if(mPts.length<2)mPts=[];
 map.doubleClickZoom.enable();map.getCanvas().style.cursor='';$('#measureBtn').classList.remove('on');
 paintMeasure();
}
function clearMeasure(){endMeasure();mPts=[];paintMeasure()}
$('#measureBtn').onclick=()=>measuring?endMeasure():startMeasure();
document.addEventListener('keydown',e=>{
 if(!measuring||e.target.closest?.('input,textarea,select'))return;
 if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();endMeasure()}
 else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();mPts.pop();paintMeasure()}
});

// ---------------- search: places, streets and points of interest in installed states, or coordinates ----------------
// Accepts "40.2338, -111.6585", "40.2338 N 111.6585 W" and degrees-minutes-seconds like 40°14'02"N 111°39'31"W.
function parseCoords(s){
 const t=s.toUpperCase().replace(/[°º'’′"”″]/g,' ').replace(/\s+/g,' ').trim();
 const m=t.match(/^([NS])?\s*(-?\d+(?:\.\d+)?(?: \d+(?:\.\d+)?){0,2})\s*([NS])?\s*[, ]\s*([EW])?\s*(-?\d+(?:\.\d+)?(?: \d+(?:\.\d+)?){0,2})\s*([EW])?$/);
 if(!m)return null;
 const dms=v=>{const [d,mi=0,se=0]=v.split(' ').map(Number);const sg=d<0?-1:1;return sg*(Math.abs(d)+mi/60+se/3600)};
 let lat=dms(m[2]),lng=dms(m[5]);
 if((m[1]||m[3])==='S')lat=-Math.abs(lat);
 if((m[4]||m[6])==='W')lng=-Math.abs(lng);
 if(Math.abs(lat)>90&&Math.abs(lng)<=90&&!m[1]&&!m[3])[lat,lng]=[lng,lat];   // typed as lon, lat
 if(Math.abs(lat)>90||Math.abs(lng)>180)return null;
 return {lat,lng};
}
const ZOOM_FOR={City:12,Town:13,Village:14,Hamlet:14,Place:14,Neighborhood:15,District:14,County:10,River:13,Stream:14,Water:13,Lake:13,Reservoir:13,Highway:13,Road:15,Street:16,Trail:15};
const PIN_KIND=l=>/hospital|clinic|doctor|pharmacy|dentist|first aid/i.test(l)?'medical':/spring|water|lake|reservoir|river|stream/i.test(l)?'water':/camp|shelter|hut/i.test(l)?'shelter':/fuel|gas|supermarket|grocery|convenience|hardware/i.test(l)?'supplies':'other';
let sTimer=0,sSeq=0,sItems=[],sOn=-1,sMarker=null;
const sBox=$('#mapSearch'),sList=$('#mapResults');
function fmt(v){return v.toFixed(5)}
function renderResults(items,q){
 sItems=items;sOn=items.length?0:-1;
 if(!q){sList.hidden=true;return}
 sList.innerHTML=items.length?items.map((r,i)=>`<button role="option" data-i="${i}" class="${i===sOn?'on':''}">${esc(r.name)}<span class="sub">${esc(r.sub)}</span></button>`).join('')
  :`<div class="none">${map?'No matches in your downloaded states. Street addresses aren’t searchable; try the street or town name.':'Download a state to search the map.'}</div>`;
 sList.hidden=false;
 sList.querySelectorAll('button').forEach(b=>b.onmousedown=e=>{e.preventDefault();pick(sItems[+b.dataset.i])});
}
async function runSearch(){
 const q=sBox.value.trim(),seq=++sSeq;
 if(!q){renderResults([],'');return}
 const items=[];const c=parseCoords(q);
 if(c)items.push({name:`Go to ${fmt(c.lat)}, ${fmt(c.lng)}`,sub:'Coordinates',lat:c.lat,lng:c.lng,label:'Coordinates',zoom:15,coords:true});
 // Grid references (US National Grid / MGRS, UTM). A grid with the zone left off uses the zone on screen.
 const g=c?null:geo.parseGrid(q,map?map.getCenter():null);
 if(g){
  const sq=g.precision>=1000?`${g.precision/1000} km square`:g.precision>1?`${g.precision} m square`:'';
  items.push({name:`Go to ${g.text}`,sub:[g.kind,sq].filter(Boolean).join(' · '),lat:g.lat,lng:g.lng,label:'Coordinates',
   zoom:g.precision>=1e5?8:g.precision>=1e4?11:g.precision>=1e3?13:g.precision>=100?15:16,coords:true,title:g.text});
 }
 if(map&&q.length>=2&&!c){
  const ctr=map.getCenter();
  const r=await fetch(`/api/search?q=${encodeURIComponent(q)}&lon=${ctr.lng.toFixed(4)}&lat=${ctr.lat.toFixed(4)}`).then(r=>r.json()).catch(()=>({results:[]}));
  if(seq!==sSeq)return;   // a newer keystroke already ran
  for(const x of r.results)items.push({name:x.name,sub:[x.label,x.town||x.state].filter(Boolean).join(' · '),lat:x.lat,lng:x.lon,label:x.label,zoom:ZOOM_FOR[x.label]||16});
 }
 renderResults(items,q);
}
function pick(r){
 if(!r||!map)return;
 sList.hidden=true;sBox.blur();userMoved=true;
 map.flyTo({center:[r.lng,r.lat],zoom:Math.max(map.getZoom(),r.zoom),essential:true});
 sMarker?.remove();popup?.remove();
 const el=document.createElement('div');el.className='searchdot';
 sMarker=new maplibregl.Marker({element:el}).setLngLat([r.lng,r.lat]).addTo(map);
 const box=document.createElement('div');box.className='spop';
 box.innerHTML=`<b>${esc(r.coords?(r.title||'Coordinates'):r.name)}</b>${r.coords?'':`<span class="sub">${esc(r.sub)}</span>`}<div class="ll">${esc(fmtCoord(r.lat,r.lng))}</div><button type="button" data-a="pin">Save as pin</button><button type="button" data-a="clear">Clear</button>`;
 popup=new maplibregl.Popup({offset:14,maxWidth:'260px',closeOnClick:false}).setLngLat([r.lng,r.lat]).setDOMContent(box).addTo(map);
 box.querySelector('[data-a=clear]').onclick=()=>{popup.remove();sMarker?.remove();sMarker=null};
 box.querySelector('[data-a=pin]').onclick=()=>{
  popup.remove();sMarker?.remove();sMarker=null;
  const p={id:newId(),lng:+r.lng.toFixed(6),lat:+r.lat.toFixed(6),label:r.coords?'':r.name.slice(0,80),kind:PIN_KIND(r.label||''),note:''};
  pins.push(p);refreshPins();savePins();editPin(p);
 };
}
sBox.addEventListener('input',()=>{clearTimeout(sTimer);sTimer=setTimeout(runSearch,140)});
sBox.addEventListener('focus',()=>{if(sBox.value.trim())runSearch()});
sBox.addEventListener('blur',()=>setTimeout(()=>{sList.hidden=true},120));
sBox.addEventListener('keydown',e=>{
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  if(!sItems.length)return;e.preventDefault();
  sOn=(sOn+(e.key==='ArrowDown'?1:-1)+sItems.length)%sItems.length;
  sList.querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',i===sOn));
  sList.querySelectorAll('button')[sOn]?.scrollIntoView({block:'nearest'});
 }else if(e.key==='Enter'){e.preventDefault();clearTimeout(sTimer);if(sOn>=0)pick(sItems[sOn]);else runSearch().then(()=>sItems[0]&&pick(sItems[0]))}
 else if(e.key==='Escape'){sList.hidden=true}
});

window.offgridMap={show(){load().then(()=>map&&map.resize())},get map(){return map}};
// The page may have opened straight onto the map (refresh on #map) before this module loaded.
if(!document.getElementById('mapView').hidden)window.offgridMap.show();
