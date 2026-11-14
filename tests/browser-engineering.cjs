const path = require('node:path');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
(async () => {
  const { createTransit } = await import('../src/systems/transit.ts');
  const { missions } = await import('../src/data/missions.ts');
  const { initialDesign } = await import('../src/systems/engineering.ts');
  const mission = missions.find(item => item.id === 'earth');
  const design = { ...initialDesign, orbit: 'relay', difficulty: 'challenging' };
  const state = { ...createTransit(mission, design, 0), energy: 0 };
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(({ design, state }) => {
        localStorage.setItem('orbital-command-operations-guide-v1', 'done');
        localStorage.setItem('orbital-command-visual-guide-v1', 'done');
        if (!localStorage.getItem('orbital-command-transit-v1-earth')) localStorage.setItem('orbital-command-transit-v1-earth', JSON.stringify({ design, launchDay: 0, state }));
      }, { design, state });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Explore · Prepare exploration' }).click();
      await page.getByLabel('Orbital profile').selectOption('relay');
      await page.getByLabel('Difficulty', { exact: true }).selectOption('challenging');
      await page.getByText(/Relay increases downlink capacity/).waitFor();
      const campaignBefore = await page.evaluate(() => localStorage.getItem('orbital-command-player'));
      await page.getByText('Mission experiment lab').click();
      await page.getByRole('button', { name: 'SIMULATE DESIGN' }).click();
      await page.getByRole('heading', { name: 'Simulated journey completed' }).waitFor();
      await page.getByText(/Experiment score/).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('orbital-command-player')), campaignBefore);
      await page.getByLabel('Difficulty', { exact: true }).selectOption('guided');
      assert.equal(await page.getByText(/Experiment score/).count(), 0);
      await page.getByLabel('Difficulty', { exact: true }).selectOption('challenging');

      await page.getByText('Save, share and compare design').click();
      await page.getByRole('button', { name: 'SAVE DESIGN', exact: true }).click();
      await page.getByText('Design saved in this browser.').waitFor();
      await page.getByRole('button', { name: 'CREATE SHARE TEXT' }).click();
      assert.match(await page.getByLabel('Design text').inputValue(), /challenging/);
      await page.getByLabel('Difficulty', { exact: true }).selectOption('guided');
      await page.getByRole('button', { name: 'IMPORT TEXT' }).click();
      assert.equal(await page.getByLabel('Difficulty', { exact: true }).inputValue(), 'challenging');
      await page.getByText(/Comparison with saved design/).waitFor();

      await page.getByRole('button', { name: /CONFIRM CONFIGURATION/ }).click();
      await page.getByRole('heading', { name: 'Mission failed' }).waitFor();
      await page.getByText(/Energy ran out before the journey/).waitFor();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('orbital-command-failed-attempts-v1') || '[]').length === 1);
      assert.equal(await page.getByRole('button', { name: /ENTER ORBIT OF/ }).count(), 0);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Explore · Prepare exploration' }).click();
      await page.getByLabel('Orbital profile').selectOption('relay');
      await page.getByLabel('Difficulty', { exact: true }).selectOption('challenging');
      await page.getByRole('button', { name: /CONFIRM CONFIGURATION/ }).click();
      await page.getByRole('heading', { name: 'Mission failed' }).waitFor();
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-failed-attempts-v1')).length), 1);

      await page.getByRole('button', { name: 'RETRY JOURNEY' }).click();
      await page.getByRole('button', { name: /START JOURNEY/ }).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('orbital-command-transit-v1-earth')), null);
      await page.getByRole('button', { name: 'Science reports' }).click();
      await page.getByRole('heading', { name: 'Failed mission analysis' }).waitFor();
      await page.locator('.failed-attempts summary').first().click();
      await page.getByText('Energy ran out before arrival; the systems cannot operate without it.').waitFor();
      const [failureDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'DOWNLOAD ANALYSIS' }).click()]);
      assert.equal(failureDownload.suggestedFilename(), 'orbital-earth-failure.txt');
      assert.deepEqual(errors, []);
      await context.close(); console.log(`Orbit, difficulty, failure and retry · ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
