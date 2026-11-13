const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
const output = path.resolve(__dirname, '../artifacts/temas'); fs.mkdirSync(output, { recursive: true });
(async () => {
 const browser = await chromium.launch({ headless:true,args:['--enable-unsafe-swiftshader'] });
 try {
  for(const width of [1440,390]) {
   const context=await browser.newContext({viewport:{width,height:900}});
   await context.addInitScript(()=>{
    localStorage.setItem('orbital-command-operations-guide-v1','done');
    localStorage.setItem('orbital-command-reports-v1',JSON.stringify([{missionId:'earth',missionName:'EARTH GUARDIAN',destination:'Tierra',objective:'Observar nubes, océanos y vegetación para comprender nuestro hogar.',instrument:'Cámara multiespectral',observations:[{region:'Cobertura de nubes',value:42,unit:'índice simulado / 100'},{region:'Océanos',value:71,unit:'índice simulado / 100'}],samples:[],transmittedUnits:16,fuelRemaining:83,energyRemaining:76,integrity:100,elapsedDays:3,score:85,significance:'Resultados educativos simulados para estudiar la Tierra.',source:'https://science.nasa.gov/earth/'}]));
   });
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle'});
   await page.getByRole('button',{name:'Pantalla completa: sistema solar',exact:true}).click();
   await page.waitForFunction(()=>document.fullscreenElement?.getAttribute('data-visualization')==='solar');
   await page.getByRole('button',{name:'Salir de pantalla completa: sistema solar',exact:true}).click();
   await page.waitForFunction(()=>!document.fullscreenElement);
   await page.getByRole('button',{name:'Informes científicos',exact:true}).click();
   await page.locator('.report-document').waitFor();
   for(const theme of ['dark','light']) {
    if(theme==='light') await page.getByRole('button',{name:'Activar modo claro',exact:true}).click();
    assert.equal(await page.locator('.app-shell').getAttribute('data-theme'),theme);
    const styles=await page.locator('.report-document p').first().evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),color:getComputedStyle(el).color,bg:getComputedStyle(el.closest('article')).backgroundColor}));
    assert.ok(styles.size>=16);
    assert.notEqual(styles.color,styles.bg);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:path.join(output,`informes-${theme}-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Pantalla completa: gráfico científico',exact:true}).click();
    await page.waitForFunction(()=>document.fullscreenElement?.getAttribute('data-visualization')==='chart');
    const box=await page.locator('[data-visualization="chart"]').boundingBox();assert.ok(box.width>=width-2);
    await page.screenshot({path:path.join(output,`grafico-${theme}-${width}.png`)});
    await page.getByRole('button',{name:'Salir de pantalla completa: gráfico científico',exact:true}).click();
    await page.waitForFunction(()=>!document.fullscreenElement);
   }
   await page.getByRole('button',{name:'Pantalla completa: globo de seguimiento',exact:true}).click();
   await page.waitForFunction(()=>document.fullscreenElement?.getAttribute('data-visualization')==='tracking');
   await page.getByRole('button',{name:'Salir de pantalla completa: globo de seguimiento',exact:true}).click();
   await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.app-shell').getAttribute('data-theme'),'light');
   await page.getByRole('button',{name:'Activar modo oscuro',exact:true}).click();assert.equal(await page.locator('.app-shell').getAttribute('data-theme'),'dark');
   assert.deepEqual(errors,[]);await context.close();console.log(`✓ Temas, informes legibles y pantalla completa: ${width}px`);
  }
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
