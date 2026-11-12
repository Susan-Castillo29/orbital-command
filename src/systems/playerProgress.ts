import { readStorage, writeStorage } from './storage';

export type PlayerProgress = { credits: number; xp: number; completedMissions: string[] };
const KEY = 'orbital-command-player';
export const initialPlayerProgress: PlayerProgress = { credits: 600, xp: 0, completedMissions: [] };

export function loadPlayerProgress(): PlayerProgress {
  try {
    const saved = readStorage(KEY);
    if (!saved) return { ...initialPlayerProgress, completedMissions: [] };
    const data = JSON.parse(saved) as Partial<PlayerProgress>;
    return {
      credits: Math.max(0, Math.floor(Number(data.credits) || 0)),
      xp: Math.max(0, Math.floor(Number(data.xp) || 0)),
      completedMissions: Array.isArray(data.completedMissions) ? [...new Set(data.completedMissions.filter((id): id is string => typeof id === 'string'))] : [],
    };
  } catch { return { ...initialPlayerProgress, completedMissions: [] }; }
}

export function awardMission(missionId: string, xp: number, credits: number): { progress: PlayerProgress; awarded: boolean } {
  const current = loadPlayerProgress();
  if (current.completedMissions.includes(missionId)) return { progress: current, awarded: false };
  const next = { credits: current.credits + credits, xp: current.xp + xp, completedMissions: [...current.completedMissions, missionId] };
  writeStorage(KEY, JSON.stringify(next));
  return { progress: next, awarded: true };
}
