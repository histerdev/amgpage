module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'amg-bg': '#0A0A0A',
        'amg-surface': '#111111',
        'amg-surface2': '#1A1A1A',
        'amg-border': '#2A2A2A',
        'amg-text': '#F5F5F5',
        'amg-muted': '#888888',
        'amg-green': '#16A34A',
        'amg-green-lt': '#22C55E',
        brand: {
          DEFAULT: '#16A34A',
          dark: '#15803D',
          light: '#22C55E',
          glow: 'rgba(34,197,94,0.15)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '2px',
        'btn': '4px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.5)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.6)',
        'green-glow': '0 0 40px rgba(34,197,94,0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
  safelist: [
    'bg-red-900/30', 'border-red-900/30', 'text-red-400',
    'bg-green-900/20', 'border-green-500/30',
    'opacity-0', 'opacity-100', 'translate-x-full',
    'bg-amg-surface', 'border-amg-border', 'text-amg-muted', 'text-amg-green',
  ],
};
