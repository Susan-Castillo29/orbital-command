import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultDesign, evaluateDesign, initialDesign } from '../src/systems/engineering.ts';
import { advanceTransit, createTransit, resolveTransitDecision } from '../src/systems/transit.ts';
import { chapterUnlocked } from '../src/systems/campaign.ts';
import { createScienceReport } from '../src/systems/science.ts';
import { estimatedSignalSeconds, compressedTransmissionSeconds } from '../src/systems/communications.ts';
import { isSimulatedDustStorm } from '../src/systems/weather.ts';
import { missions } from '../src/data/missions.ts';

const mission = { id: 'mars', budget: 680 };
test('el espectrómetro avanzado aumenta ciencia, masa, coste y demanda de datos', () => {
  const basic = evaluateDesign(initialDesign, mission);
  const advanced = evaluateDesign({ ...initialDesign, instrument: 'advanced' }, mission);
  assert.ok(advanced.science > basic.science);
  assert.ok(advanced.mass > basic.mass);
  assert.ok(advanced.cost > basic.cost);
  assert.ok(advanced.dataRate > basic.dataRate);
  assert.ok(advanced.powerMargin < basic.powerMargin);
  assert.ok(advanced.errors.some((error) => error.includes('potencia')));
  assert.ok(advanced.warnings.some((warning) => warning.includes('datos')));
});
test('masa y presupuesto bloquean configuraciones incompatibles', () => {
  const assessment = evaluateDesign({ ...initialDesign, ship: 'atlas', instrument: 'advanced', power: 'nuclear' }, { id: 'earth', budget: 300 });
  assert.ok(assessment.errors.some((error) => error.includes('pesa')));
  assert.ok(assessment.errors.some((error) => error.includes('presupuesto')));
  assert.equal(evaluateDesign(initialDesign, { id: 'earth', budget: 300 }).errors.length, 0);
});
test('Mercurio, Venus y el Sol requieren protección térmica', () => {
  for (const id of ['mercury', 'venus', 'sun']) {
    assert.ok(evaluateDesign(initialDesign, { id, budget: 1000 }).errors.some((error) => error.includes('térmica')));
    assert.equal(evaluateDesign(defaultDesign(id, 'pioneer'), { id, budget: 1000 }).errors.length, 0);
  }
});
test('una cámara sola no sustituye sensores atmosféricos', () => {
  assert.ok(evaluateDesign({ ...initialDesign, thermal: 'shielded' }, { id: 'venus', budget: 1000 }).errors.some((error) => error.includes('sensores ambientales')));
  assert.equal(evaluateDesign(defaultDesign('venus', 'pioneer'), { id: 'venus', budget: 720 }).errors.length, 0);
});
test('cada misión tiene al menos una configuración inicial compatible', () => {
  for (const entry of missions) assert.deepEqual(evaluateDesign(defaultDesign(entry.id, 'pioneer'), entry).errors, [], entry.id);
});
test('la aceleración se detiene en la decisión y la resolución consume recursos', () => {
  const start = createTransit(mission, initialDesign, 0);
  const decision = advanceTransit(start, 10000, initialDesign);
  assert.equal(decision.decision, 'required');
  assert.equal(decision.elapsedDays, start.durationDays / 2);
  assert.deepEqual(advanceTransit(decision, 10, initialDesign), decision);
  const resolved = resolveTransitDecision(decision, 'fuel');
  assert.equal(resolved.fuel, decision.fuel - 3);
  const arrived = advanceTransit(resolved, 10000, initialDesign);
  assert.equal(arrived.elapsedDays, arrived.durationDays);
  assert.ok(arrived.energy < start.energy);
});
test('la ventana modifica la duración y las decisiones sin recursos no se permiten', () => {
  const favorable = createTransit(mission, initialDesign, 0);
  const unfavorable = createTransit(mission, initialDesign, 390);
  assert.ok(unfavorable.durationDays > favorable.durationDays);
  assert.ok(unfavorable.fuel < favorable.fuel);
  assert.equal(resolveTransitDecision({ ...favorable, decision: 'required', fuel: 0 }, 'fuel'), null);
});
test('la masa y la instrumentación modifican reservas y consumo del trayecto', () => {
  const light = createTransit(mission, initialDesign, 0);
  const heavyDesign = { ...initialDesign, ship: 'atlas', launcher: 'medium', instrument: 'spectrometer' };
  const heavy = createTransit(mission, heavyDesign, 0);
  assert.notEqual(heavy.durationDays, light.durationDays);
  assert.notEqual(heavy.fuel, light.fuel);
  assert.ok(advanceTransit(heavy, 5, heavyDesign).data > advanceTransit(light, 5, initialDesign).data);
});
test('la campaña desbloquea el capítulo siguiente sin borrar progresos anteriores', () => {
  assert.equal(chapterUnlocked('earth', []), true);
  assert.equal(chapterUnlocked('moon', []), false);
  assert.equal(chapterUnlocked('moon', ['earth']), true);
  assert.equal(chapterUnlocked('mars', ['mars']), true);
  assert.equal(chapterUnlocked('asteroid', []), false);
});
test('el informe conserva las observaciones como índices simulados y el instrumento utilizado', () => {
  const report = createScienceReport({ id: 'europa', name: 'EUROPA DEEP', destination: 'Europa', objective: 'Estudiar hielo' }, initialDesign, { fuel: 70, energy: 80, integrity: 95, storage: 0, communications: 80, elapsedMinutes: 1440 }, ['Fractura'], []);
  assert.equal(report.elapsedDays, 1);
  assert.equal(report.netEnergyUsed, 20);
  assert.equal(report.netFuelUsed, 5);
  assert.ok(report.completedObjectives.some((objective) => objective.includes('transmitidos')));
  assert.match(report.observations[0].unit, /simulado/);
  assert.match(report.significance, /no prueban la existencia de vida/);
  assert.match(report.source, /^https:\/\/science\.nasa\.gov\//);
});
test('el retardo de luz crece con la distancia y su espera de juego está acotada', () => {
  assert.ok(estimatedSignalSeconds('moon', 0) > 1);
  assert.ok(estimatedSignalSeconds('mars', 0) > estimatedSignalSeconds('moon', 0));
  assert.ok(estimatedSignalSeconds('neptune', 0) > estimatedSignalSeconds('mars', 0));
  assert.equal(compressedTransmissionSeconds(0), 2);
  assert.equal(compressedTransmissionSeconds(100000), 12);
});
test('la tormenta marciana sigue el tiempo simulado y no afecta a otros destinos', () => {
  assert.equal(isSimulatedDustStorm('mars', 9), false);
  assert.equal(isSimulatedDustStorm('mars', 10), true);
  assert.equal(isSimulatedDustStorm('mars', 16), false);
  assert.equal(isSimulatedDustStorm('moon', 10), false);
});
