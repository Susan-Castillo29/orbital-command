import FullscreenControl from './FullscreenControl';
import { useState } from 'react';
import { chapterOrder } from '../systems/campaign';
import { loadReports, readReportTransmissionCount } from '../systems/science';
import { targetSource } from '../systems/eonet';
import './mission-systems.css';
import TrackingGlobe from './TrackingGlobe';
import LearningEvidence from './LearningEvidence';

function downloadReport(report: ReturnType<typeof loadReports>[number]) {
  const lines = [
    `ORBITAL COMMAND · INFORME SIMULADO · ${report.destination}`,
    `Objetivo: ${report.objective}`, `Instrumento: ${report.instrument}`,
    ...(report.eonetTarget ? [`Contexto real NASA EONET: ${report.eonetTarget.title} (${report.eonetTarget.id}); fecha del registro: ${report.eonetTarget.eventDate}; consultado: ${report.eonetTarget.retrievedAt}; ${targetSource(report.eonetTarget)}. El escaneo y los índices son simulados.`] : []),
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

export default function MissionReports({ onExit, language }: { onExit: () => void; language: "en" | "es" }) {
  const t = (es: string, en: string) => language === "es" ? es : en;
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
  const englishCriteria = [
    ['Galactic impact', `${reports.length} destinations with simulated reports; independent scientific validation is outstanding.`],
    ['Global connection', 'A fictional Dominican station and a story of collaboration; detailed international centres are outstanding.'],
    ['Storytelling', 'A commander, guidance and mission messages; extended narrative scenes remain outstanding.'],
    ['Inspiration', 'A story focused on home and cooperation; emotional impact has not been measured.'],
    ['Mission concept', 'Design, transit, exploration and transmission are connected using simplified models.'],
    ['Global impact', 'An Earth report and possible educational applications; no real-world solutions are claimed.'],
    ['Data use', 'Reports label readings and graphs as simulated.'],
    ['Science use', 'NASA sources and basic physical constraints; no real ephemerides.'],
    ['Technology', '3D exploration, rover, virtual probe and time simulation.'],
    ['Art and technology', 'Credited textures, 3D geometry and synthesised ambience; advanced cinematic quality remains outstanding.'],
  ];
  return <section className="systems-screen reports-screen" aria-label={t("Informes científicos", "Science reports")}><header className="systems-heading"><div><span>{t("RED INTERNACIONAL DE CIENCIA · 2042", "INTERNATIONAL SCIENCE NETWORK · 2042")}</span><h1>{t("Legado científico", "Scientific legacy")}</h1><p>{t("Los informes son resultados de la simulación; no son observaciones reales ni afirman que se hayan resuelto problemas de la Tierra.", "Reports contain simulated results, not real observations or claims that Earth’s problems have been solved.")}</p></div><button className="systems-secondary" onClick={onExit}>{t("← VOLVER", "← BACK")}</button></header>
    <div className={`engineering-layout reports-layout ${report ? "has-report" : "is-empty"}`}><div className="systems-card"><h2>{t("Informes transmitidos", "Transmitted reports")}</h2>{reports.length === 0 ? <p>{t("Completa una misión y transmite sus resultados para crear el primer informe.", "Complete a mission and transmit its results to create the first report.")}</p> : reports.map((item, index) => <button className="report-select" aria-pressed={index === selected} key={item.missionId} onClick={() => setSelected(index)}>{item.destination} · {item.missionName}</button>)}<div className="report-network"><strong>{t("COOPERACIÓN INTERNACIONAL", "INTERNATIONAL COOPERATION")}</strong><p>{t("El globo muestra estaciones reales como contexto educativo y una estación caribeña ficticia. Ninguna está conectada a esta simulación.", "The globe shows real stations for educational context and a fictional Caribbean station. None are connected to this simulation.")}</p><TrackingGlobe /></div><details className="criteria-panel"><summary>{t("Evaluación de los diez criterios", "Assessment of the ten criteria")}</summary><ol>{(language === "en" ? englishCriteria : criteria).map(([name, evidence]) => <li key={name}><strong>{name}</strong><p>{evidence}</p></li>)}</ol></details>{completed && <div className="systems-ok"><strong>THE LEGACY OF EXPLORATION</strong><p>Exploramos mundos para comprender mejor nuestro hogar. Estos informes reúnen resultados de la simulación y preguntas para futuras investigaciones.</p>{reports.filter((item) => chapterOrder.some((id) => id === item.missionId)).map((item) => <p key={item.missionId}><b>{item.destination}:</b> {item.significance}</p>)}<p>Exploramos mundos desconocidos para comprender mejor el único hogar que conocemos. El futuro depende también de lo que hagamos con lo aprendido.</p></div>}</div>
    {report && <article className="systems-card report-document"><span className="report-kicker">{t("INFORME DE MISIÓN · DATOS SIMULADOS", "MISSION REPORT · SIMULATED DATA")}</span><h2>{report.destination} · {report.missionName}</h2><h3>{t("Qué se investigó", "What was investigated")}</h3><p>{report.objective}</p>{report.eonetTarget && <section aria-label={t("Contexto real NASA EONET", "Real NASA EONET context")}><h3>{t("Evento real seleccionado · NASA EONET", "Selected real event · NASA EONET")}</h3><p>{report.eonetTarget.title} · {report.eonetTarget.id} · {report.eonetTarget.category}</p><p>{t("Fecha del registro", "Event date")}: {new Date(report.eonetTarget.eventDate).toLocaleString('es-DO')} · {t("consultado", "retrieved")}: {new Date(report.eonetTarget.retrievedAt).toLocaleString('es-DO')} · {report.eonetTarget.snapshot ? t('archivo publicado', 'published snapshot') : t('consulta del servidor', 'server request')}.</p><p>{t("Este evento es contexto observado por sus fuentes; los escaneos e índices del juego son simulados y no son mediciones del evento.", "This event provides context reported by its sources; game scans and indices are simulated and do not measure the event.")}</p><p><a href={targetSource(report.eonetTarget)} target="_blank" rel="noreferrer">{t("Consultar el registro original de NASA EONET ↗", "View original NASA EONET record ↗")}</a></p></section>}<h3>{t("Instrumento y observaciones", "Instrument and observations")}</h3><p>{report.instrument} · {report.transmittedUnits} {t("unidades simuladas generadas", "simulated units generated")}.</p><div className="report-chart" data-visualization="chart"><FullscreenControl label="gráfico científico" />{report.observations.map((item) => <div key={item.region}><span>{item.region}</span><div><i style={{ width: `${item.value}%` }} /></div><b>{item.value}</b></div>)}</div><p className="report-note">{t("Índices sintéticos de demostración, sin unidades físicas y sin correspondencia con mediciones reales.", "Synthetic demonstration indices, without physical units or correspondence to real measurements.")}</p>{Boolean(report.modelReadings?.length) && <><h3>{t("Lecturas del modelo virtual", "Virtual model readings")}</h3>{report.modelReadings?.map((reading, index) => <p key={`${reading.region}-${index}`}>{reading.region} · {reading.label}: {reading.value.toLocaleString('es-DO')} {reading.unit}</p>)}</>}<h3>{t("Muestras registradas", "Recorded samples")}</h3><p>{report.samples.length ? report.samples.join(' · ') : t('Ninguna: observación remota.', 'None: remote observation.')}</p><h3>{t("Objetivos completados", "Completed objectives")}</h3><p>{report.completedObjectives?.join(' · ') || t('Resultados transmitidos.', 'Results transmitted.')}</p><h3>{t("Fotografías y decisiones", "Photographs and decisions")}</h3><p>{t("Fotografías simuladas exportadas", "Simulated photographs exported")}: {report.photos ?? 0}.</p><p>{report.problems?.join(' ') || t('No se registraron decisiones de trayectoria.', 'No trajectory decisions were recorded.')}</p><h3>{t("Interpretación y límites", "Interpretation and limitations")}</h3><p>{report.significance} {t("Los datos mostrados no permiten por sí solos validar conclusiones científicas.", "These data alone cannot validate scientific conclusions.")}</p><p>{t("Tiempo simulado", "Simulated time")}: {report.elapsedDays.toFixed(1)} {t("días", "days")} · {t("Combustible restante", "Fuel remaining")}: {Math.round(report.fuelRemaining)}% · {t("Energía", "Energy")}: {Math.round(report.energyRemaining)}% · {t("Puntuación", "Score")}: {report.score}/100.</p><p>Variación neta de reservas: combustible {report.netFuelUsed === undefined ? 'sin registro' : `${Math.round(report.netFuelUsed)}%`} · energía {report.netEnergyUsed === undefined ? 'sin registro' : `${Math.round(report.netEnergyUsed)}%`}. Las recargas pueden reducir el consumo neto registrado.</p><p>{t("Posible contribución: orientar preguntas y comparaciones educativas. Las aplicaciones futuras necesitarían observaciones y análisis reales.", "Potential contribution: inform educational questions and comparisons. Future applications would require real observations and analysis.")}</p><button className="systems-secondary" onClick={() => downloadReport(report)}>{t("DESCARGAR INFORME", "DOWNLOAD REPORT")}</button><p><a href={report.source} target="_blank" rel="noreferrer">{t("Consultar contexto científico de NASA ↗", "View NASA scientific context ↗")}</a></p></article>}</div>
    <LearningEvidence language={language} completedMissions={reports.length} transmissionCount={readReportTransmissionCount()} />
  </section>;
}
