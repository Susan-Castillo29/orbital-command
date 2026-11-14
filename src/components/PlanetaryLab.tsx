import FullscreenControl from './FullscreenControl';
import { attachRenderQuality } from '../systems/renderQuality';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { atmosphereComposition, hasAtmosphereModel, modelFor, type LabReading } from '../data/planetaryLab';
import { localiseLabText } from '../data/labLocale';
import type { InstrumentId } from '../systems/engineering';
import './planetary-lab.css';

type Props = { language: 'en' | 'es'; bodyId: string; destination: string; instrument: InstrumentId; canRecord: boolean; onRecord: (reading: LabReading) => void; onClose: () => void };
type Metric = 'reflectance' | 'temperature' | 'pressure' | 'density' | 'magnetic' | 'wind' | 'structure';
export default function PlanetaryLab({ bodyId, destination, instrument, canRecord, onRecord, onClose, language }: Props) {
  const t = (es: string, en: string) => language === 'es' ? es : en;
  const local = (value: string) => localiseLabText(value, language);
  const [mode, setMode] = useState<'atmosphere' | 'interior'>(() => hasAtmosphereModel(bodyId) ? 'atmosphere' : 'interior');
  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  indexRef.current = index;
  const [metric, setMetric] = useState<Metric>('temperature');
  const host = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const panel = dialog.current;
    if (!panel) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled])')];
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      if (event.shiftKey && (document.activeElement === items[0] || !panel.contains(document.activeElement))) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !panel.contains(document.activeElement))) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, []);
  const layers = modelFor(bodyId, mode);
  const layer = layers[index] ?? layers[0];
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); } catch { return; }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#06121e');
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 1.4, 8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const detachQuality = attachRenderQuality(renderer, element);
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const light = new THREE.DirectionalLight(0xc5e8ff, 2); light.position.set(4, 5, 6); scene.add(light);
    const model = new THREE.Group();
    layers.slice().reverse().forEach((item, reverseIndex) => {
      const layerIndex = layers.length - 1 - reverseIndex;
      const radius = 0.55 + reverseIndex * 0.46;
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 36, 22, 0, Math.PI * 1.55), new THREE.MeshStandardMaterial({ color: item.color, roughness: 0.65, emissive: item.color, emissiveIntensity: layerIndex === index ? 0.35 : 0.03, side: THREE.DoubleSide }));
      mesh.userData.layerIndex = layerIndex;
      model.add(mesh);
    });
    scene.add(model);
    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); if (document.hidden) return; if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) model.rotation.y += 0.003; model.children.forEach((node) => { ((node as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = node.userData.layerIndex === indexRef.current ? 0.35 : 0.03; }); renderer.render(scene, camera); };
    const resize = () => { const width = element.clientWidth || 320; const height = element.clientHeight || 280; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize(); render();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); model.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); (node.material as THREE.Material).dispose(); } }); detachQuality(); renderer.dispose(); renderer.domElement.remove(); };
  }, [bodyId, mode]);
  const metrics: { id: Metric; label: string; value: number; unit: string }[] = instrument === 'camera'
    ? [{ id: 'reflectance', label: 'Reflectancia simulada', value: 30 + index * 12, unit: 'índice / 100' }]
    : [
      ...(layer.temperature !== undefined ? [{ id: 'temperature' as const, label: 'Temperatura simulada', value: layer.temperature, unit: '°C' }] : []),
      ...(layer.pressure !== undefined ? [{ id: 'pressure' as const, label: 'Presión simulada', value: layer.pressure, unit: 'bar' }] : []),
      ...(layer.density !== undefined ? [{ id: 'density' as const, label: 'Densidad relativa simulada', value: layer.density, unit: 'índice relativo' }] : []),
      ...(bodyId === 'sun' ? [{ id: 'magnetic' as const, label: 'Actividad magnética simulada', value: 30 + index * 15, unit: 'índice / 100' }] : []),
      ...(bodyId === 'sun' && layer.name === 'Corona' ? [{ id: 'wind' as const, label: 'Viento solar simulado', value: 400, unit: 'km/s' }] : []),
      { id: 'structure', label: 'Índice de modelo simulado', value: (index + 1) * 10, unit: 'índice' },
    ];
  const selectedMetric = metrics.find((item) => item.id === metric) ?? metrics[0];
  const record = () => onRecord({ region: layer.name, label: selectedMetric.label, value: selectedMetric.value, unit: selectedMetric.unit });
  return <div className="lab-backdrop"><section ref={dialog} className="planetary-lab" data-visualization="lab" role="dialog" aria-modal="true" aria-label={`${t("Laboratorio de", "Laboratory of")} ${destination}`}>
    <header><div><span>{t("SONDA Y MODELO CIENTÍFICO · SIMULACIÓN", "PROBE AND SCIENTIFIC MODEL · SIMULATION")}</span><h2>{bodyId === 'sun' ? t('Observatorio solar', 'Solar observatory') : `${t("Laboratorio de", "Laboratory of")} ${destination}`}</h2></div><button onClick={onClose} aria-label={t("Cerrar laboratorio", "Close laboratory")}>×</button></header>
    <FullscreenControl language={language} label={language === "en" ? "planetary laboratory" : "laboratorio planetario"} /><div className="lab-layout"><div className="lab-model" ref={host} aria-label={t("Modelo tridimensional de capas", "Three-dimensional layer model")} /><div className="lab-controls">
      {bodyId !== 'sun' && <div className="lab-tabs">{hasAtmosphereModel(bodyId) && <button aria-pressed={mode === 'atmosphere'} onClick={() => { setMode('atmosphere'); setIndex(0); }}>{t('SONDA ATMOSFÉRICA', 'ATMOSPHERIC PROBE')}</button>}<button aria-pressed={mode === 'interior'} onClick={() => { setMode('interior'); setIndex(0); }}>{t('INTERIOR VIRTUAL', 'VIRTUAL INTERIOR')}</button></div>}
      <div className="lab-layers">{layers.map((item, i) => <button key={item.name} aria-pressed={index === i} onClick={() => setIndex(i)}>{String(i + 1).padStart(2, '0')} · {local(item.name)}</button>)}</div>
      <p>{local(layer.description)}</p>{layer.temperature !== undefined && <p>{t("TEMPERATURA SIMULADA", "SIMULATED TEMPERATURE")}: <strong>{layer.temperature.toLocaleString('es-DO')} °C</strong></p>}{layer.pressure !== undefined && <p>{t("PRESIÓN SIMULADA", "SIMULATED PRESSURE")}: <strong>{layer.pressure} bar</strong> · {t("DENSIDAD INDICATIVA", "INDICATIVE DENSITY")}: <strong>{layer.density}</strong></p>}
      {mode === 'atmosphere' && <><p>{t("COMPOSICIÓN GENERAL", "GENERAL COMPOSITION")}: {local(atmosphereComposition[bodyId] ?? "")}</p><p>{t("VELOCIDAD DE DESCENSO SIMULADA", "SIMULATED DESCENT SPEED")}: {Math.round(180 / (index + 1))} m/s</p>{index < layers.length - 1 && <button onClick={() => setIndex(index + 1)}>{t('DESCENDER A LA SIGUIENTE CAPA ↓', 'DESCEND TO NEXT LAYER ↓')}</button>}</>}
      <p className="lab-disclaimer">{t('Modelo interactivo educativo, sin escala ni mediciones reales. La selección de capas internas es una visualización, no una perforación.', 'Educational interactive model, not to scale or based on actual measurements. Internal layers are visualisations, not a drilling operation.')}</p>
      <label className="lab-metric">{t("Lectura disponible para el instrumento", "Reading available for the instrument")}<select value={selectedMetric.id} onChange={(event) => setMetric(event.target.value as Metric)}>{metrics.map((item) => <option key={item.id} value={item.id}>{local(item.label)}</option>)}</select></label>
      <button className="lab-record" disabled={!canRecord} onClick={record}>{t('REGISTRAR LECTURA · CONSUME ENERGÍA Y DATOS', 'RECORD READING · USES ENERGY AND DATA')}</button>
      {!canRecord && <p>{t('Revisa la energía y el espacio de almacenamiento antes de registrar otra lectura.', 'Check energy and storage before recording another reading.')}</p>}
    </div></div>
  </section></div>;
}
