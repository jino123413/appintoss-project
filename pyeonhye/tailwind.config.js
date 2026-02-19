/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0EA5A4',
        },
      },
      fontFamily: {
        gmarket: ['GmarketSans', 'Pretendard Variable', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

