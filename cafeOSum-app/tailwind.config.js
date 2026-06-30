/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brown: {
          dark:  '#3B1F0E',
          mid:   '#7C4A1E',
          light: '#C08040',
        },
        gold: {
          DEFAULT: '#D4A017',
          light:   '#F0C040',
        },
        cream: '#FDF8F2',
        'gray-cafe': {
          50:  '#F9F5F0',
          100: '#F0EBE3',
          200: '#DDD5C8',
          400: '#9E8E7E',
          600: '#6B5B4E',
        },
        'status-green':  '#2E8B57',
        'status-amber':  '#D97706',
        'status-red':    '#DC2626',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
      },
      spacing: {
        sidebar: '240px',
        'right-panel': '260px',
        header: '64px',
      },
    },
  },
  plugins: [],
}
