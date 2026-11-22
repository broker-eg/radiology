import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';

/*
 * "Reading room" tokens. The interface borrows a PACS viewer's discipline: grayscale film
 * tones on reading-room navy, with colour reserved for meaning —
 *   localizer (cyan)  anything you can act on, focus, the active filter, tour arrows
 *   caliper  (gold)   the Pro plan and the editor's signature
 *
 * Every colour is a CSS variable (src/styles/index.css) so one set of classes renders both
 * themes: "Reading room" (dark, the default) and "Lightbox" (light — film on a backlit
 * viewbox). Image viewports always use the dark values (`.scheme-dark`).
 */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: v('ink-950'),
          900: v('ink-900'),
          850: v('ink-850'),
          800: v('ink-800'),
          700: v('ink-700'),
          600: v('ink-600'),
        },
        film: {
          50: v('film-50'),
          100: v('film-100'),
          300: v('film-300'),
          400: v('film-400'),
          500: v('film-500'),
        },
        localizer: {
          DEFAULT: v('localizer'),
          300: v('localizer-300'),
        },
        caliper: {
          DEFAULT: v('caliper'),
          300: v('caliper-300'),
        },
        alert: v('alert'),
        scrim: v('scrim'),
      },
      fontFamily: {
        // Arabic glyphs fall through to Plex Arabic; Latin terms (CT, LI-RADS) stay in Archivo.
        sans: ['Archivo', 'IBM Plex Sans Arabic', ...defaultTheme.fontFamily.sans],
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
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'none' },
        },
        fade: { from: { opacity: '0' }, to: { opacity: '1' } },
        // Tour/install arrows are drawn like a measurement annotation being placed.
        draw: { from: { strokeDashoffset: '1' }, to: { strokeDashoffset: '0' } },
        nudge: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(var(--nudge-x, 0), var(--nudge-y, 6px))' },
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
        'rise-in': 'rise-in 0.26s cubic-bezier(0.22, 1, 0.36, 1) both',
        fade: 'fade 0.2s ease-out both',
        draw: 'draw 0.42s cubic-bezier(0.65, 0, 0.35, 1) both',
        nudge: 'nudge 1.1s ease-in-out 0.5s 3',
        shake: 'shake 0.32s ease-in-out',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      // Small per-theme adjustments: `light:shadow-…`.
      addVariant('light', ':where([data-theme="light"]) &');
      // Phones and tablets: bigger hit areas where the pointer is a finger.
      addVariant('touch', '@media (pointer: coarse)');
    }),
  ],
} satisfies Config;
