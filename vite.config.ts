import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Served as a GitHub Pages *project* site (broker-eg.github.io/radiology/). A relative base
// works under any /<repo>/ prefix and with HashRouter. Override with VITE_BASE_PATH.
const base = process.env.VITE_BASE_PATH ?? './';

/**
 * Offline: writes the list of built files into dist/sw.js so the service worker precaches the
 * whole app on install (lazy pages and fonts included, not just what the first visit loaded).
 * BUILD hashes the list + index.html: each deploy changes sw.js, so browsers install the new
 * worker, which caches the new build and drops the old one.
 */
function precacheServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'precache-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      const files = readdirSync(join(outDir, 'assets'))
        .sort()
        .map((f) => `./assets/${f}`);
      const build = createHash('sha256')
        .update(files.join('\n'))
        .update(readFileSync(join(outDir, 'index.html')))
        .digest('hex')
        .slice(0, 12);
      const sw = readFileSync(swPath, 'utf8');
      const filled = sw
        .replace("const BUILD = 'dev';", `const BUILD = '${build}';`)
        .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(files)};`);
      if (filled === sw) throw new Error('sw.js: BUILD/PRECACHE placeholders not found');
      writeFileSync(swPath, filled);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react(), precacheServiceWorker()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vendor code changes rarely: separate chunks stay cached across deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
