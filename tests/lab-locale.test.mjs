import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modelFor, atmosphereComposition } from '../src/data/planetaryLab.ts';
import { localiseLabText } from '../src/data/labLocale.ts';
test('every represented layer and atmosphere has English educational text', () => {
 for (const id of ['earth','moon','mars','mercury','venus','jupiter','saturn','titan','uranus','neptune','europa','sun']) {
  for (const mode of ['atmosphere','interior']) for (const layer of modelFor(id,mode)) {
   assert.notEqual(localiseLabText(layer.description,'en'),layer.description,`${id}: ${layer.description}`);
   assert.equal(localiseLabText(layer.description,'es'),layer.description);
  }
  if (atmosphereComposition[id]) assert.notEqual(localiseLabText(atmosphereComposition[id],'en'), atmosphereComposition[id]);
 }
});
