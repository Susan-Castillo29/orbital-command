import FullscreenControl from './FullscreenControl';
import { attachRenderQuality } from '../systems/renderQuality';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Mission } from '../data/missions';
import { celestialBodies } from '../data/celestialBodies';
import type { ShipId } from '../data/ships';
import { loadPlanetTexture } from '../systems/planetTextures';

type Props = {
  mission: Mission;
  onSelect: (id: string) => void;
  shipId: ShipId;
};

type Body = { id: string; orbit: number; phase: number; group: THREE.Group; speed: number; parent?: string };

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
  return ship;
}

export default function SolarSystemScene({ mission, onSelect, shipId }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
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
      const elapsed = clock.getElapsedTime();
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

  return (
    <div className="space-scene" data-visualization="solar" ref={hostRef} aria-label={`Vista 3D del sistema solar; destino seleccionado: ${mission.destination}`}>
      <FullscreenControl label="sistema solar" /><div className="scene-topline"><span><i className="live-dot" /> VISUALIZACIÓN EN VIVO</span><span>SECTOR SOL · 01</span></div>
      <div className="observatory-controls"><button onClick={() => window.dispatchEvent(new CustomEvent('orbital-focus-body', { detail: mission.targetBodyId }))}>Observar {mission.destination}</button><button onClick={() => window.dispatchEvent(new Event('orbital-overview'))}>Sistema completo</button></div>
      <div className="scene-controls-hint"><span>DRAG <b>ROTAR</b></span><span>SCROLL <b>ZOOM</b></span><span>CLICK <b>SELECCIONAR</b></span></div>
      <div className="scene-scale"><span>ÓRBITAS Y TAMAÑOS DIFERENCIADOS</span><div><i /></div><small>DISTANCIA COMPRIMIDA · TAMAÑO EXAGERADO</small></div>
    </div>
  );
}
