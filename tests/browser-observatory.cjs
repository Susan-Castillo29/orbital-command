const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const baseURL = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
const output = path.resolve(__dirname, '../artifacts/observatory');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const results = { environment: 'Chromium headless / SwiftShader; no representa rendimiento de una GPU física', views: [] };
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, deviceScaleFactor: 2 });
      await context.addInitScript(() => localStorage.setItem('orbital-command-operations-guide-v1', 'done'));
      const page = await context.newPage(); const requests = []; const errors = []; const failed = [];
      page.on('request', request => requests.push({ url: request.url(), type: request.resourceType() }));
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400) failed.push({ url: response.url(), status: response.status() }); });
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Observar Tierra' }).click();
      await page.waitForTimeout(1200);
      const canvas = page.locator('.space-scene canvas');
      const dimensions = {};
      for (const quality of ['high', 'economy', 'balanced']) {
        await page.getByLabel('Calidad gráfica').selectOption(quality);
        await page.waitForTimeout(250);
        dimensions[quality] = await canvas.evaluate(el => ({ width: el.width, height: el.height, pixels: el.width * el.height }));
      }
      assert.ok(dimensions.economy.pixels <= 800000);
      assert.ok(dimensions.high.pixels >= dimensions.economy.pixels);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `observatorio-${viewport.width}.png`) });
      await page.getByRole('button', { name: /COMANDANTE/ }).click();
      await page.getByLabel('Ritmo de narración').fill('1.1');
      assert.equal(await page.getByLabel('Ritmo de narración').inputValue(), '1.1');
      await page.screenshot({ path: path.join(output, `voz-${viewport.width}.png`) });
      await page.getByRole('button', { name: 'Cerrar comunicaciones' }).click();
      await page.getByRole('button', { name: 'Sistema completo' }).click();
      const timing = await page.evaluate(() => new Promise(resolve => {
        const deltas=[]; let last=performance.now(); const start=last;
        function sample(now){deltas.push(now-last);last=now;if(now-start<2000)requestAnimationFrame(sample);else {deltas.sort((a,b)=>a-b);resolve({ medianFrameMs:deltas[Math.floor(deltas.length/2)], p95FrameMs:deltas[Math.floor(deltas.length*.95)], samples:deltas.length });}}
        requestAnimationFrame(sample);
      }));
      assert.deepEqual(errors, []); assert.deepEqual(failed, []);
      results.views.push({ viewport, dimensions, timing, errors, failed, externalRequests: requests.filter(r => new URL(r.url).origin !== new URL(baseURL).origin), requestCount: requests.length });
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'browser-audit.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
