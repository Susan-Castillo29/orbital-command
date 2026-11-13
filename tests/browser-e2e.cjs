/* Requiere el Playwright del workspace y el servidor local iniciado. */
const path = require('node:path');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const baseURL = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';

async function newGame(browser, mission, completed = [], seedProgress = null, seedTransit = null) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ missionId, completedMissions, progress, transit }) => {
    localStorage.setItem('orbital-command-operations-guide-v1', 'done');
    localStorage.setItem('orbital-command-mission', missionId);
    localStorage.setItem('orbital-command-player', JSON.stringify({ credits: 600, xp: 0, completedMissions }));
    localStorage.setItem(`orbital-command-tutorial-${missionId}`, 'done');
    if (progress) localStorage.setItem(`orbital-command-progress-${missionId}`, JSON.stringify(progress));
    if (transit) localStorage.setItem(`orbital-command-transit-v1-${missionId}`, JSON.stringify(transit));
  }, { missionId: mission, completedMissions: completed, progress: seedProgress, transit: seedTransit });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  return { context, page, errors };
}
async function launch(page, destination) {
  await page.getByRole('button', { name: 'PREPARAR MISIÓN' }).click();
  await page.getByRole('button', { name: /DISEÑAR MISIÓN/ }).click();
  await page.getByRole('button', { name: /CONFIRMAR CONFIGURACIÓN/ }).click();
  await page.getByRole('button', { name: /INICIAR TRAYECTO/ }).click();
  await page.getByRole('button', { name: '×1000' }).click();
  await page.getByText('DECISIÓN DE TRAYECTORIA').waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: /IMPULSO/ }).click();
  await page.getByRole('button', { name: `ESTABLECER ÓRBITA DE ${destination} →` }).click({ timeout: 20000 });
}
async function arriveFromSavedTransit(page, destination) {
  await page.getByRole('button', { name: 'PREPARAR MISIÓN' }).click();
  await page.getByRole('button', { name: /DISEÑAR MISIÓN/ }).click();
  await page.getByRole('button', { name: /CONFIRMAR CONFIGURACIÓN/ }).click();
  await page.getByText('Trayecto recuperado y pausado').waitFor();
  await page.getByRole('button', { name: `ESTABLECER ÓRBITA DE ${destination} →` }).click();
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    {
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      await context.addInitScript(() => {
        window.testSpoken = [];
        class Utterance { constructor(text) { this.text = text; } }
        Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance });
        Object.defineProperty(window, 'speechSynthesis', { value: {
          getVoices: () => [{ name: 'English', lang: 'en-US' }, { name: 'Latinoamérica', lang: 'es-DO' }],
          speak: (utterance) => { window.testSpoken.push({ text: utterance.text, lang: utterance.voice?.lang }); utterance.onstart?.(); utterance.onboundary?.({ charIndex: 0 }); },
          cancel: () => {},
        } });
      });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(baseURL, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /ESCUCHAR/ }).click();
      assert.equal(await page.evaluate(() => window.testSpoken[0].lang), 'es-DO');
      assert.equal(await page.locator('.commander-subtitle mark').textContent(), 'Bienvenido');
      await page.getByRole('button', { name: /SIGUIENTE/ }).click();
      await page.getByRole('heading', { name: 'CENTRO DE OPERACIONES' }).waitFor();
      await page.getByRole('button', { name: 'OMITIR GUÍA' }).click();
      assert.deepEqual(errors, []); await context.close(); console.log('✓ Comandante: voz simulada, subtítulos y guía');
    }
    {
      const { context, page, errors } = await newGame(browser, 'earth');
      assert.equal(await page.getByRole('button', { name: /LUNAR FRONTIER/ }).count(), 0);
      await launch(page, 'TIERRA');
      await page.getByRole('button', { name: 'Pantalla completa: exploración espacial', exact: true }).click();
      await page.waitForFunction(() => document.fullscreenElement?.getAttribute('data-visualization') === 'exploration');
      await page.getByRole('button', { name: 'Salir de pantalla completa: exploración espacial', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
      await page.getByRole('button', { name: /DESPLEGAR SATÉLITE/ }).click();
      const [image] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /FOTOGRAFIAR/ }).click()]);
      assert.match(image.suggestedFilename(), /^orbital-earth-1\.png$/);
      await page.getByRole('button', { name: /ABRIR LABORATORIO 3D/ }).click();
      await page.getByRole('button', { name: 'Pantalla completa: laboratorio planetario', exact: true }).click();
      await page.waitForFunction(() => document.fullscreenElement?.getAttribute('data-visualization') === 'lab');
      await page.getByRole('button', { name: 'Salir de pantalla completa: laboratorio planetario', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement);
      await page.getByRole('button', { name: /REGISTRAR LECTURA/ }).click();
      await page.getByRole('button', { name: 'Cerrar laboratorio' }).click();
      for (let index = 0; index < 3; index += 1) await page.getByRole('button', { name: /ACTIVAR INSTRUMENTO/ }).click();
      const priority = page.getByLabel('Prioridad de datos');
      const before = await page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-buffers-earth')));
      await priority.selectOption('sensors');
      await page.getByRole('button', { name: /TRANSMITIR PAQUETE/ }).click();
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-buffers-earth')));
      assert.equal(after.observations, before.observations);
      assert.ok(after.sensors < before.sensors);
      await priority.selectOption('observations');
      for (let index = 0; index < 2; index += 1) await page.getByRole('button', { name: /TRANSMITIR PAQUETE/ }).click();
      await page.getByRole('button', { name: /TRANSMITIR INFORME/ }).click();
      await page.getByText('CAMPAÑA COMPLETADA').waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: 'Informes científicos' }).click();
      await page.getByRole('heading', { name: /Tierra · EARTH GUARDIAN/ }).waitFor();
      assert.match(await page.locator('body').innerText(), /Lecturas del modelo virtual/);
      assert.match(await page.locator('body').innerText(), /Fotografías simuladas exportadas: 1/);
      await page.getByRole('button', { name: '← VOLVER' }).click();
      await page.getByRole('button', { name: /LUNAR FRONTIER/ }).waitFor();
      assert.deepEqual(errors, []); await context.close(); console.log('✓ Tierra, informe y desbloqueo lunar');
    }
    for (const item of [{ id: 'moon', target: 'LUNA', completed: ['earth'] }, { id: 'mars', target: 'MARTE', completed: ['earth', 'moon', 'mercury', 'venus'] }]) {
      const { context, page, errors } = await newGame(browser, item.id, item.completed);
      await launch(page, item.target);
      await page.getByRole('button', { name: /INICIAR ATERRIZAJE/ }).click();
      await page.getByRole('button', { name: /INSTALAR SENSOR/ }).click({ timeout: 20000 });
      await page.getByRole('button', { name: /INSTALAR SENSOR · 1\/3/ }).waitFor();
      await page.getByRole('button', { name: /BAJAR DEL ROVER/ }).click({ timeout: 20000 });
      await page.getByRole('button', { name: /VOLVER AL ROVER/ }).click();
      await page.getByRole('button', { name: /BAJAR DEL ROVER/ }).waitFor();
      assert.deepEqual(errors, []); await context.close(); console.log(`✓ ${item.target}: aterrizaje, caminata y rover`);
    }
    {
      const progress = { arrived: true, orbit: true, landingZone: 'shackleton', landed: true, roverDeployed: true, scannedRocks: [0, 1, 2], collectedSamples: [0, 1, 2], analyzed: false, transmitted: false };
      const { context, page, errors } = await newGame(browser, 'moon', ['earth'], progress);
      await launch(page, 'LUNA');
      await page.getByRole('button', { name: /VOLVER AL SITIO DEL ROVER/ }).click();
      await page.keyboard.down('w');
      await page.getByText('ESTACIÓN AL ALCANCE', { exact: false }).first().waitFor({ timeout: 12000 });
      await page.keyboard.up('w');
      await page.keyboard.press('e');
      await page.getByRole('button', { name: /TRANSMITIR RESULTADOS/ }).click();
      await page.getByText('MISIÓN COMPLETADA').waitFor({ timeout: 10000 });
      await page.getByRole('button', { name: 'Informes científicos' }).click();
      await page.getByRole('heading', { name: /Luna · LUNAR FRONTIER/ }).waitFor();
      assert.match(await page.locator('body').innerText(), /Basalto vesicular/);
      assert.deepEqual(errors, []); await context.close(); console.log('✓ Luna: análisis y transmisión de muestras preparadas');
    }
    {
      const { context, page, errors } = await newGame(browser, 'venus', ['earth', 'moon', 'mercury']);
      await launch(page, 'VENUS');
      await page.getByRole('button', { name: /ABRIR LABORATORIO 3D/ }).click();
      await page.getByRole('button', { name: /DESCENDER A LA SIGUIENTE CAPA/ }).click();
      await page.getByText('Nubes medias', { exact: false }).first().waitFor();
      await page.getByLabel('Lectura disponible para el instrumento').selectOption('pressure');
      await page.getByRole('button', { name: /REGISTRAR LECTURA/ }).click();
      assert.match(await page.evaluate(() => localStorage.getItem('orbital-command-lab-venus')), /Presión simulada/);
      await page.getByRole('button', { name: 'Cerrar laboratorio' }).click();
      await page.getByRole('button', { name: /1 LECTURAS/ }).waitFor();
      assert.equal(await page.getByRole('button', { name: /INICIAR ATERRIZAJE/ }).count(), 0);
      assert.deepEqual(errors, []); await context.close(); console.log('✓ Venus: sonda atmosférica y lectura simulada');
    }
    {
      const { initialDesign, defaultDesign } = await import('../src/systems/engineering.ts');
      const { createTransit } = await import('../src/systems/transit.ts');
      const cases = [
        { id: 'mercury', target: 'MERCURIO', budget: 700, previous: 'moon', surface: true },
        { id: 'titan', target: 'TITÁN', budget: 960, previous: 'saturn', surface: true },
        { id: 'jupiter', target: 'JÚPITER', budget: 880, previous: 'mars' },
        { id: 'europa', target: 'EUROPA', budget: 900, previous: 'jupiter' },
        { id: 'saturn', target: 'SATURNO', budget: 820, previous: 'europa' },
        { id: 'uranus', target: 'URANO', budget: 1000, previous: 'titan' },
        { id: 'neptune', target: 'NEPTUNO', budget: 1100, previous: 'uranus' },
        { id: 'sun', target: 'SOL', budget: 520, previous: 'neptune' },
      ];
      for (const item of cases) {
        const design = defaultDesign(item.id, 'pioneer');
        const initial = createTransit(item, design, 0);
        const transit = { design, launchDay: 0, state: { ...initial, elapsedDays: initial.durationDays, decision: 'resolved', choice: 'fuel', fuel: initial.fuel - 3 } };
        const { context, page, errors } = await newGame(browser, item.id, [item.previous], null, transit);
        await arriveFromSavedTransit(page, item.target);
        if (item.surface) {
          await page.getByRole('button', { name: /INICIAR ATERRIZAJE/ }).click();
          await page.getByRole('button', { name: /INSTALAR SENSOR/ }).waitFor({ timeout: 20000 });
          assert.equal(await page.getByRole('button', { name: /BAJAR DEL ROVER/ }).count(), 0);
        } else {
          await page.getByRole('button', { name: /ABRIR LABORATORIO 3D/ }).click();
          await page.getByRole('button', { name: /REGISTRAR LECTURA/ }).click();
          await page.getByRole('button', { name: 'Cerrar laboratorio' }).click();
          assert.equal(await page.getByRole('button', { name: /INICIAR ATERRIZAJE/ }).count(), 0);
        }
        assert.deepEqual(errors, []); await context.close(); console.log(`✓ ${item.target}: ${item.surface ? 'rover robótico' : 'laboratorio remoto'}`);
      }
      const mars = { id: 'mars', budget: 680 };
      const launchDay = Array.from({ length: 780 }, (_, day) => day).find((day) => {
        const phase = createTransit(mars, initialDesign, day).durationDays * 1440 % 30;
        return phase >= 10.2 && phase < 11;
      });
      assert.notEqual(launchDay, undefined);
      const initial = createTransit(mars, initialDesign, launchDay);
      const transit = { design: initialDesign, launchDay, state: { ...initial, elapsedDays: initial.durationDays, decision: 'resolved', choice: 'fuel', fuel: initial.fuel - 3 } };
      const { context, page, errors } = await newGame(browser, 'mars', ['venus'], null, transit);
      await arriveFromSavedTransit(page, 'MARTE');
      await page.getByRole('button', { name: /INICIAR ATERRIZAJE/ }).click();
      await page.getByText('TORMENTA DE POLVO SIMULADA', { exact: false }).waitFor({ timeout: 20000 });
      assert.deepEqual(errors, []); await context.close(); console.log('✓ Marte: tormenta de polvo con tiempo simulado');
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
