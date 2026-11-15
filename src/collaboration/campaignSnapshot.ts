const fixed = new Set(['orbital-command-player','orbital-command-mission','orbital-command-ship','orbital-command-reports-v1','orbital-command-failed-attempts-v1','orbital-command-report-transmissions-v1','orbital-command-eonet-target-v1','orbital-command-satellite-earth','orbital-command-first-look-v1','orbital-command-active-campaign-v1','orbital-command-campaign-archive-v1']);
const perMission = /^orbital-command-(?:progress|resources|survey|buffers|events|lab|photos|sensors|tutorial|eonet-scan|transit-v1|design-v1)-(?:earth|moon|mercury|venus|mars|jupiter|europa|saturn|titan|uranus|neptune|sun|asteroid)$/;
export type CampaignSnapshot = { version: 1; items: Record<string, string> };
export function validCampaignKey(key: string): boolean { return fixed.has(key) || perMission.test(key); }
export function parseCampaignSnapshot(value: unknown): CampaignSnapshot | null {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
 const candidate = value as Record<string, unknown>; if (candidate.version !== 1 || !candidate.items || typeof candidate.items !== 'object' || Array.isArray(candidate.items)) return null;
 const entries = Object.entries(candidate.items as Record<string, unknown>);
 if (entries.length > 200 || entries.some(([key, data]) => !validCampaignKey(key) || typeof data !== 'string' || data.length > 50000)) return null;
 if (new TextEncoder().encode(JSON.stringify(candidate)).byteLength > 90000) return null;
 return { version: 1, items: Object.fromEntries(entries) as Record<string, string> };
}
export function captureCampaign(storage: Storage): CampaignSnapshot {
 const items: Record<string,string> = {};
 for (let i=0;i<storage.length;i++) { const key=storage.key(i); if (key && validCampaignKey(key)) { const value=storage.getItem(key); if (value !== null) items[key]=value; } }
 const snapshot = parseCampaignSnapshot({version:1,items}); if (!snapshot) throw new Error('Campaign exceeds backup limits'); return snapshot;
}
export function restoreCampaign(storage: Storage, snapshot: CampaignSnapshot): void {
 const clean = parseCampaignSnapshot(snapshot); if (!clean) throw new Error('Invalid campaign backup');
 // Roll back changes if storage is full or unavailable. Never touch unrelated keys.
 const previous: Record<string,string> = {};
 for (let i=0;i<storage.length;i++) { const key=storage.key(i); if (key && validCampaignKey(key)) { const value=storage.getItem(key); if(value !== null) previous[key]=value; } }
 try {
  for (const key of Object.keys(previous)) storage.removeItem(key);
  for (const [key,value] of Object.entries(clean.items)) storage.setItem(key,value);
 } catch (error) {
  for (const key of Object.keys(clean.items)) { try { storage.removeItem(key); } catch { /* best-effort rollback */ } }
  for (const [key,value] of Object.entries(previous)) { try { storage.setItem(key,value); } catch { /* storage unavailable */ } }
  throw error;
 }
}
