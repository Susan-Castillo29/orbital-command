import type { Mission } from '../data/missions';
import type { ShipId } from '../data/ships';

export type InstrumentId = 'camera' | 'spectrometer' | 'advanced';
export type PowerId = 'solar' | 'nuclear';
export type RadioId = 'standard' | 'deep';
export type LauncherId = 'light' | 'medium' | 'heavy';
export type ThermalId = 'standard' | 'shielded';
export type MissionDesign = { ship: ShipId; instrument: InstrumentId; power: PowerId; radio: RadioId; launcher: LauncherId; thermal: ThermalId };

export const hulls = {
  pioneer: { name: 'Pioneer', mass: 380, cost: 85, storage: 55 },
  swift: { name: 'Swift', mass: 280, cost: 70, storage: 35 },
  atlas: { name: 'Atlas', mass: 520, cost: 110, storage: 90 },
} as const;
export const instruments = {
  camera: { name: 'Cámara multiespectral', mass: 40, cost: 35, power: 1.2, data: 8, science: 45 },
  spectrometer: { name: 'Espectrómetro y sensores ambientales', mass: 75, cost: 65, power: 2.2, data: 15, science: 75 },
  advanced: { name: 'Espectrómetro avanzado y sensores', mass: 125, cost: 110, power: 3.8, data: 29, science: 100 },
} as const;
export const powerSystems = {
  solar: { name: 'Paneles solares', mass: 80, cost: 50, power: 3.5 },
  nuclear: { name: 'Generador de radioisótopos', mass: 150, cost: 110, power: 6 },
} as const;
export const radios = {
  standard: { name: 'Antena estándar', mass: 35, cost: 30, data: 12 },
  deep: { name: 'Antena de espacio profundo', mass: 75, cost: 80, data: 34 },
} as const;
export const launchers = {
  light: { name: 'Lanzador ligero', capacity: 650, cost: 70, fuel: 75 },
  medium: { name: 'Lanzador medio', capacity: 1000, cost: 130, fuel: 88 },
  heavy: { name: 'Lanzador pesado', capacity: 1500, cost: 220, fuel: 100 },
} as const;
export const thermalSystems = {
  standard: { name: 'Protección estándar', mass: 0, cost: 0 },
  shielded: { name: 'Protección térmica reforzada', mass: 95, cost: 90 },
} as const;
export const requiresThermalProtection = (missionId: string) => ['mercury', 'venus', 'sun'].includes(missionId);
export const requiresEnvironmentalSensors = (missionId: string) => ['venus', 'jupiter', 'saturn', 'titan', 'uranus', 'neptune', 'sun'].includes(missionId);

export const initialDesign: MissionDesign = { ship: 'pioneer', instrument: 'camera', power: 'solar', radio: 'standard', launcher: 'light', thermal: 'standard' };
export function defaultDesign(missionId: string, ship: ShipId): MissionDesign {
  const design: MissionDesign = { ...initialDesign, ship, instrument: requiresEnvironmentalSensors(missionId) ? 'spectrometer' : 'camera', thermal: requiresThermalProtection(missionId) ? 'shielded' : 'standard' };
  const mass = hulls[ship].mass + instruments[design.instrument].mass + powerSystems[design.power].mass + radios[design.radio].mass + thermalSystems[design.thermal].mass;
  return { ...design, launcher: mass > launchers.light.capacity ? 'medium' : 'light' };
}

export function evaluateDesign(design: MissionDesign, mission: Mission) {
  const hull = hulls[design.ship];
  const instrument = instruments[design.instrument];
  const power = powerSystems[design.power];
  const radio = radios[design.radio];
  const launcher = launchers[design.launcher];
  const thermal = thermalSystems[design.thermal];
  const mass = hull.mass + instrument.mass + power.mass + radio.mass + thermal.mass;
  const cost = hull.cost + instrument.cost + power.cost + radio.cost + launcher.cost + thermal.cost;
  const powerMargin = Number((power.power - 1 - instrument.power).toFixed(1));
  const errors: string[] = [];
  const warnings: string[] = [];
  if (mass > launcher.capacity) errors.push(`La nave pesa ${mass} kg y el lanzador admite ${launcher.capacity} kg. Reduce masa o elige un lanzador de mayor capacidad.`);
  if (cost > mission.budget) errors.push(`El coste de ${cost} CR supera el presupuesto de ${mission.budget} CR. Cambia componentes para equilibrar la misión.`);
  if (powerMargin < 0) errors.push(`El instrumento y la nave necesitan más potencia de la disponible. Mejora la fuente o reduce el consumo científico.`);
  if (requiresThermalProtection(mission.id) && design.thermal !== 'shielded') errors.push('Este destino requiere protección térmica reforzada para la sonda en el modelo de misión.');
  if (requiresEnvironmentalSensors(mission.id) && design.instrument === 'camera') errors.push('El objetivo requiere un espectrómetro con sensores ambientales; una cámara sola no mide estas condiciones.');
  if (instrument.data > radio.data) warnings.push('El instrumento produce datos más rápido que la antena: tendrás que almacenarlos o priorizar su transmisión.');
  if (design.power === 'solar' && ['jupiter', 'europa', 'saturn', 'titan', 'uranus', 'neptune'].includes(mission.id)) warnings.push('La luz solar disminuye con la distancia; este modelo simplificado no calcula la potencia solar real. Considera el generador de larga duración.');
  return { mass, cost, powerMargin, storage: hull.storage, dataRate: instrument.data, downlinkRate: radio.data, science: instrument.science, fuel: launcher.fuel, errors, warnings };
}
