import { readStorage, writeStorage } from './storage.ts';

export type PlayerProgress = { credits: number; xp: number; completedMissions: string[] };
const KEY = 'orbital-command-player';
export const initialPlayerProgress: PlayerProgress = { credits: 600, xp: 0, completedMissions: [] };
let volatileProgress: PlayerProgress | null = null;

export function loadPlayerProgress(): PlayerProgress {
  try {
    if (volatileProgress) return volatileProgress;
    const saved = readStorage(KEY);
    if (!saved) return volatileProgress ?? { ...initialPlayerProgress, completedMissions: [] };
    const data = JSON.parse(saved) as Partial<PlayerProgress>;
    const credits = Number(data.credits);
    const xp = Number(data.xp);
    return {
      credits: Number.isFinite(credits) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(credits))) : 0,
      xp: Number.isFinite(xp) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(xp))) : 0,
      completedMissions: Array.isArray(data.completedMissions) ? [...new Set(data.completedMissions.filter((id): id is string => typeof id === 'string'))] : [],
    };
  } catch { return volatileProgress ?? { ...initialPlayerProgress, completedMissions: [] }; }
}

export function awardMission(missionId: string, xp: number, credits: number): { progress: PlayerProgress; awarded: boolean } {
  const current = loadPlayerProgress();
  if (current.completedMissions.includes(missionId)) return { progress: current, awarded: false };
  const next = { credits: current.credits + credits, xp: current.xp + xp, completedMissions: [...current.completedMissions, missionId] };
  volatileProgress = writeStorage(KEY, JSON.stringify(next)) ? null : next;
  return { progress: next, awarded: true };
}
