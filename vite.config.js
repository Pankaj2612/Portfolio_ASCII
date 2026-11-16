import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import seo from './tools/vite-seo.js';

export default defineConfig(({ mode }) => {
  // SITE_URL can come from .env, .env.production or the host's environment (Netlify / Vercel / GitHub Actions)
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), seo(env.SITE_URL || process.env.SITE_URL)],
    // './' lets the built site work from any sub-path (e.g. GitHub Pages /repo-name/)
    base: './',
    build: {
      rollupOptions: {
        output: {
                  manualChunks(id) {
          // function form works with Vite 6 (Rollup) and Vite 7/8 (Rolldown)
          if (/node_modules[\\/]three[\\/]/.test(id)) return 'three';
          if (/node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
        },
        },
      },
    },
  };
});
