import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const MAX_BODY = 128 * 1024;
const MAX_FILE = 64 * 1024;
const CAPABILITIES = [
  { id: 'exploration-3d', name: 'Exploración 3D', status: 'available', description: 'Escenarios solares y de exploración reutilizables.' },
  { id: 'missions', name: 'Misiones y objetivos', status: 'available', description: 'Estructuras educativas con objetivos y progreso.' },
  { id: 'roles', name: 'Roles cooperativos', status: 'available', description: 'Responsabilidades sugeridas para equipos.' },
  { id: 'science', name: 'Visualización científica', status: 'available', description: 'Representaciones didácticas; los resultados generados son propuestas.' },
  { id: 'reports', name: 'Informes', status: 'available', description: 'Resultados de aprendizaje e indicadores sugeridos.' },
  { id: 'cooperation', name: 'Experiencias cooperativas', status: 'experimental', description: 'El juego dispone de equipos; la propuesta externa no crea una sesión multijugador.' },
];
const TEMPLATES = [
  { id: 'scientific-exploration', name: 'Exploración científica', signals: ['ciencia', 'investigación', 'observación', 'datos'] },
  { id: 'environmental-conservation', name: 'Conservación ambiental', signals: ['conservación', 'océano', 'marino', 'ambiente', 'biodiversidad'] },
  { id: 'collaborative-challenge', name: 'Reto colaborativo', signals: ['equipo', 'comunidad', 'colaboración', 'colectivo'] },
  { id: 'learning-missions', name: 'Aprendizaje por misiones', signals: [] },
];
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const constantEqual = (left, right) => {
  const a = Buffer.from(left || '', 'hex'), b = Buffer.from(right || '', 'hex');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

export function validateProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'El cuerpo debe ser un objeto JSON.' };
  const allowed = new Set(['name', 'teamName', 'description', 'problem', 'objectives', 'audience', 'topic', 'learningGoals', 'sourceText', 'visibility', 'publishConsent', '_ownerKey']);
  if (Object.keys(input).some((key) => !allowed.has(key))) return { error: 'El cuerpo contiene campos no admitidos.' };
  const project = {
    name: clean(input.name, 120), teamName: clean(input.teamName, 120), description: clean(input.description, 5000),
    problem: clean(input.problem, 3000), objectives: Array.isArray(input.objectives) ? input.objectives.slice(0, 8).map((v) => clean(v, 300)).filter(Boolean) : [],
    audience: clean(input.audience, 200), topic: clean(input.topic, 120), learningGoals: clean(input.learningGoals, 2000),
    sourceText: clean(input.sourceText, MAX_FILE), visibility: input.visibility,
  };
  for (const [key, label] of [['name', 'Nombre'], ['teamName', 'Equipo'], ['description', 'Descripción'], ['problem', 'Problema'], ['audience', 'Público objetivo'], ['topic', 'Área temática'], ['learningGoals', 'Aprendizaje esperado']]) {
    if (!project[key]) return { error: `${label}: este campo es obligatorio.` };
  }
  if (project.description.length < 25) return { error: 'La descripción debe tener al menos 25 caracteres.' };
  if (!project.objectives.length) return { error: 'Añade al menos un objetivo (separa varios con punto y coma).' };
  if (!['private', 'public', 'unlisted'].includes(project.visibility)) return { error: 'Privacidad inválida.' };
  if (project.visibility === 'public' && input.publishConsent !== true) return { error: 'Confirma expresamente que autorizas publicar este proyecto.' };
  if (input.publishConsent !== undefined && typeof input.publishConsent !== 'boolean') return { error: 'La autorización de publicación no es válida.' };
  return { project };
}

export function generateProposal(project) {
  const corpus = `${project.topic} ${project.problem} ${project.description}`.toLocaleLowerCase();
  const template = TEMPLATES.find((item) => item.signals.some((signal) => corpus.includes(signal))) || TEMPLATES.at(-1);
  const objectives = project.objectives.slice(0, 5);
  const missions = objectives.map((objective, index) => ({
    id: `mission-${index + 1}`, title: `Fase ${index + 1}: ${objective.slice(0, 72)}`,
    activity: index === 0 ? 'Explora la información disponible y registra una observación.' : 'Compara evidencias y documenta una decisión del equipo.',
    challenge: 'Justificar la respuesta con las fuentes que aporte el equipo.',
    individualObjective: index % 2 === 0 ? 'Registrar una observación verificable.' : 'Explicar una decisión usando evidencia.',
    collectiveObjective: objective, progressIndicator: 'Actividades documentadas por el equipo',
  }));
  const known = [project.problem, project.description, project.learningGoals, ...objectives].join(' ').toLowerCase();
  const missingInformation = ['fuentes o referencias', 'criterios de evaluación', 'indicadores medibles'].filter((label) => !known.includes(label.split(' ')[0]));
  return {
    version: '1.0', generatedAt: new Date().toISOString(), generator: 'orbital-rule-based-v1', isAI: false,
    title: `${project.name}: ${template.name}`, description: `Propuesta educativa basada en el contexto proporcionado por ${project.teamName}. Las actividades son ideas de diseño, no resultados científicos.`,
    narrative: `El equipo investiga «${project.problem}» mediante actividades de ${project.topic}. Las conclusiones deben apoyarse en las fuentes seleccionadas por el equipo.`,
    primaryObjective: objectives[0], template: { id: template.id, name: template.name },
    missions, roles: [
      { id: 'planner', name: 'Planificación', objective: 'Organizar las fases y acordar criterios de avance.' },
      { id: 'science', name: 'Investigación', objective: 'Revisar fuentes y registrar evidencias.' },
      { id: 'engineering', name: 'Diseño', objective: 'Proponer y documentar una solución o actividad.' },
      { id: 'communications', name: 'Comunicaciones', objective: 'Compartir hallazgos y explicar decisiones.' },
    ],
    learningOutcomes: [project.learningGoals], evaluationCriteria: ['Trazabilidad de las fuentes aportadas.', 'Claridad al explicar decisiones.', 'Participación y registro de avances.'],
    expectedResults: 'Resultados de aprendizaje por validar con el equipo del proyecto; no representan evidencia empírica.', missingInformation,
  };
}

export const getPlatformCapabilities = () => ({ name: 'ORBITAL GAMIFICATION API', version: 'v1', proposalGenerator: 'deterministic-rule-based', capabilities: CAPABILITIES, persistence: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'not-configured', writeAuthentication: 'Bearer API key', publicPreviewRead: true });
export const getProjectTemplates = () => ({ templates: TEMPLATES.map(({ id, name }) => ({ id, name, description: `Plantilla reutilizable: ${name}.` })) });

function send(res, status, value, headers = {}) {
  res.statusCode = status;
  for (const [key, value] of Object.entries({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })) res.setHeader(key, value);
  res.end(value === null ? '' : JSON.stringify(value));
}
function error(res, status, code, message) { return send(res, status, { error: { code, message } }); }
async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw Object.assign(new Error('El cuerpo supera el límite de 128 KB.'), { status: 413 }); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('JSON inválido.'), { status: 400 }); }
}
function backendConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('El almacenamiento no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor.'), { status: 503 });
  let parsed; try { parsed = new URL(url); } catch { throw Object.assign(new Error('SUPABASE_URL no es válida.'), { status: 503 }); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname.endsWith('.supabase.co')) throw Object.assign(new Error('SUPABASE_URL debe ser el origen HTTPS del proyecto.'), { status: 503 });
  return { origin: parsed.origin, key };
}
async function db(method, path, body, prefer = '') {
  const { origin, key } = backendConfig();
  const response = await fetch(`${origin}/rest/v1/orbital_external_projects${path}`, { method, signal: AbortSignal.timeout(10000), headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(prefer ? { Prefer: prefer } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text();
  if (!response.ok) throw Object.assign(new Error(response.status === 404 ? 'Proyecto no encontrado.' : 'No se pudo guardar o consultar el proyecto.'), { status: response.status === 404 ? 404 : response.status === 409 ? 409 : 502 });
  return text ? JSON.parse(text) : [];
}
const selectFields = 'id,name,team_name,description,problem,objectives,audience,topic,learning_goals,source_text,visibility,proposal,share_token_hash,created_at,updated_at';
async function getProject(id, req) { const owner = req ? `&owner_key_hash=eq.${hash(req.headers.authorization?.slice(7) || '')}` : ''; return (await db('GET', `?id=eq.${encodeURIComponent(id)}${owner}&select=${selectFields},owner_key_hash&limit=1`))[0] || null; }
function publicProject(project) {
  if (!project) return null;
  return { id: project.id, name: project.name, teamName: project.team_name, description: project.description, problem: project.problem, objectives: project.objectives, audience: project.audience, topic: project.topic, learningGoals: project.learning_goals, visibility: project.visibility, proposal: project.proposal, createdAt: project.created_at, preview: true };
}
function authorized(req) {
  const expected = (process.env.ORBITAL_API_KEYS || process.env.ORBITAL_API_KEY || '').split(',').map((key) => key.trim()).filter((key) => key.length >= 24);
  if (!expected.length) return false;
  const supplied = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] || '';
  const a = Buffer.from(supplied);
  return expected.some((key) => { const b = Buffer.from(key); return a.length === b.length && timingSafeEqual(a, b); });
}
const authRequired = (req, res) => authorized(req) || error(res, process.env.ORBITAL_API_KEYS || process.env.ORBITAL_API_KEY ? 401 : 503, process.env.ORBITAL_API_KEYS || process.env.ORBITAL_API_KEY ? 'unauthorized' : 'api_not_configured', process.env.ORBITAL_API_KEYS || process.env.ORBITAL_API_KEY ? 'Se requiere una API key válida.' : 'La API de escritura no está configurada en este servidor.');
const rateMap = new Map();
function rateLimited(req) { const ip = req.socket.remoteAddress || 'unknown', now = Date.now(), recent = (rateMap.get(ip) || []).filter((time) => now - time < 60000); if (recent.length >= 30) return true; recent.push(now); rateMap.set(ip, recent); if (rateMap.size > 1000) rateMap.delete(rateMap.keys().next().value); return false; }
function makeShareUrl(id, token, req) { const base = process.env.ORBITAL_APP_URL || `http://${req.headers.host || 'localhost'}`; const safeBase = new URL(base); if (!['https:', 'http:'].includes(safeBase.protocol) || safeBase.username || safeBase.password || safeBase.search || safeBase.hash) throw new Error('ORBITAL_APP_URL no es válida.'); const basePath = safeBase.pathname.replace(/\/$/, ''); return `${safeBase.origin}${basePath}/#/preview/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`; }
function pathMatch(path, pattern) { const match = path.match(pattern); return match?.[1] ? decodeURIComponent(match[1]) : null; }

async function createProject(input) {
  const validated = validateProject(input); if (validated.error) throw Object.assign(new Error(validated.error), { status: 400 });
  const project = validated.project, proposal = generateProposal(project), shareToken = project.visibility === 'unlisted' ? randomBytes(32).toString('base64url') : null;
  const row = { id: randomUUID(), owner_key_hash: hash(input._ownerKey), name: project.name, team_name: project.teamName, description: project.description, problem: project.problem, objectives: project.objectives, audience: project.audience, topic: project.topic, learning_goals: project.learningGoals, source_text: project.sourceText || null, visibility: project.visibility, proposal, share_token_hash: shareToken ? hash(shareToken) : null };
  const inserted = await db('POST', '?select=id,name,visibility,proposal,created_at', row, 'return=representation');
  const saved = inserted[0]; if (!saved) throw Object.assign(new Error('No se confirmó el almacenamiento del proyecto.'), { status: 502 });
  return { project: { id: saved.id, name: saved.name, visibility: saved.visibility, proposal: saved.proposal, createdAt: saved.created_at }, ...(shareToken ? { shareToken } : {}) };
}

const mcpProjectSchema = { type: 'object', properties: { name: { type: 'string', minLength: 1, maxLength: 120 }, teamName: { type: 'string', minLength: 1, maxLength: 120 }, description: { type: 'string', minLength: 25, maxLength: 5000 }, problem: { type: 'string', maxLength: 3000 }, objectives: { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', maxLength: 300 } }, audience: { type: 'string', maxLength: 200 }, topic: { type: 'string', maxLength: 120 }, learningGoals: { type: 'string', maxLength: 2000 }, sourceText: { type: 'string', maxLength: MAX_FILE }, visibility: { type: 'string', enum: ['private', 'public', 'unlisted'] }, publishConsent: { type: 'boolean' } }, required: ['name', 'teamName', 'description', 'problem', 'objectives', 'audience', 'topic', 'learningGoals', 'visibility'], additionalProperties: false };
const tools = [
  { name: 'get_platform_capabilities', description: 'Consulta las capacidades y configuración disponibles de ORBITAL COMMAND.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_project_templates', description: 'Lista las plantillas educativas reutilizables.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'submit_project_context', description: 'Registra un contexto de proyecto. Requiere API key y autorización explícita si solicita visibilidad pública.', inputSchema: { type: 'object', properties: { project: mcpProjectSchema }, required: ['project'], additionalProperties: false } },
  { name: 'generate_gamification_proposal', description: 'Genera o regenera una propuesta estructurada para un proyecto propio.', inputSchema: { type: 'object', properties: { project_id: { type: 'string', format: 'uuid' } }, required: ['project_id'], additionalProperties: false } },
  { name: 'create_project_preview', description: 'Crea o activa un enlace de vista previa de solo lectura para un proyecto propio.', inputSchema: { type: 'object', properties: { project_id: { type: 'string', format: 'uuid' } }, required: ['project_id'], additionalProperties: false } },
  { name: 'get_project_preview', description: 'Recupera metadatos de una vista previa pública o una vista privada con API key.', inputSchema: { type: 'object', properties: { project_id: { type: 'string', format: 'uuid' }, token: { type: 'string', maxLength: 128 } }, required: ['project_id'], additionalProperties: false } },
];
function jsonRpcError(id, code, message) { return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }; }
function isAllowedOrigin(req) {
  const origin = req.headers.origin; if (!origin) return true;
  const allow = (process.env.ORBITAL_ALLOWED_ORIGINS || process.env.ORBITAL_APP_URL || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (allow.includes('*')) return false;
  try { const parsed = new URL(origin); return parsed.origin === origin && (allow.includes(parsed.origin) || ['localhost', '127.0.0.1'].includes(parsed.hostname)); } catch { return false; }
}
async function callTool(name, args, req) {
  if (name === 'get_platform_capabilities') return getPlatformCapabilities();
  if (name === 'get_project_templates') return getProjectTemplates();
  if (!authorized(req)) throw Object.assign(new Error('Se requiere una API key válida para esta herramienta.'), { status: 401 });
  if (name === 'submit_project_context') return createProject({ ...args?.project, _ownerKey: req.headers.authorization?.slice(7) || '' });
  if (!/^[0-9a-f-]{36}$/i.test(args?.project_id || '')) throw Object.assign(new Error('project_id debe ser un UUID.'), { status: 400 });
  const project = await getProject(args.project_id, req); if (!project) throw Object.assign(new Error('Proyecto no encontrado.'), { status: 404 });
  if (name === 'generate_gamification_proposal') { const proposal = generateProposal({ name: project.name, teamName: project.team_name, description: project.description, problem: project.problem, objectives: project.objectives, audience: project.audience, topic: project.topic, learningGoals: project.learning_goals }); await db('PATCH', `?id=eq.${encodeURIComponent(project.id)}`, { proposal, updated_at: new Date().toISOString() }); return { projectId: project.id, proposal }; }
  if (name === 'create_project_preview') { const token = randomBytes(32).toString('base64url'); await db('PATCH', `?id=eq.${encodeURIComponent(project.id)}`, { visibility: 'unlisted', share_token_hash: hash(token), updated_at: new Date().toISOString() }); return { projectId: project.id, url: makeShareUrl(project.id, token, req), visibility: 'unlisted' }; }
  if (name === 'get_project_preview') { const allowed = project.visibility === 'public' || (args.token && constantEqual(project.share_token_hash, hash(args.token))); if (!allowed) throw Object.assign(new Error('Vista previa no disponible.'), { status: 404 }); return publicProject(project); }
  throw Object.assign(new Error('Herramienta desconocida.'), { status: -32601 });
}
export async function mcpHandler(req, res, pathname = '/mcp') {
  if (pathname !== '/mcp') return false;
  if (!isAllowedOrigin(req)) { send(res, 403, { error: 'Origen no permitido.' }); return true; }
  if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') { res.writeHead(204, { Allow: 'GET, POST, OPTIONS', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' }).end(); return true; }
  if (rateLimited(req)) { send(res, 429, { error: 'Límite de solicitudes: 30 por minuto.' }); return true; }
  if (req.method === 'GET') { res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Streamable HTTP: GET no ofrece flujo SSE en este servidor.' })); return true; }
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'GET, POST' }).end(); return true; }
  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) { send(res, 415, { error: 'Content-Type debe ser application/json.' }); return true; }
  if (!String(req.headers.accept || '').includes('application/json') || !String(req.headers.accept || '').includes('text/event-stream')) { send(res, 406, { error: 'Accept debe incluir application/json y text/event-stream.' }); return true; }
  try {
    const message = await readBody(req);
    if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') { send(res, 400, jsonRpcError(message?.id, -32600, 'Solicitud JSON-RPC inválida.')); return true; }
    if (message.method === 'notifications/initialized' || message.method === 'notifications/cancelled') { res.writeHead(202).end(); return true; }
    let result;
    if (message.method === 'initialize') result = { protocolVersion: '2025-11-25', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'orbital-gamification', version: '1.0.0' }, instructions: 'Las propuestas organizan el texto recibido y no son dictámenes científicos.' };
    else if (message.method === 'ping') result = {};
    else if (message.method === 'tools/list') result = { tools };
    else if (message.method === 'tools/call') {
      try { const value = await callTool(message.params?.name, message.params?.arguments || {}, req); result = { content: [{ type: 'text', text: JSON.stringify(value) }], structuredContent: value, isError: false }; }
      catch (cause) { result = { content: [{ type: 'text', text: cause.message || 'Error interno.' }], isError: true }; }
    } else { send(res, 200, jsonRpcError(message.id, -32601, 'Método no soportado.')); return true; }
    if (message.id === undefined) { res.writeHead(202).end(); return true; }
    send(res, 200, { jsonrpc: '2.0', id: message.id, result }); return true;
  } catch (cause) { send(res, cause.status || 400, jsonRpcError(null, -32700, cause.message || 'JSON inválido.')); return true; }
}

export async function orbitalHandler(req, res, next = () => send(res, 404, { error: { code: 'not_found', message: 'No encontrado.' } })) {
  let url; try { url = new URL(req.url, 'http://localhost'); } catch { return send(res, 400, { error: { code: 'bad_url', message: 'URL inválida.' } }); }
  if (await mcpHandler(req, res, url.pathname)) return;
  if (!url.pathname.startsWith('/api/v1/')) return next();
  if (rateLimited(req)) return error(res, 429, 'rate_limit', 'Límite de solicitudes: 30 por minuto.');
  if (!isAllowedOrigin(req)) return error(res, 403, 'origin_denied', 'Origen no permitido.');
  if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') { res.writeHead(204, { Allow: 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' }).end(); return; }
  const path = url.pathname;
  if (req.method === 'GET' && path === '/api/v1/capabilities') return send(res, 200, getPlatformCapabilities());
  if (req.method === 'GET' && path === '/api/v1/templates') return send(res, 200, getProjectTemplates());
  try {
    if (req.method === 'POST' && path === '/api/v1/projects') {
      if (!authRequired(req, res)) return;
      const input = await readBody(req); const result = await createProject({ ...input, _ownerKey: req.headers.authorization?.slice(7) || '' }); return send(res, 201, result);
    }
    const previewId = pathMatch(path, /^\/api\/v1\/previews\/([0-9a-f-]{36})$/i);
    if (req.method === 'GET' && previewId) {
      const project = await getProject(previewId); if (!project || project.visibility === 'private') return error(res, 404, 'not_found', 'Vista previa no disponible.');
      const token = url.searchParams.get('token'); if (project.visibility === 'unlisted' && (!token || !constantEqual(project.share_token_hash, hash(token)))) return error(res, 404, 'not_found', 'Vista previa no disponible.');
      return send(res, 200, publicProject(project), project.visibility === 'public' ? { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=60' } : { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    }
    const projectId = pathMatch(path, /^\/api\/v1\/projects\/([0-9a-f-]{36})(?:\/(proposal|preview|share|visibility))?$/i);
    if (!projectId) return error(res, 404, 'not_found', 'Ruta API desconocida.');
    const action = path.match(/^\/api\/v1\/projects\/[0-9a-f-]{36}(?:\/(proposal|preview|share|visibility))?$/i)?.[1];
    if (!authRequired(req, res)) return;
    if (req.method === 'GET' && !action) { const project = await getProject(projectId, req); return project ? send(res, 200, publicProject(project)) : error(res, 404, 'not_found', 'Proyecto no encontrado.'); }
    const project = await getProject(projectId, req); if (!project) return error(res, 404, 'not_found', 'Proyecto no encontrado.');
    if (req.method === 'POST' && action === 'proposal') { const proposal = generateProposal({ name: project.name, teamName: project.team_name, description: project.description, problem: project.problem, objectives: project.objectives, audience: project.audience, topic: project.topic, learningGoals: project.learning_goals }); await db('PATCH', `?id=eq.${encodeURIComponent(project.id)}`, { proposal, updated_at: new Date().toISOString() }); return send(res, 200, { projectId: project.id, proposal }); }
    if (req.method === 'POST' && action === 'preview') { const token = randomBytes(32).toString('base64url'); await db('PATCH', `?id=eq.${encodeURIComponent(project.id)}`, { visibility: 'unlisted', share_token_hash: hash(token), updated_at: new Date().toISOString() }); return send(res, 200, { projectId: project.id, visibility: 'unlisted', url: makeShareUrl(project.id, token, req) }); }
    if (req.method === 'DELETE' && action === 'share') { await db('PATCH', `?id=eq.${encodeURIComponent(project.id)}`, { visibility: 'private', share_token_hash: null, updated_at: new Date().toISOString() }); return send(res, 200, { projectId: project.id, visibility: 'private', revoked: true }); }
    if (req.method === 'PATCH' && action === 'visibility') { const input = await readBody(req); if (!['private', 'public'].includes(input?.visibility)) return error(res, 400, 'invalid_visibility', 'Usa private o public.'); if (input.visibility === 'public' && input.publishConsent !== true) return error(res, 400, 'consent_required', 'Confirma que autorizas publicar el proyecto.'); await db('PATCH', `?id=eq.${encodeURIComponent(project.id)}`, { visibility: input.visibility, share_token_hash: null, updated_at: new Date().toISOString() }); return send(res, 200, { projectId: project.id, visibility: input.visibility }); }
    return error(res, 405, 'method_not_allowed', 'Método no permitido para este recurso.');
  } catch (cause) {
    if (cause.status) return error(res, cause.status, cause.status === 400 ? 'invalid_request' : cause.status === 503 ? 'service_unavailable' : 'request_failed', cause.message);
    console.error('[orbital-api] Request failed:', cause.name || 'Error');
    return error(res, 502, 'storage_error', 'No se pudo completar la operación. Revisa la configuración del almacenamiento.');
  }
}
