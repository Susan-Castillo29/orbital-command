const path = require('node:path');
const fs = require('node:fs/promises');
const assert = require('node:assert/strict');
const browserTools = path.resolve(__dirname, '../../../../../infraestructura/herramientas-locales/browser');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(browserTools, 'browsers');
const { chromium } = require(process.env.ORBITAL_PLAYWRIGHT_MODULE || path.join(browserTools, 'node_modules/playwright'));
const appUrl = process.env.ORBITAL_TEST_URL || 'http://127.0.0.1:4174/';
const appOrigin = new URL(appUrl).origin;
const apiOrigin = process.env.ORBITAL_TEST_API_URL || 'https://api.orbital.test';
const distRoot = path.resolve(__dirname, '../dist');
const previewId = '6ed5d741-5e58-4db4-ae69-a6fae05c4210';
const proposal = { version: '1.0', isAI: false, title: 'Reef learning mission', narrative: 'A proposal based on team context.', primaryObjective: 'Record observations', template: { id: 'environmental-conservation', name: 'Environmental conservation' }, missions: [{ id: 'mission-1', title: 'Phase 1: Record observations', activity: 'Explore and record an observation.', challenge: 'Support it with sources.', collectiveObjective: 'Record observations' }], roles: [{ id: 'science', name: 'Research', objective: 'Review evidence.' }], learningOutcomes: ['Distinguish observations and conclusions.'], expectedResults: 'Learning outcomes need team review.', missingInformation: ['sources'] };
const preview = { id: previewId, name: 'Reef Observatory', teamName: 'Ocean Classroom', description: 'An educational project to observe reef ecosystems.', problem: 'How do reefs change?', objectives: ['Record observations'], audience: 'Students', topic: 'Marine conservation', learningGoals: 'Separate observation and conclusion.', proposal, createdAt: new Date().toISOString(), preview: true };

async function routeApp(context) {
  await context.route(`${appOrigin}/**`, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const relative = pathname.replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(distRoot, relative);
    if (file !== distRoot && !file.startsWith(`${distRoot}${path.sep}`)) return route.fulfill({ status: 403, body: 'Forbidden' });
    try { return route.fulfill({ status: 200, contentType: path.extname(file) === '.js' ? 'text/javascript' : path.extname(file) === '.css' ? 'text/css' : path.extname(file) === '.json' ? 'application/json' : 'text/html', body: await fs.readFile(file) }); }
    catch { return route.fulfill({ status: 404, body: 'Not found' }); }
  });
  await context.route(`${apiOrigin}/**`, async (route) => {
    const request = route.request(), pathname = new URL(request.url()).pathname;
    if (pathname.endsWith('/capabilities')) return route.fulfill({ json: { name: 'ORBITAL GAMIFICATION API', version: 'v1', capabilities: [], persistence: 'supabase' } });
    if (pathname.endsWith('/templates')) return route.fulfill({ json: { templates: [{ id: 'environmental-conservation', name: 'Environmental conservation', description: 'Reusable template.' }] } });
    if (pathname === '/api/v1/projects' && request.method() === 'POST') return route.fulfill({ status: 201, json: { project: { id: previewId, name: preview.name, visibility: 'private', proposal } } });
    if (pathname === `/api/v1/projects/${previewId}/preview`) return route.fulfill({ json: { projectId: previewId, visibility: 'unlisted', url: `${appOrigin}/#/preview/${previewId}?token=readonly-token` } });
    if (pathname === `/api/v1/previews/${previewId}`) return route.fulfill({ json: preview });
    if (pathname === `/api/v1/projects/${previewId}/visibility`) return route.fulfill({ json: { projectId: previewId, visibility: 'public' } });
    if (pathname === `/api/v1/projects/${previewId}/share`) return route.fulfill({ json: { projectId: previewId, visibility: 'private', revoked: true } });
    return route.fulfill({ status: 404, json: { error: { message: 'Mock endpoint not found' } } });
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const host = await browser.newContext({ viewport: { width: 1440, height: 980 } });
    await host.addInitScript(() => { localStorage.setItem('orbital-command-language', 'en'); localStorage.setItem('orbital-command-operations-guide-v1', 'done'); localStorage.setItem('orbital-command-visual-guide-v1', 'done'); });
    await routeApp(host);
    const page = await host.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(appUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'ORBITAL DEVELOPERS', exact: true }).click();
    await page.getByRole('heading', { name: /YOUR PROJECT CAN BECOME AN INTERACTIVE EXPERIENCE/ }).waitFor();
    await page.getByLabel('WRITE API KEY').fill('test-api-key-for-browser-flow-123456789');
    await page.getByLabel('PROJECT NAME').fill(preview.name);
    await page.getByLabel('TEAM OR AUTHOR').fill(preview.teamName);
    await page.getByLabel('TARGET AUDIENCE').fill(preview.audience);
    await page.getByLabel('TOPIC').fill(preview.topic);
    await page.getByLabel('PROJECT DESCRIPTION').fill(preview.description);
    await page.getByLabel('PROBLEM IT ADDRESSES').fill(preview.problem);
    await page.getByLabel(/OBJECTIVES/).fill(preview.objectives.join('; '));
    await page.getByLabel(/WHAT SHOULD USERS LEARN/).fill(preview.learningGoals);
    await page.getByRole('button', { name: /GENERATE PRIVATE DRAFT/ }).click();
    await page.getByRole('heading', { name: proposal.title }).waitFor();
    await page.getByRole('button', { name: /CREATE READ-ONLY LINK/ }).click();
    await page.getByRole('link', { name: /readonly-token/ }).waitFor();
    const sharedUrl = await page.getByRole('link', { name: /readonly-token/ }).getAttribute('href');
    assert.ok(sharedUrl.includes(`/\#/preview/${previewId}?token=readonly-token`));

    const guest = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await guest.addInitScript(() => { localStorage.setItem('orbital-command-language', 'en'); localStorage.setItem('orbital-command-operations-guide-v1', 'done'); localStorage.setItem('orbital-command-visual-guide-v1', 'done'); });
    await routeApp(guest);
    const secondDevice = await guest.newPage();
    await secondDevice.goto(sharedUrl, { waitUntil: 'networkidle' });
    await secondDevice.getByRole('heading', { name: preview.name }).waitFor();
    await secondDevice.getByRole('heading', { name: /Explore a proposal mission/ }).waitFor();
    await secondDevice.getByRole('button', { name: /RECORD PARTICIPATION/ }).click();
    await secondDevice.getByText('1/1 · DEMO MISSIONS').waitFor();
    assert.deepEqual(errors, []);
    await guest.close(); await host.close();
    console.log('✓ ORBITAL DEVELOPERS: private draft → read-only link → second browser context → interactive preview');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exit(1); });
