/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tesla: {
          dark: '#0d0e10',
          panel: 'rgba(26, 27, 31, 0.85)',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#4285F4',
          urgent: '#EA4335',
          caution: '#FBBC05',
          success: '#34A853',
        }
      }
    },
  },
  plugins: [],
}
