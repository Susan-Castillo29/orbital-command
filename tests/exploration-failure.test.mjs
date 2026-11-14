import assert from 'node:assert/strict';
import { test } from 'node:test';
import { explorationFailureReason } from '../src/systems/explorationFailure.ts';
test('exploration failure distinguishes irreversible losses from recoverable surface energy', () => {
 assert.equal(explorationFailureReason({integrity:0,energy:50},'surface',true,false),'integrity');
 assert.equal(explorationFailureReason({integrity:20,energy:1},'orbit',false,false),'energy');
 assert.equal(explorationFailureReason({integrity:20,energy:1},'surface',true,false),null);
 assert.equal(explorationFailureReason({integrity:20,energy:1},'orbit',true,false),null);
 assert.equal(explorationFailureReason({integrity:0,energy:0},'orbit',false,true),null);
});
