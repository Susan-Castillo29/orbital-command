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
      await context.addInitScript(() => localStorage.setItem('orbital-command-operations-guide-v1', 'done'));
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const language = page.getByLabel('Language');
      await language.waitFor();
      assert.equal(await language.inputValue(), 'en');
      assert.equal(await page.locator('html').getAttribute('lang'), 'en-GB');
      await page.getByText('Your next mission').waitFor();
      await language.selectOption('es');
      await page.getByText('Tu próxima misión').waitFor();
      assert.equal(await page.locator('html').getAttribute('lang'), 'es');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.getByLabel('Idioma').inputValue(), 'es');
      await page.getByLabel('Idioma').selectOption('en');
      await page.getByText('Your next mission').waitFor();
      await page.getByRole('button', { name: 'Explore · Prepare exploration' }).click();
      await page.getByRole('heading', { name: 'Design the mission' }).waitFor();
      await page.getByLabel('Language').selectOption('es');
      await page.getByRole('heading', { name: 'Diseña la misión' }).waitFor();
      await page.getByLabel('Idioma').selectOption('en');
      await page.getByRole('button', { name: 'Science reports' }).click();
      await page.getByRole('heading', { name: 'Scientific legacy' }).waitFor();
      await page.getByRole('heading', { name: 'Voluntary learning assessment' }).waitFor();
      await page.getByLabel('Language').selectOption('es');
      await page.getByRole('heading', { name: 'Legado científico' }).waitFor();
      await page.getByLabel('Idioma').selectOption('en');
      await page.getByRole('button', { name: 'NASA data' }).click();
      await page.getByRole('heading', { name: 'Real data from the universe' }).waitFor();
      await page.getByLabel('Choose a scientific source').selectOption('eonet');
      await page.getByRole('heading', { name: 'Open natural events' }).waitFor();
      await page.getByLabel('Language').selectOption('es');
      await page.getByRole('heading', { name: 'Datos reales del universo' }).waitFor();
      await page.getByRole('heading', { name: 'Eventos naturales abiertos' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await context.close();
      console.log(`Language selection and persistence: ${width}px`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
