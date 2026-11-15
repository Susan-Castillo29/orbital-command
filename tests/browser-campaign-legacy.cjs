const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
const missionIds = ['earth','moon','mercury','venus','mars','jupiter','europa','saturn','titan','uranus','neptune','sun','asteroid'];
const destinations = { earth:'Earth', moon:'Moon', mercury:'Mercury', venus:'Venus', mars:'Mars', jupiter:'Jupiter', europa:'Europa', saturn:'Saturn', titan:'Titan', uranus:'Uranus', neptune:'Neptune', sun:'Sun', asteroid:'Asteroid Psyche' };
function fixtures(omitMission = null) {
  return missionIds.filter((id) => id !== omitMission).map((id) => ({
    missionId:id, missionName:id.toUpperCase(), destination:destinations[id], objective:'Mission objective', instrument:'Camera',
    observations:[0,1,2].map((index) => ({ region:`Sector ${index + 1}`, value:50 + index, unit:'simulated index' })),
    samples:id === 'moon' ? ['Sample 1','Sample 2','Sample 3'] : [], transmittedUnits:12, fuelRemaining:80, energyRemaining:70,
    integrity:95, elapsedDays:1, score:80, significance:'Educational simulation.', source:`https://science.nasa.gov/${id}/`,
    completedObjectives:id === 'moon' ? ['3 regiones registradas','3 muestras simuladas analizadas','Resultados transmitidos en la simulación'] : ['3 regiones registradas','Resultados transmitidos en la simulación'],
    netFuelUsed:10, netEnergyUsed:20,
  }));
}
async function makeContext(browser, completed, reports, language = 'en') {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } });
  const origin = new URL(url).origin;
  const distRoot = path.resolve(__dirname, '../dist');
  const contentTypes = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2' };
  await context.route(`${origin}/**`, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(distRoot, relativePath);
    if (file !== distRoot && !file.startsWith(`${distRoot}${path.sep}`)) {
      await route.fulfill({ status:403, body:'Forbidden' });
      return;
    }
    try {
      const body = await fs.readFile(file);
      await route.fulfill({ status:200, contentType:contentTypes[path.extname(file)] || 'application/octet-stream', body });
    } catch {
      await route.fulfill({ status:404, body:'Not found' });
    }
  });
  await context.addInitScript(({ completedMissions, missionReports, language }) => {
    localStorage.setItem('orbital-command-language', language);
    localStorage.setItem('orbital-command-operations-guide-v1','done');
    localStorage.setItem('orbital-command-visual-guide-v1','done');
    localStorage.setItem('orbital-command-player',JSON.stringify({ credits:600, xp:0, completedMissions }));
    localStorage.setItem('orbital-command-reports-v1',JSON.stringify(missionReports));
  }, { completedMissions:completed, missionReports:reports, language });
  const page = await context.newPage();
  await page.goto(url,{ waitUntil:'networkidle' });
  return { context, page };
}

(async () => {
  const browser = await chromium.launch({ headless:true, args:['--enable-unsafe-swiftshader'] });
  try {
    const lastMission = missionIds.at(-1);
    const partial = missionIds.filter((id) => id !== lastMission);
    const first = await makeContext(browser,partial,fixtures(lastMission));
    await first.page.getByText('Your next mission').waitFor();
    assert.equal(await first.page.getByRole('heading',{ name:'GALACTIC EXPLORER MEDAL' }).count(),0,'an unfinished campaign must not award the medal');
    assert.equal(await first.page.getByRole('button',{name:'VIEW DIPLOMA'}).count(),0,'unfinished campaigns must not issue a diploma');
    await first.page.getByRole('button',{ name:/MEDALS/ }).click();
    assert.equal(await first.page.locator('#campaign-medal-progress').getAttribute('value'), String(partial.length));
    await first.page.getByRole('button',{ name:'BACK', exact:true }).click();
    await first.page.evaluate(({ ids, reports }) => {
      const progress={ credits:600, xp:0, completedMissions:ids };
      localStorage.setItem('orbital-command-player',JSON.stringify(progress));
      localStorage.setItem('orbital-command-reports-v1',JSON.stringify(reports));
      window.dispatchEvent(new CustomEvent('orbital-player-progress',{ detail:progress }));
    },{ ids:missionIds, reports:fixtures() });
    await first.page.getByRole('heading',{ name:'GALACTIC EXPLORER MEDAL' }).waitFor();
    assert.match(await first.page.locator('.campaign-command-message p').innerText(),/Commander, mission accomplished/);
    await first.page.getByRole('button',{name:'VIEW DIPLOMA'}).click();
    await first.page.getByRole('heading',{name:'Galactic Explorer Medal',exact:true}).waitFor();
    for (const person of ['Caos Torres','Susan Castillo','Israel Melo','Wady Cruz','Emil Castillo','Gabriela']) assert.equal(await first.page.locator('.diploma-signatures').getByText(person,{exact:true}).count(),1);
    await first.page.evaluate(() => { window.print = () => { window.__diplomaPrinted = true; }; });
    await first.page.getByRole('button',{name:'PRINT / SAVE PDF'}).click();
    assert.equal(await first.page.evaluate(() => window.__diplomaPrinted), true);
    await first.page.getByRole('button',{name:'CLOSE',exact:true}).click();
    const archive = await first.page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-campaign-archive-v1')));
    assert.equal(archive.medals.length,1);
    assert.equal(archive.campaigns.length,1);
    await first.page.evaluate(() => window.dispatchEvent(new CustomEvent('orbital-player-progress',{ detail:JSON.parse(localStorage.getItem('orbital-command-player')) })));
    assert.equal(await first.page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-campaign-archive-v1')).medals.length),1);
    assert.equal(await first.page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-campaign-archive-v1')).campaigns.length),1);
    await first.page.getByRole('button',{ name:'RETURN TO MAIN MENU' }).click();
    await first.page.getByText('Your next mission').waitFor();
    await first.page.reload({ waitUntil:'networkidle' });
    await first.page.getByText('Your next mission').waitFor();
    assert.equal(await first.page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-campaign-archive-v1')).medals.length),1);
    await first.page.getByRole('button',{ name:/MEDALS/ }).click();
    await first.page.getByRole('heading',{ name:'MEDALS AND CAMPAIGNS' }).waitFor();
    await first.context.close();

    const second = await makeContext(browser,missionIds,fixtures());
    await second.page.getByRole('heading',{ name:'GALACTIC EXPLORER MEDAL' }).waitFor();
    await second.page.getByRole('button',{ name:'PLAY AGAIN' }).click();
    const confirm = second.page.getByRole('alertdialog');
    await confirm.getByRole('heading',{ name:'Start a new campaign?' }).waitFor();
    await confirm.getByRole('button',{ name:'CANCEL' }).click();
    assert.equal(await second.page.evaluate(() => JSON.parse(localStorage.getItem('orbital-command-player')).completedMissions.length),missionIds.length);
    await second.page.getByRole('button',{ name:'PLAY AGAIN' }).click();
    await second.page.getByRole('alertdialog').getByRole('button',{ name:'START NEW CAMPAIGN' }).click();
    await second.page.getByText('Your next mission').waitFor();
    const fresh = await second.page.evaluate(() => ({ player:JSON.parse(localStorage.getItem('orbital-command-player')), reports:JSON.parse(localStorage.getItem('orbital-command-reports-v1')||'[]'), archive:JSON.parse(localStorage.getItem('orbital-command-campaign-archive-v1')), active:JSON.parse(localStorage.getItem('orbital-command-active-campaign-v1')) }));
    assert.deepEqual(fresh.player.completedMissions,[]);
    assert.equal(fresh.player.credits,600);
    assert.deepEqual(fresh.reports,[]);
    assert.equal(fresh.archive.medals.length,1);
    assert.equal(fresh.archive.campaigns.length,1);
    assert.equal(fresh.active.completed,false);
    assert.equal(fresh.active.playtimeMs,0);
    await second.context.close();
    const spanish = await makeContext(browser, missionIds, fixtures(), 'es');
    await spanish.page.getByRole('heading',{ name:'MEDALLA DE EXPLORADOR GALÁCTICO' }).waitFor();
    assert.match(await spanish.page.locator('.campaign-command-message p').innerText(), /Comandante, misión cumplida/);
    await spanish.context.close();
    console.log('Campaign medal, persistent record, return-to-menu, confirmation, reset and replay passed.');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
