import type { NASAResult } from './nasaClient.ts';

/** EONET context is an external observation, not a measurement made by the simulation. */
export type EonetTarget = { id: string; title: string; category: string; eventDate: string; retrievedAt: string; snapshot: boolean };
const validDate = (value: unknown): value is string => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
export function isEonetTarget(value: unknown): value is EonetTarget {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && /^EONET_\d{1,12}$/.test(v.id) && typeof v.title === 'string' && v.title.trim().length > 0 && v.title.length <= 160 && typeof v.category === 'string' && v.category.length <= 80 && validDate(v.eventDate) && validDate(v.retrievedAt) && typeof v.snapshot === 'boolean';
}
export function parseEonetTargets(result: NASAResult): EonetTarget[] {
  if (result.dataset !== 'eonet' || result.source !== 'https://eonet.gsfc.nasa.gov' || !validDate(result.observedAt) || !result.data || typeof result.data !== 'object') return [];
  const items = (result.data as { events?: unknown }).events;
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.flatMap((item): EonetTarget[] => {
    if (!item || typeof item !== 'object') return [];
    const event = item as Record<string, unknown>;
    const categories = Array.isArray(event.categories) ? event.categories : [];
    const category = categories[0] && typeof categories[0] === 'object' ? (categories[0] as Record<string, unknown>).title : '';
    const geometry = Array.isArray(event.geometry) ? event.geometry : [];
    const dates = geometry.map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).date : null).filter(validDate).sort();
    const target = { id: event.id, title: event.title, category: typeof category === 'string' ? category : '', eventDate: dates.at(-1), retrievedAt: result.observedAt, snapshot: result.snapshot === true };
    if (!isEonetTarget(target) || seen.has(target.id)) return [];
    seen.add(target.id); return [target];
  }).slice(0, 20);
}
export function targetSource(target: EonetTarget) { return `https://eonet.gsfc.nasa.gov/api/v3/events/${target.id}`; }
