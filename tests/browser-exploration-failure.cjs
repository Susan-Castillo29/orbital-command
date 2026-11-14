const path = require('node:path'); const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const url = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
(async () => {
 const { missions }=await import('../src/data/missions.ts'); const { initialDesign }=await import('../src/systems/engineering.ts');
 const { createTransit, advanceTransit, resolveTransitDecision }=await import('../src/systems/transit.ts');
 const earth=missions.find(item=>item.id==='earth'); const start=createTransit(earth,initialDesign,0);
 const middle=resolveTransitDecision(advanceTransit(start,start.durationDays,initialDesign),'fuel');
 const state={...advanceTransit(middle,start.durationDays,initialDesign),energy:0.1};
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 try {for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.addInitScript(({design,state})=>{ localStorage.setItem('orbital-command-operations-guide-v1','done'); localStorage.setItem('orbital-command-visual-guide-v1','done'); localStorage.setItem('orbital-command-first-look-v1','done'); localStorage.setItem('orbital-command-transit-v1-earth',JSON.stringify({design,launchDay:0,state})); },{design:initialDesign,state});
  const page=await context.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle'}); await page.getByRole('button',{name:'Explore · Prepare exploration'}).click();
  await page.getByRole('button',{name:/CONFIRM CONFIGURATION/}).click(); await page.getByRole('button',{name:/ENTER ORBIT OF EARTH/}).click();
  const dialog=page.getByRole('alertdialog',{name:'Mission failed'}); await dialog.waitFor();
  await dialog.getByText(/Orbital energy is insufficient/).waitFor();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const accessibility = await page.evaluate(async () => (await axe.run('[role=\"alertdialog\"]', {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(item => item.id));
  assert.deepEqual(accessibility, []);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('orbital-command-failed-attempts-v1')||'[]').some(item=>item.phase==='exploration'));
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); assert.equal(await dialog.evaluate((element)=>element.contains(document.activeElement)),true);
  await dialog.getByRole('button',{name:'RETURN TO OPERATIONS'}).click(); await page.getByRole('button',{name:'Science reports'}).click();
  await page.locator('.failed-attempts summary').first().click(); await page.getByText(/Orbital energy was insufficient to send data/).waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'DOWNLOAD ANALYSIS'}).click()]); assert.equal(download.suggestedFilename(),'orbital-earth-failure.txt');
  assert.deepEqual(errors,[]); await context.close(); console.log(`Exploration failure, keyboard focus and report · ${width}px`);
 }} finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
