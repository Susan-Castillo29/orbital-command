import { missions } from '../data/missions.ts';
import type { PlayerProgress } from './playerProgress.ts';
import type { ScienceReport } from './science.ts';
import { readStorage, writeStorage } from './storage.ts';

export const CAMPAIGN_ARCHIVE_KEY = 'orbital-command-campaign-archive-v1';
export const ACTIVE_CAMPAIGN_KEY = 'orbital-command-active-campaign-v1';
export const GALACTIC_EXPLORER_MEDAL = 'galactic-explorer';
export const campaignCommanderMessage = 'Comandante, misión cumplida. Has recorrido nuestro sistema solar, superado desafíos científicos y demostrado que la perseverancia y el conocimiento pueden llevarnos más lejos de lo que imaginamos.\n\nEn nombre de todo el equipo de ORBITAL COMMAND, te otorgamos la Medalla de Explorador Galáctico.\n\nHas demostrado que explorar no consiste solamente en descubrir nuevos mundos, sino también en comprender y proteger el nuestro.\n\n¡Felicidades, comandante!';

export type CampaignRecord = {
  id: string;
  commander: string;
  startedAt: string;
  completedAt: string;
  playtimeMs: number;
  simulatedDays: number;
  missionCount: number;
  destinations: string[];
  sampleCount: number;
  fuelUsedPercent: number;
  energyUsedPercent: number;
};

export type CampaignMedal = { id: typeof GALACTIC_EXPLORER_MEDAL; earnedAt: string };
export type CampaignArchive = { version: 1; medals: CampaignMedal[]; campaigns: CampaignRecord[] };
export type ActiveCampaign = { id: string; startedAt: string; playtimeMs: number; completed: boolean };
export type CampaignCompletion = { record: CampaignRecord; archive: CampaignArchive; newlyCompleted: boolean; persisted: boolean };

const emptyArchive: CampaignArchive = { version: 1, medals: [], campaigns: [] };
let volatileArchive: CampaignArchive | null = null;
let volatileActive: ActiveCampaign | null = null;

function validRecord(value: unknown): value is CampaignRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && item.id.length <= 100
    && typeof item.commander === 'string' && item.commander.length <= 48
    && typeof item.startedAt === 'string' && Number.isFinite(Date.parse(item.startedAt))
    && typeof item.completedAt === 'string' && Number.isFinite(Date.parse(item.completedAt))
    && ['playtimeMs', 'simulatedDays', 'missionCount', 'sampleCount', 'fuelUsedPercent', 'energyUsedPercent'].every((key) => typeof item[key] === 'number' && Number.isFinite(item[key]) && (item[key] as number) >= 0)
    && Array.isArray(item.destinations) && item.destinations.every((name) => typeof name === 'string' && name.length <= 100);
}

function validActive(value: unknown): value is ActiveCampaign {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && item.id.length <= 100
    && typeof item.startedAt === 'string' && Number.isFinite(Date.parse(item.startedAt))
    && typeof item.playtimeMs === 'number' && Number.isFinite(item.playtimeMs) && item.playtimeMs >= 0
    && typeof item.completed === 'boolean';
}

function saveArchive(archive: CampaignArchive): boolean {
  const saved = writeStorage(CAMPAIGN_ARCHIVE_KEY, JSON.stringify(archive));
  volatileArchive = saved ? null : archive;
  return saved;
}

function saveActive(active: ActiveCampaign): boolean {
  const saved = writeStorage(ACTIVE_CAMPAIGN_KEY, JSON.stringify(active));
  volatileActive = saved ? null : active;
  return saved;
}

export function loadCampaignArchive(): CampaignArchive {
  if (volatileArchive) return volatileArchive;
  try {
    const value: unknown = JSON.parse(readStorage(CAMPAIGN_ARCHIVE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return emptyArchive;
    const item = value as Record<string, unknown>;
    const medals = Array.isArray(item.medals)
      ? item.medals.filter((medal): medal is CampaignMedal => Boolean(medal && typeof medal === 'object' && (medal as CampaignMedal).id === GALACTIC_EXPLORER_MEDAL && Number.isFinite(Date.parse((medal as CampaignMedal).earnedAt))))
      : [];
    const campaigns = Array.isArray(item.campaigns) ? item.campaigns.filter(validRecord) : [];
    return { version: 1, medals: medals.slice(0, 100), campaigns: campaigns.slice(-100) };
  } catch { return emptyArchive; }
}

export function getOrStartActiveCampaign(now = Date.now()): ActiveCampaign {
  if (volatileActive) return volatileActive;
  try {
    const value: unknown = JSON.parse(readStorage(ACTIVE_CAMPAIGN_KEY) ?? 'null');
    if (validActive(value)) return value;
  } catch { /* Start a clean active campaign below. */ }
  const startedAt = new Date(now).toISOString();
  const active = { id: createId(), startedAt, playtimeMs: 0, completed: false };
  saveActive(active);
  return active;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `campaign-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export function addCampaignPlaytime(milliseconds: number): void {
  const active = getOrStartActiveCampaign();
  if (active.completed || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
  saveActive({ ...active, playtimeMs: Math.min(Number.MAX_SAFE_INTEGER, active.playtimeMs + Math.min(milliseconds, 60_000)) });
}

export function campaignCompletionRequirements(progress: Pick<PlayerProgress, 'completedMissions'>, reports: ScienceReport[]): boolean {
  const completed = new Set(progress.completedMissions);
  const byMission = new Map(reports.map((report) => [report.missionId, report]));
  return missions.every((mission) => {
    if (!completed.has(mission.id)) return false;
    const report = byMission.get(mission.id);
    if (!report || !Array.isArray(report.observations) || report.observations.length < 3 || !Array.isArray(report.samples)
      || !report.completedObjectives?.some((objective) => objective.includes('Resultados transmitidos'))
      || !Number.isFinite(report.transmittedUnits) || report.transmittedUnits < 0) return false;
    if (mission.id === 'moon') return report.samples.length >= 3
      && report.completedObjectives?.some((objective) => objective.includes('muestras simuladas analizadas')) === true;
    return true;
  });
}

function makeCampaignRecord(active: ActiveCampaign, reports: ScienceReport[], commander: string, now: number): CampaignRecord {
  const finalReports = new Map(reports.map((report) => [report.missionId, report]));
  const campaignReports = missions.map((mission) => finalReports.get(mission.id)!);
  return {
    id: active.id,
    commander: commander.trim().slice(0, 48) || 'Comandante',
    startedAt: active.startedAt,
    completedAt: new Date(now).toISOString(),
    playtimeMs: active.playtimeMs,
    simulatedDays: campaignReports.reduce((total, report) => total + report.elapsedDays, 0),
    missionCount: campaignReports.length,
    destinations: campaignReports.map((report) => report.destination),
    sampleCount: campaignReports.reduce((total, report) => total + report.samples.length, 0),
    fuelUsedPercent: campaignReports.reduce((total, report) => total + (report.netFuelUsed ?? 0), 0),
    energyUsedPercent: campaignReports.reduce((total, report) => total + (report.netEnergyUsed ?? 0), 0),
  };
}

export function completeCampaignIfEligible(progress: Pick<PlayerProgress, 'completedMissions'>, reports: ScienceReport[], commander = 'Comandante', now = Date.now()): CampaignCompletion | null {
  const active = getOrStartActiveCampaign(now);
  if (active.completed || !campaignCompletionRequirements(progress, reports)) return null;

  const existingArchive = loadCampaignArchive();
  const existing = existingArchive.campaigns.find((record) => record.id === active.id);
  const record = existing ?? makeCampaignRecord(active, reports, commander, now);
  const alreadyHasMedal = existingArchive.medals.some((medal) => medal.id === GALACTIC_EXPLORER_MEDAL);
  const nextArchive: CampaignArchive = {
    version: 1,
    medals: alreadyHasMedal ? existingArchive.medals : [...existingArchive.medals, { id: GALACTIC_EXPLORER_MEDAL, earnedAt: record.completedAt }],
    campaigns: existing ? existingArchive.campaigns : [...existingArchive.campaigns, record].slice(-100),
  };
  const archiveSaved = saveArchive(nextArchive);
  const activeSaved = saveActive({ ...active, completed: true });
  return { record, archive: nextArchive, newlyCompleted: !existing, persisted: archiveSaved && activeSaved };
}

export function updateCampaignCommander(campaignId: string, commander: string): { archive: CampaignArchive; persisted: boolean } {
  const archive = loadCampaignArchive();
  const name = commander.slice(0, 48);
  const campaigns = archive.campaigns.map((record) => record.id === campaignId ? { ...record, commander: name } : record);
  const next = { ...archive, campaigns };
  return { archive: next, persisted: saveArchive(next) };
}

export function beginNewCampaign(now = Date.now()): ActiveCampaign {
  const active = { id: createId(), startedAt: new Date(now).toISOString(), playtimeMs: 0, completed: false };
  saveActive(active);
  return active;
}
