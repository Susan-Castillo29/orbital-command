export function validatePublicConfig(rawUrl: string | undefined, key: string | undefined): { url: string; key: string } | null {
  if (!rawUrl || !key || key.startsWith('sb_secret_') || key.length > 4096) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) || url.username || url.password || url.port || url.search || url.hash || !['', '/'].includes(url.pathname)) return null;
    if (key.startsWith('sb_publishable_')) return { url: url.origin, key };
    const parts = key.split('.'); if (parts.length !== 3) return null;
    const payload: unknown = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload || typeof payload !== 'object' || (payload as { role?: unknown }).role !== 'anon') return null;
    return { url: url.origin, key };
  } catch { return null; }
}
