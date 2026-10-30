// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://lucas-rollin.github.io',
  base: '/rota-energetica',
  integrations: [preact()],
  vite: {
    plugins: [/** @type {any} */ (tailwindcss())],
    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});