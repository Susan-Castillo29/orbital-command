import { readStorage, writeStorage } from './storage.ts';
export const EVIDENCE_KEY = 'orbital-command-learning-evidence-v1';
export type Answers = [number, number, number];
export type Assessment = { answers: Answers; missionsAtAssessment: number; transmissionsAtAssessment: number; recordedAt: string };
export type LearningEvidence = { version: 1; before: Assessment; after: Assessment | null };
const correct = [1, 2, 1] as const;
export function isAnswers(value: unknown): value is Answers { return Array.isArray(value) && value.length === 3 && value.every(answer => Number.isInteger(answer) && answer >= 0 && answer <= 2); }
export function scoreAnswers(answers: Answers): number { return answers.reduce((total, answer, index) => total + (answer === correct[index] ? 1 : 0), 0); }
function isAssessment(value: unknown): value is Assessment {
 if (!value || typeof value !== 'object') return false;
 const item=value as Record<string, unknown>;
 return isAnswers(item.answers) && Number.isInteger(item.missionsAtAssessment) && typeof item.missionsAtAssessment === 'number' && item.missionsAtAssessment >= 0 && item.missionsAtAssessment <= 13 && Number.isSafeInteger(item.transmissionsAtAssessment) && typeof item.transmissionsAtAssessment === 'number' && item.transmissionsAtAssessment >= 0 && item.transmissionsAtAssessment <= 1000000 && typeof item.recordedAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.recordedAt) && Number.isFinite(Date.parse(item.recordedAt));
}
export function readEvidence(): LearningEvidence | null {
 try { const value: unknown=JSON.parse(readStorage(EVIDENCE_KEY) ?? 'null'); if (!value || typeof value !== 'object') return null; const item=value as Record<string, unknown>; if(item.version!==1 || !isAssessment(item.before) || !(item.after===null || isAssessment(item.after)) || item.after && (item.after as Assessment).transmissionsAtAssessment <= item.before.transmissionsAtAssessment) return null; return {version:1,before:item.before,after:item.after as Assessment | null}; } catch { return null; }
}
export function saveEvidence(value: LearningEvidence): boolean { return writeStorage(EVIDENCE_KEY,JSON.stringify(value)); }
export function clearEvidence(): boolean { try { window.localStorage.removeItem(EVIDENCE_KEY); return window.localStorage.getItem(EVIDENCE_KEY) === null; } catch { return false; } }
export function evidenceExport(value: LearningEvidence) {
 return { version: 1, before: { score: scoreAnswers(value.before.answers), outOf:3, missions: value.before.missionsAtAssessment, date:value.before.recordedAt }, after: value.after ? { score:scoreAnswers(value.after.answers),outOf:3,missions:value.after.missionsAtAssessment,date:value.after.recordedAt } : null, limitations:'Volunteer, self-reported and editable local data. Not independently verified; scores do not establish learning or population impact.' };
}
