// Supabase Edge API for ORBITAL DEVELOPERS. The service role key stays on Supabase.
const encoder = new TextEncoder();
const json = (value: unknown, status = 200, headers: HeadersInit = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});
const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);
const clean = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max) : '';
const hex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const digest = async (value: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
const randomToken = () => { const bytes = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''); };

const templates = [
  { id: 'scientific-exploration', name: 'Exploración científica', signals: ['ciencia', 'investigación', 'observación', 'datos'] },
  { id: 'environmental-conservation', name: 'Conservación ambiental', signals: ['conservación', 'océano', 'marino', 'ambiente', 'biodiversidad'] },
  { id: 'collaborative-challenge', name: 'Reto colaborativo', signals: ['equipo', 'comunidad', 'colaboración', 'colectivo'] },
  { id: 'learning-missions', name: 'Aprendizaje por misiones', signals: [] },
];
const capabilities = [
  { id: 'exploration-3d', name: 'Exploración 3D', status: 'available', description: 'Escenarios solares y de exploración reutilizables.' },
  { id: 'missions', name: 'Misiones y objetivos', status: 'available', description: 'Estructuras educativas con objetivos y progreso.' },
  { id: 'roles', name: 'Roles cooperativos', status: 'available', description: 'Responsabilidades sugeridas para equipos.' },
  { id: 'science', name: 'Visualización científica', status: 'available', description: 'Representaciones didácticas; los resultados generados son propuestas.' },
  { id: 'reports', name: 'Informes', status: 'available', description: 'Resultados de aprendizaje e indicadores sugeridos.' },
  { id: 'cooperation', name: 'Experiencias cooperativas', status: 'experimental', description: 'La propuesta externa no crea por sí misma una sesión multijugador.' },
];

function validate(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return 'El cuerpo debe ser un objeto JSON.';
  const allowed = ['name', 'teamName', 'description', 'problem', 'objectives', 'audience', 'topic', 'learningGoals', 'sourceText', 'visibility', 'publishConsent'];
  if (Object.keys(input).some((key) => !allowed.includes(key))) return 'El cuerpo contiene campos no admitidos.';
  const fields: Record<string, [string, number, number]> = {
    name: ['Nombre', 1, 120], teamName: ['Equipo', 1, 120], description: ['Descripción', 25, 5000],
    problem: ['Problema', 1, 3000], audience: ['Público objetivo', 1, 200], topic: ['Área temática', 1, 120], learningGoals: ['Aprendizaje esperado', 1, 2000],
  };
  for (const [key, [label, min, max]] of Object.entries(fields)) {
    const value = clean(input[key], max);
    if (value.length < min) return `${label}: ${key === 'description' ? 'debe tener al menos 25 caracteres.' : 'este campo es obligatorio.'}`;
    input[key] = value;
  }
  if (!Array.isArray(input.objectives)) return 'Añade al menos un objetivo.';
  input.objectives = input.objectives.slice(0, 8).map((item: unknown) => clean(item, 300)).filter(Boolean);
  if (!input.objectives.length) return 'Añade al menos un objetivo.';
  if (input.sourceText != null && (typeof input.sourceText !== 'string' || input.sourceText.length > 65536)) return 'El documento supera el límite de 64 KB.';
  if (!['private', 'public', 'unlisted'].includes(input.visibility)) return 'Privacidad inválida.';
  if (input.visibility === 'public' && input.publishConsent !== true) return 'Confirma expresamente que autorizas publicar este proyecto.';
  return null;
}

function makeProposal(project: any) {
  const corpus = `${project.topic} ${project.problem} ${project.description}`.toLocaleLowerCase();
  const template = templates.find((item) => item.signals.some((signal) => corpus.includes(signal))) || templates.at(-1)!;
  const missions = project.objectives.slice(0, 5).map((objective: string, index: number) => ({
    id: `mission-${index + 1}`, title: `Fase ${index + 1}: ${objective.slice(0, 72)}`,
    activity: index === 0 ? 'Explora la información disponible y registra una observación.' : 'Compara evidencias y documenta una decisión del equipo.',
    challenge: 'Justificar la respuesta con las fuentes que aporte el equipo.',
    individualObjective: index % 2 === 0 ? 'Registrar una observación verificable.' : 'Explicar una decisión usando evidencia.',
    collectiveObjective: objective, progressIndicator: 'Actividades documentadas por el equipo',
  }));
  const known = [project.problem, project.description, project.learningGoals, ...project.objectives].join(' ').toLowerCase();
  const missingInformation = ['fuentes o referencias', 'criterios de evaluación', 'indicadores medibles'].filter((label) => !known.includes(label.split(' ')[0]));
  return {
    version: '1.0', generatedAt: new Date().toISOString(), generator: 'orbital-rule-based-v1', isAI: false,
    title: `${project.name}: ${template.name}`,
    description: `Propuesta educativa basada en el contexto proporcionado por ${project.teamName}. Las actividades son ideas de diseño, no resultados científicos.`,
    narrative: `El equipo investiga «${project.problem}» mediante actividades de ${project.topic}. Las conclusiones deben apoyarse en las fuentes seleccionadas por el equipo.`,
    primaryObjective: project.objectives[0], template: { id: template.id, name: template.name }, missions,
    roles: [
      { id: 'planner', name: 'Planificación', objective: 'Organizar las fases y acordar criterios de avance.' },
      { id: 'science', name: 'Investigación', objective: 'Revisar fuentes y registrar evidencias.' },
      { id: 'engineering', name: 'Diseño', objective: 'Proponer y documentar una solución o actividad.' },
      { id: 'communications', name: 'Comunicaciones', objective: 'Compartir hallazgos y explicar decisiones.' },
    ],
    learningOutcomes: [project.learningGoals], evaluationCriteria: ['Trazabilidad de las fuentes aportadas.', 'Claridad al explicar decisiones.', 'Participación y registro de avances.'],
    expectedResults: 'Resultados de aprendizaje por validar con el equipo del proyecto; no representan evidencia empírica.', missingInformation,
  };
}

function publicProject(row: any) {
  return { id: row.id, name: row.name, teamName: row.team_name, description: row.description, problem: row.problem,
    objectives: row.objectives, audience: row.audience, topic: row.topic, learningGoals: row.learning_goals,
    visibility: row.visibility, proposal: row.proposal, createdAt: row.created_at, preview: true };
}

function appBase(request: Request) {
  const configured = Deno.env.get('ORBITAL_APP_URL')?.trim();
  if (configured) return new URL(configured);
  const origin = request.headers.get('origin');
  if (origin) return new URL(origin);
  throw new Error('Configura ORBITAL_APP_URL en los secretos de Supabase para crear enlaces de vista previa.');
}

async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const configuredOrigins = (Deno.env.get('ORBITAL_ALLOWED_ORIGINS') || '').split(',').map((value) => value.trim()).filter(Boolean);
  const origin = request.headers.get('origin');
  if (origin && configuredOrigins.length && !configuredOrigins.includes(origin)) return fail(403, 'origin_denied', 'Origen no permitido.');
  const corsHeaders: Record<string, string> = origin ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, apikey, Content-Type', 'Access-Control-Max-Age': '600' } });
  const path = url.pathname.slice(url.pathname.indexOf('/api/v1/') >= 0 ? url.pathname.indexOf('/api/v1/') : url.pathname.indexOf('/mcp') >= 0 ? url.pathname.indexOf('/mcp') : 0);
  const baseHeaders = { ...corsHeaders };
  if (path === '/api/v1/capabilities' && request.method === 'GET') return json({ name: 'ORBITAL GAMIFICATION API', version: 'v1', proposalGenerator: 'deterministic-rule-based', capabilities, persistence: 'supabase', writeAuthentication: 'Supabase user session', publicPreviewRead: true }, 200, baseHeaders);
  if (path === '/api/v1/templates' && request.method === 'GET') return json({ templates: templates.map(({ id, name }) => ({ id, name, description: `Plantilla reutilizable: ${name}.` })) }, 200, baseHeaders);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return fail(503, 'service_unavailable', 'Configura los secretos administrados de Supabase para esta función.');
  const rest = async (method: string, query: string, body?: unknown) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/orbital_external_projects${query}`, {
      method, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Accept: 'application/json', ...(method === 'POST' ? { Prefer: 'return=representation' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(response.status === 404 ? 'Proyecto no encontrado.' : 'No se pudo consultar o guardar el proyecto.');
    return text ? JSON.parse(text) : [];
  };
  const projectFields = 'id,name,team_name,description,problem,objectives,audience,topic,learning_goals,source_text,visibility,proposal,share_token_hash,owner_user_id,created_at,updated_at';
  const idMatch = path.match(/^\/api\/v1\/projects\/([0-9a-f-]{36})(?:\/(proposal|preview|share|visibility))?$/i);
  const previewMatch = path.match(/^\/api\/v1\/previews\/([0-9a-f-]{36})$/i);
  if (previewMatch && request.method === 'GET') {
    const id = encodeURIComponent(previewMatch[1]);
    const rows = await rest('GET', `?id=eq.${id}&select=${projectFields}&limit=1`);
    const row = rows[0];
    if (!row || row.visibility === 'private') return fail(404, 'not_found', 'Vista previa no disponible.');
    const token = url.searchParams.get('token') || '';
    if (row.visibility === 'unlisted' && (!token || await digest(token) !== row.share_token_hash)) return fail(404, 'not_found', 'Vista previa no disponible.');
    return json(publicProject(row), 200, { ...baseHeaders, ...(row.visibility === 'unlisted' ? { 'Referrer-Policy': 'no-referrer' } : {}) });
  }
  if (request.method === 'POST' && path === '/api/v1/projects') {
    let body: any;
    try { const text = await request.text(); if (text.length > 128 * 1024) return fail(413, 'payload_too_large', 'El cuerpo supera el límite de 128 KB.'); body = JSON.parse(text); } catch { return fail(400, 'invalid_request', 'JSON inválido.'); }
    const invalid = validate(body); if (invalid) return fail(400, 'invalid_request', invalid);
    const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!bearer) return fail(401, 'unauthorized', 'Inicia sesión con tu cuenta para guardar el proyecto.');
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: request.headers.get('apikey') || '', Authorization: `Bearer ${bearer}` } });
    if (!userResponse.ok) return fail(401, 'unauthorized', 'La sesión expiró. Inicia sesión otra vez.');
    const user = await userResponse.json();
    const project = { name: body.name, teamName: body.teamName, description: body.description, problem: body.problem,
      objectives: body.objectives, audience: body.audience, topic: body.topic, learningGoals: body.learningGoals, sourceText: body.sourceText || '' };
    const token = body.visibility === 'unlisted' ? randomToken() : null;
    const row = { owner_user_id: user.id, name: project.name, team_name: project.teamName, description: project.description, problem: project.problem,
      objectives: project.objectives, audience: project.audience, topic: project.topic, learning_goals: project.learningGoals, source_text: project.sourceText || null,
      visibility: body.visibility, proposal: makeProposal(project), share_token_hash: token ? await digest(token) : null };
    const inserted = await rest('POST', '?select=id,name,visibility,proposal,created_at', row);
    if (!inserted[0]) return fail(502, 'storage_error', 'Supabase no confirmó el almacenamiento del proyecto.');
    return json({ project: { id: inserted[0].id, name: inserted[0].name, visibility: inserted[0].visibility, proposal: inserted[0].proposal, createdAt: inserted[0].created_at }, ...(token ? { shareToken: token } : {}) }, 201, baseHeaders);
  }
  if (!idMatch) return fail(404, 'not_found', 'Ruta API desconocida.');
  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return fail(401, 'unauthorized', 'Inicia sesión con tu cuenta para gestionar el proyecto.');
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: request.headers.get('apikey') || '', Authorization: `Bearer ${bearer}` } });
  if (!userResponse.ok) return fail(401, 'unauthorized', 'La sesión expiró. Inicia sesión otra vez.');
  const user = await userResponse.json();
  const id = encodeURIComponent(idMatch[1]);
  const rows = await rest('GET', `?id=eq.${id}&owner_user_id=eq.${encodeURIComponent(user.id)}&select=${projectFields}&limit=1`);
  const row = rows[0];
  if (!row) return fail(404, 'not_found', 'Proyecto no encontrado.');
  const action = idMatch[2];
  if (request.method === 'GET' && !action) return json(publicProject(row), 200, baseHeaders);
  if (request.method === 'POST' && action === 'preview') {
    const token = randomToken();
    await rest('PATCH', `?id=eq.${id}&owner_user_id=eq.${encodeURIComponent(user.id)}`, { visibility: 'unlisted', share_token_hash: await digest(token), updated_at: new Date().toISOString() });
    const base = appBase(request);
    const link = `${base.origin}${base.pathname.replace(/\/$/, '')}/#/preview/${encodeURIComponent(row.id)}?token=${encodeURIComponent(token)}`;
    return json({ projectId: row.id, visibility: 'unlisted', url: link }, 200, baseHeaders);
  }
  if (request.method === 'DELETE' && action === 'share') {
    await rest('PATCH', `?id=eq.${id}&owner_user_id=eq.${encodeURIComponent(user.id)}`, { visibility: 'private', share_token_hash: null, updated_at: new Date().toISOString() });
    return json({ projectId: row.id, visibility: 'private', revoked: true }, 200, baseHeaders);
  }
  if (request.method === 'PATCH' && action === 'visibility') {
    let body: any; try { body = await request.json(); } catch { return fail(400, 'invalid_request', 'JSON inválido.'); }
    if (!['private', 'public'].includes(body?.visibility)) return fail(400, 'invalid_visibility', 'Usa private o public.');
    if (body.visibility === 'public' && body.publishConsent !== true) return fail(400, 'consent_required', 'Confirma que autorizas publicar el proyecto.');
    await rest('PATCH', `?id=eq.${id}&owner_user_id=eq.${encodeURIComponent(user.id)}`, { visibility: body.visibility, share_token_hash: null, updated_at: new Date().toISOString() });
    return json({ projectId: row.id, visibility: body.visibility }, 200, baseHeaders);
  }
  if (request.method === 'POST' && action === 'proposal') {
    const proposal = makeProposal({ name: row.name, teamName: row.team_name, description: row.description, problem: row.problem, objectives: row.objectives, audience: row.audience, topic: row.topic, learningGoals: row.learning_goals });
    await rest('PATCH', `?id=eq.${id}&owner_user_id=eq.${encodeURIComponent(user.id)}`, { proposal, updated_at: new Date().toISOString() });
    return json({ projectId: row.id, proposal }, 200, baseHeaders);
  }
  return fail(405, 'method_not_allowed', 'Método no permitido para este recurso.');
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  try {
    const response = await handler(request);
    if (!origin) return response;
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.error('orbital-gamification request failed', error);
    const response = fail(502, 'storage_error', 'No se pudo completar la operación.');
    if (!origin) return response;
    const headers = new Headers(response.headers); headers.set('Access-Control-Allow-Origin', origin); headers.set('Vary', 'Origin');
    return new Response(response.body, { status: response.status, headers });
  }
});
