/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        surface: {
          0: '#fafaf9',
          1: '#ffffff',
          2: '#f5f5f4',
          3: '#e7e5e4',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          light: '#eef2ff',
          muted: '#c7d2fe',
        },
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      animation: {
        'slide-in': 'slide-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slide-up 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
        'fade-in': 'fade-in 0.15s ease-out',
        'countdown': 'countdown 5s linear forwards',
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'countdown': {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
};
