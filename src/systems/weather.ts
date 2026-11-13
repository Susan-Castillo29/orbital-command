/** Ciclo ficticio para practicar decisiones; no es un pronóstico meteorológico. */
export function isSimulatedDustStorm(bodyId: string, missionMinutes: number): boolean {
  if (bodyId !== 'mars' || !Number.isFinite(missionMinutes) || missionMinutes < 0) return false;
  const phase = missionMinutes % 30;
  return phase >= 10 && phase < 16;
}
