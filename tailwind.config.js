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
        maple: {
          red: '#E53935',
          redDark: '#C62828',
          orange: '#FF9800',
          orangeLight: '#FFA726',
          orangeDark: '#E65100',
          gold: '#FFD700',
          goldLight: '#FFE57F',
          goldDark: '#B8860B',
        },
        henesys: {
          green: '#4CAF50',
          greenLight: '#81C784',
          greenDark: '#2E7D32',
          yellow: '#FFEB3B',
          yellowDark: '#FBC02D',
        },
        ellinia: {
          blue: '#1E88E5',
          blueLight: '#64B5F6',
          purple: '#8E24AA',
          purpleLight: '#BA68C8',
          purpleDark: '#6A1B9A',
        },
        kerning: {
          dark: '#263238',
          darker: '#192227',
          window: '#1B3B6F',
          windowDark: '#102A54',
          stroke: '#212121',
        },
        parchment: {
          bg: '#FFF8E7',
          card: '#FDF5E6',
          border: '#D4B982',
          borderDark: '#9E7E47',
          text: '#4A3B2C',
          darkBg: '#0f172a',
          darkCard: '#1e293b',
          darkBorder: '#334155',
        }
      },
      fontFamily: {
        fredoka: ['Fredoka', 'Noto Sans TC', 'sans-serif'],
        sans: ['Noto Sans TC', 'sans-serif'],
      },
      boxShadow: {
        'maple-card': '0 4px 0 #102A54, 0 6px 12px rgba(0, 0, 0, 0.35)',
        'maple-gold': '0 4px 0 #B8860B, 0 0 16px rgba(255, 215, 0, 0.3)',
        'maple-parchment': '0 4px 0 #D4B982, 0 6px 16px rgba(0, 0, 0, 0.12)',
        'maple-btn': 'inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 3px 0 #BF360C',
        'maple-btn-active': 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 0 #BF360C',
      },
      borderWidth: {
        '2.5': '2.5px',
        '3': '3px',
      }
    },
  },
  plugins: [],
}
