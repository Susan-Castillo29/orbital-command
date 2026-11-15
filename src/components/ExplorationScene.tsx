Warning: truncated output (original token count: 32259)
Total output lines: 1691

import { orbitProfiles } from '../systems/engineering';
import { localiseMission } from '../data/missionLocale';
import FullscreenControl from './FullscreenControl';
import { attachRenderQuality } from '../systems/renderQuality';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import type { Mission } from '../data/missions';
import { celestialBodies } from '../data/celestialBodies';
import {
  initialExplorationResources,
  initialLunarProgress,
  getLandingZones,
  loadExplorationResources,
  loadLunarProgress,
  lunarObjectives,
  objectiveCompletion,
  saveExplorationResources,
  saveLunarProgress,
} from '../systems/lunarCampaign';
import type { ExplorationResources, LunarProgress } from '../systems/lunarCampaign';
import { readStorage, writeStorage, removeStorage } from '../systems/storage';
import { awardMission } from '../systems/playerProgress';
import { playSound, startEngine, stopEngine } from '../systems/audio';
import type { ShipId } from '../data/ships';
import { hulls, instruments, radios, type MissionDesign } from '../systems/engineering';
import type { TransitState } from '../systems/transit';
import { createScienceReport, saveReport } from '../systems/science';
import { makeFailedAttempt, saveFailedAttempt } from '../systems/missionAttempts';
import { explorationFailureReason } from '../systems/explorationFailure';
import PlanetaryLab from './PlanetaryLab';
import type { LabReading } from '../data/planetaryLab';
import { loadPlanetTexture } from '../systems/planetTextures';
import { compressedTransmissionSeconds, estimatedSignalSeconds } from '../systems/communications';
import { isSimulatedDustStorm } from '../systems/weather';
import { isEonetTarget, type EonetTarget } from '../systems/eonet';
import { addBufferedData, emptyDataBuffers, totalBuffered, transmitBufferedData, type DataBuffers, type DataKind } from '../systems/dataBuffers';
import { getLiveSnapshot, setLivePose, subscribeLiveSnapshot, type LivePlayer, type LivePose } from '../collaboration/liveSession';
import { createPlayerAvatar, disposeAvatar, type AvatarRig } from './SolarSystemScene';

type Mode = 'flight' | 'orbit' | 'surface';
type PointOfInterest = { object: THREE.Group; kind: 'rock' | 'station'; index: number; name: string; position: THREE.Vector3 };
type BodyRuntime = { data: (typeof celestialBodies)[number]; group: THREE.Group; mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; orbitRadius: number; phase: number; angularSpeed: number };
type TutorialStep = { id: string; title: string; instruction: string };
type OrbitalSurvey = { arrived: boolean; scannedRegions: number[]; transmitted: boolean };
type SurfaceSensor = { x: number; z: number };

type Props = { mission: Mission; onExit: () => void; shipId: ShipId; design: MissionDesign; arrival: TransitState | null; scienceTarget: EonetTarget | null; language: "en" | "es" };

const tutorialOrder = ['travel', 'landing-zone', 'land', 'surface', 'scan', 'sample', 'station', 'recharge', 'analyze', 'antenna', 'transmit', 'complete'];
const emptyOrbitalSurvey: OrbitalSurvey = { arrived: false, scannedRegions: [], transmitted: false };
const orbitalRegions: Record<string, string[]> = {
  mars: ['Antiguo delta', 'Estratos arcillosos', 'Llanura de cráteres'],
  earth: ['Patrón de nubosidad', 'Corriente oceánica', 'Cobertura vegetal'],
  asteroid: ['Ladera metálica', 'Campo de regolito', 'Cráter de impacto'],
  europa: ['Fracturas de hielo', 'Llanura de bandas', 'Terreno caótico'],
  saturn: ['Anillo A', 'División de Cassini', 'Anillo E'],
  jupiter: ['Gran Mancha Roja', 'Banda ecuatorial', 'Tormenta polar'],
  sun: ['Corona solar', 'Arco magnético', 'Eyección de masa coronal'],
  mercury: ['Cráter de impacto', 'Llanura iluminada', 'Región polar en sombra'],
  venus: ['Nubes altas', 'Hemisferio nocturno', 'Patrón atmosférico'],
  titan: ['Nubes de metano', 'Región de lagos', 'Dunas ecuatoriales'],
  uranus: ['Atmósfera polar', 'Nubes altas', 'Entorno magnético'],
  neptune: ['Tormenta oscura', 'Nubes altas', 'Entorno de Tritón'],
};

function loadOrbitalSurvey(missionId: string): OrbitalSurvey {
  try {
    const saved = readStorage(`orbital-command-survey-${missionId}`);
    if (!saved) return { ...emptyOrbitalSurvey };
    const parsed = JSON.parse(saved) as Partial<OrbitalSurvey>;
    const scannedRegions = Array.isArray(parsed.scannedRegions)
      ? [...new Set(parsed.scannedRegions.filter((index) => Number.isInteger(index) && index >= 0 && index < 3))]
      : [];
    return { arrived: parsed.arrived === true, scannedRegions, transmitted: scannedRegions.length === 3 && parsed.transmitted === true };
  } catch {
    return { ...emptyOrbitalSurvey };
  }
}

function loadLabReadings(missionId: string): LabReading[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(`orbital-command-lab-${missionId}`) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is LabReading => Boolean(item && typeof item.region === 'string' && typeof item.label === 'string' && typeof item.unit === 'string' && typeof item.value === 'number' && Number.isFinite(item.value))).slice(0, 24);
  } catch { return []; }
}

function loadSurfaceSensors(missionId: string): SurfaceSensor[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(`orbital-command-sensors-${missionId}`) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SurfaceSensor => Boolean(item && typeof item.x === 'number' && typeof item.z === 'number' && Number.isFinite(item.x) && Number.isFinite(item.z) && Math.abs(item.x) <= 42 && Math.abs(item.z) <= 42)).slice(0, 3);
  } catch { return []; }
}
function loadDataBuffers(missionId: string, storage: number, freshArrival: boolean): DataBuffers {
  const fallback = { ...emptyDataBuffers(), telemetry: storage };
  if (freshArrival) return fallback;
  try {
    const saved: unknown = JSON.parse(readStorage(`orbital-command-buffers-${missionId}`) ?? 'null');
    if (!saved || typeof saved !== 'object') return fallback;
    const candidate = saved as Partial<DataBuffers>;
    if (['observations', 'sensors', 'telemetry'].some((key) => {
      const value = candidate[key as DataKind];
      return typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100;
    })) return fallback;
    const buffers = candidate as DataBuffers;
    return Math.abs(totalBuffered(buffers) - storage) < 0.01 ? buffers : fallback;
  } catch { return fallback; }
}
function loadMissionEvents(missionId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(`orbital-command-events-${missionId}`) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 20) : [];
  } catch { return []; }
}

function terrainHeight(x: number, z: number, bodyId = 'moon') {
  if (bodyId === 'mars') return Math.sin(x * 0.12) * 0.9 + Math.sin(z * 0.2) * 0.35 - 2.2 * Math.exp(-((x + z * 0.3) ** 2) / 35);
  if (bodyId === 'titan') return Math.sin(x * 0.2 + z * 0.04) * 0.8 + Math.sin(x * 0.08) * 0.5;
  const craters = bodyId === 'mercury' ? [[-18, -12, 7], [16, -18, 8], [21, 15, 5], [-22, 18, 8], [3, 25, 6], [0, 0, 3], [-8, 9, 4]] : [[-18, -12, 4], [16, -18, 5], [21, 15, 3.5], [-22, 18, 6], [3, 25, 4]];
  let height = Math.sin(x * 0.16) * Math.cos(z * 0.13) * 0.22 + Math.sin((x + z) * 0.31) * 0.08;
  for (const [cx, cz, radius] of craters) {
    const distance = Math.hypot(x - cx, z - cz);
    height -= Math.exp(-((distance - radius) ** 2) / 2.1) * 1.2;
    height += Math.exp(-((distance - radius * 1.18) ** 2) / 1.4) * 0.22;
  }
  return height;
}

function makeTerrainTexture(bodyId: string, color: string) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 8500; i += 1) {
    const shade = Math.random() > 0.5 ? '255,221,179' : '35,18,15';
    context.fillStyle = `rgba(${shade},${0.03 + Math.random() * 0.12})`;
    const size = 0.5 + Math.random() * (bodyId === 'titan' ? 3 : 2);
    context.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4);
  return texture;
}

function createSurface(bodyId: string) {
  const heightAt = (x: number, z: number) => terrainHeight(x, z, bodyId);
  const surfaceColor = bodyId === 'mars' ? '#a84f35' : bodyId === 'mercury' ? '#716861' : bodyId === 'titan' ? '#997041' : '#777a80';
  const root = new THREE.Group();
  const size = 90;
  const segments = 120;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    positions.setZ(i, heightAt(x, y));
  }
  geometry.computeVertexNormals();
  const terrainTexture = makeTerrainTexture(bodyId, surfaceColor);
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: terrainTexture ? '#ffffff' : surfaceColor, map: terrainTexture, roughness: 1, metalness: 0.02 });
  const terrain = new THREE.Mesh(geometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.y = -0.3;
  terrain.receiveShadow = true;
  root.add(terrain);

  const rockMaterial = new THREE.MeshStandardMaterial({ color: '#99928a', roughness: 1 });
  for (let i = 0; i < 80; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 7 + Math.random() * 37;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.7, 0), rockMaterial);
    rock.position.set(x, heightAt(x, z) + 0.05, z);
    rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    rock.scale.set(1 + Math.random(), 0.55 + Math.random() * 0.5, 0.8 + Math.random());
    root.add(rock);
  }

  const points: PointOfInterest[] = [];
  const sampleLocations: Array<[number, number]> = [[-11, -7], [10, -5], [4, 13]];
  sampleLocations.forEach(([x, z], index) => {
    const point = new THREE.Group();
    point.position.set(x, heightAt(x, z), z);
    point.userData.poiIndex = index;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: '#8de8ff', emissive: '#12728a', emissiveIntensity: 1.4 }));
    beacon.position.y = 1.35;
    point.add(beacon);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: '#78e5ff', transparent: true, opacity: 0.8 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    point.add(ring);
    root.add(point);
    const names = bodyId === 'mars' ? ['Estrato sedimentario', 'Afloramiento rojizo', 'Roca del antiguo delta'] : bodyId === 'mercury' ? ['Brecha craterizada', 'Llanura rocosa', 'Regolito polar'] : bodyId === 'titan' ? ['Duna orgánica', 'Canto de hielo', 'Depósito cercano al lago'] : ['Basalto vesicular', 'Brecha de impacto', 'Regolito polar'];
    points.push({ object: point, kind: 'rock', index, name: names[index], position: point.position.clone() });
  });

  const station = new THREE.Group();
  station.userData.poiIndex = 3;
  station.position.set(-1, heightAt(-1, -18), -18);
  const stationBase = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, 0.5, 8), new THREE.MeshStandardMaterial({ color: '#d8e6ee', metalness: 0.5, roughness: 0.45 }));
  stationBase.position.y = 0.25;
  station.add(stationBase);
  const stationTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 0.8, 8), new THREE.MeshStandardMaterial({ color: '#5bbfd8', emissive: '#0d3a4b', emissiveIntensity: 0.7 }));
  stationTop.position.y = 0.85;
  station.add(stationTop);
  root.add(station);
  points.push({ object: station, kind: 'station', index: 0, name: 'Estación de análisis', position: station.position.clone() });

  const rover = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.48, 1.65), new THREE.MeshStandardMaterial({ color: '#e1e6e8', metalness: 0.38, roughness: 0.55 }));
  chassis.position.y = 1;
  rover.add(chassis);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.95, 10), new THREE.MeshStandardMaterial({ color: '#a8d7e5', metalness: 0.5 }));
  mast.position.set(0, 1.67, -0.35);
  rover.add(mast);
  const camera = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.33, 0.42), new THREE.MeshStandardMaterial({ color: '#ffcb75', emissive: '#6f3a09', emissiveIntensity: 0.5 }));
  camera.position.set(0, 2.2, -0.35);
  rover.add(camera);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#333b44', metalness: 0.25, roughness: 0.85 });
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12), wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.78, 0.48, front * 0.58);
      rover.add(wheel);
    }
  }
  rover.position.set(0, heightAt(0, 0), 0);
  root.add(rover);
  const astronaut = new THREE.Group();
  const suitMaterial = new THREE.MeshStandardMaterial({ color: '#d9e5e9', roughness: 0.7 });
  const suit = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 10), suitMaterial); suit.position.y = 1; astronaut.add(suit);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.31, 16, 12), new THREE.MeshStandardMaterial({ color: '#e9f2f4', metalness: 0.3, roughness: 0.4 })); helmet.position.y = 1.75; astronaut.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: '#d8a449', metalness: 0.8, roughness: 0.2 })); visor.position.set(0, 1.77, -0.19); astronaut.add(visor);
  for (const side of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.42, 4, 8), suitMaterial); leg.position.set(side * 0.16, 0.36, 0); astronaut.add(leg); }
  astronaut.visible = false; root.add(astronaut);
  if (bodyId === 'titan') {
    const lake = new THREE.Mesh(new THREE.CircleGeometry(7, 40), new THREE.MeshStandardMaterial({ color: '#283943', roughness: 0.2, metalness: 0.15 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(25, heightAt(25, 20) + 0.05, 20); root.add(lake);
  }
  if (bodyId === 'mars') {
    const dust = new Float32Array(220 * 3);
    for (let i = 0; i < dust.length; i += 3) { dust[i] = (Math.random() - 0.5) * 85; dust[i + 1] = 1 + Math.random() * 8; dust[i + 2] = (Math.random() - 0.5) * 85; }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    root.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#eab18b', size: 0.18, transparent: true, opacity: 0.5 })));
  }
  const setZone = (zoneId: string) => {
    const alternate = ['mare', 'canyon', 'shadow', 'lakes'].includes(zoneId);
    const locations: Array<[number, number]> = alternate
      ? [[-15, -3], [8, -13], [14, 12]]
      : [[-11, -7], [10, -5], [4, 13]];
    locations.forEach(([x, z], index) => {
      const point = points[index];
      point.object.position.set(x, heightAt(x, z), z);
      point.position.copy(point.object.position);
    });
    const stationX = alternate ? 1 : -1;
    const stationZ = alternate ? -20 : -18;
    station.position.set(stationX, heightAt(stationX, stationZ), stationZ);
    points[3].position.copy(station.position);
    rover.position.set(0, heightAt(0, 0), 0);
    terrainMaterial.color.set(terrainTexture ? '#ffffff' : bodyId === 'moon' && zoneId === 'mare' ? '#817565' : surfaceColor);
  };
  return { root, rover, astronaut, points, setZone };
}

function makeShip(shipId: ShipId) {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(shipId === 'atlas' ? new THREE.CylinderGeometry(0.25, 0.32, 1.35, 10) : new THREE.CylinderGeometry(0.16, 0.23, 1.05, shipId === 'swift' ? 8 : 12), new THREE.MeshStandardMaterial({ color: shipId === 'atlas' ? '#d3a866' : '#dfe9ef', metalness: 0.55, roughness: 0.34 }));
  hull.rotation.x = Math.PI / 2;
  ship.add(hull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.48, 12), new THREE.MeshStandardMaterial({ color: '#63c9e8', metalness: 0.4, roughness: 0.32 }));
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -0.7;
  ship.add(nose);
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.25, 10), new THREE.MeshBasicMaterial({ color: '#ffb463' }));
  engine.rotation.x = Math.PI / 2;
  engine.position.z = 0.61;
  ship.add(engine);
  const panelMaterial = new THREE.MeshStandardMaterial({ color: shipId === 'swift' ? '#34a7bc' : shipId === 'atlas' ? '#9a6739' : '#2476a7', metalness: 0.45, roughness: 0.35, emissive: '#0b2842' });
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(shipId === 'atlas' ? new THREE.BoxGeometry(0.62, 0.26, 0.72) : shipId === 'swift' ? new THREE.ConeGeometry(0.36, 1.3, 4) : new THREE.BoxGeometry(1.05, 0.045, 0.5), panelMaterial);
    panel.position.set(side * (shipId === 'atlas' ? 0.7 : 0.85), shipId === 'atlas' ? 0.06 : 0, 0.08);
    if (shipId === 'swift') { panel.rotation.x = Math.PI / 2; panel.rotation.z = side * -0.4; }
    ship.add(panel);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), new THREE.MeshStandardMaterial({ color: '#d2b776', metalness: 0.7 }));
    strut.rotation.z = Math.PI / 2;
    strut.position.set(side * 0.42, 0, 0.08);
    ship.add(strut);
  }
  const trim = new THREE.Mesh(new THREE.TorusGeometry(shipId === 'atlas' ? 0.29 : 0.2, 0.018, 6, 20), new THREE.MeshStandardMaterial({ color: '#d9b878', metalness: 0.7, roughness: 0.3 }));
  trim.position.z = 0.28;
  ship.add(trim);
  const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), new THREE.MeshBasicMaterial({ color: '#82e9ff' }));
  sensor.position.set(0, 0.2, -0.25);
  ship.add(sensor);
  for (const side of [-1, 1]) {
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.16, 8), new THREE.MeshStandardMaterial({ color: '#aab9c1', metalness: 0.7, roughness: 0.35 }));
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(side * 0.16, 0, 0.58);
    ship.add(thruster);
  }
  return ship;
}

function getTutorialStep(progress: LunarProgress, mode: Mode, resources: ExplorationResources, atStation: boolean): TutorialStep {
  if (!progress.arrived) return { id: 'travel', title: 'Viaja a la Luna', instruction: 'Pulsa «Iniciar ruta». La nave seguirá el curso y establecerá una órbita segura.' };
  if (!progress.landingZone) return { id: 'landing-zone', title: 'Elige una región', instruction: 'En el selector de la derecha compara los sitios y elige una zona de descenso.' };
  if (!progress.landed) return { id: 'land', title: 'Confirma el aterrizaje', instruction: 'Revisa la zona elegida y pulsa «Aterrizar aquí» para desplegar el rover.' };
  if (mode !== 'surface') return { id: 'surface', title: 'Despliega el rover', instruction: 'Regresa al sitio de aterrizaje para comenzar la exploración de superficie.' };
  if (progress.scannedRocks.length < 3) return { id: 'scan', title: 'Escanea formaciones', instruction: 'Sigue la flecha hasta un beacon cian. Acércate y pulsa E para analizar la roca.' };
  if (progress.collectedSamples.length < 3) return { id: 'sample', title: 'Recolecta las muestras', instruction: 'La formación escaneada está lista. Vuelve a ella y pulsa E para guardar la muestra.' };
  if (!progress.analyzed) {
    if (!atStation) return { id: 'station', title: 'Vuelve al laboratorio', instruction: 'Sigue la flecha hasta la estación de análisis con las tres muestras.' };
    if (resources.energy < 30) return { id: 'recharge', title: 'Recarga el rover', instruction: 'Estás en la estación. Pulsa E para recargar la batería antes del análisis.' };
    return { id: 'analyze', title: 'Analiza las muestras', instruction: 'En la estación, pulsa E o selecciona el laboratorio para procesar las muestras.' };
  }
  if (!progress.transmitted) return atStation
    ? { id: 'transmit', title: 'Envía los resultados', instruction: 'Pulsa «Transmitir resultados» y espera el retraso de señal lunar.' }
    : { id: 'antenna', title: 'Regresa a la antena', instruction: 'Sigue la flecha de navegación hasta la estación para transmitir el informe.' };
  return { id: 'complete', title: 'Misión completada', instruction: 'La ciencia lunar llegó al centro de control. ¡Buen trabajo, comandante!' };
}

export default function ExplorationScene({ mission, onExit, shipId, design, arrival, scienceTarget, language }: Props) {
  const t = (es: string, en: string) => language === "es" ? es : en;
  const supportsSurface = ['moon', 'mars', 'mercury', 'titan'].includes(mission.id);
  const landingZones = getLandingZones(mission.id);
  const hostRef = useRef<HTMLDivElement>(null);
  const failureDialogRef = useRef<HTMLDivElement>(null);
  const cockpitRef = useRef(false);
  const explorationAttemptId = useRef(globalThis.crypto?.randomUUID?.() ?? `exploration-${Date.now()}-${Math.floor(Math.random() * 1e9)}`);
  const resourceWarningRef = useRef(false);
  const [progress, setProgress] = useState<LunarProgress>(() => loadLunarProgress(mission.id));
  const [orbitalSurvey, setOrbitalSurvey] = useState<OrbitalSurvey>(() => loadOrbitalSurvey(mission.id));
  const [samplesJustCompleted, setSamplesJustCompleted] = useState(false);
  const [resources, setResources] = useState<ExplorationResources>(() => arrival ? { fuel: arrival.fuel, energy: arrival.energy, integrity: arrival.integrity, storage: arrival.data, communications: 100, elapsedMinutes: arrival.elapsedDays * 1440 } : loadExplorationResources(mission.id));
  const [buffers, setBuffers] = useState<DataBuffers>(() => loadDataBuffers(mission.id, resources.storage, Boolean(arrival)));
  const [dataPriority, setDataPriority] = useState<DataKind>('observations');
  const [recordedTarget, setRecordedTarget] = useState<EonetTarget | null>(() => { try { const value: unknown = JSON.parse(readStorage(`orbital-command-eonet-scan-${mission.id}`) ?? 'null'); return isEonetTarget(value) ? value : null; } catch { return null; } });
  const [mode, setMode] = useState<Mode>('flight');
  const [landingInProgress, setLandingInProgress] = useState(false);
  const [selectedId, setSelectedId] = useState(mission.targetBodyId);
  const [hazardWarning, setHazardWarning] = useState('');
  const [landingZoneId, setLandingZoneId] = useState(() => loadLunarProgress(mission.id).landingZone ?? landingZones[0].id);
  const [selectedPoi, setSelectedPoi] = useState<{ index: number; kind: 'rock' | 'station'; name: string } | null>(null);
  const [atStation, setAtStation] = useState(false);
  const [transmissionCountdown, setTransmissionCountdown] = useState(0);
  const [windowCooldown, setWindowCooldown] = useState(0);
  const [transmissionType, setTransmissionType] = useState<'lunar' | 'orbital' | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [acquisition, setAcquisition] = useState<{ energy: number; data: number } | null>(null);
  const [firstLook, setFirstLook] = useState(() => Boolean(arrival && mission.id === 'earth' && readStorage('orbital-command-first-look-v1') !== 'done'));
  const [onFoot, setOnFoot] = useState(false);
  const [labReadings, setLabReadings] = useState<LabReading[]>(() => loadLabReadings(mission.id));
  const [photoCount, setPhotoCount] = useState(() => { const saved = Number(readStorage(`orbital-command-photos-${mission.id}`)); return Number.isInteger(saved) && saved >= 0 && saved <= 1000 ? saved : 0; });
  const [sensors, setSensors] = useState<SurfaceSensor[]>(() => loadSurfaceSensors(mission.id));
  const [satelliteDeployed, setSatelliteDeployed] = useState(() => mission.id === 'earth' && readStorage('orbital-command-satellite-earth') === 'done');
  const [dustStorm, setDustStorm] = useState(false);
  const [tutorialDismissed, setTutorialDismissed] = useState(() => readStorage(`orbital-command-tutorial-${mission.id}`) === 'done');
  const [tutorialPointer, setTutorialPointer] = useState<{ x: number; y: number; angle: number; visible: boolean } | null>(null);
  const tutorialDismissedRef = useRef(tutorialDismissed);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [cockpit, setCockpit] = useState(false);
  const [message, setMessage] = useState('Navegación libre activa · selecciona un astro o marca una ruta.');
  const scanEnergy = 5 + instruments[design.instrument].power * 2;
  const scanStorage = instruments[design.instrument].data * orbitProfiles[design.orbit ?? 'balanced'].coverage * 100 / hulls[design.ship].storage;

  const explorationFailure = explorationFailureReason(resources, mode, supportsSurface, progress.transmitted || orbitalSurvey.transmitted);
  useEffect(() => {
    if (!explorationFailure) return;
    const elapsedDays = Math.max(0, resources.elapsedMinutes / 1440);
    const state: TransitState = { elapsedDays, durationDays: Math.max(elapsedDays, arrival?.durationDays ?? elapsedDays), distanceKm: arrival?.distanceKm ?? 0, fuel: resources.fuel, energy: resources.energy, integrity: resources.integrity, data: resources.storage, decision: arrival?.decision ?? 'resolved', choice: arrival?.choice ?? null };
    saveFailedAttempt(makeFailedAttempt(explorationAttemptId.current, mission, design, state, explorationFailure, 'exploration'));
  }, [explorationFailure, mission, design, arrival, resources]);
  useEffect(() => {
    if (!explorationFailure || !failureDialogRef.current) return;
    const panel = failureDialogRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const buttons = [...panel.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
    buttons[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !buttons.length) return;
      if (event.shiftKey && (document.activeElement === buttons[0] || !panel.contains(document.activeElement))) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
      else if (!event.shiftKey && (document.activeElement === buttons[buttons.length - 1] || !panel.contains(document.activeElement))) { event.preventDefault(); buttons[0].focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [explorationFailure]);
  useEffect(() => { tutorialDismissedRef.current = tutorialDismissed; }, [tutorialDismissed]);
  useEffect(() => {
    if (!firstLook) return;
    const timer = window.setTimeout(() => { writeStorage('orbital-command-first-look-v1', 'done'); setFirstLook(false); }, 6500);
    return () => window.clearTimeout(timer);
  }, [firstLook]);
  useEffect(() => {
    if (windowCooldown <= 0) return;
    const timer = window.setTimeout(() => setWindowCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [windowCooldown]);
  useEffect(() => { window.dispatchEvent(new CustomEvent('orbital-ship-change', { detail: shipId })); }, [shipId]);

  useEffect(() => {
    if (progress.collectedSamples.length < 3) return;
    setSamplesJustCompleted(true);
    const timer = window.setTimeout(() => setSamplesJustCompleted(false), 3500);
    return () => window.clearTimeout(timer);
  }, [progress.collectedSamples.length]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030811');
    const camera = new THREE.PerspectiveCamera(54, host.clientWidth / host.clientHeight, 0.1, 220);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.className = 'exploration-canvas';
    host.appendChild(renderer.domElement);
    const detachQuality = attachRenderQuality(renderer, host);

    const ambient = new THREE.AmbientLight(0x9eb7d3, 0.62);
    scene.add(ambient);
    const sunLight = new THREE.PointLight(0xffe0b0, 420, 120, 1.5);
    scene.add(sunLight);
    const surfaceLight = new THREE.DirectionalLight(0xd6c6ad, 1.7);
    surfaceLight.position.set(-18, 35, 22);
    surfaceLight.visible = false;
    scene.add(surfaceLight);

    const starCount = 2600;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const radius = 70 + Math.random() * 90;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions.set([radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)], i * 3);
      const tint = i % 4 === 0 ? new THREE.Color('#7bb9ff') : new THREE.Color('#e6f4ff');
      starColors.set([tint.r, tint.g, tint.b], i * 3);
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.92, sizeAttenuation: true }));
    scene.add(stars);

    const system = new THREE.Group();
    scene.add(system);
    const SOLAR_EXCLUSION_RADIUS = 6.5;
    const SOLAR_WARNING_RADIUS = 11;
    const sun = new THREE.Mesh(new THREE.SphereGeometry(2.15, 48, 40), new THREE.MeshBasicMaterial({ color: '#ffc86b' }));
    sun.userData.bodyId = 'sun';
    system.add(sun);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(2.48, 32, 24), new THREE.MeshBasicMaterial({ color: '#ff9d45', transparent: true, opacity: 0.17, side: THREE.BackSide }));
    system.add(sunGlow);
    const exclusionPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 160; i += 1) {
      const angle = i / 160 * Math.PI * 2;
      exclusionPoints.push(new THREE.Vector3(Math.cos(angle) * SOLAR_EXCLUSION_RADIUS, 0, Math.sin(angle) * SOLAR_EXCLUSION_RADIUS));
    }
    const solarExclusion = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(exclusionPoints), new THREE.LineDashedMaterial({ color: '#ff8b67', dashSize: 0.38, gapSize: 0.24, transparent: true, opacity: 0.82 }));
    solarExclusion.computeLineDistances();
    system.add(solarExclusion);

    const bodies: BodyRuntime[] = [];
    const clickTargets: THREE.Object3D[] = [sun];
    const orbitMaterial = new THREE.LineBasicMaterial({ color: '#6c8dae', transparent: true, opacity: 0.19 });
    for (const data of celestialBodies) {
      const group = new THREE.Group();
      group.position.set(...data.position);
      const texture = loadPlanetTexture(data.id);
      const material = new THREE.MeshStandardMaterial({ color: texture ? '#ffffff' : data.color, map: texture, roughness: 0.84, metalness: 0.02, emissive: '#000000', emissiveIntensity: 0.7 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 36, 28), material);
      mesh.userData.bodyId = data.id;
      mesh.userData.bodyName = data.name;
      group.add(mesh);
      if (data.id === 'saturn') {
        const ring = new THREE.Mesh(new THREE.RingGeometry(data.radius * 1.28, data.radius * 1.9, 64), new THREE.MeshStandardMaterial({ color: '#d8c49d', side: THREE.DoubleSide, transparent: true, opacity: 0.72, roughness: 0.9 }));
        ring.rotation.x = Math.PI / 2.35;
        group.add(ring);
      }
      if (data.id === 'earth') {
        const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.09, 32, 24), new THREE.MeshBasicMaterial({ color: '#58baff', transparent: true, opacity: 0.12, side: THREE.BackSide }));
        group.add(atmosphere);
      }
      system.add(group);
      const orbitRadius = data.parentOrbit ?? Math.hypot(data.position[0], data.position[2]);
      const phase = data.orbitalParent ? 0.5 : Math.atan2(data.position[2], data.position[0]);
      const angularSpeed = (data.orbitalParent ? 0.11 : 0.18) / Math.max(orbitRadius, 1) ** 1.5;
      bodies.push({ data, group, mesh, material, orbitRadius, phase, angularSpeed });
      clickTargets.push(mesh);

      if (data.orbitalParent) {
        const parent = bodies.find((body) => body.data.id === data.orbitalParent);
        if (parent) {
          const points: THREE.Vector3[] = [];
          for (let i = 0; i <= 96; i += 1) {
            const angle = i / 96 * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius));
          }
          parent.group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial));
        }
      } else if (orbitRadius > 5) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 144; i += 1) {
          const angle = i / 144 * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius));
        }
        const orbit = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), orbitMaterial);
        system.add(orbit);
      }
    }

    const asteroidPositions = new Float32Array(850 * 3);
    for (let i = 0; i < 850; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 23.2 + Math.random() * 1.5;
      asteroidPositions.set([Math.cos(angle) * radius, (Math.random() - 0.5) * 0.8, Math.sin(angle) * radius], i * 3);
    }
    const asteroidGeometry = new THREE.BufferGeometry();
    asteroidGeometry.setAttribute('position', new THREE.BufferAttribute(asteroidPositions, 3));
    system.add(new THREE.Points(asteroidGeometry, new THREE.PointsMaterial({ color: '#b7a17b', size: 0.095, transparent: true, opacity: 0.82 })));

    const satelliteOrbit = new THREE.Group();
    if (mission.id === 'earth') {
      const satellite = new THREE.Group();
      satellite.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), new THREE.MeshStandardMaterial({ color: '#dbe7ed', metalness: 0.65 })));
      for (const side of [-1, 1]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.025, 0.2), new THREE.MeshStandardMaterial({ color: '#1d6c9b', metalness: 0.4 })); panel.position.x = side * 0.31; satellite.add(panel); }
      satellite.position.set(1.8, 0.4, 0); satelliteOrbit.add(satellite);
      bodies.find((item) => item.data.id === 'earth')?.group.add(satelliteOrbit);
    }
    satelliteOrbit.visible = satelliteDeployed;

    const ship = makeShip(shipId);
    ship.position.set(0, 1.1, 12);
    ship.rotation.order = 'YXZ';
    system.add(ship);
    const onShipChange = (event: Event) => {
      const nextId = (event as CustomEvent<ShipId>).detail;
      ship.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      ship.clear();
      const replacement = makeShip(nextId);
      while (replacement.children.length) ship.add(replacement.children[0]);
      ship.scale.setScalar(nextId === 'swift' ? 0.66 : nextId === 'atlas' ? 0.86 : 0.73);
    };
    window.addEventListener('orbital-ship-change', onShipChange);
    const routeGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const routeLine = new THREE.Line(routeGeometry, new THREE.LineDashedMaterial({ color: '#6be4ff', dashSize: 0.45, gapSize: 0.28, transparent: true, opacity: 0.85 }));
    routeLine.computeLineDistances();
    routeLine.visible = false;
    system.add(routeLine);
    const destinationMarker = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), new THREE.MeshBasicMaterial({ color: '#7deaff' }));
    destinationMarker.visible = false;
    system.add(destinationMarker);

    const surface = supportsSurface ? createSurface(mission.id) : { root: new THREE.Group(), rover: new THREE.Group(), astronaut: new THREE.Group(), points: [] as PointOfInterest[], setZone: (_zoneId: string) => {} };
    surface.setZone(progress.landingZone ?? landingZoneId);
    surface.root.visible = false;
    scene.add(surface.root);
    const teamAvatarLayer = new THREE.Group(); scene.add(teamAvatarLayer);
    const teamAvatars = new Map<string, { rig: AvatarRig; role: string; name: string }>();
    let teamPlayers: LivePlayer[] = [];
    let liveSelfId: string | null = null;
    let interactionUntil = 0;
    const refreshTeamAvatars = () => {
      const live = getLiveSnapshot(); teamPlayers = live.players; liveSelfId = live.selfId;
      teamAvatarLayer.visible = live.connected;
      for (const player of teamPlayers) {
        if (player.userId === liveSelfId || player.pose.mode === 'system') continue;
        let avatar = teamAvatars.get(player.userId);
        if (!avatar || avatar.role !== player.role || avatar.name !== player.displayName) {
          if (avatar) { teamAvatarLayer.remove(avatar.rig.root); disposeAvatar(avatar.rig); }
          const rig = createPlayerAvatar(player); avatar = { rig, role: player.role, name: player.displayName };
          teamAvatars.set(player.userId, avatar); teamAvatarLayer.add(rig.root);
        }
      }
      const connected = new Set(teamPlayers.filter((player) => player.userId !== liveSelfId && player.pose.mode !== 'system').map((player) => player.userId));
      for (const [id, avatar] of teamAvatars) if (!connected.has(id)) { teamAvatarLayer.remove(avatar.rig.root); disposeAvatar(avatar.rig); teamAvatars.delete(id); }
    };
    const unsubscribeTeamPresence = subscribeLiveSnapshot(refreshTeamAvatars);
    refreshTeamAvatars();
    const sensorGroup = new THREE.Group(); surface.root.add(sensorGroup);
    const createSensor = (position: SurfaceSensor) => {
      const sensor = new THREE.Group();
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 10), new THREE.MeshStandardMaterial({ color: '#d5e6ed', metalness: 0.45 })); mast.position.y = 0.6; sensor.add(mast);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: '#75e3ee', emissive: '#147b8d', emissiveIntensity: 0.9 })); tip.position.y = 1.3; sensor.add(tip);
      sensor.position.set(position.x, terrainHeight(position.x, position.z, mission.id), position.z); sensorGroup.add(sensor);
    };
    sensors.forEach(createSensor);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keys = new S…12259 tokens truncated…body.data.radius + 0.42);
            const bodyMu = 0.06 * body.data.radius ** 3;
            acceleration.addScaledVector(offset.normalize(), -bodyMu / (distanceToBody * distanceToBody));
          }
          flightVelocity.addScaledVector(acceleration, delta);
          // Solo se aplica una resistencia numérica mínima; el movimiento conserva casi toda su inercia en el vacío.
          flightVelocity.multiplyScalar(Math.exp(-0.0008 * delta));
          const maxSpeed = keys.has('shift') ? 18 : 8;
          if (flightVelocity.length() > maxSpeed) flightVelocity.setLength(maxSpeed);
          const beforeMove = ship.position.clone();
          const candidate = beforeMove.clone().addScaledVector(flightVelocity, delta);
          candidate.y = THREE.MathUtils.clamp(candidate.y, -45, 45);
          if (checkFlightSafety(candidate)) ship.position.copy(candidate);
          else flightVelocity.set(0, 0, 0);
          currentSpeed = flightVelocity.length();
        }
        if (routeTarget && routeLine.visible) {
          const attribute = routeLine.geometry.attributes.position as THREE.BufferAttribute;
          attribute.setXYZ(0, ship.position.x, ship.position.y, ship.position.z);
          attribute.setXYZ(1, routeTarget.x, routeTarget.y, routeTarget.z);
          attribute.needsUpdate = true;
          routeLine.geometry.computeBoundingSphere();
          routeLine.computeLineDistances();
        }
        shipForward.set(0, 0, -1).applyQuaternion(ship.quaternion);
        if (cockpitRef.current) {
          desiredCamera.copy(ship.position).addScaledVector(shipForward, 0.18).add(new THREE.Vector3(0, 0.18, 0));
          lookTarget.copy(ship.position).addScaledVector(shipForward, 12);
        } else {
          desiredCamera.copy(ship.position).addScaledVector(shipForward, -viewDistance).add(new THREE.Vector3(0, 2.2, 0));
          lookTarget.copy(ship.position).addScaledVector(shipForward, 3.5);
        }
        camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 5));
        camera.lookAt(lookTarget);
      } else if (modeNow === 'orbit') {
        const body = getBody(selectedNow);
        const center = selectedNow === 'sun' ? sun.position : body?.group.position;
        if (center) orbitCenter.copy(center);
        const horizontal = Math.cos(orbitPitch) * orbitDistance;
        desiredCamera.set(orbitCenter.x + Math.sin(orbitYaw) * horizontal, orbitCenter.y + Math.sin(orbitPitch) * orbitDistance, orbitCenter.z + Math.cos(orbitYaw) * horizontal);
        camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 5));
        camera.lookAt(orbitCenter);
        ship.position.set(orbitCenter.x + Math.cos(elapsed * 0.2) * (orbitDistance * 0.78), orbitCenter.y + 0.25, orbitCenter.z + Math.sin(elapsed * 0.2) * (orbitDistance * 0.78));
        ship.rotation.y = -elapsed * 0.2;
        if (selectedNow === 'sun') reportHazard('ADVERTENCIA: sonda en zona de calor solar. Se mantiene una órbita de observación segura.');
        else if (activeHazard.startsWith('ADVERTENCIA: sonda en zona de calor solar')) reportHazard('');
        currentSpeed = 0;
      } else {
        const vehicle = activeVehicle();
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(vehicle.rotation);
        const emergencyLimp = currentResources.energy <= 0;
        const boost = emergencyLimp ? 1 : keys.has('shift') ? 2.7 : 1;
        const roverSpeed = onFootNow ? 1.2 : emergencyLimp ? 0.85 : keys.has('shift') ? 8 : 3.8;
        const driving = keys.has('w') || keys.has('s') || keys.has('arrowup') || keys.has('arrowdown');
        const beforeMove = vehicle.position.clone();
        const previousHeight = vehicle.position.y;
        if (keys.has('w') || keys.has('arrowup')) vehicle.position.addScaledVector(forward, roverSpeed * (onFootNow ? 1 : boost) * delta);
        if (keys.has('s') || keys.has('arrowdown')) vehicle.position.addScaledVector(forward, -roverSpeed * 0.7 * delta);
        if (keys.has('a') || keys.has('arrowleft')) vehicle.rotation.y += delta * 1.1;
        if (keys.has('d') || keys.has('arrowright')) vehicle.rotation.y -= delta * 1.1;
        if (emergencyLimp && driving && elapsed - lastHudUpdate > 1) setMessageForSeconds('Reserva de emergencia · velocidad limitada. Regresa a la estación para recargar.');
        vehicle.position.x = THREE.MathUtils.clamp(vehicle.position.x, -42, 42);
        vehicle.position.z = THREE.MathUtils.clamp(vehicle.position.z, -42, 42);
        vehicle.position.y = terrainHeight(vehicle.position.x, vehicle.position.z, mission.id);
        const groundDistance = beforeMove.distanceTo(vehicle.position);
        if (currentResources.energy > 0) currentResources.energy = Math.max(0, currentResources.energy - groundDistance * 0.48 - (driving ? delta * 0.05 : 0));
        if (Math.abs(vehicle.position.y - previousHeight) > 0.32 && groundDistance > 0.1 && currentResources.integrity > 0) currentResources.integrity = Math.max(0, currentResources.integrity - 0.7);
        currentSpeed = driving ? roverSpeed * (onFootNow ? 1 : boost) : 0;
        const roverOffset = new THREE.Vector3(0, onFootNow ? 3 : 4.8, onFootNow ? 6 : 10).applyQuaternion(vehicle.quaternion);
        desiredCamera.copy(vehicle.position).add(roverOffset);
        lookTarget.copy(vehicle.position).add(new THREE.Vector3(0, 1.1, 0));
        camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 4));
        camera.lookAt(lookTarget);
        const station = surface.points.find((point) => point.kind === 'station');
        const nowAtStation = Boolean(station && vehicle.position.distanceTo(station.position) <= 4.2);
        stationNearby = nowAtStation;
        setAtStation((previous) => previous === nowAtStation ? previous : nowAtStation);
        surface.points.forEach((point) => { point.object.children[0]?.rotation && (point.object.children[0].rotation.y += delta * 0.7); });
      }

      if (liveSelfId && getLiveSnapshot().connected) {
        const avatarVehicle = modeNow === 'surface' ? activeVehicle() : ship;
        const driving = ['w', 's', 'arrowup', 'arrowdown'].some((key) => keys.has(key));
        const localActivity = performance.now() < interactionUntil ? 'interact' : modeNow !== 'surface' ? 'aboard' : driving ? keys.has('shift') ? 'run' : 'walk' : 'idle';
        const offsetX = modeNow === 'surface' && !onFootNow ? 1.5 : 0;
        const localPose: LivePose = { x: avatarVehicle.position.x + offsetX, y: avatarVehicle.position.y, z: avatarVehicle.position.z, yaw: avatarVehicle.rotation.y, activity: localActivity, mode: modeNow };
        setLivePose(localPose);
      }
      for (const player of teamPlayers) {
        const avatar = teamAvatars.get(player.userId); if (!avatar) continue;
        const pose = player.pose;
        avatar.rig.root.position.lerp(new THREE.Vector3(pose.x, pose.y, pose.z), 1 - Math.exp(-delta * 12));
        avatar.rig.root.rotation.y = pose.yaw;
        const gait = pose.activity === 'walk' ? 0.75 : pose.activity === 'run' ? 1.6 : pose.activity === 'interact' ? 0.25 : 0;
        for (let i = 0; i < avatar.rig.arms.length; i += 1) {
          avatar.rig.arms[i].rotation.z = gait ? Math.sin(elapsed * 8 * gait + i * Math.PI) * (pose.activity === 'interact' ? 0.42 : 0.48) : 0;
          avatar.rig.legs[i].rotation.x = gait && pose.activity !== 'interact' ? Math.sin(elapsed * 8 * gait + i * Math.PI) * 0.48 : 0;
        }
        avatar.rig.root.scale.setScalar(pose.activity === 'aboard' ? 0.52 : 0.76);
      }

      currentResources.elapsedMinutes += delta * 0.4;

      if (elapsed - lastGuideUpdate > 0.28) {
        lastGuideUpdate = elapsed;
        if (mission.id === 'moon' && !tutorialDismissedRef.current && modeNow === 'surface') {
          const targetPoint = currentProgress.scannedRocks.length < 3
            ? surface.points.find((point) => point.kind === 'rock' && !currentProgress.scannedRocks.includes(point.index))
            : currentProgress.collectedSamples.length < 3
              ? surface.points.find((point) => point.kind === 'rock' && !currentProgress.collectedSamples.includes(point.index))
              : surface.points.find((point) => point.kind === 'station');
          if (targetPoint) {
            const projected = targetPoint.position.clone().add(new THREE.Vector3(0, 2.2, 0)).project(camera);
            const targetX = (projected.x * 0.5 + 0.5) * host.clientWidth;
            const targetY = (-projected.y * 0.5 + 0.5) * host.clientHeight;
            const x = THREE.MathUtils.clamp(targetX, 26, host.clientWidth - 26);
            const y = THREE.MathUtils.clamp(targetY, 82, host.clientHeight - 34);
            const angle = Math.atan2(targetY - host.clientHeight / 2, targetX - host.clientWidth / 2) * 180 / Math.PI;
            setTutorialPointer({ x, y, angle, visible: true });
          } else setTutorialPointer(null);
        } else setTutorialPointer(null);
      }

      const storm = modeNow === 'surface' && isSimulatedDustStorm(mission.id, currentResources.elapsedMinutes);
      if (storm !== stormNow) {
        stormNow = storm; setDustStorm(storm);
        if (modeNow === 'surface' && mission.id === 'mars') { scene.background = new THREE.Color(storm ? '#9e5f42' : '#69483e'); scene.fog = new THREE.Fog(storm ? '#9e5f42' : '#69483e', storm ? 5 : 28, storm ? 34 : 95); }
        if (storm) {
          currentEvents = [...currentEvents, 'Tormenta de polvo simulada: visibilidad y reservas energéticas reducidas.'].slice(-20);
          writeStorage(`orbital-command-events-${mission.id}`, JSON.stringify(currentEvents));
          window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'mars-storm', title: 'TORMENTA DE POLVO', text: 'La visibilidad está disminuyendo. Protege los sistemas, vigila la energía y decide si conviene continuar o esperar.' } }));
        }
      }
      if (storm) currentResources.energy = Math.max(0, currentResources.energy - delta * (design.power === 'solar' ? 0.08 : 0.04));

      if (elapsed - lastHudUpdate > 0.2) {
        lastHudUpdate = elapsed;
        const currentTarget = getBody(selectedNow);
        if (currentTarget) setDistance(ship.position.distanceTo(currentTarget.group.position));
        else setDistance(ship.position.length());
        setSpeed(currentSpeed);
        setResources({ ...currentResources });
        const critical = [currentResources.fuel, currentResources.energy, currentResources.integrity, currentResources.communications].some((value) => value <= 20);
        if (critical && !resourceWarningRef.current) { playSound('warning'); resourceWarningRef.current = true; window.dispatchEvent(new CustomEvent('orbital-commander-transmission', { detail: { id: 'resource-warning', title: 'RECURSO CRÍTICO', text: 'Tenemos un recurso en nivel crítico. Revisa la telemetría y decide cómo continuar; todavía podemos proteger la misión si actuamos con calma.' } })); }
        else if (!critical) resourceWarningRef.current = false;
        if (elapsed % 5 < 0.25) saveExplorationResources(mission.id, currentResources);
      }
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(host);

    return () => {
      window.cancelAnimationFrame(animationId);
      unsubscribeTeamPresence();
      stopEngine();
      window.clearTimeout(toastTimer);
      window.clearTimeout(acquisitionTimer);
      window.clearTimeout(narrativeTimer);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('orbital-start-route', onStartRoute);
      window.removeEventListener('orbital-ship-change', onShipChange);
      window.removeEventListener('orbital-restart-mission', onRestartMission);
      window.removeEventListener('orbital-choose-landing-zone', onChooseLandingZone);
      window.removeEventListener('orbital-land', onLand);
      window.removeEventListener('orbital-interact-poi', onInteractPoi);
      window.removeEventListener('orbital-transmit-results', onTransmit);
      window.removeEventListener('orbital-transmit-orbit-results', onTransmitOrbital);
      window.removeEventListener('orbital-scan-sector', onScanOrbital);
      window.removeEventListener('orbital-lab-record', onLabRecord);
      window.removeEventListener('orbital-transmit-data', onTransmitData);
      window.removeEventListener('orbital-set-mode', onSetMode);
      window.removeEventListener('orbital-toggle-walking', onToggleWalking);
      window.removeEventListener('orbital-capture-photo', onCapturePhoto);
      window.removeEventListener('orbital-deploy-sensor', onDeploySensor);
      window.removeEventListener('orbital-deploy-satellite', onDeploySatellite);
      detachQuality(); renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          const disposeMaterial = (item: THREE.Material) => { if ('map' in item && item.map instanceof THREE.Texture) item.map.dispose(); item.dispose(); };
          if (Array.isArray(material)) material.forEach(disposeMaterial);
          else disposeMaterial(material);
        }
      });
    };
  }, [mission.id]);

  const selectedBody = celestialBodies.find((body) => body.id === selectedId);
  const selectedName = selectedBody?.name ?? (selectedId === 'sun' ? 'Sol' : mission.destination);
  const landingAllowed = supportsSurface && Boolean(selectedBody?.landing) && selectedId === mission.targetBodyId;
  const tutorialActive = mission.id === 'moon' && !tutorialDismissed && !progress.transmitted;
  const tutorialStep = getTutorialStep(progress, mode, resources, atStation);
  const tutorialStepNumber = tutorialOrder.indexOf(tutorialStep.id) + 1;
  const dismissTutorial = () => {
    tutorialDismissedRef.current = true;
    writeStorage(`orbital-command-tutorial-${mission.id}`, 'done');
    setTutorialDismissed(true);
    setTutorialPointer(null);
  };

  const setExplorationMode = (next: Mode) => {
    window.dispatchEvent(new CustomEvent<Mode>('orbital-set-mode', { detail: next }));
  };

  const startTravel = () => {
    const targetId = progress.landed && supportsSurface ? mission.targetBodyId : selectedId;
    const body = celestialBodies.find((item) => item.id === targetId);
    if (!body && targetId !== 'sun') {
      setMessage('Selecciona un cuerpo con una órbita de observación definida.');
      return;
    }
    setMessage(`Piloto automático: ruta a ${body?.name ?? 'Sol'} mediante un corredor seguro. Usa WASD para cancelar y tomar el control.`);
    const event = new CustomEvent('orbital-start-route', { detail: { id: body?.id ?? 'sun' } });
    window.dispatchEvent(event);
  };

  const enterOrbitOrSurface = (next: Mode) => {
    if (next === 'surface' && !landingAllowed) {
      setMessage('Aterrizaje no disponible en este cuerpo o para esta campaña.');
      return;
    }
    setExplorationMode(next);
    if (next === 'surface') setMessage(`Superficie simulada de ${mission.destination} · conduce hasta los marcadores y pulsa E para investigar.`);
    else if (next === 'orbit') setMessage('Modo orbital: arrastra para girar la cámara y usa la rueda para acercarte.');
    else setMessage('Navegación libre activa.');
  };

  const transmit = () => {
    if (!progress.analyzed || progress.transmitted) return;
    if (!atStation) { setMessage('Regresa a la antena de superficie para iniciar el enlace.'); return; }
    if (resources.communications < 12 || resources.energy < 5) { setMessage('Enlace no disponible: faltan energía o capacidad de comunicación.'); return; }
    setTransmissionCountdown(4);
    setTransmissionType('lunar');
    setMessage('Uplink de superficie iniciado · retraso de señal simulado: 4 s.');
  };

  const transmitOrbital = () => {
    if (!orbitalSurvey.arrived || orbitalSurvey.scannedRegions.length < 3 || orbitalSurvey.transmitted) return;
    if (mode !== 'orbit' || selectedId !== mission.targetBodyId) { setMessage(`Vuelve a la órbita de ${mission.destination} para transmitir.`); return; }
    if (resources.communications < 15 || resources.energy < 5) { setMessage('Uplink no disponible: faltan energía o capacidad de comunicación.'); return; }
    if (windowCooldown > 0) { setMessage('Espera la siguiente ventana de comunicación.'); return; }
    if (resources.storage * hulls[design.ship].storage / 100 > (radios[design.radio].data * orbitProfiles[design.orbit ?? 'balanced'].downlinkFactor) + 0.0001) { setMessage('El paquete supera esta ventana. Transmite paquetes parciales para liberar datos.'); return; }
    const signalSeconds = estimatedSignalSeconds(mission.id, resources.elapsedMinutes / 1440);
    const displaySeconds = compressedTransmissionSeconds(signalSeconds);
    setTransmissionCountdown(displaySeconds);
    setTransmissionType('orbital');
    setMessage(`Tiempo de luz estimado de ida: ${signalSeconds < 60 ? `${signalSeconds.toFixed(1)} s` : `${(signalSeconds / 60).toFixed(1)} min`}. Espera de juego comprimida: ${displaySeconds} s.`);
  };

  useEffect(() => {
    if (transmissionCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      if (transmissionCountdown === 1) {
        window.dispatchEvent(new Event(transmissionType === 'orbital' ? 'orbital-transmit-orbit-results' : 'orbital-transmit-results'));
        setTransmissionCountdown(0);
        setTransmissionType(null);
      } else setTransmissionCountdown((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [transmissionCountdown, transmissionType]);

  const progressSummary = objectiveCompletion(progress);
  const orbitalProgressPercent = Math.round(((orbitalSurvey.arrived ? 1 : 0) + orbitalSurvey.scannedRegions.length + (orbitalSurvey.transmitted ? 1 : 0)) / 5 * 100);
  const campaignRegions = [...(orbitalRegions[mission.id] ?? ['Sector norte', 'Sector ecuatorial', 'Sector sur'])];
  if (mission.id === 'earth' && scienceTarget && (!orbitalSurvey.scannedRegions.includes(0) || recordedTarget?.id === scienceTarget.id && recordedTarget.retrievedAt === scienceTarget.retrievedAt)) campaignRegions[0] = `EONET: ${scienceTarget.title}`;
  const selectedZone = landingZones.find((zone) => zone.id === landingZoneId) ?? landingZones[0];
  const selectLandingZone = (zoneId: string) => {
    setLandingZoneId(zoneId);
    window.dispatchEvent(new CustomEvent('orbital-choose-landing-zone', { detail: zoneId }));
  };
  const beginLanding = () => window.dispatchEvent(new CustomEvent('orbital-land', { detail: landingZoneId }));
  const restartMission = () => {
    explorationAttemptId.current = globalThis.crypto?.randomUUID?.() ?? `exploration-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    window.dispatchEvent(new Event('orbital-restart-mission'));
    setConfirmRestart(false);
  };
  const interactWithPoi = () => {
    if (selectedPoi) window.dispatchEvent(new CustomEvent('orbital-interact-poi', { detail: selectedPoi.kind === 'station' ? 3 : selectedPoi.index }));
  };

  return (
    <section data-visualization="exploration" className="exploration-view" aria-label={t("Exploración espacial 3D", "3D space exploration")}>
      <div className="exploration-stage" ref={hostRef} /><FullscreenControl language={language} label={language === "en" ? "space exploration" : "exploración espacial"} />
      {firstLook && <div className="first-look"><div className="first-look-window" /><div className="first-look-title"><span>{t("LA PRIMERA MIRADA", "THE FIRST LOOK")}</span><strong>{t("Un solo hogar", "One home")}</strong></div><button onClick={() => { writeStorage('orbital-command-first-look-v1', 'done'); setFirstLook(false); }}>{t("CONTINUAR →", "CONTINUE →")}</button></div>}
      <div className="explore-topbar"><button className="explore-back" onClick={onExit}>{t("← CENTRO DE MISIÓN", "← MISSION CONTROL")}</button><div><span className="live-dot" /> {t("EXPLORACIÓN 3D", "3D EXPLORATION")} <small>· {mode === 'surface' ? t("SUPERFICIE", "SURFACE") : mode === 'orbit' ? t("ÓRBITA", "ORBIT") : cockpit ? t("CABINA", "COCKPIT") : t("VUELO LIBRE", "FREE FLIGHT")}</small></div><span className="explore-coords">{speed.toFixed(1)} <small>m/s</small></span></div>
      {hazardWarning && <div className={`flight-warning ${hazardWarning.startsWith('ADVERTENCIA') ? 'caution' : 'blocked'}`} role="alert"><span>⚠</span>{hazardWarning}</div>}
      {dustStorm && <div className="dust-storm-warning" role="status">{t("TORMENTA DE POLVO SIMULADA · VISIBILIDAD Y ENERGÍA REDUCIDAS", "SIMULATED DUST STORM · REDUCED VISIBILITY AND POWER")}</div>}
      {landingInProgress && <div className="landing-overlay" role="status"><span>{t("SECUENCIA DE DESCENSO", "DESCENT SEQUENCE")}</span><b>{t("Frenado orbital y aproximación", "Orbital braking and approach")}</b><div><i /></div><small>{t("CONTROL AUTOMÁTICO · MANTÉN LA TELEMETRÍA A LA VISTA", "AUTOMATIC CONTROL · MONITOR TELEMETRY")}</small></div>}
      <aside className="explore-target-panel">
        <span className="eyebrow">{t("NAVEGACIÓN · DESTINO", "NAVIGATION · DESTINATION")}</span>
        <h2>{selectedName}</h2>
        <p>{selectedBody?.fact ?? 'La estrella central del sistema: objetivo de observación remota.'}</p>
        <div className="target-metrics"><div><small>{t("DISTANCIA", "DISTANCE")}</small><b>{distance.toFixed(1)} <i>u.e.</i></b></div><div><small>{t("CAMPAÑA", "CAMPAIGN")}</small><b>{mission.name}</b></div></div>
        {mode === 'flight' && <button className={`primary-button explore-action ${tutorialActive && ['travel', 'surface'].includes(tutorialStep.id) ? 'guided-action' : ''}`} onClick={startTravel}>{progress.landed && supportsSurface ? `VOLVER A ${mission.destination.toUpperCase()}` : t("INICIAR RUTA", "START ROUTE")} <b>↗</b></button>}
        {mode === 'orbit' && supportsSurface && selectedId === mission.targetBodyId && !progress.landed && <div className="landing-selector"><label htmlFor="landing-zone">{t("ZONA DE DESCENSO", "LANDING ZONE")}</label><select className={tutorialActive && tutorialStep.id === 'landing-zone' ? 'guided-action' : ''} id="landing-zone" value={landingZoneId} disabled={landingInProgress} onChange={(event) => selectLandingZone(event.target.value)}>{landingZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><small>{selectedZone.description}</small><button className={`primary-button explore-action ${tutorialActive && tutorialStep.id === 'land' ? 'guided-action' : ''}`} onClick={beginLanding} disabled={!progress.arrived || resources.fuel < 12 || resources.energy < 3 || landingInProgress}>{landingInProgress ? t("DESCENSO EN CURSO…", "DESCENT IN PROGRESS…") : t("INICIAR ATERRIZAJE", "BEGIN LANDING")} <b>↘</b></button><span className="landing-note">{t("DESCENSO GUIADO · 12% COMBUSTIBLE · 3% ENERGÍA · 2% INTEGRIDAD", "GUIDED DESCENT · 12% FUEL · 3% POWER · 2% INTEGRITY")}</span></div>}
        {mode === 'orbit' && supportsSurface && selectedId === mission.targetBodyId && progress.landed && <button className={`primary-button explore-action ${tutorialActive && tutorialStep.id === 'surface' ? 'guided-action' : ''}`} onClick={() => enterOrbitOrSurface('surface')}>{t("VOLVER AL SITIO DEL ROVER", "RETURN TO ROVER SITE")} <b>↓</b></button>}
        {mode === 'orbit' && !(supportsSurface && selectedId === mission.targetBodyId) && <button className="secondary-button explore-action" onClick={() => enterOrbitOrSurface('flight')}>{t("RETOMAR VUELO", "RESUME FLIGHT")} <b>↗</b></button>}
        {mode === 'surface' && <button className="secondary-button explore-action" disabled={onFoot} title={onFoot ? t("Vuelve primero al rover", "Return to the rover first") : undefined} onClick={() => enterOrbitOrSurface('orbit')}>{t("REGRESAR A ÓRBITA", "RETURN TO ORBIT")} <b>↑</b></button>}
        {mode === 'flight' && selectedBody && <small className="landing-note">{landingAllowed ? t("DESTINO COMPATIBLE CON DESCENSO", "DESTINATION SUITABLE FOR LANDING") : t("OBSERVACIÓN ORBITAL · SIN DESCENSO", "ORBITAL OBSERVATION · NO LANDING")}</small>}
      </aside>
      <aside className="resource-panel" aria-label={t("Recursos de exploración", "Exploration resources")}><div className="resource-panel-title"><span className="eyebrow">{t("TELEMETRÍA DE MISIÓN", "MISSION TELEMETRY")}</span><small>T+ {Math.floor(resources.elapsedMinutes / 60).toString().padStart(2, '0')}:{Math.floor(resources.elapsedMinutes % 60).toString().padStart(2, '0')}</small></div>{([['fuel', t('COMBUSTIBLE','FUEL')], ['energy', t('ENERGÍA','ENERGY')], ['integrity', t('INTEGRIDAD','INTEGRITY')], ['storage', t('DATOS','DATA')], ['communications', t('ENLACE','LINK')]] as const).map(([key, label]) => <div className="resource-row" key={key}><span>{label}</span><div className="resource-track"><i className={resources[key] < 20 ? 'critical' : ''} style={{ width: `${resources[key]}%` }} /></div><b>{Math.round(resources[key])}%</b></div>)}{Object.values(resources).slice(0, 3).some((value) => value <= 20) && <small className="resource-alert">{t("⚠ RECURSO EN NIVEL CRÍTICO", "⚠ CRITICAL RESOURCE LEVEL")}</small>}{resources.fuel < 15 && <button className="restart-mission-button" onClick={() => setConfirmRestart(true)}>{t("COMBUSTIBLE CRÍTICO · REINICIAR CAMPAÑA", "CRITICAL FUEL · RESTART CAMPAIGN")}</button>}{mode === 'surface' && atStation && <small className="station-status">{t("ANTENA / RECARGA · AL ALCANCE", "ANTENNA / RECHARGE · IN RANGE")}</small>}</aside>
      {explorationFailure && <div ref={failureDialogRef} className="restart-confirm" role="alertdialog" aria-modal="true" aria-label={t('Misión fallida', 'Mission failed')}><b>{t('Misión fallida', 'Mission failed')}</b><p>{explorationFailure === 'integrity' ? t('La integridad de la nave llegó a cero durante la exploración.', 'Spacecraft integrity reached zero during exploration.') : t('La energía orbital es insuficiente para transmitir y este modelo no incluye recarga en órbita.', 'Orbital energy is insufficient to transmit and this model has no orbital recharge.')}</p><p>{t('Consulta el análisis en Informes o reinicia esta misión. Reiniciar borra sus objetivos y hallazgos actuales.', 'Review the analysis in Reports or restart this mission. Restarting clears its current objectives and discoveries.')}</p><div><button onClick={onExit}>{t('VOLVER A OPERACIONES', 'RETURN TO OPERATIONS')}</button><button onClick={restartMission}>{t('REINICIAR MISIÓN', 'RESTART MISSION')}</button></div></div>}
      {confirmRestart && <div className="restart-confirm" role="alertdialog" aria-modal="true" aria-label={t("Confirmar reinicio de campaña", "Confirm campaign restart")}><b>{t("¿Reiniciar", "Restart")} {mission.name}?</b><p>{t("La nave y los recursos volverán a la base terrestre. Se perderán los objetivos y descubrimientos guardados de esta campaña.", "The spacecraft and resources will return to Earth. Saved objectives and discoveries from this campaign will be lost.")}</p><div><button onClick={() => setConfirmRestart(false)}>{t("CANCELAR", "CANCEL")}</button><button className="restart-confirm-accept" onClick={restartMission}>{t("REINICIAR DESDE TIERRA", "RESTART FROM EARTH")}</button></div></div>}
      {(mission.id === 'moon' || supportsSurface && mode === 'surface') && <aside className="surface-objectives"><div className="objective-heading"><div><span className="eyebrow">{mission.name} · {t("OBJETIVOS", "OBJECTIVES")}</span><b>{progressSummary.percent}%</b></div><div className="objective-progress"><i style={{ width: `${progressSummary.percent}%` }} /></div></div>{lunarObjectives.filter((objective) => !(objective.id === 'samples' && objective.complete(progress) && !samplesJustCompleted)).map((objective, index) => { const complete = objective.complete(progress); const detail = objective.id === 'scan' ? `${progress.scannedRocks.length}/3` : objective.id === 'samples' ? `${progress.collectedSamples.length}/3` : complete ? t("LISTO", "DONE") : t("PENDIENTE", "PENDING"); return <div className={`objective-row ${complete ? 'complete' : ''}`} key={objective.id}><span>{complete ? '✓' : String(index + 1).padStart(2, '0')}</span>{objective.id === 'arrival' ? `Llegar a ${mission.destination}` : objective.label}<b>{detail}</b></div>; })}{mode === 'surface' && <div className="surface-activity">{atStation ? t("ESTACIÓN AL ALCANCE · PULSA E PARA ANALIZAR / RECARGAR", "STATION IN RANGE · PRESS E TO ANALYSE / RECHARGE") : t("CONDUCE HASTA UN BEACON O LA ESTACIÓN", "DRIVE TO A BEACON OR THE STATION")}</div>}{progress.analyzed && !progress.transmitted && mode === 'surface' && <button className={`primary-button transmit-button ${tutorialActive && tutorialStep.id === 'transmit' ? 'guided-action' : ''}`} disabled={!atStation || transmissionCountdown > 0} onClick={transmit}>{transmissionCountdown > 0 ? `UPLINK EN CURSO · ${transmissionCountdown} s` : atStation ? t("TRANSMITIR RESULTADOS · 4 s", "TRANSMIT RESULTS · 4 s") : t("REGRESA A LA ANTENA", "RETURN TO ANTENNA")} <b>↑</b></button>}{progress.transmitted && <strong className="mission-success">MISIÓN COMPLETADA · +{mission.reward} XP</strong>}</aside>}
      {mode === 'surface' && selectedPoi && <aside className="poi-context"><span className="eyebrow">{t("OBJETO CIENTÍFICO · INTERACCIÓN", "SCIENTIFIC OBJECT · INTERACTION")}</span><b>{selectedPoi.name}</b><small>{selectedPoi.kind === 'station' ? atStation ? t("Estación al alcance. Analiza las muestras o recarga sistemas.", "Station in range. Analyse samples or recharge systems.") : t("Conduce hasta la antena para usar el laboratorio.", "Drive to the antenna to use the laboratory.") : progress.collectedSamples.includes(selectedPoi.index) ? t("Muestra recolectada · sitio documentado.", "Sample collected · site documented.") : progress.scannedRocks.includes(selectedPoi.index) ? t("Composición registrada · puedes recolectar una muestra.", "Composition recorded · a sample can be collected.") : t("Afloramiento sin analizar · activa el espectrómetro a corta distancia.", "Unanalysed outcrop · activate the spectrometer at close range.")}</small><button className={`secondary-button ${tutorialActive && ((tutorialStep.id === 'scan' && selectedPoi.kind === 'rock' && !progress.scannedRocks.includes(selectedPoi.index)) || (tutorialStep.id === 'sample' && selectedPoi.kind === 'rock' && progress.scannedRocks.includes(selectedPoi.index)) || (tutorialStep.id === 'analyze' && selectedPoi.kind === 'station')) ? 'guided-action' : ''}`} onClick={interactWithPoi}>{selectedPoi.kind === 'station' ? progress.scannedRocks.length >= 3 && progress.collectedSamples.length >= 3 ? t("ANALIZAR / RECARGAR", "ANALYSE / RECHARGE") : t("RECARGAR SISTEMAS", "RECHARGE SYSTEMS") : progress.scannedRocks.includes(selectedPoi.index) ? t("RECOLECTAR MUESTRA", "COLLECT SAMPLE") : t("ESCANEAR FORMACIÓN", "SCAN FORMATION")} <b>↗</b></button></aside>}
      {mode === 'orbit' && selectedId === mission.targetBodyId && <button className="lab-open-button" onClick={() => setLabOpen(true)}>{t("ABRIR LABORATORIO 3D", "OPEN 3D LABORATORY")} · {labReadings.length} {t("LECTURAS", "READINGS")}</button>}
      {mode === 'orbit' && mission.id === 'earth' && selectedId === 'earth' && !satelliteDeployed && <button className="satellite-button" onClick={() => window.dispatchEvent(new Event('orbital-deploy-satellite'))}>{t("DESPLEGAR SATÉLITE · 5% ENERGÍA", "DEPLOY SATELLITE · 5% POWER")}</button>}
      {mode === 'surface' && ['moon', 'mars'].includes(mission.id) && <button className="lab-open-button" onClick={() => window.dispatchEvent(new Event('orbital-toggle-walking'))}>{onFoot ? t("VOLVER AL ROVER", "RETURN TO ROVER") : t("BAJAR DEL ROVER · CAMINAR", "LEAVE ROVER · WALK")}</button>}
      {(mode === 'surface' || mode === 'orbit') && <button className="science-camera-button" onClick={() => window.dispatchEvent(new Event('orbital-capture-photo'))}>{t("FOTOGRAFIAR", "TAKE PHOTO")} · {photoCount}</button>}
      {mode === 'surface' && <button className="surface-sensor-button" disabled={sensors.length >= 3 || labReadings.length >= 24 || resources.energy < 5 || resources.storage > 95} onClick={() => window.dispatchEvent(new Event('orbital-deploy-sensor'))}>{t("INSTALAR SENSOR", "DEPLOY SENSOR")} · {sensors.length}/3</button>}
      {labOpen && <PlanetaryLab language={language} bodyId={mission.targetBodyId} destination={localiseMission(mission, language).destination} instrument={design.instrument} canRecord={resources.energy >= scanEnergy / 2 && resources.storage + scanStorage / 3 <= 100 && labReadings.length < 24} onRecord={(reading) => window.dispatchEvent(new CustomEvent('orbital-lab-record', { detail: reading }))} onClose={() => setLabOpen(false)} />}
      {tutorialActive && <aside className="tutorial-coach" role="status"><span className="tutorial-step-tag">TUTORIAL · {tutorialStep.id === 'complete' ? t("LISTO", "DONE") : `${tutorialStepNumber}/${tutorialOrder.length - 1}`}</span><div className="tutorial-coach-main"><span className="tutorial-coach-arrow" aria-hidden="true">➤</span><div><b>{tutorialStep.title}</b><p>{tutorialStep.instruction}</p></div></div><button onClick={dismissTutorial}>{t("OMITIR TUTORIAL", "SKIP TUTORIAL")}</button></aside>}
      {tutorialActive && tutorialPointer?.visible && mode === 'surface' && <div className="tutorial-world-arrow" style={{ left: tutorialPointer.x, top: tutorialPointer.y, '--guide-angle': `${tutorialPointer.angle}deg` } as CSSProperties} aria-hidden="true"><span>➤</span><small>{tutorialStep.id === 'station' || tutorialStep.id === 'antenna' ? 'ESTACIÓN' : 'OBJETIVO'}</small></div>}
      {mission.id !== 'moon' && !(supportsSurface && mode === 'surface') && <aside className="surface-objectives orbital-objectives"><div className="objective-heading"><div><span className="eyebrow">{mission.name} · {t("CIENCIA ORBITAL", "ORBITAL SCIENCE")}</span><b>{orbitalProgressPercent}%</b></div><div className="objective-progress"><i style={{ width: `${orbitalProgressPercent}%` }} /></div></div><div className={`objective-row ${orbitalSurvey.arrived ? 'complete' : ''}`}><span>{orbitalSurvey.arrived ? '✓' : '01'}</span>{t("Establecer órbita en", "Establish orbit at")} {localiseMission(mission, language).destination}<b>{orbitalSurvey.arrived ? t("LISTO", "DONE") : t("PENDIENTE", "PENDING")}</b></div><div className={`objective-row ${orbitalSurvey.scannedRegions.length >= 3 ? 'complete' : ''}`}><span>{orbitalSurvey.scannedRegions.length >= 3 ? '✓' : '02'}</span>{t("Escanear sectores científicos", "Scan science sectors")}<b>{orbitalSurvey.scannedRegions.length}/3</b></div>{orbitalSurvey.scannedRegions.length > 0 && <small className="orbit-last-scan">{t("ÚLTIMO DATO", "LATEST DATA")} · {campaignRegions[orbitalSurvey.scannedRegions[orbitalSurvey.scannedRegions.length - 1]]}</small>}{mode === 'orbit' && <button className="secondary-button orbital-scan-button" disabled={!orbitalSurvey.arrived || selectedId !== mission.targetBodyId || mission.id === 'earth' && !satelliteDeployed || orbitalSurvey.scannedRegions.length >= 3 || resources.energy < scanEnergy || resources.storage + scanStorage > 100} onClick={() => window.dispatchEvent(new Event('orbital-scan-sector'))}>{t("ACTIVAR INSTRUMENTO · E", "ACTIVATE INSTRUMENT · E")} <b>⌁</b></button>}{mode === 'orbit' && selectedId === mission.targetBodyId && resources.storage > 0 && <><label className="data-priority">{t("Prioridad de datos", "Data priority")}<select aria-label={t("Prioridad de datos", "Data priority")} value={dataPriority} onChange={(event) => setDataPriority(event.target.value as DataKind)}><option value="observations">{t("Observaciones", "Observations")} · {(buffers.observations * hulls[design.ship].storage / 100).toFixed(1)} u</option><option value="sensors">{t("Sensores", "Sensors")} · {(buffers.sensors * hulls[design.ship].storage / 100).toFixed(1)} u</option><option value="telemetry">{t("Telemetría", "Telemetry")} · {(buffers.telemetry * hulls[design.ship].storage / 100).toFixed(1)} u</option></select></label><button className="secondary-button orbital-scan-button" disabled={windowCooldown > 0 || buffers[dataPriority] <= 0} onClick={() => window.dispatchEvent(new CustomEvent('orbital-transmit-data', { detail: dataPriority }))}>TRANSMITIR PAQUETE · {windowCooldown > 0 ? `ESPERA ${windowCooldown} s` : 'LIBERAR DATOS ↑'}</button></>}{orbitalSurvey.arrived && <div className={`objective-row ${orbitalSurvey.transmitted ? 'complete' : ''}`}><span>{orbitalSurvey.transmitted ? '✓' : '03'}</span>{t("Transmitir informe", "Transmit report")}<b>{orbitalSurvey.transmitted ? t("COMPLETO", "COMPLETE") : `${orbitalSurvey.scannedRegions.length}/3`}</b></div>}{orbitalSurvey.arrived && !orbitalSurvey.transmitted && orbitalSurvey.scannedRegions.length >= 3 && mode === 'orbit' && <button className="primary-button transmit-button" disabled={transmissionCountdown > 0 || windowCooldown > 0 || selectedId !== mission.targetBodyId} onClick={transmitOrbital}>{transmissionCountdown > 0 ? `UPLINK · ${transmissionCountdown} s` : t('TRANSMITIR INFORME', 'TRANSMIT REPORT')} <b>↑</b></button>}{orbitalSurvey.transmitted && <strong className="mission-success">CAMPAÑA COMPLETADA · +{mission.reward} XP</strong>}</aside>}
      <div className="explore-bottom-left"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span><small>{mode === 'surface' ? onFoot ? t("CAMINAR", "WALK") : t("CONDUCIR", "DRIVE") : t("VOLAR", "FLY")}</small>{(mode === 'surface' || mode === 'orbit' && mission.id !== 'moon') && <><span className="keycap">E</span><small>{mode === 'orbit' ? t("ESCANEAR", "SCAN") : t("ANALIZAR", "ANALYSE")}</small></>}<span className="keycap">SHIFT</span><small>{t("IMPULSO", "THRUST")}</small><span className="keycap">F</span><small>CABINA</small></div>
      <div className="explore-bottom-right"><span>{t("ARRASTRAR · ORIENTAR", "DRAG · ROTATE")}</span><span>{t("RUEDA · ZOOM", "SCROLL · ZOOM")}</span><span>{t("CLIC EN UN ASTRO · SELECCIONAR", "CLICK A BODY · SELECT")}</span></div>
      {acquisition && <div className="acquisition-result" role="status"><strong>{t("Registro científico guardado", "Scientific record saved")}</strong><span>{acquisition.data.toFixed(1)} unidades de datos añadidas</span><small>Energía utilizada: {acquisition.energy.toFixed(1)}% · {instruments[design.instrument].name}</small><small>Resultado de la simulación. Transmite los datos para incorporarlos al informe.</small></div>}
      {message && <div className="explore-toast" role="status">{message}</div>}
      <div className="explore-model-note">{t("VUELO 3D COMPRIMIDO · DISTANCIAS Y TIEMPO NO A ESCALA", "COMPRESSED 3D FLIGHT · DISTANCE AND TIME NOT TO SCALE")}</div>
    </section>
  );
}

