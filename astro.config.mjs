import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://amgpage.vercel.app',
  integrations: [
    tailwind(),
  ],
  output: 'static',
  adapter: vercel(),
  vite: {
    build: {
      minify: true,
    },
  },
});