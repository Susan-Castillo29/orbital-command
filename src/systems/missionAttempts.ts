import { readStorage, removeStorage, writeStorage } from './storage.ts';
import type { MissionDesign } from './engineering.ts';
import type { TransitState } from './transit.ts';

export type FailedAttempt = {
  id: string; missionId: string; missionName: string; destination: string; phase?: 'transit' | 'exploration'; reason: 'energy' | 'integrity' | 'manoeuvre';
  elapsedDays: number; durationDays: number; energy: number; fuel: number; integrity: number;
  difficulty: string; orbit: string; power: string; instrument: string; launcher: string; decision: string; recordedAt: string;
};
const KEY = 'orbital-command-failed-attempts-v1';
let volatileAttempts: FailedAttempt[] | null = null;
const bounded = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100000;
function valid(value: unknown): value is FailedAttempt {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return ['id','missionId','missionName','destination','difficulty','orbit','power','instrument','launcher','decision','recordedAt'].every(key => typeof a[key] === 'string' && (a[key] as string).length <= 200)
    && (a.phase === undefined || a.phase === 'transit' || a.phase === 'exploration')
    && ['energy','integrity','manoeuvre'].includes(String(a.reason))
    && ['elapsedDays','durationDays','energy','fuel','integrity'].every(key => bounded(a[key]))
    && (a.elapsedDays as number) <= (a.durationDays as number)
    && ['energy','fuel','integrity'].every(key => (a[key] as number) <= 100);
}
export function loadFailedAttempts(): FailedAttempt[] {
  try {
    if (volatileAttempts) return volatileAttempts;
    const parsed: unknown = JSON.parse(readStorage(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(valid).slice(-20).reverse() : [];
  } catch { return []; }
}
export function saveFailedAttempt(attempt: FailedAttempt): boolean {
  if (!valid(attempt)) return false;
  const previous = loadFailedAttempts();
  if (previous.some(entry => entry.id === attempt.id)) return true;
  const next = [attempt, ...previous].slice(0, 20);
  const saved = writeStorage(KEY, JSON.stringify([...next].reverse()));
  volatileAttempts = saved ? null : next;
  return saved;
}
export function clearFailedAttempts(): void {
  volatileAttempts = [];
  removeStorage(KEY);
}
export function makeFailedAttempt(id: string, mission: { id: string; name: string; destination: string }, design: MissionDesign, state: TransitState, reason: FailedAttempt['reason'], phase: 'transit' | 'exploration' = 'transit'): FailedAttempt {
  return { id, missionId: mission.id, missionName: mission.name, destination: mission.destination, phase, reason,
    elapsedDays: state.elapsedDays, durationDays: state.durationDays, energy: state.energy, fuel: state.fuel, integrity: state.integrity,
    difficulty: design.difficulty ?? 'standard', orbit: design.orbit ?? 'balanced', power: design.power, instrument: design.instrument, launcher: design.launcher,
    decision: state.choice ?? 'none', recordedAt: new Date().toISOString() };
}
