import { useEffect, useRef, useState } from 'react';
import type { Mission } from '../data/missions';
import type { MissionDesign } from '../systems/engineering';
import { advanceTransit, createTransit, resolveTransitDecision, transitProfiles, type TransitState } from '../systems/transit';
import { playSound } from '../systems/audio';
import { clearTransit, loadTransit, saveTransit } from '../systems/transitStorage';
import './mission-systems.css';

type Props = { mission: Mission; design: MissionDesign; onArrive: (state: TransitState) => void; onCancel: () => void };
const dayFormat = (day: number) => day < 1 ? day.toFixed(1) : Math.floor(day).toLocaleString('es-DO');

export default function MissionTransit({ mission, design, onArrive, onCancel }: Props) {
  const [saved] = useState(() => loadTransit(mission, design));
  const [launchDay, setLaunchDay] = useState(saved?.launchDay ?? 0);
  const [state, setState] = useState(() => saved?.state ?? createTransit(mission, design, 0));
  const [started, setStarted] = useState(Boolean(saved));
  const [countdown, setCountdown] = useState<number | null>(null);
  const [rate, setRate] = useState(saved ? 0 : 1);
  const last = useRef(0);
  const milestones = useRef(new Set<number>());
  const profile = transitProfiles[mission.id] ?? transitProfiles.mars;
  useEffect(() => { if (started) saveTransit(mission.id, design, launchDay, state); }, [started, mission.id, design, launchDay, state]);
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null); setStarted(true); playSound('launch');
      window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'liftoff', title: 'DESPEGUE', text: 'Despegue confirmado. Mantén la atención en la telemetría; el centro de control seguirá contigo durante el viaje.' } }));
      return;
    }
    const timer = window.setTimeout(() => setCountdown((value) => value === null ? null : value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);
  useEffect(() => {
    if (state.decision === 'required') window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'course-decision', title: 'CORRECCIÓN DE TRAYECTORIA', text: 'Tenemos una decisión de navegación pendiente. Revisa las reservas y elige cómo corregir el rumbo; no tomaremos la decisión por ti.' } }));
  }, [state.decision]);
  useEffect(() => {
    if (!started) return;
    for (const fraction of [0.25, 0.75]) {
      if (state.elapsedDays / state.durationDays < fraction || milestones.current.has(fraction)) continue;
      milestones.current.add(fraction);
      const travelled = Math.round(state.distanceKm * state.elapsedDays / state.durationDays).toLocaleString('es-DO');
      const remaining = Math.max(0, Math.ceil(state.durationDays - state.elapsedDays));
      window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: `status-${fraction}`, title: 'INFORME DE TRAYECTO', text: `Día de misión ${Math.floor(state.elapsedDays) + 1}. Hemos recorrido aproximadamente ${travelled} kilómetros simulados. Quedan unos ${remaining} días. Energía ${Math.round(state.energy)} por ciento y combustible ${Math.round(state.fuel)} por ciento.` } }));
    }
  }, [started, state]);
  useEffect(() => {
    if (!started || rate === 0 || state.decision === 'required' || state.elapsedDays >= state.durationDays) return;
    last.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const seconds = Math.min(1, (now - last.current) / 1000);
      last.current = now;
      setState((previous) => advanceTransit(previous, seconds * rate / 24, design));
    }, 200);
    return () => window.clearInterval(timer);
  }, [started, rate, state.decision, state.elapsedDays >= state.durationDays, design]);
  const progress = Math.min(1, state.elapsedDays / state.durationDays);
  const done = progress >= 1;
  const speed = state.distanceKm / state.durationDays / 24;
  return <section className="systems-screen transit-screen" aria-label="Viaje interplanetario">
    <header className="systems-heading"><div><span>THE LAST HORIZON · CONTROL DE VUELO</span><h1>Rumbo a {mission.destination}</h1><p>Trayectoria educativa aproximada: las duraciones cambian según posiciones, propulsión y maniobras. No son efemérides reales.</p>{saved && <p>Trayecto recuperado y pausado. Reanuda cuando estés listo.</p>}</div><button className="systems-secondary" onClick={() => { if (!started || window.confirm('¿Abortar el trayecto? Se borrará su progreso de vuelo.')) { clearTransit(mission.id); onCancel(); } }}>← ABORTAR TRAYECTO</button></header>
    <div className="transit-visual"><div className="transit-orbit" /><div className="transit-planet">✦</div><div className="transit-route"><span>TIERRA</span><div><i style={{ width: `${progress * 100}%` }} /></div><span>{mission.destination.toUpperCase()}</span></div></div>
    <div className="systems-card"><div className="systems-grid"><div><small>DÍA DE MISIÓN</small><b>{dayFormat(state.elapsedDays + 1)}</b></div><div><small>TRANSCURRIDO</small><b>{dayFormat(state.elapsedDays)} días</b></div><div><small>DURACIÓN ESTIMADA</small><b>{dayFormat(state.durationDays)} días</b></div><div><small>TIEMPO RESTANTE</small><b>{dayFormat(Math.max(0, state.durationDays - state.elapsedDays))} días</b></div><div><small>DISTANCIA RECORRIDA</small><b>{Math.round(state.distanceKm * progress).toLocaleString('es-DO')} km</b></div><div><small>DISTANCIA RESTANTE</small><b>{Math.round(state.distanceKm * (1 - progress)).toLocaleString('es-DO')} km</b></div><div><small>VELOCIDAD MEDIA ESTIMADA</small><b>{Math.round(speed).toLocaleString('es-DO')} km/h</b></div><div><small>SISTEMAS</small><b>{state.energy > 20 && state.integrity > 20 ? 'ESTABLES' : 'REVISAR'}</b></div><div><small>COMBUSTIBLE</small><b>{Math.round(state.fuel)}%</b></div><div><small>ENERGÍA</small><b>{Math.round(state.energy)}%</b></div></div>
      {!started ? <div className="launch-window"><label>Día de lanzamiento simulado <input type="number" min="0" max="99999" disabled={countdown !== null} value={launchDay} onChange={(e) => { const day = Math.max(0, Math.min(99999, Number(e.target.value) || 0)); setLaunchDay(day); setState(createTransit(mission, design, day)); }} /></label><p>La ventana usa un ciclo y una fase ficticios para mostrar cómo cambian duración y combustible; no predice fechas reales.</p><button className="systems-primary" disabled={countdown !== null} onClick={() => { setCountdown(3); window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'countdown', title: 'CUENTA REGRESIVA', text: 'Sistemas verificados. Iniciamos la cuenta regresiva. Confía en tu preparación; nos vemos en órbita.' } })); }}>INICIAR TRAYECTO →</button>{countdown !== null && <div className="launch-countdown" role="status"><span className="launch-rocket">▲</span><strong>T − {countdown}</strong><small>SECUENCIA DE LANZAMIENTO</small></div>}</div> : <div className="time-controls"><span>TIEMPO SIMULADO · 1 segundo = 1 hora a ×1</span>{[0, 1, 10, 100, 1000].map((value) => <button key={value} aria-pressed={rate === value} onClick={() => setRate(value)}>{value === 0 ? 'PAUSA' : `×${value}`}</button>)}</div>}
      {state.decision === 'required' && <div className="systems-alert" role="alert"><strong>DECISIÓN DE TRAYECTORIA · el tiempo está detenido</strong><p>Una corrección intermedia exige recursos. Elige una maniobra para continuar.</p><div className="decision-actions"><button disabled={state.fuel < 3} onClick={() => setState((previous) => resolveTransitDecision(previous, 'fuel') ?? previous)}>IMPULSO · −3% COMBUSTIBLE</button><button disabled={state.energy < 6} onClick={() => setState((previous) => resolveTransitDecision(previous, 'energy') ?? previous)}>NAVEGACIÓN ELÉCTRICA · −6% ENERGÍA</button></div></div>}
      {done && <button className="systems-primary" onClick={() => { clearTransit(mission.id); onArrive(state); }}>ESTABLECER ÓRBITA DE {mission.destination.toUpperCase()} →</button>}
      <p className="systems-reference">Perfil orientativo basado en <a href={profile.source} target="_blank" rel="noreferrer">referencias de NASA</a>; distancia y velocidad son estimaciones del modelo.</p>
    </div>
  </section>;
}
