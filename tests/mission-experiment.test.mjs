import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runMissionExperiment } from '../src/systems/missionExperiment.ts';
import { defaultDesign, initialDesign } from '../src/systems/engineering.ts';
const earth = { id: 'earth', budget: 300 };
test('isolated experiments expose trade-offs and cannot award arrival for invalid launch design', () => {
  const good = runMissionExperiment(earth, initialDesign, 0, 'fuel');
  assert.equal(good.launchErrors.length, 0);
  assert.equal(good.final.elapsedDays, good.final.durationDays);
  assert.equal(good.decisionScore, 10);
  const heavy = runMissionExperiment(earth, { ...initialDesign, ship: 'atlas', instrument: 'advanced', power: 'nuclear' }, 0, 'fuel');
  assert.ok(heavy.launchErrors.length > 0);
  assert.ok(heavy.score <= 60);
  assert.ok(heavy.science > good.science);
});
test('challenging long-distance flight reveals a simulated power failure', () => {
  const neptune = { id: 'neptune', budget: 1100 };
  const design = { ...defaultDesign('neptune', 'pioneer'), difficulty: 'challenging' };
  const result = runMissionExperiment(neptune, design, 0, 'fuel');
  assert.equal(result.failure, 'energy');
  assert.ok(result.final.elapsedDays < result.final.durationDays);
  const nuclear = runMissionExperiment(neptune, { ...design, power: 'nuclear', launcher: 'medium' }, 0, 'fuel');
  assert.equal(nuclear.failure, null);
});
