/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        margai: {
          dark: '#0B0F19',
          card: '#131B2E',
          accent: '#3B82F6',
          warning: '#F59E0B',
          urgent: '#EF4444',
          success: '#10B981',
          googleBlue: '#4285F4',
          googleRed: '#EA4335',
          googleYellow: '#FBBC05',
          googleGreen: '#34A853',
        }
      }
    },
  },
  plugins: [],
}
