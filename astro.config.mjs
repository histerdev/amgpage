import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
export default defineConfig({
  // `site` can be set to a fully-qualified URL for production builds, e.g.
output: 'server', // O 'hybrid' si la mayoría son estáticas  // Omit it for local development to avoid "Invalid url" errors.
adapter: netlify(),
});
