import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under the repo name. Override via VITE_BASE
// for custom-domain or local-preview cases.
const base = process.env.VITE_BASE ?? '/Singapore-3D-Map-Demo/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
