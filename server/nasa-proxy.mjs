import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const keyed = 'https://api.nasa.gov';
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0,10);
const today = () => daysAgo(0);
const datasets = {
  apod: () => ({ url:'https://science.nasa.gov/wp-json/wp/v2/apod-basic/', key:true }),
  neows: () => ({ url:`${keyed}/neo/rest/v1/feed?start_date=${daysAgo(6)}&end_date=${today()}`, key:true }),
  neo_eros: () => ({url:`${keyed}/neo/rest/v1/neo/3542519`,key:true}),
  neo_catalog: () => ({url:`${keyed}/neo/rest/v1/neo/browse?page=0&size=10`,key:true}),
  epic: () => ({ url:`${keyed}/EPIC/api/natural`, key:true }),
  techport: () => ({url:`${keyed}/techport/api/projects`,key:true}),
  techtransfer: () => ({url:'https://technology.nasa.gov/api/api/patent/engine'}),
  images_rover: () => ({url:'https://images-api.nasa.gov/search?q=mars%20rover&media_type=image&page=1'}),
  images: () => ({url:'https://images-api.nasa.gov/search?q=earth&media_type=image&page=1'}),
  eonet: () => ({url:'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=20'}),
  eonet_categories: () => ({url:'https://eonet.gsfc.nasa.gov/api/v3/categories'}),
  exoplanets: () => ({url:'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query='+encodeURIComponent('select top 20 pl_name,hostname,disc_year from ps where default_flag=1 order by disc_year desc')+'&format=json'}),
  cmr: () => ({url:'https://cmr.earthdata.nasa.gov/search/collections.json?keyword=sea%20level&page_size=10'}),
  gibs: () => ({url:'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities',xml:true}),
  horizons: () => ({url:'https://ssd.jpl.nasa.gov/api/horizons.api?'+new URLSearchParams({format:'json',COMMAND:"'499'",MAKE_EPHEM:"'YES'",EPHEM_TYPE:"'VECTORS'",CENTER:"'500@10'",START_TIME:`'${daysAgo(1)}'`,STOP_TIME:`'${today()}'`,STEP_SIZE:"'1 d'"})}),
  jpl_cad: () => ({url:'https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.05&date-min=now&date-max=%2B60'}),
  jpl_ceres: () => ({url:'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=Ceres&phys-par=1'}),
  jpl_sentry: () => ({url:'https://ssd-api.jpl.nasa.gov/sentry.api'}),
  jpl_fireball: () => ({url:'https://ssd-api.jpl.nasa.gov/fireball.api?limit=10'}),
  jpl_scout: () => ({url:'https://ssd-api.jpl.nasa.gov/scout.api'}),
};
for (const type of ['FLR','CME','GST','IPS','SEP','MPC','RBE','HSS','notifications']) datasets[`donki_${type.toLowerCase()}`] = () => ({url:`${keyed}/DONKI/${type}?startDate=${daysAgo(7)}&endDate=${today()}`, key:true});
export const nasaDatasetIds = Object.keys(datasets);
const cache = new Map();
const requests = new Map();
const send = (res, status, value) => {res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(value));};
export async function nasaHandler(req,res,next=()=>send(res,404,{error:'No encontrado'})) {
  let request; try {request=new URL(req.url,'http://localhost');} catch {return send(res,400,{error:'Solicitud inválida'});}
  if(request.pathname!=='/api/nasa' && request.pathname!=='/api/nasa/apod-image') return next();
  if(req.method!=='GET') return send(res,405,{error:'Solo se permite GET'});
  if(req.headers['sec-fetch-site']==='cross-site') return send(res,403,{error:'Origen no permitido'});
  const isImage=request.pathname==='/api/nasa/apod-image';
  const dataset=request.searchParams.get('dataset');
  if(isImage && request.search || !isImage && (!dataset || !Object.hasOwn(datasets,dataset) || [...request.searchParams.keys()].some(k=>k!=='dataset'))) return send(res,400,{error:'Conjunto de datos no permitido'});
  const ip=req.socket.remoteAddress || 'unknown', now=Date.now(), hits=(requests.get(ip)||[]).filter(t=>now-t<60000);
  if(hits.length>=30) return send(res,429,{error:'Demasiadas solicitudes. Espera un minuto.'});
  hits.push(now);requests.set(ip,hits);if(requests.size>1000) requests.delete(requests.keys().next().value);
  if(isImage) {
    const saved=cache.get('apod');const entry=Array.isArray(saved?.value.data)?saved.value.data[0]:saved?.value.data;
    try {
      const image=new URL(entry?.hdurl);
      if(image.protocol!=='https:' || image.hostname!=='assets.science.nasa.gov' || image.username || image.password || image.port) throw Error();
      const response=await fetch(image,{signal:AbortSignal.timeout(12000),redirect:'error'});
      const mime=(response.headers.get('content-type')||'').split(';')[0];
      if(!response.ok||!['image/jpeg','image/png','image/webp'].includes(mime))throw Error();
      if(Number(response.headers.get('content-length')||0)>8000000)throw Error();
      const reader=response.body?.getReader();if(!reader)throw Error();let size=0;const chunks=[];
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8000000){await reader.cancel();throw Error();}chunks.push(value);}
      res.statusCode=200;res.setHeader('Content-Type',mime);res.setHeader('Cache-Control','private, max-age=300');res.setHeader('X-Content-Type-Options','nosniff');res.end(Buffer.concat(chunks));return;
    } catch {return send(res,502,{error:'Imagen no disponible desde el origen autorizado.'});}
  }
  const cached=cache.get(dataset);if(cached && now-cached.time<300000) return send(res,200,{...cached.value,cached:true});
  const config=datasets[dataset]();
  if(config.key && !process.env.NASA_API_KEY) return send(res,503,{error:'Configura NASA_API_KEY en el servidor para consultar este servicio.'});
  const url=new URL(config.url);if(config.key)url.searchParams.set('api_key',process.env.NASA_API_KEY);
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'application/json, application/xml;q=0.8'}});
    if(!response.ok) return send(res,response.status===429?429:502,{error:`El servicio científico respondió ${response.status}. Inténtalo más tarde.`});
    const maxBytes=config.xml ? 8000000 : 2000000;
    const length=Number(response.headers.get('content-length')||0);if(length>maxBytes)return send(res,502,{error:'Respuesta demasiado grande.'});
    const reader=response.body?.getReader();if(!reader) return send(res,502,{error:'Respuesta vacía.'});
    const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();return send(res,502,{error:'Respuesta demasiado grande.'});}chunks.push(value);}
    const text=new TextDecoder().decode(Buffer.concat(chunks));
    const raw=process.env.NASA_API_KEY ? text.replaceAll(process.env.NASA_API_KEY, '[REDACTADO]') : text;
    const data=config.xml ? {description:'Capacidades WMTS recibidas correctamente.',bytes:size} : JSON.parse(raw);
    const value={dataset,source:url.origin,observedAt:new Date().toISOString(),data};
    cache.set(dataset,{time:now,value});return send(res,200,value);
  } catch {return send(res,502,{error:'No se pudo consultar el servicio. Comprueba la conexión y vuelve a intentarlo.'});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.loadEnvFile('.env.local');}catch(error){if(error.code!=='ENOENT')throw error;}
  const root=await realpath(resolve('dist'));const port=Number(process.env.PORT||4175);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Puerto inválido');
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
  createServer((req,res)=>nasaHandler(req,res,async()=>{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    try {const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const candidate=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));const actual=await realpath(candidate);if(!actual.startsWith(root+sep)||(await stat(actual)).isDirectory())throw Error();const bytes=await readFile(actual);res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404).end();}
  })).listen(port,'127.0.0.1',()=>console.log(`ORBITAL COMMAND: http://127.0.0.1:${port}`));
}
