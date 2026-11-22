import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

/*
 * "Reading room" tokens. The interface borrows a PACS viewer's discipline: grayscale film
 * tones on reading-room navy, with colour reserved for meaning —
 *   localizer (cyan)  anything you can act on, focus, the active filter
 *   caliper  (gold)   the Pro plan and the editor's signature
 */
export default {
  future: { hoverOnlyWhenSupported: true },
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#060B15',
          900: '#0A1220',
          850: '#0E192B',
          800: '#132036',
          700: '#1C2B44',
          600: '#2A3B57',
        },
        film: {
          50: '#EEF2F7',
          100: '#DCE3EC',
          300: '#AEB9C8',
          400: '#8D9AAE',
          500: '#6B7A90',
        },
        localizer: {
          DEFAULT: '#4FD1E8',
          300: '#8FE4F2',
          700: '#1F7F93',
        },
        caliper: {
          DEFAULT: '#E3B95F',
          300: '#F0D394',
          700: '#8A6A2A',
        },
        alert: '#F07A70',
      },
      fontFamily: {
        sans: ['Archivo', ...defaultTheme.fontFamily.sans],
        serif: ['Newsreader', ...defaultTheme.fontFamily.serif],
      },
      fontSize: {
        // Classical scale (Bringhurst): 12 · 14 · 16 · 18 · 21 · 24 · 36 · 48
        annot: ['0.75rem', { lineHeight: '1.35' }],
      },
      keyframes: {
        // The one orchestrated moment: the hero image "windows in" like adjusting W/L.
        windowing: {
          from: { filter: 'brightness(0.12) contrast(2.4) grayscale(1)' },
          to: { filter: 'brightness(0.5) contrast(1.05) grayscale(0.35)' },
        },
        'sheet-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.99)' },
          to: { opacity: '1', transform: 'none' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '50%': { transform: 'translateX(6px)' },
          '75%': { transform: 'translateX(-3px)' },
        },
      },
      animation: {
        windowing: 'windowing 1.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'sheet-in': 'sheet-in 0.18s ease-out both',
        shake: 'shake 0.32s ease-in-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
