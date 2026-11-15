import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { generateProposal, orbitalHandler, validateProject } from '../server/orbital-platform.mjs';

const goodProject = {
  name: 'Aula de biodiversidad', teamName: 'Equipo Azul',
  description: 'Proyecto didáctico para registrar observaciones de biodiversidad local.',
  problem: 'Cómo observar cambios en un ecosistema sin confundir hipótesis y evidencia.',
  objectives: ['Registrar observaciones', 'Comparar fuentes'], audience: 'Estudiantes de secundaria',
  topic: 'Biodiversidad y conservación', learningGoals: 'Distinguir evidencia de interpretación.', visibility: 'private',
};

test('valida estructura, límites y consentimiento de privacidad', () => {
  assert.equal(validateProject(goodProject).error, undefined);
  assert.match(validateProject({ ...goodProject, name: '' }).error, /Nombre/);
  assert.match(validateProject({ ...goodProject, description: 'corta' }).error, /25 caracteres/);
  assert.match(validateProject({ ...goodProject, objectives: [] }).error, /objetivo/);
  assert.match(validateProject({ ...goodProject, unexpected: 'field' }).error, /no admitidos/);
  assert.match(validateProject({ ...goodProject, visibility: 'public' }).error, /Confirma/);
  assert.equal(validateProject({ ...goodProject, visibility: 'public', publishConsent: true }).error, undefined);
});

test('genera propuesta reproducible, con misiones asociadas y disclosure de no-IA', () => {
  const input = validateProject(goodProject).project;
  const a = generateProposal(input), b = generateProposal(input);
  assert.equal(a.title, b.title);
  assert.equal(a.missions.length, input.objectives.length);
  assert.equal(a.roles.length, 4);
  assert.equal(a.isAI, false);
  assert.match(a.expectedResults, /no representan evidencia empírica/);
  assert.equal(a.template.id, 'environmental-conservation');
});

function responseMock() {
  return { statusCode: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key] = value; }, writeHead(code, headers = {}) { this.statusCode = code; Object.assign(this.headers, headers); return this; }, end(body = '') { this.body = body; } };
}
async function invoke(url, { method = 'GET', headers = {}, body = '' } = {}) {
  const req = Readable.from(body ? [Buffer.from(body)] : []); Object.assign(req, { url, method, headers, socket: { remoteAddress: 'test' } });
  const res = responseMock(); await orbitalHandler(req, res, () => res.writeHead(404).end()); return res;
}

test('REST publica capacidades, protege escrituras y valida el origen', async () => {
  delete process.env.ORBITAL_API_KEY; delete process.env.ORBITAL_API_KEYS;
  const capabilities = await invoke('/api/v1/capabilities');
  assert.equal(capabilities.statusCode, 200);
  assert.equal(JSON.parse(capabilities.body).version, 'v1');
  const write = await invoke('/api/v1/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(goodProject) });
  assert.equal(write.statusCode, 503);
  const deniedOrigin = await invoke('/api/v1/capabilities', { headers: { origin: 'https://evil.example' } });
  assert.equal(deniedOrigin.statusCode, 403);
});

test('REST persiste proyectos por propietario y crea un enlace unlisted revocable', async () => {
  const previous = { key: process.env.ORBITAL_API_KEYS, url: process.env.SUPABASE_URL, service: process.env.SUPABASE_SERVICE_ROLE_KEY, app: process.env.ORBITAL_APP_URL, origin: process.env.ORBITAL_ALLOWED_ORIGINS, fetch: globalThis.fetch };
  process.env.ORBITAL_API_KEYS = 'test-orbital-key-which-is-long-enough-123456';
  process.env.SUPABASE_URL = 'https://test-project.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  process.env.ORBITAL_APP_URL = 'https://example.test/orbital-command'; process.env.ORBITAL_ALLOWED_ORIGINS = 'https://example.test';
  const rows = new Map();
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url), filter = parsed.searchParams.get('id')?.replace('eq.', ''), body = options.body ? JSON.parse(options.body) : undefined;
    if (options.method === 'POST') { rows.set(body.id, { ...body, created_at: '2026-11-15T00:00:00.000Z' }); const row = rows.get(body.id); return new Response(JSON.stringify([{ id: row.id, name: row.name, visibility: row.visibility, proposal: row.proposal, created_at: row.created_at }]), { status: 201 }); }
    if (options.method === 'PATCH') { const row = rows.get(filter); Object.assign(row, body); return new Response(null, { status: 204 }); }
    const row = rows.get(filter); return new Response(JSON.stringify(row ? [row] : []), { status: 200 });
  };
  try {
    const created = await invoke('/api/v1/projects', { method: 'POST', headers: { authorization: `Bearer ${process.env.ORBITAL_API_KEYS}`, 'content-type': 'application/json' }, body: JSON.stringify(goodProject) });
    assert.equal(created.statusCode, 201);
    const result = JSON.parse(created.body); const id = result.project.id; const row = rows.get(id);
    assert.equal(row.owner_key_hash.length, 64);
    assert.equal(result.project.owner_key_hash, undefined);
    const shared = await invoke(`/api/v1/projects/${id}/preview`, { method: 'POST', headers: { authorization: `Bearer ${process.env.ORBITAL_API_KEYS}` } });
    assert.equal(shared.statusCode, 200);
    const link = JSON.parse(shared.body).url; assert.match(link, /^https:\/\/example\.test\/orbital-command\/#\/preview\//);
    const token = new URL(link).hash.split('?')[1].replace(/^token=/, '');
    assert.equal(rows.get(id).visibility, 'unlisted'); assert.notEqual(rows.get(id).share_token_hash, token);
    const publicView = await invoke(`/api/v1/previews/${id}?token=${token}`);
    assert.equal(publicView.statusCode, 200);
    assert.equal(JSON.parse(publicView.body).id, id);
    assert.equal(JSON.parse(publicView.body).sourceText, undefined);
    const revoked = await invoke(`/api/v1/projects/${id}/share`, { method: 'DELETE', headers: { authorization: `Bearer ${process.env.ORBITAL_API_KEYS}` } });
    assert.equal(revoked.statusCode, 200);
    const gone = await invoke(`/api/v1/previews/${id}?token=${token}`);
    assert.equal(gone.statusCode, 404);
  } finally {
    globalThis.fetch = previous.fetch;
    for (const [key, value] of [['ORBITAL_API_KEYS', previous.key], ['SUPABASE_URL', previous.url], ['SUPABASE_SERVICE_ROLE_KEY', previous.service], ['ORBITAL_APP_URL', previous.app], ['ORBITAL_ALLOWED_ORIGINS', previous.origin]]) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});

test('MCP ofrece tools/list por Streamable HTTP y exige Accept interoperable', async () => {
  const missingAccept = await invoke('/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
  assert.equal(missingAccept.statusCode, 406);
  const response = await invoke('/mcp', { method: 'POST', headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
  assert.equal(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.jsonrpc, '2.0');
  assert.deepEqual(payload.result.tools.map((tool) => tool.name), ['get_platform_capabilities', 'get_project_templates', 'submit_project_context', 'generate_gamification_proposal', 'create_project_preview', 'get_project_preview']);
  const get = await invoke('/mcp');
  assert.equal(get.statusCode, 405);
});
