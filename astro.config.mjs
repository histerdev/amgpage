import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://amgpage.vercel.app',
  integrations: [
    tailwind(),
    sitemap(),
  ],
  output: 'static',
  adapter: vercel(),
  vite: {
    build: {
      minify: true,
    },
  },
});