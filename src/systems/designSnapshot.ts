import { hulls, instruments, launchers, powerSystems, radios, thermalSystems, orbitProfiles, difficultyProfiles, type MissionDesign } from './engineering.ts';
export type DesignSnapshot = { version: 1; missionId: string; design: MissionDesign };
export function parseDesignSnapshot(raw: string, missionId: string): DesignSnapshot | null {
  if (raw.length > 4096) return null;
  try {
    const snapshot: unknown = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== 'object') return null;
    const value = snapshot as Record<string, unknown>;
    if (value.version !== 1 || value.missionId !== missionId || !value.design || typeof value.design !== 'object') return null;
    const design = value.design as Record<string, unknown>;
    const valid = (item: unknown, choices: object) => typeof item === 'string' && Object.hasOwn(choices, item);
    if (!valid(design.ship, hulls) || !valid(design.instrument, instruments) || !valid(design.power, powerSystems) || !valid(design.radio, radios) || !valid(design.launcher, launchers) || !valid(design.thermal, thermalSystems)) return null;
    if (design.orbit !== undefined && !valid(design.orbit, orbitProfiles)) return null;
    if (design.difficulty !== undefined && !valid(design.difficulty, difficultyProfiles)) return null;
    return { version: 1, missionId, design: { ship: design.ship, instrument: design.instrument, power: design.power, radio: design.radio, launcher: design.launcher, thermal: design.thermal, orbit: design.orbit, difficulty: design.difficulty } as MissionDesign };
  } catch { return null; }
}
