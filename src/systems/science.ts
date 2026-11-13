import type { Mission } from '../data/missions';
import { instruments, launchers, type MissionDesign } from './engineering.ts';
import type { ExplorationResources } from './lunarCampaign';
import { readStorage, writeStorage } from './storage.ts';
import type { LabReading } from '../data/planetaryLab';

export type ScienceReport = {
  missionId: string; missionName: string; destination: string; objective: string; instrument: string;
  observations: { region: string; value: number; unit: string }[]; samples: string[];
  transmittedUnits: number; fuelRemaining: number; energyRemaining: number; integrity: number;
  elapsedDays: number; score: number; significance: string; source: string;
  modelReadings?: LabReading[];
  problems?: string[];
  photos?: number;
  netFuelUsed?: number; netEnergyUsed?: number; completedObjectives?: string[];
};
const KEY = 'orbital-command-reports-v1';
let volatileReports: ScienceReport[] | null = null;
const contexts: Record<string, { significance: string; source: string }> = {
  earth: { significance: 'Observar nubes, océanos y vegetación ayuda a formular preguntas sobre cambios ambientales en nuestro planeta.', source: 'https://science.nasa.gov/earth/' },
  moon: { significance: 'La geología lunar conserva pistas sobre impactos y procesos tempranos del sistema solar.', source: 'https://science.nasa.gov/moon/' },
  mercury: { significance: 'Comparar cráteres y materiales ayuda a estudiar la evolución de los mundos rocosos.', source: 'https://science.nasa.gov/mercury/' },
  venus: { significance: 'Venus ofrece un contraste para estudiar atmósferas densas y efecto invernadero.', source: 'https://science.nasa.gov/venus/' },
  mars: { significance: 'Algunos minerales y antiguos relieves marcianos aportan evidencia de ambientes que tuvieron agua líquida.', source: 'https://science.nasa.gov/mars/' },
  jupiter: { significance: 'Las bandas y tormentas permiten estudiar la dinámica de un gigante gaseoso.', source: 'https://science.nasa.gov/jupiter/' },
  europa: { significance: 'La corteza de hielo y las señales magnéticas son indicios que ayudan a investigar un posible océano; no prueban la existencia de vida.', source: 'https://science.nasa.gov/jupiter/moons/europa/' },
  saturn: { significance: 'Las observaciones de los anillos y lunas permiten estudiar partículas de hielo y dinámicas orbitales.', source: 'https://science.nasa.gov/saturn/' },
  titan: { significance: 'Titán permite comparar procesos atmosféricos y cuerpos líquidos de hidrocarburos con los de la Tierra.', source: 'https://science.nasa.gov/saturn/moons/titan/' },
  uranus: { significance: 'El estudio de Urano ayuda a comparar la estructura y la atmósfera de los gigantes helados.', source: 'https://science.nasa.gov/uranus/' },
  neptune: { significance: 'Neptuno ofrece un laboratorio distante para estudiar atmósferas y tormentas.', source: 'https://science.nasa.gov/neptune/' },
  sun: { significance: 'La actividad solar puede afectar al entorno espacial y a tecnologías de comunicaciones y navegación.', source: 'https://science.nasa.gov/sun/' },
  asteroid: { significance: 'Los asteroides conservan información sobre materiales y procesos del sistema solar temprano.', source: 'https://science.nasa.gov/mission/psyche/' },
};

export function createScienceReport(mission: Mission, design: MissionDesign, resources: ExplorationResources, regions: string[], samples: string[], modelReadings: LabReading[] = [], maneuver: 'fuel' | 'energy' | null = null, photos = 0, events: string[] = []): ScienceReport {
  const instrument = instruments[design.instrument];
  const seed = [...mission.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  const context = contexts[mission.id] ?? contexts.earth;
  return {
    missionId: mission.id, missionName: mission.name, destination: mission.destination, objective: mission.objective,
    instrument: instrument.name,
    observations: regions.map((region, index) => ({ region, value: 20 + (seed + index * 17) % 65, unit: 'índice simulado / 100' })),
    samples, transmittedUnits: Number((regions.length * instrument.data + modelReadings.length * instrument.data / 3).toFixed(1)), fuelRemaining: resources.fuel,
    energyRemaining: resources.energy, integrity: resources.integrity, elapsedDays: resources.elapsedMinutes / 1440,
    score: Math.round(instrument.science * 0.6 + resources.integrity * 0.4), significance: context.significance, source: context.source, modelReadings,
    problems: [...(maneuver ? [`Corrección de trayectoria resuelta mediante ${maneuver === 'fuel' ? 'combustible' : 'energía'}.`] : []), ...events], photos,
    netFuelUsed: Math.max(0, launchers[design.launcher].fuel - resources.fuel), netEnergyUsed: Math.max(0, 100 - resources.energy),
    completedObjectives: [`${regions.length} regiones registradas`, samples.length ? `${samples.length} muestras simuladas analizadas` : 'Observación remota completada', 'Resultados transmitidos en la simulación'],
  };
}

export function loadReports(): ScienceReport[] {
  try {
    if (volatileReports) return volatileReports;
    const parsed: unknown = JSON.parse(readStorage(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ScienceReport => Boolean(entry && typeof entry === 'object'
      && typeof entry.missionId === 'string' && Object.hasOwn(contexts, entry.missionId)
      && ['missionName', 'destination', 'objective', 'instrument', 'significance', 'source'].every((key) => typeof entry[key] === 'string')
      && entry.source.startsWith('https://science.nasa.gov/')
      && ['transmittedUnits', 'fuelRemaining', 'energyRemaining', 'integrity', 'elapsedDays', 'score'].every((key) => typeof entry[key] === 'number' && Number.isFinite(entry[key]))
      && Array.isArray(entry.samples) && entry.samples.every((sample: unknown) => typeof sample === 'string')
      && (entry.problems === undefined || Array.isArray(entry.problems) && entry.problems.every((problem: unknown) => typeof problem === 'string'))
      && (entry.photos === undefined || Number.isInteger(entry.photos) && entry.photos >= 0 && entry.photos <= 1000)
      && (entry.netFuelUsed === undefined || typeof entry.netFuelUsed === 'number' && Number.isFinite(entry.netFuelUsed) && entry.netFuelUsed >= 0)
      && (entry.netEnergyUsed === undefined || typeof entry.netEnergyUsed === 'number' && Number.isFinite(entry.netEnergyUsed) && entry.netEnergyUsed >= 0)
      && (entry.completedObjectives === undefined || Array.isArray(entry.completedObjectives) && entry.completedObjectives.every((objective: unknown) => typeof objective === 'string'))
      && (entry.modelReadings === undefined || Array.isArray(entry.modelReadings) && entry.modelReadings.every((reading: LabReading) => reading && typeof reading.region === 'string' && typeof reading.label === 'string' && typeof reading.unit === 'string' && typeof reading.value === 'number' && Number.isFinite(reading.value)))
      && Array.isArray(entry.observations) && entry.observations.every((observation: { region?: unknown; value?: unknown; unit?: unknown }) => observation && typeof observation.region === 'string' && typeof observation.value === 'number' && Number.isFinite(observation.value) && observation.value >= 0 && observation.value <= 100 && typeof observation.unit === 'string')));
  } catch { return []; }
}

export function saveReport(report: ScienceReport): boolean {
  const reports = loadReports().filter((item) => item.missionId !== report.missionId);
  const next = [...reports, report];
  const saved = writeStorage(KEY, JSON.stringify(next));
  volatileReports = saved ? null : next;
  return saved;
}
