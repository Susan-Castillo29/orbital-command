import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missions } from '../src/data/missions.ts';
import { initialDesign } from '../src/systems/engineering.ts';
import { createScienceReport } from '../src/systems/science.ts';
import { localiseReportText, localiseReportMission } from '../src/data/reportLocale.ts';
test('canonical scientific context is translated without altering unknown text', () => {
 const resources = { fuel:80, energy:90, integrity:95, storage:0, communications:100, elapsedMinutes:1440 };
 for (const mission of missions) {
  const report = createScienceReport(mission, initialDesign, resources, [], []);
  assert.notEqual(localiseReportText(report.significance,'en'),report.significance,mission.id);
  assert.notEqual(localiseReportMission(mission.id,'objective',report.objective,'en'),report.objective,mission.id);
 }
 assert.equal(localiseReportText('Original source text','en'),'Original source text');
 assert.equal(localiseReportMission('earth','objective','Custom text','en'),'Custom text');
});
