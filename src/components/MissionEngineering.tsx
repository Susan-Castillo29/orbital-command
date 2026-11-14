import { useEffect, useState } from 'react';
import { loadNASAData } from '../systems/nasaClient';
import { parseEonetTargets, targetSource, type EonetTarget } from '../systems/eonet';
import type { Mission } from '../data/missions';
import type { ShipId } from '../data/ships';
import { defaultDesign, evaluateDesign, instruments, launchers, powerSystems, radios, thermalSystems, type MissionDesign } from '../systems/engineering';
import './mission-systems.css';

type Props = { mission: Mission; shipId: ShipId; onCancel: () => void; onLaunch: (design: MissionDesign, target: EonetTarget | null) => void; currentTarget: EonetTarget | null };

export default function MissionEngineering({ mission, shipId, onCancel, onLaunch, currentTarget }: Props) {
  const [design, setDesign] = useState<MissionDesign>(() => defaultDesign(mission.id, shipId));
  const assessment = evaluateDesign(design, mission);
  const [events, setEvents] = useState<EonetTarget[]>([]);
  const [target, setTarget] = useState<EonetTarget | null>(mission.id === 'earth' ? currentTarget : null);
  const [eventStatus, setEventStatus] = useState(mission.id === 'earth' ? 'Consultando NASA EONET…' : '');
  useEffect(() => {
    if (mission.id !== 'earth') return;
    const controller = new AbortController();
    loadNASAData('eonet', import.meta.env.BASE_URL, controller.signal).then(result => {
      const found = parseEonetTargets(result); setEvents(found);
      setEventStatus(found.length ? `${found.length} eventos disponibles · ${result.snapshot ? 'archivo publicado' : 'consulta del servidor'} · ${new Date(result.observedAt).toLocaleString('es-DO')}` : 'No hay eventos compatibles en esta respuesta. Puedes continuar con la misión simulada.');
    }).catch(error => { if (error.name !== 'AbortError') setEventStatus('EONET no está disponible. Puedes continuar con la misión simulada.'); });
    return () => controller.abort();
  }, [mission.id]);
  return <section className="systems-screen" aria-label="Ingeniería de misión">
    <header className="systems-heading"><div><span>ORBITAL COMMAND · INGENIERÍA</span><h1>Diseña la misión</h1><p>Equilibra masa, presupuesto, energía y capacidad científica para {mission.destination}. El modelo es educativo y sus unidades de coste son ficticias.</p></div><button className="systems-secondary" onClick={onCancel}>← VOLVER</button></header>
    {mission.id === 'earth' && <section className="systems-card eonet-planning" aria-labelledby="eonet-heading"><h2 id="eonet-heading">Objetivo terrestre con datos de NASA</h2><p>Selecciona opcionalmente un evento registrado por EONET. La primera región orbital se orientará a ese evento y el informe conservará su fuente y fecha. El escaneo y sus índices siguen siendo simulados; no representan una medición del evento.</p><p role="status">{eventStatus}</p><label>Evento para el plan de observación<select value={target?.id ?? ''} onChange={event => setTarget(events.find(item => item.id === event.target.value) ?? null)}><option value="">Sin evento real · misión simulada</option>{target && !events.some(item => item.id === target.id) && <option value={target.id}>{target.title} · objetivo guardado</option>}{events.map(item => <option key={item.id} value={item.id}>{item.title} · {item.category || 'Evento natural'}</option>)}</select></label>{target && <p>Registro: {target.id} · evento: {new Date(target.eventDate).toLocaleString('es-DO')} · consultado: {new Date(target.retrievedAt).toLocaleString('es-DO')} · {target.snapshot ? 'archivo publicado' : 'consulta del servidor'}. <a href={targetSource(target)} target="_blank" rel="noreferrer">Consultar registro EONET ↗</a></p>}</section>}
    <div className="engineering-layout"><div className="systems-card"><h2>Configuración de vuelo</h2>
      <label>Nave<select value={design.ship} onChange={(e) => setDesign({ ...design, ship: e.target.value as MissionDesign['ship'] })}><option value="pioneer">Pioneer · equilibrada</option><option value="swift">Swift · ligera</option><option value="atlas">Atlas · mayor almacenamiento</option></select></label>
      <label>Instrumento científico<select value={design.instrument} onChange={(e) => setDesign({ ...design, instrument: e.target.value as MissionDesign['instrument'] })}>{Object.entries(instruments).map(([id, item]) => <option key={id} value={id}>{item.name} · {item.mass} kg · {item.power} kW</option>)}</select></label>
      <label>Fuente de energía<select value={design.power} onChange={(e) => setDesign({ ...design, power: e.target.value as MissionDesign['power'] })}>{Object.entries(powerSystems).map(([id, item]) => <option key={id} value={id}>{item.name} · {item.power} kW</option>)}</select></label>
      <label>Comunicaciones<select value={design.radio} onChange={(e) => setDesign({ ...design, radio: e.target.value as MissionDesign['radio'] })}>{Object.entries(radios).map(([id, item]) => <option key={id} value={id}>{item.name} · {item.data} unidades/día</option>)}</select></label>
      <label>Protección térmica<select value={design.thermal} onChange={(e) => setDesign({ ...design, thermal: e.target.value as MissionDesign['thermal'] })}>{Object.entries(thermalSystems).map(([id, item]) => <option key={id} value={id}>{item.name} · {item.mass} kg · {item.cost} CR</option>)}</select></label>
      <label>Vehículo de lanzamiento<select value={design.launcher} onChange={(e) => setDesign({ ...design, launcher: e.target.value as MissionDesign['launcher'] })}>{Object.entries(launchers).map(([id, item]) => <option key={id} value={id}>{item.name} · hasta {item.capacity} kg</option>)}</select></label>
    </div><div className="systems-card"><h2>Validación de lanzamiento</h2><div className="systems-grid"><div><small>MASA / CAPACIDAD</small><b>{assessment.mass} / {launchers[design.launcher].capacity} kg</b></div><div><small>COSTE / PRESUPUESTO</small><b>{assessment.cost} / {mission.budget} CR</b></div><div><small>MARGEN DE POTENCIA</small><b>{assessment.powerMargin} kW</b></div><div><small>VALOR CIENTÍFICO</small><b>{assessment.science} / 100</b></div><div><small>ALMACENAMIENTO</small><b>{assessment.storage} unidades</b></div><div><small>DATOS / ENLACE</small><b>{assessment.dataRate} / {assessment.downlinkRate} por día</b></div></div>
      {assessment.errors.length > 0 ? <div className="systems-alert" role="alert"><strong>Configuración incompatible</strong>{assessment.errors.map((error) => <p key={error}>{error}</p>)}</div> : <p className="systems-ok">✓ Sistemas compatibles para el modelo de misión.</p>}
      {assessment.warnings.map((warning) => <p className="systems-warning" key={warning}>⚠ {warning}</p>)}
      <button className="systems-primary" disabled={assessment.errors.length > 0} onClick={() => onLaunch(design, target)}>CONFIRMAR CONFIGURACIÓN →</button>
    </div></div>
  </section>;
}
