import { useState } from 'react';
import type { Mission } from '../data/missions';
import type { ShipId } from '../data/ships';
import { defaultDesign, evaluateDesign, instruments, launchers, powerSystems, radios, thermalSystems, type MissionDesign } from '../systems/engineering';
import './mission-systems.css';

type Props = { mission: Mission; shipId: ShipId; onCancel: () => void; onLaunch: (design: MissionDesign) => void };

export default function MissionEngineering({ mission, shipId, onCancel, onLaunch }: Props) {
  const [design, setDesign] = useState<MissionDesign>(() => defaultDesign(mission.id, shipId));
  const assessment = evaluateDesign(design, mission);
  return <section className="systems-screen" aria-label="Ingeniería de misión">
    <header className="systems-heading"><div><span>ORBITAL COMMAND · INGENIERÍA</span><h1>Diseña la misión</h1><p>Equilibra masa, presupuesto, energía y capacidad científica para {mission.destination}. El modelo es educativo y sus unidades de coste son ficticias.</p></div><button className="systems-secondary" onClick={onCancel}>← VOLVER</button></header>
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
      <button className="systems-primary" disabled={assessment.errors.length > 0} onClick={() => onLaunch(design)}>CONFIRMAR CONFIGURACIÓN →</button>
    </div></div>
  </section>;
}
