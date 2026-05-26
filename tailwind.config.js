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
        brand: '#0f1419',
        brandDark: '#eff3f4',
        gold: '#FFD700',
        tw: {
          bg: '#000000',
          surface: '#16181c',
          border: '#2f3336',
          text: '#e7e9ea',
          muted: '#71767b',
          accent: '#1d9bf0',
        },
      },
      fontFamily: {
        sans: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      screens: {
        xs: '375px',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
}
