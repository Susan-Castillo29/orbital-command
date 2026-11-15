import { missions } from '../data/missions.ts';
import { clearFailedAttempts } from './missionAttempts.ts';
import { resetPlayerProgress } from './playerProgress.ts';
import { resetReportsForNewCampaign } from './science.ts';
import { removeStorage } from './storage.ts';

const missionState = ['progress', 'resources', 'survey', 'lab', 'sensors', 'buffers', 'events', 'eonet-scan', 'photos', 'tutorial', 'transit-v1'];
const oneCampaignState = [
  'orbital-command-mission',
  'orbital-command-ship',
  'orbital-command-eonet-target-v1',
  'orbital-command-first-look-v1',
  'orbital-command-satellite-earth',
  'orbital-command-visual-guide-v1',
  'orbital-command-operations-guide-v1',
];

/** Reset current campaign state while preserving the separate permanent medal archive. */
export function resetCampaignProgress(): ReturnType<typeof resetPlayerProgress> {
  for (const mission of missions) {
    for (const state of missionState) removeStorage(`orbital-command-${state}-${mission.id}`);
  }
  for (const key of oneCampaignState) removeStorage(key);
  clearFailedAttempts();
  resetReportsForNewCampaign();
  return resetPlayerProgress();
}
