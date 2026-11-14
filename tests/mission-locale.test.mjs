import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missions } from '../src/data/missions.ts';
import { localiseMission } from '../src/data/missionLocale.ts';
test('every campaign destination has English display text without changing mission data', () => {
  for (const mission of missions) {
    const en = localiseMission(mission, 'en');
    const es = localiseMission(mission, 'es');
    assert.ok(en.objective && en.description && en.destination && en.duration, mission.id);
    assert.notEqual(en.objective, mission.objective, mission.id);
    assert.equal(es.objective, mission.objective, mission.id);
    assert.equal(es, mission);
  }
});
