import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pixelRatioFor } from '../src/systems/renderQuality.ts';
import { selectSpanishVoice } from '../src/data/commander.ts';
test('la resolución 4K respeta el presupuesto de cada calidad', () => {
  for (const [quality, budget] of [['economy', 800000], ['balanced', 1600000], ['high', 3200000]]) {
    const ratio = pixelRatioFor(3840, 2160, 3, quality);
    assert.ok(3840 * 2160 * ratio * ratio <= budget + 1);
    assert.ok(ratio > 0);
  }
  assert.equal(pixelRatioFor(0, 0, 0, 'balanced'), 1);
});
test('prefiere voces mejoradas disponibles conservando el acento latinoamericano', () => {
  const basic = { name: 'Español México', lang: 'es-MX' };
  const natural = { name: 'Jorge Natural', lang: 'es-MX' };
  assert.equal(selectSpanishVoice([basic, natural]), natural);
  assert.equal(selectSpanishVoice([basic, { name: 'Natural España', lang: 'es-ES' }]), basic);
});
