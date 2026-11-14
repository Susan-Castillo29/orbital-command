import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import SolarSystemScene from './components/SolarSystemScene';
import Commander from './components/Commander';
import RenderSettings from './components/RenderSettings';
import SceneBoundary from './components/SceneBoundary';
import './components/observatory.css';
import { initialDesign, type MissionDesign } from './systems/engineering';
import type { TransitState } from './systems/transit';
import { chapterNames, chapterOrder, chapterUnlocked } from './systems/campaign';
import { missions } from './data/missions';
import type { Mission } from './data/missions';
import { readStorage, writeStorage } from './systems/storage';
import { initialPlayerProgress, loadPlayerProgress, type PlayerProgress } from './systems/playerProgress';
import { playSound } from './systems/audio';
import { ships, type ShipId } from './data/ships';

const ExplorationScene = lazy(() => import('./components/ExplorationScene'));
const MissionEngineering = lazy(() => import('./components/MissionEngineering'));
const MissionTransit = lazy(() => import('./components/MissionTransit'));
const MissionReports = lazy(() => import('./components/MissionReports'));
const NASAData = lazy(() => import('./components/NASAData'));

const savedMission = typeof window === 'undefined' ? null : readStorage('orbital-command-mission');
const savedPlayer = typeof window === 'undefined' ? initialPlayerProgress : loadPlayerProgress();
const initialMission = missions.find((mission) => mission.id === savedMission && chapterUnlocked(mission.id, savedPlayer.completedMissions)) ?? missions.find((mission) => mission.id === 'earth')!;

function App() {
  const [mission, setMission] = useState<Mission>(initialMission);
  const [screen, setScreen] = useState<'home' | 'mission' | 'engineering' | 'transit' | 'exploration' | 'reports' | 'nasa'>('home');
  const [design, setDesign] = useState<MissionDesign>(initialDesign);
  const [arrival, setArrival] = useState<TransitState | null>(null);
  const [notice, setNotice] = useState('');
  const [player, setPlayer] = useState<PlayerProgress>(() => typeof window === 'undefined' ? initialPlayerProgress : loadPlayerProgress());
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readStorage('orbital-command-theme') === 'light' ? 'light' : 'dark');
  const [shipId, setShipId] = useState<ShipId>(() => {
    const saved = readStorage('orbital-command-ship');
    return ships.some((ship) => ship.id === saved) ? saved as ShipId : 'pioneer';
  });
  const missionIndex = useMemo(() => missions.findIndex((item) => item.id === mission.id) + 1, [mission.id]);
  const availableMissions = useMemo(() => missions.filter((item) => chapterUnlocked(item.id, player.completedMissions)).sort((a, b) => {
    const index = (id: string) => { const value = chapterOrder.findIndex((chapter) => chapter === id); return value < 0 ? chapterOrder.length : value; };
    return index(a.id) - index(b.id);
  }), [player.completedMissions]);

  useEffect(() => {
    writeStorage('orbital-command-mission', mission.id);
  }, [mission.id]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [screen]);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    const onProgress = (event: Event) => setPlayer((event as CustomEvent<PlayerProgress>).detail);
    window.addEventListener('orbital-player-progress', onProgress);
    return () => { window.clearInterval(timer); window.removeEventListener('orbital-player-progress', onProgress); };
  }, []);

  const selectMission = (id: string) => {
    const next = missions.find((item) => item.id === id);
    if (next && chapterUnlocked(next.id, player.completedMissions)) { setMission(next); playSound('select'); }
    else if (next) { setNotice('Este capítulo se desbloqueará cuando completes la misión anterior.'); window.setTimeout(() => setNotice(''), 3500); }
  };

  const beginBriefing = () => {
    setScreen('mission');
    playSound('launch');
    setNotice(`${mission.name} · expediente de misión preparado`);
    window.setTimeout(() => setNotice(''), 3500);
  };

  return (
    <main className="app-shell" data-theme={theme}>
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setScreen('home')} aria-label="Orbital Command, inicio">
          <span className="brand-mark"><span /></span>
          <span className="brand-name">ORBITAL <b>COMMAND</b><small>THE LAST HORIZON</small></span>
        </a>
        <div className="topbar-center"><span className="signal-icon">⌁</span> RED INTERNACIONAL <i className="live-dot" /> <b>SIMULADA</b></div>
        <div className="topbar-right"><span className="top-status"><i className="live-dot" /> SYSTEMS NOMINAL</span><span className="player-wallet" title={`Nivel ${Math.floor(player.xp / 500) + 1}`}><b>◈ {player.credits.toLocaleString('es-DO')}</b><small>{player.xp.toLocaleString('es-DO')} XP · NIV {Math.floor(player.xp / 500) + 1}</small></span><label className="ship-picker"><span>NAVE</span><select aria-label="Elegir nave" value={shipId} onChange={(event) => { const next = event.target.value as ShipId; setShipId(next); writeStorage('orbital-command-ship', next); playSound('select'); }} title={ships.find((ship) => ship.id === shipId)?.description}>{ships.map((ship) => <option value={ship.id} key={ship.id}>{ship.name}</option>)}</select></label><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); writeStorage('orbital-command-theme', next); }}> {theme === 'dark' ? '☼' : '☾'} </button><RenderSettings /><span className="top-divider" /><span className="utc-clock">UTC&nbsp; {utc}</span></div>
      </header>

      <div className="work-area">
        <aside className="rail" aria-label="Navegación principal">
          <button className={`rail-button ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')} aria-label="Centro de misión" title="Centro de misión"><span>⌂</span><small>OPERACIONES</small></button>
          <button className={`rail-button ${screen === 'mission' ? 'active' : ''}`} onClick={() => setScreen('mission')} aria-label="Expediente de misión" title="Expediente de misión"><span>◎</span><small>EXPEDIENTE</small></button>
          <button className={`rail-button ${screen === 'exploration' || screen === 'engineering' || screen === 'transit' ? 'active' : ''}`} onClick={() => setScreen('engineering')} aria-label="Preparar exploración" title="Preparar exploración"><span>✦</span><small>EXPLORAR</small></button>
          <button className={`rail-button ${screen === 'reports' ? 'active' : ''}`} onClick={() => setScreen('reports')} aria-label="Informes científicos" title="Informes científicos"><span>▤</span><small>INFORMES</small></button>
          <button className={`rail-button ${screen === 'nasa' ? 'active' : ''}`} onClick={() => setScreen('nasa')} aria-label="Datos reales de NASA" title="Datos reales de NASA"><span>◈</span><small>NASA</small></button>
          <div className="rail-spacer" />
          <button className="rail-button rail-help" aria-label="Ayuda" title="Ayuda: arrastra para girar, rueda para acercar, clic en un planeta para elegir destino" onClick={() => { setNotice('Consejo: arrastra para girar el sistema, usa la rueda para acercarte y selecciona un planeta con clic.'); window.setTimeout(() => setNotice(''), 5000); }}><span>?</span><small>AYUDA</small></button>
          <div className="rail-avatar">OC</div>
        </aside>

        <SceneBoundary key={screen}><Suspense fallback={<div className="systems-loading" role="status">CARGANDO SISTEMAS DE MISIÓN…</div>}>
        {screen === 'home' ? (
          <section className="mission-layout">
            <div className="mission-column">
              <div className="section-kicker"><span>01</span> CENTRO DE OPERACIONES</div>
              <h1>Tu próxima misión<br /><em>empieza aquí.</em></h1>
              <p className="intro-copy">Explora el sistema solar. Elige un destino y convierte una pregunta científica en una misión espacial.</p>

              <div className="section-heading"><div><span className="eyebrow">CAMPAÑA CIENTÍFICA</span><h2>Destinos disponibles <span>{String(availableMissions.length).padStart(2, '0')}</span></h2></div><span className="scroll-hint">SE DESBLOQUEAN AL COMPLETAR CAPÍTULOS</span></div>
              <div className="mission-list" aria-label="Misiones disponibles">
                {availableMissions.map((item, index) => (
                  <button className={`mission-card ${mission.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => selectMission(item.id)} aria-pressed={mission.id === item.id}>
                    <span className="mission-index">0{index + 1}</span>
                    <span className="destination-icon" style={{ '--destination-color': item.color } as CSSProperties}>{item.targetBodyId === 'sun' ? '☼' : item.targetBodyId === 'asteroid' ? '◈' : '◉'}</span>
                    <span className="mission-copy"><b>{item.name}</b><small>{chapterNames[item.id] ?? item.category}</small></span>
                    <span className={`difficulty ${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
                    <span className="card-arrow">↗</span>
                  </button>
                ))}
              </div>
              <div className="catalog-footer"><span><i className="tiny-dot" /> DATOS CIENTÍFICOS SIMPLIFICADOS</span><span>ÚLTIMA ACTUALIZACIÓN · 2026</span></div>
              <button className="primary-button mobile-prepare" onClick={beginBriefing}><span>PREPARAR MISIÓN</span><b>→</b></button>
            </div>

            <section className="universe-panel" aria-label="Universo 3D interactivo">
              <SolarSystemScene mission={mission} onSelect={selectMission} shipId={shipId} />
              <div className="scene-title"><span>VISUALIZACIÓN TÁCTICA</span><strong>SISTEMA SOLAR</strong></div>
              <div className="target-readout"><span className="readout-dot" style={{ backgroundColor: mission.color }} /><div><small>DESTINO SELECCIONADO</small><b>{mission.destination.toUpperCase()}</b></div><span className="readout-coord">{missionIndex.toString().padStart(2, '0')} / {String(missions.length).padStart(2, '0')}</span></div>
              <div className="scene-footer"><span><i className="live-dot" /> ÓRBITAS SIMULADAS</span><span>MODELO ORBITAL EDUCATIVO · NO A ESCALA</span></div>
            </section>

            <aside className="briefing-column">
              <div className="briefing-head"><span className="eyebrow">RESUMEN DE MISIÓN</span><span className="briefing-number">OC-{String(missionIndex).padStart(3, '0')}</span></div>
              <figure className="planet-portrait"><img src={`${import.meta.env.BASE_URL}illustrations/${mission.targetBodyId}.svg`} alt={`Ilustración vectorial de ${mission.destination}`} width="480" height="320" /><figcaption>Atlas de misión · ilustración SVG</figcaption></figure><div className="destination-name"><span className="destination-orb" style={{ '--destination-color': mission.color } as CSSProperties}>{mission.id === 'sun' ? '☼' : '·'}</span><div><small>OBJETIVO PRINCIPAL</small><h2>{mission.destination}</h2></div></div>
              <div className="briefing-divider" />
              <span className="eyebrow">OBJETIVO CIENTÍFICO</span>
              <p className="objective-text">{mission.objective}</p>
              <p className="mission-description">{mission.description}</p>
              <div className="briefing-stats">
                <div><span>PRESUPUESTO</span><b><i>◈</i> {mission.budget} <small>CR</small></b></div>
                <div><span>DURACIÓN EST.</span><b><i>◷</i> {mission.duration}</b></div>
                <div><span>DIFICULTAD</span><b className="difficulty-value">{mission.difficulty}</b></div>
                <div><span>RECOMPENSA</span><b><i>✧</i> {mission.reward} <small>XP</small></b></div>
              </div>
              <div className="briefing-note"><span>i</span><p>La órbita, el consumo de energía y el retraso de comunicación dependen del destino. Los valores son aproximaciones educativas.</p></div>
              <button className="primary-button" onClick={beginBriefing}><span>PREPARAR MISIÓN</span><b>→</b></button>
              <div className="save-indicator"><span className="save-check">✓</span> GUARDADO LOCAL SI EL NAVEGADOR LO PERMITE</div>
            </aside>
          </section>
        ) : screen === 'mission' ? (
          <section className="briefing-screen">
            <div className="briefing-screen-heading"><button className="back-button" onClick={() => setScreen('home')}>← VOLVER AL SISTEMA SOLAR</button><span className="section-kicker"><span>02</span> BRIEFING DE CAMPAÑA</span><h1>{mission.name}</h1><p>{mission.id === 'moon' ? 'Llega a la Luna, selecciona un sitio seguro, despliega el rover y entrega un informe geológico al centro de control.' : mission.description}</p></div>
            <div className="briefing-detail-grid">
              <div className="briefing-detail-scene"><SolarSystemScene mission={mission} onSelect={selectMission} shipId={shipId} /><div className="detail-target-chip"><i className="live-dot" /> OBJETIVO · {mission.destination.toUpperCase()}</div></div>
              <div className="briefing-detail-card"><span className="eyebrow">ORDEN DE MISIÓN · OC-{String(missionIndex).padStart(3, '0')}</span><h2>{mission.objective}</h2><p>{mission.description}</p><div className="detail-grid-stats"><div><small>FINANCIACIÓN</small><b>{mission.budget} <i>CR</i></b></div><div><small>TIEMPO DE MISIÓN</small><b>{mission.duration}</b></div><div><small>NIVEL DE RIESGO</small><b>{mission.difficulty}</b></div><div><small>CIENCIA POTENCIAL</small><b>+{mission.reward} <i>XP</i></b></div></div><div className="phase-progress"><div><span>PROGRESO DE PREPARACIÓN</span><b>02 / 04</b></div><div className="progress-track"><i /></div><small>BRIEFING COMPLETADO · SIGUIENTE: INGENIERÍA</small></div><button className="primary-button" onClick={() => setScreen('engineering')}>DISEÑAR MISIÓN <b>↗</b></button></div>
            </div>
          </section>
        ) : screen === 'engineering' ? (
          <MissionEngineering key={mission.id} mission={mission} shipId={shipId} onCancel={() => setScreen('mission')} onLaunch={(next) => { setDesign(next); setShipId(next.ship); setArrival(null); setScreen('transit'); }} />
        ) : screen === 'transit' ? (
          <MissionTransit key={mission.id} mission={mission} design={design} onCancel={() => setScreen('engineering')} onArrive={(state) => { setArrival(state); setScreen('exploration'); }} />
        ) : screen === 'nasa' ? (
          <NASAData onExit={() => setScreen('home')} />
        ) : screen === 'reports' ? (
          <MissionReports onExit={() => setScreen('home')} />
        ) : (
          <ExplorationScene mission={mission} onExit={() => setScreen('home')} shipId={shipId} design={design} arrival={arrival} />
        )}
        </Suspense></SceneBoundary>
      </div>
      <footer className="statusbar"><span><i className="live-dot" /> SIMULACIÓN LOCAL</span><span>ORBITAL COMMAND <i>·</i> BUILD 0.1.0</span><span>EDUCATIONAL MODEL <i>·</i> ALL VALUES APPROXIMATE</span></footer>
      <Commander mission={mission} screen={screen} />
      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    </main>
  );
}

export default App;
