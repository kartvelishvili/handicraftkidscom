/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"BPG Glaho Bold"', 'sans-serif'],
        body: ['"BPG Ucnobi"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#57c5cf',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f292bc',
          foreground: '#ffffff',
        },
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
}