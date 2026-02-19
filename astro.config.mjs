import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  image: {
    service: { entrypoint: 'astro/assets/services/noop' }
  },
  integrations: [tailwind()],
  output: 'static',
  adapter: vercel({
    imageService: false  // ✅ DESACTIVA optimización de imágenes
  }),
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