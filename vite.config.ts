import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react(), {
    name: 'orbital-production-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://apod.nasa.gov; media-src 'self' blob:; connect-src 'self' https://api.nasa.gov; object-src 'none'; base-uri 'self'; form-action 'self'" }, injectTo: 'head-prepend' }];
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
