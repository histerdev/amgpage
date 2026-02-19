import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
    image: {
    service: { entrypoint: 'astro/assets/services/noop' }
  },
  integrations: [tailwind()],
  output: 'static',
  adapter: vercel(),
  vite: {
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // ✅ Elimina console.log en producción
        },
      },
    },
  },
});