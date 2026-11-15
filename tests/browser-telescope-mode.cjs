const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
const distRoot = path.resolve(__dirname, '../dist');
const contentTypes = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2' };

async function serveBuild(context) {
  const origin = new URL(url).origin;
  await context.route(`${origin}/**`, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(distRoot, relativePath);
    if (file !== distRoot && !file.startsWith(`${distRoot}${path.sep}`)) return route.fulfill({ status:403, body:'Forbidden' });
    try { return await route.fulfill({ status:200, contentType:contentTypes[path.extname(file)] || 'application/octet-stream', body:await fs.readFile(file) }); }
    catch { return route.fulfill({ status:404, body:'Not found' }); }
  });
}

(async()=>{
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    await context.addInitScript(()=>{
      localStorage.setItem('orbital-command-operations-guide-v1','done');
      localStorage.setItem('orbital-command-visual-guide-v1','done');
      localStorage.setItem('orbital-command-player',JSON.stringify({credits:940,xp:250,completedMissions:['earth','moon']}));
    });
    await serveBuild(context);
    const page=await context.newPage();
    await page.goto(url,{waitUntil:'networkidle'});
    const astronautProgress={credits:940,xp:250,completedMissions:['earth','moon']};
    assert.ok(await page.locator('.mission-card').count()>=2,'astronaut campaign missions remain available');
    await page.getByRole('button',{name:/Mission selection · Choose your role/}).click();
    await page.getByRole('heading',{name:'SELECT YOUR ROLE'}).waitFor();
    await page.getByRole('button',{name:/DESIGN A TELESCOPE/}).click();
    await page.getByRole('heading',{name:'The universe still holds questions.'}).waitFor();
    await page.getByRole('button',{name:'ACCEPT ASSIGNMENT'}).click();
    await page.getByRole('heading',{name:'What do we want to discover?'}).waitFor();
    await page.getByRole('button',{name:/Distant galaxies/}).click();
    await page.getByRole('button',{name:/Black holes/}).click();
    await page.getByRole('button',{name:/CHOOSE WAVELENGTHS/}).click();
    await page.getByRole('button',{name:/Gamma rays/}).click();
    await page.getByRole('button',{name:/SELECT INSTRUMENTS/}).click();
    await page.locator('.instrument-card').filter({hasText:'Gamma-ray detector'}).getByRole('button').click();
    await page.getByRole('button',{name:/CONFIGURE OPTICS AND SYSTEMS/}).click();
    await page.getByRole('heading',{name:'Route the signal to the detector'}).waitFor();
    assert.equal(await page.getByText('GAMMA DETECTION · NO MIRROR').count(),1,'gamma architecture correctly avoids a focusing mirror');
    await page.getByRole('button',{name:/REVIEW DESIGN/}).click();
    await page.getByRole('heading',{name:'Can it fly and answer the question?'}).waitFor();
    assert.equal(await page.getByRole('alert').count(),0,'compatible gamma design passes technical review');
    await page.getByRole('button',{name:/BEGIN LAUNCH SEQUENCE/}).click();
    await page.getByRole('heading',{name:'The observatory has begun observing'}).waitFor();
    assert.equal(await page.getByText('Fermi Gamma-ray Space Telescope').count(),1,'gamma results link to the relevant NASA mission');
    assert.equal(await page.getByText(/EDUCATIONAL SIMULATION · SYNTHETIC DATA/).count(),1,'synthetic results are clearly labelled');
    const saved=await page.evaluate(()=>({astronaut:JSON.parse(localStorage.getItem('orbital-command-player')),science:JSON.parse(localStorage.getItem('orbital-command-science-archive-v1'))}));
    assert.deepEqual(saved.astronaut,astronautProgress,'scientist mode does not overwrite astronaut progress');
    assert.equal(saved.science.missions.length,1,'scientist mode stores its own completed design');
    assert.ok(saved.science.medals.includes('first-light'));
    await page.getByRole('button',{name:/CHANGE ROLE/}).click();
    await page.getByRole('heading',{name:'SELECT YOUR ROLE'}).waitFor();
    assert.match(await page.locator('.scientist-role ul li').last().innerText(),/1\s+(missions|misiones)\s+·\s+[1-9]\d*\s+(science medals|medallas científicas)/i,'role selector shows independent scientist progress');
    await context.close();
    console.log('Astronaut progress, scientist role, gamma compatibility, launch, simulated NASA connection and separate science archive passed.');
  } finally { await browser.close(); }
})().catch((error)=>{console.error(error);process.exit(1);});
