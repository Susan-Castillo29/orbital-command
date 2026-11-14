import { useCallback, useEffect, useState } from 'react';
import { loadApod, loadNearEarthObjects, NasaApiError, isValidApodDate, type Apod, type NearEarthObject } from '../systems/nasa';
import './mission-systems.css';
import './nasa-observatory.css';

type Load<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; message: string };

const message = (error: unknown) => error instanceof NasaApiError ? error.message : 'No se pudieron cargar los datos de NASA.';
const dateFormat = new Intl.DateTimeFormat('es-DO', { dateStyle: 'long', timeZone: 'UTC' });
const formatDate = (value: string) => dateFormat.format(new Date(`${value}T00:00:00Z`));
const today = () => new Date().toISOString().slice(0, 10);

function useRemote<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[]): [Load<T>, () => void] {
  const [state, setState] = useState<Load<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const run = useCallback(fetcher, deps);
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    run(controller.signal).then((data) => setState({ status: 'ready', data }), (error) => { if (!controller.signal.aborted) setState({ status: 'error', message: message(error) }); });
    return () => controller.abort();
  }, [run, attempt]);
  return [state, () => setAttempt((value) => value + 1)];
}

function ApodCard() {
  const [date, setDate] = useState<string | undefined>(undefined);
  const [state, retry] = useRemote((signal) => loadApod(date, signal), [date]);
  const apod: Apod | null = state.status === 'ready' ? state.data : null;
  return <article className="systems-card nasa-apod" aria-labelledby="apod-title">
    <span className="report-kicker">APOD · IMAGEN ASTRONÓMICA DEL DÍA · DATOS REALES DE NASA</span>
    <h2 id="apod-title">{apod ? apod.title : 'Imagen del día'}</h2>
    <div className="nasa-apod-controls">
      <label>Elegir fecha<input type="date" min="1995-06-16" max={today()} value={date ?? ''} onChange={(event) => { const value = event.target.value; if (!value) setDate(undefined); else if (isValidApodDate(value) && value <= today()) setDate(value); }} /></label>
      <button className="systems-secondary" onClick={() => setDate(undefined)} disabled={date === undefined}>HOY</button>
    </div>
    {state.status === 'loading' && <p className="nasa-status" role="status">Recibiendo transmisión de NASA…</p>}
    {state.status === 'error' && <div className="nasa-error" role="alert"><p>{state.message}</p><button className="systems-secondary" onClick={retry}>REINTENTAR</button></div>}
    {apod && <>
      <p className="nasa-date">{formatDate(apod.date)}{apod.copyright ? ` · © ${apod.copyright}` : ''}</p>
      {apod.imageUrl
        ? <figure className="nasa-figure"><a href={apod.hdUrl ?? apod.imageUrl} target="_blank" rel="noreferrer"><img src={apod.imageUrl} alt={apod.title} loading="lazy" referrerPolicy="no-referrer" /></a><figcaption>Toca la imagen para verla en alta resolución ↗</figcaption></figure>
        : <p className="nasa-video">El contenido de hoy es un vídeo u otro formato interactivo. <a href={apod.pageUrl} target="_blank" rel="noreferrer">Verlo en el sitio de NASA ↗</a></p>}
      <p className="nasa-explanation">{apod.explanation}</p>
      <p className="report-note">Explicación en inglés, tal como la publica NASA. <a href={apod.pageUrl} target="_blank" rel="noreferrer">Página oficial ↗</a></p>
    </>}
  </article>;
}

function NeoRow({ item, farthest }: { item: NearEarthObject; farthest: number }) {
  const width = Math.max(3, Math.min(100, item.lunarDistance / farthest * 100));
  return <li className={item.hazardous ? 'nasa-neo hazardous' : 'nasa-neo'}>
    <div className="nasa-neo-head"><b>{item.jplUrl ? <a href={item.jplUrl} target="_blank" rel="noreferrer">{item.name} ↗</a> : item.name}</b><span>{item.hazardous ? 'POTENCIALMENTE PELIGROSO' : 'SIN RIESGO CONOCIDO'}</span></div>
    <div className="nasa-neo-bar" role="img" aria-label={`${item.lunarDistance.toFixed(1)} distancias lunares`}><i style={{ width: `${width}%` }} /></div>
    <dl>
      <div><dt>Aproximación</dt><dd>{item.approachDate ? formatDate(item.approachDate) : '—'}</dd></div>
      <div><dt>Distancia</dt><dd>{item.lunarDistance.toFixed(1)} Luna · {Math.round(item.distanceKm).toLocaleString('es-DO')} km</dd></div>
      <div><dt>Tamaño est.</dt><dd>{Math.round(item.diameterMeters).toLocaleString('es-DO')} m</dd></div>
      <div><dt>Velocidad</dt><dd>{item.velocityKms.toFixed(1)} km/s</dd></div>
    </dl>
  </li>;
}

function NeoCard() {
  const [state, retry] = useRemote((signal) => loadNearEarthObjects(signal), []);
  const list = state.status === 'ready' ? state.data : [];
  const shown = list.slice(0, 8);
  const farthest = Math.max(1, ...shown.map((item) => item.lunarDistance));
  return <article className="systems-card nasa-neo-card" aria-labelledby="neo-title">
    <span className="report-kicker">NeoWs · ASTEROIDES CERCANOS · DATOS REALES DE NASA</span>
    <h2 id="neo-title">Visitantes de los próximos 7 días</h2>
    <p className="nasa-intro">Objetos cercanos a la Tierra con su máxima aproximación esta semana, del más cercano al más lejano. 1 distancia lunar ≈ 384 400 km.</p>
    {state.status === 'loading' && <p className="nasa-status" role="status">Rastreando objetos cercanos…</p>}
    {state.status === 'error' && <div className="nasa-error" role="alert"><p>{state.message}</p><button className="systems-secondary" onClick={retry}>REINTENTAR</button></div>}
    {state.status === 'ready' && (shown.length === 0 ? <p>NASA no informa aproximaciones en este periodo.</p> : <>
      <div className="nasa-neo-summary"><div><small>OBJETOS</small><b>{list.length}</b></div><div><small>«PELIGROSOS»</small><b>{list.filter((item) => item.hazardous).length}</b></div><div><small>MÁS CERCANO</small><b>{list[0].lunarDistance.toFixed(1)} LD</b></div></div>
      <ul className="nasa-neo-list">{shown.map((item) => <NeoRow key={item.id} item={item} farthest={farthest} />)}</ul>
      {list.length > shown.length && <p className="report-note">Se muestran los {shown.length} más cercanos de {list.length}.</p>}
      <p className="report-note">«Potencialmente peligroso» es una clasificación técnica por tamaño y órbita; ninguno de estos objetos supone una amenaza de impacto conocida.</p>
    </>)}
  </article>;
}

export default function NasaObservatory({ onExit }: { onExit: () => void }) {
  return <section className="systems-screen nasa-screen" aria-label="Datos reales de NASA"><header className="systems-heading"><div><span>NASA OPEN APIs · DATOS REALES</span><h1>Ventana al universo real</h1><p>A diferencia de las misiones, estos paneles usan datos reales y actuales de las APIs públicas de NASA. Requieren conexión y pueden tardar o fallar si se supera el límite de consultas.</p></div><button className="systems-secondary" onClick={onExit}>← VOLVER</button></header>
    <div className="engineering-layout nasa-layout"><ApodCard /><NeoCard /></div>
  </section>;
}
