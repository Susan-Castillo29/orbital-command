/**
 * Cliente de las APIs abiertas de NASA (https://api.nasa.gov).
 *  - APOD: imagen astronómica del día.
 *  - NeoWs: asteroides cercanos a la Tierra (próximos 7 días).
 *
 * El juego es estático (GitHub Pages), así que cualquier clave queda visible en el navegador.
 * Se usa `DEMO_KEY` por defecto (límite bajo por IP); puede definirse `VITE_NASA_API_KEY`
 * en un `.env.local` para una clave personal gratuita. Las respuestas se validan antes de
 * mostrarse y se guardan en caché local para no agotar el límite.
 */
import { readStorage, writeStorage } from './storage.ts';

const API_ROOT = 'https://api.nasa.gov';
const APOD_FIRST_DATE = '1995-06-16';
const NEO_TTL_MS = 6 * 60 * 60 * 1000;
const APOD_TODAY_TTL_MS = 60 * 60 * 1000;

export type Apod = {
  date: string;
  title: string;
  explanation: string;
  mediaType: 'image' | 'video';
  /** Imagen mostrable (solo hosts de APOD); null si es vídeo u otro origen. */
  imageUrl: string | null;
  hdUrl: string | null;
  /** Enlace seguro a la página oficial o al vídeo. */
  pageUrl: string;
  copyright: string | null;
};

export type NearEarthObject = {
  id: string;
  name: string;
  jplUrl: string | null;
  diameterMeters: number;
  hazardous: boolean;
  /** Fecha UTC de máxima aproximación (YYYY-MM-DD). */
  approachDate: string;
  velocityKms: number;
  lunarDistance: number;
  distanceKm: number;
};

export class NasaApiError extends Error {
  readonly kind: 'rate-limit' | 'not-found' | 'network' | 'invalid';
  constructor(kind: NasaApiError['kind'], message: string) { super(message); this.kind = kind; }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number): string | null => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
const num = (value: unknown): number | null => { const n = typeof value === 'string' ? Number(value) : value; return typeof n === 'number' && Number.isFinite(n) ? n : null; };

function httpsUrlOnHost(value: unknown, allowed: (host: string) => boolean): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && allowed(url.hostname) ? url.href : null;
  } catch { return null; }
}
const isApodHost = (host: string) => host === 'apod.nasa.gov';
const isNasaHost = (host: string) => host === 'nasa.gov' || host.endsWith('.nasa.gov');
const isVideoHost = (host: string) => ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'vimeo.com'].includes(host) || isNasaHost(host);

export function isValidApodDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value && value >= APOD_FIRST_DATE;
}

export function apodPageFor(date: string): string {
  return `https://apod.nasa.gov/apod/ap${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}.html`;
}

export function parseApod(raw: unknown): Apod | null {
  if (!isRecord(raw)) return null;
  const date = text(raw.date, 10);
  const title = text(raw.title, 200);
  const explanation = text(raw.explanation, 4000);
  if (!date || !isValidApodDate(date) || !title || !explanation) return null;
  const isVideo = raw.media_type === 'video';
  const imageUrl = isVideo ? null : httpsUrlOnHost(raw.url, isApodHost);
  const hdUrl = isVideo ? null : httpsUrlOnHost(raw.hdurl, isApodHost);
  const videoUrl = isVideo ? httpsUrlOnHost(raw.url, isVideoHost) : null;
  return {
    date, title, explanation,
    mediaType: isVideo ? 'video' : 'image',
    imageUrl, hdUrl,
    pageUrl: videoUrl ?? apodPageFor(date),
    copyright: text(raw.copyright, 120)?.replace(/\s+/g, ' ') ?? null,
  };
}

export function parseNearEarthObjects(raw: unknown): NearEarthObject[] {
  if (!isRecord(raw) || !isRecord(raw.near_earth_objects)) return [];
  const result: NearEarthObject[] = [];
  for (const [day, list] of Object.entries(raw.near_earth_objects)) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!isRecord(item)) continue;
      const id = text(item.id, 40); const name = text(item.name, 80);
      const meters = isRecord(item.estimated_diameter) && isRecord(item.estimated_diameter.meters) ? item.estimated_diameter.meters : null;
      const min = meters ? num(meters.estimated_diameter_min) : null; const max = meters ? num(meters.estimated_diameter_max) : null;
      const approach = Array.isArray(item.close_approach_data) && isRecord(item.close_approach_data[0]) ? item.close_approach_data[0] : null;
      const speed = approach && isRecord(approach.relative_velocity) ? num(approach.relative_velocity.kilometers_per_second) : null;
      const miss = approach && isRecord(approach.miss_distance) ? approach.miss_distance : null;
      const lunar = miss ? num(miss.lunar) : null; const km = miss ? num(miss.kilometers) : null;
      if (!id || !name || min === null || max === null || speed === null || lunar === null || km === null || lunar < 0) continue;
      result.push({
        id, name: name.replace(/[()]/g, '').trim(),
        jplUrl: httpsUrlOnHost(item.nasa_jpl_url, isNasaHost),
        diameterMeters: (min + max) / 2,
        hazardous: item.is_potentially_hazardous_asteroid === true,
        approachDate: /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '',
        velocityKms: speed, lunarDistance: lunar, distanceKm: km,
      });
    }
  }
  return result.sort((a, b) => a.lunarDistance - b.lunarDistance);
}

function apiKey(): string {
  const key = import.meta.env?.VITE_NASA_API_KEY;
  return typeof key === 'string' && /^[A-Za-z0-9_-]{8,80}$/.test(key) ? key : 'DEMO_KEY';
}

async function getJson(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<unknown> {
  const url = new URL(path, API_ROOT);
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  url.searchParams.set('api_key', apiKey());
  let response: Response;
  try { response = await fetch(url, { signal, headers: { Accept: 'application/json' } }); }
  catch (error) { if (signal?.aborted) throw error; throw new NasaApiError('network', 'Sin conexión con los servidores de NASA.'); }
  if (response.status === 429) throw new NasaApiError('rate-limit', 'Se alcanzó el límite de consultas de la clave de NASA. Inténtalo más tarde.');
  if (response.status === 400 || response.status === 404) throw new NasaApiError('not-found', 'NASA no tiene datos para esa fecha.');
  if (!response.ok) throw new NasaApiError('network', `NASA respondió con el estado ${response.status}.`);
  try { return await response.json(); } catch { throw new NasaApiError('invalid', 'La respuesta de NASA no es válida.'); }
}

type CacheEntry<T> = { savedAt: number; data: T };
function readCache<T>(key: string, maxAgeMs: number, check: (value: unknown) => value is T): T | null {
  const stored = readStorage(key);
  if (!stored) return null;
  try {
    const entry = JSON.parse(stored) as CacheEntry<unknown>;
    if (!isRecord(entry) || typeof entry.savedAt !== 'number' || Date.now() - entry.savedAt > maxAgeMs || !check(entry.data)) return null;
    return entry.data;
  } catch { return null; }
}
const writeCache = <T,>(key: string, data: T) => { writeStorage(key, JSON.stringify({ savedAt: Date.now(), data } satisfies CacheEntry<T>)); };

const cachedUrl = (value: unknown, allowed: (host: string) => boolean) => value === null || httpsUrlOnHost(value, allowed) !== null;
const isApod = (value: unknown): value is Apod => isRecord(value)
  && typeof value.date === 'string' && isValidApodDate(value.date) && typeof value.title === 'string' && typeof value.explanation === 'string'
  && (value.mediaType === 'image' || value.mediaType === 'video')
  && cachedUrl(value.imageUrl, isApodHost) && cachedUrl(value.hdUrl, isApodHost) && httpsUrlOnHost(value.pageUrl, isVideoHost) !== null;
const isNeoList = (value: unknown): value is NearEarthObject[] => Array.isArray(value) && value.every((item) => isRecord(item) && typeof item.id === 'string' && typeof item.lunarDistance === 'number');

/** Imagen del día; sin fecha pide «hoy» (según el calendario de NASA). */
export async function loadApod(date?: string, signal?: AbortSignal): Promise<Apod> {
  if (date !== undefined && !isValidApodDate(date)) throw new NasaApiError('not-found', 'La fecha debe estar entre el 16 de junio de 1995 y hoy.');
  const cacheKey = `orbital-command-nasa-apod-${date ?? 'today'}`;
  const cached = readCache(cacheKey, date ? Number.POSITIVE_INFINITY : APOD_TODAY_TTL_MS, isApod);
  if (cached) return cached;
  try {
    const parsed = parseApod(await getJson('/planetary/apod', date ? { date } : {}, signal));
    if (!parsed) throw new NasaApiError('invalid', 'La respuesta de APOD no tiene el formato esperado.');
    writeCache(cacheKey, parsed);
    return parsed;
  } catch (error) {
    const stale = readCache(cacheKey, Number.POSITIVE_INFINITY, isApod);
    if (stale && !signal?.aborted) return stale;
    throw error;
  }
}

/** Asteroides con máxima aproximación en los próximos 7 días (UTC), de más cercano a más lejano. */
export async function loadNearEarthObjects(signal?: AbortSignal): Promise<NearEarthObject[]> {
  const start = new Date(); const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const day = (value: Date) => value.toISOString().slice(0, 10);
  const cacheKey = `orbital-command-nasa-neo-${day(start)}`;
  const cached = readCache(cacheKey, NEO_TTL_MS, isNeoList);
  if (cached) return cached;
  try {
    const list = parseNearEarthObjects(await getJson('/neo/rest/v1/feed', { start_date: day(start), end_date: day(end) }, signal));
    writeCache(cacheKey, list);
    return list;
  } catch (error) {
    const stale = readCache(cacheKey, Number.POSITIVE_INFINITY, isNeoList);
    if (stale && !signal?.aborted) return stale;
    throw error;
  }
}
