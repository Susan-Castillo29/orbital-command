/* Browser regression for the voluntary, device-local learning assessment. */
const path=require('node:path');const fs=require('node:fs');const assert=require('node:assert/strict');
const browserTools=path.resolve(__dirname,'../../../../../infraestructura/herramientas-locales/browser');process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools,'browsers');
const {chromium}=require(process.env.ORBITAL_PLAYWRIGHT_MODULE||path.join(browserTools,'node_modules/playwright'));
const url=process.env.ORBITAL_TEST_URL||'http://127.0.0.1:4174/';
(async()=>{const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('orbital-command-operations-guide-v1','done'));
 await page.goto(url,{waitUntil:'networkidle'});await page.getByRole('button',{name:'Informes científicos'}).click();
 await page.getByRole('heading',{name:'Evaluación educativa voluntaria'}).waitFor();
 const save=page.getByRole('button',{name:'GUARDAR EVALUACIÓN INICIAL'});assert.equal(await save.isDisabled(),true);
 await page.getByLabel('El registro procede de una fuente real; el escaneo del juego es simulado.').check();await page.getByLabel('Mediante observación remota y sondas.').check();await page.getByLabel('Que una fuente ha registrado un evento; la simulación no lo mide.').check();
 assert.equal(await save.isDisabled(),true);assert.equal(await page.evaluate(()=>localStorage.getItem('orbital-command-learning-evidence-v1')),null);
 await page.getByLabel('Acepto guardar estas respuestas voluntarias en este navegador.').check();await save.click();await page.getByText(/Completa y transmite una misión/).waitFor();
 await page.evaluate(()=>localStorage.setItem('orbital-command-report-transmissions-v1','1'));
 await page.evaluate(()=>localStorage.setItem('orbital-command-reports-v1',JSON.stringify([{missionId:'earth',missionName:'HOME',destination:'Tierra',objective:'Observar',instrument:'Cámara',observations:[],samples:[],transmittedUnits:1,fuelRemaining:80,energyRemaining:80,integrity:95,elapsedDays:1,score:80,significance:'Simulación',source:'https://science.nasa.gov/earth/'}])));
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:'Informes científicos'}).click();await page.getByRole('heading',{name:'Después de la misión'}).waitFor();
 await page.getByLabel('El registro procede de una fuente real; el escaneo del juego es simulado.').check();await page.getByLabel('Mediante observación remota y sondas.').check();await page.getByLabel('Que una fuente ha registrado un evento; la simulación no lo mide.').check();await page.getByLabel('Acepto guardar estas respuestas voluntarias en este navegador.').check();await page.getByRole('button',{name:'GUARDAR EVALUACIÓN FINAL'}).click();
 await page.getByText('Resultado inicial: 3/3 · resultado final: 3/3.').waitFor();const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'DESCARGAR RESUMEN'}).click()]);const data=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(data.before.score,3);assert.equal(data.after.score,3);assert.equal('answers' in data.before,false);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'BORRAR EVALUACIONES'}).click();await page.getByText('Evaluaciones eliminadas de este navegador.').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('orbital-command-learning-evidence-v1')),null);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await context.close();console.log(`✓ Evaluación voluntaria, consentimiento, descarga y borrado · ${width}px`);
 }}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1)});
