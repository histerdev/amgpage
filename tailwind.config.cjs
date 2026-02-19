module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [],
  // ✅ PURGE UNUSED CSS
  safelist: [
    // Solo agrega aquí las clases dinámicas que necesites
    'bg-red-600',
    'bg-green-600',
    'text-red-700',
    'text-green-700',
  ],
};