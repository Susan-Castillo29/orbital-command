import { telescopeBands, telescopeInstruments, telescopeLevels, telescopeMissionReferences, telescopeObjectives, telescopeOptics, type SpectralBandId, type TelescopeInstrumentId, type TelescopeLevelId } from '../data/telescopeProgram.ts';

export type TelescopeDesign = {
  level: TelescopeLevelId;
  objectiveIds: string[];
  bands: SpectralBandId[];
  instrumentIds: TelescopeInstrumentId[];
  apertureId: '0.8' | '2.4' | '6.5';
  secondaryId: 'cassegrain' | 'off-axis';
  xrayPairs: 2 | 4;
  gammaMode: 'pair' | 'scintillator';
  focus: 'passive' | 'active';
  stabilization: 'standard' | 'fine';
  power: 'solar' | 'radioisotope';
  thermal: 'passive' | 'cryogenic';
  recorder: 'compact' | 'extended';
};

export const telescopeStorageKey = 'orbital-command-science-mode-v1';
export const scienceArchiveKey = 'orbital-command-science-archive-v1';

export const initialTelescopeDesign: TelescopeDesign = {
  level:'explorer', objectiveIds:['galaxies'], bands:['visible'], instrumentIds:['imager'], apertureId:'0.8', secondaryId:'cassegrain', xrayPairs:2, gammaMode:'pair', focus:'passive', stabilization:'standard', power:'solar', thermal:'passive', recorder:'compact',
};

export function validTelescopeDesign(value: unknown): value is TelescopeDesign {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TelescopeDesign>;
  return Object.hasOwn(telescopeLevels, candidate.level ?? '')
    && Array.isArray(candidate.objectiveIds) && candidate.objectiveIds.every((id) => telescopeObjectives.some((item) => item.id === id))
    && Array.isArray(candidate.bands) && candidate.bands.every((id) => telescopeBands.some((item) => item.id === id))
    && Array.isArray(candidate.instrumentIds) && candidate.instrumentIds.every((id) => telescopeInstruments.some((item) => item.id === id))
    && ['0.8','2.4','6.5'].includes(candidate.apertureId ?? '')
    && ['cassegrain','off-axis'].includes(candidate.secondaryId ?? '')
    && (candidate.xrayPairs === 2 || candidate.xrayPairs === 4)
    && ['pair','scintillator'].includes(candidate.gammaMode ?? '')
    && ['passive','active'].includes(candidate.focus ?? '')
    && ['standard','fine'].includes(candidate.stabilization ?? '')
    && ['solar','radioisotope'].includes(candidate.power ?? '')
    && ['passive','cryogenic'].includes(candidate.thermal ?? '')
    && ['compact','extended'].includes(candidate.recorder ?? '');
}

export function objectiveById(id: string) { return telescopeObjectives.find((item) => item.id === id); }
export function bandById(id: string) { return telescopeBands.find((item) => item.id === id); }
export function instrumentById(id: string) { return telescopeInstruments.find((item) => item.id === id); }

export function allowedBands(design: TelescopeDesign) {
  const goals = design.objectiveIds.map(objectiveById).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return telescopeBands.filter((band) => goals.some((goal) => (goal.bands as readonly string[]).includes(band.id)));
}

export function allowedInstruments(design: TelescopeDesign) {
  const goals = design.objectiveIds.map(objectiveById).filter((item): item is NonNullable<typeof item> => Boolean(item));
  return telescopeInstruments.filter((instrument) => goals.some((goal) => (goal.instruments as readonly string[]).includes(instrument.id))
    && design.bands.some((band) => (instrument.bands as readonly string[]).includes(band)));
}

export function normalizeTelescopeDesign(input: TelescopeDesign): TelescopeDesign {
  const level = telescopeLevels[input.level] ? input.level : 'explorer';
  const profile = telescopeLevels[level];
  const objectiveIds = input.objectiveIds.filter((id) => telescopeObjectives.some((item) => item.id === id)).slice(0, profile.maxObjectives);
  let design = { ...initialTelescopeDesign, ...input, level, objectiveIds };
  const bandsAllowed = allowedBands(design).map((band) => band.id as SpectralBandId);
  let bands = design.bands.filter((band) => bandsAllowed.includes(band)).slice(0, profile.maxBands);
  if (!bands.length && bandsAllowed.length) bands = [bandsAllowed[0]];
  design = { ...design, bands };
  const instrumentsAllowed = allowedInstruments(design).map((instrument) => instrument.id as TelescopeInstrumentId);
  const instrumentIds = design.instrumentIds.filter((id) => instrumentsAllowed.includes(id)).slice(0, profile.maxInstruments);
  return { ...design, instrumentIds };
}

const powerSources = {
  solar: { name:'Paneles solares', nameEn:'Solar arrays', watts:2050, massKg:135, cost:190 },
  radioisotope: { name:'Generador de radioisótopos', nameEn:'Radioisotope power system', watts:1050, massKg:195, cost:250 },
} as const;
const thermalSystems = {
  passive: { name:'Parasol y radiador pasivo', nameEn:'Sunshield and passive radiator', massKg:55, powerW:25, cost:90 },
  cryogenic: { name:'Refrigerador criogénico', nameEn:'Cryocooler', massKg:145, powerW:280, cost:310 },
} as const;
const recorders = {
  compact: { name:'Grabador 90 Gbit', nameEn:'90 Gbit recorder', capacity:90, massKg:35, powerW:25, cost:75 },
  extended: { name:'Grabador 220 Gbit', nameEn:'220 Gbit recorder', capacity:220, massKg:70, powerW:45, cost:145 },
} as const;
const focusSystems = {
  passive: { name:'Enfoque calibrado', nameEn:'Calibrated focus', massKg:15, powerW:10, cost:25 },
  active: { name:'Actuador de enfoque motorizado', nameEn:'Motorised focus actuator', massKg:55, powerW:45, cost:100 },
} as const;

export type TelescopeAssessment = ReturnType<typeof evaluateTelescopeDesign>;

export function evaluateTelescopeDesign(input: TelescopeDesign) {
  const design = normalizeTelescopeDesign(input);
  const level = telescopeLevels[design.level];
  const aperture = telescopeOptics.apertures.find((item) => item.id === design.apertureId)!;
  const secondary = telescopeOptics.secondaries.find((item) => item.id === design.secondaryId)!;
  const xray = telescopeOptics.xrayShells.find((item) => item.id === design.xrayPairs)!;
  const gamma = telescopeOptics.gammaModes.find((item) => item.id === design.gammaMode)!;
  const instruments = design.instrumentIds.map(instrumentById).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const hasReflectiveBand = design.bands.some((band) => band === 'visible' || band === 'ultraviolet' || band === 'infrared');
  const hasXray = design.bands.includes('xray');
  const hasGamma = design.bands.includes('gamma');
  const hasInfraredDetector = design.instrumentIds.includes('infraredDetector');
  const source = powerSources[design.power];
  const availablePowerW = Math.min(level.powerW, source.watts);
  const thermal = thermalSystems[design.thermal];
  const recorder = recorders[design.recorder];
  const focus = focusSystems[design.focus];
  const hasFocalOptics = hasReflectiveBand || hasXray;
  const massKg = 320 + instruments.reduce((sum, item) => sum + item.massKg, 0)
    + (hasReflectiveBand ? aperture.massKg + secondary.massKg : 0)
    + (hasXray ? xray.massKg : 0) + (hasGamma ? gamma.massKg : 0)
    + source.massKg + thermal.massKg + recorder.massKg + (hasFocalOptics ? focus.massKg : 0) + (design.stabilization === 'fine' ? 95 : 45);
  const powerW = 220 + instruments.reduce((sum, item) => sum + item.powerW, 0)
    + source.watts * 0.08 + thermal.powerW + recorder.powerW + (hasFocalOptics ? focus.powerW : 0) + (design.stabilization === 'fine' ? 115 : 45);
  const cost = 310 + instruments.reduce((sum, item) => sum + item.cost, 0)
    + (hasReflectiveBand ? aperture.cost + secondary.cost : 0)
    + (hasXray ? xray.cost : 0) + (hasGamma ? gamma.cost : 0)
    + source.cost + thermal.cost + recorder.cost + (hasFocalOptics ? focus.cost : 0) + (design.stabilization === 'fine' ? 185 : 80);
  const dataGeneratedGb = instruments.reduce((sum, item) => sum + item.dataGb, 0);
  const dataRetainedGb = Math.min(dataGeneratedGb, Math.min(level.storageGb, recorder.capacity));
  const dataEfficiency = dataGeneratedGb === 0 ? 0 : dataRetainedGb / dataGeneratedGb;
  const apertureLight = hasReflectiveBand ? aperture.light : 0;
  const stabilityScore = design.stabilization === 'fine' ? 90 : 65;
  const objectiveCoverage = design.objectiveIds.map((id) => {
    const objective = objectiveById(id)!;
    const supportedBand = design.bands.find((band) => (objective.bands as readonly string[]).includes(band));
    const supportingInstrument = instruments.find((instrument) => (objective.instruments as readonly string[]).includes(instrument.id)
      && (!supportedBand || (instrument.bands as readonly string[]).includes(supportedBand)));
    return { id, objective, band:supportedBand ?? null, instrument:supportingInstrument ?? null, covered:Boolean(supportedBand && supportingInstrument) };
  });
  const coverageRatio = objectiveCoverage.length ? objectiveCoverage.filter((item) => item.covered).length / objectiveCoverage.length : 0;
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!design.objectiveIds.length) errors.push('Selecciona al menos un objetivo científico antes de continuar.');
  if (design.objectiveIds.length > level.maxObjectives) errors.push(`El nivel permite hasta ${level.maxObjectives} objetivos.`);
  if (design.bands.length > level.maxBands) errors.push(`El nivel permite hasta ${level.maxBands} bandas espectrales.`);
  if (design.instrumentIds.length > level.maxInstruments) errors.push(`El nivel permite hasta ${level.maxInstruments} instrumentos.`);
  if (massKg > level.payloadKg) errors.push(`La carga pesa ${massKg} kg y excede los ${level.payloadKg} kg disponibles para este perfil de lanzamiento.`);
  if (cost > level.budget) errors.push(`El coste estimado de ${cost} unidades supera el presupuesto de ${level.budget}.`);
  if (powerW > availablePowerW) errors.push(`La carga demanda ${powerW} W y el sistema eléctrico elegido puede entregar ${availablePowerW} W.`);
  if (design.bands.length && !design.instrumentIds.length) errors.push('Instala al menos un instrumento que cubra una de las bandas elegidas.');
  if (hasXray && !design.instrumentIds.includes('xrayDetector')) errors.push('La banda de rayos X requiere un detector X y espejos de incidencia rasante.');
  if (hasGamma && !design.instrumentIds.includes('gammaDetector')) errors.push('La banda gamma requiere un detector de eventos; un espejo óptico no puede enfocarla.');
  if (design.bands.includes('infrared') && hasInfraredDetector && design.thermal !== 'cryogenic') errors.push('El detector infrarrojo seleccionado requiere refrigeración criogénica en este modelo educativo.');
  for (const item of objectiveCoverage.filter((entry) => !entry.covered)) errors.push(`“${item.objective.name}” necesita una banda compatible y al menos un instrumento específico para ese objetivo.`);
  if (dataGeneratedGb > recorder.capacity) warnings.push(`Los instrumentos generarían ${dataGeneratedGb} Gbit por ciclo; el grabador conserva hasta ${recorder.capacity} Gbit. Parte de la telemetría se perdería o tendría que priorizarse.`);
  if (hasReflectiveBand && design.apertureId === '6.5') warnings.push('El espejo segmentado aumenta la recolección de luz, pero exige despliegue y alineación de segmentos que aquí se representan de forma simplificada.');
  if (hasXray) warnings.push('Los rayos X usan un módulo de espejos rasantes; el espejo primario visible no los enfoca.');
  if (hasGamma) warnings.push('Los rayos gamma se registran por interacción en el detector y no se enfocan con espejos o lentes convencionales.');
  if (design.power === 'radioisotope' && powerW < source.watts * 0.5) warnings.push('El generador deja margen de potencia para operar lejos del Sol, a cambio de más masa y coste.');
  const scienceScore = Math.round(34 * coverageRatio);
  const wavelengthScore = Math.round(18 * (design.bands.length ? design.bands.filter((band) => design.objectiveIds.some((id) => (objectiveById(id)!.bands as readonly string[]).includes(band))).length / design.bands.length : 0));
  const instrumentScore = Math.round(14 * (instruments.length ? instruments.filter((item) => design.bands.some((band) => (item.bands as readonly string[]).includes(band))).length / instruments.length : 0));
  const opticsScore = Math.round(12 * ((hasReflectiveBand ? (apertureLight / 42) * 0.65 + (secondary.stability / 17) * 0.35 : 1) * (hasXray ? xray.area : 1) * (hasGamma ? gamma.sensitivity : 1)));
  const technicalScore = Math.round(22 * [massKg <= level.payloadKg, cost <= level.budget, powerW <= level.powerW].filter(Boolean).length / 3 * dataEfficiency);
  const rawScore = scienceScore + wavelengthScore + instrumentScore + opticsScore + technicalScore;
  const score = Math.max(0, Math.min(errors.length ? 59 : 100, rawScore - errors.length * 8));
  const recommendations: string[] = [];
  if (!coverageRatio) recommendations.push('Añade una banda que el objetivo pueda observar y un instrumento diseñado para medirla.');
  if (massKg > level.payloadKg) recommendations.push('Reduce la apertura o retira una carga; cada kg también consume capacidad del lanzador.');
  if (cost > level.budget) recommendations.push('Compara el costo marginal de cada instrumento con el valor científico que aporta.');
  if (powerW > availablePowerW) recommendations.push('Reduce la carga eléctrica o elige una fuente de potencia con margen suficiente.');
  if (hasInfraredDetector && design.thermal !== 'cryogenic') recommendations.push('Añade refrigeración criogénica para evitar que el calor del sensor domine la señal infrarroja.');
  if (dataGeneratedGb > recorder.capacity) recommendations.push('Aumenta el almacenamiento o prioriza observaciones antes de transmitirlas.');
  if (design.objectiveIds.some((id) => ['exoplanets','atmospheres'].includes(id)) && design.stabilization !== 'fine') recommendations.push('Una observación de tránsito o espectros de atmósfera se beneficia de guiado fino y una línea base estable.');
  if (design.bands.length && !design.instrumentIds.includes('spectrograph') && design.objectiveIds.some((id) => ['galaxies','exoplanets','atmospheres'].includes(id))) recommendations.push('Un espectrógrafo puede distinguir huellas espectrales que una imagen de banda ancha no separa.');
  if (!recommendations.length) recommendations.push('El diseño está equilibrado; compara una misión alternativa y observa cómo cambian masa, potencia y retención de datos.');
  const references = telescopeMissionReferences.filter((reference) => reference.bands.some((band) => design.bands.includes(band as SpectralBandId)));
  return { design, level, massKg, powerW, cost, budget:level.budget, payloadKg:level.payloadKg, powerCapacityW:availablePowerW, dataGeneratedGb, dataRetainedGb, dataEfficiency, apertureLight, stabilityScore, coverageRatio, objectiveCoverage, errors, warnings, recommendations, score, scienceScore, wavelengthScore, instrumentScore, opticsScore, technicalScore, references };
}

export function simulatedSpectrum(design: TelescopeDesign) {
  const seed = [...design.objectiveIds, ...design.bands, ...design.instrumentIds].join('|').split('').reduce((sum, char) => sum + char.charCodeAt(0), 17);
  const points = Array.from({ length:36 }, (_, index) => {
    const x = 12 + (index / 35) * 376;
    const base = 32 + Math.sin((index + seed % 9) * 0.46) * 6 + Math.cos((index + seed % 7) * 0.17) * 4;
    const peakA = Math.exp(-((index - (9 + seed % 8)) ** 2) / 8) * 35;
    const peakB = Math.exp(-((index - (24 + seed % 7)) ** 2) / 13) * 27;
    const y = 172 - Math.max(7, Math.min(105, base + peakA + peakB));
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return points;
}
