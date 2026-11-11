import { readStorage, writeStorage } from './storage';

export type LunarProgress = {
  arrived: boolean;
  orbit: boolean;
  landingZone: string | null;
  landed: boolean;
  roverDeployed: boolean;
  scannedRocks: number[];
  collectedSamples: number[];
  analyzed: boolean;
  transmitted: boolean;
};

export type ExplorationResources = {
  fuel: number;
  energy: number;
  integrity: number;
  storage: number;
  communications: number;
  elapsedMinutes: number;
};

export const initialLunarProgress: LunarProgress = {
  arrived: false,
  orbit: false,
  landingZone: null,
  landed: false,
  roverDeployed: false,
  scannedRocks: [],
  collectedSamples: [],
  analyzed: false,
  transmitted: false,
};

export const initialExplorationResources: ExplorationResources = {
  fuel: 100,
  energy: 100,
  integrity: 100,
  storage: 0,
  communications: 100,
  elapsedMinutes: 0,
};

export const landingZones = [
  { id: 'shackleton', name: 'Cráter Shackleton · Polo Sur', description: 'Iluminación permanente en el borde y depósitos de hielo en zonas de sombra.' },
  { id: 'mare', name: 'Mare Tranquillitatis', description: 'Llanura basáltica de relieve suave, adecuada para un descenso de prueba.' },
] as const;

export const lunarObjectives = [
  { id: 'arrival', label: 'Llegar a la Luna', complete: (progress: LunarProgress) => progress.arrived },
  { id: 'orbit', label: 'Establecer órbita', complete: (progress: LunarProgress) => progress.orbit },
  { id: 'zone', label: 'Seleccionar zona segura', complete: (progress: LunarProgress) => Boolean(progress.landingZone) },
  { id: 'landing', label: 'Aterrizar correctamente', complete: (progress: LunarProgress) => progress.landed },
  { id: 'rover', label: 'Desplegar el rover', complete: (progress: LunarProgress) => progress.roverDeployed },
  { id: 'scan', label: 'Escanear 3 formaciones', complete: (progress: LunarProgress) => progress.scannedRocks.length >= 3 },
  { id: 'samples', label: 'Recolectar 3 muestras', complete: (progress: LunarProgress) => progress.collectedSamples.length >= 3 },
  { id: 'analysis', label: 'Analizar las muestras', complete: (progress: LunarProgress) => progress.analyzed },
  { id: 'transmission', label: 'Transmitir resultados', complete: (progress: LunarProgress) => progress.transmitted },
] as const;

export function loadLunarProgress(missionId: string): LunarProgress {
  try {
    const saved = readStorage(`orbital-command-progress-${missionId}`);
    if (!saved) return { ...initialLunarProgress };
    const parsed = JSON.parse(saved) as Partial<LunarProgress>;
    const scannedRocks = Array.isArray(parsed.scannedRocks)
      ? [...new Set(parsed.scannedRocks.filter((index) => Number.isInteger(index) && index >= 0 && index < 3))]
      : [];
    const collectedSamples = Array.isArray(parsed.collectedSamples)
      ? [...new Set(parsed.collectedSamples.filter((index) => Number.isInteger(index) && scannedRocks.includes(index)))]
      : [];
    const landingZone = landingZones.some((zone) => zone.id === parsed.landingZone) ? parsed.landingZone! : null;
    const arrived = parsed.arrived === true;
    const orbit = arrived && parsed.orbit === true;
    const landed = orbit && Boolean(landingZone) && parsed.landed === true;
    const roverDeployed = landed && parsed.roverDeployed === true;
    const analyzed = roverDeployed && scannedRocks.length === 3 && collectedSamples.length === 3 && parsed.analyzed === true;
    return {
      ...initialLunarProgress,
      arrived,
      orbit,
      landingZone,
      landed,
      roverDeployed,
      scannedRocks,
      collectedSamples,
      analyzed,
      transmitted: analyzed && parsed.transmitted === true,
    };
  } catch {
    return { ...initialLunarProgress };
  }
}

export function saveLunarProgress(missionId: string, progress: LunarProgress) {
  writeStorage(`orbital-command-progress-${missionId}`, JSON.stringify(progress));
}

export function loadExplorationResources(missionId: string): ExplorationResources {
  try {
    const saved = readStorage(`orbital-command-resources-${missionId}`);
    if (!saved) return { ...initialExplorationResources };
    const parsed = JSON.parse(saved) as Partial<ExplorationResources>;
    return {
      ...initialExplorationResources,
      ...parsed,
      fuel: clampPercent(parsed.fuel),
      energy: clampPercent(parsed.energy),
      integrity: clampPercent(parsed.integrity),
      storage: finiteRange(parsed.storage, 0, 100, 0),
      communications: clampPercent(parsed.communications),
      elapsedMinutes: finiteRange(parsed.elapsedMinutes, 0, Number.MAX_SAFE_INTEGER, 0),
    };
  } catch {
    return { ...initialExplorationResources };
  }
}

export function saveExplorationResources(missionId: string, resources: ExplorationResources) {
  writeStorage(`orbital-command-resources-${missionId}`, JSON.stringify(resources));
}

export function objectiveCompletion(progress: LunarProgress) {
  const completed = lunarObjectives.filter((objective) => objective.complete(progress)).length;
  return { completed, total: lunarObjectives.length, percent: Math.round(completed / lunarObjectives.length * 100) };
}

function clampPercent(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(100, Math.max(0, numeric)) : 100;
}

function finiteRange(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}
