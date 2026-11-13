import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missionTransmission, operationsGuide, selectSpanishVoice } from '../src/data/commander.ts';

test('elige una voz latinoamericana cuando está disponible y nunca inventa una voz', () => {
  const english = { name: 'English', lang: 'en-US' };
  const spain = { name: 'Español', lang: 'es-ES' };
  const mexico = { name: 'Español de México', lang: 'es-MX' };
  assert.equal(selectSpanishVoice([english, spain, mexico]), mexico);
  assert.equal(selectSpanishVoice([english, spain]), spain);
  assert.equal(selectSpanishVoice([english]), undefined);
  assert.equal(selectSpanishVoice([]), undefined);
});

test('la guía informa sobre controles de misión y decisiones de ingeniería', () => {
  assert.ok(operationsGuide.length >= 2);
  assert.equal(new Set(operationsGuide.map((message) => message.id)).size, operationsGuide.length);
  assert.match(operationsGuide.find((message) => message.id === 'ship').text, /instrumento/);
});

test('las transmisiones reflejan la misión y la fase seleccionadas', () => {
  const briefing = missionTransmission('RED PLANET', 'Marte', 'briefing');
  const exploration = missionTransmission('RED PLANET', 'Marte', 'exploration');
  assert.match(briefing.text, /Marte/);
  assert.match(exploration.text, /Marte/);
  assert.notEqual(briefing.id, exploration.id);
});
