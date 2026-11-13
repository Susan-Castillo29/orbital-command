import { evaluateDesign, instruments, launchers, powerSystems, type MissionDesign } from './engineering.ts';
import type { Mission } from '../data/missions';

export type TransitProfile = { days: number; distanceKm: number; synodicDays: number; source: string };
// Referencias de misiones históricas o aproximaciones educativas; no son efemérides.
export const transitProfiles: Record<string, TransitProfile> = {
  earth: { days: 0.2, distanceKm: 400, synodicDays: 0, source: 'https://science.nasa.gov/earth/earth-observatory/' },
  moon: { days: 3, distanceKm: 384400, synodicDays: 0, source: 'https://science.nasa.gov/resource/journey-to-the-moon/' },
  mercury: { days: 2400, distanceKm: 7900000000, synodicDays: 116, source: 'https://science.nasa.gov/mission/messenger/' },
  venus: { days: 110, distanceKm: 290000000, synodicDays: 584, source: 'https://science.nasa.gov/mission/mariner-2/' },
  mars: { days: 205, distanceKm: 470000000, synodicDays: 780, source: 'https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/' },
  asteroid: { days: 2190, distanceKm: 3600000000, synodicDays: 800, source: 'https://science.nasa.gov/mission/psyche/' },
  jupiter: { days: 2240, distanceKm: 3860000000, synodicDays: 399, source: 'https://science.nasa.gov/mission/galileo/' },
  europa: { days: 2240, distanceKm: 3860000000, synodicDays: 399, source: 'https://science.nasa.gov/mission/galileo/' },
  saturn: { days: 2450, distanceKm: 3400000000, synodicDays: 378, source: 'https://science.nasa.gov/mission/cassini/the-journey/timeline/' },
  titan: { days: 2450, distanceKm: 3400000000, synodicDays: 378, source: 'https://science.nasa.gov/mission/cassini/the-journey/timeline/' },
  uranus: { days: 3100, distanceKm: 4500000000, synodicDays: 370, source: 'https://science.nasa.gov/mission/voyager/' },
  neptune: { days: 4380, distanceKm: 7100000000, synodicDays: 367, source: 'https://science.nasa.gov/mission/voyager/' },
  sun: { days: 150, distanceKm: 230000000, synodicDays: 365, source: 'https://science.nasa.gov/mission/parker-solar-probe/' },
};

export type TransitState = { elapsedDays: number; durationDays: number; distanceKm: number; fuel: number; energy: number; integrity: number; data: number; decision: 'pending' | 'required' | 'resolved'; choice: 'fuel' | 'energy' | null };

export function createTransit(mission: Mission, design: MissionDesign, launchDay: number): TransitState {
  const profile = transitProfiles[mission.id] ?? transitProfiles.mars;
  const phase = profile.synodicDays ? ((launchDay % profile.synodicDays) + profile.synodicDays) % profile.synodicDays / profile.synodicDays : 0;
  // Factor didáctico: no representa posiciones reales ni una ventana calculada con efemérides.
  const efficiency = 1 + Math.min(phase, 1 - phase) * 0.4;
  const designCost = evaluateDesign(design, mission);
  const loadFactor = designCost.mass / launchers[design.launcher].capacity;
  const durationFactor = 1 + Math.max(0, loadFactor - 0.5) * 0.12;
  return { elapsedDays: 0, durationDays: profile.days * efficiency * durationFactor, distanceKm: profile.distanceKm * efficiency, fuel: Math.max(0, designCost.fuel - (efficiency - 1) * 20 - loadFactor * 8), energy: 100, integrity: 100, data: 0, decision: 'pending', choice: null };
}

export function advanceTransit(state: TransitState, days: number, design: MissionDesign): TransitState {
  if (!Number.isFinite(days) || days <= 0 || state.decision === 'required' || state.elapsedDays >= state.durationDays) return state;
  const stopAt = state.decision === 'pending' ? state.durationDays / 2 : state.durationDays;
  const elapsedDays = Math.min(stopAt, state.elapsedDays + days);
  const delta = elapsedDays - state.elapsedDays;
  const energyRate = 0.0015 + instruments[design.instrument].power / powerSystems[design.power].power * 0.002;
  const dataRate = instruments[design.instrument].data / 8 * 0.001;
  return { ...state, elapsedDays, energy: Math.max(0, state.energy - delta * energyRate), fuel: Math.max(0, state.fuel - delta * 0.0008), data: Math.min(100, state.data + delta * dataRate), decision: state.decision === 'pending' && elapsedDays >= stopAt ? 'required' : state.decision };
}

export function resolveTransitDecision(state: TransitState, choice: 'fuel' | 'energy'): TransitState | null {
  if (state.decision !== 'required') return null;
  if (choice === 'fuel' && state.fuel >= 3) return { ...state, fuel: state.fuel - 3, decision: 'resolved', choice };
  if (choice === 'energy' && state.energy >= 6) return { ...state, energy: state.energy - 6, decision: 'resolved', choice };
  return null;
}
