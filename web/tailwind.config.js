/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'ink-navy': '#06141F',
        'deep-teal': '#0B3A4A',
        'glow-aqua': '#2EE6D6',
        'health-lime': '#9BE564',
        'watch-amber': '#FFB547',
        'alert-coral': '#FF5C5C',
        'foam-white': '#E8FBFF'
      },
      fontFamily: {
        display: ['Unbounded', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}
