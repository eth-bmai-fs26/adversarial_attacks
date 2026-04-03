import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f172a',
        'tile-pos': '#fbbf24',
        'tile-neg': '#22d3ee',
        'true-class': '#38bdf8',
        adversarial: '#f472b6',
        success: '#34d399',
        'tile-dormant': '#131c2e',
        'tile-gap': '#0a0f1a',
      },
      textColor: {
        primary: '#f1f5f9',
        muted: '#94a3b8',
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      screens: {
        compact: { max: '1439px', min: '768px' },
        mobile: { max: '767px' },
      },
    },
  },
  plugins: [],
} satisfies Config;
