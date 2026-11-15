import FullscreenControl from './FullscreenControl';
import { attachRenderQuality } from '../systems/renderQuality';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Mission } from '../data/missions';
import { localiseMission } from '../data/missionLocale';
import { celestialBodies } from '../data/celestialBodies';
import type { ShipId } from '../data/ships';
import { loadPlanetTexture } from '../systems/planetTextures';
import { getLiveSnapshot, setLivePose, submitLiveAction, subscribeLiveSnapshot, type LiveActivity, type LivePlayer, type LivePose } from '../collaboration/liveSession';

type Props = {
  mission: Mission;
  onSelect: (id: string) => void;
  shipId: ShipId;
  language: 'en' | 'es';
};

type Body = { id: string; orbit: number; phase: number; group: THREE.Group; speed: number; parent?: string };
export type AvatarRig = { root: THREE.Group; arms: THREE.Group[]; legs: THREE.Group[] };

const roleColors: Record<string, number> = { planning: 0x78d8ec, engineering: 0xd8b16a, science: 0x95dfaa, communications: 0xc39dff };
export function createPlayerAvatar(player: LivePlayer): AvatarRig {
  const root = new THREE.Group();
  root.userData.playerId = player.userId;
  const suit = new THREE.MeshStandardMaterial({ color: roleColors[player.role] ?? 0x78d8ec, metalness: 0.18, roughness: 0.6, emissive: roleColors[player.role] ?? 0x78d8ec, emissiveIntensity: 0.08 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xdfeef2, metalness: 0.34, roughness: 0.36 });
  const visor = new THREE.MeshStandardMaterial({ color: 0x17374a, metalness: 0.8, roughness: 0.18, emissive: 0x24799a, emissiveIntensity: 0.14 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 3, 8), suit); torso.position.y = 0.67; root.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), trim); helmet.position.y = 1.13; root.add(helmet);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 8), visor); face.position.set(0, 1.14, -0.09); root.add(face);
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.34, 0.13), trim); backpack.position.set(0, 0.72, 0.2); root.add(backpack);
  const arms: THREE.Group[] = []; const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.23, 0.83, 0); const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, 3, 6), suit); upper.position.y = -0.16; arm.add(upper); root.add(arm); arms.push(arm);
    const leg = new THREE.Group(); leg.position.set(side * 0.095, 0.39, 0); const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.27, 3, 6), trim); lower.position.y = -0.16; leg.add(lower); root.add(leg); legs.push(leg);
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0x64edb2 })); beacon.position.set(0.16, 1.25, 0); root.add(beacon);
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 96;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#06121ddd'; context.beginPath(); context.roundRect(3, 3, 378, 90, 18); context.fill();
    context.strokeStyle = '#76d7eeaa'; context.lineWidth = 3; context.stroke();
    context.fillStyle = '#effaff'; context.font = 'bold 32px Segoe UI, sans-serif'; context.textAlign = 'center'; context.fillText(player.displayName.slice(0, 18), 192, 41);
    context.fillStyle = '#91dced'; context.font = 'bold 20px Segoe UI, sans-serif'; context.fillText(player.role.toUpperCase(), 192, 72);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })); label.position.y = 1.72; label.scale.set(1.9, 0.48, 1); root.add(label);
  root.scale.setScalar(0.76);
  return { root, arms, legs };
}
export function disposeAvatar(rig: AvatarRig) {
  rig.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Sprite)) return;
    if (object instanceof THREE.Mesh) object.geometry.dispose();
    const material = object.material;
    for (const item of Array.isArray(material) ? material : [material]) {
      if ('map' in item && item.map instanceof THREE.Texture) item.map.dispose();
      item.dispose();
    }
  });
}

function makeOrbit(radius: number, color: number, opacity = 0.19) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 180; i += 1) {
    const angle = (i / 180) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function createPlanetTexture(base: string, light: string, id: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Texture();
  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, light);
  gradient.addColorStop(0.52, base);
  gradient.addColorStop(1, '#101725');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 32; i += 1) {
    context.globalAlpha = 0.08 + Math.random() * 0.12;
    context.fillStyle = i % 2 ? light : '#09111f';
    context.beginPath();
    const y = Math.random() * 256;
    const rocky = id === 'moon' || id === 'asteroid';
    const radius = 3 + Math.random() * 13;
    context.ellipse(Math.random() * 512, y, rocky ? radius : 35 + Math.random() * 140, rocky ? radius : 2 + Math.random() * 8, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeShip(shipId: ShipId) {
  const ship = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd7b56d, metalness: 0.78, roughness: 0.28 });
  const white = new THREE.MeshStandardMaterial({ color: 0xe7edf5, metalness: 0.56, roughness: 0.32 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x246ca5, metalness: 0.44, roughness: 0.4, emissive: 0x09223a });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.19, 0.72, 12), white);
  body.rotation.z = Math.PI / 2;
  ship.add(body);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold);
  dish.position.set(0.18, 0, 0);
  dish.rotation.z = -Math.PI / 2;
  ship.add(dish);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.46, 8), gold);
  mast.rotation.z = Math.PI / 2;
  mast.position.x = -0.5;
  ship.add(mast);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(shipId === 'atlas' ? new THREE.BoxGeometry(1.05, 0.11, 0.48) : shipId === 'swift' ? new THREE.ConeGeometry(0.34, 1.15, 4) : new THREE.BoxGeometry(0.72, 0.03, 0.36), blue);
    panel.position.set(-0.02, shipId === 'atlas' ? 0.08 : 0, side * (shipId === 'atlas' ? 0.74 : 0.68));
    if (shipId === 'swift') panel.rotation.x = Math.PI / 2;
    ship.add(panel);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), gold);
    strut.rotation.x = Math.PI / 2;
    strut.position.set(-0.02, 0, side * 0.36);
    ship.add(strut);
  }
  // Compact instrument detail keeps the navigation model legible at low zoom.
  const instrument = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20), gold);
  instrument.rotation.y = Math.PI / 2;
  instrument.position.x = 0.37;
  ship.add(instrument);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x7de8ff }));
  beacon.position.set(-0.38, 0.16, 0);
  ship.add(beacon);
  return ship;
}

export default function SolarSystemScene({ mission, onSelect, shipId, language }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [liveSession, setLiveSession] = useState(getLiveSnapshot);
  useEffect(() => subscribeLiveSnapshot(() => {
    const next = getLiveSnapshot();
    setLiveSession((current) => current.connected === next.connected && current.error === next.error && current.players.length === next.players.length && current.players.every((player, index) => player.userId === next.players[index]?.userId && player.displayName === next.players[index]?.displayName && player.role === next.players[index]?.role && player.isHost === next.players[index]?.isHost) ? current : next);
  }), []);
  const selectRef = useRef(onSelect);
  const selectedRef = useRef(mission.id);
  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { selectedRef.current = mission.id; }, [mission.id]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050a12');
    scene.fog = new THREE.FogExp2('#050a12', 0.0045);
    const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 160);
    camera.position.set(37, 38, 58);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    host.appendChild(renderer.domElement);
    const detachQuality = attachRenderQuality(renderer, host);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.minDistance = 9;
    controls.maxDistance = 110;
    controls.target.set(0, 0, 0);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    controls.autoRotate = !reducedMotion.matches;
    controls.autoRotateSpeed = 0.19;

    scene.add(new THREE.AmbientLight(0x9fb7db, 0.7));
    const sunLight = new THREE.PointLight(0xffd49a, 260, 100, 1.25);
    scene.add(sunLight);
    const fill = new THREE.DirectionalLight(0x82b9ff, 1.15);
    fill.position.set(-12, 10, -8);
    scene.add(fill);

    const starCount = 2200;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const palette = [new THREE.Color('#c7e6ff'), new THREE.Color('#ffffff'), new THREE.Color('#7ca9ff')];
    for (let i = 0; i < starCount; i += 1) {
      const radius = 35 + Math.random() * 75;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.cos(phi);
      starPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const color = palette[Math.floor(Math.random() * palette.length)];
      starColors[i * 3] = color.r;
      starColors[i * 3 + 1] = color.g;
      starColors[i * 3 + 2] = color.b;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: 0.13, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
    scene.add(stars);

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(1.48, 48, 36),
      new THREE.MeshBasicMaterial({ color: '#ffc86b' }),
    );
    sun.userData.missionId = 'sun';
    scene.add(sun);
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 32, 24),
      new THREE.MeshBasicMaterial({ color: '#ff9d45', transparent: true, opacity: 0.12, side: THREE.BackSide }),
    );
    scene.add(sunHalo);

    const bodies: Body[] = [];
    for (const spec of celestialBodies) {
      const orbitRadius = spec.parentOrbit ?? Math.hypot(spec.position[0], spec.position[2]);
      const phase = spec.orbitalParent ? 0.8 + bodies.length * 0.17 : Math.atan2(spec.position[2], spec.position[0]);
      const orbit = makeOrbit(orbitRadius, spec.id === 'earth' ? 0x62bce9 : 0x6883a3, spec.id === 'earth' ? 0.3 : 0.16);
      orbit.rotation.x = Math.PI / 2;
      const parent = spec.orbitalParent ? bodies.find((body) => body.id === spec.orbitalParent) : undefined;
      (parent?.group ?? scene).add(orbit);
      const group = new THREE.Group();
      const texture = loadPlanetTexture(spec.id) ?? createPlanetTexture(spec.color, spec.accent, spec.id);
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius, 36, 28),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, metalness: 0.02 }),
      );
      planet.userData.missionId = spec.id;
      planet.userData.radius = spec.radius;
      group.add(planet);
      if (spec.id === 'earth') {
        const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(spec.radius * 1.075, 32, 24), new THREE.MeshBasicMaterial({ color: '#48b8ff', transparent: true, opacity: 0.12, side: THREE.BackSide }));
        group.add(atmosphere);
      }
      if (spec.id === 'saturn') {
        const rings = new THREE.Mesh(new THREE.RingGeometry(spec.radius * 1.3, spec.radius * 1.9, 64), new THREE.MeshStandardMaterial({ color: '#d8c49d', side: THREE.DoubleSide, transparent: true, opacity: 0.72, roughness: 0.9 }));
        rings.rotation.x = Math.PI / 2.35; group.add(rings);
      }
      if (spec.id === 'jupiter') {
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(spec.radius * 0.8, 0.075, 6, 48), new THREE.MeshBasicMaterial({ color: '#a85640', transparent: true, opacity: 0.75 }));
        stripe.position.set(0.35, -0.22, spec.radius * 0.72);
        group.add(stripe);
      }
      (parent?.group ?? scene).add(group);
      // Tiempo orbital comprimido para que también se perciba el movimiento exterior.
      bodies.push({ id: spec.id, orbit: orbitRadius, phase, group, speed: 0.42 / Math.max(orbitRadius, 1) ** 1.1, parent: spec.orbitalParent });
    }

    // La franja del cinturón es una nube de pequeños cuerpos, no un anillo sólido.
    const rockCount = 650;
    const rockPositions = new Float32Array(rockCount * 3);
    for (let i = 0; i < rockCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 23.2 + Math.random() * 2.2;
      rockPositions[i * 3] = Math.cos(angle) * radius;
      rockPositions[i * 3 + 1] = (Math.random() - 0.5) * 0.42;
      rockPositions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const rockGeometry = new THREE.BufferGeometry();
    rockGeometry.setAttribute('position', new THREE.BufferAttribute(rockPositions, 3));
    scene.add(new THREE.Points(rockGeometry, new THREE.PointsMaterial({ color: '#b59a72', size: 0.075, transparent: true, opacity: 0.74 })));

    const ship = makeShip(shipId);
    ship.scale.setScalar(0.73);
    scene.add(ship);
    const shipOrbit = makeOrbit(1.12, 0x61d9ff, 0.62);
    shipOrbit.rotation.x = Math.PI / 2;
    bodies.find((body) => body.id === 'earth')?.group.add(shipOrbit);

    const earthBody = bodies.find((body) => body.id === 'earth');
    const teamDock = new THREE.Group();
    teamDock.position.set(0, 1.05, 0);
    earthBody?.group.add(teamDock);
    const dock = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x143349, metalness: 0.6, roughness: 0.42, transparent: true, opacity: 0.82 }));
    dock.position.y = -0.03; teamDock.add(dock);
    const dockRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.035, 8, 64), new THREE.MeshBasicMaterial({ color: 0x6adbf0 }));
    dockRing.rotation.x = Math.PI / 2; teamDock.add(dockRing);
    const playerAvatars = new Map<string, { rig: AvatarRig; role: string; displayName: string; activity: LiveActivity }>();
    let livePlayers: LivePlayer[] = [];
    let selfId: string | null = null;
    let localPose: LivePose = { x: 0, y: 0, z: 0, yaw: 0, activity: 'idle', mode: 'system' };
    let interactionUntil = 0;
    let aboard = false;
    const pressed = new Set<string>();
    const ignoreTyping = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    const onLiveKeyDown = (event: KeyboardEvent) => {
      if (!getLiveSnapshot().connected || ignoreTyping(event.target)) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) { pressed.add(key); event.preventDefault(); }
      if (key === 'e' && !event.repeat) { aboard = !aboard; void submitLiveAction('interact', { id: aboard ? 'boarding-ramp' : 'ship-interior' }); event.preventDefault(); }
      if (key === 'f' && !event.repeat) { interactionUntil = performance.now() + 900; void submitLiveAction('interact', { id: 'universe-interaction' }); event.preventDefault(); }
    };
    const onLiveKeyUp = (event: KeyboardEvent) => { pressed.delete(event.key.toLowerCase()); };
    const onLiveBlur = () => pressed.clear();
    const refreshLivePlayers = () => {
      const live = getLiveSnapshot();
      livePlayers = live.players.filter((player) => player.connected); selfId = live.selfId;
      teamDock.visible = live.connected;
      for (const player of livePlayers) {
        if (player.userId === selfId) localPose = { ...player.pose };
        let entry = playerAvatars.get(player.userId);
        if (!entry || entry.role !== player.role || entry.displayName !== player.displayName) {
          if (entry) { teamDock.remove(entry.rig.root); disposeAvatar(entry.rig); }
          const rig = createPlayerAvatar(player); entry = { rig, role: player.role, displayName: player.displayName, activity: player.pose.activity };
          playerAvatars.set(player.userId, entry); teamDock.add(rig.root);
        }
        entry.activity = player.pose.activity;
      }
      const connectedIds = new Set(livePlayers.map((player) => player.userId));
      for (const [id, entry] of playerAvatars) if (!connectedIds.has(id)) { teamDock.remove(entry.rig.root); disposeAvatar(entry.rig); playerAvatars.delete(id); }
    };
    const unsubscribeLive = subscribeLiveSnapshot(refreshLivePlayers);
    refreshLivePlayers();
    window.addEventListener('keydown', onLiveKeyDown);
    window.addEventListener('keyup', onLiveKeyUp);
    window.addEventListener('blur', onLiveBlur);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickTargets: THREE.Object3D[] = [];
    clickTargets.push(sun);
    bodies.forEach((body) => { const planet = body.group.children[0]; if (planet) clickTargets.push(planet); });
    let pointerStart = { x: 0, y: 0 };
    const rememberPointer = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const onPointerDown = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickTargets, false)[0];
      const id = hit?.object.userData.missionId as string | undefined;
      if (id) selectRef.current(id);
    };
    renderer.domElement.addEventListener('pointerdown', rememberPointer);
    renderer.domElement.addEventListener('pointerup', onPointerDown);

    let focused = false;
    let focusId = '';
    const targetPosition = new THREE.Vector3();
    const desiredPosition = new THREE.Vector3();
    const focusTarget = (event: Event) => { focusId = (event as CustomEvent<string>).detail; focused = true; };
    const resetView = () => { focused = false; controls.minDistance = 9; camera.position.set(37, 38, 58); controls.target.set(0, 0, 0); };
    window.addEventListener('orbital-focus-body', focusTarget);
    window.addEventListener('orbital-overview', resetView);
    controls.addEventListener('start', () => { focused = false; });
    let animationId = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      animationId = window.requestAnimationFrame(animate);
      if (document.hidden) { clock.getDelta(); return; }
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      sun.rotation.y = elapsed * 0.045;
      for (const body of bodies) {
        const angle = body.phase + elapsed * body.speed * 0.08;
        body.group.position.set(Math.cos(angle) * body.orbit, 0, Math.sin(angle) * body.orbit);
        body.group.rotation.y = elapsed * 0.13;
      }
      const earth = bodies.find((body) => body.id === 'earth');
      const shipAngle = elapsed * 0.18;
      ship.position.set((earth?.group.position.x ?? 0) + Math.cos(shipAngle) * 1.12, 0.24 * Math.sin(elapsed * 0.7), (earth?.group.position.z ?? 0) + Math.sin(shipAngle) * 1.12);
      ship.rotation.y = -shipAngle + Math.PI / 2;
      if (selfId && getLiveSnapshot().connected) {
        const forward = Number(pressed.has('w') || pressed.has('arrowup')) - Number(pressed.has('s') || pressed.has('arrowdown'));
        const turn = Number(pressed.has('a') || pressed.has('arrowleft')) - Number(pressed.has('d') || pressed.has('arrowright'));
        const moving = forward !== 0;
        const speed = pressed.has('shift') ? 4.1 : 2.1;
        localPose.yaw += turn * delta * 2.25;
        if (!aboard && moving) {
          localPose.x = THREE.MathUtils.clamp(localPose.x + Math.sin(localPose.yaw) * forward * speed * delta, -2.2, 2.2);
          localPose.z = THREE.MathUtils.clamp(localPose.z - Math.cos(localPose.yaw) * forward * speed * delta, -2.2, 2.2);
        }
        localPose.y = aboard ? 0.32 : 0;
        localPose.activity = performance.now() < interactionUntil ? 'interact' : aboard ? 'aboard' : moving ? pressed.has('shift') ? 'run' : 'walk' : 'idle';
        localPose.mode = 'system';
        setLivePose(localPose);
      }
      for (const player of livePlayers) {
        const entry = playerAvatars.get(player.userId); if (!entry) continue;
        const target = player.userId === selfId ? localPose : player.pose;
        entry.rig.root.position.lerp(new THREE.Vector3(target.x, target.y, target.z), 1 - Math.exp(-delta * 10));
        entry.rig.root.rotation.y = target.yaw;
        const gait = target.activity === 'walk' ? 0.75 : target.activity === 'run' ? 1.6 : target.activity === 'interact' ? 0.25 : 0;
        for (let i = 0; i < entry.rig.arms.length; i += 1) {
          entry.rig.arms[i].rotation.z = gait ? Math.sin(elapsed * 8 * gait + i * Math.PI) * (target.activity === 'interact' ? 0.42 : 0.48) : 0;
          entry.rig.legs[i].rotation.x = gait && target.activity !== 'interact' ? Math.sin(elapsed * 8 * gait + i * Math.PI) * 0.48 : 0;
        }
        entry.rig.root.scale.setScalar(target.activity === 'aboard' ? 0.52 : 0.76);
      }
      sunHalo.scale.setScalar(1 + Math.sin(elapsed * 0.7) * 0.018);
      stars.rotation.y = elapsed * 0.0015;
      if (focused) {
        const body = bodies.find((item) => item.id === focusId);
        const object = focusId === 'sun' ? sun : body?.group;
        if (object) {
          object.getWorldPosition(targetPosition);
          const radius = celestialBodies.find((item) => item.id === focusId)?.radius ?? 1.48;
          controls.minDistance = radius * 2.1;
          desiredPosition.copy(targetPosition).add(new THREE.Vector3(0, radius * 2.5, radius * 5.5));
          camera.position.lerp(desiredPosition, reducedMotion.matches ? 1 : 0.07);
          controls.target.lerp(targetPosition, reducedMotion.matches ? 1 : 0.07);
        }
      }
      controls.autoRotate = !reducedMotion.matches && !focused;
      controls.update();
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
      unsubscribeLive();
      window.removeEventListener('keydown', onLiveKeyDown);
      window.removeEventListener('keyup', onLiveKeyUp);
      window.removeEventListener('blur', onLiveBlur);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', rememberPointer);
      renderer.domElement.removeEventListener('pointerup', onPointerDown);
      window.removeEventListener('orbital-focus-body', focusTarget);
      window.removeEventListener('orbital-overview', resetView);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          const disposeMaterial = (item: THREE.Material) => {
            if ('map' in item && item.map instanceof THREE.Texture) item.map.dispose();
            item.dispose();
          };
          if (Array.isArray(material)) material.forEach(disposeMaterial);
          else disposeMaterial(material);
        }
      });
      detachQuality(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [shipId]);

  const displayDestination = localiseMission(mission, language).destination;
  const t = (es: string, en: string) => language === 'es' ? es : en;
  return (
    <div className="space-scene" data-visualization="solar" ref={hostRef} aria-label={`${t('Vista 3D del sistema solar; destino seleccionado', '3D solar system view; selected destination')}: ${displayDestination}`}>
      <FullscreenControl language={language} label={language === "en" ? "solar system" : "sistema solar"} /><div className="scene-topline"><span><i className="live-dot" /> {t("VISUALIZACIÓN EN VIVO", "LIVE VISUALISATION")}</span><span>SECTOR SOL · 01</span></div>
      <div className="observatory-controls"><button onClick={() => window.dispatchEvent(new CustomEvent('orbital-focus-body', { detail: mission.targetBodyId }))}>{t("Observar", "Observe")} {displayDestination}</button><button onClick={() => window.dispatchEvent(new Event('orbital-overview'))}>{t("Sistema completo", "Full system")}</button></div>
      <div className="scene-controls-hint"><span>DRAG <b>{t("ROTAR", "ROTATE")}</b></span><span>SCROLL <b>ZOOM</b></span><span>CLICK <b>{t("SELECCIONAR", "SELECT")}</b></span></div>
      {liveSession.connected && <div className="cooperative-scene-hud" aria-live="polite"><strong>COOPERATIVE MULTIPLAYER · {liveSession.players.length}/4</strong><small>{t('WASD MOVER · MAYÚS CORRER · E ABORDAR · F INTERACTUAR','WASD MOVE · SHIFT RUN · E BOARD · F INTERACT')}</small><div>{liveSession.players.map((player)=><span key={player.userId}><i style={{background:`#${(roleColors[player.role]??0x78d8ec).toString(16).padStart(6,'0')}`}}/>{player.displayName} · {player.role}</span>)}</div></div>}
      <div className="scene-scale"><span>{t("ÓRBITAS Y TAMAÑOS DIFERENCIADOS", "DISTINCT ORBITS AND SIZES")}</span><div><i /></div><small>{t("DISTANCIA COMPRIMIDA · TAMAÑO EXAGERADO", "DISTANCE COMPRESSED · SIZE EXAGGERATED")}</small></div>
    </div>
  );
}
