import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missions } from '../src/data/missions.ts';
import { initialDesign } from '../src/systems/engineering.ts';
import { completeCampaignIfEligible, beginNewCampaign, campaignCompletionRequirements, loadCampaignArchive, campaignMessage, GALACTIC_EXPLORER_MEDAL } from '../src/systems/campaignLegacy.ts';
import { resetCampaignProgress } from '../src/systems/campaignReset.ts';
import { createScienceReport, loadReports, saveReport } from '../src/systems/science.ts';
import { loadPlayerProgress } from '../src/systems/playerProgress.ts';

function useStore() {
  const store = new Map();
  globalThis.window = { localStorage: {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
    removeItem: (key) => store.delete(key),
  } };
  beginNewCampaign(Date.parse('2026-11-14T12:00:00.000Z'));
  return store;
}

function campaignReports({ missing = null, moonSamples = 3, omitTransmission = null } = {}) {
  return missions.filter((mission) => mission.id !== missing).map((mission) => {
    const regions = ['Sector A', 'Sector B', 'Sector C'];
    const samples = mission.id === 'moon' ? Array.from({ length: moonSamples }, (_, index) => `Moon sample ${index + 1}`) : [];
    const report = createScienceReport(mission, initialDesign, { fuel: 80, energy: 70, integrity: 95, storage: 0, communications: 80, elapsedMinutes: 1440 }, regions, samples);
    if (mission.id === omitTransmission) report.completedObjectives = ['3 regiones registradas'];
    return report;
  });
}

const allCompleted = { completedMissions: missions.map((mission) => mission.id) };

test('campaign stays incomplete while a mission or its transmitted report is missing', () => {
  useStore();
  assert.equal(campaignCompletionRequirements({ completedMissions: ['earth'] }, campaignReports()), false);
  assert.equal(campaignCompletionRequirements(allCompleted, campaignReports({ missing: 'sun' })), false);
  assert.equal(campaignCompletionRequirements(allCompleted, campaignReports({ omitTransmission: 'neptune' })), false);
});

test('Moon completion requires all three analyzed samples in its report', () => {
  useStore();
  assert.equal(campaignCompletionRequirements(allCompleted, campaignReports({ moonSamples: 2 })), false);
  assert.equal(campaignCompletionRequirements(allCompleted, campaignReports()), true);
});

test('completion records real campaign totals and grants one persistent medal', () => {
  const store = useStore();
  const reports = campaignReports();
  for (const report of reports) saveReport(report);
  const result = completeCampaignIfEligible(allCompleted, loadReports(), 'Comandante Ada', Date.parse('2026-11-15T12:00:00.000Z'));
  assert.ok(result);
  assert.equal(result.record.commander, 'Comandante Ada');
  assert.equal(result.record.missionCount, missions.length);
  assert.deepEqual(result.record.destinations, reports.map((report) => report.destination));
  assert.equal(result.record.sampleCount, 3);
  assert.equal(result.record.simulatedDays, missions.length);
  assert.equal(result.newlyCompleted, true);
  assert.equal(result.persisted, true);
  assert.equal(JSON.parse(store.get('orbital-command-campaign-archive-v1')).medals.length, 1);
  assert.equal(JSON.parse(store.get('orbital-command-campaign-archive-v1')).medals[0].id, GALACTIC_EXPLORER_MEDAL);
  assert.equal(completeCampaignIfEligible(allCompleted, reports), null);
  assert.equal(loadCampaignArchive().campaigns.length, 1);
});

test('a replay records another campaign without duplicating the permanent medal', () => {
  useStore();
  const reports = campaignReports();
  completeCampaignIfEligible(allCompleted, reports, 'Comandante', Date.parse('2026-11-15T12:00:00.000Z'));
  beginNewCampaign(Date.parse('2026-11-16T12:00:00.000Z'));
  const result = completeCampaignIfEligible(allCompleted, reports, 'Comandante', Date.parse('2026-11-17T12:00:00.000Z'));
  assert.ok(result);
  assert.equal(result.newlyCompleted, true);
  assert.equal(result.archive.campaigns.length, 2);
  assert.equal(result.archive.medals.length, 1);
});

test('new campaign reset clears mission progress and reports but preserves medals and campaign history', () => {
  const store = useStore();
  const reports = campaignReports();
  completeCampaignIfEligible(allCompleted, reports, 'Comandante', Date.parse('2026-11-15T12:00:00.000Z'));
  store.set('orbital-command-progress-moon', JSON.stringify({ arrived: true, transmitted: true }));
  store.set('orbital-command-resources-earth', JSON.stringify({ fuel: 4 }));
  store.set('orbital-command-survey-sun', JSON.stringify({ transmitted: true }));
  store.set('orbital-command-transit-v1-mars', JSON.stringify({ state: 'in progress' }));
  store.set('orbital-command-tutorial-moon', 'done');
  store.set('orbital-command-design-v1-moon', '{\"old\":true}');
  store.set('orbital-command-player', JSON.stringify({ credits: 50, xp: 500, completedMissions: missions.map((mission) => mission.id) }));
  resetCampaignProgress();
  assert.deepEqual(loadPlayerProgress(), { credits: 600, xp: 0, completedMissions: [] });
  assert.deepEqual(loadReports(), []);
  assert.equal(store.has('orbital-command-progress-moon'), false);
  assert.equal(store.has('orbital-command-resources-earth'), false);
  assert.equal(store.has('orbital-command-survey-sun'), false);
  assert.equal(store.has('orbital-command-transit-v1-mars'), false);
  assert.equal(store.has('orbital-command-tutorial-moon'), false);
  assert.equal(store.has('orbital-command-design-v1-moon'), false);
  assert.equal(loadCampaignArchive().medals.length, 1);
  assert.equal(loadCampaignArchive().campaigns.length, 1);
});

test('the commander congratulates the player in the selected language', () => {
  assert.match(campaignMessage('en'), /Commander, mission accomplished/);
  assert.match(campaignMessage('es'), /Comandante, misión cumplida/);
});
