/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Calibri', 'Open Sans', 'sans-serif'],
        'display': ['Eras Bold ITC', 'Impact', 'sans-serif'],
        'heading': ['Eras Medium ITC', 'Arial', 'sans-serif'],
      },
      colors: {
        'gold': '#FFC000',
        'silver': '#A5A5A5',
        'bronze': '#C65911',
        'derby-blue': '#003366',
      }
    },
  },
  plugins: [],
}
