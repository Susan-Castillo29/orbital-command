const path = require('node:path');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4188/';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => { localStorage.setItem('orbital-command-operations-guide-v1', 'done'); localStorage.setItem('orbital-command-visual-guide-v1', 'done'); });
      const page = await context.newPage();
      const apiRequests = []; const badAssets = [];
      page.on('request', request => { if (request.url().includes('/api/nasa')) apiRequests.push(request.url()); });
      page.on('response', response => { if (response.status() === 404 && /\/(assets|nasa-data)\//.test(response.url())) badAssets.push(response.url()); });
      await page.goto(url, { waitUntil: 'networkidle' });
      const icon = await page.locator('link[rel="icon"]').getAttribute('href');
      assert.equal((await page.request.get(new URL(icon, url).href)).status(), 200);
      const commander = page.getByRole('button', { name: 'VOICE · COMMANDER' });
      await commander.click();
      const close = page.getByRole('button', { name: 'Close communications' });
      await close.waitFor();
      const dimensions = await close.boundingBox(); assert.ok(dimensions.width >= 40 && dimensions.height >= 40);
      await close.click(); assert.equal(await commander.getAttribute('aria-expanded'), 'false');
      await page.getByRole('button', { name: 'NASA data' }).click();
      await page.getByText(/published snapshot, not a live query/).waitFor();
      await page.getByLabel('Choose a scientific source').selectOption('donki_flr');
      await page.getByRole('alert').waitFor();
      assert.deepEqual(apiRequests, []); assert.deepEqual(badAssets, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await context.close(); console.log(`Static NASA, favicon and commander close · ${width}px`);
    }
    const context = await browser.newContext();
    await context.addInitScript(() => { localStorage.setItem('orbital-command-operations-guide-v1', 'done'); localStorage.setItem('orbital-command-visual-guide-v1', 'done'); });
    const page = await context.newPage(); let rejected = false; let failLoads = true; let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame() && ++navigations > 1) failLoads = false; });
    await page.route('**/assets/MissionReports-*.js', async route => { if (failLoads) { rejected = true; await route.abort('failed'); } else await route.continue(); });
    await page.goto(url, { waitUntil: 'networkidle' });
    await Promise.all([page.waitForURL(url), page.getByRole('button', { name: 'Science reports' }).click()]);
    await page.waitForFunction(() => Boolean(sessionStorage.getItem('orbital-reload-at')));
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Science reports' }).click();
    await page.getByRole('heading', { name: 'Scientific legacy' }).waitFor();
    assert.equal(rejected, true);
    await context.close(); console.log('Lazy chunk failure triggers one recovery reload');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
