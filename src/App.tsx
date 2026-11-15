import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import SolarSystemScene from './components/SolarSystemScene';
import CampaignCelebration from './components/CampaignCelebration';
import Commander from './components/Commander';
import RenderSettings from './components/RenderSettings';
import SceneBoundary from './components/SceneBoundary';
import './components/observatory.css';
import './components/telescope-mode.css';
import { initialDesign, type MissionDesign } from './systems/engineering';
import type { TransitState } from './systems/transit';
import { isEonetTarget, type EonetTarget } from './systems/eonet';
import { chapterNames, chapterOrder, chapterUnlocked } from './systems/campaign';
import { missions } from './data/missions';
import { localiseMission } from './data/missionLocale';
import type { Mission } from './data/missions';
import { readStorage, writeStorage } from './systems/storage';
import { initialPlayerProgress, loadPlayerProgress, type PlayerProgress } from './systems/playerProgress';
import { playRadioCue, playSound } from './systems/audio';
import { validatePublicConfig } from './collaboration/config';
import { publishLiveWorldState, useLiveSession } from './collaboration/liveSession';
import { ships, type ShipId } from './data/ships';
import { addCampaignPlaytime, beginNewCampaign, campaignCommanderMessage, completeCampaignIfEligible, getOrStartActiveCampaign, loadCampaignArchive, updateCampaignCommander, type CampaignRecord } from './systems/campaignLegacy';
import { resetCampaignProgress } from './systems/campaignReset';
import { loadReports } from './systems/science';

const ExplorationScene = lazy(() => import('./components/ExplorationScene'));
const MissionEngineering = lazy(() => import('./components/MissionEngineering'));
const MissionTransit = lazy(() => import('./components/MissionTransit'));
const MissionReports = lazy(() => import('./components/MissionReports'));
const NASAData = lazy(() => import('./components/NASAData'));
const CollaborationHub = lazy(() => import('./components/CollaborationHub'));
const RoleSelection = lazy(() => import('./components/RoleSelection'));
const TelescopeMission = lazy(() => import('./components/TelescopeMission'));

const cloudConfigured = Boolean(validatePublicConfig(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY));
const savedMission = typeof window === 'undefined' ? null : readStorage('orbital-command-mission');
const savedPlayer = typeof window === 'undefined' ? initialPlayerProgress : loadPlayerProgress();
const initialMission = missions.find((mission) => mission.id === savedMission && chapterUnlocked(mission.id, savedPlayer.completedMissions)) ?? missions.find((mission) => mission.id === 'earth')!;

function App() {
  const [language, setLanguage] = useState<'en' | 'es'>(() => readStorage('orbital-command-language') === 'es' ? 'es' : 'en');
  const t = (spanish: string, english: string) => language === 'es' ? spanish : english;
  const [visualGuide, setVisualGuide] = useState<'select' | 'prepare' | 'design' | 'confirm' | null>(() => readStorage('orbital-command-operations-guide-v1') === 'done' && readStorage('orbital-command-visual-guide-v1') !== 'done' ? 'select' : null);
  const finishVisualGuide = () => { writeStorage('orbital-command-visual-guide-v1', 'done'); setVisualGuide(null); };
  useEffect(() => { const start = () => { if (readStorage('orbital-command-visual-guide-v1') !== 'done') setVisualGuide('select'); }; window.addEventListener('orbital-start-visual-guide', start); return () => window.removeEventListener('orbital-start-visual-guide', start); }, []);
  const [mission, setMission] = useState<Mission>(initialMission);
  const liveSession = useLiveSession((value) => value, (left, right) => left.connected === right.connected && left.worldState?.routeUpdatedAt === right.worldState?.routeUpdatedAt);
  const [teamVisited, setTeamVisited] = useState(cloudConfigured);
  const [screen, setScreen] = useState<'home' | 'mission' | 'engineering' | 'transit' | 'exploration' | 'reports' | 'nasa' | 'team' | 'roles' | 'scientist'>(cloudConfigured ? 'team' : 'home');
  const [design, setDesign] = useState<MissionDesign>(initialDesign);
  const [sharedDesign, setSharedDesign] = useState<MissionDesign | null>(null);
  const [scienceTarget, setScienceTarget] = useState<EonetTarget | null>(() => { try { const value: unknown = JSON.parse(readStorage('orbital-command-eonet-target-v1') ?? 'null'); return isEonetTarget(value) ? value : null; } catch { return null; } });
  const [arrival, setArrival] = useState<TransitState | null>(null);
  const [missionLaunch, setMissionLaunch] = useState(false);
  const [notice, setNotice] = useState('');
  const [player, setPlayer] = useState<PlayerProgress>(() => typeof window === 'undefined' ? initialPlayerProgress : loadPlayerProgress());
  const [activeCampaign, setActiveCampaign] = useState(() => getOrStartActiveCampaign());
  const [campaignArchive, setCampaignArchive] = useState(loadCampaignArchive);
  const [campaignDialog, setCampaignDialog] = useState<'victory' | 'records' | null>(null);
  const [campaignRecord, setCampaignRecord] = useState<CampaignRecord | null>(null);
  const [campaignMedalSaved, setCampaignMedalSaved] = useState(true);
  const [commanderName, setCommanderName] = useState(() => readStorage('orbital-command-commander-name-v1')?.slice(0, 48) || 'Comandante');
  const [utc, setUtc] = useState(() => new Date().toISOString().slice(11, 19));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readStorage('orbital-command-theme') === 'light' ? 'light' : 'dark');
  const [shipId, setShipId] = useState<ShipId>(() => {
    const saved = readStorage('orbital-command-ship');
    return ships.some((ship) => ship.id === saved) ? saved as ShipId : 'pioneer';
  });
  const missionText = localiseMission(mission, language);
  const missionIndex = useMemo(() => missions.findIndex((item) => item.id === mission.id) + 1, [mission.id]);
  const availableMissions = useMemo(() => missions.filter((item) => chapterUnlocked(item.id, player.completedMissions)).sort((a, b) => {
    const index = (id: string) => { const value = chapterOrder.findIndex((chapter) => chapter === id); return value < 0 ? chapterOrder.length : value; };
    return index(a.id) - index(b.id);
  }), [player.completedMissions]);

  useEffect(() => {
    writeStorage('orbital-command-mission', mission.id);
  }, [mission.id]);

  useEffect(() => {
    if (!liveSession.connected || !liveSession.worldState) return;
    const sharedState = liveSession.worldState;
    const sharedMission = missions.find((item) => item.id === sharedState.missionId);
    if (sharedMission && sharedMission.id !== mission.id) setMission(sharedMission);
    if (sharedState.shipId && sharedState.shipId !== shipId) {
      setShipId(sharedState.shipId);
      window.dispatchEvent(new CustomEvent('orbital-ship-change', { detail: sharedState.shipId }));
    }
    if (sharedState.design && JSON.stringify(sharedState.design) !== JSON.stringify(design)) setDesign(sharedState.design);
    if (sharedState.arrival !== undefined && JSON.stringify(sharedState.arrival) !== JSON.stringify(arrival)) setArrival(sharedState.arrival);
    if (sharedState.launchId && sharedState.launchAt) {
      setMissionLaunch(true);
      const timer = window.setTimeout(() => { setScreen(sharedState.screen); setMissionLaunch(false); }, Math.max(0, sharedState.launchAt - Date.now()));
      return () => window.clearTimeout(timer);
    }
    setMissionLaunch(false);
    if (sharedState.screen !== screen) setScreen(sharedState.screen);
  }, [liveSession.connected, liveSession.worldState?.routeUpdatedAt]);

  useEffect(() => {
    if (!liveSession.connected || !['home', 'mission', 'engineering', 'transit', 'exploration'].includes(screen)) return;
    publishLiveWorldState(mission.id, screen as 'home' | 'mission' | 'engineering' | 'transit' | 'exploration', { shipId, design, arrival });
  }, [liveSession.connected, mission.id, screen, shipId, design, arrival]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [screen]);
  useEffect(() => { document.documentElement.lang = language === 'en' ? 'en-GB' : 'es'; writeStorage('orbital-command-language', language); }, [language]);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setUtc(new Date().toISOString().slice(11, 19)), 1000);
    const onProgress = (event: Event) => setPlayer((event as CustomEvent<PlayerProgress>).detail);
    window.addEventListener('orbital-player-progress', onProgress);
    return () => { window.clearInterval(timer); window.removeEventListener('orbital-player-progress', onProgress); };
  }, []);

  useEffect(() => {
    let lastTick = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTick;
      lastTick = now;
      if (document.visibilityState === 'visible') addCampaignPlaytime(elapsed);
    }, 10_000);
    const onVisibility = () => { lastTick = Date.now(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  useEffect(() => {
    if (activeCampaign.completed) return;
    const completion = completeCampaignIfEligible(player, loadReports(), commanderName);
    if (!completion) return;
    setActiveCampaign(getOrStartActiveCampaign());
    setCampaignArchive(completion.archive);
    setCampaignRecord(completion.record);
    setCampaignMedalSaved(completion.persisted);
    setCampaignDialog('victory');
    if (completion.newlyCompleted) {
      playSound('complete');
      playRadioCue();
      window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'campaign-complete', title: 'MEDALLA DE EXPLORADOR GALÁCTICO', text: campaignCommanderMessage, forceSpeak: true } }));
    }
  }, [player, activeCampaign.completed, commanderName]);

  const selectMission = (id: string) => {
    const next = missions.find((item) => item.id === id);
    if (next && chapterUnlocked(next.id, player.completedMissions)) { setMission(next); setSharedDesign(null); if (visualGuide === 'select') setVisualGuide('prepare'); playSound('select'); }
    else if (next) { setNotice('Este capítulo se desbloqueará cuando completes la misión anterior.'); window.setTimeout(() => setNotice(''), 3500); }
  };

  const beginBriefing = () => {
    setScreen('mission');
    if (visualGuide === 'select' || visualGuide === 'prepare') setVisualGuide('design');
    playSound('launch');
    setNotice(`${mission.name} · expediente de misión preparado`);
    window.setTimeout(() => setNotice(''), 3500);
  };

  const openCampaignRecords = () => { setCampaignArchive(loadCampaignArchive()); setCampaignDialog('records'); };
  const updateCommanderName = (name: string) => {
    setCommanderName(name);
    writeStorage('orbital-command-commander-name-v1', name);
    if (campaignRecord) {
      const result = updateCampaignCommander(campaignRecord.id, name);
      setCampaignArchive(result.archive);
      setCampaignRecord(result.archive.campaigns.find((record) => record.id === campaignRecord.id) ?? campaignRecord);
      setCampaignMedalSaved(result.persisted);
    }
  };
  const listenToCampaignMessage = () => {
    playRadioCue();
    window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'campaign-complete', title: 'MEDALLA DE EXPLORADOR GALÁCTICO', text: campaignCommanderMessage, forceSpeak: true } }));
  };
  const startNewCampaign = () => {
    const freshProgress = resetCampaignProgress();
    const nextActive = beginNewCampaign();
    setPlayer(freshProgress);
    setActiveCampaign(nextActive);
    setMission(missions.find((entry) => entry.id === 'earth')!);
    setDesign(initialDesign);
    setShipId('pioneer');
    setArrival(null);
    setScienceTarget(null);
    setScreen('home');
    setVisualGuide(null);
    setCampaignArchive(loadCampaignArchive());
    setCampaignDialog(null);
    setCampaignRecord(null);
    window.dispatchEvent(new Event('orbital-new-campaign-start'));
  };

  return (
    <main className="app-shell" data-theme={theme}>
      <a className="skip-link" href="#mission-content">{t('Saltar al contenido principal', 'Skip to main content')}</a>
      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setScreen('home')}>
          <span className="brand-mark"><span /></span>
          <span className="brand-name">ORBITAL <b>COMMAND</b><small>THE LAST HORIZON</small></span>
        </a>
        <div className="topbar-center"><span className="signal-icon">⌁</span>{t(' RED INTERNACIONAL ', ' INTERNATIONAL NETWORK ')}<i className="live-dot" /> <b>{t('SIMULADA', 'SIMULATED')}</b></div>
        <div className="topbar-right"><label className="language-picker"><span className="visually-hidden">{t("Idioma", "Language")}</span><select aria-label={t("Idioma", "Language")} value={language} onChange={(event) => setLanguage(event.target.value as "en" | "es")}><option value="en">English</option><option value="es">Español</option></select></label><span className="top-status"><i className="live-dot" /> SYSTEMS NOMINAL</span><span className="player-wallet" title={`Nivel ${Math.floor(player.xp / 500) + 1}`}><b>◈ {player.credits.toLocaleString('es-DO')}</b><small>{player.xp.toLocaleString('es-DO')} XP · NIV {Math.floor(player.xp / 500) + 1}</small></span><label className="ship-picker"><span>{t("NAVE", "SHIP")}</span><select aria-label={t("Elegir nave", "Choose spacecraft")} value={shipId} onChange={(event) => { const next = event.target.value as ShipId; setShipId(next); writeStorage('orbital-command-ship', next); playSound('select'); }} title={ships.find((ship) => ship.id === shipId)?.description}>{ships.map((ship) => <option value={ship.id} key={ship.id}>{ship.name}</option>)}</select></label><button className="icon-button theme-toggle" aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={() => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); writeStorage('orbital-command-theme', next); }}> {theme === 'dark' ? '☼' : '☾'} </button><RenderSettings language={language} /><span className="top-divider" /><span className="utc-clock">UTC&nbsp; {utc}</span></div>
      </header>

      <div className="work-area">
        <aside className="rail" aria-label={t("Navegación principal", "Main navigation")}>
          <button className={`rail-button ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')} aria-label={t("Operaciones · Centro de misión", "Operations · Mission control")} title="Centro de misión"><span>⌂</span><small>{t('OPERACIONES', 'OPERATIONS')}</small></button>
          <button className={`rail-button ${screen === 'roles' || screen === 'scientist' ? 'active' : ''}`} onClick={() => setScreen('roles')} aria-label={t('Selección de misión · Elige tu rol', 'Mission selection · Choose your role')} title={t('Selección de misión / Select your role', 'Mission selection / Select your role')}><span>✳</span><small>{t('ROLES', 'ROLES')}</small></button>
          <button className={`rail-button ${screen === 'mission' ? 'active' : ''}`} onClick={() => setScreen('mission')} aria-label={t("Expediente de misión", "Mission briefing")} title="Expediente de misión"><span>◎</span><small>{t('EXPEDIENTE', 'BRIEFING')}</small></button>
          <button className={`rail-button ${screen === 'exploration' || screen === 'engineering' || screen === 'transit' ? 'active' : ''}`} onClick={() => setScreen('engineering')} aria-label={t("Explorar · Preparar exploración", "Explore · Prepare exploration")} title="Preparar exploración"><span>✦</span><small>{t('EXPLORAR', 'EXPLORE')}</small></button>
          <button className={`rail-button ${screen === 'reports' ? 'active' : ''}`} onClick={() => setScreen('reports')} aria-label={t("Informes científicos", "Science reports")} title="Informes científicos"><span>▤</span><small>{t('INFORMES', 'REPORTS')}</small></button>
          <button className={`rail-button ${screen === 'nasa' ? 'active' : ''}`} onClick={() => setScreen('nasa')} aria-label={t("Datos reales de NASA", "NASA data")} title="Datos reales de NASA"><span>◈</span><small>NASA</small></button>
          <button className={`rail-button ${screen === 'team' ? 'active' : ''}`} onClick={() => { setTeamVisited(true); setScreen('team'); }} aria-label={t('Cuentas y equipos', 'Accounts and teams')} title={t('Cuentas y equipos', 'Accounts and teams')}><span>♧</span><small>{t('EQUIPOS', 'TEAMS')}</small></button>
          <div className="rail-spacer" />
          <button className="rail-button rail-help" aria-label={t("Ayuda", "Help")} title="Ayuda: arrastra para girar, rueda para acercar, clic en un planeta para elegir destino" onClick={() => { setNotice('Consejo: arrastra para girar el sistema, usa la rueda para acercarte y selecciona un planeta con clic.'); window.setTimeout(() => setNotice(''), 5000); }}><span>?</span><small>{t('AYUDA', 'HELP')}</small></button>
          <div id="commander-rail" className="commander-rail" />
          <div className="rail-avatar">OC</div>
        </aside>

        <div id="mission-content" className={`mission-content ${screen === 'roles' || screen === 'scientist' ? 'mission-content-role-view' : ''}`} tabIndex={-1}>
        <SceneBoundary key={screen} language={language}><Suspense fallback={<div className="systems-loading" role="status">{t('CARGANDO SISTEMAS DE MISIÓN…', 'LOADING MISSION SYSTEMS…')}</div>}>
        {screen === 'roles' ? (
          <RoleSelection language={language} onChoose={(role) => setScreen(role === 'scientist' ? 'scientist' : 'home')} />
        ) : screen === 'scientist' ? (
          <TelescopeMission language={language} onExit={() => setScreen('roles')} />
        ) : screen === 'home' ? (
          <section className="mission-layout">
            <div className="mission-column">
              <div className="section-kicker"><span>01</span> {t("CENTRO DE OPERACIONES", "MISSION CONTROL")}</div>
              <h1>{t('Tu próxima misión', 'Your next mission')}<br /><em>{t('empieza aquí.', 'starts here.')}</em></h1>
              <p className="intro-copy">{t('Explora el sistema solar. Elige un destino y convierte una pregunta científica en una misión espacial.', 'Explore the solar system. Choose a destination and turn a scientific question into a space mission.')}</p>
              <button type="button" className="role-menu-entry" onClick={() => setScreen('roles')}><span><small>{t('NUEVO · SELECCIÓN DE MISIÓN','NEW · MISSION SELECTION')}</small><b>{t('Elige tu rol de exploración','Choose your role in exploration')}</b></span><i>✳</i><strong>{t('ASTRONAUTA / CIENTÍFICO','ASTRONAUT / SCIENTIST')} ↗</strong></button>

              <div className="section-heading"><div><span className="eyebrow">{t('CAMPAÑA CIENTÍFICA', 'SCIENCE CAMPAIGN')}</span><h2>{t('Destinos disponibles ', 'Available destinations ')}<span>{String(availableMissions.length).padStart(2, '0')}</span></h2></div><button className="campaign-records-button" type="button" onClick={openCampaignRecords}>{t('MEDALLAS · ', 'MEDALS · ')}{campaignArchive.medals.length} ↗</button><span className="scroll-hint">{t('SE DESBLOQUEAN AL COMPLETAR CAPÍTULOS', 'UNLOCKED BY COMPLETING CHAPTERS')}</span></div>
              <div className="mission-list" aria-label={t("Misiones disponibles", "Available missions")}>
                {availableMissions.map((item, index) => (
                  <button className={`mission-card ${mission.id === item.id ? 'selected' : ''} ${visualGuide === 'select' && mission.id === item.id ? 'visual-guide-target' : ''}`} key={item.id} onClick={() => selectMission(item.id)} aria-pressed={mission.id === item.id}>
                    <span className="mission-index">0{index + 1}</span>
                    <span className="destination-icon" style={{ '--destination-color': item.color } as CSSProperties}>{item.targetBodyId === 'sun' ? '☼' : item.targetBodyId === 'asteroid' ? '◈' : '◉'}</span>
                    <span className="mission-copy"><b>{item.name}</b><small>{language === "en" && item.id === "earth" ? "HOME · THE PLANET THAT GAVE US LIFE" : (language === 'en' && item.id === 'asteroid' ? localiseMission(item, language).category : chapterNames[item.id] ?? item.category)}</small></span>
                    <span className={`difficulty ${item.difficulty.toLowerCase()}`}>{language === "en" ? ({ BAJA: "LOW", MEDIA: "MEDIUM", ALTA: "HIGH" } as const)[item.difficulty] : item.difficulty}</span>
                    <span className="card-arrow">↗</span>
                  </button>
                ))}
              </div>
              <div className="catalog-footer"><span><i className="tiny-dot" /> {t("DATOS CIENTÍFICOS SIMPLIFICADOS", "SIMPLIFIED SCIENTIFIC DATA")}</span><span>{t('ÚLTIMA ACTUALIZACIÓN · 2026', 'LAST UPDATED · 2026')}</span></div>
              <button className={`primary-button mobile-prepare ${visualGuide === "prepare" ? "visual-guide-target" : ""}`} onClick={beginBriefing}><span>{t('PREPARAR MISIÓN', 'PREPARE MISSION')}</span><b>→</b></button>
            </div>

            <section className="universe-panel" aria-label={t("Universo 3D interactivo", "Interactive 3D universe")}>
              <SolarSystemScene language={language} mission={mission} onSelect={selectMission} shipId={shipId} />
              <div className="scene-title"><span>{t('VISUALIZACIÓN TÁCTICA', 'TACTICAL DISPLAY')}</span><strong>{t('SISTEMA SOLAR', 'SOLAR SYSTEM')}</strong></div>
              <div className="target-readout"><span className="readout-dot" style={{ backgroundColor: mission.color }} /><div><small>{t('DESTINO SELECCIONADO', 'SELECTED DESTINATION')}</small><b>{missionText.destination.toUpperCase()}</b></div><span className="readout-coord">{missionIndex.toString().padStart(2, '0')} / {String(missions.length).padStart(2, '0')}</span></div>
              <div className="scene-footer"><span><i className="live-dot" /> {t("ÓRBITAS SIMULADAS", "SIMULATED ORBITS")}</span><span>{t('MODELO ORBITAL EDUCATIVO · NO A ESCALA', 'EDUCATIONAL ORBITAL MODEL · NOT TO SCALE')}</span></div>
            </section>

            <aside className="briefing-column">
              <div className="briefing-head"><span className="eyebrow">{t('RESUMEN DE MISIÓN', 'MISSION OVERVIEW')}</span><span className="briefing-number">OC-{String(missionIndex).padStart(3, '0')}</span></div>
              <figure className="planet-portrait"><img src={`${import.meta.env.BASE_URL}illustrations/${mission.targetBodyId}.svg`} alt={`${t('Ilustración vectorial de', 'Vector illustration of')} ${missionText.destination}`} width="480" height="320" /><figcaption>{t('Atlas de misión · ilustración SVG', 'Mission atlas · SVG illustration')}</figcaption></figure><div className="destination-name"><span className="destination-orb" style={{ '--destination-color': mission.color } as CSSProperties}>{mission.id === 'sun' ? '☼' : '·'}</span><div><small>{t('OBJETIVO PRINCIPAL', 'PRIMARY TARGET')}</small><h2>{missionText.destination}</h2></div></div>
              <div className="briefing-divider" />
              <span className="eyebrow">{t('OBJETIVO CIENTÍFICO', 'SCIENCE OBJECTIVE')}</span>
              <p className="objective-text">{missionText.objective}</p>
              <p className="mission-description">{missionText.description}</p>
              <div className="briefing-stats">
                <div><span>{t('PRESUPUESTO', 'BUDGET')}</span><b><i>◈</i> {mission.budget} <small>CR</small></b></div>
                <div><span>{t('DURACIÓN EST.', 'EST. DURATION')}</span><b><i>◷</i> {missionText.duration}</b></div>
                <div><span>{t('DIFICULTAD', 'DIFFICULTY')}</span><b className="difficulty-value">{language === "en" ? ({ BAJA: "LOW", MEDIA: "MEDIUM", ALTA: "HIGH" } as const)[mission.difficulty] : mission.difficulty}</b></div>
                <div><span>{t('RECOMPENSA', 'REWARD')}</span><b><i>✧</i> {mission.reward} <small>XP</small></b></div>
              </div>
              <div className="briefing-note"><span>i</span><p>{t('La órbita, el consumo de energía y el retraso de comunicación dependen del destino. Los valores son aproximaciones educativas.', 'Orbit, energy consumption and communication delay depend on the destination. Values are educational approximations.')}</p></div>
              <button className={`primary-button ${visualGuide === "prepare" ? "visual-guide-target" : ""}`} onClick={beginBriefing}><span>{t('PREPARAR MISIÓN', 'PREPARE MISSION')}</span><b>→</b></button>
              <div className="save-indicator"><span className="save-check">✓</span>{t(' GUARDADO LOCAL SI EL NAVEGADOR LO PERMITE', ' SAVED LOCALLY IF YOUR BROWSER ALLOWS IT')}</div>
            </aside>
          </section>
        ) : screen === 'mission' ? (
          <section className="briefing-screen">
            <div className="briefing-screen-heading"><button className="back-button" onClick={() => setScreen('home')}>{t("← VOLVER AL SISTEMA SOLAR", "← BACK TO SOLAR SYSTEM")}</button><span className="section-kicker"><span>02</span> {t("BRIEFING DE CAMPAÑA", "CAMPAIGN BRIEFING")}</span><h1>{mission.name}</h1><p>{mission.id === 'moon' ? t('Llega a la Luna, selecciona un sitio seguro, despliega el rover y entrega un informe geológico al centro de control.', 'Reach the Moon, select a safe site, deploy the rover and deliver a geological report to mission control.') : missionText.description}</p></div>
            <div className="briefing-detail-grid">
              <div className="briefing-detail-scene"><SolarSystemScene language={language} mission={mission} onSelect={selectMission} shipId={shipId} /><div className="detail-target-chip"><i className="live-dot" /> {t("OBJETIVO", "TARGET")} · {missionText.destination.toUpperCase()}</div></div>
              <div className="briefing-detail-card"><span className="eyebrow">{t("ORDEN DE MISIÓN", "MISSION ORDER")} · OC-{String(missionIndex).padStart(3, '0')}</span><h2>{missionText.objective}</h2><p>{missionText.description}</p><div className="detail-grid-stats"><div><small>{t("FINANCIACIÓN", "FUNDING")}</small><b>{mission.budget} <i>CR</i></b></div><div><small>{t("TIEMPO DE MISIÓN", "MISSION TIME")}</small><b>{missionText.duration}</b></div><div><small>{t("NIVEL DE RIESGO", "RISK LEVEL")}</small><b>{language === "en" ? ({ BAJA: "LOW", MEDIA: "MEDIUM", ALTA: "HIGH" } as const)[mission.difficulty] : mission.difficulty}</b></div><div><small>{t("CIENCIA POTENCIAL", "POTENTIAL SCIENCE")}</small><b>+{mission.reward} <i>XP</i></b></div></div><div className="phase-progress"><div><span>{t("PROGRESO DE PREPARACIÓN", "PREPARATION PROGRESS")}</span><b>02 / 04</b></div><div className="progress-track"><i /></div><small>{t("BRIEFING COMPLETADO · SIGUIENTE: INGENIERÍA", "BRIEFING COMPLETE · NEXT: ENGINEERING")}</small></div><button className={`primary-button ${visualGuide === "design" ? "visual-guide-target" : ""}`} onClick={() => { setScreen('engineering'); if (visualGuide === "design") setVisualGuide("confirm"); }}>{t("DISEÑAR MISIÓN", "DESIGN MISSION")} <b>↗</b></button></div>
            </div>
          </section>
        ) : screen === 'engineering' ? (
          <MissionEngineering sharedDesign={sharedDesign} guided={visualGuide === "confirm"} language={language} key={mission.id} mission={mission} shipId={shipId} onCancel={() => setScreen('mission')} currentTarget={scienceTarget} onLaunch={(next, target) => { if (visualGuide === "confirm") finishVisualGuide(); setSharedDesign(null); setScienceTarget(target); writeStorage('orbital-command-eonet-target-v1', JSON.stringify(target)); setDesign(next); setShipId(next.ship); setArrival(null); setScreen('transit'); }} />
        ) : screen === 'transit' ? (
          <MissionTransit language={language} key={mission.id} mission={mission} design={design} onCancel={() => setScreen('engineering')} onArrive={(state) => { setArrival(state); setScreen('exploration'); }} />
        ) : screen === 'team' ? null : screen === 'nasa' ? (
          <NASAData language={language} onExit={() => setScreen('home')} />
        ) : screen === 'reports' ? (
          <MissionReports language={language} onExit={() => setScreen('home')} />
        ) : (
          <ExplorationScene language={language} mission={mission} onExit={() => setScreen('home')} shipId={shipId} design={design} arrival={arrival} scienceTarget={mission.id === 'earth' ? scienceTarget : null} />
        )}
        </Suspense></SceneBoundary>
        {teamVisited && <div className="collaboration-container" hidden={screen !== 'team'}><SceneBoundary language={language}><Suspense fallback={<div className="systems-loading" role="status">{t('CARGANDO CUENTAS…', 'LOADING ACCOUNTS…')}</div>}><CollaborationHub language={language} mission={mission} shipId={shipId} design={design} onExit={() => setScreen('home')} onApply={(id, candidate) => { const next = missions.find(item => item.id === id); if (!next || !chapterUnlocked(id, player.completedMissions)) return false; setMission(next); setSharedDesign(candidate); setShipId(candidate.ship); setScreen('engineering'); return true; }} /></Suspense></SceneBoundary></div>}
        </div>
      </div>
      <footer className="statusbar"><span><i className="live-dot" />{t(' SIMULACIÓN LOCAL', ' LOCAL SIMULATION')}</span><span>ORBITAL COMMAND <i>·</i> BUILD 0.1.0</span><span>EDUCATIONAL MODEL <i>·</i> ALL VALUES APPROXIMATE</span></footer>
      {visualGuide && ((screen === 'home' && (visualGuide === 'select' || visualGuide === 'prepare')) || (screen === 'mission' && visualGuide === 'design') || (screen === 'engineering' && visualGuide === 'confirm')) && <aside className="visual-guide" aria-live="polite"><div><strong>{t('GUÍA VISUAL', 'VISUAL GUIDE')} · {({select: 1, prepare: 2, design: 3, confirm: 4})[visualGuide]}/4</strong><p>{visualGuide === 'select' ? t('Selecciona la misión iluminada para comenzar.', 'Select the highlighted mission to begin.') : visualGuide === 'prepare' ? t('Pulsa Preparar misión para abrir el expediente.', 'Select Prepare mission to open the briefing.') : visualGuide === 'design' ? t('Pulsa Diseñar misión para elegir la nave y los instrumentos.', 'Select Design mission to choose your spacecraft and instruments.') : t('Revisa el diseño y pulsa Confirmar configuración para continuar.', 'Review your design and select Confirm configuration to continue.')}</p></div><button type="button" onClick={finishVisualGuide}>{t('Omitir', 'Skip')}</button></aside>}
      <Commander mission={mission} screen={screen === 'roles' || screen === 'scientist' ? 'team' : screen} language={language} />
      {missionLaunch && <div className="mission-launch-overlay" role="status" aria-live="assertive"><div><span>COOPERATIVE MULTIPLAYER · {t('MISIÓN EN EQUIPO','TEAM MISSION')}</span><h1>{t('PREPARANDO EXPEDICIÓN…','PREPARING EXPEDITION…')}</h1><p>{t('SINCRONIZANDO EQUIPO…','SYNCHRONISING TEAM…')}</p><p>{t('INICIANDO MISIÓN…','STARTING MISSION…')}</p></div></div>}
      {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
      {campaignDialog && <CampaignCelebration mode={campaignDialog} record={campaignDialog === 'victory' ? campaignRecord : null} archive={campaignArchive} completedMissions={player.completedMissions} language={language} medalSaved={campaignMedalSaved} onRestart={startNewCampaign} onReturnToMain={() => { setCampaignDialog(null); setScreen('home'); }} onClose={() => setCampaignDialog(null)} onUpdateCommander={updateCommanderName} onListen={listenToCampaignMessage} />}
    </main>
  );
}

export default App;

