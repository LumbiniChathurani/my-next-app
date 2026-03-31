/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-green-600',
    'bg-yellow-200',
    'bg-orange-200',
    'bg-red-200',
    'bg-purple-200',
    'bg-red-900',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

