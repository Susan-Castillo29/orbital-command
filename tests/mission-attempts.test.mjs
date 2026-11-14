import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeFailedAttempt, loadFailedAttempts, saveFailedAttempt } from '../src/systems/missionAttempts.ts';
import { initialDesign } from '../src/systems/engineering.ts';
const mission = { id:'earth', name:'HOME', destination:'Earth' };
const state = { elapsedDays:1, durationDays:2, energy:0, fuel:20, integrity:80, data:0, distanceKm:400, decision:'resolved', choice:'fuel' };
test('failed attempts preserve the cause and resources once and reject invalid entries', () => {
 const store = new Map(); globalThis.window = { localStorage: { getItem:key=>store.get(key)??null, setItem:(key,value)=>store.set(key,value) } };
 const attempt = makeFailedAttempt('test-1', mission, initialDesign, state, 'energy');
 assert.equal(saveFailedAttempt(attempt), true); assert.equal(saveFailedAttempt(attempt), true);
 const loaded = loadFailedAttempts(); assert.equal(loaded.length,1); assert.equal(loaded[0].reason,'energy'); assert.equal(loaded[0].fuel,20);
 assert.equal(saveFailedAttempt({ ...attempt, id:'bad', fuel:-10 }), false);
 store.set('orbital-command-failed-attempts-v1','bad json'); assert.deepEqual(loadFailedAttempts(),[]);
});
