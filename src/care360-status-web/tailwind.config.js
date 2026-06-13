/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        healthy: '#22c55e',
        degraded: '#f59e0b',
        unhealthy: '#ef4444',
        maintenance: '#3b82f6',
        unknown: '#9ca3af',
        navy: {
          950: '#070f1c',
          900: '#0d1b2e',
          800: '#102035',
          750: '#142640',
          700: '#1a304e',
          600: '#1e3a5c',
          500: '#2a4f7c',
        },
      },
    },
  },
  plugins: [],
};
