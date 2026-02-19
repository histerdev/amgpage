module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2ecc71',
          dark: '#27ae60',
          light: '#a3f5c5',
        },
      },
    },
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
