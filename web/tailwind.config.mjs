/** Builder-only Tailwind setup.
 * `content` is scoped to the builder so generated utilities can never
 * collide with the landing page's hand-written classes (e.g. `.container`).
 * `preflight` is off so the landing's global styles are untouched.
 * @type {import('tailwindcss').Config} */
const config = {
  content: ['./app/builder/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brico: {
          red: { DEFAULT: '#C1552B', d: '#98401F' },
          yellow: { DEFAULT: '#D9A13B', d: '#B5822A' },
          blue: { DEFAULT: '#41617D', d: '#2F4A61' },
          green: { DEFAULT: '#7C8A4D', d: '#61703A' },
          orange: { DEFAULT: '#8A5A83', d: '#6E4568' },
          ink: { DEFAULT: '#2E2A24', soft: '#6E645A' },
          paper: { DEFAULT: '#FAF6ED', 2: '#F2E9D8' },
        },
      },
      fontFamily: {
        sans: ['var(--font-brico-nunito)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-brico-fraunces)', 'Georgia', 'serif'],
        mono: ['var(--font-brico-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px 0px rgba(46,42,36,1)',
        brutal: '4px 4px 0px 0px rgba(46,42,36,1)',
        'brutal-lg': '8px 8px 0px 0px rgba(46,42,36,1)',
        'brutal-xl': '12px 12px 0px 0px rgba(46,42,36,1)',
      },
    },
  },
  plugins: [],
};

export default config;
