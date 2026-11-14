const path = require('node:path');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
(async () => {
  const { missions } = await import('../src/data/missions.ts');
  const { initialDesign } = await import('../src/systems/engineering.ts');
  const { createTransit, advanceTransit, resolveTransitDecision } = await import('../src/systems/transit.ts');
  const earth = missions.find(item => item.id === 'earth');
  const initial = createTransit(earth, initialDesign, 0);
  const middle = resolveTransitDecision(advanceTransit(initial, initial.durationDays, initialDesign), 'fuel');
  const state = advanceTransit(middle, initial.durationDays, initialDesign);
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(({ design, state }) => {
      localStorage.setItem('orbital-command-operations-guide-v1','done'); localStorage.setItem('orbital-command-visual-guide-v1','done');
      localStorage.setItem('orbital-command-first-look-v1','done');
      localStorage.setItem('orbital-command-transit-v1-earth',JSON.stringify({ design, launchDay:0, state }));
    },{ design: initialDesign, state });
    const page = await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url,{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Explore · Prepare exploration'}).click();
    await page.getByRole('button',{name:/CONFIRM CONFIGURATION/}).click();
    await page.getByRole('button',{name:/ENTER ORBIT OF EARTH/}).click();
    await page.getByRole('button',{name:/OPEN 3D LABORATORY/}).click();
    await page.getByRole('heading',{name:'Laboratory of Earth'}).waitFor();
    await page.getByText('Conceptual representation of the solid outer layer.').waitFor();
    await page.getByRole('button',{name:'Full screen: planetary laboratory'}).waitFor();
    await page.getByRole('button',{name:'Close laboratory'}).click();
    assert.deepEqual(errors,[]); await context.close(); console.log('English planetary lab and full-screen controls');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
