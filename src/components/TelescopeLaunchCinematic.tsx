import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { TelescopeDesign } from '../systems/telescopeDesign';
import { playRadioCue, playSound } from '../systems/audio';
import './telescope-cinematic.css';

type Props = { design: TelescopeDesign; language: 'es' | 'en'; active: boolean; onStart: () => void; onComplete: () => void; onStageChange: (stage: number) => void };
const duration = 20;
const stageAt = (time: number) => time < 4 ? 0 : time < 8 ? 1 : time < 13 ? 2 : time < 17 ? 3 : time < 18.4 ? 4 : 5;
type Soundscape = { context: AudioContext; nodes: AudioNode[]; master: GainNode };

function material(color: number, roughness = 0.52, metalness = 0.35) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
function box(size: [number, number, number], mat: THREE.Material) { return new THREE.Mesh(new THREE.BoxGeometry(...size), mat); }

export default function TelescopeLaunchCinematic({ design, language, active, onStart, onComplete, onStageChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sound, setSound] = useState(true);
  const startRef = useRef(0);
  const activeRef = useRef(active);
  const callbacksRef = useRef({ onComplete, onStageChange });
  const soundscapeRef = useRef<Soundscape | null>(null);
  activeRef.current = active;
  callbacksRef.current = { onComplete, onStageChange };
  const doneRef = useRef(false);
  const t = (es: string, en: string) => language === 'es' ? es : en;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.setSize(canvas.clientWidth || 960, canvas.clientHeight || 540, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030812);
    const camera = new THREE.PerspectiveCamera(38, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.1, 600);
    camera.position.set(7.6, 4.3, 13.5);
    const ambient = new THREE.HemisphereLight(0xb7d9ef, 0x15202a, 1.15); scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffedca, 3.5); sun.position.set(-7, 10, 8); scene.add(sun);
    const rim = new THREE.PointLight(0x4bb9ff, 36, 55); rim.position.set(6, 3, -7); scene.add(rim);

    // A continuous procedural set: integration bay, launch vehicle, Earth and deep-space star field.
    const starsGeometry = new THREE.BufferGeometry();
    const starPoints = new Float32Array(4200 * 3);
    for (let i = 0; i < starPoints.length; i += 3) { const radius = 80 + Math.random() * 100; const theta = Math.random() * Math.PI * 2; const phi = Math.acos(2 * Math.random() - 1); starPoints[i] = radius * Math.sin(phi) * Math.cos(theta); starPoints[i + 1] = radius * Math.cos(phi); starPoints[i + 2] = radius * Math.sin(phi) * Math.sin(theta); }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPoints, 3));
    const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xc7def8, size: 0.18, sizeAttenuation: true, transparent: true, opacity: 0.88 })); scene.add(stars);
    const bay = new THREE.Group(); scene.add(bay);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(54, 42), material(0x182431, 0.76, 0.42)); floor.rotation.x = -Math.PI / 2; floor.position.y = -3.1; bay.add(floor);
    const grid = new THREE.GridHelper(54, 36, 0x5b8391, 0x334957); grid.position.y = -3.05; bay.add(grid);
    const wallMat = material(0x172633, 0.72, 0.52);
    for (let i = -4; i <= 4; i += 1) { const column = box([0.28, 12, 0.34], wallMat); column.position.set(i * 4.8, 2.3, -8.5); bay.add(column); const lamp = new THREE.PointLight(0x8ddcff, 5, 12); lamp.position.set(i * 4.8, 6.5, -7.7); bay.add(lamp); }
    const gantry = box([48, 0.38, 1], material(0x465661, 0.62, 0.68)); gantry.position.set(0, 7.5, -7.8); bay.add(gantry);

    // Telescopes retain the player's optical, power, thermal and instrument choices.
    const telescope = new THREE.Group(); scene.add(telescope);
    const bus = new THREE.Group(); telescope.add(bus);
    const structure = material(0x9aaab0, 0.34, 0.8); const dark = material(0x26343d, 0.45, 0.72); const gold = material(0xb79658, 0.3, 0.78); const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xdce8eb, metalness: 0.95, roughness: 0.12 });
    const central = box([1.15, 1.05, 1.12], structure); central.position.y = 0.3; bus.add(central);
    const instrumentDeck = box([1.42, 0.5, 1.36], dark); instrumentDeck.position.y = -0.48; bus.add(instrumentDeck);
    const aperture = Number(design.apertureId) || 0.8;
    const reflectiveDesign = design.bands.some((band) => ['visible', 'ultraviolet', 'infrared'].includes(band));
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.49 + aperture * 0.045, 0.62 + aperture * 0.04, 1.7, 32, 1, true), material(0x34424a, 0.42, 0.72)); barrel.position.y = 1.25; bus.add(barrel);
    if (reflectiveDesign) {
      const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.53 + aperture * 0.045, 48), mirrorMat); mirror.rotation.x = -Math.PI / 2; mirror.position.y = 2.13; bus.add(mirror);
      const mirrorRim = new THREE.Mesh(new THREE.TorusGeometry(0.57 + aperture * 0.045, 0.055, 10, 48), gold); mirrorRim.rotation.x = Math.PI / 2; mirrorRim.position.y = 2.12; bus.add(mirrorRim);
      const secondary = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), material(0xe5e7dc, 0.18, 0.9)); secondary.position.set(design.secondaryId === 'off-axis' ? 0.3 : 0, 2.04, 0.23); bus.add(secondary);
      for (let i = 0; i < 4; i += 1) { const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 6), structure); strut.position.set(Math.cos(i * Math.PI / 2) * 0.28, 1.76, Math.sin(i * Math.PI / 2) * 0.28); strut.rotation.x = 0.25; bus.add(strut); }
    } else if (design.bands.includes('xray')) {
      for (let i = 0; i < design.xrayPairs; i += 1) { const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.56 - i * 0.07, 0.64 - i * 0.07, 1.45, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xc6a965, metalness: 0.88, roughness: 0.2, side: THREE.DoubleSide })); shell.position.y = 1.4; bus.add(shell); }
    } else {
      const collimator = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 1.1, 12, 1, true), gold); collimator.position.y = 1.55; bus.add(collimator);
    }
    const antenna = new THREE.Group(); antenna.position.set(0.75, -0.03, 0.35); bus.add(antenna);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.43, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), material(0xc3ccd0, 0.28, 0.84)); dish.rotation.x = Math.PI; antenna.add(dish);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.35, 8), gold); feed.position.y = -0.27; antenna.add(feed);
    const thermal = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xc6a95f, side: THREE.DoubleSide, metalness: 0.42, roughness: 0.34, transparent: true, opacity: 0.75 })); thermal.position.y = 0.1; thermal.rotation.y = Math.PI / 4; bus.add(thermal);
    if (design.thermal === 'cryogenic') { const cooler = box([0.52, 0.42, 0.56], material(0x697d83, 0.35, 0.8)); cooler.position.set(0.65, -0.42, -0.52); bus.add(cooler); for (let i = 0; i < 3; i += 1) { const radiator = box([0.68, 0.04, 0.07], structure); radiator.position.set(0.66, -0.25 - i * 0.13, -0.53); bus.add(radiator); } }
    design.instrumentIds.forEach((id, index) => {
      const instrument = new THREE.Group(); instrument.position.set(-0.5 + index * 0.34, -0.86, 0.12); bus.add(instrument);
      const detector = id === 'spectrograph' ? new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.42, 12), gold) : id === 'photometer' ? new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 16), material(0x87989d, 0.25, 0.72)) : id === 'xrayDetector' ? new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 20), material(0x7b858b, 0.22, 0.88)) : id === 'gammaDetector' ? box([0.32, 0.29, 0.34], material(0xaaa887, 0.36, 0.48)) : id === 'infraredDetector' ? box([0.31, 0.3, 0.34], material(0x4c6570, 0.28, 0.75)) : id === 'uvDetector' ? box([0.3, 0.28, 0.3], material(0x667b95, 0.28, 0.72)) : box([0.3, 0.28, 0.32], dark);
      detector.rotation.x = id === 'spectrograph' || id === 'photometer' || id === 'xrayDetector' ? Math.PI / 2 : 0; instrument.add(detector);
      if (id === 'imager' || id === 'photometer') { const window = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), mirrorMat); window.position.y = -0.15; instrument.add(window); }
      if (id === 'gammaDetector') { for (let bar = 0; bar < 3; bar += 1) { const track = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.025), gold); track.position.y = -0.1 + bar * 0.08; instrument.add(track); } }
      const status = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x72e7ff })); status.position.set(0, -0.2, 0.15); instrument.add(status);
    });
    const panelGroups: THREE.Group[] = [];
    if (design.power === 'solar') {
      for (const side of [-1, 1]) {
        const hinge = new THREE.Group(); hinge.position.set(side * 0.66, 0.28, 0); bus.add(hinge); panelGroups.push(hinge);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.09), structure); arm.position.x = side * 0.42; hinge.add(arm);
        for (let row = 0; row < 2; row += 1) { const panel = box([1.25, 0.065, 0.82], material(0x0b3154, 0.28, 0.72)); panel.position.set(side * 1.38, row === 0 ? -0.12 : 0.72, 0); hinge.add(panel); for (let c = 0; c < 5; c += 1) { const cell = box([0.018, 0.074, 0.78], material(0x73a9c2, 0.26, 0.64)); cell.position.set(side * 1.38 - 0.6 + c * 0.3, row === 0 ? -0.12 : 0.72, 0); hinge.add(cell); } }
      }
    } else {
      const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.8, 16), material(0x797267, 0.35, 0.66)); rtg.rotation.z = Math.PI / 2; rtg.position.set(0.92, -0.12, -0.3); bus.add(rtg);
      for (let i = 0; i < 4; i += 1) { const fin = box([0.46, 0.035, 0.19], structure); fin.position.set(1.18, -0.4 + i * 0.18, -0.3); bus.add(fin); }
    }
    telescope.scale.setScalar(0.76); telescope.position.set(0, -0.12, 0.2);
    const rocket = new THREE.Group(); scene.add(rocket);
    const rocketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.77, 8.5, 28), material(0xd9dddc, 0.34, 0.58)); rocket.add(rocketBody);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.66, 1.9, 28), material(0xc5d0d2, 0.28, 0.48)); nose.position.y = 5.15; rocket.add(nose);
    const fairing = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.65, 2.8, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x8c9ba0, metalness: 0.64, roughness: 0.3, side: THREE.DoubleSide })); fairing.position.y = 3.55; rocket.add(fairing);
    const darkStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.775, 0.78, 0.48, 28), dark); darkStripe.position.y = -1.4; rocket.add(darkStripe);
    const interstage = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.79, 1.25, 28), material(0x4a5660, 0.48, 0.74)); interstage.position.y = -4.7; rocket.add(interstage);
    const boosters: THREE.Group[] = [];
    for (const side of [-1, 1]) { const booster = new THREE.Group(); booster.position.set(side * 0.9, -1.5, 0); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.29, 5.4, 18), material(0xc3ccca, 0.36, 0.6)); booster.add(body); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 18), structure); tip.position.y = 3.08; booster.add(tip); rocket.add(booster); boosters.push(booster); }
    for (let i = 0; i < 4; i += 1) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 0.9), material(0x64737a, 0.45, 0.7)); fin.position.set(Math.cos(i * Math.PI / 2) * 0.72, -3.7, Math.sin(i * Math.PI / 2) * 0.72); rocket.add(fin); }
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 5.6, 24), new THREE.MeshBasicMaterial({ color: 0xff9e4d, transparent: true, opacity: 0.8 })); flame.rotation.x = Math.PI; flame.position.y = -7.1; rocket.add(flame);
    const plumeCore = new THREE.Mesh(new THREE.ConeGeometry(0.36, 4.6, 16), new THREE.MeshBasicMaterial({ color: 0xfff1c3, transparent: true, opacity: 0.88 })); plumeCore.rotation.x = Math.PI; plumeCore.position.y = -6.6; rocket.add(plumeCore);
    const exhaustLight = new THREE.PointLight(0xff963c, 0, 24); exhaustLight.position.y = -5; rocket.add(exhaustLight);
    rocket.position.set(0, -0.15, -1.5); rocket.visible = false;
    const boosterFlames = boosters.map((booster) => { const f = new THREE.Mesh(new THREE.ConeGeometry(0.29, 3.4, 16), new THREE.MeshBasicMaterial({ color: 0xffad56, transparent: true, opacity: 0.78 })); f.rotation.x = Math.PI; f.position.y = -4.25; booster.add(f); return f; });
    const fairingShells = [-1, 1].map((side) => { const shell = new THREE.Mesh(new THREE.SphereGeometry(0.66, 18, 10, 0, Math.PI, 0, Math.PI), material(0xa4afb2, 0.32, 0.6)); shell.position.set(side * 0.27, 5.05, 0); shell.scale.set(0.6, 2.3, 1); rocket.add(shell); return shell; });
    const earthCanvas = document.createElement('canvas'); earthCanvas.width = 1536; earthCanvas.height = 768;
    const earthContext = earthCanvas.getContext('2d');
    if (earthContext) {
      const sea = earthContext.createLinearGradient(0, 0, 0, earthCanvas.height); sea.addColorStop(0, '#143a5b'); sea.addColorStop(0.5, '#1f5f8b'); sea.addColorStop(1, '#0d2b48'); earthContext.fillStyle = sea; earthContext.fillRect(0, 0, earthCanvas.width, earthCanvas.height);
      earthContext.fillStyle = '#667b60'; earthContext.strokeStyle = '#9caa82'; earthContext.lineWidth = 5;
      const land = (coords: number[][]) => { earthContext.beginPath(); coords.forEach(([x, y], i) => { const px = x * earthCanvas.width; const py = y * earthCanvas.height; if (!i) earthContext.moveTo(px, py); else earthContext.lineTo(px, py); }); earthContext.closePath(); earthContext.fill(); earthContext.stroke(); };
      land([[.04,.2],[.09,.13],[.16,.12],[.2,.17],[.19,.23],[.15,.25],[.13,.32],[.1,.31],[.08,.27]]);
      land([[.2,.32],[.24,.34],[.26,.43],[.25,.52],[.23,.6],[.22,.68],[.2,.72],[.18,.65],[.18,.54],[.16,.46],[.17,.38]]);
      land([[.43,.26],[.47,.22],[.5,.25],[.52,.34],[.5,.44],[.47,.48],[.46,.58],[.43,.53],[.42,.42],[.4,.34]]);
      land([[.48,.22],[.53,.17],[.6,.16],[.66,.2],[.72,.19],[.78,.24],[.79,.3],[.73,.34],[.7,.4],[.64,.37],[.6,.43],[.55,.4],[.52,.33]]);
      land([[.72,.47],[.77,.48],[.8,.54],[.79,.62],[.75,.67],[.72,.62],[.7,.55]]);
      land([[.84,.62],[.89,.59],[.93,.65],[.91,.71],[.86,.72],[.83,.68]]);
      earthContext.globalAlpha = 0.22; earthContext.strokeStyle = '#b8d3df'; earthContext.lineWidth = 2;
      for (let i = 0; i < 42; i += 1) { const x = Math.random() * earthCanvas.width; const y = 90 + Math.random() * 590; earthContext.beginPath(); earthContext.ellipse(x, y, 12 + Math.random() * 36, 2 + Math.random() * 7, Math.random(), 0, Math.PI * 2); earthContext.stroke(); } earthContext.globalAlpha = 1;
    }
    const earthTexture = new THREE.CanvasTexture(earthCanvas); earthTexture.colorSpace = THREE.SRGBColorSpace;
    const earthMat = new THREE.MeshStandardMaterial({ map: earthTexture, roughness: 0.88, metalness: 0.02, emissive: 0x06213c, emissiveIntensity: 0.28 });
    const earth = new THREE.Mesh(new THREE.SphereGeometry(39, 48, 36), earthMat); earth.position.set(0, -48, -38); scene.add(earth);
    const cloudCanvas = document.createElement('canvas'); cloudCanvas.width = 1024; cloudCanvas.height = 512; const cloudContext = cloudCanvas.getContext('2d');
    if (cloudContext) { cloudContext.clearRect(0, 0, 1024, 512); cloudContext.fillStyle = '#ffffff'; for (let i = 0; i < 700; i += 1) { cloudContext.globalAlpha = 0.08 + Math.random() * 0.22; cloudContext.beginPath(); cloudContext.ellipse(Math.random() * 1024, 32 + Math.random() * 448, 3 + Math.random() * 19, 1 + Math.random() * 6, Math.random() * 0.7, 0, Math.PI * 2); cloudContext.fill(); } cloudContext.globalAlpha = 1; }
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(39.32, 48, 36), new THREE.MeshStandardMaterial({ map: cloudTexture, transparent: true, opacity: 0.54, roughness: 1, depthWrite: false })); clouds.position.copy(earth.position); scene.add(clouds);
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(40.2, 48, 36), new THREE.MeshBasicMaterial({ color: 0x4dbbff, transparent: true, opacity: 0.12, side: THREE.BackSide })); atmosphere.position.copy(earth.position); scene.add(atmosphere);
    const galaxyGeometry = new THREE.BufferGeometry(); const galaxyPositions: number[] = [];
    for (let arm = 0; arm < 4; arm += 1) for (let i = 0; i < 260; i += 1) { const radius = 0.08 + Math.random() * 2.2; const angle = arm * Math.PI / 2 + radius * 1.5 + (Math.random() - 0.5) * 0.35; galaxyPositions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.48, (Math.random() - 0.5) * 0.16); }
    galaxyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(galaxyPositions, 3));
    const galaxy = new THREE.Points(galaxyGeometry, new THREE.PointsMaterial({ color: 0xc2d7ff, size: 0.045, transparent: true, opacity: 0.9, sizeAttenuation: true })); galaxy.position.set(7, 3.3, -13); galaxy.visible = false; scene.add(galaxy);
    const target = new THREE.Vector3(0, 0, 0);
    const resize = () => { const width = Math.max(1, canvas.clientWidth); const height = Math.max(1, canvas.clientHeight); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(canvas);
    const clock = new THREE.Clock(); let raf = 0; let elapsed = 0; let lastStage = -1;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (activeRef.current && !document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) elapsed = Math.min(duration, (performance.now() - startRef.current) / 1000);
      else if (activeRef.current && !document.hidden) elapsed = Math.min(duration, elapsed + Math.min(clock.getDelta(), 0.05));
      const s = activeRef.current ? elapsed : 0;
      const stage = stageAt(s); if (stage !== lastStage) { lastStage = stage; callbacksRef.current.onStageChange(stage); }
      const orbit = s < 4 ? 0 : s < 8 ? THREE.MathUtils.smoothstep(s, 4, 8) : 1;
      stars.visible = s >= 7.25;
      scene.background = scene.background instanceof THREE.Color ? scene.background.set(s < 7.7 ? 0x0c1a23 : 0x030812) : new THREE.Color(0x030812);
      bay.visible = s < 8.25;
      earth.visible = s >= 7.6;
      clouds.visible = earth.visible; atmosphere.visible = earth.visible;
      rocket.visible = s >= 4 && s < 14.1;
      telescope.visible = s < 8.2 || s >= 13.35;
      if (s < 8.2) {
        telescope.position.set(0.1 * Math.sin(s * 0.55), -0.2 + orbit * 4.25, 0.3);
        telescope.scale.setScalar(0.76 * (1 - orbit * 0.42));
        telescope.rotation.y = s * 0.16; telescope.rotation.x = 0.12 + Math.sin(s * 0.35) * 0.035;
        for (const panel of panelGroups) panel.rotation.z = THREE.MathUtils.lerp(0, Math.PI * 0.45, orbit);
      } else if (s >= 13.35) {
        const deploy = THREE.MathUtils.smoothstep(s, 14.7, 16.6);
        telescope.position.set(0.3 * Math.sin(s * 0.3), 0.65 + (s > 13.35 ? Math.min(0.75, (s - 13.35) * 0.46) : 0), -2.2);
        telescope.scale.setScalar(0.76);
        telescope.rotation.set(0.1 + deploy * 0.12, s > 17 ? (s - 17) * 0.22 : s * 0.035, 0.08);
        for (let i = 0; i < panelGroups.length; i += 1) panelGroups[i].rotation.z = (i === 0 ? -1 : 1) * THREE.MathUtils.lerp(Math.PI * 0.45, 0, deploy);
        if (s > 17) { sun.intensity = 3.5 + Math.sin(s * 5) * 0.25; }
      }
      if (rocket.visible) {
        const ascent = THREE.MathUtils.smoothstep(s, 8, 13.2);
        rocket.position.y = -0.15 + ascent * 25;
        rocket.rotation.z = Math.sin(s * 0.8) * 0.018;
        const ignition = THREE.MathUtils.smoothstep(s, 7.2, 8.25);
        flame.visible = s > 7.5; plumeCore.visible = flame.visible;
        flame.scale.setScalar(0.65 + 0.24 * Math.sin(s * 11)); flame.material.opacity = 0.55 + ignition * 0.32;
        plumeCore.scale.setScalar(0.8 + 0.22 * Math.sin(s * 13)); exhaustLight.intensity = ignition * 42;
        boosterFlames.forEach((f) => { f.visible = s > 8.05 && s < 12.15; f.scale.setScalar(0.8 + Math.sin(s * 10) * 0.18); });
        if (s > 12.15) boosters.forEach((b, i) => { b.position.x += (i ? 1 : -1) * 0.007; b.position.y -= 0.026; });
        if (s > 13.25) { fairingShells.forEach((shell, i) => { shell.position.x += (i ? 1 : -1) * 0.018; }); rocket.visible = s < 14.1; }
      }
      galaxy.visible = s >= 17;
      galaxy.rotation.z = s > 17 ? (s - 17) * 0.16 : 0;
      stars.rotation.y = s * 0.0012; clouds.rotation.y += 0.00008; earth.rotation.y += 0.000012;
      if (s < 4) { camera.position.set(7.7 * Math.cos(s * 0.17), 3.6 + Math.sin(s * 0.3) * 0.32, 13.2 * Math.sin(s * 0.17) + 1.5); target.set(0, 0.15, 0); }
      else if (s < 8) { camera.position.lerp(new THREE.Vector3(8.5, 4.9, 17), 0.025); target.set(0, 0.7, 0); }
      else if (s < 13.4) { camera.position.lerp(new THREE.Vector3(7.2, 3.6 + (s - 8) * 1.25, 20), 0.035); target.set(0, rocket.position.y + 1.2, -1.5); }
      else { camera.position.lerp(new THREE.Vector3(5.1, 3.1, 11.5), 0.026); target.set(0, 0.8, -2); }
      camera.lookAt(target);
      renderer.render(scene, camera);
      if (activeRef.current && elapsed >= duration && !doneRef.current) { doneRef.current = true; callbacksRef.current.onComplete(); }
      setElapsed((old) => Math.abs(old - s) > 0.08 ? s : old);
    };
    animate();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); scene.traverse((item) => { if (item instanceof THREE.Mesh || item instanceof THREE.Points) { item.geometry.dispose(); const mats = Array.isArray(item.material) ? item.material : [item.material]; mats.forEach((m) => { Object.values(m).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); }); m.dispose(); }); } }); renderer.dispose(); };
  }, [design]);

  useEffect(() => { if (active) { startRef.current = performance.now() - elapsed * 1000; doneRef.current = false; } }, [active]);
  useEffect(() => {
    if (!active || !sound) return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => playRadioCue(), 4000), window.setTimeout(() => playRadioCue(), 4800), window.setTimeout(() => playRadioCue(), 5600), window.setTimeout(() => playRadioCue(), 6400), window.setTimeout(() => playRadioCue(), 7200), window.setTimeout(() => playSound('scan'), 18400));
    return () => timers.forEach(window.clearTimeout);
  }, [active, sound]);
  useEffect(() => () => {
    const audio = soundscapeRef.current;
    if (!audio) return;
    audio.nodes.forEach((node) => { try { if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) node.stop(); } catch { /* Already stopped. */ } try { node.disconnect(); } catch { /* Context is already closed. */ } });
    void audio.context.close().catch(() => {}); soundscapeRef.current = null;
  }, []);
  const start = () => {
    if (sound) {
      playSound('launch'); playRadioCue();
      try {
        const context = new AudioContext(); const master = context.createGain(); master.gain.value = 0.19; master.connect(context.destination);
        const oscillator = context.createOscillator(); oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(42, context.currentTime); oscillator.frequency.linearRampToValueAtTime(68, context.currentTime + 8.2); oscillator.frequency.linearRampToValueAtTime(51, context.currentTime + 13.1);
        const lowPass = context.createBiquadFilter(); lowPass.type = 'lowpass'; lowPass.frequency.setValueAtTime(110, context.currentTime); lowPass.frequency.linearRampToValueAtTime(490, context.currentTime + 8); lowPass.frequency.linearRampToValueAtTime(130, context.currentTime + 13.2);
        const engine = context.createGain(); engine.gain.setValueAtTime(0.0001, context.currentTime); engine.gain.linearRampToValueAtTime(0.11, context.currentTime + 7.8); engine.gain.setValueAtTime(0.11, context.currentTime + 8.7); engine.gain.linearRampToValueAtTime(0.0001, context.currentTime + 13.4);
        oscillator.connect(lowPass).connect(engine).connect(master); oscillator.start();
        const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate); const channel = buffer.getChannelData(0); for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * 0.18;
        const noise = context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
        const noiseFilter = context.createBiquadFilter(); noiseFilter.type = 'lowpass'; noiseFilter.frequency.setValueAtTime(80, context.currentTime); noiseFilter.frequency.linearRampToValueAtTime(320, context.currentTime + 8);
        const noiseGain = context.createGain(); noiseGain.gain.setValueAtTime(0.0001, context.currentTime); noiseGain.gain.linearRampToValueAtTime(0.035, context.currentTime + 7.7); noiseGain.gain.linearRampToValueAtTime(0.0001, context.currentTime + 13.4);
        noise.connect(noiseFilter).connect(noiseGain).connect(master); noise.start();
        const pad = context.createOscillator(); pad.type = 'sine'; pad.frequency.value = 146.83; const padGain = context.createGain(); padGain.gain.setValueAtTime(0.0001, context.currentTime); padGain.gain.setTargetAtTime(0.016, context.currentTime + 16.7, 0.7); padGain.gain.setTargetAtTime(0.0001, context.currentTime + 19.7, 0.3); pad.connect(padGain).connect(master); pad.start(); pad.stop(context.currentTime + 21);
        soundscapeRef.current = { context, nodes: [oscillator, lowPass, engine, noise, noiseFilter, noiseGain, pad, padGain, master], master };
      } catch { /* Cinematic sound is optional and must not interrupt the mission. */ }
    }
    onStart();
  };
  const countdown = !active || elapsed < 4 || elapsed >= 8 ? null : Math.max(1, 5 - Math.floor((elapsed - 4) * 1.25));
  const heading = elapsed < 4 ? t('OBSERVATORIO EN ENSAMBLAJE', 'OBSERVATORY IN FINAL ASSEMBLY') : elapsed < 8 ? t('CENTRO DE LANZAMIENTO · CUENTA REGRESIVA', 'LAUNCH CONTROL · COUNTDOWN') : elapsed < 13 ? t('ASCENSO NOMINAL', 'NOMINAL ASCENT') : elapsed < 17 ? t('INSERCIÓN Y DESPLIEGUE ORBITAL', 'ORBITAL INSERTION AND DEPLOYMENT') : t('PRIMERA LUZ · MISIÓN DESPLEGADA', 'FIRST LIGHT · MISSION DEPLOYED');
  return <div className={`telescope-cinematic ${active ? 'is-running' : ''}`}>
    <canvas ref={canvasRef} aria-label={t('Animación 3D del telescopio diseñado en ensamblaje, lanzamiento y órbita.', '3D animation of the designed telescope through assembly, launch and orbit.')} />
    <div className="cinematic-vignette" aria-hidden="true" />
    <div className="cinematic-topline"><span>ORBITAL SCIENCE · {t('VUELO DE CALIFICACIÓN','QUALIFICATION FLIGHT')}</span><button type="button" aria-pressed={sound} onClick={() => { const next = !sound; setSound(next); const audio = soundscapeRef.current; if (audio) audio.master.gain.setTargetAtTime(next ? 0.19 : 0.0001, audio.context.currentTime, 0.06); }}>{sound ? '♪ AUDIO' : '♪ SILENCIO'}</button></div>
    <div className="cinematic-caption"><span>{heading}</span><small>{design.apertureId} m · {design.bands.map((band) => band.toUpperCase()).join(' / ')} · {design.instrumentIds.map((id) => ({ imager: t('CÁMARA','CAMERA'), spectrograph: t('ESPECTRÓGRAFO','SPECTROGRAPH'), photometer: t('FOTÓMETRO','PHOTOMETER'), uvDetector: t('DETECTOR UV','UV DETECTOR'), infraredDetector: t('DETECTOR IR','IR DETECTOR'), xrayDetector: t('DETECTOR X','X-RAY DETECTOR'), gammaDetector: t('DETECTOR GAMMA','GAMMA DETECTOR') })[id]).join(' / ') || t('SIN INSTRUMENTOS SELECCIONADOS','NO INSTRUMENTS SELECTED')} · {design.power === 'solar' ? t('PANELES SOLARES','SOLAR ARRAYS') : t('GENERADOR DE RADIOISÓTOPOS','RADIOISOTOPE GENERATOR')} · {design.thermal === 'cryogenic' ? t('CONTROL CRIOGÉNICO','CRYOGENIC CONTROL') : t('CONTROL TÉRMICO PASIVO','PASSIVE THERMAL CONTROL')}</small></div>
    {countdown && <div className="cinematic-countdown"><small>T −</small><b>{countdown}</b></div>}
    {elapsed >= 17 && <div className="cinematic-mission-title"><strong>ORBITAL COMMAND</strong><span>{t('MISIÓN DESPLEGADA — OBSERVACIONES INICIADAS','MISSION DEPLOYED — OBSERVATIONS STARTED')}</span></div>}
    {active ? <div className="cinematic-progress" role="progressbar" aria-label={t('Progreso de la cinemática','Cinematic progress')} aria-valuemin={0} aria-valuemax={20} aria-valuenow={Math.floor(elapsed)}><i style={{ width: `${Math.min(100, elapsed / duration * 100)}%` }} /></div> : <button className="cinematic-start" type="button" onClick={start}>{t('INICIAR LANZAMIENTO CINEMATOGRÁFICO','BEGIN CINEMATIC LAUNCH')} <b>▶</b></button>}
    {active && <span className="cinematic-timecode">T+ {elapsed.toFixed(1)} s / 20.0 s</span>}
  </div>;
}
