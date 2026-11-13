import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addBufferedData, emptyDataBuffers, totalBuffered, transmitBufferedData } from '../src/systems/dataBuffers.ts';

test('la prioridad elegida libera solo sus datos y respeta la capacidad del enlace', () => {
  let data = addBufferedData(emptyDataBuffers(), 'observations', 40);
  data = addBufferedData(data, 'sensors', 30);
  data = transmitBufferedData(data, 'sensors', 12);
  assert.equal(data.observations, 40);
  assert.equal(data.sensors, 18);
  assert.equal(totalBuffered(data), 58);
});
test('los búferes no superan el almacenamiento ni admiten valores inválidos', () => {
  const full = addBufferedData(addBufferedData(emptyDataBuffers(), 'telemetry', 90), 'observations', 50);
  assert.equal(totalBuffered(full), 100);
  assert.deepEqual(transmitBufferedData(full, 'telemetry', -1), full);
  assert.deepEqual(addBufferedData(full, 'sensors', NaN), full);
});
