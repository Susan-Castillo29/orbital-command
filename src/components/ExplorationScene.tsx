import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as THREE from 'three';
import type { Mission } from '../data/missions';
import { celestialBodies } from '../data/celestialBodies';
import {
  landingZones,
  loadExplorationResources,
  loadLunarProgress,
  lunarObjectives,
  objectiveCompletion,
  saveExplorationResources,
  saveLunarProgress,
} from '../systems/lunarCampaign';
import type { ExplorationResources, LunarProgress } from '../systems/lunarCampaign';

type Mode = 'flight' | 'orbit' | 'surface';
type PointOfInterest = { object: THREE.Group; kind: 'rock' | 'station'; index: number; name: string; position: THREE.Vector3 };
type BodyRuntime = { data: (typeof celestialBodies)[number]; group: THREE.Group; mesh: THREE.Mesh; material: THREE.MeshStandardMaterial };
type TutorialStep = { id: string; title: string; instruction: string };

type Props = { mission: Mission; onExit: () => void };

function terrainHeight(x: number, z: number) {
  const craters = [[-18, -12, 4], [16, -18, 5], [21, 15, 3.5], [-22, 18, 6], [3, 25, 4]];
  let height = Math.sin(x * 0.16) * Math.cos(z * 0.13) * 0.22 + Math.sin((x + z) * 0.31) * 0.08;
  for (const [cx, cz, radius] of craters) {
    const distance = Math.hypot(x - cx, z - cz);
    height -= Math.exp(-((distance - radius) ** 2) / 2.1) * 1.2;
    height += Math.exp(-((distance - radius * 1.18) ** 2) / 1.4) * 0.22;
  }
  return height;
}

function createSurface() {
  const root = new THREE.Group();
  const size = 90;
  const segments = 120;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    positions.setZ(i, terrainHeight(x, y));
  }
  geometry.computeVertexNormals();
  const terrainMaterial = new THREE.MeshStandardMaterial({ color: '#777a80', roughness: 1, metalness: 0.02 });
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
    rock.position.set(x, terrainHeight(x, z) + 0.05, z);
    rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    rock.scale.set(1 + Math.random(), 0.55 + Math.random() * 0.5, 0.8 + Math.random());
    root.add(rock);
  }

  const points: PointOfInterest[] = [];
  const sampleLocations: Array<[number, number]> = [[-11, -7], [10, -5], [4, 13]];
  sampleLocations.forEach(([x, z], index) => {
    const point = new THREE.Group();
    point.position.set(x, terrainHeight(x, z), z);
    point.userData.poiIndex = index;
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: '#8de8ff', emissive: '#12728a', emissiveIntensity: 1.4 }));
    beacon.position.y = 1.35;
    point.add(beacon);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 32), new THREE.MeshBasicMaterial({ color: '#78e5ff', transparent: true, opacity: 0.8 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    point.add(ring);
    root.add(point);
    points.push({ object: point, kind: 'rock', index, name: ['Basalto vesicular', 'Brecha de impacto', 'Regolito polar'][index], position: point.position.clone() });
  });

  const station = new THREE.Group();
  station.userData.poiIndex = 3;
  station.position.set(-1, terrainHeight(-1, -18), -18);
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
  rover.position.set(0, terrainHeight(0, 0), 0);
  root.add(rover);
  const setZone = (zoneId: string) => {
    const locations: Array<[number, number]> = zoneId === 'mare'
      ? [[-15, -3], [8, -13], [14, 12]]
      : [[-11, -7], [10, -5], [4, 13]];
    locations.forEach(([x, z], index) => {
      const point = points[index];
      point.object.position.set(x, terrainHeight(x, z), z);
      point.position.copy(point.object.position);
    });
    const stationX = zoneId === 'mare' ? 1 : -1;
    const stationZ = zoneId === 'mare' ? -20 : -18;
    station.position.set(stationX, terrainHeight(stationX, stationZ), stationZ);
    points[3].position.copy(station.position);
    rover.position.set(0, terrainHeight(0, 0), 0);
    terrainMaterial.color.set(zoneId === 'mare' ? '#817565' : '#777a80');
  };
  return { root, rover, points, setZone };
}

function makeShip() {
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 1.05, 12), new THREE.MeshStandardMaterial({ color: '#dfe9ef', metalness: 0.55, roughness: 0.34 }));
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
  const panelMaterial = new THREE.MeshStandardMaterial({ color: '#2476a7', metalness: 0.45, roughness: 0.35, emissive: '#0b2842' });
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.045, 0.5), panelMaterial);
    panel.position.set(side * 0.85, 0, 0.08);
    ship.add(panel);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), new THREE.MeshStandardMaterial({ color: '#d2b776', metalness: 0.7 }));
    strut.rotation.z = Math.PI / 2;
    strut.position.set(side * 0.42, 0, 0.08);
    ship.add(strut);
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

export default function ExplorationScene({ mission, onExit }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cockpitRef = useRef(false);
  const [progress, setProgress] = useState<LunarProgress>(() => loadLunarProgress(mission.id));
  const [resources, setResources] = useState<ExplorationResources>(() => loadExplorationResources(mission.id));
  const [mode, setMode] = useState<Mode>('flight');
  const [selectedId, setSelectedId] = useState(mission.id);
  const [landingZoneId, setLandingZoneId] = useState(() => loadLunarProgress(mission.id).landingZone ?? 'shackleton');
  const [selectedPoi, setSelectedPoi] = useState<{ index: number; kind: 'rock' | 'station'; name: string } | null>(null);
  const [atStation, setAtStation] = useState(false);
  const [transmissionCountdown, setTransmissionCountdown] = useState(0);
  const [tutorialDismissed, setTutorialDismissed] = useState(() => localStorage.getItem(`orbital-command-tutorial-${mission.id}`) === 'done');
  const [tutorialPointer, setTutorialPointer] = useState<{ x: number; y: number; angle: number; visible: boolean } | null>(null);
  const tutorialDismissedRef = useRef(tutorialDismissed);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [cockpit, setCockpit] = useState(false);
  const [message, setMessage] = useState('Navegación libre activa · selecciona un astro o marca una ruta.');

  useEffect(() => { tutorialDismissedRef.current = tutorialDismissed; }, [tutorialDismissed]);

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
    const sun = new THREE.Mesh(new THREE.SphereGeometry(2.15, 48, 40), new THREE.MeshBasicMaterial({ color: '#ffc86b' }));
    sun.userData.bodyId = 'sun';
    system.add(sun);
    const sunGlow = new THREE.Mesh(new THREE.SphereGeometry(2.48, 32, 24), new THREE.MeshBasicMaterial({ color: '#ff9d45', transparent: true, opacity: 0.17, side: THREE.BackSide }));
    system.add(sunGlow);

    const bodies: BodyRuntime[] = [];
    const clickTargets: THREE.Object3D[] = [sun];
    const orbitMaterial = new THREE.LineBasicMaterial({ color: '#6c8dae', transparent: true, opacity: 0.19 });
    for (const data of celestialBodies) {
      const group = new THREE.Group();
      group.position.set(...data.position);
      const material = new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.84, metalness: 0.02, emissive: '#000000', emissiveIntensity: 0.7 });
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
      bodies.push({ data, group, mesh, material });
      clickTargets.push(mesh);

      const orbitRadius = Math.hypot(data.position[0], data.position[2]);
      if (orbitRadius > 5 && !['moon', 'europa', 'titan'].includes(data.id)) {
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

    const ship = makeShip();
    ship.position.set(12.7, 1.1, 1.5);
    ship.rotation.order = 'YXZ';
    system.add(ship);
    const routeGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const routeLine = new THREE.Line(routeGeometry, new THREE.LineDashedMaterial({ color: '#6be4ff', dashSize: 0.45, gapSize: 0.28, transparent: true, opacity: 0.85 }));
    routeLine.computeLineDistances();
    routeLine.visible = false;
    system.add(routeLine);
    const destinationMarker = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 12), new THREE.MeshBasicMaterial({ color: '#7deaff' }));
    destinationMarker.visible = false;
    system.add(destinationMarker);

    const surface = createSurface();
    surface.setZone(progress.landingZone ?? landingZoneId);
    surface.root.visible = false;
    scene.add(surface.root);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const keys = new Set<string>();
    const shipForward = new THREE.Vector3();
    const desiredCamera = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const orbitCenter = new THREE.Vector3();
    let modeNow: Mode = 'flight';
    let selectedNow = mission.id;
    let hovered: BodyRuntime | undefined;
    let dragStart: { x: number; y: number; yaw: number; pitch: number } | undefined;
    let dragged = false;
    let yaw = Math.PI;
    let pitch = 0;
    let orbitYaw = 0.5;
    let orbitPitch = 0.28;
    let orbitDistance = 5;
    let viewDistance = 7;
    let routeTarget: THREE.Vector3 | undefined;
    let routeBody: string | undefined;
    let autopilot = false;
    let currentProgress: LunarProgress = { ...progress };
    let currentResources: ExplorationResources = { ...resources };
    let stationNearby = false;
    let lastHudUpdate = 0;
    let lastGuideUpdate = 0;
    let currentSpeed = 0;
    let toastTimer = 0;
    const clock = new THREE.Clock();

    const setMessageForSeconds = (text: string) => {
      setMessage(text);
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setMessage(''), 4300);
    };
    const commitProgress = (patch: Partial<LunarProgress>, notification: string) => {
      currentProgress = { ...currentProgress, ...patch };
      setProgress(currentProgress);
      saveLunarProgress(mission.id, currentProgress);
      setMessageForSeconds(notification);
    };
    const commitResources = (patch: Partial<ExplorationResources>) => {
      currentResources = { ...currentResources, ...patch };
      setResources(currentResources);
      saveExplorationResources(mission.id, currentResources);
    };
    const setModeNow = (next: Mode) => {
      if (next === 'surface' && (!currentProgress.landed || !currentProgress.roverDeployed || selectedNow !== 'moon')) {
        setMessageForSeconds('Descenso bloqueado · establece órbita lunar y selecciona una zona de aterrizaje segura.');
        return;
      }
      const previous = modeNow;
      modeNow = next;
      setMode(next);
      system.visible = next !== 'surface';
      sunLight.visible = next !== 'surface';
      surfaceLight.visible = next === 'surface';
      surface.root.visible = next === 'surface';
      routeLine.visible = next === 'flight' && Boolean(routeTarget);
      if (next === 'orbit') {
        const body = bodies.find((item) => item.data.id === selectedNow);
        if (body) {
          orbitCenter.copy(body.group.position);
          orbitDistance = Math.max(body.data.radius + 3.4, 4.4);
          if (previous === 'surface') ship.position.set(orbitCenter.x + orbitDistance, orbitCenter.y + 0.4, orbitCenter.z);
        }
      }
    };
    const getBody = (id: string) => id === 'sun' ? undefined : bodies.find((item) => item.data.id === id);
    const raycastAt = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(clickTargets, false)[0];
    };
    const updateHover = (event: PointerEvent) => {
      if (modeNow === 'surface') return;
      const hit = raycastAt(event);
      const id = hit?.object.userData.bodyId as string | undefined;
      const next = id ? bodies.find((item) => item.data.id === id) : undefined;
      if (hovered !== next) {
        if (hovered) hovered.material.emissive.set('#000000');
        hovered = next;
        if (hovered) hovered.material.emissive.set(hovered.data.accent);
      }
      renderer.domElement.style.cursor = next ? 'pointer' : dragStart ? 'grabbing' : 'crosshair';
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragStart = { x: event.clientX, y: event.clientY, yaw: modeNow === 'orbit' ? orbitYaw : modeNow === 'surface' ? surface.rover.rotation.y : yaw, pitch: modeNow === 'orbit' ? orbitPitch : pitch };
      dragged = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      updateHover(event);
      if (!dragStart || (event.buttons & 1) === 0) return;
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > 5) dragged = true;
      if (!dragged) return;
      if (modeNow === 'orbit') {
        orbitYaw = dragStart.yaw - dx * 0.004;
        orbitPitch = THREE.MathUtils.clamp(dragStart.pitch + dy * 0.003, -0.95, 1.2);
      } else if (modeNow === 'surface') {
        surface.rover.rotation.y = dragStart.yaw - dx * 0.006;
      } else {
        yaw = dragStart.yaw - dx * 0.004;
        pitch = THREE.MathUtils.clamp(dragStart.pitch + dy * 0.003, -1.15, 1.15);
        ship.rotation.set(pitch, yaw, 0, 'YXZ');
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragStart) return;
      if (!dragged) {
        if (modeNow === 'surface') {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects(surface.points.map((point) => point.object), true)[0];
          let object: THREE.Object3D | null = hit?.object ?? null;
          while (object && !Number.isInteger(object.userData.poiIndex)) object = object.parent;
          const poiIndex = object?.userData.poiIndex as number | undefined;
          const point = poiIndex === undefined ? undefined : surface.points[poiIndex];
          if (point) {
            setSelectedPoi({ index: point.index, kind: point.kind, name: point.name });
            setMessageForSeconds(`${point.name} seleccionado · pulsa E o usa la acción contextual.`);
          } else setSelectedPoi(null);
        } else {
          const hit = raycastAt(event);
          const id = hit?.object.userData.bodyId as string | undefined;
          if (id) {
            selectedNow = id;
            setSelectedId(id);
            setMessageForSeconds(`${id === 'sun' ? 'Sol' : getBody(id)?.data.name ?? 'Destino'} seleccionado · revisa la ficha y traza una ruta.`);
          } else if (modeNow === 'flight') {
            raycaster.setFromCamera(pointer, camera);
            routeTarget = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, 18);
            routeTarget.y = THREE.MathUtils.clamp(routeTarget.y, -8, 8);
            routeBody = undefined;
            destinationMarker.position.copy(routeTarget);
            destinationMarker.visible = true;
            routeLine.visible = true;
            autopilot = true;
            setMessageForSeconds('Punto de navegación fijado · piloto automático activado.');
          }
        }
      }
      dragStart = undefined;
      updateHover(event);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (modeNow === 'orbit') orbitDistance = THREE.MathUtils.clamp(orbitDistance + event.deltaY * 0.008, 1.7, 28);
      else viewDistance = THREE.MathUtils.clamp(viewDistance + event.deltaY * 0.008, 3, 16);
    };
    const interactPoint = (index: number) => {
      if (modeNow !== 'surface') return;
      const point = surface.points[index];
      if (!point) return;
      const range = surface.rover.position.distanceTo(point.position);
      if (range > 4.2) {
        setMessageForSeconds(`${point.name} está a ${range.toFixed(1)} m · acércate a menos de 4 m para interactuar.`);
        return;
      }
      if (point.kind === 'rock') {
        if (!currentProgress.scannedRocks.includes(point.index)) {
          if (currentResources.energy < 8) { setMessageForSeconds('Energía insuficiente para activar el espectrómetro. Regresa a la estación de recarga.'); return; }
          if (currentResources.storage + 8 > 100) { setMessageForSeconds('Almacenamiento lleno · transmite o revisa los datos antes de escanear más.'); return; }
          const scannedRocks = [...currentProgress.scannedRocks, point.index];
          const beacon = point.object.children[0] as THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
          beacon.material.color.set('#8be6ac');
          beacon.material.emissive.set('#1a7044');
          commitProgress({ scannedRocks }, `${point.name} escaneado · composición mineral registrada (${scannedRocks.length}/3).`);
          commitResources({ energy: currentResources.energy - 8, storage: currentResources.storage + 8 });
          return;
        }
        if (currentProgress.collectedSamples.includes(point.index)) {
          setMessageForSeconds(`${point.name}: ya se tomó y está asegurado en el contenedor.`);
          return;
        }
        if (currentResources.energy < 6) { setMessageForSeconds('Energía insuficiente para el taladro de muestreo.'); return; }
        if (currentResources.storage + 12 > 100) { setMessageForSeconds('No hay espacio en el contenedor de muestras.'); return; }
        const collectedSamples = [...currentProgress.collectedSamples, point.index];
        commitProgress({ collectedSamples }, `Muestra de ${point.name} recolectada · ${collectedSamples.length}/3 muestras.`);
        commitResources({ energy: currentResources.energy - 6, storage: currentResources.storage + 12 });
        return;
      }
      if (currentResources.energy < 30) {
        const charged = Math.min(100, currentResources.energy + 45);
        commitResources({ energy: charged, communications: Math.min(100, currentResources.communications + 12) });
        setMessageForSeconds(`Estación de superficie: batería recargada a ${Math.round(charged)}% y enlace de radio restablecido.`);
        return;
      }
      if (currentProgress.analyzed) { setMessageForSeconds('Las muestras ya fueron analizadas en esta campaña.'); return; }
      if (currentProgress.scannedRocks.length < 3 || currentProgress.collectedSamples.length < 3) {
        setMessageForSeconds(`La estación requiere 3 escaneos y 3 muestras. Progreso: ${currentProgress.scannedRocks.length}/3 · ${currentProgress.collectedSamples.length}/3.`);
        return;
      }
      if (currentResources.energy < 12) { setMessageForSeconds('Energía insuficiente para el microscopio. Recarga antes del análisis.'); return; }
      if (currentResources.storage + 18 > 100) { setMessageForSeconds('Almacenamiento insuficiente para el informe de laboratorio.'); return; }
      commitProgress({ analyzed: true }, 'Análisis geológico completo · informe guardado en la computadora de a bordo.');
      commitResources({ energy: currentResources.energy - 12, storage: currentResources.storage + 18 });
    };
    const scanNearby = () => {
      if (modeNow !== 'surface') return;
      let nearestIndex = -1;
      let nearestDistance = Infinity;
      surface.points.forEach((point, index) => {
        const range = surface.rover.position.distanceTo(point.position);
        if (range < nearestDistance) { nearestDistance = range; nearestIndex = index; }
      });
      if (nearestIndex < 0 || nearestDistance > 4.2) {
        setMessageForSeconds('Sin objetivo científico al alcance · sigue los beacons cian.');
        return;
      }
      interactPoint(nearestIndex);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) event.preventDefault();
      keys.add(key);
      if (modeNow === 'flight' && ['w', 'a', 's', 'd'].includes(key) && autopilot) {
        autopilot = false;
        routeTarget = undefined;
        routeBody = undefined;
        routeLine.visible = false;
        destinationMarker.visible = false;
      }
      if (key === 'f' && !event.repeat && modeNow !== 'surface') {
        cockpitRef.current = !cockpitRef.current;
        setCockpit(cockpitRef.current);
      }
      if (key === 'e' && !event.repeat) scanNearby();
      if (key === 'escape' && modeNow !== 'flight') setModeNow('flight');
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();
    const onStartRoute = (event: Event) => {
      const id = (event as CustomEvent<{ id: string }>).detail.id;
      const body = getBody(id);
      if (!body) return;
      if (currentResources.fuel < 8) { setMessageForSeconds('Combustible crítico · la ruta no se puede iniciar de forma segura.'); return; }
      selectedNow = id;
      setSelectedId(id);
      const away = ship.position.clone().sub(body.group.position);
      if (away.lengthSq() < 0.001) away.set(1, 0, 0);
      routeTarget = body.group.position.clone().add(away.normalize().multiplyScalar(body.data.radius + 1.65));
      routeBody = id;
      destinationMarker.position.copy(routeTarget);
      destinationMarker.visible = true;
      routeLine.visible = true;
      autopilot = true;
      setModeNow('flight');
    };
    const onChooseLandingZone = (event: Event) => {
      const zoneId = (event as CustomEvent<string>).detail;
      if (!landingZones.some((zone) => zone.id === zoneId)) return;
      surface.setZone(zoneId);
      commitProgress({ landingZone: zoneId }, `Zona seleccionada: ${landingZones.find((zone) => zone.id === zoneId)?.name}. Confirma un descenso seguro.`);
    };
    const onLand = (event: Event) => {
      const zoneId = (event as CustomEvent<string>).detail;
      if (modeNow !== 'orbit' || selectedNow !== 'moon' || !currentProgress.arrived || !currentProgress.orbit) {
        setMessageForSeconds('Aterrizaje no disponible · llega primero a la Luna y establece órbita.');
        return;
      }
      if (!landingZones.some((zone) => zone.id === zoneId)) { setMessageForSeconds('Selecciona una zona de aterrizaje válida.'); return; }
      if (currentResources.fuel < 12 || currentResources.integrity < 35) { setMessageForSeconds('Recursos insuficientes para el descenso controlado.'); return; }
      surface.setZone(zoneId);
      commitResources({ fuel: currentResources.fuel - 12, energy: Math.max(currentResources.energy, 65), integrity: currentResources.integrity - 2 });
      commitProgress({ landingZone: zoneId, landed: true, roverDeployed: true }, 'Aterrizaje confirmado · rover desplegado en la región seleccionada.');
      setSelectedPoi(null);
      setModeNow('surface');
    };
    const onInteractPoi = (event: Event) => interactPoint((event as CustomEvent<number>).detail);
    const onTransmit = () => {
      if (modeNow !== 'surface' || !currentProgress.analyzed) { setMessageForSeconds('Transmisión bloqueada · completa primero el análisis geológico.'); return; }
      if (!stationNearby || surface.rover.position.distanceTo(surface.points[3].position) > 4.2) { setMessageForSeconds('Acércate a la antena de superficie para establecer el enlace.'); return; }
      if (currentResources.communications < 12 || currentResources.energy < 5) { setMessageForSeconds('Recursos de enlace insuficientes · recarga en la estación antes de transmitir.'); return; }
      commitResources({ communications: currentResources.communications - 12, energy: currentResources.energy - 5 });
      commitProgress({ transmitted: true }, 'Enlace confirmado · resultados recibidos por el centro de control. ¡LUNAR FRONTIER completada!');
      tutorialDismissedRef.current = true;
      localStorage.setItem(`orbital-command-tutorial-${mission.id}`, 'done');
      setTutorialDismissed(true);
      setTutorialPointer(null);
    };
    const onSetMode = (event: Event) => setModeNow((event as CustomEvent<Mode>).detail);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointerleave', () => { if (!dragStart) renderer.domElement.style.cursor = 'crosshair'; });
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('orbital-start-route', onStartRoute);
    window.addEventListener('orbital-choose-landing-zone', onChooseLandingZone);
    window.addEventListener('orbital-land', onLand);
    window.addEventListener('orbital-interact-poi', onInteractPoi);
    window.addEventListener('orbital-transmit-results', onTransmit);
    window.addEventListener('orbital-set-mode', onSetMode);

    let animationId = 0;
    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.045);
      const elapsed = clock.elapsedTime;
      sun.rotation.y = elapsed * 0.035;
      sunGlow.scale.setScalar(1 + Math.sin(elapsed * 0.8) * 0.018);
      for (const body of bodies) body.mesh.rotation.y += delta * 0.08;
      stars.rotation.y = elapsed * 0.0007;

      if (modeNow === 'flight') {
        ship.rotation.set(pitch, yaw, 0, 'YXZ');
        if (autopilot && routeTarget) {
          const direction = routeTarget.clone().sub(ship.position);
          const remaining = direction.length();
          if (remaining < 0.62) {
            const arrivedAt = routeBody;
            autopilot = false;
            routeTarget = undefined;
            destinationMarker.visible = false;
            routeLine.visible = false;
            if (arrivedAt) {
              selectedNow = arrivedAt;
              setSelectedId(arrivedAt);
              routeBody = undefined;
              setModeNow('orbit');
              if (arrivedAt === 'moon' && mission.id === 'moon') {
                commitProgress({ arrived: true, orbit: true }, 'Luna alcanzada · órbita científica estable. Elige ahora una zona de aterrizaje.');
              } else setMessageForSeconds('Órbita establecida · el destino está listo para observación científica.');
            } else setMessageForSeconds('Punto de ruta alcanzado · navegación manual disponible.');
          } else {
            direction.normalize();
            const targetYaw = Math.atan2(-direction.x, -direction.z);
            const targetPitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
            yaw += THREE.MathUtils.euclideanModulo(targetYaw - yaw + Math.PI, Math.PI * 2) - Math.PI;
            pitch = THREE.MathUtils.lerp(pitch, targetPitch, Math.min(delta * 2.2, 1));
            ship.rotation.set(pitch, yaw, 0, 'YXZ');
            const step = Math.min(5.2 * delta, remaining);
            const fuelCost = step * 0.55;
            if (currentResources.fuel < fuelCost) {
              autopilot = false;
              setMessageForSeconds('Combustible agotado · no se puede continuar el piloto automático.');
            } else {
              ship.position.addScaledVector(direction, step);
              currentResources.fuel = Math.max(0, currentResources.fuel - fuelCost);
            }
            currentSpeed = 5.2;
          }
        } else {
          const forward = new THREE.Vector3(0, 0, -1).applyEuler(ship.rotation);
          const right = new THREE.Vector3(1, 0, 0).applyEuler(ship.rotation);
          const boost = keys.has('shift') ? 3.2 : 1;
          let moved = 0;
          const beforeMove = ship.position.clone();
          if (keys.has('w') || keys.has('arrowup')) { ship.position.addScaledVector(forward, 4.6 * boost * delta); moved = 4.6 * boost; }
          if (keys.has('s') || keys.has('arrowdown')) { ship.position.addScaledVector(forward, -3.2 * boost * delta); moved = 3.2 * boost; }
          if (keys.has('a')) ship.position.addScaledVector(right, -3.6 * boost * delta);
          if (keys.has('d')) ship.position.addScaledVector(right, 3.6 * boost * delta);
          const fuelCost = beforeMove.distanceTo(ship.position) * 0.55;
          if (currentResources.fuel < fuelCost) {
            ship.position.copy(beforeMove);
            moved = 0;
          } else currentResources.fuel = Math.max(0, currentResources.fuel - fuelCost);
          if (keys.has('arrowleft')) yaw += delta * 1.1;
          if (keys.has('arrowright')) yaw -= delta * 1.1;
          if (keys.has('arrowup')) pitch = Math.max(-1.1, pitch - delta * 0.65);
          if (keys.has('arrowdown')) pitch = Math.min(1.1, pitch + delta * 0.65);
          ship.position.y = THREE.MathUtils.clamp(ship.position.y, -18, 28);
          ship.rotation.set(pitch, yaw, 0, 'YXZ');
          if (routeTarget && routeLine.visible) {
            const attribute = routeLine.geometry.attributes.position as THREE.BufferAttribute;
            attribute.setXYZ(0, ship.position.x, ship.position.y, ship.position.z);
            attribute.setXYZ(1, routeTarget.x, routeTarget.y, routeTarget.z);
            attribute.needsUpdate = true;
            routeLine.geometry.computeBoundingSphere();
            routeLine.computeLineDistances();
          }
          currentSpeed = moved;
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
        if (body) orbitCenter.copy(body.group.position);
        const horizontal = Math.cos(orbitPitch) * orbitDistance;
        desiredCamera.set(orbitCenter.x + Math.sin(orbitYaw) * horizontal, orbitCenter.y + Math.sin(orbitPitch) * orbitDistance, orbitCenter.z + Math.cos(orbitYaw) * horizontal);
        camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 5));
        camera.lookAt(orbitCenter);
        ship.position.set(orbitCenter.x + Math.cos(elapsed * 0.2) * (orbitDistance * 0.78), orbitCenter.y + 0.25, orbitCenter.z + Math.sin(elapsed * 0.2) * (orbitDistance * 0.78));
        ship.rotation.y = -elapsed * 0.2;
        currentSpeed = 0;
      } else {
        const forward = new THREE.Vector3(0, 0, -1).applyEuler(surface.rover.rotation);
        const emergencyLimp = currentResources.energy <= 0;
        const boost = emergencyLimp ? 1 : keys.has('shift') ? 2.7 : 1;
        const roverSpeed = emergencyLimp ? 0.85 : keys.has('shift') ? 8 : 3.8;
        const driving = keys.has('w') || keys.has('s') || keys.has('arrowup') || keys.has('arrowdown');
        const beforeMove = surface.rover.position.clone();
        const previousHeight = surface.rover.position.y;
        if (keys.has('w') || keys.has('arrowup')) surface.rover.position.addScaledVector(forward, roverSpeed * boost * delta);
        if (keys.has('s') || keys.has('arrowdown')) surface.rover.position.addScaledVector(forward, -roverSpeed * 0.7 * delta);
        if (keys.has('a') || keys.has('arrowleft')) surface.rover.rotation.y += delta * 1.1;
        if (keys.has('d') || keys.has('arrowright')) surface.rover.rotation.y -= delta * 1.1;
        if (emergencyLimp && driving && elapsed - lastHudUpdate > 1) setMessageForSeconds('Reserva de emergencia · velocidad limitada. Regresa a la estación para recargar.');
        surface.rover.position.x = THREE.MathUtils.clamp(surface.rover.position.x, -42, 42);
        surface.rover.position.z = THREE.MathUtils.clamp(surface.rover.position.z, -42, 42);
        surface.rover.position.y = terrainHeight(surface.rover.position.x, surface.rover.position.z);
        const groundDistance = beforeMove.distanceTo(surface.rover.position);
        if (currentResources.energy > 0) currentResources.energy = Math.max(0, currentResources.energy - groundDistance * 0.48 - (driving ? delta * 0.05 : 0));
        if (Math.abs(surface.rover.position.y - previousHeight) > 0.32 && groundDistance > 0.1 && currentResources.integrity > 0) currentResources.integrity = Math.max(0, currentResources.integrity - 0.7);
        currentSpeed = driving ? roverSpeed * boost : 0;
        const roverOffset = new THREE.Vector3(0, 4.8, 10).applyQuaternion(surface.rover.quaternion);
        desiredCamera.copy(surface.rover.position).add(roverOffset);
        lookTarget.copy(surface.rover.position).add(new THREE.Vector3(0, 1.1, 0));
        camera.position.lerp(desiredCamera, 1 - Math.exp(-delta * 4));
        camera.lookAt(lookTarget);
        const station = surface.points.find((point) => point.kind === 'station');
        const nowAtStation = Boolean(station && surface.rover.position.distanceTo(station.position) <= 4.2);
        stationNearby = nowAtStation;
        setAtStation((previous) => previous === nowAtStation ? previous : nowAtStation);
        surface.points.forEach((point) => { point.object.children[0]?.rotation && (point.object.children[0].rotation.y += delta * 0.7); });
      }

      if (modeNow !== 'orbit') currentResources.elapsedMinutes += delta * 0.4;

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

      if (elapsed - lastHudUpdate > 0.2) {
        lastHudUpdate = elapsed;
        const currentTarget = getBody(selectedNow);
        if (currentTarget) setDistance(ship.position.distanceTo(currentTarget.group.position));
        else setDistance(ship.position.length());
        setSpeed(currentSpeed);
        setResources({ ...currentResources });
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
      window.clearTimeout(toastTimer);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('orbital-start-route', onStartRoute);
      window.removeEventListener('orbital-choose-landing-zone', onChooseLandingZone);
      window.removeEventListener('orbital-land', onLand);
      window.removeEventListener('orbital-interact-poi', onInteractPoi);
      window.removeEventListener('orbital-transmit-results', onTransmit);
      window.removeEventListener('orbital-set-mode', onSetMode);
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
    };
  }, [mission.id]);

  const selectedBody = celestialBodies.find((body) => body.id === selectedId);
  const selectedName = selectedBody?.name ?? (selectedId === 'sun' ? 'Sol' : mission.destination);
  const landingAllowed = Boolean(selectedBody?.landing) && selectedId === 'moon';
  const tutorialActive = mission.id === 'moon' && !tutorialDismissed && !progress.transmitted;
  const tutorialStep = getTutorialStep(progress, mode, resources, atStation);
  const dismissTutorial = () => {
    tutorialDismissedRef.current = true;
    localStorage.setItem(`orbital-command-tutorial-${mission.id}`, 'done');
    setTutorialDismissed(true);
    setTutorialPointer(null);
  };

  const setExplorationMode = (next: Mode) => {
    window.dispatchEvent(new CustomEvent<Mode>('orbital-set-mode', { detail: next }));
  };

  const startTravel = () => {
    const targetId = progress.landed && mission.id === 'moon' ? 'moon' : selectedId;
    const body = celestialBodies.find((item) => item.id === targetId);
    if (!body) {
      setMessage('El Sol es un objetivo de observación; selecciona un planeta para fijar una ruta segura.');
      return;
    }
    setMessage(`Piloto automático: ruta a ${body.name}. Usa WASD para cancelar y tomar el control.`);
    const event = new CustomEvent('orbital-start-route', { detail: { id: body.id } });
    window.dispatchEvent(event);
  };

  const enterOrbitOrSurface = (next: Mode) => {
    if (next === 'surface' && !landingAllowed) {
      setMessage('Aterrizaje no disponible en este cuerpo o para esta campaña.');
      return;
    }
    setExplorationMode(next);
    if (next === 'surface') setMessage('Superficie lunar aproximada · conduce hasta los marcadores y pulsa E para investigar.');
    else if (next === 'orbit') setMessage('Modo orbital: arrastra para girar la cámara y usa la rueda para acercarte.');
    else setMessage('Navegación libre activa.');
  };

  const transmit = () => {
    if (!progress.analyzed || progress.transmitted) return;
    if (!atStation) { setMessage('Regresa a la antena de superficie para iniciar el enlace.'); return; }
    if (resources.communications < 12 || resources.energy < 5) { setMessage('Enlace no disponible: faltan energía o capacidad de comunicación.'); return; }
    setTransmissionCountdown(4);
    setMessage('Uplink lunar iniciado · retraso de señal simulado: 4 s.');
  };

  useEffect(() => {
    if (transmissionCountdown <= 0) return;
    const timer = window.setTimeout(() => {
      if (transmissionCountdown === 1) {
        window.dispatchEvent(new Event('orbital-transmit-results'));
        setTransmissionCountdown(0);
      } else setTransmissionCountdown((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [transmissionCountdown]);

  const progressSummary = objectiveCompletion(progress);
  const selectedZone = landingZones.find((zone) => zone.id === landingZoneId) ?? landingZones[0];
  const selectLandingZone = (zoneId: string) => {
    setLandingZoneId(zoneId);
    window.dispatchEvent(new CustomEvent('orbital-choose-landing-zone', { detail: zoneId }));
  };
  const beginLanding = () => window.dispatchEvent(new CustomEvent('orbital-land', { detail: landingZoneId }));
  const interactWithPoi = () => {
    if (selectedPoi) window.dispatchEvent(new CustomEvent('orbital-interact-poi', { detail: selectedPoi.kind === 'station' ? 3 : selectedPoi.index }));
  };

  return (
    <section className="exploration-view" aria-label="Exploración espacial 3D">
      <div className="exploration-stage" ref={hostRef} />
      <div className="explore-topbar"><button className="explore-back" onClick={onExit}>← CENTRO DE MISIÓN</button><div><span className="live-dot" /> EXPLORACIÓN 3D <small>· {mode === 'surface' ? 'SUPERFICIE' : mode === 'orbit' ? 'ÓRBITA' : cockpit ? 'CABINA' : 'VUELO LIBRE'}</small></div><span className="explore-coords">{speed.toFixed(1)} <small>m/s</small></span></div>
      <aside className="explore-target-panel">
        <span className="eyebrow">NAVEGACIÓN · DESTINO</span>
        <h2>{selectedName}</h2>
        <p>{selectedBody?.fact ?? 'La estrella central del sistema: objetivo de observación remota.'}</p>
        <div className="target-metrics"><div><small>DISTANCIA</small><b>{distance.toFixed(1)} <i>u.e.</i></b></div><div><small>CAMPAÑA</small><b>{mission.name}</b></div></div>
        {mode === 'flight' && <button className={`primary-button explore-action ${tutorialActive && ['travel', 'surface'].includes(tutorialStep.id) ? 'guided-action' : ''}`} onClick={startTravel}>{progress.landed && mission.id === 'moon' ? 'VOLVER A LA LUNA' : 'INICIAR RUTA'} <b>↗</b></button>}
        {mode === 'orbit' && mission.id === 'moon' && selectedId === 'moon' && !progress.landed && <div className="landing-selector"><label htmlFor="landing-zone">ZONA DE DESCENSO</label><select className={tutorialActive && tutorialStep.id === 'landing-zone' ? 'guided-action' : ''} id="landing-zone" value={landingZoneId} onChange={(event) => selectLandingZone(event.target.value)}>{landingZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><small>{selectedZone.description}</small><button className={`primary-button explore-action ${tutorialActive && tutorialStep.id === 'land' ? 'guided-action' : ''}`} onClick={beginLanding} disabled={!progress.arrived || resources.fuel < 12}>ATERRIZAR AQUÍ <b>↓</b></button><span className="landing-note">DESCENSO: 12% COMBUSTIBLE · 2% INTEGRIDAD</span></div>}
        {mode === 'orbit' && mission.id === 'moon' && progress.landed && <button className={`primary-button explore-action ${tutorialActive && tutorialStep.id === 'surface' ? 'guided-action' : ''}`} onClick={() => enterOrbitOrSurface('surface')}>VOLVER AL SITIO DEL ROVER <b>↓</b></button>}
        {mode === 'orbit' && !(mission.id === 'moon' && selectedId === 'moon') && <button className="secondary-button explore-action" onClick={() => enterOrbitOrSurface('flight')}>RETOMAR VUELO <b>↗</b></button>}
        {mode === 'surface' && <button className="secondary-button explore-action" onClick={() => enterOrbitOrSurface('orbit')}>REGRESAR A ÓRBITA <b>↑</b></button>}
        {mode === 'flight' && selectedBody && <small className="landing-note">{landingAllowed ? 'DESTINO COMPATIBLE CON DESCENSO' : 'OBSERVACIÓN ORBITAL · SIN DESCENSO'}</small>}
      </aside>
      <aside className="resource-panel" aria-label="Recursos de exploración"><div className="resource-panel-title"><span className="eyebrow">TELEMETRÍA DE MISIÓN</span><small>T+ {Math.floor(resources.elapsedMinutes / 60).toString().padStart(2, '0')}:{Math.floor(resources.elapsedMinutes % 60).toString().padStart(2, '0')}</small></div>{([['fuel', 'COMBUSTIBLE'], ['energy', 'ENERGÍA'], ['integrity', 'INTEGRIDAD'], ['storage', 'DATOS'], ['communications', 'ENLACE']] as const).map(([key, label]) => <div className="resource-row" key={key}><span>{label}</span><div className="resource-track"><i className={resources[key] < 20 ? 'critical' : ''} style={{ width: `${resources[key]}%` }} /></div><b>{Math.round(resources[key])}%</b></div>)}{Object.values(resources).slice(0, 3).some((value) => value <= 20) && <small className="resource-alert">⚠ RECURSO EN NIVEL CRÍTICO</small>}{mode === 'surface' && atStation && <small className="station-status">ANTENA / RECARGA · AL ALCANCE</small>}</aside>
      {mission.id === 'moon' && <aside className="surface-objectives"><div className="objective-heading"><div><span className="eyebrow">LUNAR FRONTIER · OBJETIVOS</span><b>{progressSummary.percent}%</b></div><div className="objective-progress"><i style={{ width: `${progressSummary.percent}%` }} /></div></div>{lunarObjectives.filter((objective) => !(objective.id === 'samples' && objective.complete(progress))).map((objective, index) => { const complete = objective.complete(progress); const detail = objective.id === 'scan' ? `${progress.scannedRocks.length}/3` : objective.id === 'samples' ? `${progress.collectedSamples.length}/3` : complete ? 'LISTO' : 'PENDIENTE'; return <div className={`objective-row ${complete ? 'complete' : ''}`} key={objective.id}><span>{complete ? '✓' : String(index + 1).padStart(2, '0')}</span>{objective.label}<b>{detail}</b></div>; })}{mode === 'surface' && <div className="surface-activity">{atStation ? 'ESTACIÓN AL ALCANCE · PULSA E PARA ANALIZAR / RECARGAR' : 'CONDUCE HASTA UN BEACON O LA ESTACIÓN'}</div>}{progress.analyzed && !progress.transmitted && mode === 'surface' && <button className={`primary-button transmit-button ${tutorialActive && tutorialStep.id === 'transmit' ? 'guided-action' : ''}`} disabled={!atStation || transmissionCountdown > 0} onClick={transmit}>{transmissionCountdown > 0 ? `UPLINK EN CURSO · ${transmissionCountdown} s` : atStation ? 'TRANSMITIR RESULTADOS · 4 s' : 'REGRESA A LA ANTENA'} <b>↑</b></button>}{progress.transmitted && <strong className="mission-success">MISIÓN COMPLETADA · +180 XP</strong>}</aside>}
      {mode === 'surface' && selectedPoi && <aside className="poi-context"><span className="eyebrow">OBJETO CIENTÍFICO · INTERACCIÓN</span><b>{selectedPoi.name}</b><small>{selectedPoi.kind === 'station' ? atStation ? 'Estación al alcance. Analiza las muestras o recarga sistemas.' : 'Conduce hasta la antena para usar el laboratorio.' : progress.collectedSamples.includes(selectedPoi.index) ? 'Muestra recolectada · sitio documentado.' : progress.scannedRocks.includes(selectedPoi.index) ? 'Composición registrada · puedes recolectar una muestra.' : 'Afloramiento sin analizar · activa el espectrómetro a corta distancia.'}</small><button className={`secondary-button ${tutorialActive && ((tutorialStep.id === 'scan' && selectedPoi.kind === 'rock' && !progress.scannedRocks.includes(selectedPoi.index)) || (tutorialStep.id === 'sample' && selectedPoi.kind === 'rock' && progress.scannedRocks.includes(selectedPoi.index)) || (tutorialStep.id === 'analyze' && selectedPoi.kind === 'station')) ? 'guided-action' : ''}`} onClick={interactWithPoi}>{selectedPoi.kind === 'station' ? progress.scannedRocks.length >= 3 && progress.collectedSamples.length >= 3 ? 'ANALIZAR / RECARGAR' : 'RECARGAR SISTEMAS' : progress.scannedRocks.includes(selectedPoi.index) ? 'RECOLECTAR MUESTRA' : 'ESCANEAR FORMACIÓN'} <b>↗</b></button></aside>}
      {tutorialActive && <aside className="tutorial-coach" role="status"><span className="tutorial-step-tag">TUTORIAL · {tutorialStep.id === 'complete' ? 'LISTO' : `${progressSummary.completed + 1}/${progressSummary.total}`}</span><div className="tutorial-coach-main"><span className="tutorial-coach-arrow" aria-hidden="true">➤</span><div><b>{tutorialStep.title}</b><p>{tutorialStep.instruction}</p></div></div><button onClick={dismissTutorial}>OMITIR TUTORIAL</button></aside>}
      {tutorialActive && tutorialPointer?.visible && mode === 'surface' && <div className="tutorial-world-arrow" style={{ left: tutorialPointer.x, top: tutorialPointer.y, '--guide-angle': `${tutorialPointer.angle}deg` } as CSSProperties} aria-hidden="true"><span>➤</span><small>{tutorialStep.id === 'station' || tutorialStep.id === 'antenna' ? 'ESTACIÓN' : 'OBJETIVO'}</small></div>}
      <div className="explore-bottom-left"><span className="keycap">W</span><span className="keycap">A</span><span className="keycap">S</span><span className="keycap">D</span><small>{mode === 'surface' ? 'CONDUCIR' : 'VOLAR'}</small>{mode === 'surface' && <><span className="keycap">E</span><small>ANALIZAR</small></>}<span className="keycap">SHIFT</span><small>IMPULSO</small><span className="keycap">F</span><small>CABINA</small></div>
      <div className="explore-bottom-right"><span>ARRASTRAR · ORIENTAR</span><span>RUEDA · ZOOM</span><span>CLIC EN UN ASTRO · SELECCIONAR</span></div>
      {message && <div className="explore-toast" role="status">{message}</div>}
      <div className="explore-model-note">MODELO EDUCATIVO · DISTANCIAS Y VELOCIDADES SIMPLIFICADAS</div>
    </section>
  );
}
