import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modelFor, hasAtmosphereModel } from '../src/data/planetaryLab.ts';
import { getLandingZones, loadLunarProgress } from '../src/systems/lunarCampaign.ts';
import { createScienceReport, loadReports, saveReport } from '../src/systems/science.ts';
import { initialDesign } from '../src/systems/engineering.ts';

test('zonas guardadas de otros cuerpos no habilitan aterrizaje', () => {
  const bad = { arrived: true, orbit: true, landingZone: 'shackleton', landed: true, roverDeployed: true };
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(bad) } };
  assert.equal(getLandingZones('mars')[0].id, 'delta');
  assert.equal(loadLunarProgress('mars').landed, false);
});
test('sondas y capas respetan el tipo de destino', () => {
  assert.equal(hasAtmosphereModel('venus'), true);
  assert.equal(hasAtmosphereModel('moon'), false);
  assert.ok(modelFor('sun', 'interior').some((layer) => layer.name === 'Corona'));
  assert.match(modelFor('europa', 'interior')[1].description, /no confirma vida/);
});
test('el historial rechaza enlaces manipulados y conserva informes válidos', () => {
  const store = new Map();
  globalThis.window = { localStorage: { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) } };
  const report = createScienceReport({ id: 'earth', name: 'HOME', destination: 'Tierra', objective: 'Observar' }, initialDesign, { fuel: 70, energy: 80, integrity: 90, storage: 0, communications: 80, elapsedMinutes: 0 }, ['Nubes'], []);
  assert.equal(saveReport(report), true);
  assert.equal(loadReports().length, 1);
  report.source = 'javascript:alert(1)';
  store.set('orbital-command-reports-v1', JSON.stringify([report]));
  assert.equal(loadReports().length, 0);
});
