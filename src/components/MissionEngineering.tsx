import { useEffect, useState } from 'react';
import { loadNASAData } from '../systems/nasaClient';
import { parseEonetTargets, targetSource, type EonetTarget } from '../systems/eonet';
import type { Mission } from '../data/missions';
import type { ShipId } from '../data/ships';
import { defaultDesign, evaluateDesign, instruments, launchers, powerSystems, radios, thermalSystems, type MissionDesign } from '../systems/engineering';
import './mission-systems.css';

type Props = { mission: Mission; shipId: ShipId; onCancel: () => void; onLaunch: (design: MissionDesign, target: EonetTarget | null) => void; currentTarget: EonetTarget | null; guided: boolean; language: "en" | "es" };

export default function MissionEngineering({ mission, shipId, onCancel, onLaunch, currentTarget, language, guided }: Props) {
  const t = (es: string, en: string) => language === "es" ? es : en;
  const [design, setDesign] = useState<MissionDesign>(() => defaultDesign(mission.id, shipId));
  const assessment = evaluateDesign(design, mission);
  const names: Record<string, string> = {'Cámara multiespectral':'Multispectral camera','Espectrómetro y sensores ambientales':'Spectrometer and environmental sensors','Espectrómetro avanzado y sensores':'Advanced spectrometer and sensors','Paneles solares':'Solar panels','Generador de radioisótopos':'Radioisotope generator','Antena estándar':'Standard antenna','Antena de espacio profundo':'Deep-space antenna','Lanzador ligero':'Light launcher','Lanzador medio':'Medium launcher','Lanzador pesado':'Heavy launcher','Protección estándar':'Standard protection','Protección térmica reforzada':'Reinforced thermal protection'};
  const localName = (name: string) => language === 'en' ? names[name] ?? name : name;
  const localWarning = (message: string) => {
    if (language === 'es') return message;
    if (message.startsWith('La nave pesa')) return `The spacecraft weighs ${assessment.mass} kg and the launcher supports ${launchers[design.launcher].capacity} kg. Reduce mass or select a larger launcher.`;
    if (message.startsWith('El coste')) return `The cost of ${assessment.cost} CR exceeds the budget of ${mission.budget} CR. Change components to balance the mission.`;
    if (message.startsWith('El instrumento y la nave')) return 'The instrument and spacecraft need more power. Upgrade the power source or reduce scientific consumption.';
    if (message.startsWith('Este destino requiere')) return 'This destination requires reinforced thermal protection in the mission model.';
    if (message.startsWith('El objetivo requiere')) return 'This objective requires a spectrometer with environmental sensors; a camera alone cannot measure these conditions.';
    if (message.startsWith('El instrumento produce')) return 'The instrument produces data faster than the antenna can transmit it. Store or prioritise the data.';
    if (message.startsWith('La luz solar')) return 'Sunlight decreases with distance; this simplified model does not calculate actual solar power. Consider a long-duration generator.';
    return message;
  };
  const [events, setEvents] = useState<EonetTarget[]>([]);
  const [target, setTarget] = useState<EonetTarget | null>(mission.id === 'earth' ? currentTarget : null);
  const [eventStatus, setEventStatus] = useState(mission.id === 'earth' ? t('Consultando NASA EONET…', 'Loading NASA EONET…') : '');
  useEffect(() => {
    if (mission.id !== 'earth') return;
    const controller = new AbortController();
    loadNASAData('eonet', import.meta.env.BASE_URL, controller.signal).then(result => {
      const found = parseEonetTargets(result); setEvents(found);
      setEventStatus(found.length ? `${found.length} ${t("eventos disponibles", "events available")} · ${result.snapshot ? t("archivo publicado", "published snapshot") : t("consulta del servidor", "server request")} · ${new Date(result.observedAt).toLocaleString(language === "en" ? "en-GB" : "es-DO")}` : t('No hay eventos compatibles en esta respuesta. Puedes continuar con la misión simulada.', 'No compatible events were returned. You may continue with the simulated mission.'));
    }).catch(error => { if (error.name !== 'AbortError') setEventStatus(t('EONET no está disponible. Puedes continuar con la misión simulada.', 'EONET is unavailable. You may continue with the simulated mission.')); });
    return () => controller.abort();
  }, [mission.id, language]);
  return <section className="systems-screen" aria-label={t("Ingeniería de misión", "Mission engineering")}>
    <header className="systems-heading"><div><span>{t("ORBITAL COMMAND · INGENIERÍA", "ORBITAL COMMAND · ENGINEERING")}</span><h1>{t("Diseña la misión", "Design the mission")}</h1><p>{t("Equilibra masa, presupuesto, energía y capacidad científica para", "Balance mass, budget, power and scientific capacity for")} {language === "en" && mission.id === "earth" ? "Earth" : mission.destination}. {t("El modelo es educativo y sus unidades de coste son ficticias.", "This educational model uses fictional cost units.")}</p></div><button className="systems-secondary" onClick={onCancel}>{t("← VOLVER", "← BACK")}</button></header>
    {mission.id === 'earth' && <section className="systems-card eonet-planning" aria-labelledby="eonet-heading"><h2 id="eonet-heading">{t("Objetivo terrestre con datos de NASA", "Earth target using NASA data")}</h2><p>{t("Selecciona opcionalmente un evento registrado por EONET. La primera región orbital se orientará a ese evento y el informe conservará su fuente y fecha. El escaneo y sus índices siguen siendo simulados; no representan una medición del evento.", "Optionally select an event recorded by EONET. The first orbital region will target that event, and the report will retain its source and date. The scan and its indices remain simulated; they do not measure the event.")}</p><p role="status">{eventStatus}</p><label>{t("Evento para el plan de observación", "Event for the observation plan")}<select value={target?.id ?? ''} onChange={event => setTarget(events.find(item => item.id === event.target.value) ?? null)}><option value="">{t("Sin evento real · misión simulada", "No real event · simulated mission")}</option>{target && !events.some(item => item.id === target.id) && <option value={target.id}>{target.title} · {t("objetivo guardado", "saved target")}</option>}{events.map(item => <option key={item.id} value={item.id}>{item.title} · {item.category || t('Evento natural', 'Natural event')}</option>)}</select></label>{target && <p>{t("Registro", "Record")}: {target.id} · {t("evento", "event")}: {new Date(target.eventDate).toLocaleString('es-DO')} · {t("consultado", "retrieved")}: {new Date(target.retrievedAt).toLocaleString('es-DO')} · {target.snapshot ? t('archivo publicado', 'published snapshot') : t('consulta del servidor', 'server request')}. <a href={targetSource(target)} target="_blank" rel="noreferrer">{t("Consultar registro EONET ↗", "View EONET record ↗")}</a></p>}</section>}
    <div className="engineering-layout"><div className="systems-card"><h2>{t("Configuración de vuelo", "Flight configuration")}</h2>
      <label>{t("Nave", "Spacecraft")}<select value={design.ship} onChange={(e) => setDesign({ ...design, ship: e.target.value as MissionDesign['ship'] })}><option value="pioneer">{t("Pioneer · equilibrada", "Pioneer · balanced")}</option><option value="swift">{t("Swift · ligera", "Swift · lightweight")}</option><option value="atlas">{t("Atlas · mayor almacenamiento", "Atlas · greater storage")}</option></select></label>
      <label>{t("Instrumento científico", "Scientific instrument")}<select value={design.instrument} onChange={(e) => setDesign({ ...design, instrument: e.target.value as MissionDesign['instrument'] })}>{Object.entries(instruments).map(([id, item]) => <option key={id} value={id}>{localName(item.name)} · {item.mass} kg · {item.power} kW</option>)}</select></label>
      <label>{t("Fuente de energía", "Power source")}<select value={design.power} onChange={(e) => setDesign({ ...design, power: e.target.value as MissionDesign['power'] })}>{Object.entries(powerSystems).map(([id, item]) => <option key={id} value={id}>{localName(item.name)} · {item.power} kW</option>)}</select></label>
      <label>{t("Comunicaciones", "Communications")}<select value={design.radio} onChange={(e) => setDesign({ ...design, radio: e.target.value as MissionDesign['radio'] })}>{Object.entries(radios).map(([id, item]) => <option key={id} value={id}>{localName(item.name)} · {item.data} {t("unidades/día", "units/day")}</option>)}</select></label>
      <label>{t("Protección térmica", "Thermal protection")}<select value={design.thermal} onChange={(e) => setDesign({ ...design, thermal: e.target.value as MissionDesign['thermal'] })}>{Object.entries(thermalSystems).map(([id, item]) => <option key={id} value={id}>{localName(item.name)} · {item.mass} kg · {item.cost} CR</option>)}</select></label>
      <label>{t("Vehículo de lanzamiento", "Launch vehicle")}<select value={design.launcher} onChange={(e) => setDesign({ ...design, launcher: e.target.value as MissionDesign['launcher'] })}>{Object.entries(launchers).map(([id, item]) => <option key={id} value={id}>{localName(item.name)} · {t("hasta", "up to")} {item.capacity} kg</option>)}</select></label>
    </div><div className="systems-card"><h2>{t("Validación de lanzamiento", "Launch validation")}</h2><div className="systems-grid"><div><small>{t("MASA / CAPACIDAD", "MASS / CAPACITY")}</small><b>{assessment.mass} / {launchers[design.launcher].capacity} kg</b></div><div><small>{t("COSTE / PRESUPUESTO", "COST / BUDGET")}</small><b>{assessment.cost} / {mission.budget} CR</b></div><div><small>{t("MARGEN DE POTENCIA", "POWER MARGIN")}</small><b>{assessment.powerMargin} kW</b></div><div><small>{t("VALOR CIENTÍFICO", "SCIENCE VALUE")}</small><b>{assessment.science} / 100</b></div><div><small>{t("ALMACENAMIENTO", "STORAGE")}</small><b>{assessment.storage} {t("unidades", "units")}</b></div><div><small>{t("DATOS / ENLACE", "DATA / DOWNLINK")}</small><b>{assessment.dataRate} / {assessment.downlinkRate} {t("por día", "per day")}</b></div></div>
      {assessment.errors.length > 0 ? <div className="systems-alert" role="alert"><strong>{t("Configuración incompatible", "Incompatible configuration")}</strong>{assessment.errors.map((error) => <p key={error}>{localWarning(error)}</p>)}</div> : <p className="systems-ok">{t("✓ Sistemas compatibles para el modelo de misión.", "✓ Systems are compatible with the mission model.")}</p>}
      {assessment.warnings.map((warning) => <p className="systems-warning" key={warning}>⚠ {localWarning(warning)}</p>)}
      <button className={`systems-primary ${guided ? "visual-guide-target" : ""}`} disabled={assessment.errors.length > 0} onClick={() => onLaunch(design, target)}>{t("CONFIRMAR CONFIGURACIÓN →", "CONFIRM CONFIGURATION →")}</button>
    </div></div>
  </section>;
}
