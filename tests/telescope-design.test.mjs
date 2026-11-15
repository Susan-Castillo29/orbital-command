import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedBands, allowedInstruments, evaluateTelescopeDesign, initialTelescopeDesign, normalizeTelescopeDesign, validTelescopeDesign } from '../src/systems/telescopeDesign.ts';

test('objective filters keep compatible wavelength and instrument choices', () => {
  const design = normalizeTelescopeDesign({ ...initialTelescopeDesign, objectiveIds:['black-holes'], bands:['gamma'], instrumentIds:['gammaDetector'] });
  assert.deepEqual(allowedBands(design).map((item) => item.id), ['infrared','xray','gamma']);
  assert.ok(allowedInstruments(design).some((item) => item.id === 'gammaDetector'));
  assert.equal(evaluateTelescopeDesign(design).errors.length, 0);
});

test('gamma design does not add a focusing mirror and requires a gamma detector', () => {
  const valid = evaluateTelescopeDesign({ ...initialTelescopeDesign, objectiveIds:['black-holes'], bands:['gamma'], instrumentIds:['gammaDetector'] });
  assert.equal(valid.massKg, 955);
  assert.ok(!valid.errors.length);
  const invalid = evaluateTelescopeDesign({ ...initialTelescopeDesign, objectiveIds:['black-holes'], bands:['gamma'], instrumentIds:['imager'] });
  assert.ok(invalid.errors.some((error) => error.includes('detector de eventos')));
  assert.equal(invalid.design.instrumentIds.length, 0);
});

test('X-ray design uses nested grazing mirrors and compatible sensing', () => {
  const design = { ...initialTelescopeDesign, objectiveIds:['energetic'], bands:['xray'], instrumentIds:['xrayDetector'], xrayPairs:4 };
  const result = evaluateTelescopeDesign(design);
  assert.equal(result.massKg, 1040);
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some((warning) => warning.includes('rasantes')));
});

test('mass, power and budget limits block launch on the advanced profile', () => {
  const design = normalizeTelescopeDesign({
    ...initialTelescopeDesign,
    level:'engineer',
    objectiveIds:['galaxies','star-formation','exoplanets','atmospheres','black-holes'],
    bands:['visible','ultraviolet','infrared','xray','gamma'],
    instrumentIds:['uvDetector','infraredDetector','xrayDetector','gammaDetector','spectrograph'],
    apertureId:'6.5', secondaryId:'off-axis', xrayPairs:4, gammaMode:'pair', stabilization:'fine', power:'solar', thermal:'cryogenic', recorder:'extended',
  });
  const result = evaluateTelescopeDesign(design);
  assert.ok(result.errors.some((error) => error.includes('supera')));
  assert.ok(result.cost > result.budget);
  assert.ok(result.powerW > result.powerCapacityW);
});

test('multiple telescope solutions can support the same galaxy research goal', () => {
  const compact = evaluateTelescopeDesign(initialTelescopeDesign);
  const infrared = evaluateTelescopeDesign({
    ...initialTelescopeDesign,
    level:'investigator', bands:['visible','infrared'], instrumentIds:['imager','spectrograph','infraredDetector'], thermal:'cryogenic', apertureId:'2.4', stabilization:'fine', recorder:'extended',
  });
  assert.equal(compact.errors.length, 0);
  assert.equal(infrared.errors.length, 0);
  assert.ok(infrared.massKg > compact.massKg);
  assert.ok(infrared.cost > compact.cost);
  assert.notEqual(compact.dataGeneratedGb, infrared.dataGeneratedGb);
});

test('saved design validation rejects malformed records and normalization repairs stale choices', () => {
  assert.equal(validTelescopeDesign(initialTelescopeDesign), true);
  assert.equal(validTelescopeDesign({ ...initialTelescopeDesign, power:'antimatter' }), false);
  const repaired = normalizeTelescopeDesign({ ...initialTelescopeDesign, objectiveIds:['galaxies'], bands:['gamma'], instrumentIds:['gammaDetector'] });
  assert.ok(repaired.bands.every((band) => ['visible','infrared'].includes(band)));
  assert.equal(repaired.instrumentIds.length, 0);
});
