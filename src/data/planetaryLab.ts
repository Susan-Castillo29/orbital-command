export type LabReading = { region: string; label: string; value: number; unit: string };
export type ModelLayer = { name: string; description: string; color: number; temperature?: number; pressure?: number; density?: number };

const rockyInterior: ModelLayer[] = [
  { name: 'Corteza', description: 'Capa exterior sólida representada de forma conceptual.', color: 0x9f8269 },
  { name: 'Manto', description: 'Región interna estudiada indirectamente con modelos y observaciones.', color: 0xc3633e },
  { name: 'Núcleo', description: 'Región central; su composición y tamaño dependen del cuerpo.', color: 0xffb55c },
];
const giantInterior: ModelLayer[] = [
  { name: 'Atmósfera exterior', description: 'Nubes y gases forman la región visible; no representa una superficie sólida.', color: 0x88bcd1 },
  { name: 'Capas profundas', description: 'La presión aumenta con la profundidad; el esquema no está a escala.', color: 0x447da8 },
  { name: 'Interior profundo', description: 'La estructura interior se infiere mediante modelos y mediciones indirectas.', color: 0xf1c377 },
];
const icyInterior: ModelLayer[] = [
  { name: 'Corteza helada', description: 'La corteza exterior de Europa está dominada por hielo.', color: 0xc6dfe5 },
  { name: 'Posible océano', description: 'Las observaciones apoyan la hipótesis de un océano subsuperficial; el modelo no confirma vida.', color: 0x397ea8 },
  { name: 'Interior rocoso', description: 'El interior se estudia mediante modelos y observaciones indirectas.', color: 0xb39174 },
];
export const solarLayers: ModelLayer[] = [
  { name: 'Corona', description: 'Atmósfera exterior solar. Su temperatura puede alcanzar millones de grados.', color: 0xffd27a, temperature: 1000000 },
  { name: 'Cromosfera', description: 'Capa de la atmósfera solar situada entre la fotosfera y la corona.', color: 0xff8844, temperature: 10000 },
  { name: 'Fotosfera', description: 'Superficie visible del Sol en el modelo; la sonda no entra físicamente en él.', color: 0xffbf42, temperature: 5500 },
];
const atmospheres: Record<string, ModelLayer[]> = {
  venus: [
    { name: 'Nubes altas', description: 'Inicio del descenso de una sonda virtual.', color: 0xf7dca6, temperature: -30, pressure: 0.1, density: 0.1 },
    { name: 'Nubes medias', description: 'La presión y la temperatura aumentan hacia capas inferiores.', color: 0xe4b76c, temperature: 40, pressure: 1, density: 1 },
    { name: 'Atmósfera profunda', description: 'Modelo simplificado de condiciones extremas.', color: 0xbb743f, temperature: 250, pressure: 30, density: 25 },
    { name: 'Cerca de la superficie', description: 'Solo una sonda adecuada puede operar brevemente en este entorno extremo.', color: 0x8d5135, temperature: 465, pressure: 92, density: 65 },
  ],
  jupiter: [
    { name: 'Nubes altas', description: 'Bandas y tormentas en la atmósfera visible.', color: 0xe8c5a6, temperature: -145, pressure: 0.2, density: 0.1 },
    { name: 'Nubes medias', description: 'La sonda virtual continúa el descenso.', color: 0xc99570, temperature: -105, pressure: 1, density: 0.5 },
    { name: 'Atmósfera profunda', description: 'La presión creciente limita la vida operativa de la sonda.', color: 0x995f4f, temperature: 20, pressure: 10, density: 4 },
  ],
  saturn: [
    { name: 'Nubes altas', description: 'Atmósfera exterior del gigante gaseoso.', color: 0xe7d8aa, temperature: -180, pressure: 0.2, density: 0.1 },
    { name: 'Nubes medias', description: 'Modelo de descenso remoto, no una superficie sólida.', color: 0xc9af7f, temperature: -140, pressure: 1, density: 0.4 },
    { name: 'Atmósfera profunda', description: 'El aumento de presión reduce la capacidad operativa.', color: 0x98765e, temperature: -20, pressure: 10, density: 3 },
  ],
  titan: [
    { name: 'Bruma alta', description: 'Una atmósfera densa con compuestos orgánicos.', color: 0xe4b36c, temperature: -175, pressure: 0.2, density: 0.2 },
    { name: 'Atmósfera inferior', description: 'La sonda estudia la niebla antes del descenso.', color: 0xbb7a39, temperature: -180, pressure: 1, density: 2 },
    { name: 'Cerca de la superficie', description: 'Modelo de observación de un mundo con lagos de hidrocarburos.', color: 0x80542e, temperature: -179, pressure: 1.5, density: 5 },
  ],
  uranus: [
    { name: 'Nubes altas', description: 'Atmósfera fría de un gigante helado.', color: 0xb4edf1, temperature: -220, pressure: 0.2, density: 0.1 },
    { name: 'Atmósfera inferior', description: 'Aumento simplificado de temperatura y presión.', color: 0x6ca8b3, temperature: -190, pressure: 2, density: 0.8 },
    { name: 'Capas profundas', description: 'El descenso se detiene antes de condiciones inaccesibles.', color: 0x3d6b8c, temperature: -80, pressure: 12, density: 4 },
  ],
  neptune: [
    { name: 'Nubes altas', description: 'Atmósfera fría con fuertes vientos.', color: 0x719ce2, temperature: -210, pressure: 0.2, density: 0.1 },
    { name: 'Atmósfera inferior', description: 'Modelo simplificado de descenso científico.', color: 0x3e67b5, temperature: -180, pressure: 2, density: 0.8 },
    { name: 'Capas profundas', description: 'La sonda estudia las condiciones antes de perder operatividad.', color: 0x263d80, temperature: -70, pressure: 12, density: 4 },
  ],
};
export function modelFor(bodyId: string, mode: 'atmosphere' | 'interior'): ModelLayer[] {
  if (bodyId === 'sun') return solarLayers;
  if (mode === 'atmosphere') return atmospheres[bodyId] ?? [];
  if (bodyId === 'europa') return icyInterior;
  return ['jupiter', 'saturn', 'uranus', 'neptune'].includes(bodyId) ? giantInterior : rockyInterior;
}
export function hasAtmosphereModel(bodyId: string): boolean { return Boolean(atmospheres[bodyId]); }
export const atmosphereComposition: Record<string, string> = { venus: 'Dióxido de carbono, con nitrógeno y trazas de otros gases.', jupiter: 'Principalmente hidrógeno y helio.', saturn: 'Principalmente hidrógeno y helio.', titan: 'Principalmente nitrógeno, con metano.', uranus: 'Hidrógeno, helio y metano.', neptune: 'Hidrógeno, helio y metano.' };
