import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialDesign } from '../src/systems/engineering.ts';
import { advanceTransit, createTransit } from '../src/systems/transit.ts';
import { clearTransit, loadTransit, saveTransit } from '../src/systems/transitStorage.ts';

test('recupera la decisión pendiente y rechaza progreso manipulado o de otra configuración', () => {
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value), removeItem: (key) => store.delete(key) } };
  const mission = { id: 'mars', budget: 680 };
  const decision = advanceTransit(createTransit(mission, initialDesign, 0), 10000, initialDesign);
  assert.equal(saveTransit('mars', initialDesign, 0, decision), true);
  assert.equal(loadTransit(mission, initialDesign).state.decision, 'required');
  assert.equal(loadTransit(mission, { ...initialDesign, launcher: 'heavy' }), null);
  const key = 'orbital-command-transit-v1-mars';
  const altered = JSON.parse(store.get(key)); altered.state.elapsedDays = altered.state.durationDays;
  store.set(key, JSON.stringify(altered));
  assert.equal(loadTransit(mission, initialDesign), null);
  clearTransit('mars');
  assert.equal(loadTransit(mission, initialDesign), null);
});
