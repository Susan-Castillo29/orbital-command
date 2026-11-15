import { useEffect, useRef, useState } from 'react';
import type { Mission } from '../data/missions';
import type { MissionDesign } from '../systems/engineering';
import { advanceTransit, createTransit, resolveTransitDecision, transitFailure, transitProfiles, type TransitState } from '../systems/transit';
import { playSound } from '../systems/audio';
import { englishDestinations } from '../data/commander';
import { clearTransit, loadTransit, saveTransit } from '../systems/transitStorage';
import { makeFailedAttempt, saveFailedAttempt } from '../systems/missionAttempts';
import './mission-systems.css';

type Props = { mission: Mission; design: MissionDesign; onArrive: (state: TransitState) => void; onCancel: () => void; language: 'en' | 'es' };
const newAttemptId = () => globalThis.crypto?.randomUUID?.() ?? `attempt-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
const localeFor = (language: 'en' | 'es') => language === 'en' ? 'en-GB' : 'es-DO';
const numberFormat = (value: number, language: 'en' | 'es') => Math.round(value).toLocaleString(localeFor(language));
const dayFormat = (day: number, language: 'en' | 'es') => day < 1 ? day.toFixed(1) : Math.floor(day).toLocaleString(localeFor(language));

export default function MissionTransit({ mission, design, onArrive, onCancel, language }: Props) {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const [saved] = useState(() => loadTransit(mission, design));
  const attemptId = useRef(saved?.attemptId ?? newAttemptId());
  const [failureSaved, setFailureSaved] = useState(true);
  const [launchDay, setLaunchDay] = useState(saved?.launchDay ?? 0);
  const [state, setState] = useState(() => saved?.state ?? createTransit(mission, design, 0));
  const [started, setStarted] = useState(Boolean(saved));
  const [countdown, setCountdown] = useState<number | null>(null);
  const [rate, setRate] = useState(saved ? 0 : 1);
  const last = useRef(0);
  const milestones = useRef(new Set<number>());
  const profile = transitProfiles[mission.id] ?? transitProfiles.mars;
  const destination = language === 'en' ? englishDestinations[mission.id] ?? mission.destination : mission.destination;
  useEffect(() => { if (started) saveTransit(mission.id, design, launchDay, state, attemptId.current); }, [started, mission.id, design, launchDay, state]);
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
    if (!started || rate === 0 || transitFailure(state) || state.decision === 'required' || state.elapsedDays >= state.durationDays) return;
    last.current = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const seconds = Math.min(1, (now - last.current) / 1000);
      last.current = now;
      setState((previous) => advanceTransit(previous, seconds * rate / 24, design));
    }, 200);
    return () => window.clearInterval(timer);
  }, [started, rate, state.decision, state.elapsedDays >= state.durationDays, transitFailure(state), design]);
  const progress = Math.min(1, state.elapsedDays / state.durationDays);
  const failure = started ? transitFailure(state) : null;
  useEffect(() => { if (failure) setFailureSaved(saveFailedAttempt(makeFailedAttempt(attemptId.current, mission, design, state, failure))); }, [failure, mission, design, state]);
  const done = progress >= 1 && !failure;
  const speed = state.distanceKm / state.durationDays / 24;
  return <section className="systems-screen transit-screen" aria-label={t("Viaje interplanetario", "Interplanetary journey")}>
    <header className="systems-heading"><div><span>{t("THE LAST HORIZON · CONTROL DE VUELO", "THE LAST HORIZON · FLIGHT CONTROL")}</span><h1>{t("Rumbo a", "Journey to")} {destination}</h1><p>{t("Trayectoria educativa aproximada: las duraciones cambian según posiciones, propulsión y maniobras. No son efemérides reales.", "Educational trajectory estimate: durations depend on positions, propulsion and manoeuvres. These are not real ephemerides.")}</p>{saved && <p>{t("Trayecto recuperado y pausado. Reanuda cuando estés listo.", "Saved journey restored and paused. Resume when ready.")}</p>}</div><button className="systems-secondary" onClick={() => { if (!started || window.confirm(t('¿Abortar el trayecto? Se borrará su progreso de vuelo.', 'Abort the journey? Its flight progress will be deleted.'))) { clearTransit(mission.id); onCancel(); } }}>{t("← ABORTAR TRAYECTO", "← ABORT JOURNEY")}</button></header>
    <div className="transit-visual"><div className="transit-orbit" /><div className="transit-planet">✦</div><div className="transit-route"><span>{t("TIERRA", "EARTH")}</span><div><i style={{ width: `${progress * 100}%` }} /></div><span>{destination.toUpperCase()}</span></div></div>
    <div className="systems-card"><div className="systems-grid"><div><small>{t("DÍA DE MISIÓN", "MISSION DAY")}</small><b>{dayFormat(state.elapsedDays + 1, language)}</b></div><div><small>{t("TRANSCURRIDO", "ELAPSED")}</small><b>{dayFormat(state.elapsedDays, language)} {t("días", "days")}</b></div><div><small>{t("DURACIÓN ESTIMADA", "ESTIMATED DURATION")}</small><b>{dayFormat(state.durationDays, language)} {t("días", "days")}</b></div><div><small>{t("TIEMPO RESTANTE", "TIME REMAINING")}</small><b>{dayFormat(Math.max(0, state.durationDays - state.elapsedDays), language)} {t("días", "days")}</b></div><div><small>{t("DISTANCIA RECORRIDA", "DISTANCE TRAVELLED")}</small><b>{numberFormat(state.distanceKm * progress, language)} km</b></div><div><small>{t("DISTANCIA RESTANTE", "DISTANCE REMAINING")}</small><b>{numberFormat(state.distanceKm * (1 - progress), language)} km</b></div><div><small>{t("VELOCIDAD MEDIA ESTIMADA", "ESTIMATED AVERAGE SPEED")}</small><b>{numberFormat(speed, language)} km/h</b></div><div><small>{t("SISTEMAS", "SYSTEMS")}</small><b>{state.energy > 20 && state.integrity > 20 ? t('ESTABLES', 'STABLE') : t('REVISAR', 'CHECK')}</b></div><div><small>{t("COMBUSTIBLE", "FUEL")}</small><b>{Math.round(state.fuel)}%</b></div><div><small>{t("ENERGÍA", "ENERGY")}</small><b>{Math.round(state.energy)}%</b></div></div>
      {!started ? <div className="launch-window"><label>{t("Día de lanzamiento simulado", "Simulated launch day")} <input type="number" min="0" max="99999" disabled={countdown !== null} value={launchDay} onChange={(e) => { const day = Math.max(0, Math.min(99999, Number(e.target.value) || 0)); setLaunchDay(day); setState(createTransit(mission, design, day)); }} /></label><p>{t("La ventana usa un ciclo y una fase ficticios para mostrar cómo cambian duración y combustible; no predice fechas reales.", "The launch window uses a fictional cycle to show how duration and fuel change; it does not predict real dates.")}</p><button className="systems-primary" disabled={countdown !== null} onClick={() => { setCountdown(3); window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'countdown', title: 'CUENTA REGRESIVA', text: 'Sistemas verificados. Iniciamos la cuenta regresiva. Confía en tu preparación; nos vemos en órbita.' } })); }}>{t("INICIAR TRAYECTO →", "START JOURNEY →")}</button>{countdown !== null && <div className="launch-countdown" role="status"><span className="launch-rocket">▲</span><strong>T − {countdown}</strong><small>{t("SECUENCIA DE LANZAMIENTO", "LAUNCH SEQUENCE")}</small></div>}</div> : <div className="time-controls"><span>{t("TIEMPO SIMULADO · 1 segundo = 1 hora a ×1", "SIMULATED TIME · 1 second = 1 hour at ×1")}</span>{[0, 1, 10, 100, 1000].map((value) => <button key={value} aria-pressed={rate === value} onClick={() => setRate(value)}>{value === 0 ? t('PAUSA', 'PAUSE') : `×${value}`}</button>)}</div>}
      {state.decision === 'required' && !failure && <div className="systems-alert" role="alert"><strong>{t("DECISIÓN DE TRAYECTORIA · el tiempo está detenido", "COURSE DECISION · time is paused")}</strong><p>{t("Una corrección intermedia exige recursos. Elige una maniobra para continuar.", "A mid-course correction requires resources. Choose a manoeuvre to continue.")}</p><div className="decision-actions"><button disabled={state.fuel < 3} onClick={() => setState((previous) => resolveTransitDecision(previous, 'fuel') ?? previous)}>{t("IMPULSO · −3% COMBUSTIBLE", "THRUST · −3% FUEL")}</button><button disabled={state.energy < 6} onClick={() => setState((previous) => resolveTransitDecision(previous, 'energy') ?? previous)}>{t("NAVEGACIÓN ELÉCTRICA · −6% ENERGÍA", "ELECTRIC NAVIGATION · −6% ENERGY")}</button></div></div>}
      {failure && <section className="systems-alert" role="alert">{!failureSaved && <p>{t('El informe está disponible solo durante esta sesión porque el navegador no permitió guardarlo.', 'The report is available only during this session because the browser could not save it.')}</p>}<h2>{t('Misión fallida', 'Mission failed')}</h2><p>{failure === 'energy' ? t('La energía se agotó antes de completar el trayecto. Sin energía no pueden operar los sistemas ni las comunicaciones.', 'Energy ran out before the journey was complete. Systems and communications cannot operate without power.') : failure === 'integrity' ? t('La integridad de la nave llegó a cero.', 'Spacecraft integrity reached zero.') : t('No quedan reservas suficientes para ninguna corrección de trayectoria.', 'There are insufficient reserves for either course correction.')}</p><p>{t('Revisa la fuente de energía, las reservas, el lanzador y la dificultad antes de intentarlo de nuevo. Este resultado es del modelo educativo.', 'Review the power source, reserves, launcher and difficulty before retrying. This outcome belongs to the educational model.')}</p><button className="systems-secondary" onClick={() => { clearTransit(mission.id); attemptId.current = newAttemptId(); setFailureSaved(true); setStarted(false); setRate(1); setState(createTransit(mission, design, launchDay)); }}>{t('REINTENTAR TRAYECTO', 'RETRY JOURNEY')}</button> <button className="systems-secondary" onClick={() => { clearTransit(mission.id); onCancel(); }}>{t('REVISAR DISEÑO', 'REVIEW DESIGN')}</button></section>}
      {done && <button className="systems-primary" onClick={() => { clearTransit(mission.id); onArrive(state); }}>{t("ESTABLECER ÓRBITA DE", "ENTER ORBIT OF")} {destination.toUpperCase()} →</button>}
      <p className="systems-reference">{t("Perfil orientativo basado en", "Indicative profile based on")} <a href={profile.source} target="_blank" rel="noreferrer">{t("referencias de NASA", "NASA references")}</a>; {t("distancia y velocidad son estimaciones del modelo.", "distance and speed are model estimates.")}</p>
    </div>
  </section>;
}

