const path = require('node:path');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(() => {
        window.spoken = [];
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
          getVoices: () => [{ name: 'English UK', voiceURI: 'en', lang: 'en-GB', localService: true }, { name: 'Español', voiceURI: 'es', lang: 'es-MX', localService: true }],
          addEventListener() {}, removeEventListener() {}, cancel() {},
          speak(utterance) { window.spoken.push({ text: utterance.text, lang: utterance.lang }); utterance.onstart?.(); utterance.onend?.(); }
        }});
      });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'DAY 1 · THE BEGINNING' }).waitFor();
      await page.getByRole('button', { name: '▶ LISTEN' }).click();
      assert.match((await page.evaluate(() => window.spoken.at(-1))).text, /Welcome to ORBITAL COMMAND/);
      assert.equal((await page.evaluate(() => window.spoken.at(-1))).lang, 'en-GB');
      await page.getByRole('button', { name: 'SKIP GUIDE' }).click();
      await page.getByText('Select the highlighted mission to begin.').waitFor();
      await page.locator('.mission-card').first().click();
      await page.getByText('Select Prepare mission to open the briefing.').waitFor();
      await page.getByRole('button', { name: /PREPARE MISSION/ }).filter({ visible: true }).first().click();
      await page.getByText('Select Design mission to choose your spacecraft and instruments.').waitFor();
      await page.getByRole('button', { name: /DESIGN MISSION/ }).click();
      await page.getByText('Review your design and select Confirm configuration to continue.').waitFor();
      await page.getByRole('button', { name: /CONFIRM CONFIGURATION/ }).click();
      assert.equal(await page.evaluate(() => localStorage.getItem('orbital-command-visual-guide-v1')), 'done');
      await page.getByLabel('Language').selectOption('es');
      await page.getByRole('button', { name: /COMANDANTE/ }).click();
      await page.getByRole('button', { name: '▶ ESCUCHAR' }).click();
      const spoken = await page.evaluate(() => window.spoken.at(-1));
      assert.equal(spoken.lang, 'es-MX'); assert.match(spoken.text, /Bienvenido/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await context.close(); console.log(`Visual guide, speech language and menu · ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
