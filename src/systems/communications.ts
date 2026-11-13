const AU_KM = 149597870.7;
const LIGHT_KM_PER_SECOND = 299792.458;
const orbits: Record<string, { radiusAu: number; synodicDays: number }> = {
  mercury: { radiusAu: 0.387, synodicDays: 116 }, venus: { radiusAu: 0.723, synodicDays: 584 },
  mars: { radiusAu: 1.524, synodicDays: 780 }, asteroid: { radiusAu: 2.9, synodicDays: 800 },
  jupiter: { radiusAu: 5.2, synodicDays: 399 }, europa: { radiusAu: 5.2, synodicDays: 399 },
  saturn: { radiusAu: 9.58, synodicDays: 378 }, titan: { radiusAu: 9.58, synodicDays: 378 },
  uranus: { radiusAu: 19.2, synodicDays: 370 }, neptune: { radiusAu: 30.1, synodicDays: 367 },
};

/** Tiempo de luz unidireccional en un modelo circular sin efemérides reales. */
export function estimatedSignalSeconds(bodyId: string, missionDays: number): number {
  if (bodyId === 'earth') return 400 / LIGHT_KM_PER_SECOND;
  if (bodyId === 'moon') return 384400 / LIGHT_KM_PER_SECOND;
  if (bodyId === 'sun') return AU_KM / LIGHT_KM_PER_SECOND;
  const orbit = orbits[bodyId];
  if (!orbit) return 0;
  const day = Number.isFinite(missionDays) ? Math.max(0, missionDays) : 0;
  const angle = 2 * Math.PI * (day % orbit.synodicDays) / orbit.synodicDays;
  const distanceAu = Math.sqrt(1 + orbit.radiusAu ** 2 - 2 * orbit.radiusAu * Math.cos(angle));
  return distanceAu * AU_KM / LIGHT_KM_PER_SECOND;
}
export function compressedTransmissionSeconds(signalSeconds: number): number {
  return Math.max(2, Math.min(12, Math.ceil(signalSeconds / 120)));
}
