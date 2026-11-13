import type { Mission } from '../data/missions';
import type { MissionDesign } from './engineering';
import { createTransit, type TransitState } from './transit.ts';
import { readStorage, removeStorage, writeStorage } from './storage.ts';

type SavedTransit = { design: MissionDesign; launchDay: number; state: TransitState };
const keyFor = (missionId: string) => `orbital-command-transit-v1-${missionId}`;

export function loadTransit(mission: Mission, design: MissionDesign): SavedTransit | null {
  try {
    const value = JSON.parse(readStorage(keyFor(mission.id)) ?? 'null') as SavedTransit | null;
    if (!value || !value.design || !value.state || !Number.isInteger(value.launchDay) || value.launchDay < 0 || value.launchDay > 99999) return null;
    for (const key of ['ship', 'instrument', 'power', 'radio', 'launcher', 'thermal'] as const) if (value.design[key] !== design[key]) return null;
    const expected = createTransit(mission, design, value.launchDay);
    const state = value.state;
    if (state.durationDays !== expected.durationDays || state.distanceKm !== expected.distanceKm) return null;
    if (![state.elapsedDays, state.fuel, state.energy, state.integrity, state.data].every((number) => typeof number === 'number' && Number.isFinite(number) && number >= 0)) return null;
    if (state.elapsedDays > state.durationDays || [state.fuel, state.energy, state.integrity, state.data].some((number) => number > 100)) return null;
    if (!['pending', 'required', 'resolved'].includes(state.decision) || ![null, 'fuel', 'energy'].includes(state.choice)) return null;
    if (state.decision === 'pending' && (state.elapsedDays >= state.durationDays / 2 || state.choice !== null)) return null;
    if (state.decision === 'required' && (state.elapsedDays !== state.durationDays / 2 || state.choice !== null)) return null;
    if (state.decision === 'resolved' && (state.elapsedDays < state.durationDays / 2 || state.choice === null)) return null;
    return value;
  } catch { return null; }
}
export function saveTransit(missionId: string, design: MissionDesign, launchDay: number, state: TransitState): boolean {
  return writeStorage(keyFor(missionId), JSON.stringify({ design, launchDay, state }));
}
export function clearTransit(missionId: string) { removeStorage(keyFor(missionId)); }
