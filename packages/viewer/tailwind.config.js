/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          green: '#22c55e',
          blue: '#3b82f6',
        },
        quality: {
          kill: '#22c55e',     // green-500
          positive: '#84cc16',  // lime-500
          neutral: '#eab308',   // yellow-500
          negative: '#f97316',  // orange-500
          poor: '#ef4444',      // red-500
          error: '#dc2626',     // red-600
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
