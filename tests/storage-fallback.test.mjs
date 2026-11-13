import assert from 'node:assert/strict';
import { test } from 'node:test';
import { awardMission, loadPlayerProgress } from '../src/systems/playerProgress.ts';

test('las recompensas no se duplican cuando el almacenamiento está bloqueado', () => {
  globalThis.window = { localStorage: { getItem: () => null, setItem: () => { throw new Error('blocked'); } } };
  const first = awardMission('earth', 100, 25);
  const second = awardMission('earth', 100, 25);
  assert.equal(first.awarded, true);
  assert.equal(second.awarded, false);
  assert.equal(loadPlayerProgress().xp, 100);
});
