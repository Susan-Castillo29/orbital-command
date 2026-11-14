/* Automated checks complement, but do not replace, testing with disabled users. */
const path=require('node:path');const assert=require('node:assert/strict');
const browserTools=path.resolve(__dirname,'../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools,'browsers');
const {chromium}=require(process.env.ORBITAL_PLAYWRIGHT_MODULE||path.join(browserTools,'node_modules/playwright'));
const url=process.env.ORBITAL_TEST_URL||'http://127.0.0.1:4174/';
(async()=>{const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});try{for(const width of [1440,390])for(const theme of ['dark','light']){
 const context=await browser.newContext({viewport:{width,height:900}});await context.addInitScript(theme=>{localStorage.setItem('orbital-command-operations-guide-v1','done');localStorage.setItem('orbital-command-theme',theme);},theme);const page=await context.newPage();await page.goto(url,{waitUntil:'networkidle'});
 async function scan(name){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const results=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));const violations=results.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));assert.deepEqual(violations,[],`${name} ${width}px ${theme}: ${JSON.stringify(violations)}`);}
 await scan('operations');await page.getByRole('button',{name:'PREPARAR MISIÓN'}).click();await page.getByRole('button',{name:/DISEÑAR MISIÓN/}).click();await page.getByRole('heading',{name:'Diseña la misión'}).waitFor();await scan('engineering');await page.getByRole('button',{name:'Informes científicos'}).click();await page.getByRole('heading',{name:'Evaluación educativa voluntaria'}).waitFor();await scan('reports');await context.close();console.log(`✓ axe WCAG 2 A/AA and 2.1 A/AA · ${width}px · ${theme}`);
 }}finally{await browser.close()}})().catch(error=>{console.error(error.message);process.exit(1)});
