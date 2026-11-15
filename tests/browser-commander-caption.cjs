const path = require('node:path');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4193/';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const [language, width] of [['en', 1440], ['es', 390]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript((lang) => {
        localStorage.setItem('orbital-command-language', lang);
        localStorage.setItem('orbital-command-operations-guide-v1', 'done');
        localStorage.setItem('orbital-command-visual-guide-v1', 'done');
        window.__cancels = 0;
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
          getVoices: () => [], addEventListener() {}, removeEventListener() {},
          cancel() { window.__cancels++; }, speak(utterance) { utterance.onstart?.(); },
        } });
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
      }, language);
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: language === 'en' ? 'VOICE · COMMANDER' : 'VOZ · COMANDANTE' }).click();
      await page.getByRole('button', { name: language === 'en' ? '▶ LISTEN' : '▶ ESCUCHAR' }).click();
      await page.getByRole('button', { name: language === 'en' ? 'Close communications' : 'Cerrar comunicaciones' }).click();
      await page.getByRole('button', { name: language === 'en' ? 'Mission briefing' : 'Expediente de misión' }).click();
      const close = page.getByRole('button', { name: language === 'en' ? 'Dismiss current subtitles' : 'Cerrar subtítulos actuales' });
      await close.waitFor();
      const before = await page.evaluate(() => window.__cancels);
      await close.click();
      assert.equal(await close.count(), 0);
      assert.equal(await page.evaluate(() => window.__cancels), before, 'dismissing subtitles must not stop speech');
      await page.getByRole('button', { name: /DESIGN MISSION|DISEÑAR MISIÓN/ }).click();
      await close.waitFor();
      await context.close();
    }
    console.log('Commander subtitles can be dismissed without stopping speech and return for the next transmission.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
