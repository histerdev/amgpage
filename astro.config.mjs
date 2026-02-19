import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';  // ✅ Cambio: de '/serverless' a sin ruta

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
  adapter: vercel(),
  vite: {
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
    },
  },
});