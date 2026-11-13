import FullscreenControl from './FullscreenControl';
import { attachRenderQuality } from '../systems/renderQuality';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadPlanetTexture } from '../systems/planetTextures';
import './tracking-globe.css';

const stations = [
  { name: 'Caribe · República Dominicana', country: 'República Dominicana', lat: 18.49, lon: -69.93, detail: 'Estación ficticia para el universo de ORBITAL COMMAND; comparte datos con estudiantes y equipos educativos.' },
  { name: 'Goldstone · Estados Unidos', country: 'Estados Unidos', lat: 35.4, lon: -116.9, detail: 'Complejo real de la Red del Espacio Profundo de NASA; su participación en esta historia es ficticia.' },
  { name: 'Madrid · España', country: 'España', lat: 40.4, lon: -4.2, detail: 'Complejo real de la Red del Espacio Profundo de NASA; su participación en esta historia es ficticia.' },
  { name: 'Canberra · Australia', country: 'Australia', lat: -35.4, lon: 148.98, detail: 'Complejo real de la Red del Espacio Profundo de NASA; su participación en esta historia es ficticia.' },
];

export default function TrackingGlobe() {
  const host = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(0);
  const [selected, setSelected] = useState(0);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    const detachQuality = attachRenderQuality(renderer, element);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30); camera.position.set(0, 0, 5.4);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const light = new THREE.DirectionalLight(0xe0f5ff, 2); light.position.set(3, 4, 5); scene.add(light);
    const globe = new THREE.Group(); scene.add(globe);
    const texture = loadPlanetTexture('earth');
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1.5, 48, 32), new THREE.MeshStandardMaterial({ map: texture, color: texture ? '#ffffff' : '#2870a0', roughness: 0.9 })); globe.add(earth);
    const markers = stations.map((station, index) => {
      const lat = station.lat * Math.PI / 180; const lon = station.lon * Math.PI / 180;
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: index === 0 ? '#ffd079' : '#8beaff' }));
      marker.position.set(-1.53 * Math.cos(lat) * Math.cos(lon), 1.53 * Math.sin(lat), 1.53 * Math.cos(lat) * Math.sin(lon));
      marker.userData.index = index; globe.add(marker); return marker;
    });
    globe.rotation.y = -1.2;
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2();
    const onClick = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...markers, earth])[0];
      const index = markers.findIndex((marker) => marker === hit?.object);
      if (index >= 0) setSelected(index);
    };
    renderer.domElement.addEventListener('pointerdown', onClick);
    const resize = () => { const width = element.clientWidth || 300; const height = element.clientHeight || 250; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let frame = 0;
    const render = () => { frame = requestAnimationFrame(render); if (document.hidden) return; if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) globe.rotation.y += 0.002; markers.forEach((marker, index) => marker.scale.setScalar(index === selectedRef.current ? 1.65 : 1)); renderer.render(scene, camera); };
    render();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', onClick); texture?.dispose(); earth.geometry.dispose(); (earth.material as THREE.Material).dispose(); markers.forEach((marker) => { marker.geometry.dispose(); (marker.material as THREE.Material).dispose(); }); detachQuality(); renderer.dispose(); renderer.domElement.remove(); };
  }, []);
  return <div className="tracking-globe" data-visualization="tracking"><FullscreenControl label="globo de seguimiento" /><div className="tracking-canvas" ref={host} aria-label="Globo con estaciones de seguimiento" /><div className="tracking-stations">{stations.map((station, index) => <button key={station.name} aria-pressed={selected === index} onClick={() => setSelected(index)}>{station.country}</button>)}</div><strong>{stations[selected].name}</strong><p>{stations[selected].detail}</p><a href="https://www.nasa.gov/directorates/somd/space-communications-navigation-program/dsn-complexes/" target="_blank" rel="noreferrer">Información sobre la red real de NASA ↗</a><small>Posiciones aproximadas · enlaces de esta misión simulados.</small></div>;
}
