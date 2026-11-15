import { useEffect, useMemo, useState, type FormEvent } from 'react';
import SolarSystemScene from './SolarSystemScene';
import { missions } from '../data/missions';
import { cloudClient } from '../collaboration/client';
import type { Session } from '@supabase/supabase-js';
import './orbital-developers.css';

type Language = 'es' | 'en';
type Proposal = { title: string; description: string; narrative: string; primaryObjective: string; template: { name: string }; missions: { id: string; title: string; activity: string; challenge: string; collectiveObjective: string }[]; roles: { name: string; objective: string }[]; learningOutcomes: string[]; expectedResults: string; missingInformation: string[]; isAI: boolean };
type Project = { id: string; name: string; visibility: string; proposal: Proposal };
type Preview = { id: string; name: string; teamName: string; description: string; problem: string; objectives: string[]; audience: string; topic: string; learningGoals: string; proposal: Proposal; createdAt: string; preview: boolean };
type Props = { language: Language; mode: 'developers' | 'preview'; previewId?: string };
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const apiBase = supabaseUrl && publicKey ? `${supabaseUrl}/functions/v1/orbital-gamification` : '';
const copy = (language: Language, es: string, en: string) => language === 'es' ? es : en;

async function api<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!apiBase) throw new Error('La API aún no está configurada en este sitio.');
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(publicKey ? { apikey: publicKey } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.error || `La solicitud falló (${response.status}).`);
  return data as T;
}

export default function OrbitalDevelopers({ language, mode, previewId }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!cloudClient);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeConsent, setStoreConsent] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileText, setFileText] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selectedMissionIndex, setSelectedMissionIndex] = useState(0);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<{ capabilities: { id: string; name: string; status: string; description: string }[] } | null>(null);
  const [templates, setTemplates] = useState<{ templates: { id: string; name: string; description: string }[] } | null>(null);
  const [form, setForm] = useState({ name: '', teamName: '', description: '', problem: '', objectives: '', audience: '', topic: '', learningGoals: '' });
  const previewToken = useMemo(() => { try { return new URLSearchParams(window.location.hash.split('?')[1] || '').get('token') || ''; } catch { return ''; } }, [mode, previewId]);

  useEffect(() => {
    if (!cloudClient) return;
    let active = true;
    void cloudClient.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setAuthReady(true); } }).catch(() => { if (active) setAuthReady(true); });
    const { data } = cloudClient.auth.onAuthStateChange((_event, next) => { if (active) setSession(next); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (mode !== 'developers' || !apiBase) return;
    void Promise.all([api('/api/v1/capabilities', ''), api('/api/v1/templates', '')]).then(([c, t]) => { setCapabilities(c as typeof capabilities); setTemplates(t as typeof templates); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se pudo consultar la API.'));
  }, [mode]);
  useEffect(() => {
    if (mode !== 'preview' || !previewId) return;
    if (!apiBase) { setError(copy(language, 'La API compartida no está configurada. Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY para habilitarla.', 'The shared API is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable it.')); return; }
    let current = true; setBusy(true);
    void api<Preview>(`/api/v1/previews/${encodeURIComponent(previewId)}${previewToken ? `?token=${encodeURIComponent(previewToken)}` : ''}`, '').then((value) => { if (current) setPreview(value); }).catch((cause) => { if (current) setError(cause instanceof Error ? cause.message : 'Vista previa no disponible.'); }).finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [mode, previewId, previewToken]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      if (!session) throw new Error(copy(language, 'Inicia sesión con tu cuenta para guardar el borrador.', 'Sign in to save your draft.'));
      if (!storeConsent) throw new Error(copy(language, 'Confirma que autorizas guardar este contexto en Supabase.', 'Confirm that you consent to saving this context in Supabase.'));
      const result = await api<{ project: Project }>('/api/v1/projects', session.access_token, { method: 'POST', body: JSON.stringify({ ...form, objectives: form.objectives.split(/[;\n]/).map((item) => item.trim()).filter(Boolean), sourceText: fileText, visibility: 'private' }) });
      setProject(result.project); setNotice(copy(language, 'Propuesta guardada como borrador privado. Revísala antes de crear el enlace.', 'Proposal saved as a private draft. Review it before creating a link.'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo procesar el proyecto.'); }
    finally { setBusy(false); }
  }
  async function share() {
    if (!project) return; setBusy(true); setError('');
    try { const result = await api<{ url: string }>(`/api/v1/projects/${project.id}/preview`, session?.access_token || '', { method: 'POST' }); setShareUrl(result.url); setNotice(copy(language, 'Enlace de solo lectura creado. Puedes revocarlo desde la API.', 'Read-only link created. You can revoke it through the API.')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear el enlace.'); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!project || !window.confirm(copy(language, 'Publicar permite que cualquier persona vea este proyecto y su propuesta. ¿Continuar?', 'Publishing lets anyone view this project and its proposal. Continue?'))) return;
    setBusy(true); setError('');
    try { await api(`/api/v1/projects/${project.id}/visibility`, session?.access_token || '', { method: 'PATCH', body: JSON.stringify({ visibility: 'public', publishConsent: true }) }); setNotice(copy(language, 'Proyecto público. La vista previa ya puede abrirse sin token.', 'Project is public. Its preview can now be opened without a token.')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo publicar.'); }
    finally { setBusy(false); }
  }
  async function revoke() {
    if (!project || !window.confirm(copy(language, 'Desactivar el enlace también convierte el proyecto en privado. ¿Continuar?', 'Revoking this link also makes the project private. Continue?'))) return;
    setBusy(true); setError('');
    try { await api(`/api/v1/projects/${project.id}/share`, session?.access_token || '', { method: 'DELETE' }); setShareUrl(''); setNotice(copy(language, 'El enlace fue desactivado.', 'The link was revoked.')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo desactivar el enlace.'); }
    finally { setBusy(false); }
  }
  async function loadFile(file?: File) {
    setError(''); if (!file) { setFileText(''); return; }
    if (file.size > 64 * 1024 || !/\.(txt|md|json)$/i.test(file.name)) { setError(copy(language, 'Adjunta solo .txt, .md o .json, máximo 64 KB.', 'Attach only .txt, .md or .json files, up to 64 KB.')); return; }
    try { const text = await file.text(); if (text.includes('\u0000')) throw Error(); setFileText(text); setNotice(`${file.name} · ${file.size.toLocaleString()} bytes`); }
    catch { setError(copy(language, 'No se pudo leer el documento de texto.', 'Could not read the text document.')); }
  }
  async function authenticate(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      if (!cloudClient) throw new Error(copy(language, 'Supabase no está configurado. El sitio necesita VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.', 'Supabase is not configured. This site needs VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'));
      if (authMode === 'signup') {
        const { data, error: authError } = await cloudClient.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.href).href } });
        if (authError) throw authError;
        if (!data.session) setNotice(copy(language, 'Cuenta creada. Confirma el correo y vuelve para iniciar sesión.', 'Account created. Confirm your email, then return to sign in.'));
        else setNotice(copy(language, 'Sesión iniciada. Ya puedes guardar el borrador.', 'Signed in. You can now save your draft.'));
      } else {
        const { error: authError } = await cloudClient.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      const known: Record<string, [string, string]> = {
        'Invalid login credentials': ['Correo o contraseña incorrectos.', 'Email or password is incorrect.'],
        'Email not confirmed': ['Confirma tu correo electrónico y vuelve a iniciar sesión.', 'Confirm your email address, then sign in again.'],
        'User already registered': ['Ya existe una cuenta con ese correo. Inicia sesión.', 'An account already exists for this email. Sign in instead.'],
      };
      const translated = known[message];
      setError(translated ? copy(language, ...translated) : message || copy(language, 'No se pudo autenticar. Revisa la conexión e inténtalo de nuevo.', 'Sign-in failed. Check your connection and try again.'));
    }
    finally { setBusy(false); }
  }
  const inputClass = 'developer-field';
  const activePreviewMission = preview?.proposal.missions[Math.min(selectedMissionIndex, Math.max(0, preview.proposal.missions.length - 1))];
  const earthMission = missions.find((mission) => mission.id === 'earth') ?? missions[0];

  if (mode === 'preview') return <section className="developer-page preview-page">
    <div className="developer-topline"><span>ORBITAL DEVELOPERS · PREVIEW</span><span>{copy(language, 'DEMOSTRACIÓN EDUCATIVA', 'EDUCATIONAL DEMONSTRATION')}</span></div>
    {!apiBase && <div className="developer-state developer-error" role="alert">{copy(language, 'La API compartida no está configurada. El sitio estático de Pages no puede recuperar vistas persistidas.', 'The shared API is not configured. Static Pages cannot retrieve persisted previews.')}</div>}
    {busy && <div className="developer-state" role="status">{copy(language, 'Recuperando vista compartida…', 'Loading shared preview…')}</div>}
    {error && !busy && <div className="developer-state developer-error" role="alert"><b>{copy(language, 'Vista previa no disponible', 'Preview unavailable')}</b><p>{error}</p><a href="#developers">{copy(language, 'Volver a ORBITAL DEVELOPERS', 'Return to ORBITAL DEVELOPERS')}</a></div>}
    {preview && <><div className="developer-hero"><div><span className="developer-kicker">{preview.topic} · {preview.audience}</span><h1>{preview.name}</h1><p>{preview.description}</p><div className="developer-actions"><button type="button" className="developer-button" onClick={() => void navigator.clipboard.writeText(window.location.href).then(() => setNotice(copy(language, 'Enlace copiado.', 'Link copied.')))}>{copy(language, 'COPIAR ENLACE', 'COPY LINK')} ↗</button><a className="developer-button secondary" href="#developers">ORBITAL DEVELOPERS</a></div>{notice && <span className="developer-notice" role="status">{notice}</span>}</div><div className="developer-orbit-card"><span>EXPERIENCIA SUGERIDA</span><b>{preview.proposal.template.name}</b><i>◉</i><small>{copy(language, 'Propuesta reutiliza misiones y roles del motor existente.', 'Proposal reuses missions and roles from the existing engine.')}</small></div></div>
      <section className="developer-engine-section"><div><span className="developer-kicker">MOTOR 3D ORBITAL COMMAND · ESCENARIO DE REFERENCIA</span><p>{copy(language, 'Este escenario reutiliza la navegación 3D existente como demostración de plantilla. No representa datos, resultados ni un entorno personalizado del proyecto.', 'This scene reuses the existing 3D navigation as a template demonstration. It does not represent project data, findings or a custom environment.')}</p></div><div className="developer-engine-preview" aria-label={copy(language, 'Demostración interactiva del sistema solar existente', 'Interactive demonstration of the existing solar system')}><SolarSystemScene mission={earthMission} onSelect={(id) => setNotice(copy(language, `Escenario de referencia seleccionado: ${missions.find((item) => item.id === id)?.name ?? id}.`, `Reference scenario selected: ${missions.find((item) => item.id === id)?.name ?? id}.`))} shipId="pioneer" language={language} /></div></section>
      <div className="developer-grid"><article><span className="developer-kicker">01 · CONTEXTO</span><h2>{copy(language, 'El reto', 'The challenge')}</h2><p>{preview.problem}</p><h3>{copy(language, 'Objetivos del equipo', 'Team objectives')}</h3><ul>{preview.objectives.map((item) => <li key={item}>{item}</li>)}</ul></article><article><span className="developer-kicker">02 · PROPUESTA</span><h2>{preview.proposal.title}</h2><p>{preview.proposal.narrative}</p><h3>{copy(language, 'Misión principal', 'Main objective')}</h3><p>{preview.proposal.primaryObjective}</p><h3>{copy(language, 'Resultados esperados', 'Expected learning')}</h3><p>{preview.proposal.expectedResults}</p><small className="developer-disclaimer">{copy(language, 'Demostración generada desde el contexto del equipo. No constituye validación científica ni alianza institucional.', 'Demonstration generated from the team’s context. It is not scientific validation or an institutional partnership.')}</small></article></div>
      <div className="developer-section"><span className="developer-kicker">03 · MISIONES</span><div className="developer-missions">{preview.proposal.missions.map((mission, index) => <article key={mission.title}><b>0{index + 1}</b><h3>{mission.title}</h3><p>{mission.activity}</p><small>{mission.collectiveObjective}</small></article>)}</div></div>
      <section className="developer-workbench" aria-label={copy(language, 'Probar la vista interactiva', 'Try the interactive preview')}><div><span className="developer-kicker">04 · VISTA INTERACTIVA</span><h2>{copy(language, 'Explora una fase de la propuesta.', 'Explore a proposal mission.')}</h2><p>{copy(language, 'Este avance vive solo en esta demostración del navegador y no se guarda como resultado del proyecto.', 'This progress exists only in this browser demonstration and is not saved as project results.')}</p></div><div className="developer-workbench-body"><div className="developer-mission-select">{preview.proposal.missions.map((mission, index) => <button type="button" key={mission.id} className={index === selectedMissionIndex ? 'active' : ''} aria-pressed={index === selectedMissionIndex} onClick={() => setSelectedMissionIndex(index)}><span>0{index + 1}</span>{mission.title}</button>)}</div>{activePreviewMission && <article className="developer-active-mission"><span className="developer-kicker">{copy(language, 'FASE SELECCIONADA', 'SELECTED MISSION')}</span><h3>{activePreviewMission.title}</h3><p>{activePreviewMission.activity}</p><small>{copy(language, 'DESAFÍO', 'CHALLENGE')}: {activePreviewMission.challenge}</small><div className="developer-actions"><button type="button" className="developer-button" aria-pressed={completedMissions.includes(activePreviewMission.id)} onClick={() => setCompletedMissions((items) => items.includes(activePreviewMission.id) ? items.filter((id) => id !== activePreviewMission.id) : [...items, activePreviewMission.id])}>{completedMissions.includes(activePreviewMission.id) ? copy(language, 'MARCAR PENDIENTE', 'MARK PENDING') : copy(language, 'REGISTRAR PARTICIPACIÓN', 'RECORD PARTICIPATION')}</button><span className="developer-local-progress">{completedMissions.length}/{preview.proposal.missions.length} · {copy(language, 'FASES DE DEMOSTRACIÓN', 'DEMO MISSIONS')}</span></div></article>}</div></section>
      <div className="developer-grid"><article><span className="developer-kicker">05 · EQUIPO</span><h2>{copy(language, 'Roles sugeridos', 'Suggested roles')}</h2>{preview.proposal.roles.map((role) => <p key={role.name}><b>{role.name}</b> — {role.objective}</p>)}</article><article><span className="developer-kicker">06 · APRENDIZAJE</span><h2>{copy(language, 'Qué se espera aprender', 'Learning outcomes')}</h2>{preview.proposal.learningOutcomes.map((item) => <p key={item}>{item}</p>)}</article></div>
    </>}
  </section>;

  return <section className="developer-page">
    <div className="developer-topline"><span>ORBITAL COMMAND · ECOSYSTEM</span><span>ORBITAL DEVELOPERS / API v1</span></div>
    {!apiBase && <div className="developer-state developer-error" role="status">{copy(language, 'API pendiente de configuración. Configura Supabase en los secretos de GitHub Actions y despliega la función orbital-gamification.', 'API configuration required. Configure Supabase in GitHub Actions secrets and deploy the orbital-gamification function.')}</div>}
    <div className="developer-hero"><div><span className="developer-kicker">INFRAESTRUCTURA PARA PROYECTOS CIENTÍFICOS Y EDUCATIVOS</span><h1>{copy(language, 'TU PROYECTO PUEDE CONVERTIRSE EN UNA EXPERIENCIA INTERACTIVA.', 'YOUR PROJECT CAN BECOME AN INTERACTIVE EXPERIENCE.')}</h1><p>{copy(language, 'Conecta tu proyecto con ORBITAL COMMAND y descubre cómo tus ideas científicas y educativas pueden transformarse en experiencias gamificadas de aprendizaje y exploración.', 'Connect your project with ORBITAL COMMAND and explore how scientific and educational ideas can become gamified learning experiences.')}</p><div className="developer-actions"><a className="developer-button" href="#connect">{copy(language, 'EXPLORAR MI PROYECTO', 'EXPLORE MY PROJECT')} ↘</a><a className="developer-button secondary" href={`${import.meta.env.BASE_URL}openapi.yaml`} target="_blank" rel="noreferrer">{copy(language, 'CONSULTAR API', 'VIEW API')} ↗</a></div></div><div className="developer-orbit-card"><span>DEMO CONCEPTUAL · FICTICIA</span><b>Observatorio de arrecifes</b><i>◎</i><small>Proyecto educativo ficticio sobre monitoreo comunitario de ecosistemas marinos.</small></div></div>
    <div className="developer-flow" aria-label="Proyecto externo, conexión, análisis, propuesta gamificada y vista interactiva"><span>PROYECTO EXTERNO</span><b>→</b><span>CONEXIÓN</span><b>→</b><span>ANÁLISIS</span><b>→</b><span>PROPUESTA GAMIFICADA</span><b>→</b><span>VISTA INTERACTIVA</span></div>
    <div className="developer-grid"><article><span className="developer-kicker">01 · CAPACIDADES DE PLATAFORMA</span><h2>{copy(language, 'El mismo motor, nuevas ideas.', 'One engine, new ideas.')}</h2><p>{copy(language, 'Una propuesta estructurada que reutiliza componentes educativos existentes. No genera un videojuego independiente.', 'A structured proposal that reuses existing educational components. It does not create a standalone game.')}</p>{capabilities?.capabilities.map((item) => <p className="developer-capability" key={item.id}><b>{item.name}</b><small>{item.description}</small><i>{item.status === 'available' ? 'DISPONIBLE' : 'EXPERIMENTAL'}</i></p>)}{!capabilities && <span className="developer-muted">{copy(language, 'Configura la API para mostrar las capacidades activas.', 'Configure the API to display available capabilities.')}</span>}</article><article><span className="developer-kicker">02 · PLANTILLAS</span><h2>{copy(language, 'Representaciones reutilizables', 'Reusable representations')}</h2>{templates?.templates.map((item) => <p className="developer-template" key={item.id}><b>{item.name}</b><small>{item.description}</small></p>)}{!templates && <span className="developer-muted">{copy(language, 'Plantillas reutilizables del motor existente.', 'Reusable templates from the existing engine.')}</span>}<a href={`${import.meta.env.BASE_URL}openapi.yaml`} target="_blank" rel="noreferrer" className="developer-doc-link">OPENAPI · REST QUICK START ↗</a></article></div>
    <div id="connect" className="developer-form-wrap"><div><span className="developer-kicker">03 · CONECTAR PROYECTO</span><h2>{copy(language, 'Empieza con el contexto.', 'Start with your project context.')}</h2><p>{copy(language, 'Primero guardarás un borrador privado. Revísalo; después puedes crear un enlace de solo lectura o publicarlo expresamente.', 'First, save a private draft. Review it, then create a read-only link or explicitly publish it.')}</p><p className="developer-muted">{copy(language, 'Tus borradores privados se guardan en Supabase y solo tu cuenta puede gestionarlos.', 'Your private drafts are stored in Supabase and only your account can manage them.')}</p></div>
      <div className="developer-form">
        {!cloudClient && <div className="developer-message error" role="alert">{copy(language, 'Supabase no está configurado para este sitio. Define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en GitHub Actions.', 'Supabase is not configured for this site. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in GitHub Actions.')}</div>}
         {cloudClient && !session && <form onSubmit={(event) => void authenticate(event)} className="developer-auth-form"><h3>{copy(language, 'Inicia sesión para guardar', 'Sign in to save')}</h3><div className="developer-form-grid"><label className={inputClass}>EMAIL<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label className={inputClass}>{copy(language, 'CONTRASEÑA', 'PASSWORD')}<input type="password" required minLength={authMode === 'signup' ? 8 : 1} maxLength={128} autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label></div><div className="developer-actions"><button type="submit" className="developer-button" disabled={busy || !authReady}>{authMode === 'signin' ? copy(language, 'INICIAR SESIÓN', 'SIGN IN') : copy(language, 'CREAR CUENTA', 'CREATE ACCOUNT')}</button><button type="button" className="developer-button secondary" onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setError(''); }}>{authMode === 'signin' ? copy(language, 'CREAR CUENTA', 'CREATE ACCOUNT') : copy(language, 'YA TENGO CUENTA', 'I HAVE AN ACCOUNT')}</button></div></form>}
        {session && <div className="developer-auth-status"><span>{copy(language, 'Sesión activa:', 'Signed in as:')} <b>{session.user.email}</b></span><button type="button" className="developer-button secondary" onClick={() => { void cloudClient?.auth.signOut(); setProject(null); setShareUrl(''); }}>{copy(language, 'CERRAR SESIÓN', 'SIGN OUT')}</button></div>}
        <form onSubmit={(event) => void submit(event)} className="developer-form"><div className="developer-form-grid"><label className={inputClass}>{copy(language, 'NOMBRE DEL PROYECTO', 'PROJECT NAME')}<input required maxLength={120} value={form.name} onChange={(event) => update('name', event.target.value)} /></label><label className={inputClass}>{copy(language, 'EQUIPO O AUTOR', 'TEAM OR AUTHOR')}<input required maxLength={120} value={form.teamName} onChange={(event) => update('teamName', event.target.value)} /></label><label className={inputClass}>{copy(language, 'PÚBLICO OBJETIVO', 'TARGET AUDIENCE')}<input required maxLength={200} value={form.audience} onChange={(event) => update('audience', event.target.value)} /></label><label className={inputClass}>{copy(language, 'ÁREA TEMÁTICA', 'TOPIC')}<input required maxLength={120} value={form.topic} onChange={(event) => update('topic', event.target.value)} /></label></div><label className={inputClass}>{copy(language, 'DESCRIPCIÓN DEL PROYECTO', 'PROJECT DESCRIPTION')}<textarea required minLength={25} maxLength={5000} value={form.description} onChange={(event) => update('description', event.target.value)} /></label><label className={inputClass}>{copy(language, 'PROBLEMA QUE ABORDA', 'PROBLEM IT ADDRESSES')}<textarea required maxLength={3000} value={form.problem} onChange={(event) => update('problem', event.target.value)} /></label><label className={inputClass}>{copy(language, 'OBJETIVOS · SEPARA CON PUNTO Y COMA', 'OBJECTIVES · SEPARATE WITH SEMICOLONS')}<textarea required maxLength={2400} value={form.objectives} onChange={(event) => update('objectives', event.target.value)} /></label><label className={inputClass}>{copy(language, '¿QUÉ DESEA QUE APRENDA EL USUARIO?', 'WHAT SHOULD USERS LEARN?')}<textarea required maxLength={2000} value={form.learningGoals} onChange={(event) => update('learningGoals', event.target.value)} /></label><label className={inputClass}>{copy(language, 'DOCUMENTO DE CONTEXTO OPCIONAL · TXT, MD, JSON · MÁX. 64 KB', 'OPTIONAL CONTEXT FILE · TXT, MD, JSON · MAX 64 KB')}<input type="file" accept=".txt,.md,.json,text/plain,application/json" onChange={(event) => void loadFile(event.target.files?.[0])} /></label><label className={`${inputClass} developer-consent`}><input type="checkbox" checked={storeConsent} onChange={(event) => setStoreConsent(event.target.checked)} required />{copy(language, 'Autorizo guardar este contexto y el documento adjunto en Supabase como borrador privado.', 'I consent to storing this context and attached document in Supabase as a private draft.')}</label><div className="developer-form-footer"><small>{copy(language, 'El archivo se almacena como texto; no ejecutamos instrucciones contenidas en él.', 'The file is stored as text; instructions inside it are never executed.')}</small><button type="submit" className="developer-button" disabled={busy || !session || !apiBase}>{busy ? copy(language, 'PROCESANDO…', 'PROCESSING…') : copy(language, 'GENERAR BORRADOR PRIVADO', 'GENERATE PRIVATE DRAFT')} ↗</button></div></form>
      </div>
      {error && <div className="developer-message error" role="alert">{error}</div>}{notice && <div className="developer-message" role="status">{notice}</div>}
    </div>
    {project && <section className="developer-review" aria-live="polite"><span className="developer-kicker">04 · REVISIÓN ANTES DE COMPARTIR</span><h2>{project.proposal.title}</h2><p>{project.proposal.narrative}</p><p><b>{copy(language, 'Objetivo central:', 'Primary objective:')}</b> {project.proposal.primaryObjective}</p><div className="developer-missions">{project.proposal.missions.map((mission, index) => <article key={mission.id}><b>0{index + 1}</b><h3>{mission.title}</h3><p>{mission.activity}</p><small>{mission.collectiveObjective}</small></article>)}</div><p className="developer-disclaimer">{copy(language, 'Propuesta determinista de diseño. No usa un modelo de IA, no valida afirmaciones y requiere revisión del equipo.', 'Deterministic design proposal. It does not use an AI model or validate claims; team review is required.')}</p><div className="developer-actions"><button type="button" className="developer-button" onClick={() => void share()} disabled={busy}>{copy(language, 'CREAR ENLACE DE SOLO LECTURA', 'CREATE READ-ONLY LINK')} ↗</button><button type="button" className="developer-button secondary" onClick={() => void publish()} disabled={busy}>{copy(language, 'PUBLICAR PROYECTO', 'PUBLISH PROJECT')} ↗</button>{shareUrl && <button type="button" className="developer-button secondary" onClick={() => void revoke()} disabled={busy}>{copy(language, 'DESACTIVAR ENLACE', 'REVOKE LINK')}</button>}</div>{shareUrl && <p className="developer-share"><a href={shareUrl}>{shareUrl}</a><button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => setNotice(copy(language, 'Enlace copiado.', 'Link copied.')))}>{copy(language, 'COPIAR', 'COPY')}</button></p>}</section>}
    <details className="developer-docs"><summary>{copy(language, 'GUÍA RÁPIDA PARA DESARROLLADORES', 'DEVELOPER QUICK START')}</summary><pre>{`const base = '${apiBase || 'https://<project-ref>.supabase.co/functions/v1/orbital-gamification'}';
const response = await fetch(base + '/api/v1/projects', {
  method: 'POST',
  headers: { apikey: '<publishable-key>', Authorization: 'Bearer ' + session.access_token,
    'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mi proyecto', teamName: 'Equipo',
    description: 'Descripción educativa suficientemente detallada.',
    problem: 'Problema que estudia el equipo', objectives: ['Objetivo verificable'],
    audience: 'Estudiantes', topic: 'Ciencias', learningGoals: 'Aprendizaje esperado',
    visibility: 'private' })
});
const draft = await response.json();
const preview = await fetch(base + '/api/v1/projects/' + draft.project.id + '/preview', {
  method: 'POST', headers: { apikey: '<publishable-key>', Authorization: 'Bearer ' + session.access_token }
});`}</pre><p>{copy(language, 'El token de sesión es personal. La clave publishable identifica el proyecto. Nunca uses service_role en el navegador.', 'The session token is personal. The publishable key identifies the project. Never use service_role in the browser.')}</p></details>
    <div className="developer-legal"><b>ONE PLATFORM. INFINITE POSSIBILITIES.</b><span>{copy(language, 'Propuestas educativas independientes. Sin afiliación institucional implícita.', 'Independent educational proposals. No implied institutional affiliation.')}</span></div>
  </section>;
}
