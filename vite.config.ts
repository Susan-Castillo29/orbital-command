import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nasaHandler } from './server/nasa-proxy.mjs';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'NASA_');
  if (env.NASA_API_KEY && !process.env.NASA_API_KEY) process.env.NASA_API_KEY = env.NASA_API_KEY;
  return ({
  base: './',
  plugins: [react(), { name: 'nasa-local-api', configureServer(server) { server.middlewares.use((req, res, next) => { void nasaHandler(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void nasaHandler(req, res, next); }); } }, {
    name: 'orbital-production-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'" }, injectTo: 'head-prepend' }];
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
