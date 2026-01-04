import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel'; // o el que uses

export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    functionPerRoute: false, // Recomendado para evitar muchas funciones pequeñas
    runtime: 'nodejs20.x',    // <--- FUERZA ESTA LÍNEA AQUÍ
  }),
});