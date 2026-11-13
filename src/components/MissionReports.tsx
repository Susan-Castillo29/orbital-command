import FullscreenControl from './FullscreenControl';
import { useState } from 'react';
import { chapterOrder } from '../systems/campaign';
import { loadReports } from '../systems/science';
import './mission-systems.css';
import TrackingGlobe from './TrackingGlobe';

function downloadReport(report: ReturnType<typeof loadReports>[number]) {
  const lines = [
    `ORBITAL COMMAND · INFORME SIMULADO · ${report.destination}`,
    `Objetivo: ${report.objective}`, `Instrumento: ${report.instrument}`,
    ...report.observations.map((item) => `${item.region}: ${item.value} ${item.unit}`),
    ...(report.modelReadings ?? []).map((item) => `${item.region}: ${item.label} ${item.value} ${item.unit}`),
    `Muestras simuladas: ${report.samples.join(', ') || 'ninguna'}`,
    `Fotografías simuladas exportadas: ${report.photos ?? 0}`,
    `Problemas: ${(report.problems ?? []).join(' ') || 'No se registraron decisiones de trayectoria.'}`,
    `Objetivos: ${(report.completedObjectives ?? []).join('; ') || 'Resultados transmitidos.'}`,
    `Datos generados y transmitidos: ${report.transmittedUnits} unidades simuladas.`,
    `Tiempo: ${report.elapsedDays.toFixed(1)} días; combustible: ${Math.round(report.fuelRemaining)}%; energía: ${Math.round(report.energyRemaining)}%; puntuación: ${report.score}/100.`,
    `Variación neta de reservas: combustible ${report.netFuelUsed === undefined ? "sin registro" : `${Math.round(report.netFuelUsed)}%`}; energía ${report.netEnergyUsed === undefined ? "sin registro" : `${Math.round(report.netEnergyUsed)}%`}.`,
    `Interpretación: ${report.significance}`,
    'Limitaciones: datos e índices simulados; no constituyen mediciones reales ni prueban una conclusión científica.',
    `Referencia educativa: ${report.source}`,
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `orbital-${report.missionId}-informe.txt`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MissionReports({ onExit }: { onExit: () => void }) {
  const [reports] = useState(loadReports);
  const [selected, setSelected] = useState(reports.length - 1);
  const report = reports[selected];
  const completed = chapterOrder.every((id) => reports.some((entry) => entry.missionId === id));
  const criteria = [
    ['Impacto galáctico', `${reports.length} destinos con informes simulados; faltan validaciones científicas reales.`],
    ['Conexión global', 'Estación dominicana ficticia y relato de colaboración; centros internacionales detallados pendientes.'],
    ['Narración', 'Comandante, guía y mensajes de misión; escenas narrativas extendidas pendientes.'],
    ['Inspiración', 'Historia centrada en el hogar y cooperación; impacto emocional no medido.'],
    ['Concepto de misión', 'Diseño, tránsito, exploración y transmisión conectados; modelos simplificados.'],
    ['Impacto global', 'Informe de Tierra y posibles aplicaciones educativas; no se atribuyen soluciones reales.'],
    ['Uso de datos', 'Lecturas y gráficas etiquetadas como simuladas en los informes.'],
    ['Uso de ciencia', 'Fuentes NASA y restricciones físicas básicas; no hay efemérides reales.'],
    ['Tecnología', 'Exploración 3D, rover, sonda virtual y simulación de tiempo.'],
    ['Arte y tecnología', 'Texturas acreditadas, geometría 3D y ambiente sintetizado; calidad cinematográfica avanzada pendiente.'],
  ];
  return <section className="systems-screen reports-screen" aria-label="Informes científicos"><header className="systems-heading"><div><span>RED INTERNACIONAL DE CIENCIA · 2042</span><h1>Legado científico</h1><p>Los informes son resultados de la simulación; no son observaciones reales ni afirman que se hayan resuelto problemas de la Tierra.</p></div><button className="systems-secondary" onClick={onExit}>← VOLVER</button></header>
    <div className={`engineering-layout reports-layout ${report ? "has-report" : "is-empty"}`}><div className="systems-card"><h2>Informes transmitidos</h2>{reports.length === 0 ? <p>Completa una misión y transmite sus resultados para crear el primer informe.</p> : reports.map((item, index) => <button className="report-select" aria-pressed={index === selected} key={item.missionId} onClick={() => setSelected(index)}>{item.destination} · {item.missionName}</button>)}<div className="report-network"><strong>COOPERACIÓN INTERNACIONAL</strong><p>El globo muestra estaciones reales como contexto educativo y una estación caribeña ficticia. Ninguna está conectada a esta simulación.</p><TrackingGlobe /></div><details className="criteria-panel"><summary>Evaluación de los diez criterios</summary><ol>{criteria.map(([name, evidence]) => <li key={name}><strong>{name}</strong><p>{evidence}</p></li>)}</ol></details>{completed && <div className="systems-ok"><strong>THE LEGACY OF EXPLORATION</strong><p>Exploramos mundos para comprender mejor nuestro hogar. Estos informes reúnen resultados de la simulación y preguntas para futuras investigaciones.</p>{reports.filter((item) => chapterOrder.some((id) => id === item.missionId)).map((item) => <p key={item.missionId}><b>{item.destination}:</b> {item.significance}</p>)}<p>Exploramos mundos desconocidos para comprender mejor el único hogar que conocemos. El futuro depende también de lo que hagamos con lo aprendido.</p></div>}</div>
    {report && <article className="systems-card report-document"><span className="report-kicker">INFORME DE MISIÓN · DATOS SIMULADOS</span><h2>{report.destination} · {report.missionName}</h2><h3>Qué se investigó</h3><p>{report.objective}</p><h3>Instrumento y observaciones</h3><p>{report.instrument} · {report.transmittedUnits} unidades simuladas generadas.</p><div className="report-chart" data-visualization="chart"><FullscreenControl label="gráfico científico" />{report.observations.map((item) => <div key={item.region}><span>{item.region}</span><div><i style={{ width: `${item.value}%` }} /></div><b>{item.value}</b></div>)}</div><p className="report-note">Índices sintéticos de demostración, sin unidades físicas y sin correspondencia con mediciones reales.</p>{Boolean(report.modelReadings?.length) && <><h3>Lecturas del modelo virtual</h3>{report.modelReadings?.map((reading, index) => <p key={`${reading.region}-${index}`}>{reading.region} · {reading.label}: {reading.value.toLocaleString('es-DO')} {reading.unit}</p>)}</>}<h3>Muestras registradas</h3><p>{report.samples.length ? report.samples.join(' · ') : 'Ninguna: observación remota.'}</p><h3>Objetivos completados</h3><p>{report.completedObjectives?.join(' · ') || 'Resultados transmitidos.'}</p><h3>Fotografías y decisiones</h3><p>Fotografías simuladas exportadas: {report.photos ?? 0}.</p><p>{report.problems?.join(' ') || 'No se registraron decisiones de trayectoria.'}</p><h3>Interpretación y límites</h3><p>{report.significance} Los datos mostrados no permiten por sí solos validar conclusiones científicas.</p><p>Tiempo simulado: {report.elapsedDays.toFixed(1)} días · Combustible restante: {Math.round(report.fuelRemaining)}% · Energía: {Math.round(report.energyRemaining)}% · Puntuación: {report.score}/100.</p><p>Variación neta de reservas: combustible {report.netFuelUsed === undefined ? 'sin registro' : `${Math.round(report.netFuelUsed)}%`} · energía {report.netEnergyUsed === undefined ? 'sin registro' : `${Math.round(report.netEnergyUsed)}%`}. Las recargas pueden reducir el consumo neto registrado.</p><p>Posible contribución: orientar preguntas y comparaciones educativas. Las aplicaciones futuras necesitarían observaciones y análisis reales.</p><button className="systems-secondary" onClick={() => downloadReport(report)}>DESCARGAR INFORME</button><p><a href={report.source} target="_blank" rel="noreferrer">Consultar contexto científico de NASA ↗</a></p></article>}</div>
  </section>;
}
