// Coordinate formats and distance math for the offline map. No dependencies; WGS84 throughout.

const R_EARTH=6371008.8;   // mean radius, metres
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;

export function fmtDD(lat,lng){return `${lat.toFixed(5)}, ${lng.toFixed(5)}`}

export function fmtDMS(lat,lng){
 const one=(v,pos,neg)=>{
  const a=Math.abs(v);let d=Math.floor(a),m=Math.floor((a-d)*60),s=Math.round(((a-d)*60-m)*60*10)/10;
  if(s>=60){s=0;m+=1}if(m>=60){m=0;d+=1}
  return `${d}°${String(m).padStart(2,'0')}′${s.toFixed(1).padStart(4,'0')}″${v<0?neg:pos}`;
 };
 return `${one(lat,'N','S')} ${one(lng,'E','W')}`;
}

// Latitude -> UTM (Snyder's series). Returns null outside UTM's range (80°S to 84°N).
export function toUTM(lat,lng){
 if(lat<-80||lat>84)return null;
 const a=6378137,f=1/298.257223563,k0=0.9996,e2=f*(2-f),e4=e2*e2,e6=e4*e2,ep2=e2/(1-e2);
 const zone=Math.min(60,Math.floor((lng+180)/6)+1),lon0=rad((zone-1)*6-180+3);
 const φ=rad(lat),sin=Math.sin(φ),cos=Math.cos(φ),tan=Math.tan(φ);
 const N=a/Math.sqrt(1-e2*sin*sin),T=tan*tan,C=ep2*cos*cos,A=cos*(rad(lng)-lon0);
 const M=a*((1-e2/4-3*e4/64-5*e6/256)*φ-(3*e2/8+3*e4/32+45*e6/1024)*Math.sin(2*φ)+(15*e4/256+45*e6/1024)*Math.sin(4*φ)-(35*e6/3072)*Math.sin(6*φ));
 const E=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000;
 let Nn=k0*(M+N*tan*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720));
 if(lat<0)Nn+=1e7;
 const band='CDEFGHJKLMNPQRSTUVWX'[Math.min(19,Math.floor((lat+80)/8))];
 return {zone,band,easting:E,northing:Nn};
}

export function fmtUTM(lat,lng){
 const u=toUTM(lat,lng);if(!u)return '—';
 return `${u.zone}${u.band} ${Math.floor(u.easting)}E ${Math.floor(u.northing)}N`;
}

// US National Grid (same as MGRS here): zone+band, 100 km square letters, then easting/northing within it.
export function fmtUSNG(lat,lng,digits=5){
 const u=toUTM(lat,lng);if(!u)return '—';
 const set=(u.zone-1)%3,cols=['ABCDEFGH','JKLMNPQR','STUVWXYZ'][set],rows='ABCDEFGHJKLMNPQRSTUV';
 const col=cols[Math.floor(u.easting/1e5)-1];
 const row=rows[(Math.floor(u.northing/1e5)+(u.zone%2===0?5:0))%20];
 const cut=v=>String(Math.floor((v%1e5)/10**(5-digits))).padStart(digits,'0');
 return `${u.zone}${u.band} ${col}${row} ${cut(u.easting)} ${cut(u.northing)}`;
}

// UTM -> latitude/longitude (Snyder's inverse series). north=false for the southern hemisphere.
export function fromUTM(zone,easting,northing,north=true){
 const a=6378137,f=1/298.257223563,k0=0.9996,e2=f*(2-f),e4=e2*e2,e6=e4*e2,ep2=e2/(1-e2);
 const x=easting-500000,y=north?northing:northing-1e7,lon0=rad((zone-1)*6-180+3);
 const mu=y/k0/(a*(1-e2/4-3*e4/64-5*e6/256)),e1=(1-Math.sqrt(1-e2))/(1+Math.sqrt(1-e2));
 const φ1=mu+(3*e1/2-27*e1**3/32)*Math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*Math.sin(4*mu)+(151*e1**3/96)*Math.sin(6*mu)+(1097*e1**4/512)*Math.sin(8*mu);
 const s=Math.sin(φ1),c=Math.cos(φ1),t=Math.tan(φ1);
 const N1=a/Math.sqrt(1-e2*s*s),T1=t*t,C1=ep2*c*c,R1=a*(1-e2)/(1-e2*s*s)**1.5,D=x/(N1*k0);
 const lat=φ1-(N1*t/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720);
 const lng=lon0+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120)/c;
 return {lat:deg(lat),lng:deg(lng)};
}

const BANDS='CDEFGHJKLMNPQRSTUVWX';
const COLSETS=['ABCDEFGH','JKLMNPQR','STUVWXYZ'],ROWS='ABCDEFGHJKLMNPQRSTUV';

// Read a typed grid reference. Understands US National Grid / MGRS ("12T VK 44838 54619", "12TVK4483854619",
// "VK 448 546") and UTM ("12T 443982E 4453915N", "12 443982 4453915"). When the zone is left off, the zone
// of `near` ({lat,lng}, usually the map center) is used, the way people read grids off a local map.
// Returns {lat,lng,kind,text,precision} (precision in metres) or null.
export function parseGrid(input,near){
 const s=input.toUpperCase().replace(/[,]/g,' ').replace(/\s+/g,' ').trim();
 let m;
 // USNG / MGRS: [zone band] col row digits
 if((m=s.match(/^(?:(\d{1,2})\s?([C-HJ-NP-X])\s?)?([A-HJ-NP-Z])\s?([A-HJ-NP-V])(?:\s?(\d+)(?:\s(\d+))?)?$/))){
  let zone=m[1]&&+m[1],band=m[2],nearN=null;
  if(!m[5]&&!zone)return null;   // two bare letters are more likely a word than a grid square
  if(!zone){const u=near&&toUTM(near.lat,near.lng);if(!u)return null;zone=u.zone;band=u.band;nearN=u.northing}
  if(zone<1||zone>60)return null;
  let e=m[5]||'',n=m[6];
  if(n===undefined){if(e.length%2)return null;n=e.slice(e.length/2);e=e.slice(0,e.length/2)}
  if(e.length!==n.length||e.length>5)return null;
  const digits=e.length,cell=10**(5-digits);
  const col=COLSETS[(zone-1)%3].indexOf(m[3]),row=ROWS.indexOf(m[4]);
  if(col<0||row<0)return null;
  const easting=(col+1)*1e5+(digits?+e*cell:0)+cell/2;   // middle of the named square
  let northing=((row-(zone%2===0?5:0)+20)%20)*1e5+(digits?+n*cell:0)+cell/2;
  // The row letters repeat every 2,000 km. With a band given, the band says which repeat is meant;
  // without one, take the repeat nearest the map center.
  let bi=BANDS.indexOf(band),north=bi>=10;
  if(nearN!==null){
   while(northing+1e6<nearN)northing+=2e6;
  }else{
   const floor=toUTM(-80+bi*8,(zone-1)*6-180+3).northing;
   while(northing<floor-1e5)northing+=2e6;
  }
  const p=fromUTM(zone,easting,northing,north);
  if(nearN!==null){bi=Math.min(19,Math.floor((p.lat+80)/8));band=BANDS[bi]}
  else if(Math.floor((p.lat+80)/8)!==bi&&!(band==='X'&&p.lat>=72))return null;   // letters don't fit that band
  return {...p,kind:'US National Grid',text:`${zone}${band} ${m[3]}${m[4]}${digits?` ${e} ${n}`:''}`,precision:cell};
 }
 // UTM: [zone [band|N|S]] easting[E] northing[N]
 if((m=s.match(/^(?:(\d{1,2})\s?([C-HJ-NP-X])?\s)?(\d{5,6}(?:\.\d+)?)\s?E?\s(\d{6,7}(?:\.\d+)?)\s?N?$/))){
  let zone=m[1]&&+m[1],band=m[2];
  if(!zone){const u=near&&toUTM(near.lat,near.lng);if(!u)return null;zone=u.zone;band=band||u.band}
  if(zone<1||zone>60)return null;
  const north=!band||BANDS.indexOf(band)>=10,E=+m[3],N=+m[4];
  if(E<100000||E>900000)return null;
  const p=fromUTM(zone,E,N,north);
  if(Math.abs(p.lat)>84)return null;
  return {...p,kind:'UTM',text:`${zone}${band||''} ${Math.round(E)}E ${Math.round(N)}N`,precision:1};
 }
 return null;
}

export function distance(a,b){   // [lng,lat] pairs -> metres (haversine)
 const dφ=rad(b[1]-a[1]),dλ=rad(b[0]-a[0]);
 const h=Math.sin(dφ/2)**2+Math.cos(rad(a[1]))*Math.cos(rad(b[1]))*Math.sin(dλ/2)**2;
 return 2*R_EARTH*Math.asin(Math.min(1,Math.sqrt(h)));
}

export function bearing(a,b){   // initial bearing from a to b, degrees from true north
 const φ1=rad(a[1]),φ2=rad(b[1]),dλ=rad(b[0]-a[0]);
 const y=Math.sin(dλ)*Math.cos(φ2),x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(dλ);
 return (deg(Math.atan2(y,x))+360)%360;
}

export function compass(b){return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round(b/22.5)%16]}

export function fmtDistance(m){
 const mi=m/1609.344;
 const us=mi<0.1?`${Math.round(m*3.28084).toLocaleString()} ft`:`${mi<10?mi.toFixed(2):mi.toFixed(1)} mi`;
 const si=m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(m<10000?2:1)} km`;
 return `${us} (${si})`;
}
