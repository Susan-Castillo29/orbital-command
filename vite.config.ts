import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nasaHandler } from './server/nasa-proxy.mjs';
import { loadEnv } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'NASA_');
  const serverEnv = loadEnv(mode, process.cwd(), '');
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ORBITAL_API_KEY', 'ORBITAL_API_KEYS', 'ORBITAL_APP_URL', 'ORBITAL_ALLOWED_ORIGINS']) {
    if (serverEnv[key] && !process.env[key]) process.env[key] = serverEnv[key];
  }
  const cloudEnv = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_');
  const cloudUrl = cloudEnv.VITE_SUPABASE_URL;
  const cloudKey = cloudEnv.VITE_SUPABASE_PUBLISHABLE_KEY;
  let cloudOrigin = '';
  if (cloudUrl || cloudKey) {
    if (!cloudUrl || !cloudKey || cloudKey.length > 4096 || cloudKey.startsWith('sb_secret_')) throw new Error('Use a Supabase URL and publishable/anon key; never a secret key.');
    let parsed: URL;
    try { parsed = new URL(cloudUrl); } catch { throw new Error('Invalid Supabase URL'); }
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) throw new Error('Supabase URL must be an HTTPS project origin.');
    if (!cloudKey.startsWith('sb_publishable_')) {
      try { const payload = JSON.parse(Buffer.from(cloudKey.split('.')[1], 'base64url').toString('utf8')); if (payload.role !== 'anon') throw new Error('not anon'); }
      catch { throw new Error('Supabase key must be a publishable or legacy anon key.'); }
    }
    cloudOrigin = parsed.origin;
  }
  if (env.NASA_API_KEY && !process.env.NASA_API_KEY) process.env.NASA_API_KEY = env.NASA_API_KEY;
  return ({
  base: './',
  plugins: [react(), { name: 'nasa-snapshot-manifest', apply: 'build', generateBundle() { const datasets = readdirSync(resolve(process.cwd(), 'public/nasa-data')).filter(name => name.endsWith('.json') && name !== 'index.json').map(name => name.slice(0, -5)); this.emitFile({ type: 'asset', fileName: 'nasa-data/index.json', source: JSON.stringify(datasets) }); } }, { name: 'nasa-local-api', configureServer(server) { server.middlewares.use((req, res, next) => { void nasaHandler(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void nasaHandler(req, res, next); }); } }, {
    name: 'orbital-production-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images-assets.nasa.gov https://epic.gsfc.nasa.gov https://assets.science.nasa.gov; media-src 'self' blob:; connect-src 'self' ${cloudOrigin}; object-src 'none'; base-uri 'self'; form-action 'self'` }, injectTo: 'head-prepend' }];
    },
  }],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/node_modules/react/')) return 'react-vendor';
        },
      },
    },
  },
});
});
