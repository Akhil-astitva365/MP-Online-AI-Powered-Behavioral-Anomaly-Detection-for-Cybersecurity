/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"League Spartan"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      colors: {
        warm: {
          bg: '#faf7f2',
          surface: '#f2ede4',
          border: '#e5dfd5',
          text: '#2a2623',
          muted: '#78716c',
          accent: '#c2410c'
        },
        dark: {
          bg: '#050505',
          surface: '#121212',
          border: '#262626',
          text: '#f5f5f5',
          muted: '#a3a3a3'
        }
      }
    },
  },
  plugins: [],
}
