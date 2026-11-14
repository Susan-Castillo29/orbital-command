import { evaluateDesign, type MissionDesign } from './engineering.ts';
import { advanceTransit, createTransit, resolveTransitDecision, transitFailure, type TransitState } from './transit.ts';
import type { Mission } from '../data/missions';

export type ExperimentResult = {
  initial: TransitState; final: TransitState; failure: ReturnType<typeof transitFailure>;
  launchErrors: string[]; warnings: string[]; score: number; science: number; resourceScore: number; decisionScore: number;
};

/** Isolated, repeatable what-if calculation. It never changes campaign progress or generates real observations. */
export function runMissionExperiment(mission: Mission, design: MissionDesign, launchDay: number, preferred: 'fuel' | 'energy'): ExperimentResult {
  const assessment = evaluateDesign(design, mission);
  const initial = createTransit(mission, design, launchDay);
  let final = advanceTransit(initial, initial.durationDays, design);
  let decisionScore = 0;
  if (!transitFailure(final) && final.decision === 'required') {
    const resolved = resolveTransitDecision(final, preferred);
    if (resolved) { final = resolved; decisionScore = 10; }
  }
  if (!transitFailure(final) && final.decision === 'resolved') final = advanceTransit(final, initial.durationDays, design);
  const failure = transitFailure(final);
  const reached = !failure && final.elapsedDays >= final.durationDays;
  const science = Math.round(assessment.science * 0.3);
  const resourceScore = Math.round(Math.max(0, Math.min(100, (final.energy + final.fuel + final.integrity) / 3)) * 0.2);
  const missionScore = reached ? 40 : 0;
  // A design that cannot launch can still be explored but cannot receive a mission-success score.
  const score = Math.min(100, (assessment.errors.length ? 0 : missionScore) + science + resourceScore + decisionScore);
  return { initial, final, failure, launchErrors: assessment.errors, warnings: assessment.warnings, score, science, resourceScore, decisionScore };
}
