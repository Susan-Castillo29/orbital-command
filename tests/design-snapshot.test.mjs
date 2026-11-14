import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialDesign } from '../src/systems/engineering.ts';
import { parseDesignSnapshot } from '../src/systems/designSnapshot.ts';
test('shared designs are bounded, mission-specific and use known components', () => {
  const valid = JSON.stringify({ version: 1, missionId: 'earth', design: { ...initialDesign, orbit: 'relay', difficulty: 'challenging' } });
  assert.equal(parseDesignSnapshot(valid, 'earth').design.orbit, 'relay');
  assert.equal(parseDesignSnapshot(valid, 'mars'), null);
  assert.equal(parseDesignSnapshot('{', 'earth'), null);
  assert.equal(parseDesignSnapshot('x'.repeat(4097), 'earth'), null);
  assert.equal(parseDesignSnapshot(JSON.stringify({ version: 1, missionId: 'earth', design: { ...initialDesign, launcher: '__proto__' } }), 'earth'), null);
});
